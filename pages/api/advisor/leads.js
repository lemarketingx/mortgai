import { LeadStoreError, readLeadById, readLeadsByAssignedAdvisor, updateLead } from "../../../lib/leadsStore";
import { createActivity } from "../../../lib/activitiesStore";
import { getAdvisorSession } from "../../../lib/advisorAuth";
import { adminLeadPatchSchema, validationErrorPayload } from "../../../lib/validation";
import { getPipelineStageLabel, normalizePipelineStage } from "../../../lib/pipeline";

function apiError(res, status, code, message, details = "") {
  return res.status(status).json({ error: code, message, details });
}

function storeError(res, error, fallbackCode) {
  if (error instanceof LeadStoreError) {
    const status = error.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
    return apiError(res, status, error.code, error.message, error.details || "");
  }
  return apiError(res, 500, fallbackCode, "Unexpected advisor leads API failure");
}

export default async function handler(req, res) {
  try {
    const session = getAdvisorSession(req);
    if (!session) {
      return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session cookie is missing or expired");
    }

    if (req.method === "GET") {
      try {
        const leads = await readLeadsByAssignedAdvisor(session.advisorId);
        return res.status(200).json({ leads });
      } catch (error) {
        return storeError(res, error, "LEADS_READ_FAILED");
      }
    }

    if (req.method === "PATCH") {
      const parsed = adminLeadPatchSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json(validationErrorPayload(parsed.error));
      }

      const { id, changes } = parsed.data;
      const lead = await readLeadById(id);
      if (!lead || lead.assignedAdvisorId !== session.advisorId) {
        return apiError(res, 404, "LEAD_NOT_FOUND", "Lead not found");
      }

      const now = new Date().toISOString();
      const newStage = changes.leadStatus ? normalizePipelineStage(changes.leadStatus) : undefined;
      const prevStage = normalizePipelineStage(lead.leadStatus || lead.status);
      const allowed = {
        leadStatus: newStage,
        status: newStage,
        internalNotes: changes.internalNotes,
        followUpDate: changes.followUpDate,
        followUpStage: changes.followUpStage,
        lastContactedAt: changes.lastContactedAt,
        lastActivityAt: now,
      };
      if (newStage && newStage !== prevStage) {
        if (!lead.firstContactAt && prevStage === "new_lead") allowed.firstContactAt = now;
        createActivity({
          leadId: id,
          advisorId: session.advisorId,
          activityType: "status_changed",
          title: `סטטוס שונה ל"${getPipelineStageLabel(newStage)}"`,
          metadata: { from: prevStage, to: newStage },
        }).catch(() => {});
      }
      const patch = Object.fromEntries(Object.entries(allowed).filter(([, v]) => v !== undefined));

      try {
        const updated = await updateLead(id, patch);
        if (!updated) {
          return apiError(res, 404, "LEAD_NOT_FOUND", "Lead not found");
        }
        return res.status(200).json({ lead: updated });
      } catch (error) {
        return storeError(res, error, "LEAD_UPDATE_FAILED");
      }
    }

    return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
  } catch (error) {
    return apiError(res, 500, "ADVISOR_LEADS_HANDLER_FAILED", "Unexpected advisor leads API failure", error?.message || "");
  }
}
