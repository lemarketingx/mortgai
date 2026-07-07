import { isAdminPassword } from "../../../lib/leadsStore";
import { clearAdminSessionCookie, createAdminSessionCookie } from "../../../lib/adminAuth";
import {
  checkRateLimit as checkLoginRateLimit,
  clearRateLimit as clearLoginRateLimit,
  getClientIp,
  recordRateLimitHit as recordFailedLogin,
} from "../../../lib/rateLimit";

export default async function handler(req, res) {
  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", clearAdminSessionCookie());
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = getClientIp(req);
  const RATE_OPTS = { scope: "admin-login" };
  const limit = await checkLoginRateLimit(ip, RATE_OPTS);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(Math.ceil((limit.resetAt - Date.now()) / 1000)));
    return res.status(429).json({
      error: "TOO_MANY_LOGIN_ATTEMPTS",
      message: "Too many failed login attempts. Try again later.",
      retryAfterSeconds: Math.ceil((limit.resetAt - Date.now()) / 1000),
    });
  }

  const configuredPassword = String(process.env.ADMIN_PASSWORD || "").trim();
  if (!configuredPassword) {
    return res.status(500).json({ error: "ADMIN_PASSWORD_NOT_CONFIGURED" });
  }

  const password = String(req.body?.password || "").trim();
  if (!isAdminPassword(password)) {
    await recordFailedLogin(ip, RATE_OPTS);
    return res.status(401).json({ error: "INVALID_PASSWORD" });
  }

  try {
    await clearLoginRateLimit(ip, RATE_OPTS);
    res.setHeader("Set-Cookie", createAdminSessionCookie());
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "ADMIN_AUTH_NOT_CONFIGURED", message: error.message });
  }
}
