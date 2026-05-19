import { randomUUID, timingSafeEqual } from "crypto";

function getSupabaseUrl() {
  return String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
}

function getSupabaseServiceKey() {
  return String(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
}

const LEADS_TABLE = "leads";
const ADVISORS_TABLE = "advisors";
const LEAD_PURCHASES_TABLE = "lead_purchases";

const LEADS_SELECT_COLUMNS = [
  "id", "created_at", "last_updated", "name", "phone", "city", "mortgage_amount", "purchase_status", "approval_score", "main_issue", "source", "status",
  "assigned_advisor", "advisor_phone", "advisor_email", "assigned_advisor_id",
  "lead_status", "lead_quality", "lead_priority", "follow_up_date", "follow_up_stage", "last_contacted_at", "internal_notes", "notes",
  "expected_commission", "actual_commission", "commission_status", "commission_agreement", "commission_amount",
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "referrer", "landing_page",
  "estimated_approval_result", "estimated_payment", "property_price", "equity_amount", "monthly_income", "debt_level",
  "employment_status", "has_existing_mortgage", "contract_status", "property_city", "requested_contact_time",
  "store_status", "store_price", "exclusive_price", "preview_summary", "sold_at", "buyer_advisor_id",
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

function extractMissingColumn(body = "") {
  const text = String(body || "");
  const patterns = [
    /Could not find the ['\"]([^'\"]+)['\"] column/i,
    /column\s+["']?([\w.]+)["']?\s+does not exist/i,
    /column\s+([\w.]+)\s+does not exist/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match?.[1]?.split(".")?.pop();
    if (value) return value.replace(/["']/g, "");
  }
  return "";
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
  if (!SUPABASE_URL.startsWith("https://")) throw new LeadStoreError("SUPABASE_URL_INVALID", "SUPABASE_URL must start with https://");
  if (SUPABASE_URL.includes("/rest/v1")) throw new LeadStoreError("SUPABASE_URL_INVALID", "SUPABASE_URL must not include /rest/v1");
  if (SUPABASE_URL.endsWith("/")) throw new LeadStoreError("SUPABASE_URL_INVALID", "SUPABASE_URL must not end with /");

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
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  };
}

function toOptionalNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function text(value) {
  return String(value ?? "").trim();
}

function inferLeadQuality(record) {
  const approval = Number(record.approvalScore || record.estimatedApprovalResult || 0);
  const income = Number(record.monthlyIncome || 0);
  const equity = Number(record.equityAmount || 0);
  const propertyPrice = Number(record.propertyPrice || 0);
  const mortgage = Number(record.mortgageAmount || 0);
  const debt = Number(record.debtLevel || 0);
  const ltv = propertyPrice > 0 ? (mortgage / propertyPrice) * 100 : 0;
  const debtRatio = income > 0 ? (debt / income) * 100 : 0;
  const contractStatus = text(record.contractStatus || record.purchaseStatus);

  if (approval >= 70 && income >= 12000 && (equity >= 250000 || ltv <= 70) && debtRatio <= 35) return "חם";
  if (approval >= 45 || contractStatus.includes("חוזה") || income >= 9000) return "בינוני";
  return "חלש";
}

function inferLeadPriority(quality) {
  if (quality === "חם") return "גבוה";
  if (quality === "בינוני") return "רגיל";
  return "נמוך";
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
    assigned_advisor_id: record.assignedAdvisorId,
    lead_status: record.leadStatus,
    lead_quality: record.leadQuality,
    lead_priority: record.leadPriority,
    follow_up_date: record.followUpDate,
    follow_up_stage: record.followUpStage,
    last_contacted_at: record.lastContactedAt,
    internal_notes: record.internalNotes,
    notes: record.notes,
    expected_commission: record.expectedCommission,
    actual_commission: record.actualCommission,
    commission_status: record.commissionStatus,
    commission_agreement: record.commissionAgreement,
    commission_amount: record.commissionAmount,
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
    employment_status: record.employmentStatus,
    has_existing_mortgage: record.hasExistingMortgage,
    contract_status: record.contractStatus,
    property_city: record.propertyCity,
    requested_contact_time: record.requestedContactTime,
  };
}

function fromRow(row = {}) {
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
    assignedAdvisorId: row.assigned_advisor_id || "",
    leadStatus: row.lead_status || row.status || "חדש",
    leadQuality: row.lead_quality || "לא סווג",
    leadPriority: row.lead_priority || "רגיל",
    followUpDate: row.follow_up_date || "",
    followUpStage: row.follow_up_stage || "לא טופל",
    lastContactedAt: row.last_contacted_at || "",
    internalNotes: row.internal_notes || "",
    notes: row.notes || "",
    expectedCommission: row.expected_commission,
    actualCommission: row.actual_commission,
    commissionStatus: row.commission_status,
    commissionAgreement: row.commission_agreement,
    commissionAmount: row.commission_amount || "",
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
    employmentStatus: row.employment_status || "",
    hasExistingMortgage: row.has_existing_mortgage || "",
    contractStatus: row.contract_status || "",
    propertyCity: row.property_city || "",
    requestedContactTime: row.requested_contact_time || "",
    storeStatus: row.store_status || "available",
    storePrice: toOptionalNumber(row.store_price) ?? 0,
    exclusivePrice: toOptionalNumber(row.exclusive_price) ?? 0,
    previewSummary: row.preview_summary || "",
    soldAt: row.sold_at || "",
    buyerAdvisorId: row.buyer_advisor_id || "",
  };
}

const ALLOWED_CHANGES_MAP = {
  status: "status",
  assignedAdvisor: "assigned_advisor",
  advisorPhone: "advisor_phone",
  advisorEmail: "advisor_email",
  assignedAdvisorId: "assigned_advisor_id",
  leadStatus: "lead_status",
  leadQuality: "lead_quality",
  leadPriority: "lead_priority",
  followUpDate: "follow_up_date",
  followUpStage: "follow_up_stage",
  lastContactedAt: "last_contacted_at",
  internalNotes: "internal_notes",
  notes: "notes",
  expectedCommission: "expected_commission",
  actualCommission: "actual_commission",
  commissionStatus: "commission_status",
  commissionAgreement: "commission_agreement",
  commissionAmount: "commission_amount",
  utmSource: "utm_source",
  utmMedium: "utm_medium",
  utmCampaign: "utm_campaign",
  utmContent: "utm_content",
  utmTerm: "utm_term",
  employmentStatus: "employment_status",
  hasExistingMortgage: "has_existing_mortgage",
  contractStatus: "contract_status",
  propertyCity: "property_city",
  requestedContactTime: "requested_contact_time",
  storeStatus: "store_status",
  storePrice: "store_price",
  exclusivePrice: "exclusive_price",
  previewSummary: "preview_summary",
  soldAt: "sold_at",
  buyerAdvisorId: "buyer_advisor_id",
};

function toPartialRow(changes) {
  const patch = { last_updated: new Date().toISOString() };
  for (const [camel, snake] of Object.entries(ALLOWED_CHANGES_MAP)) {
    if (Object.prototype.hasOwnProperty.call(changes, camel)) patch[snake] = changes[camel];
  }
  return patch;
}

export const LEAD_STATUSES = ["חדש", "נשלח ליועץ", "בטיפול", "אושר עקרונית", "נסגר", "לא רלוונטי"];
export const COMMISSION_STATUSES = ["pending", "invoiced", "paid"];
export const LEAD_QUALITIES = ["לא סווג", "חם", "בינוני", "חלש"];
export const LEAD_PRIORITIES = ["גבוה", "רגיל", "נמוך"];
export const FOLLOW_UP_STAGES = ["לא טופל", "ניסיון 1", "ניסיון 2", "נקבעה שיחה", "נשלחו מסמכים", "ממתין ללקוח", "נסגר"];

export async function readLeads() {
  assertConfig();
  const columns = [...LEADS_SELECT_COLUMNS];

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
    const missingColumn = extractMissingColumn(payload.bodyText);
    if (res.status === 400 && missingColumn && columns.includes(missingColumn)) {
      logSupabase("select.leads.retry_without_column", { missingColumn, status: res.status, body: payload.bodyText });
      columns.splice(columns.indexOf(missingColumn), 1);
      continue;
    }

    logSupabase("select.leads.error", { status: res.status, body: payload.bodyText, errorCode: payload.errorCode, errorMessage: payload.errorMessage });
    throw new LeadStoreError("SUPABASE_READ_FAILED", `Supabase readLeads ${res.status}`, payload.bodyText);
  }
  return [];
}

export function getSupabaseAdminHealthUrl() {
  assertConfig();
  return `${getSupabaseUrl()}/rest/v1/leads?select=id&limit=1`;
}

export async function readAdvisors() {
  assertConfig();
  const url = endpoint(ADVISORS_TABLE, "order=name.asc");
  logSupabase("select.advisors.request", { url, method: "GET", table: ADVISORS_TABLE });
  const res = await fetch(url, { method: "GET", headers: baseHeaders() });
  if (!res.ok) {
    const payload = await safeReadResponse("select.advisors.error", res);
    logSupabase("select.advisors.error", { status: res.status, body: payload.bodyText, errorCode: payload.errorCode, errorMessage: payload.errorMessage });
    throw new LeadStoreError("SUPABASE_READ_FAILED", `Supabase readAdvisors ${res.status}`, payload.bodyText);
  }
  const payload = await safeReadResponse("select.advisors.success", res);
  return Array.isArray(payload.parsed) ? payload.parsed : [];
}

function advisorToRow(advisor) {
  const row = {
    advisor_id: advisor.advisorId,
    name: advisor.name,
    phone: advisor.phone,
    email: advisor.email,
    active: advisor.active,
    commission_type: advisor.commissionType,
    commission_amount: advisor.commissionAmount,
  };
  if (advisor.passwordHash !== undefined) row.password_hash = advisor.passwordHash;
  return row;
}

export async function createAdvisor(payload) {
  assertConfig();
  const res = await fetch(endpoint(ADVISORS_TABLE), {
    method: "POST",
    headers: { ...baseHeaders(), Prefer: "return=representation,resolution=merge-duplicates" },
    body: JSON.stringify(advisorToRow(payload)),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
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

  const res = await fetch(endpoint(ADVISORS_TABLE, `advisor_id=eq.${encodeURIComponent(advisorId)}`), {
    method: "PATCH",
    headers: { ...baseHeaders(), Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
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
    id: randomUUID(),
    createdAt: lead.createdAt || now,
    lastUpdated: now,
    name: lead.name || "",
    phone: lead.phone || "",
    city: lead.city || "",
    mortgageAmount: Number(lead.mortgageAmount || lead.mortgage || analysis.mortgage || 0),
    purchaseStatus: lead.purchaseStatus || "",
    approvalScore: Number(lead.approval || analysis.approval || 0),
    mainIssue: lead.mainIssue || analysis.mainIssue || "",
    source: lead.source || "mortgai2",
    status: "חדש",
    assignedAdvisor: "", advisorPhone: "", advisorEmail: "", assignedAdvisorId: "",
    leadStatus: "חדש",
    followUpDate: "", followUpStage: "לא טופל", lastContactedAt: "",
    internalNotes: "", notes: "",
    expectedCommission: "", actualCommission: "", commissionStatus: "pending", commissionAgreement: "", commissionAmount: "",
    utmSource: lead.utmSource || "", utmMedium: lead.utmMedium || "", utmCampaign: lead.utmCampaign || "", utmContent: lead.utmContent || "", utmTerm: lead.utmTerm || "",
    referrer: lead.referrer || "",
    landingPage: lead.landingPage || lead.landing_page || lead.landingPath || "",
    estimatedApprovalResult: toOptionalNumber(lead.estimatedApprovalResult ?? lead.estimated_approval_result ?? analysis.estimatedApprovalResult),
    estimatedPayment: toOptionalNumber(lead.estimatedPayment ?? lead.estimated_payment ?? analysis.estimatedPayment),
    propertyPrice: toOptionalNumber(lead.propertyPrice ?? lead.property_price ?? analysis.propertyPrice),
    equityAmount: toOptionalNumber(lead.equityAmount ?? lead.equity_amount ?? analysis.equityAmount),
    monthlyIncome: toOptionalNumber(lead.monthlyIncome ?? lead.monthly_income ?? analysis.monthlyIncome),
    debtLevel: toOptionalNumber(lead.debtLevel ?? lead.debt_level ?? analysis.debtLevel),
    employmentStatus: lead.employmentStatus || lead.employment_status || "",
    hasExistingMortgage: lead.hasExistingMortgage || lead.has_existing_mortgage || "",
    contractStatus: lead.contractStatus || lead.contract_status || lead.purchaseStatus || "",
    propertyCity: lead.propertyCity || lead.property_city || lead.city || "",
    requestedContactTime: lead.requestedContactTime || lead.requested_contact_time || "",
  };
  record.leadQuality = lead.leadQuality || inferLeadQuality(record);
  record.leadPriority = lead.leadPriority || inferLeadPriority(record.leadQuality);

  const candidate = { ...toRow(record) };
  const removedColumns = [];
  while (Object.keys(candidate).length > 0) {
    logSupabase("insert.leads.request", { table: LEADS_TABLE, columns: Object.keys(candidate) });
    const res = await fetch(endpoint(LEADS_TABLE), {
      method: "POST",
      headers: { ...baseHeaders(), Prefer: "return=representation" },
      body: JSON.stringify(candidate),
    });

    if (res.ok) {
      const rows = await res.json();
      return Array.isArray(rows) && rows.length > 0 ? fromRow(rows[0]) : fromRow(candidate);
    }

    const body = await res.text().catch(() => "");
    const missingColumn = extractMissingColumn(body);
    if (res.status === 400 && missingColumn && Object.prototype.hasOwnProperty.call(candidate, missingColumn)) {
      logSupabase("insert.leads.retry_without_column", { missingColumn, status: res.status });
      removedColumns.push(missingColumn);
      delete candidate[missingColumn];
      continue;
    }

    logSupabase("insert.leads.error", { status: res.status, body, removedColumns, remainingColumns: Object.keys(candidate) });
    throw new LeadStoreError("SUPABASE_CREATE_FAILED", `Supabase createLead ${res.status}`, body);
  }
  throw new LeadStoreError("SUPABASE_INSERT_EMPTY_PAYLOAD", "Supabase createLead failed after dropping unknown columns");
}

export async function updateLead(id, changes = {}) {
  assertConfig();
  const patch = toPartialRow(changes);
  const candidate = { ...patch };
  while (Object.keys(candidate).length > 0) {
    const res = await fetch(endpoint(LEADS_TABLE, `id=eq.${encodeURIComponent(id)}`), {
      method: "PATCH",
      headers: { ...baseHeaders(), Prefer: "return=representation" },
      body: JSON.stringify(candidate),
    });
    if (res.ok) {
      const rows = await res.json();
      return Array.isArray(rows) && rows.length > 0 ? fromRow(rows[0]) : null;
    }
    const body = await res.text().catch(() => "");
    const missingColumn = extractMissingColumn(body);
    if (res.status === 400 && missingColumn && Object.prototype.hasOwnProperty.call(candidate, missingColumn)) {
      delete candidate[missingColumn];
      continue;
    }
    throw new LeadStoreError("SUPABASE_UPDATE_FAILED", `Supabase updateLead ${res.status}`, body);
  }
  return null;
}

export async function deleteLead(id) {
  assertConfig();
  const res = await fetch(endpoint(LEADS_TABLE, `id=eq.${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers: { ...baseHeaders(), Prefer: "return=representation" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new LeadStoreError("SUPABASE_DELETE_FAILED", `Supabase deleteLead ${res.status}`, body);
  }
  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) && rows.length > 0 ? fromRow(rows[0]) : null;
}

function isTableMissingError(body = "") {
  return /relation .+ does not exist/i.test(String(body)) || /table .+ does not exist/i.test(String(body));
}

export async function readStoreLeads() {
  const allLeads = await readLeads();
  return allLeads
    .filter((lead) => {
      if (lead.leadQuality === "חלש") return false;
      const st = lead.storeStatus || "available";
      if (st === "sold" || st === "hidden") return false;
      return true;
    })
    .map((lead) => ({
      id: lead.id,
      createdAt: lead.createdAt,
      city: lead.city,
      mortgageAmount: lead.mortgageAmount,
      propertyPrice: lead.propertyPrice,
      approvalScore: Number(lead.approvalScore || lead.estimatedApprovalResult || 0),
      leadQuality: lead.leadQuality,
      mainIssue: lead.mainIssue,
      previewSummary: lead.previewSummary || "",
      storeStatus: lead.storeStatus || "available",
      storePrice: lead.storePrice || 0,
      exclusivePrice: lead.exclusivePrice || 0,
      contractStatus: lead.contractStatus || "",
      employmentStatus: lead.employmentStatus || "",
    }));
}

export async function createLeadPurchase({ leadId, advisorId, purchaseType = "regular", price = 0, isExclusive = false }) {
  assertConfig();
  const record = {
    lead_id: leadId,
    advisor_id: advisorId,
    purchase_type: purchaseType,
    price,
    is_exclusive: isExclusive,
    purchased_at: new Date().toISOString(),
  };

  let res;
  try {
    res = await fetch(endpoint(LEAD_PURCHASES_TABLE), {
      method: "POST",
      headers: { ...baseHeaders(), Prefer: "return=representation" },
      body: JSON.stringify(record),
    });
  } catch (error) {
    logFetchError("insert.lead_purchases", error);
    throw new LeadStoreError("SUPABASE_CREATE_FAILED", "Lead purchase insert fetch failed", error?.message || String(error));
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (isTableMissingError(body)) {
      throw new LeadStoreError("TABLE_MISSING", "lead_purchases table does not exist — run the SQL migration", body);
    }
    throw new LeadStoreError("SUPABASE_CREATE_FAILED", `createLeadPurchase ${res.status}`, body);
  }

  if (isExclusive) {
    try {
      await updateLead(leadId, { storeStatus: "sold", buyerAdvisorId: advisorId, soldAt: new Date().toISOString() });
    } catch {
      logSupabase("purchase.exclusive_status_update_failed", { leadId });
    }
  }

  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : record;
}

export async function readMyLeads(advisorId) {
  assertConfig();
  const url = endpoint(LEAD_PURCHASES_TABLE, `advisor_id=eq.${encodeURIComponent(advisorId)}&order=purchased_at.desc`);
  let res;
  try {
    res = await fetch(url, { method: "GET", headers: baseHeaders() });
  } catch (error) {
    logFetchError("select.my_leads", error);
    throw new LeadStoreError("SUPABASE_READ_FAILED", "readMyLeads fetch failed", error?.message || String(error));
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (isTableMissingError(body)) return [];
    throw new LeadStoreError("SUPABASE_READ_FAILED", `readMyLeads ${res.status}`, body);
  }

  const payload = await safeReadResponse("select.my_leads.success", res);
  const purchases = Array.isArray(payload.parsed) ? payload.parsed : [];
  if (purchases.length === 0) return [];

  const purchasedLeadIds = new Set(purchases.map((p) => p.lead_id).filter(Boolean));
  const allLeads = await readLeads();

  return allLeads
    .filter((lead) => purchasedLeadIds.has(lead.id))
    .map((lead) => {
      const purchase = purchases.find((p) => p.lead_id === lead.id);
      return {
        ...lead,
        purchaseType: purchase?.purchase_type || "regular",
        purchasedAt: purchase?.purchased_at || "",
        isExclusive: purchase?.is_exclusive || false,
        purchasePrice: toOptionalNumber(purchase?.price) ?? 0,
      };
    });
}

const ADVISOR_APPLICATIONS_TABLE = "advisor_applications";

function appToRow(app) {
  return {
    full_name: app.fullName || "",
    phone: app.phone || "",
    email: app.email || "",
    region: app.region || "",
    business_name: app.businessName || "",
    experience_years: app.experienceYears || "",
    advisor_type: app.advisorType || "",
    notes: app.notes || "",
    status: app.status || "pending",
    admin_notes: app.adminNotes || "",
  };
}

function appFromRow(row = {}) {
  return {
    id: row.id,
    createdAt: row.created_at,
    fullName: row.full_name || "",
    phone: row.phone || "",
    email: row.email || "",
    region: row.region || "",
    businessName: row.business_name || "",
    experienceYears: row.experience_years || "",
    advisorType: row.advisor_type || "",
    notes: row.notes || "",
    status: row.status || "pending",
    adminNotes: row.admin_notes || "",
  };
}

export async function createAdvisorApplication(payload) {
  assertConfig();
  const res = await fetch(endpoint(ADVISOR_APPLICATIONS_TABLE), {
    method: "POST",
    headers: { ...baseHeaders(), Prefer: "return=representation" },
    body: JSON.stringify(appToRow(payload)),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (isTableMissingError(body)) {
      throw new LeadStoreError("TABLE_MISSING", "advisor_applications table does not exist — run the SQL migration", body);
    }
    throw new LeadStoreError("SUPABASE_CREATE_FAILED", `createAdvisorApplication ${res.status}`, body);
  }
  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) && rows.length > 0 ? appFromRow(rows[0]) : appFromRow(appToRow(payload));
}

export async function readAdvisorApplications() {
  assertConfig();
  const url = endpoint(ADVISOR_APPLICATIONS_TABLE, "order=created_at.desc");
  const res = await fetch(url, { method: "GET", headers: baseHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (isTableMissingError(body)) return [];
    throw new LeadStoreError("SUPABASE_READ_FAILED", `readAdvisorApplications ${res.status}`, body);
  }
  const payload = await safeReadResponse("select.advisor_applications.success", res);
  return Array.isArray(payload.parsed) ? payload.parsed.map(appFromRow) : [];
}

export async function updateAdvisorApplication(id, changes) {
  assertConfig();
  const patch = {};
  if (Object.prototype.hasOwnProperty.call(changes, "status")) patch.status = changes.status;
  if (Object.prototype.hasOwnProperty.call(changes, "adminNotes")) patch.admin_notes = changes.adminNotes;
  const res = await fetch(endpoint(ADVISOR_APPLICATIONS_TABLE, `id=eq.${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: { ...baseHeaders(), Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new LeadStoreError("SUPABASE_UPDATE_FAILED", `updateAdvisorApplication ${res.status}`, body);
  }
  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) && rows.length > 0 ? appFromRow(rows[0]) : null;
}

export function isAdminPassword(value) {
  const expected = String(process.env.ADMIN_PASSWORD || "").trim();
  const submitted = String(value || "").trim();
  if (!expected || expected.length !== submitted.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(submitted));
}
