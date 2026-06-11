/**
 * FINZO transactional email via Resend.
 *
 * Required env vars:
 *   RESEND_API_KEY          — Resend API key
 *   FINZO_ADMIN_EMAIL       — recipient for new-lead notifications
 *   FINZO_FROM_EMAIL        — sender address, e.g. "FINZO <noreply@finzo.co.il>"
 *
 * Optional:
 *   NEXT_PUBLIC_APP_URL     — used to build deep-links inside emails
 *
 * All functions return { ok, reason } and never throw — email failures must
 * never break the calling flow.
 */

const RESEND_API = "https://api.resend.com/emails";

function formatCurrency(value) {
  const num = Number(value || 0);
  if (!num) return "—";
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(num);
}

const PURCHASE_STATUS_HE = {
  new_purchase:       "רכישת דירה",
  first_apartment:    "דירה ראשונה",
  upgrader:           "משפר דיור",
  investment:         "דירה להשקעה",
  refinance:          "מחזור משכנתא",
  bank_declined:      "סורב בבנק",
  bdi_credit_issue:   "מורכבות אשראית",
  senior_60plus:      "גיל 60+",
  debt_consolidation: "איחוד הלוואות",
  general:            "בדיקה כללית",
};

function tableRow(label, value) {
  return `<tr>
    <td style="padding:8px 12px;background:#f8fafc;font-weight:bold;text-align:right;width:140px;border-bottom:1px solid #e2e8f0;">${label}</td>
    <td style="padding:8px 12px;text-align:right;border-bottom:1px solid #e2e8f0;">${value}</td>
  </tr>`;
}

function emailShell(headerText, bodyHtml) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:24px;">
  <div style="max-width:540px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#2C5BFF;padding:22px 28px;">
      <h1 style="color:#fff;margin:0;font-size:18px;font-weight:bold;">${headerText}</h1>
    </div>
    <div style="padding:24px 28px;">${bodyHtml}</div>
    <div style="padding:12px 28px;background:#f8fafc;text-align:center;font-size:11px;color:#94a3b8;">
      FINZO — מערכת לידים לייעוץ משכנתאות
    </div>
  </div>
</body>
</html>`;
}

async function send({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FINZO_FROM_EMAIL || "FINZO <noreply@finzo.co.il>";
  if (!apiKey) {
    console.info("[email] Skipped — RESEND_API_KEY not configured");
    return { ok: false, reason: "not_configured" };
  }
  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromEmail, to: Array.isArray(to) ? to : [to], subject, html }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[email] Resend error", res.status, text.slice(0, 200));
      return { ok: false, reason: "resend_error" };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] send() failed", err?.message || err);
    return { ok: false, reason: "network_error" };
  }
}

// ── New-lead notification to admin ────────────────────────────────────────────

export async function sendLeadNotification(lead) {
  const adminEmail = process.env.FINZO_ADMIN_EMAIL;
  if (!adminEmail) {
    console.info("[email] Lead notification skipped — FINZO_ADMIN_EMAIL not configured");
    return { ok: false, reason: "not_configured" };
  }

  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || "").trim();
  const leadUrl = lead?.id && appUrl ? `${appUrl}/advisor/lead/${lead.id}` : null;

  const rows = [
    ["שם", lead?.name],
    ["טלפון", lead?.phone],
    ["עיר", lead?.city],
    ["סוג עסקה", PURCHASE_STATUS_HE[lead?.purchaseStatus] || lead?.purchaseStatus],
    ["מחיר נכס", formatCurrency(lead?.propertyPrice)],
    ["הון עצמי", formatCurrency(lead?.equityAmount)],
    ["הכנסה חודשית", formatCurrency(lead?.monthlyIncome)],
    ["תאריך", new Date().toLocaleDateString("he-IL")],
  ].filter(([, v]) => v && v !== "—");

  const tableHtml = `<table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
    ${rows.map(([l, v]) => tableRow(l, v)).join("")}
  </table>`;

  const ctaHtml = leadUrl
    ? `<div style="margin-top:24px;text-align:center;">
        <a href="${leadUrl}" style="background:#2C5BFF;color:#fff;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:bold;display:inline-block;">פתח ליד במערכת</a>
      </div>`
    : "";

  const html = emailShell("ליד חדש התקבל ב-FINZO", tableHtml + ctaHtml);
  return send({ to: adminEmail, subject: "ליד חדש התקבל ב-FINZO", html });
}

// ── Document reminder to client ───────────────────────────────────────────────

export async function sendDocumentReminderEmail({
  clientName,
  clientEmail,
  advisorName,
  uploadLink,
  missingDocs = [],
}) {
  if (!clientEmail) return { ok: false, reason: "no_client_email" };

  const docListHtml = missingDocs.length
    ? missingDocs.map((d) => `<li style="margin-bottom:4px;">${d.label || d}</li>`).join("")
    : "<li>מסמכים חסרים</li>";

  const uploadSection = uploadLink
    ? `<div style="margin:20px 0;text-align:center;">
        <a href="${uploadLink}" style="background:#2C5BFF;color:#fff;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:bold;display:inline-block;">העלאת מסמכים</a>
        <p style="font-size:11px;color:#94a3b8;margin-top:8px;">הקישור מאובטח ובתוקף לזמן מוגבל</p>
      </div>`
    : `<p style="color:#475569;">לקבלת קישור להעלאה, פנו ל${advisorName || "היועץ שלכם"} ישירות.</p>`;

  const body = `<p>שלום ${clientName || "לקוח יקר"},</p>
    <p>תזכורת ידידותית מ-FINZO:<br>כדי להתקדם בתיק המשכנתא שלכם, עדיין חסרים המסמכים הבאים:</p>
    <ul style="background:#f8fafc;border-radius:8px;padding:14px 28px;margin:12px 0;">${docListHtml}</ul>
    ${uploadSection}
    <p>תודה,<br>${advisorName || "צוות FINZO"}</p>`;

  const html = emailShell("תזכורת — מסמכים חסרים בתיק המשכנתא", body);
  return send({
    to: clientEmail,
    subject: "תזכורת — מסמכים חסרים בתיק המשכנתא שלכם",
    html,
  });
}
