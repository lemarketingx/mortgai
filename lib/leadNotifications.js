/**
 * New-lead email notifications.
 *
 * Business rule (FINZO marketplace model): public leads are created unassigned
 * and later purchased/claimed by advisors — so a brand-new lead almost always
 * has no assigned advisor yet. We notify:
 *   1. The assigned advisor, if the lead already carries assignedAdvisorId/advisorEmail
 *      (legacy/manual-assignment path — kept for compatibility with existing data).
 *   2. Otherwise, the configured FINZO admin (FINZO_ADMIN_EMAIL) so the lead can be
 *      reviewed and listed in the marketplace.
 *
 * The email contains only a *safe* summary (name, phone, city, intent, source) —
 * never internal notes, commission data, or document links.
 */
import { absoluteUrl } from "./seo";
import { escapeHtml, sendEmail } from "./email";
import { readAdvisors } from "./leadsStore";

function getAdminEmail() {
  return String(process.env.FINZO_ADMIN_EMAIL || "").trim();
}

function safeText(value, fallback = "לא צוין") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function formatMortgageAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "לא צוין";
  return `${n.toLocaleString("he-IL")} ₪`;
}

function buildSummaryRows(lead) {
  return [
    ["שם", safeText(lead.name)],
    ["טלפון", safeText(lead.phone)],
    ["עיר", safeText(lead.city)],
    ["סוג פנייה", safeText(lead.purchaseStatus || lead.mainIssue)],
    ["סכום משכנתא מבוקש", formatMortgageAmount(lead.mortgageAmount)],
    ["מקור", safeText(lead.source, "FINZO")],
  ];
}

function buildHtml({ heading, intro, lead, ctaUrl, ctaLabel }) {
  const rows = buildSummaryRows(lead)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px;color:#64748b;font-size:13px;font-weight:700;white-space:nowrap;">${escapeHtml(label)}</td><td style="padding:6px 12px;color:#0f172a;font-size:13px;">${escapeHtml(value)}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:24px;">
      <div style="background:#0f172a;border-radius:16px 16px 0 0;padding:20px 24px;">
        <span style="color:#fff;font-weight:900;font-size:20px;">FINZO</span>
      </div>
      <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:24px;">
        <h1 style="margin:0 0 8px;font-size:18px;color:#0f172a;">${escapeHtml(heading)}</h1>
        <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">${escapeHtml(intro)}</p>
        <table dir="rtl" style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:12px;overflow:hidden;">${rows}</table>
        <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;margin-top:20px;background:#6d28d9;color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:12px 22px;border-radius:12px;">${escapeHtml(ctaLabel)}</a>
        <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;">הודעה אוטומטית ממערכת FINZO. אין להשיב לכתובת זו.</p>
      </div>
    </div>
  </body>
</html>`;
}

function buildText({ heading, intro, lead, ctaUrl }) {
  const rows = buildSummaryRows(lead).map(([label, value]) => `${label}: ${value}`).join("\n");
  return `${heading}\n\n${intro}\n\n${rows}\n\nצפייה בליד: ${ctaUrl}`;
}

async function resolveAdvisorEmail(lead) {
  const directEmail = String(lead.advisorEmail || "").trim();
  if (directEmail && directEmail.includes("@")) return directEmail;

  const advisorId = String(lead.assignedAdvisorId || "").trim();
  if (!advisorId) return "";

  try {
    const advisors = await readAdvisors();
    const advisor = advisors.find((a) => String(a.advisor_id || "") === advisorId);
    return String(advisor?.email || "").trim();
  } catch {
    return "";
  }
}

/**
 * Notify the relevant party that a new FINZO lead entered the system.
 * Fire-and-forget: never throws, safe to call without awaiting from request handlers.
 */
export async function notifyNewLead(lead) {
  if (!lead || !lead.id) return { ok: false, error: "NO_LEAD" };

  const advisorEmail = await resolveAdvisorEmail(lead);
  const adminEmail = getAdminEmail();

  if (advisorEmail) {
    const ctaUrl = absoluteUrl(`/advisor/lead/${lead.id}`);
    return sendEmail({
      to: advisorEmail,
      subject: `ליד חדש מ-FINZO: ${safeText(lead.name, "ליד חדש")}`,
      html: buildHtml({
        heading: "ליד חדש שויך אליך ב-FINZO",
        intro: "נכנס ליד חדש ומשויך לחשבון שלך. מומלץ ליצור קשר בהקדם להגדלת סיכויי הסגירה.",
        lead,
        ctaUrl,
        ctaLabel: "צפייה בליד",
      }),
      text: buildText({ heading: "ליד חדש שויך אליך ב-FINZO", intro: "נכנס ליד חדש ומשויך לחשבון שלך.", lead, ctaUrl }),
    });
  }

  if (adminEmail) {
    const ctaUrl = absoluteUrl("/admin");
    return sendEmail({
      to: adminEmail,
      subject: `ליד חדש ב-FINZO ממתין לשיוך: ${safeText(lead.name, "ליד חדש")}`,
      html: buildHtml({
        heading: "ליד חדש נכנס למערכת FINZO",
        intro: "הליד עדיין אינו משויך ליועץ. יש לבדוק ולשייך אותו / להעלות לחנות הלידים בהקדם.",
        lead,
        ctaUrl,
        ctaLabel: "פתיחת לוח הניהול",
      }),
      text: buildText({ heading: "ליד חדש נכנס למערכת FINZO (ללא שיוך)", intro: "יש לבדוק ולשייך את הליד בהקדם.", lead, ctaUrl }),
    });
  }

  console.warn("[leadNotifications] no recipient — set FINZO_ADMIN_EMAIL or assign the lead to an advisor", { leadId: lead.id });
  return { ok: false, error: "NO_RECIPIENT_CONFIGURED" };
}
