import { createLead } from "../../lib/leadsStore";
import { publicLeadSchema, validationErrorPayload } from "../../lib/validation";

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
      landingPage: req.body?.lead?.landingPage || q.landing_page || "",
    },
  };

  const parsed = publicLeadSchema.safeParse(bodyWithUtm);
  if (!parsed.success) {
    const validation = validationErrorPayload(parsed.error);
    logLeadFailure("validation_failed", {
      safeErrorCode: "VALIDATION_FAILED",
      issueCount: parsed.error?.issues?.length || 0,
      firstIssue: parsed.error?.issues?.[0]?.message || "",
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
