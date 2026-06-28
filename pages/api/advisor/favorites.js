import { getFavorites, addFavorite, removeFavorite } from "../../../lib/favoritesStore";
import { getAdvisorSession } from "../../../lib/advisorAuth";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  const advisorId = session.advisorId;

  if (req.method === "GET") {
    const favorites = await getFavorites(advisorId);
    return res.status(200).json({ favorites });
  }

  if (req.method === "POST") {
    const leadId = String(req.body?.leadId || "").trim();
    if (!leadId) return apiError(res, 400, "LEAD_ID_REQUIRED", "leadId is required");
    await addFavorite(advisorId, leadId);
    return res.status(201).json({ ok: true });
  }

  if (req.method === "DELETE") {
    const leadId = String(req.query.leadId || req.body?.leadId || "").trim();
    if (!leadId) return apiError(res, 400, "LEAD_ID_REQUIRED", "leadId is required");
    await removeFavorite(advisorId, leadId);
    return res.status(200).json({ ok: true });
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
}
