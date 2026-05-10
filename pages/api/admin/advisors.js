import { LeadStoreError, createAdvisor, readAdvisors, updateAdvisor } from "../../../lib/leadsStore";
import { hasAdminSession } from "../../../lib/adminAuth";
import { adminAdvisorCreateSchema, adminAdvisorPatchSchema, validationErrorPayload } from "../../../lib/validation";

function apiError(res, status, code, message, details = "") {
  return res.status(status).json({ error: code, message, details });
}

function storeError(res, error, fallbackCode) {
  if (error instanceof LeadStoreError) {
    const status = error.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
    return apiError(res, status, error.code, error.message, error.details || "");
  }
  return apiError(res, 500, fallbackCode, "Unexpected admin advisors API failure");
}

export default async function handler(req, res) {
  try {
    if (!hasAdminSession(req)) return apiError(res, 401, "ADMIN_AUTH_REQUIRED", "Admin session cookie is missing or expired");
  } catch (error) {
    return apiError(res, 500, "ADMIN_AUTH_NOT_CONFIGURED", error.message || "ADMIN_SESSION_SECRET is missing");
  }

  if (req.method === "GET") {
    try {
      const advisors = await readAdvisors();
      return res.status(200).json({ advisors });
    } catch (error) {
      return storeError(res, error, "ADVISORS_READ_FAILED");
    }
  }

  if (req.method === "POST") {
    const parsed = adminAdvisorCreateSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json(validationErrorPayload(parsed.error));

    try {
      const existing = await readAdvisors();
      if (existing.some((item) => String(item.advisor_id) === parsed.data.advisorId)) {
        return apiError(res, 409, "ADVISOR_ID_EXISTS", "advisorId must be unique");
      }
      const advisor = await createAdvisor(parsed.data);
      return res.status(201).json({ advisor });
    } catch (error) {
      return storeError(res, error, "ADVISOR_CREATE_FAILED");
    }
  }

  if (req.method === "PATCH") {
    const parsed = adminAdvisorPatchSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json(validationErrorPayload(parsed.error));
    try {
      const advisor = await updateAdvisor(parsed.data.advisorId, parsed.data.changes);
      if (!advisor) return apiError(res, 404, "ADVISOR_NOT_FOUND", "Advisor not found");
      return res.status(200).json({ advisor });
    } catch (error) {
      return storeError(res, error, "ADVISOR_UPDATE_FAILED");
    }
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
}
