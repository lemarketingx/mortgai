import { createHash } from "crypto";
import { LeadStoreError, readStoreLeads, createLeadPurchase, readAdvisorPurchasedLeadIds, lockLeadForPurchase } from "../../../lib/leadsStore";
import { getAdvisorSession } from "../../../lib/advisorAuth";
import { checkIdempotencyKey, createIdempotencyKey, completeIdempotencyKey, failIdempotencyKey } from "../../../lib/idempotencyStore";
import { createNotification } from "../../../lib/notificationsStore";

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

  const idempotencyKey = `purchase:${session.advisorId}:${leadId}`;
  const requestHash = createHash("sha256").update(JSON.stringify({ advisorId: session.advisorId, leadId })).digest("hex");

  const existing = await checkIdempotencyKey(idempotencyKey);
  if (existing) {
    if (existing.status === "completed") {
      return apiError(res, 409, "ALREADY_PURCHASED_BY_ADVISOR", "הליד כבר נרכש על ידך. ניתן למצוא אותו באזור 'הלידים שלי'.");
    }
    if (existing.status === "processing") {
      return apiError(res, 409, "PURCHASE_IN_PROGRESS", "הרכישה כבר בתהליך. אנא המתן.");
    }
  }

  const idemRecord = await createIdempotencyKey({
    key: idempotencyKey,
    advisorId: session.advisorId,
    endpoint: "purchase-lead",
    requestHash,
  });

  if (idemRecord && idemRecord.status === "completed") {
    return apiError(res, 409, "ALREADY_PURCHASED_BY_ADVISOR", "הליד כבר נרכש על ידך. ניתן למצוא אותו באזור 'הלידים שלי'.");
  }

  try {
    const ownedIds = await readAdvisorPurchasedLeadIds(session.advisorId);
    if (ownedIds.has(leadId)) {
      await failIdempotencyKey(idempotencyKey);
      return apiError(res, 409, "ALREADY_PURCHASED_BY_ADVISOR", "הליד כבר נרכש על ידך. ניתן למצוא אותו באזור 'הלידים שלי'.");
    }

    const storeLeads = await readStoreLeads();
    const lead = storeLeads.find((l) => l.id === leadId);

    // readStoreLeads() already filters by isSellable=true AND storeStatus='available'
    if (!lead) {
      await failIdempotencyKey(idempotencyKey);
      return apiError(res, 409, "LEAD_ALREADY_SOLD", "הליד כבר נמכר ואינו זמין לרכישה.");
    }

    // Price comes exclusively from DB (price_at_creation set at lead creation time).
    // We never accept a price from the client request body.
    const price = lead.priceAtCreation;
    if (!price || typeof price !== "number" || price <= 0) {
      await failIdempotencyKey(idempotencyKey);
      return apiError(res, 409, "LEAD_NOT_PRICED", "הליד אינו מתומחר ואינו זמין לרכישה.");
    }

    const locked = await lockLeadForPurchase(leadId, {
      buyerAdvisorId: session.advisorId,
      storeStatus: "sold",
      requireSellable: true,
    });
    if (!locked) {
      await failIdempotencyKey(idempotencyKey);
      return apiError(res, 409, "LEAD_ALREADY_SOLD", "הליד כבר נמכר ואינו זמין לרכישה.");
    }

    let purchase;
    try {
      purchase = await createLeadPurchase({
        leadId,
        advisorId: session.advisorId,
        purchaseType: "regular",
        price,
        isExclusive: true,
      });
    } catch (purchaseError) {
      console.error("[lead-purchase] locked_lead_purchase_insert_failed", {
        leadId,
        advisorId: session.advisorId,
        errorCode: purchaseError?.code || "",
        message: purchaseError?.message || String(purchaseError),
      });
      throw purchaseError;
    }

    createNotification({
      advisorId: session.advisorId,
      type: "lead_purchase",
      title: `ליד חדש נרכש: ${locked.name || "ללא שם"}`,
      message: `הליד ${locked.name || ""} מ-${locked.city || "לא ידוע"} נוסף לתיקים שלך`,
      entityType: "lead",
      entityId: leadId,
      priority: "high",
      dedupeKey: `lead_purchase:${leadId}`,
    }).catch(() => {});

    const responseJson = { ok: true, purchase, lead: locked };
    await completeIdempotencyKey(idempotencyKey, responseJson);
    return res.status(200).json(responseJson);
  } catch (error) {
    await failIdempotencyKey(idempotencyKey);
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
