import { evaluateWorkflowRules, logWorkflowExecution, getWorkflowLogs } from "../../../lib/workflowEngine";
import { getAdvisorSession } from "../../../lib/advisorAuth";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  const advisorId = session.advisorId;

  if (req.method === "GET") {
    const leadId = req.query.leadId;
    if (!leadId) return apiError(res, 400, "LEAD_ID_REQUIRED", "leadId is required");
    const limit = parseInt(req.query.limit, 10) || 50;
    const logs = await getWorkflowLogs(leadId, limit);
    return res.status(200).json({ logs });
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const { leadId, lead } = body;
    if (!leadId) return apiError(res, 400, "LEAD_ID_REQUIRED", "leadId is required");
    if (!lead) return apiError(res, 400, "LEAD_REQUIRED", "lead object is required");

    const triggered = await evaluateWorkflowRules(lead, advisorId);
    let logged = 0;

    for (const rule of triggered) {
      await logWorkflowExecution({
        advisorId,
        leadId,
        ruleType: rule.ruleType,
        triggerValue: rule.triggerValue,
        actionTaken: rule.suggestedAction,
        metadata: rule.metadata,
      });
      logged++;
    }

    return res.status(200).json({ triggered, logged });
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
}
