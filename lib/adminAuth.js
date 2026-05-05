import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "mortgai2_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function getSessionSecret() {
  const secret = String(process.env.ADMIN_SESSION_SECRET || "").trim();
  if (!secret) {
    throw new Error("Missing ADMIN_SESSION_SECRET");
  }
  return secret;
}

function sign(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function parseCookieHeader(cookieHeader = "") {
  const cookies = {};
  for (const part of String(cookieHeader).split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) continue;
    cookies[rawKey] = rawValue.join("=");
  }
  return cookies;
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function createAdminSessionCookie() {
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  const payload = String(expiresAt);
  const token = `${payload}.${sign(payload, getSessionSecret())}`;
  const secureFlag = process.env.NODE_ENV === "production" ? "Secure; " : "";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; ${secureFlag}Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`;
}

export function clearAdminSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function hasAdminSession(req) {
  const cookies = parseCookieHeader(req.headers.cookie || "");
  const rawToken = cookies[COOKIE_NAME];
  if (!rawToken) return false;

  const [payload, signature] = decodeURIComponent(rawToken).split(".");
  if (!payload || !signature) return false;
  if (!safeEqual(signature, sign(payload, getSessionSecret()))) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}
