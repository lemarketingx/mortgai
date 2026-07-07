import { getAdvisorSession } from "../../../lib/advisorAuth";
import { LeadStoreError, readMyLead } from "../../../lib/leadsStore";
import { cancelReminder, getReminderForLead, recordReminderSent, upsertReminder } from "../../../lib/documentReminderEngine";

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

export default async function handler(req, res) {
  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  // GET — fetch active reminder for a lead
  if (req.method === "GET") {
    const leadId = String(req.query.leadId || "").trim();
    if (!leadId) return apiError(res, 400, "LEAD_ID_REQUIRED", "leadId is required");
    const lead = await findOwnedLead(res, session.advisorId, leadId);
    if (!lead) return;
    const reminder = await getReminderForLead(leadId);
    return res.status(200).json({ reminder: reminder || null });
  }

  // POST / PATCH — create or update reminder
  if (req.method === "POST" || req.method === "PATCH") {
    const body   = req.body || {};
    const leadId = String(body.leadId || "").trim();
    if (!leadId) return apiError(res, 400, "LEAD_ID_REQUIRED", "leadId is required");
    const lead = await findOwnedLead(res, session.advisorId, leadId);
    if (!lead) return;

    const reminder = await upsertReminder(leadId, session.advisorId, {
      uploadTokenId:       body.uploadTokenId || null,
      deadlineAt:          body.deadlineAt    || null,
      channel:             body.channel       || "whatsapp",
      missingDocumentTypes: Array.isArray(body.missingDocumentTypes) ? body.missingDocumentTypes : [],
    });
    return res.status(200).json({ reminder });
  }

  // PUT — record that a manual reminder was sent
  if (req.method === "PUT") {
    const body       = req.body || {};
    const reminderId = String(body.reminderId || "").trim();
    const leadId     = String(body.leadId     || "").trim();
    if (!reminderId || !leadId) return apiError(res, 400, "MISSING_FIELDS", "reminderId and leadId are required");
    const lead = await findOwnedLead(res, session.advisorId, leadId);
    if (!lead) return;
    const reminder = await getReminderForLead(leadId);
    await recordReminderSent(reminderId, reminder?.reminder_count || 0);
    return res.status(200).json({ success: true });
  }

  // DELETE — cancel reminder
  if (req.method === "DELETE") {
    const body       = req.body || {};
    const reminderId = String(body.reminderId || "").trim();
    const leadId     = String(body.leadId     || "").trim();
    if (!reminderId || !leadId) return apiError(res, 400, "MISSING_FIELDS", "reminderId and leadId are required");
    const lead = await findOwnedLead(res, session.advisorId, leadId);
    if (!lead) return;
    await cancelReminder(reminderId);
    return res.status(200).json({ success: true });
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
}
