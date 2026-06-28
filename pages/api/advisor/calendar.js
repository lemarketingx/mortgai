import { createCalendarEvent, getCalendarEvents, updateCalendarEvent, deleteCalendarEvent } from "../../../lib/calendarStore";
import { getAdvisorSession } from "../../../lib/advisorAuth";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  const advisorId = session.advisorId;

  if (req.method === "GET") {
    const from = req.query.from || null;
    const to = req.query.to || null;
    const events = await getCalendarEvents(advisorId, { from, to });
    return res.status(200).json({ events });
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const title = String(body.title || "").trim();
    if (!title) return apiError(res, 400, "TITLE_REQUIRED", "title is required");
    const startAt = String(body.startAt || "").trim();
    if (!startAt) return apiError(res, 400, "START_AT_REQUIRED", "startAt is required");
    const event = await createCalendarEvent({
      advisorId,
      title,
      startAt,
      endAt: body.endAt || null,
      description: body.description || "",
      type: body.type || "meeting",
      leadId: body.leadId || null,
    });
    if (!event) return apiError(res, 503, "EVENT_CREATE_FAILED", "Could not create event");
    return res.status(201).json({ event });
  }

  if (req.method === "PATCH") {
    const eventId = String(req.body?.eventId || "").trim();
    if (!eventId) return apiError(res, 400, "EVENT_ID_REQUIRED", "eventId is required");
    const updates = {};
    const allowed = ["title", "startAt", "endAt", "description", "type", "leadId"];
    for (const key of allowed) {
      if (req.body?.[key] !== undefined) updates[key] = req.body[key];
    }
    const event = await updateCalendarEvent(advisorId, eventId, updates);
    if (!event) return apiError(res, 404, "EVENT_NOT_FOUND", "Event not found");
    return res.status(200).json({ event });
  }

  if (req.method === "DELETE") {
    const eventId = String(req.query.eventId || "").trim();
    if (!eventId) return apiError(res, 400, "EVENT_ID_REQUIRED", "eventId is required");
    const deleted = await deleteCalendarEvent(advisorId, eventId);
    if (!deleted) return apiError(res, 404, "EVENT_NOT_FOUND", "Event not found");
    return res.status(200).json({ ok: true });
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
}
