import { LeadStoreError, readStoreLeads, createLeadPurchase, readAdvisorPurchasedLeadIds } from "../../../lib/leadsStore";
import { getAdvisorSession } from "../../../lib/advisorAuth";
import { createNotification } from "../../../lib/notificationsStore";

const FIXED_LEAD_PRICE = 249;

function apiError(res, status, code, message, details = "") {
  return res.status(status).json({ error: code, message, ...(details ? { details } : {}) });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");

  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  const body = req.body || {};
  const leadId = String(body.leadId || "").trim();

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
      return apiError(res, 409, "ALREADY_PURCHASED_BY_ADVISOR", "הליד כבר נרכש על ידך. ניתן למצוא אותו באזור 'הלידים שלי'.");
    }

    const price = lead.storePrice || FIXED_LEAD_PRICE;

    const purchase = await createLeadPurchase({
      leadId,
      advisorId: session.advisorId,
      purchaseType: "regular",
      price,
      isExclusive: false,
    });

    createNotification({
      advisorId: session.advisorId,
      type: "lead_purchase",
      title: `ליד חדש נרכש: ${lead.name || "ללא שם"}`,
      message: `הליד ${lead.name || ""} מ-${lead.city || "לא ידוע"} נוסף לתיקים שלך`,
      entityType: "lead",
      entityId: leadId,
      priority: "high",
    }).catch(() => {});

    return res.status(200).json({ ok: true, purchase });
  } catch (error) {
    if (error instanceof LeadStoreError) {
      if (error.code === "TABLE_MISSING") {
        return apiError(res, 503, "TABLE_MISSING", "Lead store not configured — run SQL migration");
      }
      const status = error.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
      return apiError(res, status, error.code, error.message, error.details || "");
    }
    return apiError(res, 500, "PURCHASE_FAILED", "Unexpected purchase error");
  }
}
