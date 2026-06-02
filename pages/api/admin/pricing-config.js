import { hasAdminSession } from "../../../lib/adminAuth";
import { getPricingConfig, updatePricingConfig } from "../../../lib/walletStore";

export default async function handler(req, res) {
  if (!hasAdminSession(req)) return res.status(401).json({ error: "ADMIN_AUTH_REQUIRED" });

  if (req.method === "GET") {
    try {
      const config = await getPricingConfig();
      return res.status(200).json({ config });
    } catch (err) {
      return res.status(500).json({ error: "CONFIG_READ_FAILED", message: err.message });
    }
  }

  if (req.method === "PUT") {
    const body = req.body || {};
    const updates = [];
    for (const [quality, price] of Object.entries(body)) {
      const p = Number(price);
      if (!Number.isFinite(p) || p < 0) continue;
      updates.push({ quality, price_ils: p });
    }
    if (updates.length === 0) return res.status(400).json({ error: "NO_VALID_UPDATES" });
    try {
      await updatePricingConfig(updates);
      const config = await getPricingConfig();
      return res.status(200).json({ config });
    } catch (err) {
      return res.status(500).json({ error: "CONFIG_UPDATE_FAILED", message: err.message });
    }
  }

  return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
}
