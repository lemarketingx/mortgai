import { LeadStoreError, readStoreLeads, createLeadPurchase, readAdvisorPurchasedLeadIds } from "../../../lib/leadsStore";
import { getAdvisorSession } from "../../../lib/advisorAuth";

function apiError(res, status, code, message, details = "") {
  return res.status(status).json({ error: code, message, ...(details ? { details } : {}) });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");

  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  const leadId = String((req.body || {}).leadId || "").trim();
  if (!leadId) return apiError(res, 400, "LEAD_ID_REQUIRED", "leadId is required");

  try {
    const storeLeads = await readStoreLeads();
    const lead = storeLeads.find((l) => l.id === leadId);

    if (!lead) return apiError(res, 404, "LEAD_NOT_AVAILABLE", "Lead is not available in the store");
    if (lead.storeStatus === "sold") {
      return apiError(res, 409, "LEAD_ALREADY_SOLD", "הליד כבר נמכר ואינו זמין לרכישה.");
    }

    // Block duplicate purchase by the same advisor
    const ownedIds = await readAdvisorPurchasedLeadIds(session.advisorId);
    if (ownedIds.has(leadId)) {
      return apiError(res, 409, "ALREADY_PURCHASED_BY_ADVISOR", "כבר רכשתם את הליד הזה. ניתן למצוא אותו באזור 'הלידים שלי'.");
    }

    // Every purchase is exclusive — one advisor, lead marked sold immediately.
    // DB-level unique constraint on lead_id provides final race protection.
    const purchase = await createLeadPurchase({
      leadId,
      advisorId: session.advisorId,
      purchaseType: "exclusive",
      price: lead.storePrice || 0,
      isExclusive: true,
    });

    return res.status(200).json({ ok: true, purchase });
  } catch (error) {
    if (error instanceof LeadStoreError) {
      if (error.code === "LEAD_ALREADY_SOLD") {
        return apiError(res, 409, "LEAD_ALREADY_SOLD", "הליד כבר נרכש על ידי יועץ אחר.");
      }
      if (error.code === "TABLE_MISSING") {
        return apiError(res, 503, "TABLE_MISSING", "Lead store not configured — run SQL migration");
      }
      if (error.code === "EXCLUSIVE_STATUS_UPDATE_FAILED") {
        return apiError(res, 502, error.code, error.message, error.details || "");
      }
      const status = error.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
      return apiError(res, status, error.code, error.message, error.details || "");
    }
    return apiError(res, 500, "PURCHASE_FAILED", "Unexpected purchase error");
  }
}
