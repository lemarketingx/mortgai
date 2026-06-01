import { hasAdminSession } from "../../../lib/adminAuth";
import { LeadStoreError, createLead, updateLead } from "../../../lib/leadsStore";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");

  try {
    if (!hasAdminSession(req)) {
      return apiError(res, 401, "ADMIN_AUTH_REQUIRED", "Admin session cookie is missing or expired");
    }
  } catch (err) {
    return apiError(res, 500, "ADMIN_AUTH_NOT_CONFIGURED", err.message || "ADMIN_SESSION_SECRET is missing");
  }

  const body = req.body || {};
  const { name, phone, purchaseStatus } = body;

  if (!name || String(name).trim().length < 1) {
    return apiError(res, 400, "VALIDATION_ERROR", "שם הלקוח הוא שדה חובה.");
  }
  if (!phone || String(phone).trim().length < 6) {
    return apiError(res, 400, "VALIDATION_ERROR", "מספר טלפון הוא שדה חובה.");
  }
  if (!purchaseStatus) {
    return apiError(res, 400, "VALIDATION_ERROR", "סוג תיק הוא שדה חובה.");
  }

  try {
    const publishToStore = body.publishToStore === true || body.publishToStore === "true";

    const lead = await createLead({
      name: String(name).trim(),
      phone: String(phone).trim(),
      city: body.city || "",
      propertyCity: body.propertyCity || body.city || "",
      purchaseStatus,
      mortgageAmount: body.mortgageAmount || null,
      equityAmount: body.equityAmount || null,
      monthlyIncome: body.monthlyIncome || null,
      debtLevel: body.debtLevel || null,
      hasExistingMortgage: body.hasExistingMortgage || "",
      requestedContactTime: body.requestedContactTime || "",
      source: body.source || "admin_manual",
      createdBy: "Admin",
    });

    if (publishToStore && lead?.id) {
      const qualityUpgrade = lead.leadQuality === "חלש" ? { leadQuality: "בינוני" } : {};
      console.log("[admin.create-lead] publishToStore", { id: lead.id, currentQuality: lead.leadQuality, qualityUpgrade });
      const updated = await updateLead(lead.id, { storeStatus: "available", ...qualityUpgrade });
      console.log("[admin.create-lead] updateLead result storeStatus", updated?.storeStatus, "leadQuality", updated?.leadQuality);
      lead.storeStatus = "available";
      if (qualityUpgrade.leadQuality) lead.leadQuality = qualityUpgrade.leadQuality;
    }

    return res.status(200).json({ ok: true, lead });
  } catch (err) {
    if (err instanceof LeadStoreError) {
      return apiError(res, 502, err.code, err.message);
    }
    return apiError(res, 500, "LEAD_CREATE_FAILED", err?.message || "יצירת הליד נכשלה.");
  }
}
