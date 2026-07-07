/**
 * POST /api/client/documents/upload
 *
 * Accepts a base64-encoded file from the client upload portal,
 * validates it, uploads to Supabase Storage, and updates the document record.
 *
 * Security:
 *   - Token is validated server-side; lead_id is never accepted from the client.
 *   - File type and size are validated server-side even though the client pre-validates.
 *   - The Supabase service key never leaves the server.
 */
export const config = {
  api: {
    bodyParser: { sizeLimit: "15mb" }, // 10 MB file ≈ 13.4 MB base64 + JSON wrapper
  },
};

import { validateToken } from "../../../../lib/documentUploadTokens";
import { LeadStoreError, readMyLead } from "../../../../lib/leadsStore";
import { createActivity, createDocument, readDocuments, updateDocument } from "../../../../lib/activitiesStore";
import { buildDocumentChecklist, normalizeCaseType, normalizeDocumentType } from "../../../../lib/mortgageCase";
import { uploadToStorage, validateFile } from "../../../../lib/documentStorage";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");

  const body         = req.body || {};
  const tokenString  = String(body.token        || "").trim();
  const documentType = normalizeDocumentType(String(body.documentType || "").trim());
  const fileData     = String(body.fileData     || ""); // base64
  const fileName     = String(body.fileName     || "file").slice(0, 200);
  const mimeType     = String(body.mimeType     || "").trim().toLowerCase();
  const fileSize     = Number(body.fileSize)    || 0;

  if (!tokenString)  return apiError(res, 400, "TOKEN_REQUIRED",         "Token is required");
  if (!documentType) return apiError(res, 400, "DOCUMENT_TYPE_REQUIRED", "documentType is required");
  if (!fileData)     return apiError(res, 400, "FILE_REQUIRED",          "fileData is required");

  // 1. Validate token — resolves lead_id server-side
  const tokenRecord = await validateToken(tokenString);
  if (!tokenRecord) return apiError(res, 403, "INVALID_TOKEN", "הקישור אינו תקף או פג תוקף");

  const { lead_id: leadId, advisor_id: advisorId } = tokenRecord;

  // 2. Server-side file validation (client pre-validates too, but server is authoritative)
  const fileError = validateFile(mimeType, fileSize);
  if (fileError) return apiError(res, 400, fileError.code, fileError.message);

  // 3. Verify the document type belongs to this case's checklist
  let lead;
  try {
    lead = await readMyLead(advisorId, leadId);
  } catch (err) {
    if (err instanceof LeadStoreError) return apiError(res, 503, err.code, err.message);
    return apiError(res, 500, "CASE_READ_FAILED", "Could not load case");
  }
  if (!lead) return apiError(res, 403, "LEAD_NOT_FOUND", "Case not found");

  const existingDocs = await readDocuments(leadId);
  const caseType     = normalizeCaseType(lead.mortgageType);
  const summary      = buildDocumentChecklist(existingDocs, lead.employmentStatus, caseType);
  const docInList    = summary.checklist.find((d) => d.document_type === documentType);
  if (!docInList) return apiError(res, 400, "INVALID_DOCUMENT_TYPE", "סוג המסמך אינו שייך לתיק זה");

  // 4. Decode base64 and re-validate decoded size
  let fileBuffer;
  try {
    fileBuffer = Buffer.from(fileData, "base64");
  } catch {
    return apiError(res, 400, "INVALID_FILE_DATA", "לא ניתן לפענח את הקובץ");
  }
  if (fileBuffer.length > 10 * 1024 * 1024) {
    return apiError(res, 400, "FILE_TOO_LARGE", "הקובץ גדול מדי. גודל מקסימלי: 10MB.");
  }

  // 5. Upload to Supabase Storage
  const storagePath = await uploadToStorage(leadId, documentType, fileName, fileBuffer, mimeType);
  if (!storagePath) return apiError(res, 500, "UPLOAD_FAILED", "העלאת הקובץ נכשלה. נא לנסות שוב.");

  // 6. Update or create document record
  const now         = new Date().toISOString();
  const existingDoc = existingDocs.find((d) => d.document_type === documentType);
  const fileFields  = {
    status:     "received",
    storagePath,
    fileName,
    fileSize:   fileBuffer.length,
    mimeType,
    uploadedBy: "client",
    uploadedAt: now,
  };

  let updatedDoc;
  if (existingDoc?.id) {
    updatedDoc = await updateDocument(existingDoc.id, fileFields);
  } else {
    const newDoc = await createDocument({ leadId, documentType, createdBy: "client" });
    if (newDoc?.id) updatedDoc = await updateDocument(newDoc.id, fileFields);
  }

  // 7. Activity log (fire-and-forget — non-blocking)
  createActivity({
    leadId,
    advisorId,
    activityType: "document_received",
    title:        `מסמך הועלה על ידי הלקוח: ${docInList.label || documentType}`,
    body:         fileName,
    channel:      "portal",
    metadata:     { document_type: documentType, uploaded_by: "client" },
  }).catch(() => {});

  return res.status(200).json({ success: true, document: updatedDoc || existingDoc || null });
}
