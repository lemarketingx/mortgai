import { sendContactMessage } from "../../lib/email";
import { getClientIp, checkRateLimit, recordRateLimitHit } from "../../lib/rateLimit";

const VALID_TYPES = ["general", "privacy", "advisor", "accessibility"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });

  // Outbound-email endpoint — rate-limit to prevent inbox flooding.
  const ip = getClientIp(req);
  const RATE_OPTS = { scope: "contact", limit: 5, windowMs: 15 * 60 * 1000 };
  const { allowed, resetAt } = await checkRateLimit(ip, RATE_OPTS);
  if (!allowed) {
    res.setHeader("Retry-After", String(Math.ceil((resetAt - Date.now()) / 1000)));
    return res.status(429).json({ error: "RATE_LIMITED", message: "יותר מדי פניות. נסו שוב מאוחר יותר." });
  }
  await recordRateLimitHit(ip, RATE_OPTS);

  const body = typeof req.body === "object" && req.body ? req.body : {};
  const name = String(body.name || "").trim().slice(0, 120);
  const email = String(body.email || "").trim().slice(0, 160);
  const type = VALID_TYPES.includes(body.type) ? body.type : "general";
  const message = String(body.message || "").trim().slice(0, 4000);

  if (!name || !email || !email.includes("@") || message.length < 2) {
    return res.status(400).json({ error: "MISSING_FIELDS", message: "נא למלא שם, אימייל תקין ותוכן הפנייה." });
  }

  const result = await sendContactMessage({ name, email, type, message });

  // If email delivery isn't configured yet, don't fail the user — log and accept.
  if (!result.ok && result.reason === "not_configured") {
    console.warn("[contact] delivery not configured; message not emailed", { type });
    return res.status(200).json({ ok: true, delivered: false });
  }
  if (!result.ok) {
    return res.status(502).json({ error: "SEND_FAILED", message: "לא הצלחנו לשלוח את הפנייה כרגע. נסו שוב או שלחו לנו מייל ישירות." });
  }

  return res.status(200).json({ ok: true, delivered: true });
}
