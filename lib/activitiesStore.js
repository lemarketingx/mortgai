import { randomUUID } from "crypto";

const ACTIVITIES_TABLE = "lead_activities";
const DOCUMENTS_TABLE = "lead_documents";

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
function isTableMissing(body = "") {
  return /relation .+ does not exist/i.test(String(body)) || /table .+ does not exist/i.test(String(body));
}
function hasConfig() {
  return Boolean(getSupabaseUrl()) && Boolean(getSupabaseServiceKey());
}

export const ACTIVITY_TYPES = [
  "lead_created", "status_changed", "task_created", "task_completed",
  "call_logged", "whatsapp_opened", "whatsapp_sent", "email_opened",
  "email_sent", "document_requested", "document_received", "note_added", "reminder_set",
];

export const DOCUMENT_TYPES = [
  "תעודת_זהות", "תלושי_שכר_3_אחרונים", "דפי_עו_ש_3_חודשים",
  "אישור_עבודה_ומשכורת", "חוזה_רכישה", "נסח_טאבו",
  "שומת_מס_אחרונה", "דוח_פנסיה", "אחר",
];

export const DOCUMENT_TYPE_LABELS = {
  "תעודת_זהות": "תעודת זהות",
  "תלושי_שכר_3_אחרונים": "3 תלושי שכר אחרונים",
  "דפי_עו_ש_3_חודשים": 'דפי עו"ש 3 חודשים',
  "אישור_עבודה_ומשכורת": "אישור עבודה ומשכורת",
  "חוזה_רכישה": "חוזה רכישה",
  "נסח_טאבו": "נסח טאבו",
  "שומת_מס_אחרונה": "שומת מס אחרונה",
  "דוח_פנסיה": 'דו"ח פנסיה',
  "אחר": "מסמך אחר",
};

export async function createActivity({ leadId, advisorId, activityType, title, body, channel, metadata = {} }) {
  if (!hasConfig()) return null;
  const record = {
    id: randomUUID(),
    lead_id: leadId,
    advisor_id: advisorId || null,
    activity_type: activityType,
    title,
    body: body || null,
    channel: channel || null,
    metadata,
    created_at: new Date().toISOString(),
  };
  try {
    const res = await fetch(endpoint(ACTIVITIES_TABLE), {
      method: "POST",
      headers: { ...baseHeaders(), Prefer: "return=representation" },
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) return null;
      console.warn("[activitiesStore] createActivity failed", res.status);
      return null;
    }
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : record;
  } catch {
    return null;
  }
}

export async function readActivities(leadId, { limit = 60 } = {}) {
  if (!hasConfig() || !leadId) return [];
  try {
    const res = await fetch(
      endpoint(ACTIVITIES_TABLE, `lead_id=eq.${encodeURIComponent(leadId)}&order=created_at.desc&limit=${limit}`),
      { method: "GET", headers: baseHeaders() }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) return [];
      return [];
    }
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function createDocument({ leadId, documentType, dueAt, createdBy }) {
  if (!hasConfig()) return null;
  const record = {
    id: randomUUID(),
    lead_id: leadId,
    document_type: documentType,
    status: "requested",
    requested_at: new Date().toISOString(),
    due_at: dueAt || null,
    created_by: createdBy || null,
    created_at: new Date().toISOString(),
  };
  try {
    const res = await fetch(endpoint(DOCUMENTS_TABLE), {
      method: "POST",
      headers: { ...baseHeaders(), Prefer: "return=representation" },
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) return null;
      console.warn("[activitiesStore] createDocument failed", res.status);
      return null;
    }
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : record;
  } catch {
    return null;
  }
}

export async function readDocuments(leadId) {
  if (!hasConfig() || !leadId) return [];
  try {
    const res = await fetch(
      endpoint(DOCUMENTS_TABLE, `lead_id=eq.${encodeURIComponent(leadId)}&order=created_at.asc`),
      { method: "GET", headers: baseHeaders() }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) return [];
      return [];
    }
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function updateDocument(id, { status, notes }) {
  if (!hasConfig() || !id) return null;
  const patch = {};
  if (status !== undefined) patch.status = status;
  if (notes !== undefined) patch.notes = notes;
  if (status === "received") patch.received_at = new Date().toISOString();
  try {
    const res = await fetch(
      endpoint(DOCUMENTS_TABLE, `id=eq.${encodeURIComponent(id)}`),
      {
        method: "PATCH",
        headers: { ...baseHeaders(), Prefer: "return=representation" },
        body: JSON.stringify(patch),
      }
    );
    if (!res.ok) return null;
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch {
    return null;
  }
}
