import { createHash, timingSafeEqual } from "crypto";
import { getClientIp, checkRateLimit, recordRateLimitHit } from "../../lib/rateLimit";

const COOKIE_NAME = "finzo_access";
const TOKEN_SUFFIX = ":finzo-access-v1";
const MAX_AGE = 7 * 24 * 60 * 60;
const IS_DEV = process.env.NODE_ENV !== "production";

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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const lockEnabled =
    process.env.SITE_LOCK_ENABLED === "true" ||
    process.env.SITE_LOCK_ENABLE === "true";
  const sitePassword = process.env.SITE_LOCK_PASSWORD;
  const next = safeNext(req.body?.next);

  if (IS_DEV) console.log("[unlock] lockEnabled:", lockEnabled, "passwordEnvExists:", !!sitePassword);

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
  const RATE_OPTS = { scope: "unlock", limit: 10, windowMs: 15 * 60 * 1000 };
  const { allowed } = await checkRateLimit(ip, RATE_OPTS);
  if (!allowed) {
    const errorUrl = `/unlock?error=3${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`;
    return res.redirect(302, errorUrl);
  }

  const submitted = String(req.body?.password || "");
  const passwordMatch = !!submitted && safeStringCompare(submitted, sitePassword);

  if (!passwordMatch) {
    await recordRateLimitHit(ip, RATE_OPTS);
    const errorUrl = `/unlock?error=1${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`;
    return res.redirect(302, errorUrl);
  }

  const token = deriveToken(sitePassword);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax${secure}`
  );
  if (IS_DEV) console.log("[unlock] cookieSet: true");
  return res.redirect(302, next);
}
