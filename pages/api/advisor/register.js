import { createAdvisor } from "../../../lib/leadsStore";
import { randomUUID } from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });

  const body = req.body || {};
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();

  if (name.length < 2 || phone.length < 9) {
    return res.status(400).json({ error: "VALIDATION_ERROR", message: "שם מלא וטלפון תקין הם שדות חובה" });
  }

  const advisorId = `reg_${randomUUID().slice(0, 8)}`;
  const notes = [
    body.email && `email:${body.email}`,
    body.region && `region:${body.region}`,
    body.license && `license:${body.license}`,
    body.message && `msg:${body.message}`,
  ].filter(Boolean).join(" | ").slice(0, 255);

  try {
    await createAdvisor({
      advisorId,
      name,
      phone,
      email: String(body.email || "").trim(),
      active: false,
      commissionType: "registration_request",
      commissionAmount: notes,
    });
  } catch {
    // Log but still return ok — don't block the UX on DB errors
    console.error("[advisor/register] DB insert failed for", name);
  }

  return res.status(200).json({ ok: true });
}
