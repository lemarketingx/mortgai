/**
 * Supabase data-access layer for advisor calendar events.
 *
 * Table:
 *   advisor_calendar_events — per-advisor calendar entries
 *
 * All calls use the service role key — never called from client JS.
 */

import { randomUUID } from "crypto";

const TABLE = "advisor_calendar_events";

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

// ─── advisor_calendar_events ─────────────────────────────────────────────────

/**
 * Create a new calendar event for an advisor.
 */
export async function createCalendarEvent({
  advisorId, leadId, title, description, eventType,
  startAt, endAt, allDay, source, sourceId, color,
} = {}) {
  if (!hasConfig() || !advisorId) return null;
  const now = new Date().toISOString();
  const record = {
    id:          randomUUID(),
    advisor_id:  advisorId,
    lead_id:     leadId || null,
    title:       title || "",
    description: description || "",
    event_type:  eventType || null,
    start_at:    startAt || null,
    end_at:      endAt || null,
    all_day:     allDay === true,
    source:      source || null,
    source_id:   sourceId || null,
    color:       color || null,
    created_at:  now,
    updated_at:  now,
  };
  try {
    const res = await fetch(endpoint(TABLE), {
      method: "POST",
      headers: { ...baseHeaders(), Prefer: "return=representation" },
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[calendarStore] advisor_calendar_events table not found — run setup SQL");
        return null;
      }
      console.warn("[calendarStore] createCalendarEvent failed", res.status, text.slice(0, 200));
      return null;
    }
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : record;
  } catch (err) {
    console.warn("[calendarStore] createCalendarEvent error", err?.message);
    return null;
  }
}

/**
 * Get calendar events for an advisor within a date range.
 * @param {string} advisorId
 * @param {{ from: string, to: string }} range
 */
export async function getCalendarEvents(advisorId, { from, to } = {}) {
  if (!hasConfig() || !advisorId) return [];
  try {
    let query = `advisor_id=eq.${encodeURIComponent(advisorId)}&order=start_at.asc`;
    if (from) query += `&start_at=gte.${encodeURIComponent(from)}`;
    if (to)   query += `&start_at=lte.${encodeURIComponent(to)}`;
    const res = await fetch(endpoint(TABLE, query), {
      method: "GET", headers: baseHeaders(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[calendarStore] advisor_calendar_events table not found — run setup SQL");
        return [];
      }
      return [];
    }
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Update a calendar event. Only allowed fields are patched.
 */
export async function updateCalendarEvent(advisorId, eventId, updates = {}) {
  if (!hasConfig() || !advisorId || !eventId) return null;
  const patch = { updated_at: new Date().toISOString() };
  if (updates.title       !== undefined) patch.title       = updates.title;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.startAt     !== undefined) patch.start_at    = updates.startAt;
  if (updates.endAt       !== undefined) patch.end_at      = updates.endAt;
  if (updates.allDay      !== undefined) patch.all_day     = updates.allDay;
  if (updates.color       !== undefined) patch.color       = updates.color;
  if (updates.eventType   !== undefined) patch.event_type  = updates.eventType;
  try {
    const query = `id=eq.${encodeURIComponent(eventId)}&advisor_id=eq.${encodeURIComponent(advisorId)}`;
    const res = await fetch(endpoint(TABLE, query), {
      method: "PATCH",
      headers: { ...baseHeaders(), Prefer: "return=representation" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[calendarStore] advisor_calendar_events table not found — run setup SQL");
        return null;
      }
      return null;
    }
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch {
    return null;
  }
}

/**
 * Delete a calendar event. Only the owning advisor can delete.
 */
export async function deleteCalendarEvent(advisorId, eventId) {
  if (!hasConfig() || !advisorId || !eventId) return false;
  try {
    const query = `id=eq.${encodeURIComponent(eventId)}&advisor_id=eq.${encodeURIComponent(advisorId)}`;
    const res = await fetch(endpoint(TABLE, query), {
      method: "DELETE", headers: baseHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Get all calendar events linked to a specific lead.
 */
export async function getEventsForLead(advisorId, leadId) {
  if (!hasConfig() || !advisorId || !leadId) return [];
  try {
    const query = `advisor_id=eq.${encodeURIComponent(advisorId)}&lead_id=eq.${encodeURIComponent(leadId)}&order=start_at.asc`;
    const res = await fetch(endpoint(TABLE, query), {
      method: "GET", headers: baseHeaders(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[calendarStore] advisor_calendar_events table not found — run setup SQL");
        return [];
      }
      return [];
    }
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
