import { randomUUID, timingSafeEqual } from "crypto";

function getSupabaseUrl() {
  return String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
}

function getSupabaseServiceKey() {
  return String(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
}
const LEADS_TABLE = "leads";
const ADVISORS_TABLE = "advisors";
const LEADS_SELECT_COLUMNS = [
  "id", "created_at", "last_updated", "name", "phone", "city", "mortgage_amount", "purchase_status", "approval_score", "main_issue", "source", "status", "assigned_advisor", "advisor_phone", "advisor_email", "expected_commission", "actual_commission", "commission_status", "commission_agreement", "notes", "assigned_advisor_id", "lead_status", "follow_up_date", "last_contacted_at", "commission_amount", "internal_notes", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "referrer", "landing_page", "estimated_approval_result", "estimated_payment", "property_price", "equity_amount", "monthly_income", "debt_level",
];

function logSupabase(event, payload = {}) {
  console.log(`[supabase:${event}]`, payload);
}

async function safeReadResponse(operation, res) {
  let bodyText = "";
  try {
    bodyText = await res.text();
  } catch (error) {
    logSupabase(`${operation}.body_read_error`, { error: error?.message || String(error) });
  }

  let parsed = null;
  if (bodyText) {
    try {
      parsed = JSON.parse(bodyText);
    } catch (error) {
      logSupabase(`${operation}.json_parse_error`, { error: error?.message || String(error), bodyText });
    }
  }

  return {
    bodyText,
    parsed,
    errorCode: parsed?.code || "",
    errorMessage: parsed?.message || "",
    errorDetails: parsed?.details || "",
  };
}

export class LeadStoreError extends Error {
  constructor(code, message, details = "") {
    super(message);
    this.name = "LeadStoreError";
    this.code = code;
    this.details = details;
  }
}

function redactSensitive(value = "") {
  const text = String(value || "");
  if (!text) return "";
  if (text.length <= 8) return "[redacted]";
  return `${text.slice(0, 4)}...[redacted]`;
}

export function getSupabaseConfigStatus() {
  return {
    hasUrl: Boolean(getSupabaseUrl()),
    hasServiceKey: Boolean(getSupabaseServiceKey()),
  };
}

function assertConfig() {
  const SUPABASE_URL = getSupabaseUrl();
  const SUPABASE_SERVICE_KEY = getSupabaseServiceKey();
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new LeadStoreError(
      "SUPABASE_ENV_MISSING",
      "Missing Supabase config. Set SUPABASE_URL + SUPABASE_SERVICE_KEY (or NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).",
    );
  }

  if (!SUPABASE_URL.startsWith("https://")) {
    throw new LeadStoreError("SUPABASE_URL_INVALID", "SUPABASE_URL must start with https://");
  }

  if (SUPABASE_URL.includes("/rest/v1")) {
    throw new LeadStoreError("SUPABASE_URL_INVALID", "SUPABASE_URL must not include /rest/v1");
  }

  if (SUPABASE_URL.endsWith("/")) {
    throw new LeadStoreError("SUPABASE_URL_INVALID", "SUPABASE_URL must not end with /");
  }

  logSupabase("config", {
    hasUrl: Boolean(SUPABASE_URL),
    urlPreview: redactSensitive(SUPABASE_URL),
    hasServiceRoleKey: Boolean(SUPABASE_SERVICE_KEY),
    usingServiceRoleHeader: true,
  });
}

function logFetchError(operation, error) {
  logSupabase(`${operation}.fetch_error`, {
    name: error?.name,
    message: error?.message,
    cause: error?.cause,
    stack: error?.stack,
  });
}

function endpoint(table, query = "") {
  const SUPABASE_URL = getSupabaseUrl();
  const base = `${SUPABASE_URL}/rest/v1/${table}`;
  return query ? `${base}?${query}` : base;
}

function baseHeaders() {
  const SUPABASE_SERVICE_KEY = getSupabaseServiceKey();
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
    advisor_email: record.advisorEmail,
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
    referrer: record.referrer,
    landing_page: record.landingPage,
    estimated_approval_result: record.estimatedApprovalResult,
    estimated_payment: record.estimatedPayment,
    property_price: record.propertyPrice,
    equity_amount: record.equityAmount,
    monthly_income: record.monthlyIncome,
    debt_level: record.debtLevel,
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
    advisorEmail: row.advisor_email || "",
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
    referrer: row.referrer || "",
    landingPage: row.landing_page || "",
    estimatedApprovalResult: row.estimated_approval_result || "",
    estimatedPayment: row.estimated_payment || "",
    propertyPrice: row.property_price || "",
    equityAmount: row.equity_amount || "",
    monthlyIncome: row.monthly_income || "",
    debtLevel: row.debt_level || "",
  };
}

