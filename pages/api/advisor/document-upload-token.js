import { getAdvisorSession } from "../../../lib/advisorAuth";
import { createUploadToken, getActiveTokenForLead, revokeToken } from "../../../lib/documentUploadTokens";
import { LeadStoreError, readMyLead } from "../../../lib/leadsStore";

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
    const status = error instanceof LeadStoreError && error.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
    apiError(res, status, error?.code || "LEAD_ACCESS_FAILED", error?.message || "Unable to verify lead ownership");
    return null;
  }
}

function buildUploadUrl(req, token) {
  const proto = process.env.NODE_ENV === "production" ? "https" : "http";
  return `${proto}://${req.headers.host}/client/case/${token}/documents`;
}

export default async function handler(req, res) {
  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  // GET — return active token (if any) for a lead
  if (req.method === "GET") {
    const leadId = String(req.query.leadId || "").trim();
    if (!leadId) return apiError(res, 400, "LEAD_ID_REQUIRED", "leadId is required");
    const lead = await findOwnedLead(res, session.advisorId, leadId);
    if (!lead) return;
    const tokenRecord = await getActiveTokenForLead(leadId);
    if (!tokenRecord) return res.status(200).json({ token: null, uploadUrl: null });
    return res.status(200).json({ token: tokenRecord, uploadUrl: buildUploadUrl(req, tokenRecord.token) });
  }

  // POST — create (or refresh) upload token for a lead
  if (req.method === "POST") {
    const leadId = String(req.body?.leadId || "").trim();
    if (!leadId) return apiError(res, 400, "LEAD_ID_REQUIRED", "leadId is required");
    const lead = await findOwnedLead(res, session.advisorId, leadId);
    if (!lead) return;
    const tokenRecord = await createUploadToken(leadId, session.advisorId);
    if (!tokenRecord) return apiError(res, 500, "TOKEN_CREATE_FAILED", "Failed to create upload token");
    return res.status(201).json({ token: tokenRecord, uploadUrl: buildUploadUrl(req, tokenRecord.token) });
  }

  // DELETE — revoke a token
  if (req.method === "DELETE") {
    const tokenId = String(req.body?.tokenId || "").trim();
    const leadId = String(req.body?.leadId || "").trim();
    if (!tokenId || !leadId) return apiError(res, 400, "MISSING_FIELDS", "tokenId and leadId are required");
    const lead = await findOwnedLead(res, session.advisorId, leadId);
    if (!lead) return;
    await revokeToken(tokenId);
    return res.status(200).json({ success: true });
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
}
