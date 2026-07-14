/**
 * FINZO transactional email via Resend.
 *
 * Required env vars:
 *   RESEND_API_KEY          — Resend API key
 *   FINZO_ADMIN_EMAIL       — recipient for new-lead notifications
 *   FINZO_FROM_EMAIL        — sender address, e.g. "FINZO <support@finzo.co.il>"
 *
 * Optional:
 *   NEXT_PUBLIC_APP_URL     — used to build deep-links inside emails
 *
 * All functions return { ok, reason } and never throw — email failures must
 * never break the calling flow.
 */

import { readAdvisors } from "./leadsStore";

const RESEND_API = "https://api.resend.com/emails";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

// Shared HTML-escaping helper — every user-controlled value (lead name, phone,
// city, notes, free-text statuses) MUST pass through this before being
// interpolated into email HTML. Exported for regression tests.
export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

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
<body dir="rtl" style="direction:rtl;font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:24px;">
  <div dir="rtl" style="direction:rtl;text-align:right;max-width:540px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#7B3DFF;padding:22px 28px;">
      <h1 style="color:#fff;margin:0;font-size:18px;font-weight:bold;text-align:right;">${headerText}</h1>
    </div>
    <div style="padding:24px 28px;">${bodyHtml}</div>
    <div style="padding:12px 28px;background:#f8fafc;text-align:center;font-size:11px;color:#94a3b8;">
      FINZO — מערכת לידים לייעוץ משכנתאות
    </div>
  </div>
</body>
</html>`;
}

async function send({ to, subject, html, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FINZO_FROM_EMAIL || "FINZO <support@finzo.co.il>";
  if (!apiKey) {
    console.info("[email] Skipped — RESEND_API_KEY not configured");
    return { ok: false, reason: "not_configured" };
  }
  try {
    const payload = { from: fromEmail, to: Array.isArray(to) ? to : [to], subject, html };
    if (replyTo) payload.reply_to = replyTo;
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

// ── Contact / support form → admin inbox ──────────────────────────────────────

const CONTACT_TYPE_HE = {
  general: "שאלה כללית על השירות",
  privacy: "פנייה בנושא פרטיות / מחיקת מידע",
  advisor: "פנייה של יועץ משכנתאות",
  accessibility: "בעיית נגישות",
};

// Sends a contact-form submission to FINZO_ADMIN_EMAIL (your inbox). Every
// user-supplied value is escaped. `replyTo` lets you reply straight to the
// sender from your mail client.
export async function sendContactMessage({ name, email, type, message }) {
  const adminEmail = String(process.env.FINZO_ADMIN_EMAIL || "").trim();
  if (!adminEmail) {
    console.info("[email] Contact message skipped — FINZO_ADMIN_EMAIL not configured");
    return { ok: false, reason: "not_configured" };
  }

  const typeHe = CONTACT_TYPE_HE[type] || "כללי";
  const rows = [
    ["שם", escapeHtml(name)],
    ["אימייל", escapeHtml(email)],
    ["סוג פנייה", escapeHtml(typeHe)],
  ].filter(([, v]) => v);

  const bodyHtml = `
    <table dir="rtl" style="width:100%;border-collapse:collapse;font-size:14px;color:#0f172a;">
      ${rows.map(([l, v]) => tableRow(l, v)).join("")}
    </table>
    <div style="margin-top:16px;padding:14px 16px;background:#f8fafc;border-radius:12px;white-space:pre-wrap;font-size:14px;color:#0f172a;text-align:right;">${escapeHtml(message)}</div>`;

  return send({
    to: adminEmail,
    subject: `פנייה חדשה מהאתר — ${typeHe}`,
    html: emailShell("פנייה חדשה מטופס יצירת הקשר", bodyHtml),
    replyTo: email && String(email).includes("@") ? String(email) : undefined,
  });
}

// ── New-lead notification to admin ────────────────────────────────────────────

// Exported for regression tests — builds the admin notification HTML without
// sending anything. All lead-supplied values are escaped here.
export function buildLeadNotificationEmailHtml(lead) {
  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || "").trim();
  const leadUrl = lead?.id && appUrl ? `${appUrl}/advisor/lead/${encodeURIComponent(lead.id)}` : null;

  const rows = [
    ["שם", escapeHtml(lead?.name)],
    ["טלפון", escapeHtml(lead?.phone)],
    ["עיר", escapeHtml(lead?.city)],
    ["סוג עסקה", PURCHASE_STATUS_HE[lead?.purchaseStatus] || escapeHtml(lead?.purchaseStatus)],
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
        <a href="${escapeHtml(leadUrl)}" style="background:#7B3DFF;color:#fff;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:bold;display:inline-block;">פתח ליד במערכת</a>
      </div>`
    : "";

  return emailShell("ליד חדש התקבל ב-FINZO", tableHtml + ctaHtml);
}

