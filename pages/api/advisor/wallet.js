import { getAdvisorSession } from "../../../lib/advisorAuth";
import { getAdvisorWallet } from "../../../lib/walletStore";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  const session = getAdvisorSession(req);
  if (!session) return res.status(401).json({ error: "ADVISOR_AUTH_REQUIRED" });

  try {
    const wallet = await getAdvisorWallet(session.advisorId);
    return res.status(200).json({ balance: wallet.balance });
  } catch (err) {
    return res.status(500).json({ error: "WALLET_READ_FAILED", message: err.message });
  }
}
