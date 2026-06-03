import { LeadStoreError, readMyLeads, readMyLeadsForList, updateLead } from "../../../lib/leadsStore";
import { createActivity } from "../../../lib/activitiesStore";
import { getAdvisorSession } from "../../../lib/advisorAuth";
import { adminLeadPatchSchema, validationErrorPayload } from "../../../lib/validation";
import { getPipelineStageLabel, normalizePipelineStage } from "../../../lib/pipeline";
import { calculateCollateralProgress, calculateOverallMortgageProgress } from "../../../lib/mortgageCase";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  if (req.method === "GET") {
    try {
      const { leadId } = req.query;
      if (leadId) {
        // Detail page: needs all fields — use full column set
        const leads = await readMyLeads(session.advisorId);
        const lead = leads.find((l) => l.id === leadId);
        if (!lead) return apiError(res, 404, "LEAD_NOT_FOUND", "Lead not found");
        return res.status(200).json({ lead });
      }
      // List/kanban page: use reduced column set to cut payload size
      const leads = await readMyLeadsForList(session.advisorId);
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
      const requestedStage = changes.pipelineStage || changes.leadStatus;
      const newStage = requestedStage ? normalizePipelineStage(requestedStage) : undefined;
      const prevStage = normalizePipelineStage(lead.pipelineStage || lead.leadStatus);
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
        appraiserName: changes.appraiserName,
        appraiserPhone: changes.appraiserPhone,
        appraisalDate: changes.appraisalDate,
        appraisalCost: changes.appraisalCost,
        appraisalReportReceived: changes.appraisalReportReceived,
        appraisalStatus: changes.appraisalStatus,
        buyerLawyerName: changes.buyerLawyerName,
        buyerLawyerPhone: changes.buyerLawyerPhone,
        buyerLawyerEmail: changes.buyerLawyerEmail,
        sellerLawyerName: changes.sellerLawyerName,
        sellerLawyerPhone: changes.sellerLawyerPhone,
        sellerLawyerEmail: changes.sellerLawyerEmail,
        legalContractReceived: changes.legalContractReceived,
        legalRightsReceived: changes.legalRightsReceived,
        legalRegistrationReceived: changes.legalRegistrationReceived,
        signingDate: changes.signingDate,
        signingLocation: changes.signingLocation,
        signingNotes: changes.signingNotes,
        lifeInsurance: changes.lifeInsurance,
        propertyInsurance: changes.propertyInsurance,
        mortgageRegistration: changes.mortgageRegistration,
        pledgeRegistration: changes.pledgeRegistration,
        municipalityDocuments: changes.municipalityDocuments,
        fundsReleaseStatus: changes.fundsReleaseStatus,
      };
      const projected = { ...lead, ...Object.fromEntries(Object.entries(allowed).filter(([, v]) => v !== undefined)) };
      allowed.collateralCompletionPercent = calculateCollateralProgress(projected);
      allowed.overallProgressPercent = calculateOverallMortgageProgress({
        ...projected,
        collateralCompletionPercent: allowed.collateralCompletionPercent,
      });
      if (newStage && newStage !== prevStage) {
        allowed.stageUpdatedAt = now;
        if (!lead.firstContactAt && prevStage === "new_lead") allowed.firstContactAt = now;
        createActivity({
          leadId: id,
          advisorId: session.advisorId,
          activityType: "status_changed",
          title: `שלב עודכן: "${getPipelineStageLabel(prevStage)}" ← "${getPipelineStageLabel(newStage)}"`,
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
