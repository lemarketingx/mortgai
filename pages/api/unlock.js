import { createHash } from "crypto";

const COOKIE_NAME = "finzo_access";
const TOKEN_SUFFIX = ":finzo-access-v1";
const MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

function deriveToken(password) {
  return createHash("sha256").update(password + TOKEN_SUFFIX).digest("hex");
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

  const lockEnabled = process.env.SITE_LOCK_ENABLED === "true";
  const sitePassword = process.env.SITE_LOCK_PASSWORD;
  const next = safeNext(req.body?.next);

  // Lock not configured — let them through
  if (!lockEnabled || !sitePassword) {
    return res.redirect(302, next);
  }

  const submitted = String(req.body?.password || "");

  if (!submitted || submitted !== sitePassword) {
    const errorUrl = `/unlock?error=1${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`;
    return res.redirect(302, errorUrl);
  }

  const token = deriveToken(sitePassword);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax${secure}`
  );
  return res.redirect(302, next);
}
