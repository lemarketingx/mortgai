import { createAdvisorSessionCookie, clearAdvisorSessionCookie } from "../../../lib/advisorAuth";
import { readAdvisors } from "../../../lib/leadsStore";

export default async function handler(req, res) {
  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", clearAdvisorSessionCookie());
    return res.status(200).json({ ok: true });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });

  const advisorId = String(req.body?.advisorId || "").trim();
  const token = String(req.body?.token || "").trim();
  if (!advisorId || !token) return res.status(400).json({ error: "MISSING_CREDENTIALS" });

  const expected = String(process.env.ADVISOR_PORTAL_TOKEN || "").trim();
  if (!expected) return res.status(503).json({ error: "ADVISOR_TOKEN_NOT_CONFIGURED" });
  if (token !== expected) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

  const advisors = await readAdvisors();
  const advisor = advisors.find((item) => String(item.advisor_id) === advisorId && item.active !== false);
  if (!advisor) return res.status(404).json({ error: "ADVISOR_NOT_FOUND" });

  res.setHeader("Set-Cookie", createAdvisorSessionCookie(advisorId));
  return res.status(200).json({ ok: true, advisor: { advisorId, name: advisor.name } });
}
