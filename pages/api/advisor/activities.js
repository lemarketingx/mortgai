import { createActivity, readActivities } from "../../../lib/activitiesStore";
import { getAdvisorSession } from "../../../lib/advisorAuth";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  if (req.method === "GET") {
    const leadId = String(req.query.leadId || "").trim();
    if (!leadId) return apiError(res, 400, "LEAD_ID_REQUIRED", "leadId is required");
    const activities = await readActivities(leadId);
    return res.status(200).json({ activities });
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const leadId = String(body.leadId || "").trim();
    const activityType = String(body.activityType || "note_added").trim();
    const title = String(body.title || "").trim();
    if (!leadId || !title) return apiError(res, 400, "MISSING_FIELDS", "leadId and title are required");
    const activity = await createActivity({
      leadId,
      advisorId: session.advisorId,
      activityType,
      title,
      body: body.body || null,
      channel: body.channel || null,
      metadata: body.metadata || {},
    });
    return res.status(200).json({ activity });
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
}
