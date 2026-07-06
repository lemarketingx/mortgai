import { supabaseSignIn } from "../../../lib/supabaseAuth";
import { LeadStoreError, readAdvisors } from "../../../lib/leadsStore";
import { createAdvisorSessionCookie, clearAdvisorSessionCookie } from "../../../lib/advisorAuth";
import { getClientIp, checkRateLimit, recordRateLimitHit } from "../../../lib/rateLimit";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", clearAdvisorSessionCookie());
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "POST") return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");

  const ip = getClientIp(req);
  const RATE_OPTS = { scope: "advisor-login", limit: 5, windowMs: 15 * 60 * 1000 };
  const { allowed } = checkRateLimit(ip, RATE_OPTS);
  if (!allowed) return apiError(res, 429, "RATE_LIMITED", "יותר מדי ניסיונות. נסה שוב מאוחר יותר.");

  const body = typeof req.body === "object" ? req.body : {};
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return apiError(res, 400, "MISSING_CREDENTIALS", "אימייל וסיסמה הם שדות חובה");
  }

  // Authenticate against Supabase Auth
  let authResult;
  try {
    authResult = await supabaseSignIn(email, password);
  } catch (e) {
    console.error("[advisor/login] supabaseSignIn threw:", e?.message);
    return apiError(res, 503, "AUTH_SERVICE_UNAVAILABLE", "שירות ההתחברות אינו זמין כרגע. נסה שוב בעוד רגע.");
  }
  const { error: authError, user: authUser } = authResult;
  if (authError || !authUser?.id) {
    recordRateLimitHit(ip, RATE_OPTS);
    return apiError(res, 401, "INVALID_CREDENTIALS", "אימייל או סיסמה שגויים");
  }

  // Find advisor profile
  let advisors;
  try {
    advisors = await readAdvisors();
  } catch (e) {
    const status = e instanceof LeadStoreError && e.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
    return apiError(res, status, e.code || "ADVISOR_LOOKUP_FAILED", e.message);
  }

  // Match by auth_user_id first, fallback to email for legacy manually-created advisors
  const advisor = advisors.find((a) => a.auth_user_id === authUser.id) ||
    advisors.find((a) => String(a.email || "").toLowerCase() === email && a.active === true);

  if (!advisor) {
    return apiError(res, 404, "ADVISOR_NOT_FOUND", "חשבון היועץ לא נמצא. אנא צרו קשר עם התמיכה.");
  }

  if (advisor.active === false) {
    return apiError(res, 403, "ADVISOR_INACTIVE", "החשבון אינו פעיל. אנא צרו קשר עם התמיכה.");
  }

  const advisorId = String(advisor.advisor_id || "");
  res.setHeader("Set-Cookie", createAdvisorSessionCookie(advisorId));
  return res.status(200).json({ ok: true, advisor: { advisorId, name: advisor.name || "" } });
}
