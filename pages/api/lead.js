import { createLead } from "../../lib/leadsStore";

function isValidLeadPayload(body) {
  const lead = body?.lead;
  if (!lead || typeof lead !== "object") return false;
  const name = String(lead.name || "").trim();
  const phone = String(lead.phone || "").replace(/[^\d]/g, "");
  return Boolean(name) && phone.length >= 9;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isValidLeadPayload(req.body)) {
    return res.status(400).json({ error: "INVALID_LEAD_PAYLOAD" });
  }

  const webhookUrl = process.env.LEAD_WEBHOOK_URL;
  let savedLead = null;

  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        return res.status(502).json({ error: "Lead webhook failed" });
      }
    } catch {
      return res.status(502).json({ error: "Lead webhook unavailable" });
    }
  }

  try {
    savedLead = await createLead(req.body);
  } catch {
    return res.status(500).json({ error: "Lead save failed" });
  }

  return res.status(200).json({ ok: true, lead: savedLead });
}
