/**
 * /api/advisor/bankers
 *
 * Advisor banker directory CRUD.
 * GET    — list all (active by default; ?includeInactive=1 for all)
 * POST   — create a new banker contact
 * PATCH  — update a banker contact (body must include id)
 * DELETE — hard-delete a banker contact (body must include id)
 *
 * Security: every operation is scoped to session.advisorId.
 * One advisor cannot read or modify another advisor's bankers.
 */

import { getAdvisorSession } from "../../../lib/advisorAuth";
import {
  createAdvisorBanker,
  deleteAdvisorBanker,
  readAdvisorBankers,
  readCaseBankerStatsForAdvisor,
  updateAdvisorBanker,
} from "../../../lib/bankerStore";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  const { advisorId } = session;

  // ── GET ───────────────────────────────────────────────────────────────────
  if (req.method === "GET") {
    const includeInactive = req.query.includeInactive === "1" || req.query.includeInactive === "true";
    const [bankers, caseStats] = await Promise.all([
      readAdvisorBankers(advisorId, { includeInactive }),
      readCaseBankerStatsForAdvisor(advisorId),
    ]);
    return res.status(200).json({ bankers, caseStats });
  }

  // ── POST ──────────────────────────────────────────────────────────────────
  if (req.method === "POST") {
    const body = req.body || {};
    if (!String(body.banker_name || "").trim()) {
      return apiError(res, 400, "MISSING_BANKER_NAME", "banker_name is required");
    }
    if (!String(body.bank_name || "").trim()) {
      return apiError(res, 400, "MISSING_BANK_NAME", "bank_name is required");
    }
    const created = await createAdvisorBanker(advisorId, body);
    if (!created) {
      return apiError(res, 500, "CREATE_FAILED", "Failed to create banker contact");
    }
    return res.status(201).json({ banker: created });
  }

  // ── PATCH ─────────────────────────────────────────────────────────────────
  if (req.method === "PATCH") {
    const body = req.body || {};
    const bankerId = String(body.id || "").trim();
    if (!bankerId) return apiError(res, 400, "MISSING_ID", "id is required");
    const updated = await updateAdvisorBanker(bankerId, advisorId, body);
    if (!updated) {
      return apiError(res, 404, "NOT_FOUND_OR_FAILED", "Banker not found or update failed");
    }
    return res.status(200).json({ banker: updated });
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  if (req.method === "DELETE") {
    const body = req.body || {};
    const bankerId = String(body.id || req.query.id || "").trim();
    if (!bankerId) return apiError(res, 400, "MISSING_ID", "id is required");
    const ok = await deleteAdvisorBanker(bankerId, advisorId);
    if (!ok) return apiError(res, 404, "NOT_FOUND_OR_FAILED", "Banker not found or delete failed");
    return res.status(200).json({ ok: true });
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
}
