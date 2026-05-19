import { createAdvisorApplication } from "../../../lib/leadsStore";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });

  const body = req.body || {};
  const fullName = String(body.fullName || body.name || "").trim();
  const phone = String(body.phone || "").trim();
  const email = String(body.email || "").trim();

  if (fullName.length < 2) {
    return res.status(400).json({ error: "VALIDATION_ERROR", message: "שם מלא הוא שדה חובה (לפחות 2 תווים)" });
  }
  if (phone.length < 9) {
    return res.status(400).json({ error: "VALIDATION_ERROR", message: "טלפון תקין הוא שדה חובה" });
  }
  if (!body.consent) {
    return res.status(400).json({ error: "VALIDATION_ERROR", message: "נדרשת הסכמה ליצירת קשר" });
  }

  try {
    await createAdvisorApplication({
      fullName,
      phone,
      email,
      region: String(body.region || "").trim().slice(0, 120),
      businessName: String(body.businessName || "").trim().slice(0, 120),
      experienceYears: String(body.experienceYears || "").trim().slice(0, 40),
      advisorType: String(body.advisorType || "").trim().slice(0, 80),
      notes: String(body.notes || "").trim().slice(0, 1000),
      status: "pending",
    });
  } catch (err) {
    console.error("[advisor/register] application insert failed:", err?.message || err);
    // Graceful degradation — don't expose DB errors to the UX
  }

  return res.status(200).json({ ok: true });
}
