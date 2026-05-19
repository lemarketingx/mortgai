import { createAdvisorSessionCookie, clearAdvisorSessionCookie, verifyPassword } from "../../../lib/advisorAuth";
import { LeadStoreError, readAdvisors } from "../../../lib/leadsStore";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", clearAdvisorSessionCookie());
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "POST") return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");

  const body = typeof req.body === "object" ? req.body : {};
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return apiError(res, 400, "MISSING_CREDENTIALS", "אימייל וסיסמה הם שדות חובה");
  }

  let advisors;
  try {
    advisors = await readAdvisors();
  } catch (err) {
    const status = err instanceof LeadStoreError && err.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
    return apiError(res, status, err.code || "ADVISOR_LOOKUP_FAILED", err.message || "שגיאת שרת");
  }

  const advisor = advisors.find(
    (a) => String(a.email || "").trim().toLowerCase() === email && a.active === true,
  );

  // Constant-time failure path — don't reveal whether the email exists
  if (!advisor || !verifyPassword(password, advisor.password_hash || "")) {
    return apiError(res, 401, "INVALID_CREDENTIALS", "אימייל או סיסמה שגויים");
  }

  const advisorId = String(advisor.advisor_id || "");
  res.setHeader("Set-Cookie", createAdvisorSessionCookie(advisorId));
  return res.status(200).json({ ok: true, advisor: { advisorId, name: advisor.name || "" } });
}
