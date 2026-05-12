import { randomUUID, timingSafeEqual } from "crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const LEADS_TABLE = "leads";
const ADVISORS_TABLE = "advisors";
const LEADS_SELECT_COLUMNS = [
  "id", "created_at", "last_updated", "name", "phone", "city", "mortgage_amount", "purchase_status", "approval_score", "main_issue", "source", "status", "assigned_advisor", "advisor_phone", "expected_commission", "actual_commission", "commission_status", "commission_agreement", "notes", "assigned_advisor_id", "lead_status", "follow_up_date", "last_contacted_at", "commission_amount", "internal_notes", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
];

function logSupabase(event, payload = {}) {
  console.log(`[supabase:${event}]`, payload);
}

export class LeadStoreError extends Error {
  constructor(code, message, details = "") {
    super(message);
    this.name = "LeadStoreError";
    this.code = code;
    this.details = details;
  }
}

export function getSupabaseConfigStatus() {
  return {
    hasUrl: Boolean(String(process.env.SUPABASE_URL || "").trim()),
    hasServiceKey: Boolean(String(process.env.SUPABASE_SERVICE_KEY || "").trim()),
  };
}

function assertConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new LeadStoreError(
      "SUPABASE_ENV_MISSING",
      "Missing Supabase config. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in your environment variables.",
    );
  }
  logSupabase("config", {
    hasUrl: Boolean(SUPABASE_URL),
    hasServiceRoleKey: Boolean(SUPABASE_SERVICE_KEY),
    usingServiceRoleHeader: true,
  });
}

function endpoint(table, query = "") {
  const base = `${SUPABASE_URL}/rest/v1/${table}`;
  return query ? `${base}?${query}` : base;
}

function baseHeaders() {
  return {
    "Content-Type": "application/json",
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
  };
}

function toRow(record) {
  return {
    id: record.id,
    created_at: record.createdAt,
    last_updated: record.lastUpdated,
    name: record.name,
    phone: record.phone,
    city: record.city,
    mortgage_amount: record.mortgageAmount,
    purchase_status: record.purchaseStatus,
    approval_score: record.approvalScore,
    main_issue: record.mainIssue,
    source: record.source,
    status: record.status,
    assigned_advisor: record.assignedAdvisor,
    advisor_phone: record.advisorPhone,
    expected_commission: record.expectedCommission,
    actual_commission: record.actualCommission,
    commission_status: record.commissionStatus,
    commission_agreement: record.commissionAgreement,
    notes: record.notes,
    assigned_advisor_id: record.assignedAdvisorId,
    lead_status: record.leadStatus,
    follow_up_date: record.followUpDate,
    last_contacted_at: record.lastContactedAt,
    commission_amount: record.commissionAmount,
    internal_notes: record.internalNotes,
    utm_source: record.utmSource,
    utm_medium: record.utmMedium,
    utm_campaign: record.utmCampaign,
    utm_content: record.utmContent,
    utm_term: record.utmTerm,
  };
}

function fromRow(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    lastUpdated: row.last_updated,
    name: row.name,
    phone: row.phone,
    city: row.city,
    mortgageAmount: row.mortgage_amount,
    purchaseStatus: row.purchase_status,
    approvalScore: row.approval_score,
    mainIssue: row.main_issue,
    source: row.source,
    status: row.status,
    assignedAdvisor: row.assigned_advisor,
    advisorPhone: row.advisor_phone,
    expectedCommission: row.expected_commission,
    actualCommission: row.actual_commission,
    commissionStatus: row.commission_status,
    commissionAgreement: row.commission_agreement,
    notes: row.notes,
    assignedAdvisorId: row.assigned_advisor_id || "",
    leadStatus: row.lead_status || row.status || "חדש",
    followUpDate: row.follow_up_date || "",
    lastContactedAt: row.last_contacted_at || "",
    commissionAmount: row.commission_amount || "",
    internalNotes: row.internal_notes || "",
    utmSource: row.utm_source || "",
    utmMedium: row.utm_medium || "",
    utmCampaign: row.utm_campaign || "",
    utmContent: row.utm_content || "",
    utmTerm: row.utm_term || "",
  };
}

