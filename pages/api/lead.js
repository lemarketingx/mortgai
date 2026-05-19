import { createLead } from "../../lib/leadsStore";
import { publicLeadSchema, validationErrorPayload } from "../../lib/validation";
import { checkRateLimit, getClientIp, recordRateLimitHit } from "../../lib/rateLimit";

function buildSafeLeadError(error) {
  const code = String(error?.code || "UNKNOWN_LEAD_ERROR");
  if (code === "SUPABASE_ENV_MISSING" || code === "SUPABASE_URL_INVALID") return "SUPABASE_NOT_CONFIGURED";
  if (code === "SUPABASE_MISSING_COLUMN" || code === "SUPABASE_CREATE_FAILED" || code === "SUPABASE_INSERT_EMPTY_PAYLOAD") return "SUPABASE_INSERT_FAILED";
  return "UNKNOWN_LEAD_ERROR";
}

function logLeadFailure(stage, payload = {}) {
  console.error(`[lead-api:${stage}]`, {
    ...payload,
    at: new Date().toISOString(),
  });
}

function safeValidationIssues(error) {
  return (error?.issues || []).map((issue) => ({
    path: Array.isArray(issue?.path) ? issue.path.join(".") : "",
    code: issue?.code || "",
    message: issue?.message || "",
  }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(ip, { limit: 10, windowMs: 15 * 60 * 1000 });
  if (!rateLimit.allowed) {
    res.setHeader("Retry-After", String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)));
    return res.status(429).json({ ok: false, success: false, error: "TOO_MANY_REQUESTS", message: "יותר מדי בקשות. נסה שוב מאוחר יותר." });
  }
  recordRateLimitHit(ip);

  const q = req.query || {};
  const bodyWithUtm = {
    ...req.body,
    lead: {
      ...(req.body?.lead || {}),
      utmSource: q.utm_source || req.body?.lead?.utmSource || "",
      utmMedium: q.utm_medium || req.body?.lead?.utmMedium || "",
      utmCampaign: q.utm_campaign || req.body?.lead?.utmCampaign || "",
      utmContent: q.utm_content || req.body?.lead?.utmContent || "",
      utmTerm: q.utm_term || req.body?.lead?.utmTerm || "",
      referrer: req.body?.lead?.referrer || req.headers.referer || "",
      landingPage: req.body?.lead?.landingPage || req.body?.lead?.landing_page || q.landing_page || "",
      estimatedApprovalResult: req.body?.lead?.estimatedApprovalResult ?? req.body?.lead?.estimated_approval_result,
      estimatedPayment: req.body?.lead?.estimatedPayment ?? req.body?.lead?.estimated_payment,
      propertyPrice: req.body?.lead?.propertyPrice ?? req.body?.lead?.property_price,
      equityAmount: req.body?.lead?.equityAmount ?? req.body?.lead?.equity_amount,
      monthlyIncome: req.body?.lead?.monthlyIncome ?? req.body?.lead?.monthly_income,
      debtLevel: req.body?.lead?.debtLevel ?? req.body?.lead?.debt_level,
    },
  };

  const parsed = publicLeadSchema.safeParse(bodyWithUtm);
  if (!parsed.success) {
    const validation = validationErrorPayload(parsed.error);
    logLeadFailure("validation_failed", {
      safeErrorCode: "VALIDATION_FAILED",
      issueCount: parsed.error?.issues?.length || 0,
      firstIssue: parsed.error?.issues?.[0]?.message || "",
      issues: safeValidationIssues(parsed.error),
    });
    return res.status(400).json({ ok: false, success: false, error: "VALIDATION_FAILED", details: validation.details || [] });
  }
  req.body = parsed.data;

  const webhookUrl = process.env.LEAD_WEBHOOK_URL;
  let savedLead = null;
  let localOnly = false;
  let insertError = null;

  try {
    savedLead = await createLead(req.body);
  } catch (error) {
    localOnly = true;
    const safeError = buildSafeLeadError(error);
    insertError = {
      code: safeError,
      internalCode: error?.code || "LEAD_SAVE_FAILED",
      message: error?.message || "",
      details: error?.details || "",
    };
    logLeadFailure("insert_failed", {
      safeErrorCode: safeError,
      internalCode: error?.code || "LEAD_SAVE_FAILED",
      message: error?.message || "",
      details: error?.details || "",
      stack: error?.stack || "",
      leadKeys: Object.keys(req.body?.lead || {}),
    });
  }

  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...req.body, savedLead }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        console.warn("Lead webhook failed", response.status, body);
      }
    } catch (error) {
      console.warn("Lead webhook unavailable", error);
    }
  }

  if (!savedLead) {
    return res.status(500).json({
      ok: false,
      success: false,
      error: insertError?.code || "UNKNOWN_LEAD_ERROR",
      message: "Lead was not saved to CRM",
      localOnly,
    });
  }

  return res.status(200).json({ ok: true, success: true, lead: savedLead, localOnly });
}
