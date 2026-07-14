import { createCalendarEvent, getCalendarEvents, updateCalendarEvent, deleteCalendarEvent } from "../../../lib/calendarStore";
import { getAdvisorSession } from "../../../lib/advisorAuth";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

// The store returns raw Supabase rows (snake_case). The client works in
// camelCase — normalize here so the page and the store stay decoupled.
function toClientEvent(row) {
  if (!row) return null;
  return {
    id:          row.id,
    leadId:      row.lead_id || null,
    title:       row.title || "",
    description: row.description || "",
    eventType:   row.event_type || "meeting",
    startAt:     row.start_at || null,
    endAt:       row.end_at || null,
    allDay:      row.all_day === true,
    color:       row.color || null,
  };
}

// A date-only `to` bound (e.g. 2026-07-31) must include that whole day —
// timestamp rows like 2026-07-31T09:00 are greater than the bare date.
function endOfDayBound(value) {
  const v = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T23:59:59` : v || null;
}

export default async function handler(req, res) {
  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  const advisorId = session.advisorId;

  if (req.method === "GET") {
    const from = req.query.from || null;
    const to = endOfDayBound(req.query.to);
    const events = await getCalendarEvents(advisorId, { from, to });
    return res.status(200).json({ events: events.map(toClientEvent) });
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const title = String(body.title || "").trim();
    if (!title) return apiError(res, 400, "TITLE_REQUIRED", "title is required");
    const startAt = String(body.startAt || "").trim();
    if (!startAt) return apiError(res, 400, "START_AT_REQUIRED", "startAt is required");

    const hasSupabase = Boolean(process.env.SUPABASE_URL) && Boolean(process.env.SUPABASE_SERVICE_KEY);
    if (!hasSupabase) {
      return apiError(res, 503, "SUPABASE_NOT_CONFIGURED", "יומן לא מוגדר - חסרות הגדרות Supabase (SUPABASE_URL ו-SUPABASE_SERVICE_KEY)");
    }

    const event = await createCalendarEvent({
      advisorId,
      title,
      startAt,
      endAt: body.endAt || null,
      description: body.description || "",
      eventType: body.eventType || body.type || "meeting",
      leadId: body.leadId || null,
    });
    if (!event) return apiError(res, 503, "EVENT_CREATE_FAILED", "שמירת האירוע נכשלה - בדוק את הלוגים");
    return res.status(201).json({ event: toClientEvent(event) });
  }

  if (req.method === "PATCH") {
    const eventId = String(req.body?.eventId || req.body?.id || "").trim();
    if (!eventId) return apiError(res, 400, "EVENT_ID_REQUIRED", "eventId is required");
    const updates = {};
    const allowed = ["title", "startAt", "endAt", "description", "leadId", "allDay", "color"];
    for (const key of allowed) {
      if (req.body?.[key] !== undefined) updates[key] = req.body[key];
    }
    if (req.body?.eventType !== undefined) updates.eventType = req.body.eventType;
    else if (req.body?.type !== undefined) updates.eventType = req.body.type;
    const event = await updateCalendarEvent(advisorId, eventId, updates);
    if (!event) return apiError(res, 404, "EVENT_NOT_FOUND", "Event not found");
    return res.status(200).json({ event: toClientEvent(event) });
  }

  if (req.method === "DELETE") {
    const eventId = String(req.query.eventId || req.body?.eventId || req.body?.id || "").trim();
    if (!eventId) return apiError(res, 400, "EVENT_ID_REQUIRED", "eventId is required");
    const deleted = await deleteCalendarEvent(advisorId, eventId);
    if (!deleted) return apiError(res, 404, "EVENT_NOT_FOUND", "Event not found");
    return res.status(200).json({ ok: true });
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
}
