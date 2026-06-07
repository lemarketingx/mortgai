/**
 * GET/POST /api/cron/reminders
 *
 * Scheduled digest job — sends each advisor a Hebrew email summarizing leads
 * that need attention (unhandled new leads, follow-ups due, missing documents,
 * stale cases). Designed to be triggered by an external scheduler:
 *
 *   • Vercel Cron        — add to vercel.json (see docs/reminders-cron.md)
 *   • Supabase scheduled — pg_cron / Edge Function hitting this URL
 *
 * Auth: requires `Authorization: Bearer ${CRON_SECRET}` (or `?secret=`) so the
 * endpoint cannot be triggered by the public. Set CRON_SECRET in env.
 *
 * Safe by design:
 *   - Read-only against the lead store (no writes, no status changes)
 *   - Emails are best-effort; failures are logged and do not affect each other
 *   - No-ops cleanly when RESEND_API_KEY / EMAIL_FROM are not configured
 */
import { LeadStoreError, readAdvisors, readMyLeads } from "../../../lib/leadsStore";
import { absoluteUrl } from "../../../lib/seo";
import { escapeHtml, sendEmail } from "../../../lib/email";
import { buildAdvisorDigest } from "../../../lib/reminderDigest";

function isAuthorized(req) {
  const secret = String(process.env.CRON_SECRET || "").trim();
  if (!secret) return false;

  const header = String(req.headers.authorization || "");
  if (header === `Bearer ${secret}`) return true;

  const queryToken = String(req.query?.secret || "");
  return queryToken === secret;
}

function leadRowHtml(lead) {
  const url = absoluteUrl(`/advisor/lead/${lead.id}`);
  return `<tr>
    <td style="padding:6px 12px;font-size:13px;color:#0f172a;">${escapeHtml(lead.name || "ליד ללא שם")}</td>
    <td style="padding:6px 12px;font-size:13px;color:#64748b;">${escapeHtml(lead.phone || "")}</td>
    <td style="padding:6px 12px;font-size:13px;"><a href="${escapeHtml(url)}" style="color:#6d28d9;font-weight:700;text-decoration:none;">צפייה ←</a></td>
  </tr>`;
}

function buildDigestHtml(advisorName, digest) {
  const sectionsHtml = digest.sections
    .map(
      (section) => `
      <h2 style="font-size:15px;color:#0f172a;margin:20px 0 8px;">${escapeHtml(section.title)} (${section.leads.length})</h2>
      <table dir="rtl" style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:12px;overflow:hidden;">
        ${section.leads.slice(0, 10).map(leadRowHtml).join("")}
      </table>`
    )
    .join("");

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <div style="background:#0f172a;border-radius:16px 16px 0 0;padding:20px 24px;">
        <span style="color:#fff;font-weight:900;font-size:20px;">FINZO</span>
      </div>
      <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:24px;">
        <h1 style="margin:0 0 8px;font-size:18px;color:#0f172a;">סיכום יומי — תיקים שדורשים תשומת לב</h1>
        <p style="margin:0 0 8px;font-size:14px;color:#475569;">היי ${escapeHtml(advisorName || "")}, הנה התיקים שכדאי לבדוק היום (סה״כ ${digest.totalCount}):</p>
        ${sectionsHtml}
        <a href="${escapeHtml(absoluteUrl("/advisor/my-leads"))}" style="display:inline-block;margin-top:20px;background:#6d28d9;color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:12px 22px;border-radius:12px;">מעבר ל&quot;הלידים שלי&quot;</a>
        <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;">הודעה אוטומטית ממערכת FINZO. אין להשיב לכתובת זו.</p>
      </div>
    </div>
  </body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Missing or invalid CRON_SECRET" });
  }

  let advisors;
  try {
    advisors = await readAdvisors();
  } catch (error) {
    const status = error instanceof LeadStoreError && error.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
    return res.status(status).json({ error: error?.code || "ADVISORS_READ_FAILED", message: error?.message || "" });
  }

  const activeAdvisors = advisors.filter((a) => a.active !== false && String(a.email || "").includes("@"));
  const results = [];

  for (const advisor of activeAdvisors) {
    const advisorId = String(advisor.advisor_id || "");
    if (!advisorId) continue;

    try {
      const leads = await readMyLeads(advisorId);
      const digest = buildAdvisorDigest(leads);
      if (!digest) {
        results.push({ advisorId, sent: false, reason: "NOTHING_TO_REPORT" });
        continue;
      }

      const sendResult = await sendEmail({
        to: advisor.email,
        subject: `FINZO — ${digest.totalCount} תיקים דורשים תשומת לב`,
        html: buildDigestHtml(advisor.name, digest),
      });

      results.push({ advisorId, sent: Boolean(sendResult.ok), totalCount: digest.totalCount, error: sendResult.error });
    } catch (error) {
      console.warn("[cron:reminders] advisor digest failed", { advisorId, error: error?.message || String(error) });
      results.push({ advisorId, sent: false, error: "DIGEST_FAILED" });
    }
  }

  return res.status(200).json({ ok: true, advisorsChecked: activeAdvisors.length, results });
}
