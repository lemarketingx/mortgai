/**
 * Supabase data-access layer for advisor alert rules.
 *
 * Table:
 *   advisor_alert_rules — per-advisor notification/matching rules for incoming leads
 *
 * All calls use the service role key — never called from client JS.
 */

import { randomUUID } from "crypto";

const TABLE = "advisor_alert_rules";

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

// ─── advisor_alert_rules ─────────────────────────────────────────────────────

/**
 * Read all active alert rules for an advisor.
 * @param {string} advisorId
 */
export async function getAlertRules(advisorId) {
  if (!hasConfig() || !advisorId) return [];
  try {
    const query = `advisor_id=eq.${encodeURIComponent(advisorId)}&is_active=eq.true&order=created_at.desc`;
    const res = await fetch(endpoint(TABLE, query), {
      method: "GET", headers: baseHeaders(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (isTableMissing(text)) {
        console.warn("[alertRulesStore] advisor_alert_rules table not found — run setup SQL");
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
 * Create a new alert rule for an advisor.
 * @param {string} advisorId
 * @param {object} rule
 */
export async function createAlertRule(advisorId, rule = {}) {
  if (!hasConfig() || !advisorId) return null;
  const record = {
    id:               randomUUID(),
    advisor_id:       advisorId,
    rule_name:        String(rule.rule_name || "").trim(),
    is_active:        rule.is_active !== false,
    filter_city:      rule.filter_city != null ? String(rule.filter_city).trim() : null,
    filter_lead_type: rule.filter_lead_type != null ? String(rule.filter_lead_type).trim() : null,
    filter_min_budget: rule.filter_min_budget != null ? Number(rule.filter_min_budget) : null,
    filter_max_budget: rule.filter_max_budget != null ? Number(rule.filter_max_budget) : null,
    filter_min_score:  rule.filter_min_score != null ? Number(rule.filter_min_score) : null,
    filter_heat_level: rule.filter_heat_level != null ? String(rule.filter_heat_level).trim() : null,
    created_at:       new Date().toISOString(),
    updated_at:       new Date().toISOString(),
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
        console.warn("[alertRulesStore] advisor_alert_rules table not found — run setup SQL");
        return null;
      }
      console.warn("[alertRulesStore] createAlertRule failed", res.status, text.slice(0, 200));
      return null;
    }
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : record;
  } catch (err) {
    console.warn("[alertRulesStore] createAlertRule error", err?.message);
    return null;
  }
}

/**
 * Update an alert rule. Only the owning advisor can update.
 * @param {string} advisorId
 * @param {string} ruleId
 * @param {object} updates
 */
export async function updateAlertRule(advisorId, ruleId, updates = {}) {
  if (!hasConfig() || !advisorId || !ruleId) return null;
  const patch = { updated_at: new Date().toISOString() };
  const TEXT_FIELDS = ["rule_name", "filter_city", "filter_lead_type", "filter_heat_level"];
  for (const key of TEXT_FIELDS) {
    if (updates[key] !== undefined) patch[key] = updates[key] != null ? String(updates[key]).trim() : null;
  }
  const NUMERIC_FIELDS = ["filter_min_budget", "filter_max_budget"];
  for (const key of NUMERIC_FIELDS) {
    if (updates[key] !== undefined) patch[key] = updates[key] != null ? Number(updates[key]) : null;
  }
  if (updates.filter_min_score !== undefined) {
    patch.filter_min_score = updates.filter_min_score != null ? Number(updates.filter_min_score) : null;
  }
  if (updates.is_active !== undefined) patch.is_active = Boolean(updates.is_active);
  try {
    const res = await fetch(
      endpoint(TABLE,
        `id=eq.${encodeURIComponent(ruleId)}&advisor_id=eq.${encodeURIComponent(advisorId)}`),
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
 * Hard-delete an alert rule. Only the owning advisor can delete.
 * @param {string} advisorId
 * @param {string} ruleId
 */
export async function deleteAlertRule(advisorId, ruleId) {
  if (!hasConfig() || !advisorId || !ruleId) return false;
  try {
    const res = await fetch(
      endpoint(TABLE,
        `id=eq.${encodeURIComponent(ruleId)}&advisor_id=eq.${encodeURIComponent(advisorId)}`),
      { method: "DELETE", headers: baseHeaders() }
    );
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Pure matching logic ─────────────────────────────────────────────────────

const HEAT_LEVEL_MAP = {
  HOT:  "חם",
  WARM: "חמים",
  COLD: "קר",
};

/**
 * Check if a lead matches any of the given rules.
 * A rule matches if ALL non-null filters match the lead.
 * @param {object} lead
 * @param {object[]} rules
 * @returns {object[]} array of matching rule objects
 */
export function matchLeadToRules(lead, rules) {
  if (!lead || !Array.isArray(rules)) return [];
  return rules.filter((rule) => {
    if (rule.filter_city != null && lead.city !== rule.filter_city) return false;
    if (rule.filter_lead_type != null && lead.purchaseStatus !== rule.filter_lead_type) return false;
    if (rule.filter_min_budget != null && !(lead.propertyPrice >= rule.filter_min_budget)) return false;
    if (rule.filter_max_budget != null && !(lead.propertyPrice <= rule.filter_max_budget)) return false;
    if (rule.filter_min_score != null) {
      const score = lead.finzoScore || lead.approvalScore;
      if (!(score >= rule.filter_min_score)) return false;
    }
    if (rule.filter_heat_level != null) {
      const hebrewHeat = HEAT_LEVEL_MAP[rule.filter_heat_level];
      if (lead.computedQuality !== hebrewHeat) return false;
    }
    return true;
  });
}
