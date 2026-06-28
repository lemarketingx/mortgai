/**
 * Supabase data-access layer for advisor tasks.
 *
 * Table:
 *   advisor_tasks — per-advisor task list (replaces in-memory task engine)
 *
 * All calls use the service role key — never called from client JS.
 */

import { randomUUID } from "crypto";

const TABLE = "advisor_tasks";

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

/**
 * Map a DB row (snake_case) to a JS object (camelCase).
 */
function rowToTask(row) {
  return {
    id:          row.id,
    advisorId:   row.advisor_id,
    leadId:      row.lead_id,
    title:       row.title,
    description: row.description,
    status:      row.status,
    priority:    row.priority,
    type:        row.type,
    dueDate:     row.due_date,
    completedAt: row.completed_at,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
    // convenience boolean matching the old in-memory API
    completed:   row.status === "completed",
  };
}

// ─── createTask ──────────────────────────────────────────────────────────────

/**
 * Create a new task for an advisor.
 */
export async function createTask({ leadId, advisorId, title, description = "", dueDate, priority = "medium", type = "general" }) {
  if (!hasConfig() || !advisorId) return null;
  const now = new Date().toISOString();
  const record = {
    id:           randomUUID(),
    advisor_id:   advisorId,
    lead_id:      leadId || null,
    title:        String(title || "").trim(),
    description:  String(description || "").trim(),
    status:       "pending",
    priority:     priority || "medium",
    type:         type || "general",
    due_date:     dueDate || null,
    completed_at: null,
    created_at:   now,
    updated_at:   now,
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
        console.warn("[tasksStore] advisor_tasks table not found — run setup SQL");
        return null;
      }
      console.warn("[tasksStore] createTask failed", res.status, text.slice(0, 200));
      return null;
    }
    const rows = await res.json().catch(() => []);
    const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : record;
    return rowToTask(row);
  } catch (err) {
    console.warn("[tasksStore] createTask error", err?.message);
    return null;
  }
}

// ─── getTasksForAdvisor ──────────────────────────────────────────────────────

/**
 * Read tasks for an advisor with optional filters.
 * @param {string} advisorId
 * @param {{ leadId?: string, completed?: boolean, overdue?: boolean, priority?: string }} filters
 */
export async function getTasksForAdvisor(advisorId, filters = {}) {
  if (!hasConfig() || !advisorId) return [];
  try {
    const parts = [`advisor_id=eq.${encodeURIComponent(advisorId)}`];

    if (filters.leadId) {
      parts.push(`lead_id=eq.${encodeURIComponent(filters.leadId)}`);
    }
    if (filters.completed !== undefined) {
      parts.push(`status=eq.${filters.completed ? "completed" : "pending"}`);
    }
    if (filters.overdue) {
      parts.push("status=eq.pending");
      parts.push(`due_date=lt.${new Date().toISOString()}`);
    }
    if (filters.priority) {
      parts.push(`priority=eq.${encodeURIComponent(filters.priority)}`);
    }

    // Sort: pending first (status asc puts "completed" before "pending" alphabetically,
    // so use desc to put "pending" first), then priority high→medium→low via custom order
    // Supabase doesn't support custom sort, so we sort in JS after fetch.
    parts.push("order=created_at.asc");

    const res = await fetch(endpoint(TABLE, parts.join("&")), {
      method: "GET", headers: baseHeaders(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[tasksStore] advisor_tasks table not found — run setup SQL");
        return [];
      }
      return [];
    }
    const data = await res.json().catch(() => []);
    const tasks = (Array.isArray(data) ? data : []).map(rowToTask);

    // Sort: pending first, then by priority (high→medium→low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return tasks.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
    });
  } catch {
    return [];
  }
}

// ─── completeTask ────────────────────────────────────────────────────────────

/**
 * Mark a task as completed. Verifies advisor_id ownership.
 */
