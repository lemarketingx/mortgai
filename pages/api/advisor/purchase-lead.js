import { LeadStoreError, readStoreLeads, createLeadPurchase } from "../../../lib/leadsStore";
import { getAdvisorSession } from "../../../lib/advisorAuth";

const MAX_REGULAR_SLOTS = 3;

function apiError(res, status, code, message, details = "") {
  return res.status(status).json({ error: code, message, ...(details ? { details } : {}) });
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

    // Sold check (exclusive purchase already removed lead; race window covered below)
    if (lead.storeStatus === "sold") {
      return apiError(res, 409, "LEAD_ALREADY_SOLD", "הליד כבר נמכר ואינו זמין לרכישה.");
    }

    const purchaseCount = lead.purchaseCount || 0;

    if (purchaseType === "exclusive") {
      // Block exclusive if any regular purchases already exist.
      // Note: concurrent requests can still race through this check before either commits;
      // true prevention requires a DB-level unique constraint or transaction.
      if (purchaseCount > 0) {
        return apiError(res, 409, "LEAD_HAS_REGULAR_BUYERS", "הליד כבר נרכש כרכישה רגילה ולכן לא ניתן לרכוש אותו בבלעדיות.");
      }
    } else {
      // Block regular purchase if all slots are taken.
      if (purchaseCount >= MAX_REGULAR_SLOTS) {
        return apiError(res, 409, "LEAD_SLOTS_FULL", "כל המקומות לרכישת הליד כבר התמלאו.");
      }
    }

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
      if (error.code === "EXCLUSIVE_STATUS_UPDATE_FAILED") {
        return apiError(res, 502, error.code, error.message, error.details || "");
      }
      const status = error.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
      return apiError(res, status, error.code, error.message, error.details || "");
    }
    return apiError(res, 500, "PURCHASE_FAILED", "Unexpected purchase error");
  }
}
