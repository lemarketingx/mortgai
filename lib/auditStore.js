/**
 * Supabase data-access layer for audit events.
 *
 * Table:
 *   audit_events — immutable log of all actions taken on leads/cases
 *
 * All calls use the service role key — never called from client JS.
 */

import { randomUUID } from "crypto";

const AUDIT_EVENTS_TABLE = "audit_events";

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

// ─── AUDIT_ACTIONS ───────────────────────────────────────────────────────────

export const AUDIT_ACTIONS = {
  STAGE_CHANGE: "stage_change",
  NOTE_ADDED: "note_added",
  DOCUMENT_UPLOADED: "document_uploaded",
  DOCUMENT_REVIEWED: "document_reviewed",
  BANKER_ASSIGNED: "banker_assigned",
  BANKER_REMOVED: "banker_removed",
  TASK_CREATED: "task_created",
  TASK_COMPLETED: "task_completed",
  LEAD_PURCHASED: "lead_purchased",
  FIELD_UPDATED: "field_updated",
  REMINDER_SENT: "reminder_sent",
};

// ─── logAuditEvent ───────────────────────────────────────────────────────────

/**
 * Insert a new audit event.
 * @param {{ leadId?: string, advisorId?: string, action: string, field?: string, oldValue?: string, newValue?: string, metadata?: object }} params
 * @returns {Promise<object|null>}
 */
export async function logAuditEvent({ leadId, advisorId, action, field, oldValue, newValue, metadata = {} }) {
  if (!hasConfig()) return null;
  const record = {
    id:          randomUUID(),
    advisor_id:  advisorId || null,
    lead_id:     leadId || null,
    event_type:  action,
    title:       action || null,
    description: null,
    field:       field || null,
    old_value:   oldValue !== undefined ? String(oldValue) : null,
    new_value:   newValue !== undefined ? String(newValue) : null,
    metadata:    metadata,
    created_at:  new Date().toISOString(),
  };
  try {
    const res = await fetch(endpoint(AUDIT_EVENTS_TABLE), {
      method: "POST",
      headers: { ...baseHeaders(), Prefer: "return=representation" },
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[auditStore] audit_events table not found — run setup SQL");
        return null;
      }
      console.warn("[auditStore] logAuditEvent failed", res.status, text.slice(0, 200));
      return null;
    }
    const rows = await res.json().catch(() => []);
    const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : record;
    // Return in camelCase matching the old in-memory shape
    return {
      id:        row.id,
      leadId:    row.lead_id,
      advisorId: row.advisor_id,
      action:    row.event_type,
      field:     row.field,
      oldValue:  row.old_value,
      newValue:  row.new_value,
      metadata:  row.metadata,
      timestamp: row.created_at,
    };
  } catch (err) {
    console.warn("[auditStore] logAuditEvent error", err?.message);
    return null;
  }
}

// ─── getAuditTrail ───────────────────────────────────────────────────────────

/**
 * Read audit events for a lead, with optional filters.
 * @param {string} leadId
 * @param {{ action?: string, advisorId?: string, since?: string }} options
 * @returns {Promise<object[]>}
 */
export async function getAuditTrail(leadId, options = {}) {
  if (!hasConfig() || !leadId) return [];
  try {
    let query = `lead_id=eq.${encodeURIComponent(leadId)}`;
    if (options.action) {
      query += `&event_type=eq.${encodeURIComponent(options.action)}`;
    }
    if (options.advisorId) {
      query += `&advisor_id=eq.${encodeURIComponent(options.advisorId)}`;
    }
    if (options.since) {
      query += `&created_at=gte.${encodeURIComponent(options.since)}`;
    }
    query += "&order=created_at.desc&limit=500";

    const res = await fetch(endpoint(AUDIT_EVENTS_TABLE, query), {
      method: "GET",
      headers: baseHeaders(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[auditStore] audit_events table not found — run setup SQL");
        return [];
      }
      return [];
    }
    const data = await res.json().catch(() => []);
    if (!Array.isArray(data)) return [];
    // Map rows back to camelCase matching the old in-memory shape
    return data.map((row) => ({
      id:        row.id,
      leadId:    row.lead_id,
      advisorId: row.advisor_id,
      action:    row.event_type,
      field:     row.field,
      oldValue:  row.old_value,
      newValue:  row.new_value,
      metadata:  row.metadata,
      timestamp: row.created_at,
    }));
  } catch {
    return [];
  }
}
