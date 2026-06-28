import { createHash, timingSafeEqual } from "crypto";
import { getClientIp, checkRateLimit, recordRateLimitHit } from "../../lib/rateLimit";

const COOKIE_NAME = "finzo_access";
const TOKEN_SUFFIX = ":finzo-access-v1";
const MAX_AGE = 7 * 24 * 60 * 60;

function deriveToken(password) {
  return createHash("sha256").update(password + TOKEN_SUFFIX).digest("hex");
}

function safeStringCompare(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

function safeNext(value) {
  if (!value || typeof value !== "string") return "/";
  const trimmed = value.trim();
  // Only allow relative paths — reject open-redirect attempts
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/";
  return trimmed;
}

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const lockEnabled =
    process.env.SITE_LOCK_ENABLED === "true" ||
    process.env.SITE_LOCK_ENABLE === "true";
  const sitePassword = process.env.SITE_LOCK_PASSWORD;
  const next = safeNext(req.body?.next);

  console.log("[unlock] lockEnabled:", lockEnabled, "passwordEnvExists:", !!sitePassword);

  // Lock disabled — let them through
  if (!lockEnabled) {
    return res.redirect(302, next);
  }

  // Lock enabled but no password configured server-side — surface a clear error
  if (!sitePassword) {
    const errorUrl = `/unlock?error=2${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`;
    return res.redirect(302, errorUrl);
  }

  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(ip, { limit: 10, windowMs: 15 * 60 * 1000 });
  if (!allowed) {
    const errorUrl = `/unlock?error=3${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`;
    return res.redirect(302, errorUrl);
  }

  const submitted = String(req.body?.password || "");
  const passwordMatch = !!submitted && safeStringCompare(submitted, sitePassword);

  if (!passwordMatch) {
    recordRateLimitHit(ip);
    const errorUrl = `/unlock?error=1${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`;
    return res.redirect(302, errorUrl);
  }

  const token = deriveToken(sitePassword);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax${secure}`
  );
  console.log("[unlock] cookieSet: true");
  return res.redirect(302, next);
}
