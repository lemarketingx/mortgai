/**
 * Workflow rule evaluation engine for lead automation.
 *
 * Table:
 *   workflow_automation_logs — execution log for triggered workflow actions
 *
 * evaluateWorkflowRules is a pure function (no DB calls).
 * Only logWorkflowExecution and getWorkflowLogs use Supabase.
 *
 * This engine does NOT run automatically — it is called from API routes.
 * All calls use the service role key — never called from client JS.
 */

import { randomUUID } from "crypto";

const TABLE = "workflow_automation_logs";

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

// ─── Rule evaluation (pure) ──────────────────────────────────────────────────

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Evaluate all workflow rules against a lead.
 * Returns an array of {ruleType, action, description} objects for each triggered rule.
 * This is a pure function — no DB calls.
 * @param {object} lead
 * @param {string} advisorId — reserved for future per-advisor rule customisation
 * @returns {Array<{ruleType: string, action: string, description: string}>}
 */
export function evaluateWorkflowRules(lead, advisorId) {
  if (!lead) return [];
  const results = [];
  const now = Date.now();

  // Rule 1: waiting_documents → send WhatsApp template
  if (lead.pipelineStage === "waiting_documents") {
    results.push({
      ruleType: "stage_change",
      action: "send_whatsapp_template",
      description: "שלח תבנית WhatsApp לאיסוף מסמכים",
    });
  }

  // Rule 2: overdue task
  if (lead.nextActionAt) {
    const nextAction = new Date(lead.nextActionAt).getTime();
    if (nextAction < now) {
      results.push({
        ruleType: "task_overdue",
        action: "create_notification",
        description: "משימה באיחור — יצירת התראה",
      });
    }
  }

  // Rule 3: no contact for 7 days
  const lastActivity = lead.lastActivityAt ? new Date(lead.lastActivityAt).getTime() : null;
  const firstContact = lead.firstContactAt ? new Date(lead.firstContactAt).getTime() : null;
  const hasRecentActivity = lastActivity && (now - lastActivity) <= SEVEN_DAYS_MS;
  if (!hasRecentActivity) {
    const noContactFromLastActivity = lastActivity && (now - lastActivity) > SEVEN_DAYS_MS;
    const noContactFromFirstContact = firstContact && (now - firstContact) > SEVEN_DAYS_MS;
    if (noContactFromLastActivity || noContactFromFirstContact) {
      results.push({
        ruleType: "no_contact",
        action: "raise_priority",
        description: "אין קשר 7 ימים — העלאת עדיפות",
      });
    }
  }

  // Rule 4: all documents complete
  if (lead.documentsCompletionPercent >= 100) {
    results.push({
      ruleType: "docs_complete",
      action: "suggest_next_stage",
      description: "כל המסמכים הושלמו — הצעה להעביר לשלב הבא",
    });
  }

  return results;
}

// ─── Logging (Supabase) ──────────────────────────────────────────────────────

/**
 * Log a workflow execution to the workflow_automation_logs table.
 * @param {object} entry
 * @param {string} entry.advisorId
 * @param {string} entry.leadId
 * @param {string} entry.ruleType
 * @param {*}      entry.triggerValue
 * @param {string} entry.actionTaken
 * @param {object} [entry.metadata]
 */
export async function logWorkflowExecution({ advisorId, leadId, ruleType, triggerValue, actionTaken, metadata } = {}) {
  if (!hasConfig() || !advisorId || !leadId) return null;
  const record = {
    id:            randomUUID(),
    advisor_id:    advisorId,
    lead_id:       leadId,
    rule_type:     String(ruleType || "").trim(),
    trigger_value: triggerValue != null ? String(triggerValue) : null,
    action_taken:  String(actionTaken || "").trim(),
    metadata:      metadata != null ? metadata : null,
    created_at:    new Date().toISOString(),
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
        console.warn("[workflowEngine] workflow_automation_logs table not found — run setup SQL");
        return null;
      }
      console.warn("[workflowEngine] logWorkflowExecution failed", res.status, text.slice(0, 200));
      return null;
    }
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : record;
  } catch (err) {
    console.warn("[workflowEngine] logWorkflowExecution error", err?.message);
    return null;
  }
}

/**
 * Read workflow logs for a specific lead.
 * @param {string} leadId
 * @param {number} [limit=50]
 */
export async function getWorkflowLogs(leadId, limit = 50) {
  if (!hasConfig() || !leadId) return [];
  try {
    const query = `lead_id=eq.${encodeURIComponent(leadId)}&order=created_at.desc&limit=${limit}`;
    const res = await fetch(endpoint(TABLE, query), {
      method: "GET", headers: baseHeaders(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[workflowEngine] workflow_automation_logs table not found — run setup SQL");
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