const ALLOWED_CHANGES_MAP = {
  status: "status",
  assignedAdvisor: "assigned_advisor",
  advisorPhone: "advisor_phone",
  expectedCommission: "expected_commission",
  actualCommission: "actual_commission",
  commissionStatus: "commission_status",
  commissionAgreement: "commission_agreement",
  notes: "notes",
  assignedAdvisorId: "assigned_advisor_id",
  leadStatus: "lead_status",
  followUpDate: "follow_up_date",
  lastContactedAt: "last_contacted_at",
  commissionAmount: "commission_amount",
  internalNotes: "internal_notes",
  utmSource: "utm_source",
  utmMedium: "utm_medium",
  utmCampaign: "utm_campaign",
  utmContent: "utm_content",
  utmTerm: "utm_term",
};

function toPartialRow(changes) {
  const patch = { last_updated: new Date().toISOString() };
  for (const [camel, snake] of Object.entries(ALLOWED_CHANGES_MAP)) {
    if (Object.prototype.hasOwnProperty.call(changes, camel)) {
      patch[snake] = changes[camel];
    }
  }
  return patch;
}

export const LEAD_STATUSES = ["חדש", "נשלח ליועץ", "בטיפול", "אושר עקרונית", "נסגר", "לא רלוונטי"];
export const COMMISSION_STATUSES = ["pending", "invoiced", "paid"];

