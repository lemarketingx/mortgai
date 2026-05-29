import { getAdvisorSession } from "../../../lib/advisorAuth";
import { LeadStoreError, readMyLeads } from "../../../lib/leadsStore";
import { createActivity, readDocuments, updateDocument } from "../../../lib/activitiesStore";
import { getSignedUrl } from "../../../lib/documentStorage";
import { getDocumentLabel, normalizeDocumentStatus } from "../../../lib/mortgageCase";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

async function findOwnedLead(res, advisorId, leadId) {
  try {
    const leads = await readMyLeads(advisorId);
    const lead = leads.find((l) => l.id === leadId);
    if (lead) return lead;
    apiError(res, 404, "LEAD_NOT_FOUND", "Lead not found in your purchased leads");
    return null;
  } catch (error) {
    const status = error instanceof LeadStoreError && error.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
    apiError(res, status, error?.code || "LEAD_ACCESS_FAILED", error?.message || "Unable to verify lead ownership");
    return null;
  }
}

export default async function handler(req, res) {
  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  // GET — return a signed URL so advisor can view the uploaded file
  if (req.method === "GET") {
    const docId  = String(req.query.docId  || "").trim();
    const leadId = String(req.query.leadId || "").trim();
    if (!docId || !leadId) return apiError(res, 400, "MISSING_FIELDS", "docId and leadId are required");

    const lead = await findOwnedLead(res, session.advisorId, leadId);
    if (!lead) return;

    const docs = await readDocuments(leadId);
    const doc  = docs.find((d) => d.id === docId);
    if (!doc)            return apiError(res, 404, "DOCUMENT_NOT_FOUND", "Document not found");
    if (!doc.storage_path) return apiError(res, 404, "NO_FILE_UPLOADED", "No file has been uploaded for this document");

    const url = await getSignedUrl(doc.storage_path);
    if (!url) {
      console.warn("[document-review] signed URL generation failed", {
        docId,
        leadId,
        storagePath: doc.storage_path,
        fileName: doc.file_name,
      });
      return apiError(res, 500, "SIGNED_URL_FAILED", "לא הצלחנו לפתוח את הקובץ כרגע. נסה שוב בעוד רגע.");
    }

    return res.status(200).json({ url, expiresIn: 3600, fileName: doc.file_name, mimeType: doc.mime_type });
  }

  // PATCH — approve / reject a document
  if (req.method === "PATCH") {
    const body   = req.body || {};
    const docId  = String(body.docId  || "").trim();
    const leadId = String(body.leadId || "").trim();
    if (!docId || !leadId) return apiError(res, 400, "MISSING_FIELDS", "docId and leadId are required");

    const lead = await findOwnedLead(res, session.advisorId, leadId);
    if (!lead) return;

    const docs = await readDocuments(leadId);
    const doc  = docs.find((d) => d.id === docId);
    if (!doc) return apiError(res, 404, "DOCUMENT_NOT_FOUND", "Document not found");

    const status     = normalizeDocumentStatus(body.status);
    const reviewNote = body.reviewNote !== undefined ? String(body.reviewNote || "").trim() : undefined;
    const now        = new Date().toISOString();

    const updated = await updateDocument(docId, {
      status,
      reviewedAt: now,
      ...(reviewNote !== undefined ? { reviewNote } : {}),
    });

    // Activity log
    if (status === "approved" || status === "rejected") {
      const verb = status === "approved" ? "אושר" : "נדחה";
      await createActivity({
        leadId,
        advisorId: session.advisorId,
        activityType: status === "approved" ? "document_received" : "document_requested",
        title: `מסמך ${verb}: ${getDocumentLabel(doc.document_type)}`,
        body: reviewNote || null,
        metadata: { document_id: docId, document_type: doc.document_type },
      });
    }

    return res.status(200).json({ document: updated || doc });
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
}
