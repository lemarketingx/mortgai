import { hasAdminSession } from "../../../lib/adminAuth";
import { LeadStoreError, readLeads } from "../../../lib/leadsStore";

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(leads) {
  const headers = ["createdAt", "name", "phone", "city", "amount", "status", "approvalScore", "source", "notes"];
  const rows = leads.map((lead) => [
    lead.createdAt,
    lead.name,
    lead.phone,
    lead.city,
    lead.mortgageAmount,
    lead.status,
    lead.approvalScore,
    lead.source,
    lead.notes,
  ]);

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
    res.setHeader("Content-Disposition", `attachment; filename="mortgai2-leads-${date}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    if (error instanceof LeadStoreError) {
      const status = error.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
      return res.status(status).json({ error: error.code, message: error.message, details: error.details || "" });
    }
    return res.status(500).json({ error: "CSV_EXPORT_FAILED" });
  }
}
