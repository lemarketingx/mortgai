import { supabasePasswordReset } from "../../../lib/supabaseAuth";
import { checkRateLimit, getClientIp, recordRateLimitHit } from "../../../lib/rateLimit";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });

  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(ip, { limit: 5, windowMs: 15 * 60 * 1000 });
  if (!rateLimit.allowed) {
    res.setHeader("Retry-After", String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)));
    // Same generic message as success — never reveal rate-limit state tied to a specific email
    return res.status(200).json({ ok: true });
  }
  recordRateLimitHit(ip);

  const email = String((req.body || {}).email || "").trim();
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "INVALID_EMAIL", message: "יש להזין כתובת אימייל תקינה" });
  }

  // Supabase handles delivery; always return success to prevent email enumeration
  await supabasePasswordReset(email);
  return res.status(200).json({ ok: true });
}