export async function sendLeadNotification(lead) {
  const adminEmail = process.env.FINZO_ADMIN_EMAIL;
  if (!adminEmail) {
    console.info("[email] Lead notification skipped — FINZO_ADMIN_EMAIL not configured");
    return { ok: false, reason: "not_configured" };
  }

  const html = buildLeadNotificationEmailHtml(lead);
  return send({ to: adminEmail, subject: "ליד חדש התקבל ב-FINZO", html });
}

// ── New marketplace-lead notification to advisors ─────────────────────────────
// Sends only fields already visible in the advisor store-leads preview
// (lib/leadsStore.js readStoreLeads) — never the customer's name/phone/email.
// Self-contained markup (not the shared emailShell) so this design only
// affects the marketplace notification, not the admin/document-reminder emails.

function marketplacePreviewRow(label, value, isLast) {
  return `<tr>
    <td style="padding:11px 16px;font-size:12.5px;font-weight:700;color:#6B6890;text-align:right;white-space:nowrap;${isLast ? "" : "border-bottom:1px solid #ECE9F7;"}">${label}</td>
    <td style="padding:11px 16px;font-size:13.5px;font-weight:700;color:#1E1B3A;text-align:right;${isLast ? "" : "border-bottom:1px solid #ECE9F7;"}">${value}</td>
  </tr>`;
}

