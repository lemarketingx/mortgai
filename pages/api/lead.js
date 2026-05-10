import { createLead } from "../../lib/leadsStore";
import { publicLeadSchema, validationErrorPayload } from "../../lib/validation";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const parsed = publicLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(validationErrorPayload(parsed.error));
  }

  const webhookUrl = process.env.LEAD_WEBHOOK_URL;
  let savedLead = null;

  try {
    savedLead = await createLead(parsed.data);
  } catch (error) {
    console.error("Lead database save failed", {
      code: error?.code || "LEAD_SAVE_FAILED",
      message: error?.message || "",
      details: error?.details || "",
    });
    return res.status(503).json({
      ok: false,
      error: "LEAD_PERSISTENCE_FAILED",
      message: "Could not save lead. Please retry.",
    });
  }

  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed.data, savedLead }),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        console.warn("Lead webhook failed", response.status, body);
      }
    } catch (error) {
      console.warn("Lead webhook unavailable", error);
    }
  }

  return res.status(200).json({ ok: true, lead: savedLead });
}
