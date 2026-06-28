import { getAlertRules, createAlertRule, updateAlertRule, deleteAlertRule } from "../../../lib/alertRulesStore";
import { getAdvisorSession } from "../../../lib/advisorAuth";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  const advisorId = session.advisorId;

  if (req.method === "GET") {
    const rules = await getAlertRules(advisorId);
    return res.status(200).json({ rules });
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const rule = await createAlertRule({
      advisorId,
      ...body,
    });
    if (!rule) return apiError(res, 503, "RULE_CREATE_FAILED", "Could not create alert rule");
    return res.status(201).json({ rule });
  }

  if (req.method === "PATCH") {
    const ruleId = String(req.body?.ruleId || "").trim();
    if (!ruleId) return apiError(res, 400, "RULE_ID_REQUIRED", "ruleId is required");
    const updates = { ...req.body };
    delete updates.ruleId;
    const rule = await updateAlertRule(advisorId, ruleId, updates);
    if (!rule) return apiError(res, 404, "RULE_NOT_FOUND", "Alert rule not found");
    return res.status(200).json({ rule });
  }

  if (req.method === "DELETE") {
    const ruleId = String(req.query.ruleId || "").trim();
    if (!ruleId) return apiError(res, 400, "RULE_ID_REQUIRED", "ruleId is required");
    const deleted = await deleteAlertRule(advisorId, ruleId);
    if (!deleted) return apiError(res, 404, "RULE_NOT_FOUND", "Alert rule not found");
    return res.status(200).json({ ok: true });
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
}
