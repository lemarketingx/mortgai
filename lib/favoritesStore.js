/**
 * Supabase data-access layer for advisor favorites (starred leads).
 *
 * Table:
 *   advisor_favorites — tracks which leads an advisor has favorited
 *
 * All calls use the service role key — never called from client JS.
 */

import { randomUUID } from "crypto";

const TABLE = "advisor_favorites";

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

// ─── advisor_favorites ───────────────────────────────────────────────────────

/**
 * Get all favorited lead IDs for an advisor.
 * @param {string} advisorId
 * @returns {Promise<string[]>} array of lead_id strings
 */
export async function getFavorites(advisorId) {
  if (!hasConfig() || !advisorId) return [];
  try {
    const query = `advisor_id=eq.${encodeURIComponent(advisorId)}&select=lead_id&order=created_at.desc`;
    const res = await fetch(endpoint(TABLE, query), {
      method: "GET", headers: baseHeaders(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[favoritesStore] advisor_favorites table not found — run setup SQL");
        return [];
      }
      return [];
    }
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data.map((row) => row.lead_id) : [];
  } catch {
    return [];
  }
}

/**
 * Add a lead to an advisor's favorites.
 * Handles unique constraint conflict gracefully (no-op on duplicate).
 * @param {string} advisorId
 * @param {string} leadId
 * @returns {Promise<boolean>} true if added or already existed
 */
export async function addFavorite(advisorId, leadId) {
  if (!hasConfig() || !advisorId || !leadId) return false;
  const record = {
    id:         randomUUID(),
    advisor_id: advisorId,
    lead_id:    leadId,
    created_at: new Date().toISOString(),
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
        console.warn("[favoritesStore] advisor_favorites table not found — run setup SQL");
        return false;
      }
      // 409 Conflict = already favorited — treat as success
      if (res.status === 409) return true;
      console.warn("[favoritesStore] addFavorite failed", res.status, text.slice(0, 200));
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[favoritesStore] addFavorite error", err?.message);
    return false;
  }
}

/**
 * Remove a lead from an advisor's favorites.
 * @param {string} advisorId
 * @param {string} leadId
 * @returns {Promise<boolean>}
 */
export async function removeFavorite(advisorId, leadId) {
  if (!hasConfig() || !advisorId || !leadId) return false;
  try {
    const res = await fetch(
      endpoint(TABLE,
        `advisor_id=eq.${encodeURIComponent(advisorId)}&lead_id=eq.${encodeURIComponent(leadId)}`),
      { method: "DELETE", headers: baseHeaders() }
    );
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Check whether a lead is in an advisor's favorites.
 * @param {string} advisorId
 * @param {string} leadId
 * @returns {Promise<boolean>}
 */
export async function isFavorite(advisorId, leadId) {
  if (!hasConfig() || !advisorId || !leadId) return false;
  try {
    const query = `advisor_id=eq.${encodeURIComponent(advisorId)}&lead_id=eq.${encodeURIComponent(leadId)}&select=id&limit=1`;
    const res = await fetch(endpoint(TABLE, query), {
      method: "GET", headers: baseHeaders(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[favoritesStore] advisor_favorites table not found — run setup SQL");
        return false;
      }
      return false;
    }
    const data = await res.json().catch(() => []);
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}
