/**
 * Document reminder engine.
 *
 * Phase 1: data model + manual send (advisor copies/sends message manually).
 * Future: background job reads rows WHERE status='due' AND deadline_at <= now()
 *         and triggers automated WhatsApp/email.
 *
 * Safety rules:
 *   - Only one active reminder per case (upsert pattern)
 *   - Never remind if all docs are received/approved
 *   - Advisor can cancel at any time
 */
import { randomUUID } from "crypto";

const REMINDERS_TABLE = "document_reminders";

export const REMINDER_STATUSES = ["not_scheduled", "scheduled", "due", "sent", "completed", "cancelled"];

function getSupabaseUrl() {
  return String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
}
function getSupabaseServiceKey() {
  return String(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
}
function baseHeaders() {
  const key = getSupabaseServiceKey();
  return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
}
function endpoint(table, query = "") {
  const base = `${getSupabaseUrl()}/rest/v1/${table}`;
  return query ? `${base}?${query}` : base;
}
function hasConfig() {
  return Boolean(getSupabaseUrl()) && Boolean(getSupabaseServiceKey());
}

/** Return the active (non-cancelled) reminder for a lead, or null. */
export async function getReminderForLead(leadId) {
  if (!hasConfig() || !leadId) return null;
  try {
    const res = await fetch(
      endpoint(REMINDERS_TABLE, `lead_id=eq.${encodeURIComponent(leadId)}&cancelled_at=is.null&order=created_at.desc&limit=1`),
      { method: "GET", headers: baseHeaders() }
    );
    if (!res.ok) return null;
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch {
    return null;
  }
}

/**
 * Create or update the reminder for a lead.
 * If an active (non-cancelled) reminder exists, it is updated in-place.
 * Otherwise a new record is created.
 */
export async function upsertReminder(leadId, advisorId, {
  uploadTokenId = null,
  deadlineAt = null,
  channel = "whatsapp",
  missingDocumentTypes = [],
} = {}) {
  if (!hasConfig() || !leadId || !advisorId) return null;

  const now = new Date().toISOString();
  const existing = await getReminderForLead(leadId);

  const fields = {
    deadline_at: deadlineAt || null,
    channel,
    status: deadlineAt ? "scheduled" : "not_scheduled",
    missing_document_types: missingDocumentTypes,
    updated_at: now,
    ...(uploadTokenId ? { upload_token_id: uploadTokenId } : {}),
  };

  if (existing) {
    try {
      const res = await fetch(
        endpoint(REMINDERS_TABLE, `id=eq.${encodeURIComponent(existing.id)}`),
        { method: "PATCH", headers: { ...baseHeaders(), Prefer: "return=representation" }, body: JSON.stringify(fields) }
      );
      if (!res.ok) return null;
      const rows = await res.json().catch(() => []);
      return Array.isArray(rows) && rows.length > 0 ? rows[0] : { ...existing, ...fields };
    } catch {
      return null;
    }
  }

  const record = {
    id: randomUUID(),
    lead_id: leadId,
    advisor_id: advisorId,
    upload_token_id: uploadTokenId,
    reminder_count: 0,
    created_at: now,
    ...fields,
  };
  try {
    const res = await fetch(endpoint(REMINDERS_TABLE), {
      method: "POST",
      headers: { ...baseHeaders(), Prefer: "return=representation" },
      body: JSON.stringify(record),
    });
    if (!res.ok) return null;
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : record;
  } catch {
    return null;
  }
}

/** Mark a reminder as completed (all docs received — no send needed). */
export async function completeReminder(reminderId) {
  if (!hasConfig() || !reminderId) return false;
  const now = new Date().toISOString();
  try {
    const res = await fetch(
      endpoint(REMINDERS_TABLE, `id=eq.${encodeURIComponent(reminderId)}`),
      { method: "PATCH", headers: baseHeaders(), body: JSON.stringify({ status: "completed", completed_at: now, updated_at: now }) }
    );
    return res.ok;
  } catch {
    return false;
  }
}

/** Cancel a reminder. Advisor-initiated. */
export async function cancelReminder(reminderId) {
  if (!hasConfig() || !reminderId) return false;
  const now = new Date().toISOString();
  try {
    const res = await fetch(
      endpoint(REMINDERS_TABLE, `id=eq.${encodeURIComponent(reminderId)}`),
      { method: "PATCH", headers: baseHeaders(), body: JSON.stringify({ status: "cancelled", cancelled_at: now, updated_at: now }) }
    );
    return res.ok;
  } catch {
    return false;
  }
}

/** Record that a manual reminder was sent. Increments reminder_count. */
export async function recordReminderSent(reminderId, currentCount = 0) {
  if (!hasConfig() || !reminderId) return false;
  const now = new Date().toISOString();
  try {
    const res = await fetch(
      endpoint(REMINDERS_TABLE, `id=eq.${encodeURIComponent(reminderId)}`),
      { method: "PATCH", headers: baseHeaders(), body: JSON.stringify({ status: "sent", last_reminder_sent_at: now, reminder_count: currentCount + 1, updated_at: now }) }
    );
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Build the Hebrew reminder WhatsApp message.
 * Pure function — safe to call from any context.
 */
export function buildReminderMessage({ clientName, advisorName, uploadLink, missingDocs = [] }) {
  const name = clientName || "לקוח יקר";
  const advisor = advisorName || "היועץ שלך";
  const docList = missingDocs.map((d) => `• ${d.label || d}`).join("\n");
  return [
    `שלום ${name},`,
    `תזכורת ידידותית מ-FINZO:`,
    `כדי שנוכל להתקדם בתיק המשכנתא שלך, עדיין חסרים המסמכים הבאים:`,
    "",
    docList,
    "",
    `ניתן להעלות אותם בקישור המאובטח:`,
    uploadLink,
    "",
    `תודה,`,
    advisor,
  ].join("\n");
}

/**
 * Compute a Hebrew status label for the advisor UI.
 * Returns null if there is nothing to show.
 */
export function getReminderStatusLabel(reminder, missingCount) {
  if (!reminder || reminder.cancelled_at) return null;
  if (missingCount === 0 || reminder.status === "completed") {
    return "כל המסמכים התקבלו — אין צורך בתזכורת ✓";
  }

  const now = Date.now();

  if (reminder.deadline_at) {
    const diff = new Date(reminder.deadline_at).getTime() - now;
    if (diff <= 0) return `התזכורת מוכנה לשליחה — חסרים ${missingCount} מסמכים`;
    const hours = Math.round(diff / 3_600_000);
    if (hours < 24) return `תזכורת תישלח בעוד ${hours} שעות`;
    const days = Math.round(diff / 86_400_000);
    return `תזכורת תישלח בעוד ${days} ימים`;
  }

  if (reminder.last_reminder_sent_at) {
    const ago = now - new Date(reminder.last_reminder_sent_at).getTime();
    const hours = Math.round(ago / 3_600_000);
    if (hours < 24) return `נשלח קישור מסמכים לפני ${hours} שעות`;
    const days = Math.round(ago / 86_400_000);
    return `נשלח קישור מסמכים לפני ${days} ימים`;
  }

  return null;
}
