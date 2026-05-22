/**
 * Document upload token system.
 * Generates short-lived, hard-to-guess tokens that give a client access to
 * the document upload portal for exactly one case. Lead IDs are never exposed
 * in the URL — all resolution is server-side via this token.
 */
import { randomBytes, randomUUID } from "crypto";

const TOKENS_TABLE = "document_upload_tokens";
const TOKEN_EXPIRY_DAYS = 7;

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
function hasConfig() {
  return Boolean(getSupabaseUrl()) && Boolean(getSupabaseServiceKey());
}

/** 43-char URL-safe base64url token — cryptographically random. */
function generateToken() {
  return randomBytes(32).toString("base64url");
}

/**
 * Create a new upload token for a lead.
 * Soft-revokes any existing active token for the same lead first.
 * Returns the new token record, or null on failure.
 */
export async function createUploadToken(leadId, advisorId) {
  if (!hasConfig() || !leadId || !advisorId) return null;

  // Revoke all existing active tokens for this lead
  await fetch(
    endpoint(TOKENS_TABLE, `lead_id=eq.${encodeURIComponent(leadId)}&revoked_at=is.null`),
    { method: "PATCH", headers: baseHeaders(), body: JSON.stringify({ revoked_at: new Date().toISOString() }) }
  ).catch(() => {});

  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_DAYS * 86_400_000).toISOString();
  const record = {
    id: randomUUID(),
    token,
    lead_id: leadId,
    advisor_id: advisorId,
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
  };

  try {
    const res = await fetch(endpoint(TOKENS_TABLE), {
      method: "POST",
      headers: { ...baseHeaders(), Prefer: "return=representation" },
      body: JSON.stringify(record),
    });
    if (!res.ok) return null;
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : record;
  } catch {
    return null;
  }
}

/**
 * Get the active (non-expired, non-revoked) token for a lead.
 * Returns null if no valid token exists.
 */
export async function getActiveTokenForLead(leadId) {
  if (!hasConfig() || !leadId) return null;
  const now = new Date().toISOString();
  try {
    const res = await fetch(
      endpoint(TOKENS_TABLE, `lead_id=eq.${encodeURIComponent(leadId)}&revoked_at=is.null&expires_at=gt.${encodeURIComponent(now)}&order=created_at.desc&limit=1`),
      { method: "GET", headers: baseHeaders() }
    );
    if (!res.ok) return null;
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch {
    return null;
  }
}

/**
 * Validate a token string. Returns the DB record if valid, null otherwise.
 * Also updates last_used_at (fire-and-forget).
 */
export async function validateToken(tokenString) {
  if (!hasConfig() || !tokenString) return null;
  const now = new Date().toISOString();
  try {
    const res = await fetch(
      endpoint(TOKENS_TABLE, `token=eq.${encodeURIComponent(tokenString)}&revoked_at=is.null&expires_at=gt.${encodeURIComponent(now)}&limit=1`),
      { method: "GET", headers: baseHeaders() }
    );
    if (!res.ok) return null;
    const rows = await res.json().catch(() => []);
    const record = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (!record) return null;

    // Touch last_used_at (non-blocking)
    fetch(endpoint(TOKENS_TABLE, `id=eq.${encodeURIComponent(record.id)}`), {
      method: "PATCH",
      headers: baseHeaders(),
      body: JSON.stringify({ last_used_at: now }),
    }).catch(() => {});

    return record;
  } catch {
    return null;
  }
}

/** Soft-revoke a token by its DB id. */
export async function revokeToken(tokenId) {
  if (!hasConfig() || !tokenId) return false;
  try {
    const res = await fetch(
      endpoint(TOKENS_TABLE, `id=eq.${encodeURIComponent(tokenId)}`),
      { method: "PATCH", headers: baseHeaders(), body: JSON.stringify({ revoked_at: new Date().toISOString() }) }
    );
    return res.ok;
  } catch {
    return false;
  }
}
