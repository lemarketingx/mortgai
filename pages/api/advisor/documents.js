import { createActivity } from "../../../lib/activitiesStore";
import { createDocument, readDocuments, updateDocument } from "../../../lib/activitiesStore";
import { LeadStoreError, readMyLead, updateLead } from "../../../lib/leadsStore";
import { getAdvisorSession } from "../../../lib/advisorAuth";
import {
  buildDocumentChecklist,
  calculateOverallMortgageProgress,
  getDocumentLabel,
  normalizeDocumentStatus,
  normalizeDocumentType,
} from "../../../lib/mortgageCase";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

async function findOwnedLead(res, advisorId, leadId) {
  try {
    const lead = await readMyLead(advisorId, leadId);
    if (lead) return lead;
    apiError(res, 404, "LEAD_NOT_FOUND", "Lead not found in your purchased leads");
    return null;
  } catch (error) {
    if (error instanceof LeadStoreError) {
      const status = error.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
      apiError(res, status, error.code, error.message);
      return null;
    }
    apiError(res, 500, "LEAD_ACCESS_CHECK_FAILED", "Unable to verify lead ownership");
    return null;
  }
}

async function syncDocumentProgress(lead, documents) {
  const summary = buildDocumentChecklist(documents, lead.employmentStatus);
  const patch = {
    documentsCompletionPercent: summary.completionPercent,
    missingDocumentsCount: summary.missingCount,
  };
  patch.overallProgressPercent = calculateOverallMortgageProgress({ ...lead, ...patch });
  await updateLead(lead.id, patch).catch(() => null);
  return summary;
}

export default async function handler(req, res) {
  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  if (req.method === "GET") {
    const leadId = String(req.query.leadId || "").trim();
    if (!leadId) return apiError(res, 400, "LEAD_ID_REQUIRED", "leadId is required");
    const lead = await findOwnedLead(res, session.advisorId, leadId);
    if (!lead) return;
    const documents = await readDocuments(leadId);
    const summary = buildDocumentChecklist(documents, lead.employmentStatus);
    return res.status(200).json({ documents, checklist: summary.checklist, summary });
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const leadId = String(body.leadId || "").trim();
    const documentTypes = Array.isArray(body.documentTypes)
      ? body.documentTypes.filter(Boolean).map(normalizeDocumentType)
      : [];
    if (!leadId || !documentTypes.length) {
      return apiError(res, 400, "MISSING_FIELDS", "leadId and documentTypes[] are required");
    }
    const lead = await findOwnedLead(res, session.advisorId, leadId);
    if (!lead) return;
    const docs = await Promise.all(
      documentTypes.map((documentType) => createDocument({
        leadId,
        documentType,
        dueAt: body.dueAt || null,
        createdBy: session.advisorId,
      }))
    );
    const allDocuments = await readDocuments(leadId);
    const summary = await syncDocumentProgress(lead, allDocuments);
    const labels = documentTypes.map(getDocumentLabel).join(", ");
    await createActivity({
      leadId,
      advisorId: session.advisorId,
      activityType: "document_requested",
      title: "נשלחה בקשת מסמכים",
      body: `התבקשו: ${labels}`,
      channel: body.channel || null,
      metadata: { document_types: documentTypes },
    });
    return res.status(200).json({ documents: docs.filter(Boolean), summary });
  }

  if (req.method === "PATCH") {
    const body = req.body || {};
    const id = String(body.id || "").trim();
    const leadId = String(body.leadId || "").trim();
    if (!id) return apiError(res, 400, "MISSING_ID", "id is required");
    if (!leadId) return apiError(res, 400, "LEAD_ID_REQUIRED", "leadId is required");
    const lead = await findOwnedLead(res, session.advisorId, leadId);
    if (!lead) return;
    const status = normalizeDocumentStatus(body.status);
    const documentType = normalizeDocumentType(body.documentType);
    const updated = await updateDocument(id, { status, notes: body.notes });
    const allDocuments = await readDocuments(leadId);
    const summary = await syncDocumentProgress(lead, allDocuments);
    if (status === "received" || status === "approved") {
      await createActivity({
        leadId,
        advisorId: session.advisorId,
        activityType: "document_received",
        title: `מסמך התקבל: ${getDocumentLabel(documentType)}`,
        metadata: { document_id: id, document_type: documentType },
      });
    }
    return res.status(200).json({ document: updated, summary });
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
}
