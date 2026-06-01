import { getAdvisorSession } from "../../../lib/advisorAuth";
import { readAdvisorPurchasedLeadIds } from "../../../lib/leadsStore";
import {
  DisputeStoreError,
  DISPUTE_REASONS,
  createDispute,
  hasDisputeForLead,
  readAdvisorDisputes,
} from "../../../lib/disputesStore";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  // GET — return this advisor's disputes (so UI can show existing status)
  if (req.method === "GET") {
    try {
      const disputes = await readAdvisorDisputes(session.advisorId);
      return res.status(200).json({ disputes });
    } catch (err) {
      if (err instanceof DisputeStoreError) {
        if (err.code === "TABLE_MISSING") return res.status(200).json({ disputes: [], tableMissing: true });
        return apiError(res, 502, err.code, err.message);
      }
      return apiError(res, 500, "READ_FAILED", err?.message || "Failed to read disputes");
    }
  }

  // POST — submit a new dispute
  if (req.method === "POST") {
    const body = req.body || {};
    const leadId     = String(body.leadId     || "").trim();
    const reason     = String(body.reason     || "").trim();
    const description= String(body.description|| "").trim();

    if (!leadId)  return apiError(res, 400, "VALIDATION_ERROR", "leadId חסר.");
    if (!reason)  return apiError(res, 400, "VALIDATION_ERROR", "יש לבחור סיבה.");
    if (!DISPUTE_REASONS.includes(reason)) return apiError(res, 400, "VALIDATION_ERROR", "סיבה לא תקינה.");

    try {
      // Security: advisor can only dispute leads they purchased
      const ownedIds = await readAdvisorPurchasedLeadIds(session.advisorId);
      if (!ownedIds.has(leadId)) {
        return apiError(res, 403, "NOT_PURCHASED", "לא ניתן לדווח על ליד שלא רכשתם.");
      }

      // Prevent duplicate disputes for the same lead
      const alreadyDisputed = await hasDisputeForLead(session.advisorId, leadId);
      if (alreadyDisputed) {
        return apiError(res, 409, "ALREADY_DISPUTED", "כבר שלחתם בקשה עבור ליד זה.");
      }

      const dispute = await createDispute({
        leadId,
        advisorId: session.advisorId,
        reason,
        description,
      });
      return res.status(200).json({ ok: true, dispute });
    } catch (err) {
      if (err instanceof DisputeStoreError) {
        if (err.code === "TABLE_MISSING") return apiError(res, 503, "TABLE_MISSING", "מערכת הערעורים עדיין לא הופעלה. פנו לתמיכה.");
        return apiError(res, 502, err.code, err.message);
      }
      return apiError(res, 500, "CREATE_FAILED", err?.message || "שגיאה בשליחת הדיווח.");
    }
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
}