function buildMarketplaceLeadEmailHtml({ previewFields, marketplaceUrl }) {
  const rowsHtml = previewFields
    .map(([label, value], i) => marketplacePreviewRow(label, value, i === previewFields.length - 1))
    .join("");

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
</head>
<body dir="rtl" style="direction:rtl;margin:0;padding:0;background:#EEF1F8;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="direction:rtl;background:#EEF1F8;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" dir="rtl" width="600" cellpadding="0" cellspacing="0" style="direction:rtl;text-align:right;max-width:600px;width:100%;background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(30,20,90,0.10);">
          <tr>
            <td style="background:#6D28D9;background:linear-gradient(135deg,#6D28D9,#7B3DFF 55%,#9F5BFF);padding:28px 32px;text-align:right;">
              <div style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:0.3px;text-align:right;">FINZO PRO</div>
              <div style="color:rgba(255,255,255,0.88);font-size:13px;font-weight:600;margin-top:4px;text-align:right;">שוק לידים ליועצי משכנתאות</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 4px 32px;text-align:right;">
              <span style="display:inline-block;background:#F3E8FF;color:#7B3DFF;font-size:11px;font-weight:800;padding:5px 12px;border-radius:999px;">חדש בשוק הלידים</span>
              <h1 style="margin:16px 0 8px 0;font-size:22px;line-height:1.35;color:#1E1B3A;font-weight:800;text-align:right;">ליד חדש זמין לרכישה</h1>
              <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#5B5876;text-align:right;">ליד חדש זמין עכשיו בשוק הלידים של FINZO. פרטי הליד המרכזיים מוצגים מטה — היועץ הראשון שירכוש אותו יזכה בו.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;">
              <table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="direction:rtl;background:#F8F7FC;border:1px solid #ECE9F7;border-radius:14px;overflow:hidden;">
                ${rowsHtml}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 0 32px;">
              <table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="direction:rtl;background:#FFF8EB;border:1px solid #FBE8C4;border-radius:12px;">
                <tr>
                  <td style="padding:12px 16px;font-size:12.5px;line-height:1.6;color:#8A6216;text-align:right;">
                    פרטי הקשר של הלקוח ייפתחו רק לאחר רכישת הליד.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 32px 8px 32px;">
              <a href="${marketplaceUrl}" style="display:inline-block;background:#7B3DFF;background:linear-gradient(135deg,#7B3DFF,#5B21B6);color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;padding:14px 40px;border-radius:999px;">כניסה לשוק הלידים</a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background:#FAFAFD;text-align:center;border-top:1px solid #F0EEF9;">
              <div style="font-size:11px;color:#9C99B5;">FINZO PRO — מערכת לידים ו־CRM ליועצי משכנתאות</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendMarketplaceLeadNotificationToAdvisors(lead) {
  const isMarketplaceAvailable =
    lead?.isSellable === true &&
    lead?.storeStatus === "available" &&
    Number(lead?.priceAtCreation) > 0;

  if (!isMarketplaceAvailable) {
    return { ok: false, reason: "not_marketplace_available" };
  }

  let advisors = [];
  try {
    advisors = await readAdvisors();
  } catch (err) {
    console.error("[email] Marketplace notification: failed to load advisors", err?.message || err);
    return { ok: false, reason: "advisors_read_failed" };
  }

  const seen = new Set();
  const recipients = [];
  for (const advisor of Array.isArray(advisors) ? advisors : []) {
    if (advisor?.active !== true) continue;
    const email = String(advisor?.email || "").trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    recipients.push(email);
  }

  if (!recipients.length) {
    console.info("[email] Marketplace notification: no eligible advisor recipients");
    return { ok: false, reason: "no_recipients" };
  }

  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || "").trim();
  const marketplaceUrl = appUrl ? `${appUrl}/advisor/leads` : "/advisor/leads";

  const previewFields = [
    ["סוג עסקה", PURCHASE_STATUS_HE[lead?.purchaseStatus] || escapeHtml(lead?.purchaseStatus)],
    ["עיר", escapeHtml(lead?.city)],
    ["מחיר נכס", formatCurrency(lead?.propertyPrice)],
    ["סכום משכנתא", formatCurrency(lead?.mortgageAmount)],
    ["איכות ליד / דירוג", [lead?.leadQuality, lead?.leadScoreTier].filter(Boolean).join(" · ")],
    ["מחיר ליד", formatCurrency(lead?.priceAtCreation)],
  ].filter(([, v]) => v && v !== "—");

  const html = buildMarketplaceLeadEmailHtml({ previewFields, marketplaceUrl });
  const subject = "ליד חדש זמין בשוק הלידים של FINZO";

  // Individual sends (not one email with all advisors visible in To/CC) —
  // sequential to keep concurrency low.
  let sent = 0;
  let failed = 0;
  for (const to of recipients) {
    const result = await send({ to, subject, html });
    if (result.ok) sent += 1;
    else failed += 1;
  }

  console.info("[email] Marketplace lead notification summary", { total: recipients.length, sent, failed });
  return { ok: sent > 0, total: recipients.length, sent, failed };
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
    ? missingDocs.map((d) => `<li style="margin-bottom:4px;">${escapeHtml(d.label || d)}</li>`).join("")
    : "<li>מסמכים חסרים</li>";

  const uploadSection = uploadLink
    ? `<div style="margin:20px 0;text-align:center;">
        <a href="${escapeHtml(uploadLink)}" style="background:#7B3DFF;color:#fff;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:bold;display:inline-block;">העלאת מסמכים</a>
        <p style="font-size:11px;color:#94a3b8;margin-top:8px;">הקישור מאובטח ובתוקף לזמן מוגבל</p>
      </div>`
    : `<p style="color:#475569;">לקבלת קישור להעלאה, פנו ל${escapeHtml(advisorName) || "היועץ שלכם"} ישירות.</p>`;

  const body = `<p>שלום ${escapeHtml(clientName) || "לקוח יקר"},</p>
    <p>תזכורת ידידותית מ-FINZO:<br>כדי להתקדם בתיק המשכנתא שלכם, עדיין חסרים המסמכים הבאים:</p>
    <ul style="background:#f8fafc;border-radius:8px;padding:14px 28px;margin:12px 0;">${docListHtml}</ul>
    ${uploadSection}
    <p>תודה,<br>${escapeHtml(advisorName) || "צוות FINZO"}</p>`;

  const html = emailShell("תזכורת — מסמכים חסרים בתיק המשכנתא", body);
  return send({
    to: clientEmail,
    subject: "תזכורת — מסמכים חסרים בתיק המשכנתא שלכם",
    html,
  });
}

// ── Custom email from advisor to client ────────────────────────────────────────
export async function sendAdvisorCustomEmail({
  clientName,
  clientEmail,
  subject,
  content,
}) {
  if (!clientEmail) return { ok: false, reason: "no_client_email" };
  if (!subject || !content) return { ok: false, reason: "missing_fields" };

  const body = `<p>שלום ${escapeHtml(clientName) || "לקוח יקר"},</p>
    <div style="margin:16px 0;white-space:pre-wrap;line-height:1.6;color:#1e293b;">${escapeHtml(content)}</div>`;

  const html = emailShell(escapeHtml(subject), body);
  return send({
    to: clientEmail,
    subject: escapeHtml(subject),
    html,
  });
}
