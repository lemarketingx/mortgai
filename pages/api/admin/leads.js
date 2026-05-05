import { COMMISSION_STATUSES, LEAD_STATUSES, readLeads, updateLead } from "../../../lib/leadsStore";
import { hasAdminSession } from "../../../lib/adminAuth";

export default async function handler(req, res) {
  try {
    if (!hasAdminSession(req)) {
      return res.status(401).json({ error: "ADMIN_AUTH_REQUIRED" });
    }
  } catch {
    return res.status(500).json({ error: "ADMIN_AUTH_NOT_CONFIGURED" });
  }

  if (req.method === "GET") {
    try {
      const leads = await readLeads();
      return res.status(200).json({ leads, statuses: LEAD_STATUSES, commissionStatuses: COMMISSION_STATUSES });
    } catch {
      return res.status(500).json({ error: "LEADS_READ_FAILED" });
    }
  }

  if (req.method === "PATCH") {
    const { id, changes } = req.body || {};
    if (!id) {
      return res.status(400).json({ error: "Missing lead id" });
    }

    try {
      const lead = await updateLead(id, changes || {});
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      return res.status(200).json({ lead });
    } catch {
      return res.status(500).json({ error: "LEAD_UPDATE_FAILED" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
