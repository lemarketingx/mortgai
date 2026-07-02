import { COMMISSION_STATUSES, LEAD_STATUSES, LeadStoreError, deleteLead, getSupabaseConfigStatus, readAdvisors, readLeads, updateLead } from "../../../lib/leadsStore";
import { hasAdminSession } from "../../../lib/adminAuth";
import { adminLeadBulkPatchSchema, adminLeadPatchSchema, validationErrorPayload } from "../../../lib/validation";

const IS_DEV = process.env.NODE_ENV !== "production";

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
    if (IS_DEV) console.log("[admin.leads] token/session validation start");
    if (!hasAdminSession(req)) {
      console.error("[admin.leads] token/session validation failed: missing/expired session");
      return apiError(res, 401, "ADMIN_AUTH_REQUIRED", "Admin session cookie is missing or expired");
    }
    if (IS_DEV) console.log("[admin.leads] token/session validation success");
  } catch (error) {
    console.error("[admin.leads] token/session validation crash", error);
    return apiError(res, 500, "ADMIN_AUTH_NOT_CONFIGURED", error.message || "ADMIN_SESSION_SECRET is missing");
  }

  if (req.method === "GET") {
    try {
      if (IS_DEV) console.log("[admin.leads] leads select start");
      const leads = await readLeads();
      if (IS_DEV) console.log("[admin.leads] leads select success", { count: Array.isArray(leads) ? leads.length : -1 });

      let advisors = [];
      try {
        if (IS_DEV) console.log("[admin.leads] advisors select start");
        const advisorsResult = await readAdvisors();
        advisors = Array.isArray(advisorsResult) ? advisorsResult : [];
        if (IS_DEV) console.log("[admin.leads] advisors select success", { count: advisors.length });
      } catch (advisorError) {
        console.error("[admin.leads] advisors select failed; returning leads without advisors", {
          message: advisorError?.message,
          code: advisorError?.code,
          details: advisorError?.details,
          stack: advisorError?.stack,
        });
      }

      if (IS_DEV) console.log("[admin.leads] merge/mapping logic start");
      const safeLeads = Array.isArray(leads) ? leads : [];
      const safeAdvisors = Array.isArray(advisors) ? advisors : [];
      if (IS_DEV) console.log("[admin.leads] merge/mapping logic success", {
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

  if (req.method === "DELETE") {
    const body = req.body || {};
    try {
      if (Array.isArray(body.ids)) {
        const ids = body.ids.filter(Boolean);
        if (!ids.length) return apiError(res, 400, "LEAD_DELETE_FAILED", "No lead ids provided");
        const results = await Promise.allSettled(ids.map((id) => deleteLead(id)));
        const deleted = results.filter((result) => result.status === "fulfilled").length;
        const failed = results.length - deleted;
        return res.status(200).json({ ok: true, deleted, failed });
      }

      if (!body.id) return apiError(res, 400, "LEAD_DELETE_FAILED", "Lead id is required");
      const deletedLead = await deleteLead(body.id);
      if (!deletedLead) return apiError(res, 404, "LEAD_NOT_FOUND", "Lead not found");
      return res.status(200).json({ ok: true, deleted: 1, lead: deletedLead });
    } catch (error) {
      return storeError(res, error, "LEAD_DELETE_FAILED");
    }
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
}
