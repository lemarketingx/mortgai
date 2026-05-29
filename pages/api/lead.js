import { createLead } from "../../lib/leadsStore";
import { publicLeadSchema, validationErrorPayload } from "../../lib/validation";
import { checkLoginRateLimit, getClientIp, recordFailedLogin } from "../../lib/rateLimit";

function normalizeLeadFields(raw = {}) {
  const lead = { ...raw };
  // name aliases
  if (!lead.name) lead.name = lead.fullName || lead.full_name || lead.customerName || "";
  // phone aliases
  if (!lead.phone) lead.phone = lead.phoneNumber || lead.phone_number || lead.mobile || "";
  // city aliases
  if (!lead.city) lead.city = lead.cityName || lead.location || "";
  // numeric field snake_case → camelCase (passthrough already handles camelCase)
  if (lead.mortgage_amount !== undefined && lead.mortgageAmount === undefined) lead.mortgageAmount = lead.mortgage_amount;
  if (lead.property_price !== undefined && lead.propertyPrice === undefined) lead.propertyPrice = lead.property_price;
  if (lead.equity_amount !== undefined && lead.equityAmount === undefined) lead.equityAmount = lead.equity_amount;
  if (lead.monthly_income !== undefined && lead.monthlyIncome === undefined) lead.monthlyIncome = lead.monthly_income;
  if (lead.purchase_status !== undefined && lead.purchaseStatus === undefined) lead.purchaseStatus = lead.purchase_status;
  if (lead.approval_score !== undefined && lead.approvalScore === undefined) lead.approvalScore = lead.approval_score;
  if (lead.main_issue !== undefined && lead.mainIssue === undefined) lead.mainIssue = lead.main_issue;
  return lead;
}

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
  const rateLimit = checkLoginRateLimit(ip, { limit: 10, windowMs: 15 * 60 * 1000 });
  if (!rateLimit.allowed) {
    res.setHeader("Retry-After", String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)));
    return res.status(429).json({ ok: false, success: false, error: "TOO_MANY_REQUESTS", message: "יותר מדי בקשות. נסה שוב מאוחר יותר." });
  }
  recordFailedLogin(ip);

  const q = req.query || {};
  const rawLead = normalizeLeadFields(req.body?.lead || {});

  const nameVal = String(rawLead.name || "").trim();
  const phoneVal = String(rawLead.phone || "").trim();
  const missingName = nameVal.length < 2;
  const missingPhone = phoneVal.replace(/[^\d]/g, "").length < 7;

  if (missingName || missingPhone) {
    const code = missingName && missingPhone ? "missing_required_contact_fields" : missingName ? "missing_name" : "missing_phone";
    logLeadFailure("missing_required_fields", { code, payloadKeys: Object.keys(rawLead), route: "/api/lead" });
    return res.status(400).json({ ok: false, success: false, error: code });
  }

  const bodyWithUtm = {
    ...req.body,
    lead: {
      ...rawLead,
      utmSource: q.utm_source || rawLead.utmSource || "",
      utmMedium: q.utm_medium || rawLead.utmMedium || "",
      utmCampaign: q.utm_campaign || rawLead.utmCampaign || "",
      utmContent: q.utm_content || rawLead.utmContent || "",
      utmTerm: q.utm_term || rawLead.utmTerm || "",
      referrer: rawLead.referrer || req.headers.referer || "",
      landingPage: rawLead.landingPage || rawLead.landing_page || q.landing_page || "",
      estimatedApprovalResult: rawLead.estimatedApprovalResult ?? rawLead.estimated_approval_result,
      estimatedPayment: rawLead.estimatedPayment ?? rawLead.estimated_payment,
      propertyPrice: rawLead.propertyPrice ?? rawLead.property_price,
      equityAmount: rawLead.equityAmount ?? rawLead.equity_amount,
      monthlyIncome: rawLead.monthlyIncome ?? rawLead.monthly_income,
      debtLevel: rawLead.debtLevel ?? rawLead.debt_level,
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
      step: "supabase_insert",
      error: "SUPABASE_INSERT_FAILED",
      supabaseCode: insertError?.internalCode || "",
      message: "לא הצלחנו לשלוח את הפרטים כרגע. נסה שוב בעוד רגע.",
      localOnly,
    });
  }

  return res.status(200).json({ ok: true, success: true, lead: savedLead, localOnly });
}
