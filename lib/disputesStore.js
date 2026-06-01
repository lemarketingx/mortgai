/**
 * Lead Disputes Store — Supabase REST API client
 *
 * Required SQL (run once in Supabase SQL editor):
 *
 * CREATE TABLE lead_disputes (
 *   id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
 *   lead_id     uuid        NOT NULL,
 *   advisor_id  text        NOT NULL,
 *   purchase_id uuid,
 *   reason      text        NOT NULL,
 *   description text        NOT NULL DEFAULT '',
 *   status      text        NOT NULL DEFAULT 'open',
 *   admin_note  text        NOT NULL DEFAULT '',
 *   created_at  timestamptz NOT NULL DEFAULT now(),
 *   updated_at  timestamptz NOT NULL DEFAULT now()
 * );
 *
 * Statuses: open | reviewing | approved | rejected | credited
 */

import { randomUUID } from "crypto";

const TABLE = "lead_disputes";

export const DISPUTE_STATUSES = ["open", "reviewing", "approved", "rejected", "credited"];

export const DISPUTE_STATUS_LABELS = {
  open:      "פתוח",
  reviewing: "בבדיקה",
  approved:  "אושר",
  rejected:  "נדחה",
  credited:  "זוכה",
};

export const DISPUTE_REASONS = [
  "מספר לא תקין",
  "הלקוח לא עונה",
  "הלקוח לא מעוניין",
  "פרטים לא תואמים",
  "כבר מטופל אצל יועץ אחר",
  "אחר",
];

function getSupabaseUrl() {
  return String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
}
function getSupabaseServiceKey() {
  return String(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
}

export class DisputeStoreError extends Error {
  constructor(code, message, details = "") {
    super(message);
    this.code = code;
    this.details = details;
  }
}

function assertConfig() {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceKey();
  if (!url) throw new DisputeStoreError("SUPABASE_ENV_MISSING", "SUPABASE_URL is not set");
  if (!key) throw new DisputeStoreError("SUPABASE_ENV_MISSING", "SUPABASE_SERVICE_KEY is not set");
}

function endpoint(filter = "") {
  const base = `${getSupabaseUrl()}/rest/v1/${TABLE}`;
  return filter ? `${base}?${filter}` : base;
}

function headers() {
  return {
    apikey:        getSupabaseServiceKey(),
    Authorization: `Bearer ${getSupabaseServiceKey()}`,
    "Content-Type": "application/json",
    Accept:         "application/json",
  };
}

function isTableMissing(body = "") {
  return /relation .+ does not exist/i.test(String(body)) || /table .+ does not exist/i.test(String(body));
}

export async function createDispute({ leadId, advisorId, purchaseId, reason, description }) {
  assertConfig();
  const record = {
    id:          randomUUID(),
    lead_id:     leadId,
    advisor_id:  advisorId,
    purchase_id: purchaseId || null,
    reason,
    description: description || "",
    status:      "open",
    admin_note:  "",
    created_at:  new Date().toISOString(),
    updated_at:  new Date().toISOString(),
  };
  const res = await fetch(endpoint(), {
    method:  "POST",
    headers: { ...headers(), Prefer: "return=representation" },
    body:    JSON.stringify(record),
  });
  if (res.ok) {
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : record;
  }
  const body = await res.text().catch(() => "");
  if (isTableMissing(body)) throw new DisputeStoreError("TABLE_MISSING", "lead_disputes table does not exist — run the SQL migration", body);
  throw new DisputeStoreError("SUPABASE_CREATE_FAILED", `createDispute ${res.status}`, body);
}

export async function readAllDisputes() {
  assertConfig();
  const res = await fetch(endpoint("order=created_at.desc"), { method: "GET", headers: headers() });
  if (res.ok) {
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) ? rows : [];
  }
  const body = await res.text().catch(() => "");
  if (isTableMissing(body)) return [];
  throw new DisputeStoreError("SUPABASE_READ_FAILED", `readAllDisputes ${res.status}`, body);
}

export async function readAdvisorDisputes(advisorId) {
  assertConfig();
  const res = await fetch(
    endpoint(`advisor_id=eq.${encodeURIComponent(advisorId)}&order=created_at.desc`),
    { method: "GET", headers: headers() }
  );
  if (res.ok) {
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) ? rows : [];
  }
  const body = await res.text().catch(() => "");
  if (isTableMissing(body)) return [];
  throw new DisputeStoreError("SUPABASE_READ_FAILED", `readAdvisorDisputes ${res.status}`, body);
}

export async function hasDisputeForLead(advisorId, leadId) {
  assertConfig();
  const res = await fetch(
    endpoint(`advisor_id=eq.${encodeURIComponent(advisorId)}&lead_id=eq.${encodeURIComponent(leadId)}&select=id`),
    { method: "GET", headers: headers() }
  );
  if (!res.ok) return false;
  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) && rows.length > 0;
}

export async function updateDispute(id, changes = {}) {
  assertConfig();
  const allowed = ["status", "admin_note"];
  const patch = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(changes, key)) patch[key] = changes[key];
  }
  const res = await fetch(
    endpoint(`id=eq.${encodeURIComponent(id)}`),
    { method: "PATCH", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify(patch) }
  );
  if (res.ok) {
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  }
  const body = await res.text().catch(() => "");
  throw new DisputeStoreError("SUPABASE_UPDATE_FAILED", `updateDispute ${res.status}`, body);
}
