/**
 * POST /api/advisor/send-reminder-email
 *
 * Sends a Hebrew document-reminder email to the client.
 * Requires advisor session and lead ownership.
 * Enforces a minimum 24-hour cooldown between reminder emails.
 *
 * Body:
 *   leadId        string   (required)
 *   clientEmail   string   (required)
 *   missingDocs   array    e.g. [{ label: "תלושי שכר" }]
 *   uploadLink    string   optional — public upload URL
 *   clientName    string   optional — for personalised greeting
 */

import { getAdvisorSession } from "../../../lib/advisorAuth";
import { LeadStoreError, readMyLeads } from "../../../lib/leadsStore";
import { getReminderForLead, recordReminderSent } from "../../../lib/documentReminderEngine";
import { sendDocumentReminderEmail } from "../../../lib/email";

const MIN_HOURS_BETWEEN_EMAILS = 24;

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");

  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  const body = req.body || {};
  const leadId = String(body.leadId || "").trim();
  const clientEmail = String(body.clientEmail || "").trim();
  const clientName = String(body.clientName || "").trim();
  const uploadLink = String(body.uploadLink || "").trim();
  const missingDocs = Array.isArray(body.missingDocs) ? body.missingDocs : [];

  if (!leadId) return apiError(res, 400, "LEAD_ID_REQUIRED", "leadId is required");
  if (!clientEmail || !clientEmail.includes("@")) {
    return apiError(res, 400, "INVALID_CLIENT_EMAIL", "כתובת אימייל של הלקוח אינה תקינה");
  }

  // Verify advisor owns this lead
  let lead;
  try {
    const leads = await readMyLeads(session.advisorId);
    lead = leads.find((l) => l.id === leadId);
  } catch (err) {
    const status = err instanceof LeadStoreError && err.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
    return apiError(res, status, err?.code || "LEAD_ACCESS_FAILED", "Unable to verify lead ownership");
  }
  if (!lead) return apiError(res, 404, "LEAD_NOT_FOUND", "Lead not found in your leads");

  // Enforce cooldown — don't spam the client
  const existing = await getReminderForLead(leadId);
  if (existing?.last_reminder_sent_at) {
    const hoursSinceLast = (Date.now() - new Date(existing.last_reminder_sent_at).getTime()) / 3_600_000;
    if (hoursSinceLast < MIN_HOURS_BETWEEN_EMAILS) {
      const remaining = Math.ceil(MIN_HOURS_BETWEEN_EMAILS - hoursSinceLast);
      return apiError(res, 429, "REMINDER_TOO_SOON", `ניתן לשלוח תזכורת נוספת בעוד ${remaining} שעות`);
    }
  }

  // Resolve advisor name from session or lead
  const advisorName = lead.assignedAdvisor || session.name || "היועץ שלכם";

  const result = await sendDocumentReminderEmail({
    clientName: clientName || lead.name,
    clientEmail,
    advisorName,
    uploadLink: uploadLink || null,
    missingDocs,
  });

  if (!result.ok) {
    if (result.reason === "not_configured") {
      return apiError(res, 503, "EMAIL_NOT_CONFIGURED", "שירות האימייל אינו מוגדר. הגדירו RESEND_API_KEY.");
    }
    return apiError(res, 502, "EMAIL_SEND_FAILED", "שליחת האימייל נכשלה. נסו שוב.");
  }

  // Record that a reminder was sent (updates last_reminder_sent_at + reminder_count)
  if (existing?.id) {
    await recordReminderSent(existing.id, existing.reminder_count || 0).catch(() => {});
  }

  return res.status(200).json({ ok: true, message: "תזכורת נשלחה בהצלחה" });
}
