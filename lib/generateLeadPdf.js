import { getPipelineStageLabel } from "./pipeline";

const PURCHASE_STATUS_HE = {
  new_purchase: "רכישת דירה",
  first_apartment: "דירה ראשונה",
  upgrader: "משפר דיור",
  investment: "דירה להשקעה",
  refinance: "מחזור משכנתא",
  bank_declined: "סורב בבנק",
  bdi_credit_issue: "מורכבות אשראית",
  senior_60plus: "גיל 60+",
  debt_consolidation: "איחוד הלוואות",
  general: "בדיקה כללית",
};

function fmtCurrency(v) {
  const n = Number(v || 0);
  if (!n) return "—";
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });
}

function row(label, value) {
  if (!value || value === "—") return "";
  return `<tr><td style="padding:6px 12px;background:#f8fafc;font-weight:bold;text-align:right;width:140px;border-bottom:1px solid #e2e8f0;font-size:13px;">${label}</td><td style="padding:6px 12px;text-align:right;border-bottom:1px solid #e2e8f0;font-size:13px;">${value}</td></tr>`;
}

function section(title, content) {
  return `<div style="margin-bottom:20px;">
    <h2 style="font-size:15px;font-weight:bold;color:#1e293b;margin:0 0 8px 0;padding-bottom:6px;border-bottom:2px solid #7c3aed;">${title}</h2>
    ${content}
  </div>`;
}

export function generateLeadPdf(lead, documents = [], activities = []) {
  if (!lead) return;

  const details = [
    row("שם", lead.name),
    row("טלפון", lead.phone),
    row("אימייל", lead.email || lead.advisorEmail),
    row("עיר", lead.city),
    row("עיר הנכס", lead.propertyCity),
    row("סוג עסקה", PURCHASE_STATUS_HE[lead.purchaseStatus] || lead.purchaseStatus),
    row("שלב", getPipelineStageLabel(lead.pipelineStage || lead.leadStatus)),
    row("מחיר נכס", fmtCurrency(lead.propertyPrice)),
    row("סכום משכנתא", fmtCurrency(lead.mortgageAmount)),
    row("הון עצמי", fmtCurrency(lead.equityAmount)),
    row("הכנסה חודשית", fmtCurrency(lead.monthlyIncome)),
    row("סטטוס תעסוקה", lead.employmentStatus),
    row("ציון אישור", lead.approvalScore ? `${lead.approvalScore}%` : null),
    row("תאריך יצירה", fmtDate(lead.createdAt)),
    row("פעולה הבאה", lead.nextAction),
    row("תאריך פעולה הבאה", fmtDate(lead.nextActionAt)),
  ].filter(Boolean).join("");

  const bankInfo = [
    row("בנק", lead.bankName),
    row("סוג משכנתא", lead.mortgageType),
    row("שמאי", lead.appraiserName),
    row("טלפון שמאי", lead.appraiserPhone),
    row("תאריך שמאות", fmtDate(lead.appraisalDate)),
    row("עלות שמאות", fmtCurrency(lead.appraisalCost)),
    row("עו״ד קונה", lead.buyerLawyerName),
    row("עו״ד מוכר", lead.sellerLawyerName),
    row("תאריך חתימה", fmtDate(lead.signingDate)),
    row("מיקום חתימה", lead.signingLocation),
  ].filter(Boolean).join("");

  const docRows = documents.map((d) => {
    const status = d.status === "received" ? "✅ התקבל" : d.status === "requested" ? "⏳ נדרש" : d.status === "rejected" ? "❌ נדחה" : "—";
    return row(d.label || d.document_type, status);
  }).join("");

  const activityRows = activities.slice(0, 20).map((a) => {
    return `<tr><td style="padding:4px 12px;text-align:right;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b;white-space:nowrap;">${fmtDate(a.created_at)}</td><td style="padding:4px 12px;text-align:right;border-bottom:1px solid #f1f5f9;font-size:12px;">${a.title}</td></tr>`;
  }).join("");

  const notesHtml = lead.internalNotes
    ? `<div style="background:#f8fafc;border-radius:8px;padding:12px;font-size:13px;white-space:pre-wrap;">${lead.internalNotes}</div>`
    : "<p style='font-size:13px;color:#94a3b8;'>אין הערות</p>";

  const progressHtml = lead.overallProgressPercent != null
    ? `<div style="margin-bottom:16px;"><span style="font-size:13px;font-weight:bold;">התקדמות כוללת: ${lead.overallProgressPercent}%</span>
       <div style="height:8px;background:#e2e8f0;border-radius:4px;margin-top:4px;"><div style="height:100%;background:#7c3aed;border-radius:4px;width:${lead.overallProgressPercent}%;"></div></div></div>`
    : "";

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"><title>דוח ליד — ${lead.name || "ללא שם"}</title>
<style>@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } } body { font-family: Arial, sans-serif; margin: 0; padding: 24px; background: #fff; color: #1e293b; } table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }</style>
</head>
<body>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #7c3aed;">
    <div>
      <h1 style="margin:0;font-size:22px;color:#7c3aed;">FINZO PRO</h1>
      <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">דוח תיק ליד — ${fmtDate(new Date().toISOString())}</p>
    </div>
    <div style="text-align:left;">
      <p style="margin:0;font-size:16px;font-weight:bold;">${lead.name || "ללא שם"}</p>
      <p style="margin:2px 0 0;font-size:12px;color:#64748b;">${lead.phone || ""}</p>
    </div>
  </div>

  ${progressHtml}
  ${section("פרטי ליד", `<table>${details}</table>`)}
  ${bankInfo ? section("בנק ומשפטי", `<table>${bankInfo}</table>`) : ""}
  ${docRows ? section("מסמכים", `<table>${docRows}</table>`) : ""}
  ${section("הערות פנימיות", notesHtml)}
  ${activityRows ? section("פעילות אחרונה", `<table>${activityRows}</table>`) : ""}

  <div style="margin-top:32px;text-align:center;font-size:11px;color:#94a3b8;">
    הופק מ-FINZO PRO — ${fmtDate(new Date().toISOString())}
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 400);
}
