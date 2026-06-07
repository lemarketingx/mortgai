import { supabaseUpdatePasswordWithToken } from "../../../lib/supabaseAuth";
import { checkRateLimit, getClientIp, recordRateLimitHit } from "../../../lib/rateLimit";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");

  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(ip, { limit: 8, windowMs: 15 * 60 * 1000 });
  if (!rateLimit.allowed) {
    res.setHeader("Retry-After", String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)));
    return apiError(res, 429, "TOO_MANY_REQUESTS", "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.");
  }
  recordRateLimitHit(ip);

  const body = req.body || {};
  const accessToken = String(body.accessToken || "").trim();
  const password = String(body.password || "");

  if (!accessToken) {
    return apiError(res, 400, "INVALID_TOKEN", "קישור האיפוס אינו תקף. בקשו קישור חדש.");
  }
  if (password.length < 8) {
    return apiError(res, 400, "WEAK_PASSWORD", "הסיסמה חייבת להכיל לפחות 8 תווים");
  }

  const { error, ok } = await supabaseUpdatePasswordWithToken(accessToken, password);
  if (!ok) {
    return apiError(res, 400, "RESET_FAILED", "קישור האיפוס אינו תקף או פג תוקף. בקשו קישור חדש.");
  }

  return res.status(200).json({ ok: true });
}
