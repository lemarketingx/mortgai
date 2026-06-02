import { getAdvisorSession } from "../../../lib/advisorAuth";
import { LeadStoreError, readMyLeads } from "../../../lib/leadsStore";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  const session = getAdvisorSession(req);
  if (!session) return res.status(401).json({ error: "ADVISOR_AUTH_REQUIRED" });

  try {
    const leads = await readMyLeads(session.advisorId);
    const purchases = leads
      .filter((l) => l.purchasedAt)
      .sort((a, b) => new Date(b.purchasedAt) - new Date(a.purchasedAt))
      .map((l) => ({
        leadId: l.id,
        city: l.city || "",
        purchaseStatus: l.purchaseStatus || "",
        mortgageAmount: l.mortgageAmount || 0,
        propertyPrice: l.propertyPrice || 0,
        leadQuality: l.leadQuality || "",
        approvalScore: l.approvalScore || 0,
        purchasedAt: l.purchasedAt,
        purchasePrice: l.purchasePrice || 0,
        purchaseType: l.purchaseType || "regular",
      }));
    return res.status(200).json({ purchases });
  } catch (err) {
    if (err instanceof LeadStoreError) {
      const status = err.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
      return res.status(status).json({ error: err.code, message: err.message });
    }
    return res.status(500).json({ error: "PURCHASES_FAILED", message: err.message });
  }
}
