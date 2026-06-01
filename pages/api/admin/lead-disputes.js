import { hasAdminSession } from "../../../lib/adminAuth";
import { readLeads } from "../../../lib/leadsStore";
import {
  DisputeStoreError,
  DISPUTE_STATUSES,
  readAllDisputes,
  updateDispute,
} from "../../../lib/disputesStore";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  try {
    if (!hasAdminSession(req)) return apiError(res, 401, "ADMIN_AUTH_REQUIRED", "Admin session required");
  } catch (err) {
    return apiError(res, 500, "ADMIN_AUTH_NOT_CONFIGURED", err.message || "ADMIN_SESSION_SECRET is missing");
  }

  // GET — return all disputes enriched with lead customer name
  if (req.method === "GET") {
    try {
      const [disputes, leads] = await Promise.all([readAllDisputes(), readLeads()]);
      const leadMap = new Map(leads.map((l) => [l.id, l]));
      const enriched = disputes.map((d) => {
        const lead = leadMap.get(d.lead_id);
        return {
          ...d,
          customerName: lead?.name || "—",
          customerPhone: lead?.phone || "",
          purchaseStatus: lead?.purchaseStatus || "",
        };
      });
      return res.status(200).json({ disputes: enriched });
    } catch (err) {
      if (err instanceof DisputeStoreError) {
        if (err.code === "TABLE_MISSING") return res.status(200).json({ disputes: [], tableMissing: true });
        return apiError(res, 502, err.code, err.message);
      }
      return apiError(res, 500, "READ_FAILED", err?.message || "Failed to read disputes");
    }
  }

  // PATCH — admin updates status or note
  if (req.method === "PATCH") {
    const body = req.body || {};
    const id = String(body.id || "").trim();
    if (!id) return apiError(res, 400, "VALIDATION_ERROR", "dispute id חסר.");

    const changes = {};
    if (body.status !== undefined) {
      if (!DISPUTE_STATUSES.includes(body.status)) return apiError(res, 400, "VALIDATION_ERROR", "סטטוס לא תקין.");
      changes.status = body.status;
    }
    if (body.admin_note !== undefined) {
      changes.admin_note = String(body.admin_note || "");
    }

    try {
      const updated = await updateDispute(id, changes);
      return res.status(200).json({ ok: true, dispute: updated });
    } catch (err) {
      if (err instanceof DisputeStoreError) return apiError(res, 502, err.code, err.message);
      return apiError(res, 500, "UPDATE_FAILED", err?.message || "Failed to update dispute");
    }
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
}
