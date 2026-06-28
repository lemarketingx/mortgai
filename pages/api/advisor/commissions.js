import { createCommission, getCommissions, updateCommission, getCommissionStats, deleteCommission } from "../../../lib/commissionsStore";
import { getAdvisorSession } from "../../../lib/advisorAuth";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  const advisorId = session.advisorId;

  if (req.method === "GET") {
    if (req.query.stats === "true") {
      const stats = await getCommissionStats(advisorId);
      return res.status(200).json({ stats });
    }
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.leadId) filters.leadId = req.query.leadId;
    const commissions = await getCommissions(advisorId, filters);
    return res.status(200).json({ commissions });
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const leadId = String(body.leadId || "").trim();
    if (!leadId) return apiError(res, 400, "LEAD_ID_REQUIRED", "leadId is required");
    const loanAmount = Number(body.loanAmount);
    if (!loanAmount || loanAmount <= 0) return apiError(res, 400, "LOAN_AMOUNT_REQUIRED", "loanAmount is required and must be positive");
    const commission = await createCommission({
      advisorId,
      leadId,
      loanAmount,
      rate: body.rate || null,
      status: body.status || "pending",
      notes: body.notes || "",
    });
    if (!commission) return apiError(res, 503, "COMMISSION_CREATE_FAILED", "Could not create commission");
    return res.status(201).json({ commission });
  }

  if (req.method === "PATCH") {
    const commissionId = String(req.body?.commissionId || "").trim();
    if (!commissionId) return apiError(res, 400, "COMMISSION_ID_REQUIRED", "commissionId is required");
    const updates = {};
    const allowed = ["loanAmount", "rate", "status", "notes"];
    for (const key of allowed) {
      if (req.body?.[key] !== undefined) updates[key] = req.body[key];
    }
    const commission = await updateCommission(advisorId, commissionId, updates);
    if (!commission) return apiError(res, 404, "COMMISSION_NOT_FOUND", "Commission not found");
    return res.status(200).json({ commission });
  }

  if (req.method === "DELETE") {
    const commissionId = String(req.query.commissionId || "").trim();
    if (!commissionId) return apiError(res, 400, "COMMISSION_ID_REQUIRED", "commissionId is required");
    const deleted = await deleteCommission(advisorId, commissionId);
    if (!deleted) return apiError(res, 404, "COMMISSION_NOT_FOUND", "Commission not found");
    return res.status(200).json({ ok: true });
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
}
