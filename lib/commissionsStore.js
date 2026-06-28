/**
 * Supabase data-access layer for advisor commissions.
 *
 * Table:
 *   advisor_commissions — per-advisor commission tracking
 *
 * All calls use the service role key — never called from client JS.
 */

import { randomUUID } from "crypto";

const TABLE = "advisor_commissions";

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

// ─── advisor_commissions ─────────────────────────────────────────────────────

/**
 * Create a new commission record for an advisor.
 */
export async function createCommission({
  advisorId, leadId, bank, loanAmount, commissionPercent, commissionAmount, notes,
} = {}) {
  if (!hasConfig() || !advisorId) return null;
  const now = new Date().toISOString();
  const record = {
    id:                  randomUUID(),
    advisor_id:          advisorId,
    lead_id:             leadId || null,
    bank:                bank || "",
    loan_amount:         loanAmount || 0,
    commission_percent:  commissionPercent || 0,
    commission_amount:   commissionAmount || 0,
    status:              "pending",
    paid_at:             null,
    notes:               notes || "",
    created_at:          now,
    updated_at:          now,
  };
  try {
    const res = await fetch(endpoint(TABLE), {
      method: "POST",
      headers: { ...baseHeaders(), Prefer: "return=representation" },
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[commissionsStore] advisor_commissions table not found — run setup SQL");
        return null;
      }
      console.warn("[commissionsStore] createCommission failed", res.status, text.slice(0, 200));
      return null;
    }
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : record;
  } catch (err) {
    console.warn("[commissionsStore] createCommission error", err?.message);
    return null;
  }
}

/**
 * Get commissions for an advisor with optional filters.
 * @param {string} advisorId
 * @param {{ status?: string, leadId?: string }} opts
 */
export async function getCommissions(advisorId, { status, leadId } = {}) {
  if (!hasConfig() || !advisorId) return [];
  try {
    let query = `advisor_id=eq.${encodeURIComponent(advisorId)}&order=created_at.desc`;
    if (status) query += `&status=eq.${encodeURIComponent(status)}`;
    if (leadId) query += `&lead_id=eq.${encodeURIComponent(leadId)}`;
    const res = await fetch(endpoint(TABLE, query), {
      method: "GET", headers: baseHeaders(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[commissionsStore] advisor_commissions table not found — run setup SQL");
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
 * Update a commission record. Only allowed fields are patched.
 */
export async function updateCommission(advisorId, commissionId, updates = {}) {
  if (!hasConfig() || !advisorId || !commissionId) return null;
  const patch = { updated_at: new Date().toISOString() };
  if (updates.status           !== undefined) patch.status            = updates.status;
  if (updates.paidAt           !== undefined) patch.paid_at           = updates.paidAt;
  if (updates.commissionAmount !== undefined) patch.commission_amount = updates.commissionAmount;
  if (updates.notes            !== undefined) patch.notes             = updates.notes;
  try {
    const query = `id=eq.${encodeURIComponent(commissionId)}&advisor_id=eq.${encodeURIComponent(advisorId)}`;
    const res = await fetch(endpoint(TABLE, query), {
      method: "PATCH",
      headers: { ...baseHeaders(), Prefer: "return=representation" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[commissionsStore] advisor_commissions table not found — run setup SQL");
        return null;
      }
      return null;
    }
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch {
    return null;
  }
}

/**
 * Compute commission stats for an advisor.
 * Fetches all records and computes in JS:
 *   totalRevenue, pendingRevenue, monthlyRevenue, count
 */
export async function getCommissionStats(advisorId) {
  const empty = { totalRevenue: 0, pendingRevenue: 0, monthlyRevenue: 0, count: 0 };
  if (!hasConfig() || !advisorId) return empty;
  try {
    const query = `advisor_id=eq.${encodeURIComponent(advisorId)}`;
    const res = await fetch(endpoint(TABLE, query), {
      method: "GET", headers: baseHeaders(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[commissionsStore] advisor_commissions table not found — run setup SQL");
        return empty;
      }
      return empty;
    }
    const data = await res.json().catch(() => []);
    const rows = Array.isArray(data) ? data : [];

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    let totalRevenue = 0;
    let pendingRevenue = 0;
    let monthlyRevenue = 0;

    for (const row of rows) {
      const amount = Number(row.commission_amount) || 0;
      if (row.status === "paid") {
        totalRevenue += amount;
        if (row.paid_at && row.paid_at >= monthStart) {
          monthlyRevenue += amount;
        }
      } else if (row.status === "pending") {
        pendingRevenue += amount;
      }
    }

    return { totalRevenue, pendingRevenue, monthlyRevenue, count: rows.length };
  } catch {
    return empty;
  }
}

/**
 * Delete a commission record. Only the owning advisor can delete.
 */
export async function deleteCommission(advisorId, commissionId) {
  if (!hasConfig() || !advisorId || !commissionId) return false;
  try {
    const query = `id=eq.${encodeURIComponent(commissionId)}&advisor_id=eq.${encodeURIComponent(advisorId)}`;
    const res = await fetch(endpoint(TABLE, query), {
      method: "DELETE", headers: baseHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}
