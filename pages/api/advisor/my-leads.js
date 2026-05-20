import { LeadStoreError, readMyLeads, updateLead } from "../../../lib/leadsStore";
import { createActivity } from "../../../lib/activitiesStore";
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

      const now = new Date().toISOString();
      const newStage = changes.pipelineStage || changes.leadStatus;
      const prevStage = lead.pipelineStage || lead.leadStatus;
      const allowed = {
        pipelineStage: newStage,
        leadStatus: newStage,
        status: newStage,
        internalNotes: changes.internalNotes,
        followUpDate: changes.followUpDate,
        followUpStage: changes.followUpStage,
        lastContactedAt: changes.lastContactedAt,
        lastActivityAt: now,
        nextAction: changes.nextAction,
        nextActionAt: changes.nextActionAt,
        bankName: changes.bankName,
        mortgageType: changes.mortgageType,
        documentsCompletionPercent: changes.documentsCompletionPercent,
      };
      if (newStage && newStage !== prevStage) {
        allowed.stageUpdatedAt = now;
        if (!lead.firstContactAt && prevStage === "ליד חדש") allowed.firstContactAt = now;
        createActivity({
          leadId: id,
          advisorId: session.advisorId,
          activityType: "status_changed",
          title: `שלב עודכן: "${prevStage}" ← "${newStage}"`,
          metadata: { from: prevStage, to: newStage },
        }).catch(() => {});
      }
      if (changes.internalNotes !== undefined && changes.internalNotes !== lead.internalNotes) {
        createActivity({
          leadId: id,
          advisorId: session.advisorId,
          activityType: "note_added",
          title: "הערה עודכנה",
        }).catch(() => {});
      }
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
