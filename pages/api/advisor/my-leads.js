import { LeadStoreError, readMyLeads, updateLead } from "../../../lib/leadsStore";
import { createActivity } from "../../../lib/activitiesStore";
import { getAdvisorSession } from "../../../lib/advisorAuth";
import { adminLeadPatchSchema, validationErrorPayload } from "../../../lib/validation";
import { getPipelineStageLabel, normalizePipelineStage } from "../../../lib/pipeline";
import { calculateCollateralProgress, calculateOverallMortgageProgress } from "../../../lib/mortgageCase";
import { createNotification } from "../../../lib/notificationsStore";

const DAY_MS = 864e5;
const notifThrottle = new Map();

function shouldThrottle(key, intervalMs = 6 * 3600 * 1000) {
  const now = Date.now();
  const last = notifThrottle.get(key) || 0;
  if (now - last < intervalMs) return true;
  notifThrottle.set(key, now);
  if (notifThrottle.size > 2000) {
    const oldest = [...notifThrottle.entries()].sort((a, b) => a[1] - b[1]).slice(0, 500);
    for (const [k] of oldest) notifThrottle.delete(k);
  }
  return false;
}

function generateBackgroundNotifications(advisorId, leads) {
  const today = new Date(new Date().toDateString());
  for (const lead of leads) {
    const stage = normalizePipelineStage(lead.pipelineStage || lead.leadStatus);
    if (["closed_won", "closed_lost"].includes(stage)) continue;

    if (lead.nextActionAt && new Date(lead.nextActionAt) < today) {
      const key = `overdue:${advisorId}:${lead.id}`;
      if (!shouldThrottle(key)) {
        createNotification({
          advisorId,
          type: "overdue_task",
          title: `משימה באיחור: ${lead.name || "ליד"}`,
          message: lead.nextAction || "פעולה שהוגדרה לא בוצעה בזמן",
          entityType: "lead",
          entityId: lead.id,
          priority: "high",
        }).catch(() => {});
      }
    }

    const missingDocs = Number(lead.missingDocumentsCount || 0);
    if (missingDocs > 0 && ["documents_requested", "waiting_documents"].includes(stage)) {
      const key = `docs:${advisorId}:${lead.id}`;
      if (!shouldThrottle(key)) {
        createNotification({
          advisorId,
          type: "missing_documents",
          title: `מסמכים חסרים: ${lead.name || "ליד"}`,
          message: `${missingDocs} מסמכים חסרים`,
          entityType: "lead",
          entityId: lead.id,
          priority: "normal",
        }).catch(() => {});
      }
    }

    if (lead.followUpDate) {
      const followUp = new Date(lead.followUpDate);
      const isToday = followUp.toDateString() === today.toDateString();
      if (isToday) {
        const key = `reminder:${advisorId}:${lead.id}:${lead.followUpDate}`;
        if (!shouldThrottle(key, 12 * 3600 * 1000)) {
          createNotification({
            advisorId,
            type: "reminder_due",
            title: `תזכורת להיום: ${lead.name || "ליד"}`,
            message: lead.nextAction || "מעקב מתוכנן",
            entityType: "lead",
            entityId: lead.id,
            priority: "normal",
          }).catch(() => {});
        }
      }
    }
  }
}

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  if (req.method === "GET") {
    try {
      const leads = await readMyLeads(session.advisorId);
      const { leadId } = req.query;
      if (leadId) {
        const lead = leads.find((l) => l.id === leadId);
        if (!lead) return apiError(res, 404, "LEAD_NOT_FOUND", "Lead not found");
        return res.status(200).json({ lead });
      }

      generateBackgroundNotifications(session.advisorId, leads);

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
        actualCommission: changes.actualCommission,
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

        const isBankStage = ["submitted_to_bank", "principle_approval", "bank_negotiation", "selected_track"].includes(newStage);
        createNotification({
          advisorId: session.advisorId,
          type: isBankStage ? "bank_status" : "stage_change",
          title: `${lead.name || "ליד"}: ${getPipelineStageLabel(newStage)}`,
          message: `שלב עודכן מ-"${getPipelineStageLabel(prevStage)}" ל-"${getPipelineStageLabel(newStage)}"`,
          entityType: "lead",
          entityId: id,
          priority: isBankStage ? "high" : "normal",
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
