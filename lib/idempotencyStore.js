/**
 * Supabase data-access layer for idempotency keys.
 *
 * Table:
 *   idempotency_keys — prevents duplicate processing of identical requests
 *
 * All calls use the service role key — never called from client JS.
 */

const TABLE = "idempotency_keys";

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

// ─── idempotency_keys ────────────────────────────────────────────────────────

/**
 * Check for an existing non-expired idempotency key.
 * @param {string} key
 * @returns {Promise<object|null>} the row or null if not found / expired
 */
export async function checkIdempotencyKey(key) {
  if (!hasConfig() || !key) return null;
  try {
    const query = `key=eq.${encodeURIComponent(key)}&expires_at=gt.${new Date().toISOString()}&limit=1`;
    const res = await fetch(endpoint(TABLE, query), {
      method: "GET", headers: baseHeaders(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[idempotencyStore] idempotency_keys table not found — run setup SQL");
        return null;
      }
      return null;
    }
    const data = await res.json().catch(() => []);
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

/**
 * Create a new idempotency key with status 'processing'.
 * If the key already exists (conflict), returns the existing row.
 * @param {{ key: string, advisorId: string, endpoint: string, requestHash: string }} params
 * @returns {Promise<object|null>}
 */
export async function createIdempotencyKey({ key, advisorId, endpoint: ep, requestHash }) {
  if (!hasConfig() || !key) return null;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const record = {
    key,
    advisor_id:    advisorId || null,
    endpoint:      ep || null,
    request_hash:  requestHash || null,
    response_json: null,
    status:        "processing",
    created_at:    now.toISOString(),
    expires_at:    expiresAt.toISOString(),
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
        console.warn("[idempotencyStore] idempotency_keys table not found — run setup SQL");
        return null;
      }
      // 409 Conflict = key already exists — fetch and return existing row
      if (res.status === 409) {
        return await checkIdempotencyKey(key);
      }
      console.warn("[idempotencyStore] createIdempotencyKey failed", res.status, text.slice(0, 200));
      return null;
    }
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : record;
  } catch (err) {
    console.warn("[idempotencyStore] createIdempotencyKey error", err?.message);
    return null;
  }
}

/**
 * Mark an idempotency key as completed with the given response.
 * @param {string} key
 * @param {object} responseJson
 * @returns {Promise<object|null>}
 */
export async function completeIdempotencyKey(key, responseJson) {
  if (!hasConfig() || !key) return null;
  try {
    const res = await fetch(
      endpoint(TABLE, `key=eq.${encodeURIComponent(key)}`),
      {
        method: "PATCH",
        headers: { ...baseHeaders(), Prefer: "return=representation" },
        body: JSON.stringify({ status: "completed", response_json: responseJson }),
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
 * Mark an idempotency key as failed.
 * @param {string} key
 * @returns {Promise<object|null>}
 */
export async function failIdempotencyKey(key) {
  if (!hasConfig() || !key) return null;
  try {
    const res = await fetch(
      endpoint(TABLE, `key=eq.${encodeURIComponent(key)}`),
      {
        method: "PATCH",
        headers: { ...baseHeaders(), Prefer: "return=representation" },
        body: JSON.stringify({ status: "failed" }),
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
 * Delete all expired idempotency keys.
 * @returns {Promise<boolean>}
 */
export async function cleanExpiredKeys() {
  if (!hasConfig()) return false;
  try {
    const res = await fetch(
      endpoint(TABLE, `expires_at=lt.${new Date().toISOString()}`),
      { method: "DELETE", headers: baseHeaders() }
    );
    return res.ok;
  } catch {
    return false;
  }
}
