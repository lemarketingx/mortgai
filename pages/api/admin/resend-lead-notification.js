import { hasAdminSession } from "../../../lib/adminAuth";
import { LeadStoreError, readLeads } from "../../../lib/leadsStore";
import { sendLeadNotification, sendMarketplaceLeadNotificationToAdvisors } from "../../../lib/email";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");

  try {
    if (!hasAdminSession(req)) {
      return apiError(res, 401, "ADMIN_AUTH_REQUIRED", "Admin session cookie is missing or expired");
    }
  } catch (err) {
    return apiError(res, 500, "ADMIN_AUTH_NOT_CONFIGURED", err.message || "ADMIN_SESSION_SECRET is missing");
  }

  const id = String(req.body?.id || "").trim();
  if (!id) return apiError(res, 400, "MISSING_LEAD_ID", "Lead id is required");

  try {
    const leads = await readLeads();
    const lead = leads.find((l) => l.id === id);
    if (!lead) return apiError(res, 404, "LEAD_NOT_FOUND", "Lead not found");

    // Awaited (not fire-and-forget) — this is a low-volume, admin-triggered
    // action and the admin needs to see whether it actually sent.
    const [admin, marketplace] = await Promise.all([
      sendLeadNotification(lead).catch((err) => ({ ok: false, reason: err?.message || "unexpected_error" })),
      sendMarketplaceLeadNotificationToAdvisors(lead).catch((err) => ({ ok: false, reason: err?.message || "unexpected_error" })),
    ]);

    return res.status(200).json({ ok: Boolean(admin.ok || marketplace.ok), admin, marketplace });
  } catch (error) {
    if (error instanceof LeadStoreError) {
      const status = error.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
      return apiError(res, status, error.code, error.message);
    }
    return apiError(res, 500, "RESEND_NOTIFICATION_FAILED", error?.message || "Unexpected error");
  }
}
