import { timingSafeEqual } from "crypto";
import { createAdvisorSessionCookie, clearAdvisorSessionCookie } from "../../../lib/advisorAuth";
import { LeadStoreError, readAdvisors } from "../../../lib/leadsStore";

function apiError(res, status, code, message, details = "") {
  return res.status(status).json({ error: code, message, details });
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

function parseLoginBody(req) {
  const body = req.body;
  if (!body) return {};
  if (typeof body === "object") return body;
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  return null;
}

function storeError(res, error, fallbackCode) {
  if (error instanceof LeadStoreError) {
    const status = error.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
    return apiError(res, status, error.code, error.message, error.details || "");
  }
  return apiError(res, 500, fallbackCode, "Unexpected advisor login API failure");
}

export default async function handler(req, res) {
  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", clearAdvisorSessionCookie());
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "POST") {
    return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
  }

  const parsedBody = parseLoginBody(req);
  if (parsedBody === null) {
    return apiError(res, 400, "INVALID_JSON", "Malformed JSON body");
  }

  const advisorId = String(parsedBody?.advisorId || "").trim();
  const token = String(parsedBody?.token || "").trim();
  if (!advisorId || !token) {
    return apiError(res, 400, "MISSING_CREDENTIALS", "advisorId and token are required");
  }

  const expected = String(process.env.ADVISOR_PORTAL_TOKEN || "").trim();
  if (!expected) {
    return apiError(res, 503, "ADVISOR_TOKEN_NOT_CONFIGURED", "Server is missing advisor portal token configuration");
  }

  if (!safeEqual(token, expected)) {
    return apiError(res, 401, "INVALID_CREDENTIALS", "Invalid credentials");
  }

  try {
    const advisors = await readAdvisors();
    const advisor = advisors.find((item) => String(item.advisor_id) === advisorId && item.active !== false);
    if (!advisor) {
      return apiError(res, 404, "ADVISOR_NOT_FOUND", "Advisor not found");
    }

    res.setHeader("Set-Cookie", createAdvisorSessionCookie(advisorId));
    return res.status(200).json({ ok: true, advisor: { advisorId, name: advisor.name } });
  } catch (error) {
    return storeError(res, error, "ADVISOR_LOOKUP_FAILED");
  }
}
