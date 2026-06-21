import { formatILS } from "./format";

export function leadsToCSV(leads, columns) {
  const cols = columns || [
    { key: "name", label: "שם" },
    { key: "phone", label: "טלפון" },
    { key: "email", label: "אימייל" },
    { key: "status", label: "סטטוס" },
    { key: "pipeline_stage", label: "שלב" },
    { key: "propertyValue", label: "שווי נכס" },
    { key: "mortgageAmount", label: "סכום משכנתא" },
    { key: "monthlyIncome", label: "הכנסה חודשית" },
    { key: "bankName", label: "בנק" },
    { key: "created_at", label: "תאריך יצירה" },
  ];

  const header = cols.map(c => `"${c.label}"`).join(",");
  const rows = leads.map(lead => {
    return cols.map(col => {
      let val = lead[col.key] ?? "";
      if (typeof val === "number" && ["propertyValue", "mortgageAmount", "monthlyIncome"].includes(col.key)) {
        val = val.toLocaleString("he-IL");
      }
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(",");
  });

  const bom = "﻿";
  return bom + [header, ...rows].join("\n");
}

export function downloadCSV(content, filename = "leads-export.csv") {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function leadsToExcelXML(leads, columns) {
  const cols = columns || [
    { key: "name", label: "שם" },
    { key: "phone", label: "טלפון" },
    { key: "email", label: "אימייל" },
    { key: "status", label: "סטטוס" },
    { key: "pipeline_stage", label: "שלב" },
    { key: "propertyValue", label: "שווי נכס" },
    { key: "mortgageAmount", label: "סכום משכנתא" },
    { key: "bankName", label: "בנק" },
    { key: "created_at", label: "תאריך יצירה" },
  ];

  const escapeXml = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="לידים"><Table>`;

  xml += "<Row>" + cols.map(c => `<Cell><Data ss:Type="String">${escapeXml(c.label)}</Data></Cell>`).join("") + "</Row>";

  for (const lead of leads) {
    xml += "<Row>" + cols.map(col => {
      const val = lead[col.key] ?? "";
      const type = typeof val === "number" ? "Number" : "String";
      return `<Cell><Data ss:Type="${type}">${escapeXml(val)}</Data></Cell>`;
    }).join("") + "</Row>";
  }

  xml += "</Table></Worksheet></Workbook>";
  return xml;
}

export function downloadExcel(content, filename = "leads-export.xls") {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
