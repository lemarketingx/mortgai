import { hasAdminSession } from "../../../lib/adminAuth";
import { getSupabaseAdminHealthUrl, LeadStoreError } from "../../../lib/leadsStore";

function apiError(res, status, error, message, details = "") {
  return res.status(status).json({ error, message, details });
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
  }

  try {
    if (!hasAdminSession(req)) {
      return apiError(res, 401, "ADMIN_AUTH_REQUIRED", "Admin session cookie is missing or expired");
    }
  } catch (error) {
    return apiError(res, 500, "ADMIN_AUTH_NOT_CONFIGURED", error.message || "ADMIN_SESSION_SECRET is missing");
  }

  let healthUrl;
  try {
    healthUrl = getSupabaseAdminHealthUrl();
  } catch (error) {
    if (error instanceof LeadStoreError) {
      const status = error.code === "SUPABASE_ENV_MISSING" || error.code === "SUPABASE_URL_INVALID" ? 503 : 502;
      return apiError(res, status, error.code, error.message, error.details || "");
    }
    return apiError(res, 500, "SUPABASE_HEALTH_PREPARE_FAILED", error?.message || "Unexpected Supabase health preparation failure");
  }

  const headers = {
    apikey: process.env.SUPABASE_SERVICE_KEY?.trim() || "",
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY?.trim() || ""}`,
  };

  try {
    const response = await fetch(healthUrl, { method: "GET", headers });
    const body = await response.text().catch(() => "");
    return res.status(200).json({
      status: response.status,
      ok: response.ok,
      body,
    });
  } catch (error) {
    return res.status(502).json({
      status: null,
      ok: false,
      body: "",
      fetchError: {
        name: error?.name,
        message: error?.message,
        cause: error?.cause,
        stack: error?.stack,
      },
    });
  }
}
