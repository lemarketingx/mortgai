import { COMMISSION_STATUSES, LEAD_STATUSES, LeadStoreError, getSupabaseConfigStatus, readAdvisors, readLeads, updateLead } from "../../../lib/leadsStore";
import { hasAdminSession } from "../../../lib/adminAuth";
import { adminLeadBulkPatchSchema, adminLeadPatchSchema, validationErrorPayload } from "../../../lib/validation";

function apiError(res, status, code, message, details = "") {
  return res.status(status).json({ error: code, message, details });
}

function storeError(res, error, fallbackCode) {
  if (error instanceof LeadStoreError) {
    const status = error.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
    return apiError(res, status, error.code, error.message, error.details || "");
  }
  return apiError(res, 500, fallbackCode, "Unexpected admin leads API failure");
}

export default async function handler(req, res) {
  try {
    if (!hasAdminSession(req)) {
      return apiError(res, 401, "ADMIN_AUTH_REQUIRED", "Admin session cookie is missing or expired");
    }
  } catch (error) {
    return apiError(res, 500, "ADMIN_AUTH_NOT_CONFIGURED", error.message || "ADMIN_SESSION_SECRET is missing");
  }

  if (req.method === "GET") {
    try {
      const [leads, advisors] = await Promise.all([readLeads(), readAdvisors()]);
      return res.status(200).json({
        leads,
        advisors,
        statuses: LEAD_STATUSES,
        commissionStatuses: COMMISSION_STATUSES,
        supabase: getSupabaseConfigStatus(),
      });
    } catch (error) {
      return storeError(res, error, "LEADS_READ_FAILED");
    }
  }

  if (req.method === "PATCH") {
    const body = req.body || {};

    // Bulk update: { ids: ["id1","id2",...], changes: {...} }
    if (Array.isArray(body.ids)) {
      const parsed = adminLeadBulkPatchSchema.safeParse(body);
      if (!parsed.success) {
        return res.status(400).json(validationErrorPayload(parsed.error));
      }
      const { ids, changes } = parsed.data;
      const results = await Promise.allSettled(ids.map((id) => updateLead(id, changes || {})));
      const updated = results.filter((r) => r.status === "fulfilled" && r.value).map((r) => r.value);
      const failed = results.filter((r) => r.status === "rejected" || !r.value).length;
      return res.status(200).json({ ok: true, updated: updated.length, failed });
    }

    // Single update
    const parsed = adminLeadPatchSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json(validationErrorPayload(parsed.error));
    }
    const { id, changes } = parsed.data;

    try {
      const lead = await updateLead(id, changes || {});
      if (!lead) {
        return apiError(res, 404, "LEAD_NOT_FOUND", "Lead not found");
      }
      return res.status(200).json({ lead });
    } catch (error) {
      return storeError(res, error, "LEAD_UPDATE_FAILED");
    }
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
}
