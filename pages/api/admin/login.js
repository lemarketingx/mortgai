import { isAdminPassword } from "../../../lib/leadsStore";
import { clearAdminSessionCookie, createAdminSessionCookie } from "../../../lib/adminAuth";

export default function handler(req, res) {
  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", clearAdminSessionCookie());
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const configuredPassword = String(process.env.ADMIN_PASSWORD || "").trim();
  if (!configuredPassword) {
    return res.status(500).json({ error: "ADMIN_PASSWORD_NOT_CONFIGURED" });
  }

  const password = String(req.body?.password || "").trim();
  if (!isAdminPassword(password)) {
    return res.status(401).json({ error: "INVALID_PASSWORD" });
  }

  res.setHeader("Set-Cookie", createAdminSessionCookie());
  return res.status(200).json({ ok: true });
}
