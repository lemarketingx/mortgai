/**
 * GET /api/client/case/[token]/info
 *
 * Validates the upload token and returns a sanitized snapshot of the case
 * for the client upload portal. No advisor-only data is exposed.
 */
import { validateToken } from "../../../../../lib/documentUploadTokens";
import { LeadStoreError, readMyLeadsForClient } from "../../../../../lib/leadsStore";
import { readDocuments } from "../../../../../lib/activitiesStore";
import {
  CASE_TYPE_ICONS,
  buildDocumentChecklist,
  normalizeCaseType,
} from "../../../../../lib/mortgageCase";
import { getPipelineStageLabel } from "../../../../../lib/pipeline";
import { getReminderForLead } from "../../../../../lib/documentReminderEngine";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  if (req.method !== "GET") return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");

  const tokenString = String(req.query.token || "").trim();
  if (!tokenString) return apiError(res, 400, "TOKEN_REQUIRED", "Token is required");

  // Validate token — server-side only, never trust lead_id from client
  const tokenRecord = await validateToken(tokenString);
  if (!tokenRecord) return apiError(res, 404, "INVALID_TOKEN", "הקישור אינו תקף, פג תוקף, או בוטל");

  const { lead_id: leadId, advisor_id: advisorId } = tokenRecord;

  let lead;
  try {
    const leads = await readMyLeadsForClient(advisorId);
    lead = leads.find((l) => l.id === leadId);
  } catch (err) {
    if (err instanceof LeadStoreError) return apiError(res, 503, err.code, err.message);
    return apiError(res, 500, "CASE_READ_FAILED", "Could not load case");
  }
  if (!lead) return apiError(res, 404, "LEAD_NOT_FOUND", "התיק לא נמצא");

  const [documents, reminder] = await Promise.all([
    readDocuments(leadId),
    getReminderForLead(leadId).catch(() => null),
  ]);

  const caseType = normalizeCaseType(lead.mortgageType);
  const summary  = buildDocumentChecklist(documents, lead.employmentStatus, caseType);

  // Strip advisor-internal fields from each checklist item before sending to client
  const clientChecklist = summary.checklist.map((doc) => ({
    document_type: doc.document_type,
    label:         doc.label,
    status:        doc.status,
    received:      doc.received,
    missing:       doc.missing,
    required:      doc.required,
    hasFile:       Boolean(doc.storage_path),
    fileName:      doc.file_name    || null,
    uploadedAt:    doc.uploaded_at  || null,
    // Only surface rejection note — never internal advisor notes
    rejectionNote: doc.status === "rejected" ? (doc.review_note || null) : null,
  }));

  return res.status(200).json({
    case: {
      name:         lead.name,
      caseType,
      caseTypeIcon: CASE_TYPE_ICONS[caseType] || "🏠",
      stageLabel:   getPipelineStageLabel(lead.pipelineStage),
      advisorName:  lead.assignedAdvisor || "",
    },
    documents: {
      checklist:         clientChecklist,
      receivedCount:     summary.receivedCount,
      totalCount:        summary.totalCount,
      completionPercent: summary.completionPercent,
    },
    deadline:       reminder?.deadline_at   || null,
    tokenExpiresAt: tokenRecord.expires_at,
  });
}
