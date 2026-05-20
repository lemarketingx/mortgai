import { createActivity } from "../../../lib/activitiesStore";
import { createDocument, readDocuments, updateDocument, DOCUMENT_TYPE_LABELS } from "../../../lib/activitiesStore";
import { getAdvisorSession } from "../../../lib/advisorAuth";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  if (req.method === "GET") {
    const leadId = String(req.query.leadId || "").trim();
    if (!leadId) return apiError(res, 400, "LEAD_ID_REQUIRED", "leadId is required");
    const documents = await readDocuments(leadId);
    return res.status(200).json({ documents });
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const leadId = String(body.leadId || "").trim();
    const documentTypes = Array.isArray(body.documentTypes) ? body.documentTypes.filter(Boolean) : [];
    if (!leadId || !documentTypes.length) {
      return apiError(res, 400, "MISSING_FIELDS", "leadId and documentTypes[] are required");
    }
    const docs = await Promise.all(
      documentTypes.map((dt) => createDocument({
        leadId,
        documentType: dt,
        dueAt: body.dueAt || null,
        createdBy: session.advisorId,
      }))
    );
    const labels = documentTypes.map((dt) => DOCUMENT_TYPE_LABELS[dt] || dt).join(", ");
    await createActivity({
      leadId,
      advisorId: session.advisorId,
      activityType: "document_requested",
      title: "נשלחה בקשת מסמכים",
      body: `התבקשו: ${labels}`,
      channel: body.channel || null,
      metadata: { document_types: documentTypes },
    });
    return res.status(200).json({ documents: docs.filter(Boolean) });
  }

  if (req.method === "PATCH") {
    const body = req.body || {};
    const id = String(body.id || "").trim();
    if (!id) return apiError(res, 400, "MISSING_ID", "id is required");
    const updated = await updateDocument(id, { status: body.status, notes: body.notes });
    if (body.status === "received" && body.leadId) {
      const label = DOCUMENT_TYPE_LABELS[body.documentType] || body.documentType || "מסמך";
      await createActivity({
        leadId: body.leadId,
        advisorId: session.advisorId,
        activityType: "document_received",
        title: `מסמך התקבל: ${label}`,
        metadata: { document_id: id, document_type: body.documentType },
      });
    }
    return res.status(200).json({ document: updated });
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
}
