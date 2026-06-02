import { hasAdminSession } from "../../../lib/adminAuth";
import { readLeads } from "../../../lib/leadsStore";
import { getAllAdvisorWallets } from "../../../lib/walletStore";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  if (!hasAdminSession(req)) return res.status(401).json({ error: "ADMIN_AUTH_REQUIRED" });

  try {
    const supabaseUrl = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
    const supabaseKey = String(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    const headers = {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    };

    const [purchasesRes, leads, wallets] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/lead_purchases?select=lead_id,price,purchased_at,advisor_id,purchase_type`, { headers }),
      readLeads(),
      getAllAdvisorWallets(),
    ]);

    const purchases = purchasesRes.ok ? (await purchasesRes.json().catch(() => [])) : [];

    // Lead stats
    const soldLeads = leads.filter((l) => l.storeStatus === "sold").length;
    const unsoldLeads = leads.filter((l) => l.storeStatus === "available").length;

    // Revenue
    const totalRevenue = purchases.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

    // Revenue by month
    const byMonth = {};
    for (const p of purchases) {
      if (!p.purchased_at) continue;
      const month = p.purchased_at.slice(0, 7);
      byMonth[month] = (byMonth[month] || 0) + (Number(p.price) || 0);
    }
    const revenueByMonth = Object.entries(byMonth)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, revenue]) => ({ month, revenue }));

    return res.status(200).json({
      totalRevenue,
      leadsSold: soldLeads,
      unsoldLeads,
      totalPurchases: purchases.length,
      revenueByMonth,
      wallets,
    });
  } catch (err) {
    return res.status(500).json({ error: "SUMMARY_FAILED", message: err.message });
  }
}
