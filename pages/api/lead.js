import { createLead } from "../../lib/leadsStore";
import { publicLeadSchema, validationErrorPayload } from "../../lib/validation";

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
    },
  };

  const parsed = publicLeadSchema.safeParse(bodyWithUtm);
  if (!parsed.success) {
    return res.status(400).json(validationErrorPayload(parsed.error));
  }
  req.body = parsed.data;

  const webhookUrl = process.env.LEAD_WEBHOOK_URL;
  let savedLead = null;
  let localOnly = false;

  try {
    savedLead = await createLead(req.body);
  } catch (error) {
    localOnly = true;
    console.error("Lead database save failed; accepting lead without database persistence", {
      code: error?.code || "LEAD_SAVE_FAILED",
      message: error?.message || "",
      details: error?.details || "",
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

  return res.status(200).json({ ok: true, lead: savedLead, localOnly });
}
