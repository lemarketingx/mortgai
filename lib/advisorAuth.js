import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "mortgai2_advisor_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function secret() {
  const value = String(process.env.ADVISOR_SESSION_SECRET || "").trim();
  if (!value) throw new Error("Missing ADVISOR_SESSION_SECRET");
  return value;
}

function sign(payload) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

function parseCookies(header = "") {
  const out = {};
  for (const part of String(header).split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (!k) continue;
    out[k] = v.join("=");
  }
  return out;
}

export function createAdvisorSessionCookie(advisorId) {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = `${advisorId}|${exp}`;
  const token = `${payload}.${sign(payload)}`;
  const secureFlag = process.env.NODE_ENV === "production" ? "Secure; " : "";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; ${secureFlag}Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`;
}

export function clearAdvisorSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function getAdvisorSession(req) {
  const token = parseCookies(req.headers.cookie || "")[COOKIE_NAME];
  if (!token) return null;
  const decoded = decodeURIComponent(token);
  const [payload, sig] = decoded.split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
  const [advisorId, exp] = payload.split("|");
  if (!advisorId || Number(exp) <= Date.now()) return null;
  return { advisorId };
}
