import { LeadStoreError, readAdvisors, readStoreLeads, readAdvisorPurchasedLeadIds } from "../../../lib/leadsStore";
import { getAdvisorSession } from "../../../lib/advisorAuth";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  if (req.method !== "GET") return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");

  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  try {
    const [leads, advisors, ownedIds] = await Promise.all([
      readStoreLeads(),
      readAdvisors(),
      readAdvisorPurchasedLeadIds(session.advisorId),
    ]);
    const advisor = advisors.find((a) => String(a.advisor_id || "") === session.advisorId);
    const isPartnerAdvisor = String(advisor?.advisor_type || "").trim().toLowerCase() === "partner";
    const markedLeads = leads.map((l) => ownedIds.has(l.id) ? { ...l, _ownedByAdvisor: true } : l);
    return res.status(200).json({ leads: markedLeads, isPartnerAdvisor });
  } catch (error) {
    if (error instanceof LeadStoreError) {
      const status = error.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
      return apiError(res, status, error.code, error.message);
    }
    return apiError(res, 500, "STORE_LEADS_FAILED", "Unexpected error");
  }
}
