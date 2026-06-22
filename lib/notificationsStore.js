import { LeadStoreError } from "./leadsStore";

const TABLE = "advisor_notifications";

function getSupabaseUrl() {
  return String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
}

function getSupabaseServiceKey() {
  return String(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
}

function assertConfig() {
  if (!getSupabaseUrl() || !getSupabaseServiceKey()) {
    throw new LeadStoreError("SUPABASE_ENV_MISSING", "Missing Supabase config");
  }
}

function headers() {
  const key = getSupabaseServiceKey();
  return {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

function endpoint(query = "") {
  const base = `${getSupabaseUrl()}/rest/v1/${TABLE}`;
  return query ? `${base}?${query}` : base;
}

function fromRow(row) {
  return {
    id: row.id,
    advisorId: row.advisor_id,
    type: row.type,
    title: row.title,
    message: row.message || "",
    entityType: row.entity_type || null,
    entityId: row.entity_id || null,
    priority: row.priority || "normal",
    isRead: row.is_read || false,
    readAt: row.read_at || null,
    createdAt: row.created_at,
  };
}

export async function listNotifications(advisorId, limit = 50) {
  assertConfig();
  const query = `advisor_id=eq.${encodeURIComponent(advisorId)}&order=created_at.desc&limit=${limit}`;
  const res = await fetch(endpoint(query), { method: "GET", headers: headers() });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 400 && body.includes("does not exist")) return [];
    throw new LeadStoreError("SUPABASE_READ_FAILED", `listNotifications ${res.status}`, body);
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows.map(fromRow) : [];
}

export function timeBucket(intervalHours = 6) {
  const now = new Date();
  const bucket = Math.floor(now.getTime() / (intervalHours * 3600 * 1000));
  return `${now.toISOString().slice(0, 10)}_${bucket}`;
}

export async function createNotification(data) {
  assertConfig();
  const row = {
    advisor_id: data.advisorId,
    type: data.type,
    title: data.title,
    message: data.message || "",
    entity_type: data.entityType || null,
    entity_id: data.entityId || null,
    priority: data.priority || "normal",
  };
  if (data.dedupeKey) {
    row.dedupe_key = data.dedupeKey;
  }

  const prefer = data.dedupeKey
    ? "return=representation,resolution=ignore-duplicates"
    : "return=representation";

  const res = await fetch(endpoint(), {
    method: "POST",
    headers: { ...headers(), Prefer: prefer },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 409) return null;
    throw new LeadStoreError("SUPABASE_CREATE_FAILED", `createNotification ${res.status}`, body);
  }
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0 ? fromRow(rows[0]) : null;
}

export async function markNotificationRead(advisorId, notificationId) {
  assertConfig();
  const query = `id=eq.${encodeURIComponent(notificationId)}&advisor_id=eq.${encodeURIComponent(advisorId)}`;
  const res = await fetch(endpoint(query), {
    method: "PATCH",
    headers: { ...headers(), Prefer: "return=representation" },
    body: JSON.stringify({ is_read: true, read_at: new Date().toISOString() }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new LeadStoreError("SUPABASE_UPDATE_FAILED", `markNotificationRead ${res.status}`, body);
  }
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0 ? fromRow(rows[0]) : null;
}

export async function markAllNotificationsRead(advisorId) {
  assertConfig();
  const query = `advisor_id=eq.${encodeURIComponent(advisorId)}&is_read=eq.false`;
  const res = await fetch(endpoint(query), {
    method: "PATCH",
    headers: { ...headers(), Prefer: "return=representation" },
    body: JSON.stringify({ is_read: true, read_at: new Date().toISOString() }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new LeadStoreError("SUPABASE_UPDATE_FAILED", `markAllNotificationsRead ${res.status}`, body);
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows.map(fromRow) : [];
}

export async function unreadCount(advisorId) {
  assertConfig();
  const query = `advisor_id=eq.${encodeURIComponent(advisorId)}&is_read=eq.false&select=id`;
  const res = await fetch(endpoint(query), {
    method: "HEAD",
    headers: { ...headers(), Prefer: "count=exact" },
  });
  if (!res.ok) {
    if (res.status === 400) return 0;
    throw new LeadStoreError("SUPABASE_READ_FAILED", `unreadCount ${res.status}`);
  }
  const range = res.headers.get("content-range") || "";
  const match = range.match(/\/(\d+)/);
  return match ? Number(match[1]) : 0;
}
