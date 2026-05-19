import { LeadStoreError, readStoreLeads, createLeadPurchase } from "../../../lib/leadsStore";
import { getAdvisorSession } from "../../../lib/advisorAuth";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");

  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  const body = req.body || {};
  const leadId = String(body.leadId || "").trim();
  const purchaseType = body.purchaseType === "exclusive" ? "exclusive" : "regular";

  if (!leadId) return apiError(res, 400, "LEAD_ID_REQUIRED", "leadId is required");

  try {
    const storeLeads = await readStoreLeads();
    const lead = storeLeads.find((l) => l.id === leadId);

    if (!lead) return apiError(res, 404, "LEAD_NOT_AVAILABLE", "Lead is not available in the store");
    if (lead.storeStatus === "sold") return apiError(res, 409, "LEAD_ALREADY_SOLD", "Lead has already been sold exclusively");

    const isExclusive = purchaseType === "exclusive";
    const price = isExclusive ? (lead.exclusivePrice || 0) : (lead.storePrice || 0);

    const purchase = await createLeadPurchase({
      leadId,
      advisorId: session.advisorId,
      purchaseType,
      price,
      isExclusive,
    });

    return res.status(200).json({ ok: true, purchase });
  } catch (error) {
    if (error instanceof LeadStoreError) {
      if (error.code === "TABLE_MISSING") {
        return apiError(res, 503, "TABLE_MISSING", "Lead store not configured — run SQL migration");
      }
      const status = error.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
      return apiError(res, status, error.code, error.message);
    }
    return apiError(res, 500, "PURCHASE_FAILED", "Unexpected purchase error");
  }
}
