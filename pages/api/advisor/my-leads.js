import { LeadStoreError, readMyLead, readMyLeads, updateLead } from "../../../lib/leadsStore";
import { createActivity } from "../../../lib/activitiesStore";
import { getAdvisorSession } from "../../../lib/advisorAuth";
import { adminLeadPatchSchema, validationErrorPayload } from "../../../lib/validation";
import { getPipelineStageLabel, normalizePipelineStage } from "../../../lib/pipeline";
import { calculateCollateralProgress, calculateOverallMortgageProgress } from "../../../lib/mortgageCase";
import { createNotification, existingDedupeKeys, timeBucket } from "../../../lib/notificationsStore";

// Builds the due/overdue notifications for this advisor's leads and creates only
// the ones that don't already exist. Same business logic as before (identical
// types, titles, messages, buckets and dedupe keys) — the only change is that a
// single SELECT decides which are missing, instead of firing one INSERT attempt
// per candidate on every screen load. Stays fire-and-forget (never blocks the GET).
async function generateBackgroundNotifications(advisorId, leads) {
  const today = new Date(new Date().toDateString());
  const bucket6h = timeBucket(6);
  const bucket12h = timeBucket(12);

  // 1. Compute the candidate notifications (pure — no I/O).
  const candidates = [];
  for (const lead of leads) {
    const stage = normalizePipelineStage(lead.pipelineStage || lead.leadStatus);
    if (["closed_won", "closed_lost"].includes(stage)) continue;

    if (lead.nextActionAt && new Date(lead.nextActionAt) < today) {
      candidates.push({
        advisorId,
        type: "overdue_task",
        title: `משימה באיחור: ${lead.name || "ליד"}`,
        message: lead.nextAction || "פעולה שהוגדרה לא בוצעה בזמן",
        entityType: "lead",
        entityId: lead.id,
        priority: "high",
        dedupeKey: `overdue_task:${lead.id}:${bucket6h}`,
      });
    }

    const missingDocs = Number(lead.missingDocumentsCount || 0);
    if (missingDocs > 0 && ["documents_requested", "waiting_documents"].includes(stage)) {
      candidates.push({
        advisorId,
        type: "missing_documents",
        title: `מסמכים חסרים: ${lead.name || "ליד"}`,
        message: `${missingDocs} מסמכים חסרים`,
        entityType: "lead",
        entityId: lead.id,
        priority: "normal",
        dedupeKey: `missing_documents:${lead.id}:${bucket6h}`,
      });
    }

    if (lead.followUpDate) {
      const followUp = new Date(lead.followUpDate);
      if (followUp.toDateString() === today.toDateString()) {
        candidates.push({
          advisorId,
          type: "reminder_due",
          title: `תזכורת להיום: ${lead.name || "ליד"}`,
          message: lead.nextAction || "מעקב מתוכנן",
          entityType: "lead",
          entityId: lead.id,
          priority: "normal",
          dedupeKey: `reminder_due:${lead.id}:${bucket12h}`,
        });
      }
    }
  }

  if (candidates.length === 0) return; // nothing due → zero Supabase calls

  // 2. One SELECT: which of these dedupe keys already exist for this advisor.
  const existing = await existingDedupeKeys(advisorId, candidates.map((c) => c.dedupeKey));

  // 3. Create only the genuinely-missing ones. After the first load in a bucket,
  //    every key already exists → this loop makes zero INSERT attempts.
  for (const c of candidates) {
    if (existing.has(c.dedupeKey)) continue;
    createNotification(c).catch(() => {});
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
      const { leadId } = req.query;
      if (leadId) {
        // Single-lead request: skip loading the advisor's whole list
        const lead = await readMyLead(session.advisorId, leadId);
        if (!lead) return apiError(res, 404, "LEAD_NOT_FOUND", "Lead not found");
        const { source: _s, leadSource: _ls, ...safeFields } = lead;
        return res.status(200).json({ lead: safeFields });
      }
      const leads = await readMyLeads(session.advisorId);
      // Fire-and-forget: never blocks the GET response (same as before).
      generateBackgroundNotifications(session.advisorId, leads).catch(() => {});

      if (process.env.NODE_ENV !== "production") {
        console.log(`[DEBUG my-leads] ${leads.length} leads for advisor ${session.advisorId}`);
        for (const l of leads) {
          console.log(JSON.stringify({
            id: l.id,
            name: l.name,
            type: l.mortgageType,
            pipelineStage: l.pipelineStage,
            leadStatus: l.leadStatus,
            status: l.status,
            mortgageAmount: l.mortgageAmount,
            selectedBank: l.selectedBank || null,
            assignedBank: l.assignedBank || null,
            bankName: l.bankName || null,
            bankerBank: (l.banker && l.banker.bank) || null,
            heatScore: l.heatScore,
            heatLevel: l.heatLevel,
          }));
        }
      }

      const sanitized = leads.map(({ source, leadSource, ...rest }) => rest);
      return res.status(200).json({ leads: sanitized });
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
      const lead = await readMyLead(session.advisorId, id);
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
        const stageType = isBankStage ? "bank_status" : "stage_change";
        createNotification({
          advisorId: session.advisorId,
          type: stageType,
          title: `${lead.name || "ליד"}: ${getPipelineStageLabel(newStage)}`,
          message: `שלב עודכן מ-"${getPipelineStageLabel(prevStage)}" ל-"${getPipelineStageLabel(newStage)}"`,
          entityType: "lead",
          entityId: id,
          priority: isBankStage ? "high" : "normal",
          dedupeKey: `${stageType}:${id}:${newStage}`,
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
      const { source: _src, leadSource: _lSrc, ...safeUpdated } = updated || {};
      return res.status(200).json({ lead: safeUpdated });
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
