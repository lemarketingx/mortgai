import { getAdvisorSession } from "../../../lib/advisorAuth";
import { readPricingProfile, upsertPricingProfile, PRICING_MODELS } from "../../../lib/pricingStore";
import { LeadStoreError } from "../../../lib/leadsStore";

const IS_DEV = process.env.NODE_ENV !== "production";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

function validatePricingBody(body) {
  const { pricingModel, fixedFee, percentFee, leadTypeRules } = body;

  if (!pricingModel || !PRICING_MODELS.includes(pricingModel)) {
    return `pricing_model must be one of: ${PRICING_MODELS.join(", ")}`;
  }
  if (pricingModel === "fixed" && (!fixedFee || Number(fixedFee) <= 0)) {
    return "fixed_fee must be a positive number";
  }
  if (pricingModel === "percent" && (!percentFee || Number(percentFee) <= 0 || Number(percentFee) > 100)) {
    return "percent_fee must be between 0 and 100";
  }
  if (pricingModel === "by_lead_type" && (!leadTypeRules || typeof leadTypeRules !== "object" || Object.keys(leadTypeRules).length === 0)) {
    return "lead_type_rules must be a non-empty object";
  }
  return null;
}

export default async function handler(req, res) {
  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  if (req.method === "GET") {
    try {
      const profile = await readPricingProfile(session.advisorId);
      if (IS_DEV) console.log("[pricing API] GET result:", profile ? profile.pricingModel : "null");
      return res.status(200).json({ profile });
    } catch (error) {
      if (IS_DEV) console.log("[pricing API] GET error:", error.code, error.message);
      if (error instanceof LeadStoreError) {
        if (error.code === "SUPABASE_ENV_MISSING") return apiError(res, 503, error.code, error.message);
        return apiError(res, 502, error.code, error.message);
      }
      return apiError(res, 500, "PRICING_READ_FAILED", "Unexpected error");
    }
  }

  if (req.method === "PUT" || req.method === "POST") {
    const body = req.body || {};
    const validationError = validatePricingBody(body);
    if (validationError) {
      return apiError(res, 400, "INVALID_PRICING_DATA", validationError);
    }

    try {
      if (IS_DEV) console.log("[pricing API] upsert:", body.pricingModel, "for advisor", session.advisorId);
      const profile = await upsertPricingProfile(session.advisorId, {
        pricingModel: body.pricingModel,
        fixedFee: body.fixedFee || 0,
        percentFee: body.percentFee || 0,
        hybridBaseFee: body.hybridBaseFee || 0,
        hybridPercentFee: body.hybridPercentFee || 0,
        leadTypeRules: body.leadTypeRules || {},
      });
      if (IS_DEV) console.log("[pricing API] upsert result:", profile ? "ok" : "null");
      return res.status(200).json({ profile });
    } catch (error) {
      if (IS_DEV) console.log("[pricing API] upsert error:", error.code, error.message);
      if (error instanceof LeadStoreError) {
        if (error.code === "SUPABASE_ENV_MISSING") return apiError(res, 503, error.code, error.message);
        if (error.code === "TABLE_MISSING") return apiError(res, 503, error.code, error.message);
        return apiError(res, 502, error.code, error.message);
      }
      return apiError(res, 500, "PRICING_UPDATE_FAILED", "Unexpected error");
    }
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
}
