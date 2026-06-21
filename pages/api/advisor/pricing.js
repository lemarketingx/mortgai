import { getAdvisorSession } from "../../../lib/advisorAuth";
import { readPricingProfile, upsertPricingProfile, PRICING_MODELS } from "../../../lib/pricingStore";
import { LeadStoreError } from "../../../lib/leadsStore";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  if (req.method === "GET") {
    try {
      const profile = await readPricingProfile(session.advisorId);
      return res.status(200).json({ profile });
    } catch (error) {
      if (error instanceof LeadStoreError) {
        if (error.code === "SUPABASE_ENV_MISSING") return apiError(res, 503, error.code, error.message);
        return apiError(res, 502, error.code, error.message);
      }
      return apiError(res, 500, "PRICING_READ_FAILED", "Unexpected error");
    }
  }

  if (req.method === "PUT") {
    const { pricingModel, fixedFee, percentFee, hybridBaseFee, hybridPercentFee, leadTypeRules } = req.body || {};

    if (!pricingModel || !PRICING_MODELS.includes(pricingModel)) {
      return apiError(res, 400, "INVALID_PRICING_MODEL", `pricing_model must be one of: ${PRICING_MODELS.join(", ")}`);
    }

    if (pricingModel === "fixed" && (!fixedFee || Number(fixedFee) <= 0)) {
      return apiError(res, 400, "INVALID_FIXED_FEE", "fixed_fee must be a positive number");
    }

    if (pricingModel === "percent" && (!percentFee || Number(percentFee) <= 0 || Number(percentFee) > 100)) {
      return apiError(res, 400, "INVALID_PERCENT_FEE", "percent_fee must be between 0 and 100");
    }

    if (pricingModel === "by_lead_type" && (!leadTypeRules || typeof leadTypeRules !== "object" || Object.keys(leadTypeRules).length === 0)) {
      return apiError(res, 400, "INVALID_LEAD_TYPE_RULES", "lead_type_rules must be a non-empty object");
    }

    try {
      const profile = await upsertPricingProfile(session.advisorId, {
        pricingModel,
        fixedFee: fixedFee || 0,
        percentFee: percentFee || 0,
        hybridBaseFee: hybridBaseFee || 0,
        hybridPercentFee: hybridPercentFee || 0,
        leadTypeRules: leadTypeRules || {},
      });
      return res.status(200).json({ profile });
    } catch (error) {
      if (error instanceof LeadStoreError) {
        if (error.code === "SUPABASE_ENV_MISSING") return apiError(res, 503, error.code, error.message);
        return apiError(res, 502, error.code, error.message);
      }
      return apiError(res, 500, "PRICING_UPDATE_FAILED", "Unexpected error");
    }
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
}
