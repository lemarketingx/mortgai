/**
 * Supabase data-access layer for advisor notifications.
 *
 * Table:
 *   advisor_notifications — per-advisor notification feed
 *
 * All calls use the service role key — never called from client JS.
 */

import { randomUUID } from "crypto";

const TABLE = "advisor_notifications";

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

// ─── advisor_notifications ───────────────────────────────────────────────────

/**
 * Create a new notification for an advisor.
 */
export async function createNotification({ advisorId, type, title, body, leadId, metadata } = {}) {
  if (!hasConfig() || !advisorId) return null;
  const record = {
    id:         randomUUID(),
    advisor_id: advisorId,
    type:       type || null,
    title:      title || "",
    body:       body || "",
    lead_id:    leadId || null,
    metadata:   metadata || null,
    is_read:    false,
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
        console.warn("[notificationsStore] advisor_notifications table not found — run setup SQL");
        return null;
      }
      console.warn("[notificationsStore] createNotification failed", res.status, text.slice(0, 200));
      return null;
    }
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : record;
  } catch (err) {
    console.warn("[notificationsStore] createNotification error", err?.message);
    return null;
  }
}

/**
 * Get notifications for an advisor, newest first.
 * @param {string} advisorId
 * @param {{ limit?: number, unreadOnly?: boolean }} opts
 */
export async function getNotifications(advisorId, { limit = 20, unreadOnly = false } = {}) {
  if (!hasConfig() || !advisorId) return [];
  try {
    let query = `advisor_id=eq.${encodeURIComponent(advisorId)}&order=created_at.desc&limit=${limit}`;
    if (unreadOnly) query += "&is_read=eq.false";
    const res = await fetch(endpoint(TABLE, query), {
      method: "GET", headers: baseHeaders(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[notificationsStore] advisor_notifications table not found — run setup SQL");
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
 * Get count of unread notifications for an advisor.
 * Uses Prefer: count=exact header and reads count from content-range.
 */
export async function getUnreadCount(advisorId) {
  if (!hasConfig() || !advisorId) return 0;
  try {
    const query = `advisor_id=eq.${encodeURIComponent(advisorId)}&is_read=eq.false&select=id`;
    const res = await fetch(endpoint(TABLE, query), {
      method: "HEAD",
      headers: { ...baseHeaders(), Prefer: "count=exact" },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[notificationsStore] advisor_notifications table not found — run setup SQL");
        return 0;
      }
      return 0;
    }
    const range = res.headers.get("content-range") || "";
    // content-range format: "0-N/total" or "*/total"
    const match = range.match(/\/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(advisorId, notificationId) {
  if (!hasConfig() || !advisorId || !notificationId) return null;
  try {
    const query = `id=eq.${encodeURIComponent(notificationId)}&advisor_id=eq.${encodeURIComponent(advisorId)}`;
    const res = await fetch(endpoint(TABLE, query), {
      method: "PATCH",
      headers: { ...baseHeaders(), Prefer: "return=representation" },
      body: JSON.stringify({ is_read: true }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[notificationsStore] advisor_notifications table not found — run setup SQL");
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
 * Mark all unread notifications as read for an advisor.
 */
export async function markAllAsRead(advisorId) {
  if (!hasConfig() || !advisorId) return false;
  try {
    const query = `advisor_id=eq.${encodeURIComponent(advisorId)}&is_read=eq.false`;
    const res = await fetch(endpoint(TABLE, query), {
      method: "PATCH",
      headers: { ...baseHeaders(), Prefer: "return=representation" },
      body: JSON.stringify({ is_read: true }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[notificationsStore] advisor_notifications table not found — run setup SQL");
        return false;
      }
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a notification. Only the owning advisor can delete.
 */
export async function deleteNotification(advisorId, notificationId) {
  if (!hasConfig() || !advisorId || !notificationId) return false;
  try {
    const query = `id=eq.${encodeURIComponent(notificationId)}&advisor_id=eq.${encodeURIComponent(advisorId)}`;
    const res = await fetch(endpoint(TABLE, query), {
      method: "DELETE", headers: baseHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}
