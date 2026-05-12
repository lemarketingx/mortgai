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
  return apiError(res, 500, fallbackCode, error?.message || "Unexpected admin leads API failure", String(error?.stack || ""));
}

export default async function handler(req, res) {
  try {
    console.log("[admin.leads] token/session validation start");
    if (!hasAdminSession(req)) {
      console.error("[admin.leads] token/session validation failed: missing/expired session");
      return apiError(res, 401, "ADMIN_AUTH_REQUIRED", "Admin session cookie is missing or expired");
    }
    console.log("[admin.leads] token/session validation success");
  } catch (error) {
    console.error("[admin.leads] token/session validation crash", error);
    return apiError(res, 500, "ADMIN_AUTH_NOT_CONFIGURED", error.message || "ADMIN_SESSION_SECRET is missing");
  }

  if (req.method === "GET") {
    try {
      console.log("[admin.leads] leads select start");
      const leads = await readLeads();
      console.log("[admin.leads] leads select success", { count: Array.isArray(leads) ? leads.length : -1 });

      let advisors = [];
      try {
        console.log("[admin.leads] advisors select start");
        const advisorsResult = await readAdvisors();
        advisors = Array.isArray(advisorsResult) ? advisorsResult : [];
        console.log("[admin.leads] advisors select success", { count: advisors.length });
      } catch (advisorError) {
        console.error("[admin.leads] advisors select failed; returning leads without advisors", {
          message: advisorError?.message,
          code: advisorError?.code,
          details: advisorError?.details,
          stack: advisorError?.stack,
        });
      }

      console.log("[admin.leads] merge/mapping logic start");
      const safeLeads = Array.isArray(leads) ? leads : [];
      const safeAdvisors = Array.isArray(advisors) ? advisors : [];
      console.log("[admin.leads] merge/mapping logic success", {
        leadsCount: safeLeads.length,
        advisorsCount: safeAdvisors.length,
      });

      return res.status(200).json({
        leads: safeLeads,
        advisors: safeAdvisors,
        statuses: LEAD_STATUSES,
        commissionStatuses: COMMISSION_STATUSES,
        supabase: getSupabaseConfigStatus(),
      });
    } catch (error) {
      console.error("[admin.leads] leads select failed", {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        stack: error?.stack,
      });
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
