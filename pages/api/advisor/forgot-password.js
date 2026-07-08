import { supabasePasswordReset } from "../../../lib/supabaseAuth";
import { getClientIp, checkRateLimit, recordRateLimitHit } from "../../../lib/rateLimit";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });

  // Every request counts toward the limit — this endpoint triggers an outbound
  // reset email, so unlimited calls allow email bombing of arbitrary addresses.
  const ip = getClientIp(req);
  const RATE_OPTS = { scope: "advisor-forgot-password", limit: 5, windowMs: 15 * 60 * 1000 };
  const { allowed, resetAt } = await checkRateLimit(ip, RATE_OPTS);
  if (!allowed) {
    res.setHeader("Retry-After", String(Math.ceil((resetAt - Date.now()) / 1000)));
    return res.status(429).json({ error: "RATE_LIMITED", message: "יותר מדי בקשות. נסה שוב מאוחר יותר." });
  }
  await recordRateLimitHit(ip, RATE_OPTS);

  const email = String((req.body || {}).email || "").trim();
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "INVALID_EMAIL", message: "יש להזין כתובת אימייל תקינה" });
  }

  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || "").trim();
  const redirectTo = appUrl ? `${appUrl}/advisor/reset-password` : undefined;

  // Supabase handles delivery; always return success to prevent email enumeration,
  // even if the reset call itself throws (e.g. Supabase misconfigured).
  try {
    await supabasePasswordReset(email, redirectTo);
  } catch (e) {
    console.error("[advisor/forgot-password] supabasePasswordReset threw:", e?.message);
  }
  return res.status(200).json({ ok: true });
}
