import { createActivity, readActivities } from "../../../lib/activitiesStore";
import { LeadStoreError, readMyLeads } from "../../../lib/leadsStore";
import { getAdvisorSession } from "../../../lib/advisorAuth";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

async function assertOwnsLead(res, advisorId, leadId) {
  try {
    const leads = await readMyLeads(advisorId);
    if (leads.some((lead) => lead.id === leadId)) return true;
    apiError(res, 404, "LEAD_NOT_FOUND", "Lead not found in your purchased leads");
    return false;
  } catch (error) {
    if (error instanceof LeadStoreError) {
      const status = error.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
      apiError(res, status, error.code, error.message);
      return false;
    }
    apiError(res, 500, "LEAD_ACCESS_CHECK_FAILED", "Unable to verify lead ownership");
    return false;
  }
}

export default async function handler(req, res) {
  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  if (req.method === "GET") {
    const leadId = String(req.query.leadId || "").trim();
    if (!leadId) return apiError(res, 400, "LEAD_ID_REQUIRED", "leadId is required");
    if (!(await assertOwnsLead(res, session.advisorId, leadId))) return;
    const activities = await readActivities(leadId);
    return res.status(200).json({ activities });
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const leadId = String(body.leadId || "").trim();
    const activityType = String(body.activityType || "note_added").trim();
    const title = String(body.title || "").trim();
    if (!leadId || !title) return apiError(res, 400, "MISSING_FIELDS", "leadId and title are required");
    if (!(await assertOwnsLead(res, session.advisorId, leadId))) return;
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