export async function completeTask(advisorId, taskId) {
  if (!hasConfig() || !advisorId || !taskId) return null;
  const now = new Date().toISOString();
  try {
    const res = await fetch(
      endpoint(TABLE,
        `id=eq.${encodeURIComponent(taskId)}&advisor_id=eq.${encodeURIComponent(advisorId)}`),
      {
        method: "PATCH",
        headers: { ...baseHeaders(), Prefer: "return=representation" },
        body: JSON.stringify({ status: "completed", completed_at: now, updated_at: now }),
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[tasksStore] advisor_tasks table not found — run setup SQL");
        return null;
      }
      return null;
    }
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0 ? rowToTask(rows[0]) : null;
  } catch {
    return null;
  }
}

// ─── updateTask ──────────────────────────────────────────────────────────────

/**
 * Update allowed fields on a task. Verifies advisor_id ownership.
 */
export async function updateTask(advisorId, taskId, updates = {}) {
  if (!hasConfig() || !advisorId || !taskId) return null;
  const patch = { updated_at: new Date().toISOString() };

  // Map camelCase input keys to snake_case DB columns
  const ALLOWED = {
    title:       "title",
    description: "description",
    dueDate:     "due_date",
    due_date:    "due_date",
    priority:    "priority",
    type:        "type",
    status:      "status",
  };
  for (const [jsKey, dbCol] of Object.entries(ALLOWED)) {
    if (updates[jsKey] !== undefined) {
      patch[dbCol] = updates[jsKey];
    }
  }

  try {
    const res = await fetch(
      endpoint(TABLE,
        `id=eq.${encodeURIComponent(taskId)}&advisor_id=eq.${encodeURIComponent(advisorId)}`),
      {
        method: "PATCH",
        headers: { ...baseHeaders(), Prefer: "return=representation" },
        body: JSON.stringify(patch),
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[tasksStore] advisor_tasks table not found — run setup SQL");
        return null;
      }
      return null;
    }
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0 ? rowToTask(rows[0]) : null;
  } catch {
    return null;
  }
}

// ─── deleteTask ──────────────────────────────────────────────────────────────

/**
 * Hard-delete a task. Verifies advisor_id ownership.
 */
export async function deleteTask(advisorId, taskId) {
  if (!hasConfig() || !advisorId || !taskId) return false;
  try {
    const res = await fetch(
      endpoint(TABLE,
        `id=eq.${encodeURIComponent(taskId)}&advisor_id=eq.${encodeURIComponent(advisorId)}`),
      { method: "DELETE", headers: baseHeaders() }
    );
    return res.ok;
  } catch {
    return false;
  }
}

// ─── getOverdueTasks ─────────────────────────────────────────────────────────

/**
 * Tasks where status='pending' AND due_date < now.
 */
export async function getOverdueTasks(advisorId) {
  if (!hasConfig() || !advisorId) return [];
  try {
    const now = new Date().toISOString();
    const query = [
      `advisor_id=eq.${encodeURIComponent(advisorId)}`,
      "status=eq.pending",
      `due_date=lt.${now}`,
      "order=due_date.asc",
    ].join("&");

    const res = await fetch(endpoint(TABLE, query), {
      method: "GET", headers: baseHeaders(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[tasksStore] advisor_tasks table not found — run setup SQL");
        return [];
      }
      return [];
    }
    const data = await res.json().catch(() => []);
    return (Array.isArray(data) ? data : []).map(rowToTask);
  } catch {
    return [];
  }
}

// ─── getTasksDueToday ────────────────────────────────────────────────────────

/**
 * Tasks where status='pending' AND due_date is within today (UTC).
 */
export async function getTasksDueToday(advisorId) {
  if (!hasConfig() || !advisorId) return [];
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    const query = [
      `advisor_id=eq.${encodeURIComponent(advisorId)}`,
      "status=eq.pending",
      `due_date=gte.${startOfDay}`,
      `due_date=lt.${endOfDay}`,
      "order=due_date.asc",
    ].join("&");

    const res = await fetch(endpoint(TABLE, query), {
      method: "GET", headers: baseHeaders(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[tasksStore] advisor_tasks table not found — run setup SQL");
        return [];
      }
      return [];
    }
    const data = await res.json().catch(() => []);
    return (Array.isArray(data) ? data : []).map(rowToTask);
  } catch {
    return [];
  }
}