export async function readLeads() {
  assertConfig();
  const query = `select=${encodeURIComponent(LEADS_SELECT_COLUMNS.join(","))}&order=created_at.desc`;
  const url = endpoint(LEADS_TABLE, query);
  logSupabase("select.leads.request", { url, method: "GET", table: LEADS_TABLE, columns: LEADS_SELECT_COLUMNS });
  const res = await fetch(url, { method: "GET", headers: baseHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logSupabase("select.leads.error", { status: res.status, body });
    throw new LeadStoreError("SUPABASE_READ_FAILED", `Supabase readLeads ${res.status}`, body);
  }
  const rows = await res.json();
  logSupabase("select.leads.success", { count: Array.isArray(rows) ? rows.length : 0 });
  return Array.isArray(rows) ? rows.map(fromRow) : [];
}

export async function readAdvisors() {
  assertConfig();
  const url = endpoint(ADVISORS_TABLE, "order=name.asc");
  logSupabase("select.advisors.request", { url, method: "GET", table: ADVISORS_TABLE });
  const res = await fetch(url, { method: "GET", headers: baseHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logSupabase("select.advisors.error", { status: res.status, body });
    throw new LeadStoreError("SUPABASE_READ_FAILED", `Supabase readAdvisors ${res.status}`, body);
  }
  const rows = await res.json();
  logSupabase("select.advisors.success", { count: Array.isArray(rows) ? rows.length : 0 });
  return rows;
}

function advisorToRow(advisor) {
  return {
    advisor_id: advisor.advisorId,
    name: advisor.name,
    phone: advisor.phone,
    email: advisor.email,
    active: advisor.active,
    commission_type: advisor.commissionType,
    commission_amount: advisor.commissionAmount,
  };
}

export async function createAdvisor(payload) {
  assertConfig();
  logSupabase("insert.advisors.request", { table: ADVISORS_TABLE, payload: advisorToRow(payload) });
  const res = await fetch(endpoint(ADVISORS_TABLE), {
    method: "POST",
    headers: { ...baseHeaders(), Prefer: "return=representation,resolution=merge-duplicates" },
    body: JSON.stringify(advisorToRow(payload)),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logSupabase("insert.advisors.error", { status: res.status, body });
    throw new LeadStoreError("SUPABASE_CREATE_FAILED", `Supabase createAdvisor ${res.status}`, body);
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : null;
}

export async function updateAdvisor(advisorId, changes) {
  assertConfig();
  const patch = {};
  if (Object.prototype.hasOwnProperty.call(changes, "name")) patch.name = changes.name;
  if (Object.prototype.hasOwnProperty.call(changes, "phone")) patch.phone = changes.phone;
  if (Object.prototype.hasOwnProperty.call(changes, "email")) patch.email = changes.email;
  if (Object.prototype.hasOwnProperty.call(changes, "commissionType")) patch.commission_type = changes.commissionType;
  if (Object.prototype.hasOwnProperty.call(changes, "commissionAmount")) patch.commission_amount = changes.commissionAmount;
  if (Object.prototype.hasOwnProperty.call(changes, "active")) patch.active = changes.active;

  logSupabase("update.advisors.request", { table: ADVISORS_TABLE, advisorId, patch });
  const res = await fetch(endpoint(ADVISORS_TABLE, `advisor_id=eq.${encodeURIComponent(advisorId)}`), {
    method: "PATCH",
    headers: { ...baseHeaders(), Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logSupabase("update.advisors.error", { status: res.status, body, advisorId });
    throw new LeadStoreError("SUPABASE_UPDATE_FAILED", `Supabase updateAdvisor ${res.status}`, body);
  }
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function createLead(payload = {}) {
  assertConfig();
  const now = new Date().toISOString();
  const lead = payload.lead || payload;
  const analysis = payload.analysis || {};

  const record = {
    id: randomUUID(), createdAt: lead.createdAt || now, lastUpdated: now, name: lead.name || "", phone: lead.phone || "", city: lead.city || "",
    mortgageAmount: Number(lead.mortgageAmount || lead.mortgage || analysis.mortgage || 0), purchaseStatus: lead.purchaseStatus || "",
    approvalScore: Number(lead.approval || analysis.approval || 0), mainIssue: lead.mainIssue || analysis.mainIssue || "", source: lead.source || "mortgai2",
    status: "חדש", assignedAdvisor: "", advisorPhone: "", expectedCommission: "", actualCommission: "", commissionStatus: "pending", commissionAgreement: "", notes: "",
    assignedAdvisorId: "", leadStatus: "חדש", followUpDate: "", lastContactedAt: "", commissionAmount: "", internalNotes: "",
    utmSource: lead.utmSource || "", utmMedium: lead.utmMedium || "", utmCampaign: lead.utmCampaign || "",
    utmContent: lead.utmContent || "", utmTerm: lead.utmTerm || "",
  };

  logSupabase("insert.leads.request", { table: LEADS_TABLE, payload: toRow(record) });
  const res = await fetch(endpoint(LEADS_TABLE), {
    method: "POST", headers: { ...baseHeaders(), Prefer: "return=representation" }, body: JSON.stringify(toRow(record)),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logSupabase("insert.leads.error", { status: res.status, body });
    throw new LeadStoreError("SUPABASE_CREATE_FAILED", `Supabase createLead ${res.status}`, body);
  }
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0 ? fromRow(rows[0]) : record;
}

export async function updateLead(id, changes = {}) {
  assertConfig();
  const patch = toPartialRow(changes);
  logSupabase("update.leads.request", { table: LEADS_TABLE, id, patch });
  const res = await fetch(endpoint(LEADS_TABLE, `id=eq.${encodeURIComponent(id)}`), {
    method: "PATCH", headers: { ...baseHeaders(), Prefer: "return=representation" }, body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logSupabase("update.leads.error", { status: res.status, body, id });
    throw new LeadStoreError("SUPABASE_UPDATE_FAILED", `Supabase updateLead ${res.status}`, body);
  }
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0 ? fromRow(rows[0]) : null;
}

export function isAdminPassword(value) {
  const expected = String(process.env.ADMIN_PASSWORD || "").trim();
  const submitted = String(value || "").trim();
  if (!expected || expected.length !== submitted.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(submitted));
}
