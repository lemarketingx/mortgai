/**
 * Supabase data-access layer for advisor banker directory and case-banker associations.
 *
 * Tables:
 *   advisor_bankers  — per-advisor address book of bank contacts
 *   case_bankers     — which bankers are assigned to a specific lead/case
 *
 * All calls use the service role key — never called from client JS.
 */

import { randomUUID } from "crypto";

const ADVISOR_BANKERS_TABLE = "advisor_bankers";
const CASE_BANKERS_TABLE    = "case_bankers";

function getSupabaseUrl() {
  return String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
}
function getSupabaseServiceKey() {
  return String(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
}
function baseHeaders() {
  const key = getSupabaseServiceKey();
  return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
}
function endpoint(table, query = "") {
  const base = `${getSupabaseUrl()}/rest/v1/${table}`;
  return query ? `${base}?${query}` : base;
}
function isTableMissing(body = "") {
  return /relation .+ does not exist/i.test(String(body)) || /table .+ does not exist/i.test(String(body));
}
function hasConfig() {
  return Boolean(getSupabaseUrl()) && Boolean(getSupabaseServiceKey());
}

// ─── advisor_bankers ──────────────────────────────────────────────────────────

/**
 * Read all banker contacts for an advisor.
 * @param {string} advisorId
 * @param {{ includeInactive?: boolean }} opts
 */
export async function readAdvisorBankers(advisorId, { includeInactive = false } = {}) {
  if (!hasConfig() || !advisorId) return [];
  try {
    let query = `advisor_id=eq.${encodeURIComponent(advisorId)}&order=bank_name.asc,banker_name.asc`;
    if (!includeInactive) query += "&is_active=eq.true";
    const res = await fetch(endpoint(ADVISOR_BANKERS_TABLE, query), {
      method: "GET", headers: baseHeaders(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[bankerStore] advisor_bankers table not found — run setup SQL");
        return [];
      }
      return [];
    }
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Create a new banker contact for an advisor.
 */
export async function createAdvisorBanker(advisorId, fields = {}) {
  if (!hasConfig() || !advisorId) return null;
  const record = {
    id:           randomUUID(),
    advisor_id:   advisorId,
    bank_name:    String(fields.bank_name    || "").trim(),
    branch_name:  String(fields.branch_name  || "").trim(),
    region:       String(fields.region       || "").trim(),
    banker_name:  String(fields.banker_name  || "").trim(),
    phone:        String(fields.phone        || "").trim(),
    email:        String(fields.email        || "").trim(),
    role_title:   String(fields.role_title   || "").trim(),
    specialties:  String(fields.specialties  || "").trim(),
    notes:        String(fields.notes        || "").trim(),
    is_active:    fields.is_active !== false,
    created_at:   new Date().toISOString(),
    updated_at:   new Date().toISOString(),
  };
  try {
    const res = await fetch(endpoint(ADVISOR_BANKERS_TABLE), {
      method: "POST",
      headers: { ...baseHeaders(), Prefer: "return=representation" },
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[bankerStore] advisor_bankers table not found — run setup SQL");
        return null;
      }
      console.warn("[bankerStore] createAdvisorBanker failed", res.status, text.slice(0, 200));
      return null;
    }
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : record;
  } catch (err) {
    console.warn("[bankerStore] createAdvisorBanker error", err?.message);
    return null;
  }
}

/**
 * Update a banker contact. Only the owning advisor can update.
 */
export async function updateAdvisorBanker(bankerId, advisorId, fields = {}) {
  if (!hasConfig() || !bankerId || !advisorId) return null;
  const patch = { updated_at: new Date().toISOString() };
  const TEXT_FIELDS = ["bank_name","branch_name","region","banker_name","phone","email","role_title","specialties","notes"];
  for (const key of TEXT_FIELDS) {
    if (fields[key] !== undefined) patch[key] = String(fields[key]).trim();
  }
  if (fields.is_active !== undefined) patch.is_active = Boolean(fields.is_active);
  try {
    const res = await fetch(
      endpoint(ADVISOR_BANKERS_TABLE,
        `id=eq.${encodeURIComponent(bankerId)}&advisor_id=eq.${encodeURIComponent(advisorId)}`),
      {
        method: "PATCH",
        headers: { ...baseHeaders(), Prefer: "return=representation" },
        body: JSON.stringify(patch),
      }
    );
    if (!res.ok) return null;
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch {
    return null;
  }
}

/**
 * Hard-delete a banker contact. Only the owning advisor can delete.
 */
export async function deleteAdvisorBanker(bankerId, advisorId) {
  if (!hasConfig() || !bankerId || !advisorId) return false;
  try {
    const res = await fetch(
      endpoint(ADVISOR_BANKERS_TABLE,
        `id=eq.${encodeURIComponent(bankerId)}&advisor_id=eq.${encodeURIComponent(advisorId)}`),
      { method: "DELETE", headers: baseHeaders() }
    );
    return res.ok;
  } catch {
    return false;
  }
}

// ─── case_bankers ─────────────────────────────────────────────────────────────

/**
 * Aggregate per-banker case stats for an advisor: how many cases each banker
 * was assigned to, how many were actually sent, and how many were approved.
 * Powers the "כמה תיקים דרך הבנקאי הזה" view in the bankers directory.
 */
export async function readCaseBankerStatsForAdvisor(advisorId) {
  if (!hasConfig() || !advisorId) return {};
  try {
    const query = `advisor_id=eq.${encodeURIComponent(advisorId)}&select=banker_id,status`;
    const res = await fetch(endpoint(CASE_BANKERS_TABLE, query), {
      method: "GET", headers: baseHeaders(),
    });
    if (!res.ok) return {};
    const rows = await res.json().catch(() => []);
    const stats = {};
    for (const row of Array.isArray(rows) ? rows : []) {
      const id = row.banker_id;
      if (!id) continue;
      if (!stats[id]) stats[id] = { total: 0, sent: 0, approved: 0 };
      stats[id].total += 1;
      if (["sent", "waiting_for_response", "approved", "rejected"].includes(row.status)) stats[id].sent += 1;
      if (row.status === "approved") stats[id].approved += 1;
    }
    return stats;
  } catch {
    return {};
  }
}

/**
 * Read all bankers assigned to a case (lead).
 * Only the owning advisor's records are returned.
 */
export async function readCaseBankers(leadId, advisorId) {
  if (!hasConfig() || !leadId || !advisorId) return [];
  try {
    const query = `lead_id=eq.${encodeURIComponent(leadId)}&advisor_id=eq.${encodeURIComponent(advisorId)}&order=created_at.asc`;
    const res = await fetch(endpoint(CASE_BANKERS_TABLE, query), {
      method: "GET", headers: baseHeaders(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[bankerStore] case_bankers table not found — run setup SQL");
        return [];
      }
      return [];
    }
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Assign a banker from the advisor's directory to a case.
 * Stores snapshots of name/email/phone so history is stable even if the banker record later changes.
 * Returns null (not an error) if the banker is already assigned to this lead.
 */
export async function createCaseBanker(leadId, advisorId, banker = {}) {
  if (!hasConfig() || !leadId || !advisorId || !banker.id) return null;
  const record = {
    id:                   randomUUID(),
    lead_id:              leadId,
    advisor_id:           advisorId,
    banker_id:            banker.id,
    bank_name_snapshot:   String(banker.bank_name    || "").trim(),
    banker_name_snapshot: String(banker.banker_name  || "").trim(),
    email_snapshot:       String(banker.email        || "").trim(),
    phone_snapshot:       String(banker.phone        || "").trim(),
    status:               "selected",
    sent_at:              null,
    last_contacted_at:    null,
    notes:                "",
    created_at:           new Date().toISOString(),
    updated_at:           new Date().toISOString(),
  };
  try {
    const res = await fetch(endpoint(CASE_BANKERS_TABLE), {
      method: "POST",
      headers: { ...baseHeaders(), Prefer: "return=representation" },
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[bankerStore] case_bankers table not found — run setup SQL");
        return null;
      }
      // 409 Conflict = already exists — treat as soft success
      if (res.status === 409) return null;
      console.warn("[bankerStore] createCaseBanker failed", res.status, text.slice(0, 200));
      return null;
    }
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : record;
  } catch (err) {
    console.warn("[bankerStore] createCaseBanker error", err?.message);
    return null;
  }
}

/**
 * Update status/notes/timestamps on a case-banker association.
 */
export async function updateCaseBanker(caseBankerId, advisorId, fields = {}) {
  if (!hasConfig() || !caseBankerId || !advisorId) return null;
  const patch = { updated_at: new Date().toISOString() };
  if (fields.status           !== undefined) patch.status             = String(fields.status).trim();
  if (fields.notes            !== undefined) patch.notes              = String(fields.notes || "").trim();
  if (fields.sent_at          !== undefined) patch.sent_at            = fields.sent_at;
  if (fields.last_contacted_at !== undefined) patch.last_contacted_at = fields.last_contacted_at;
  try {
    const res = await fetch(
      endpoint(CASE_BANKERS_TABLE,
        `id=eq.${encodeURIComponent(caseBankerId)}&advisor_id=eq.${encodeURIComponent(advisorId)}`),
      {
        method: "PATCH",
        headers: { ...baseHeaders(), Prefer: "return=representation" },
        body: JSON.stringify(patch),
      }
    );
    if (!res.ok) return null;
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch {
    return null;
  }
}

/**
 * Remove a banker from a case.
 */
export async function deleteCaseBanker(caseBankerId, advisorId) {
  if (!hasConfig() || !caseBankerId || !advisorId) return false;
  try {
    const res = await fetch(
      endpoint(CASE_BANKERS_TABLE,
        `id=eq.${encodeURIComponent(caseBankerId)}&advisor_id=eq.${encodeURIComponent(advisorId)}`),
      { method: "DELETE", headers: baseHeaders() }
    );
    return res.ok;
  } catch {
    return false;
  }
}