const ALLOWED_CHANGES_MAP = {
  status: "status",
  assignedAdvisor: "assigned_advisor",
  advisorPhone: "advisor_phone",
  advisorEmail: "advisor_email",
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
  const columns = [...LEADS_SELECT_COLUMNS];
  const missingColumnRegex = /column\s+([\w.]+)\s+does not exist/i;

  while (columns.length > 0) {
    const query = `select=${encodeURIComponent(columns.join(","))}&order=created_at.desc`;
    const url = endpoint(LEADS_TABLE, query);
    logSupabase("select.leads.request", { url, method: "GET", table: LEADS_TABLE, columns });
    let res;
    try {
      res = await fetch(url, { method: "GET", headers: baseHeaders() });
    } catch (error) {
      logFetchError("select.leads", error);
      throw new LeadStoreError("SUPABASE_READ_FAILED", "Supabase readLeads fetch failed", error?.message || String(error));
    }

    if (res.ok) {
      const payload = await safeReadResponse("select.leads.success", res);
      const rows = payload.parsed;
      logSupabase("select.leads.success", { count: Array.isArray(rows) ? rows.length : 0, columns });
      return Array.isArray(rows) ? rows.map(fromRow) : [];
    }

    const payload = await safeReadResponse("select.leads.error", res);
    const body = payload.bodyText;
    const match = body.match(missingColumnRegex);
    const missingColumn = match?.[1]?.split(".")?.pop();

    if (res.status === 400 && missingColumn && columns.includes(missingColumn)) {
      logSupabase("select.leads.retry_without_column", {
        missingColumn,
        status: res.status,
        body,
        errorCode: payload.errorCode,
        errorMessage: payload.errorMessage,
        errorDetails: payload.errorDetails,
      });
      columns.splice(columns.indexOf(missingColumn), 1);
      continue;
    }

    logSupabase("select.leads.error", {
      status: res.status,
      body,
      errorCode: payload.errorCode,
      errorMessage: payload.errorMessage,
      errorDetails: payload.errorDetails,
    });
    throw new LeadStoreError("SUPABASE_READ_FAILED", `Supabase readLeads ${res.status}`, body);
  }

  return [];
}

export function getSupabaseAdminHealthUrl() {
  assertConfig();
  const SUPABASE_URL = getSupabaseUrl();
  return `${SUPABASE_URL}/rest/v1/leads?select=id&limit=1`;
}

export async function readAdvisors() {
  assertConfig();
  const url = endpoint(ADVISORS_TABLE, "order=name.asc");
  logSupabase("select.advisors.request", { url, method: "GET", table: ADVISORS_TABLE });
  const res = await fetch(url, { method: "GET", headers: baseHeaders() });
  if (!res.ok) {
    const payload = await safeReadResponse("select.advisors.error", res);
    logSupabase("select.advisors.error", {
      status: res.status,
      body: payload.bodyText,
      errorCode: payload.errorCode,
      errorMessage: payload.errorMessage,
      errorDetails: payload.errorDetails,
    });
    throw new LeadStoreError("SUPABASE_READ_FAILED", `Supabase readAdvisors ${res.status}`, payload.bodyText);
  }
  const payload = await safeReadResponse("select.advisors.success", res);
  const rows = payload.parsed;
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
    advisorEmail: "",
    assignedAdvisorId: "", leadStatus: "חדש", followUpDate: "", lastContactedAt: "", commissionAmount: "", internalNotes: "",
    utmSource: lead.utmSource || "", utmMedium: lead.utmMedium || "", utmCampaign: lead.utmCampaign || "",
    utmContent: lead.utmContent || "", utmTerm: lead.utmTerm || "",
    referrer: lead.referrer || "",
    landingPage: lead.landingPage || "",
    estimatedApprovalResult: lead.estimatedApprovalResult || analysis.estimatedApprovalResult || "",
    estimatedPayment: String(lead.estimatedPayment || analysis.estimatedPayment || ""),
    propertyPrice: Number(lead.propertyPrice || analysis.propertyPrice || 0) || null,
    equityAmount: Number(lead.equityAmount || analysis.equityAmount || 0) || null,
    monthlyIncome: Number(lead.monthlyIncome || analysis.monthlyIncome || 0) || null,
    debtLevel: lead.debtLevel || analysis.debtLevel || "",
  };

  const missingColumnRegex = /column\s+([\w.]+)\s+does not exist/i;
  const row = toRow(record);
  const candidate = { ...row };

  const removedColumns = [];
  while (Object.keys(candidate).length > 0) {
    logSupabase("insert.leads.request", { table: LEADS_TABLE, payload: candidate });
    const res = await fetch(endpoint(LEADS_TABLE), {
      method: "POST", headers: { ...baseHeaders(), Prefer: "return=representation" }, body: JSON.stringify(candidate),
    });

    if (res.ok) {
      const rows = await res.json();
      return Array.isArray(rows) && rows.length > 0 ? fromRow(rows[0]) : fromRow(candidate);
    }

    const body = await res.text().catch(() => "");
    const match = body.match(missingColumnRegex);
    const missingColumn = match?.[1]?.split(".")?.pop();
    if (res.status === 400 && missingColumn && Object.prototype.hasOwnProperty.call(candidate, missingColumn)) {
      logSupabase("insert.leads.retry_without_column", { missingColumn, status: res.status });
      removedColumns.push(missingColumn);
      delete candidate[missingColumn];
      continue;
    }

    logSupabase("insert.leads.error", {
      status: res.status,
      body,
      removedColumns,
      remainingColumns: Object.keys(candidate),
    });
    if (res.status === 400 && /column\s+[\w.]+\s+does not exist/i.test(body)) {
      throw new LeadStoreError("SUPABASE_MISSING_COLUMN", `Supabase createLead ${res.status}`, body);
    }
    throw new LeadStoreError("SUPABASE_CREATE_FAILED", `Supabase createLead ${res.status}`, body);
  }

  throw new LeadStoreError("SUPABASE_INSERT_EMPTY_PAYLOAD", "Supabase createLead failed after dropping unknown columns");
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
