import { getAdvisorSession } from "../../../lib/advisorAuth";
import { LeadStoreError, readLeads, updateLead } from "../../../lib/leadsStore";
import { adminLeadPatchSchema, validationErrorPayload } from "../../../lib/validation";

function storeError(res, error, fallback = "ADVISOR_LEADS_FAILED") {
  if (error instanceof LeadStoreError) {
    return res.status(503).json({ error: error.code, message: error.message });
  }
  return res.status(500).json({ error: fallback });
}

export default async function handler(req, res) {
  try {
    const session = getAdvisorSession(req);
    if (!session) return res.status(401).json({ error: "ADVISOR_AUTH_REQUIRED" });

    if (req.method === "GET") {
      const leads = await readLeads();
      return res.status(200).json({ leads: leads.filter((l) => l.assignedAdvisorId === session.advisorId) });
    }

    if (req.method === "PATCH") {
      const parsed = adminLeadPatchSchema.safeParse(req.body || {});
      if (!parsed.success) return res.status(400).json(validationErrorPayload(parsed.error));
      const { id, changes } = parsed.data;
      const leads = await readLeads();
      const lead = leads.find((l) => l.id === id && l.assignedAdvisorId === session.advisorId);
      if (!lead) return res.status(404).json({ error: "LEAD_NOT_FOUND" });

      const allowed = {
        leadStatus: changes.leadStatus,
        status: changes.leadStatus,
        internalNotes: changes.internalNotes,
        followUpDate: changes.followUpDate,
        lastContactedAt: changes.lastContactedAt,
      };
      const updated = await updateLead(id, Object.fromEntries(Object.entries(allowed).filter(([, v]) => v !== undefined)));
      return res.status(200).json({ lead: updated });
    }

    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  } catch (error) {
    return storeError(res, error);
  }
}
