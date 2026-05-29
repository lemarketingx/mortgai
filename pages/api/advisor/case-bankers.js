/**
 * /api/advisor/case-bankers
 *
 * Manages which banker contacts are assigned to a specific mortgage case (lead).
 *
 * GET    ?leadId=xxx      — list bankers assigned to this case
 * POST                    — assign a banker from directory to the case
 * PATCH                   — update case-banker status/notes (e.g. mark sent)
 * DELETE                  — remove a banker from the case
 *
 * Security:
 *   - session.advisorId is used for every scoped query
 *   - lead ownership is verified before any write
 */

import { getAdvisorSession } from "../../../lib/advisorAuth";
import { readMyLeads } from "../../../lib/leadsStore";
import { readAdvisorBankers, createCaseBanker, readCaseBankers, updateCaseBanker, deleteCaseBanker } from "../../../lib/bankerStore";
import { createActivity } from "../../../lib/activitiesStore";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

async function verifyLeadOwnership(res, advisorId, leadId) {
  try {
    const leads = await readMyLeads(advisorId);
    const lead = leads.find((l) => l.id === leadId);
    if (lead) return lead;
    apiError(res, 404, "LEAD_NOT_FOUND", "Lead not found in your purchased leads");
    return null;
  } catch {
    apiError(res, 502, "LEAD_ACCESS_FAILED", "Unable to verify lead ownership");
    return null;
  }
}

export default async function handler(req, res) {
  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  const { advisorId } = session;

  // ── GET ───────────────────────────────────────────────────────────────────
  if (req.method === "GET") {
    const leadId = String(req.query.leadId || "").trim();
    if (!leadId) return apiError(res, 400, "LEAD_ID_REQUIRED", "leadId is required");
    // Verify ownership
    const lead = await verifyLeadOwnership(res, advisorId, leadId);
    if (!lead) return;
    const caseBankers = await readCaseBankers(leadId, advisorId);
    return res.status(200).json({ caseBankers });
  }

  // ── POST — assign banker to case ──────────────────────────────────────────
  if (req.method === "POST") {
    const body = req.body || {};
    const leadId   = String(body.leadId   || "").trim();
    const bankerId = String(body.bankerId || "").trim();
    if (!leadId)   return apiError(res, 400, "LEAD_ID_REQUIRED",   "leadId is required");
    if (!bankerId) return apiError(res, 400, "BANKER_ID_REQUIRED", "bankerId is required");

    // Verify lead ownership
    const lead = await verifyLeadOwnership(res, advisorId, leadId);
    if (!lead) return;

    // Verify banker belongs to this advisor
    const allBankers = await readAdvisorBankers(advisorId, { includeInactive: true });
    const banker = allBankers.find((b) => b.id === bankerId);
    if (!banker) return apiError(res, 404, "BANKER_NOT_FOUND", "Banker not found in your directory");

    // Check not already assigned
    const existing = await readCaseBankers(leadId, advisorId);
    if (existing.some((cb) => cb.banker_id === bankerId)) {
      return res.status(200).json({ caseBanker: existing.find((cb) => cb.banker_id === bankerId), alreadyExists: true });
    }

    const caseBanker = await createCaseBanker(leadId, advisorId, banker);
    if (!caseBanker) return apiError(res, 500, "CREATE_FAILED", "Failed to assign banker to case");

    await createActivity({
      leadId,
      advisorId,
      activityType: "note_added",
      title: `בנקאי נוסף לתיק: ${banker.banker_name} (${banker.bank_name})`,
      metadata: { banker_id: bankerId, case_banker_id: caseBanker.id },
    });

    return res.status(201).json({ caseBanker });
  }

  // ── PATCH — update status/notes on case-banker ────────────────────────────
  if (req.method === "PATCH") {
    const body = req.body || {};
    const caseBankerId = String(body.id     || "").trim();
    const leadId       = String(body.leadId || "").trim();
    if (!caseBankerId) return apiError(res, 400, "MISSING_ID",       "id is required");
    if (!leadId)       return apiError(res, 400, "LEAD_ID_REQUIRED", "leadId is required");

    const lead = await verifyLeadOwnership(res, advisorId, leadId);
    if (!lead) return;

    const updated = await updateCaseBanker(caseBankerId, advisorId, body);
    if (!updated) return apiError(res, 404, "NOT_FOUND_OR_FAILED", "Case-banker not found or update failed");

    // Log "sent" activity
    if (body.status === "sent") {
      await createActivity({
        leadId,
        advisorId,
        activityType: "note_added",
        title: `תיק נשלח לבנקאי: ${updated.banker_name_snapshot || ""} (${updated.bank_name_snapshot || ""})`,
        metadata: { case_banker_id: caseBankerId },
      });
    }

    return res.status(200).json({ caseBanker: updated });
  }

  // ── DELETE — remove banker from case ─────────────────────────────────────
  if (req.method === "DELETE") {
    const body = req.body || {};
    const caseBankerId = String(body.id     || req.query.id     || "").trim();
    const leadId       = String(body.leadId || req.query.leadId || "").trim();
    if (!caseBankerId) return apiError(res, 400, "MISSING_ID",       "id is required");
    if (!leadId)       return apiError(res, 400, "LEAD_ID_REQUIRED", "leadId is required");

    const lead = await verifyLeadOwnership(res, advisorId, leadId);
    if (!lead) return;

    const ok = await deleteCaseBanker(caseBankerId, advisorId);
    if (!ok) return apiError(res, 404, "NOT_FOUND_OR_FAILED", "Case-banker not found or delete failed");

    return res.status(200).json({ ok: true });
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
}
