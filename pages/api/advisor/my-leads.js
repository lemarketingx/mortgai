import { LeadStoreError, readMyLeads, updateLead } from "../../../lib/leadsStore";
import { getAdvisorSession } from "../../../lib/advisorAuth";
import { adminLeadPatchSchema, validationErrorPayload } from "../../../lib/validation";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  if (req.method === "GET") {
    try {
      const leads = await readMyLeads(session.advisorId);
      return res.status(200).json({ leads });
    } catch (error) {
      if (error instanceof LeadStoreError) {
        const status = error.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
        return apiError(res, status, error.code, error.message);
      }
      return apiError(res, 500, "MY_LEADS_READ_FAILED", "Unexpected error");
    }
  }

  if (req.method === "PATCH") {
    const parsed = adminLeadPatchSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json(validationErrorPayload(parsed.error));

    const { id, changes } = parsed.data;
    try {
      const leads = await readMyLeads(session.advisorId);
      const lead = leads.find((l) => l.id === id);
      if (!lead) return apiError(res, 404, "LEAD_NOT_FOUND", "Lead not found in your purchased leads");

      const allowed = {
        leadStatus: changes.leadStatus,
        status: changes.leadStatus,
        internalNotes: changes.internalNotes,
        followUpDate: changes.followUpDate,
        lastContactedAt: changes.lastContactedAt,
      };
      const patch = Object.fromEntries(Object.entries(allowed).filter(([, v]) => v !== undefined));
      const updated = await updateLead(id, patch);
      if (!updated) return apiError(res, 404, "LEAD_NOT_FOUND", "Lead not found");
      return res.status(200).json({ lead: updated });
    } catch (error) {
      if (error instanceof LeadStoreError) {
        const status = error.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
        return apiError(res, status, error.code, error.message);
      }
      return apiError(res, 500, "MY_LEAD_UPDATE_FAILED", "Unexpected error");
    }
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
}
