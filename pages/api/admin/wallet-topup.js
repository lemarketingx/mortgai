import { hasAdminSession } from "../../../lib/adminAuth";
import { topUpWallet } from "../../../lib/walletStore";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  if (!hasAdminSession(req)) return res.status(401).json({ error: "ADMIN_AUTH_REQUIRED" });

  const { advisorId, amount } = req.body || {};
  if (!advisorId) return res.status(400).json({ error: "advisorId required" });
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }

  try {
    const result = await topUpWallet(advisorId, amt);
    return res.status(200).json({ ok: true, newBalance: result.newBalance });
  } catch (err) {
    return res.status(500).json({ error: "TOPUP_FAILED", message: err.message });
  }
}
