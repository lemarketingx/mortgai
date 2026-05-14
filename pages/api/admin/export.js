import { hasAdminSession } from "../../../lib/adminAuth";
import { LeadStoreError, readLeads } from "../../../lib/leadsStore";

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

const columns = [
  ["createdAt", "תאריך יצירה"],
  ["lastUpdated", "עדכון אחרון"],
  ["name", "שם"],
  ["phone", "טלפון"],
  ["city", "עיר מגורים"],
  ["propertyCity", "עיר נכס"],
  ["mortgageAmount", "סכום משכנתא"],
  ["propertyPrice", "מחיר נכס"],
  ["equityAmount", "הון עצמי"],
  ["monthlyIncome", "הכנסה חודשית"],
  ["debtLevel", "התחייבויות חודשיות"],
  ["purchaseStatus", "סטטוס רכישה"],
  ["contractStatus", "סטטוס חוזה"],
  ["employmentStatus", "סטטוס תעסוקה"],
  ["hasExistingMortgage", "משכנתא קיימת"],
  ["requestedContactTime", "מועד חזרה"],
  ["approvalScore", "ציון אישור"],
  ["estimatedApprovalResult", "אומדן אישור"],
  ["mainIssue", "בעיה מרכזית"],
  ["leadQuality", "איכות ליד"],
  ["leadPriority", "עדיפות"],
  ["leadStatus", "סטטוס ליד"],
  ["status", "סטטוס כללי"],
  ["followUpStage", "שלב מעקב"],
  ["followUpDate", "תאריך מעקב"],
  ["lastContactedAt", "יצירת קשר אחרונה"],
  ["assignedAdvisor", "יועץ משויך"],
  ["advisorPhone", "טלפון יועץ"],
  ["advisorEmail", "אימייל יועץ"],
  ["commissionStatus", "סטטוס עמלה"],
  ["commissionAmount", "עמלה"],
  ["expectedCommission", "עמלה צפויה"],
  ["actualCommission", "עמלה בפועל"],
  ["source", "מקור"],
  ["utmSource", "UTM Source"],
  ["utmMedium", "UTM Medium"],
  ["utmCampaign", "UTM Campaign"],
  ["referrer", "Referrer"],
  ["landingPage", "Landing Page"],
  ["notes", "הערות לקוח"],
  ["internalNotes", "הערות פנימיות"],
];

function toCsv(leads) {
  const headers = columns.map(([, label]) => label);
  const rows = leads.map((lead) => columns.map(([key]) => lead[key]));

  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\r\n");
}

export default async function handler(req, res) {
  try {
    if (!hasAdminSession(req)) {
      return res.status(401).json({ error: "ADMIN_AUTH_REQUIRED" });
    }
  } catch (error) {
    return res.status(500).json({ error: "ADMIN_AUTH_NOT_CONFIGURED", message: error.message });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const leads = await readLeads();
    const csv = `\uFEFF${toCsv(leads)}`;
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="mortgai-leads-${date}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    if (error instanceof LeadStoreError) {
      const status = error.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
      return res.status(status).json({ error: error.code, message: error.message, details: error.details || "" });
    }
    return res.status(500).json({ error: "CSV_EXPORT_FAILED" });
  }
}
