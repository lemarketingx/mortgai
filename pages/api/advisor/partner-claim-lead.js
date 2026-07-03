import { LeadStoreError, createLeadPurchase, readAdvisors, readLeads, lockLeadForPurchase } from "../../../lib/leadsStore";
import { getAdvisorSession } from "../../../lib/advisorAuth";

function apiError(res, status, code, message, details = "") {
  return res.status(status).json({ error: code, message, ...(details ? { details } : {}) });
}

function isPartnerAdvisor(advisor) {
  return String(advisor?.advisor_type || "").trim().toLowerCase() === "partner";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");

  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  const leadId = String((req.body || {}).leadId || "").trim();
  if (!leadId) return apiError(res, 400, "LEAD_ID_REQUIRED", "leadId is required");

  try {
    const advisors = await readAdvisors();
    const advisor = advisors.find((a) => String(a.advisor_id || "") === session.advisorId);
    if (!advisor) return apiError(res, 404, "ADVISOR_NOT_FOUND", "Advisor profile not found");
    if (!isPartnerAdvisor(advisor)) return apiError(res, 403, "PARTNER_ONLY", "Partner advisor access required");

    const leads = await readLeads();
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return apiError(res, 404, "LEAD_NOT_FOUND", "Lead not found");

    const locked = await lockLeadForPurchase(leadId, {
      buyerAdvisorId: session.advisorId,
      storeStatus: "claimed_by_partner",
    });

    if (!locked) {
      return apiError(res, 409, "LEAD_NOT_AVAILABLE", "Lead is not available for partner claim");
    }

    let purchase;
    try {
      purchase = await createLeadPurchase({
        leadId,
        advisorId: session.advisorId,
        purchaseType: "partner_claim",
        price: 0,
        isExclusive: true,
      });
    } catch (error) {
      console.error("[partner-claim] locked_lead_purchase_insert_failed", {
        leadId,
        advisorId: session.advisorId,
        errorCode: error?.code || "",
        message: error?.message || String(error),
      });
      throw error;
    }

    return res.status(200).json({ ok: true, purchase, lead: locked });
  } catch (error) {
    if (error instanceof LeadStoreError) {
      if (error.code === "TABLE_MISSING") {
        return apiError(res, 503, "TABLE_MISSING", "Lead store not configured — run SQL migration");
      }
      const status = error.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
      return apiError(res, status, error.code, error.message, error.details || "");
    }
    return apiError(res, 500, "PARTNER_CLAIM_FAILED", "Unexpected partner claim error");
  }
}
