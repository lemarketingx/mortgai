import { randomUUID, timingSafeEqual } from "crypto";
import { PIPELINE_STAGES, normalizePipelineStage } from "./pipeline";
import { computePricing } from "./leadScoring";
import {
  calculateCollateralProgress,
  calculateOverallMortgageProgress,
  normalizeAppraisalStatus,
  normalizeFundsReleaseStatus,
} from "./mortgageCase";

export { CLOSED_LOST_REASONS, PIPELINE_PROGRESS, PIPELINE_STAGE_LABELS, PIPELINE_STAGES, getPipelineProgress, getPipelineStageLabel, normalizePipelineStage } from "./pipeline";

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
  "first_contact_at", "last_activity_at", "heat_score", "missing_documents_count",
  "pipeline_stage", "stage_updated_at", "next_action", "next_action_at",
  "bank_name", "mortgage_type", "documents_completion_percent",
  "appraiser_name", "appraiser_phone", "appraisal_date", "appraisal_cost", "appraisal_report_received", "appraisal_status",
  "buyer_lawyer_name", "buyer_lawyer_phone", "buyer_lawyer_email",
  "seller_lawyer_name", "seller_lawyer_phone", "seller_lawyer_email",
  "legal_contract_received", "legal_rights_received", "legal_registration_received",
  "signing_date", "signing_location", "signing_notes",
  "collateral_life_insurance", "collateral_property_insurance", "collateral_mortgage_registration", "collateral_pledge_registration", "collateral_municipality_documents",
  "collateral_completion_percent", "funds_release_status", "overall_progress_percent",
];

// Reduced column set for the advisor list/kanban page — omits detail-only fields
// to cut Supabase → server payload roughly in half.
const LEADS_LIST_COLUMNS = [
  "id", "created_at",
  "name", "phone", "city", "property_city",
  "mortgage_amount", "purchase_status",
  "approval_score", "estimated_approval_result", "lead_quality",
  "pipeline_stage", "lead_status",
  "follow_up_date", "last_activity_at", "stage_updated_at",
  "next_action", "next_action_at",
  "overall_progress_percent", "missing_documents_count",
  "documents_completion_percent", "signing_date", "appraisal_status",
  "buyer_lawyer_name", "legal_contract_received", "legal_rights_received", "legal_registration_received",
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

// Normalizes a value that must be numeric for Supabase (NOT NULL).
// Returns `fallback` (default 0) when value is empty string, null, undefined, or non-numeric.
function toNumberOrDefault(value, fallback = 0) {
  if (value === "" || value === null || value === undefined) return fallback;
  const cleaned = typeof value === "string" ? value.replace(/[₪,\s]/g, "") : value;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

// ─── Column type classification (based on supabase-schema.sql) ────────────────

// NUMERIC NOT NULL DEFAULT 0 — must never receive "" or null (use 0 as fallback).
const NUMERIC_NOT_NULL_COLS = new Set([
  "mortgage_amount", "approval_score", "store_price", "exclusive_price",
]);

// NUMERIC nullable — "" / undefined / non-numeric → null.
const NUMERIC_NULLABLE_COLS = new Set([
  "estimated_approval_result", "estimated_payment", "property_price",
  "equity_amount", "monthly_income", "debt_level", "appraisal_cost",
  "documents_completion_percent", "collateral_completion_percent",
  "overall_progress_percent", "heat_score", "missing_documents_count",
]);

// TIMESTAMPTZ / DATE NOT NULL — must always be a valid ISO string.
const TIMESTAMP_REQUIRED_COLS = new Set(["created_at", "last_updated"]);

// TIMESTAMPTZ / DATE nullable — "" / undefined / invalid → null.
// NOTE: last_contacted_at, follow_up_date, sold_at are TEXT in schema and are NOT listed here.
const TIMESTAMP_OPTIONAL_COLS = new Set([
  "stage_updated_at", "next_action_at",
  "appraisal_date", "signing_date",
  "first_contact_at", "last_activity_at",
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNumericSafe(value) {
  if (value === null || value === undefined || value === "") return null;
  const cleaned = typeof value === "string" ? value.replace(/[₪,\s]/g, "") : value;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function isValidIsoDate(value) {
  if (!value || typeof value !== "string") return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

// ─── Central sanitizer ────────────────────────────────────────────────────────
// Runs immediately before every Supabase leads insert.
// Guarantees no typed column receives "" / undefined / NaN / invalid date string.
function sanitizeLeadRowForInsert(row) {
  const sanitized = { ...row };
  const now = new Date().toISOString();
  const diagnostics = {
    emptyNumericFieldsFixed: [],
    invalidNumericFieldsFixed: [],
    emptyTimestampFieldsFixed: [],
    invalidTimestampFieldsFixed: [],
    undefinedFieldsFixed: [],
  };

  for (const col of Object.keys(sanitized)) {
    const value = sanitized[col];

    // ── Required timestamps: always emit a valid ISO string ──────────────────
    if (TIMESTAMP_REQUIRED_COLS.has(col)) {
      if (!isValidIsoDate(value)) {
        sanitized[col] = now;
        diagnostics.invalidTimestampFieldsFixed.push(col);
      }
      continue;
    }

    // ── Optional timestamps: "" / undefined / invalid → null ─────────────────
    if (TIMESTAMP_OPTIONAL_COLS.has(col)) {
      if (value === "" || value === undefined) {
        if (value === "") diagnostics.emptyTimestampFieldsFixed.push(col);
        else diagnostics.undefinedFieldsFixed.push(col);
        sanitized[col] = null;
      } else if (value !== null && !isValidIsoDate(value)) {
        diagnostics.invalidTimestampFieldsFixed.push(col);
        sanitized[col] = null;
      }
      continue;
    }

    // ── NUMERIC NOT NULL: anything invalid → 0 ───────────────────────────────
    if (NUMERIC_NOT_NULL_COLS.has(col)) {
      const n = parseNumericSafe(value);
      if (n === null) {
        if (value === "") diagnostics.emptyNumericFieldsFixed.push(col);
        else if (value === undefined || value === null) diagnostics.undefinedFieldsFixed.push(col);
        else diagnostics.invalidNumericFieldsFixed.push(col);
        sanitized[col] = 0;
      } else {
        sanitized[col] = n;
      }
      continue;
    }

    // ── NUMERIC nullable: anything invalid → null ─────────────────────────────
    if (NUMERIC_NULLABLE_COLS.has(col)) {
      if (value !== null) {
        const n = parseNumericSafe(value);
        if (n === null) {
          if (value === "") diagnostics.emptyNumericFieldsFixed.push(col);
          else if (value !== undefined) diagnostics.invalidNumericFieldsFixed.push(col);
          sanitized[col] = null;
        } else {
          sanitized[col] = n;
        }
      }
      continue;
    }

    // ── All other columns (TEXT): undefined → delete so DB uses DEFAULT ───────
    if (value === undefined) {
      diagnostics.undefinedFieldsFixed.push(col);
      delete sanitized[col];
    }
  }

  const totalFixed = Object.values(diagnostics).reduce((s, a) => s + a.length, 0);
  logSupabase("insert.sanitize", {
    ...diagnostics,
    finalColumnCount: Object.keys(sanitized).length,
    hadIssues: totalFixed > 0,
  });

  return sanitized;
}

function toBool(value) {
  return value === true || value === "true" || value === 1 || value === "1";
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
    pipeline_stage: record.pipelineStage,
    stage_updated_at: record.stageUpdatedAt,
    next_action: record.nextAction,
    next_action_at: record.nextActionAt,
    bank_name: record.bankName,
    mortgage_type: record.mortgageType,
    documents_completion_percent: record.documentsCompletionPercent,
    appraiser_name: record.appraiserName,
    appraiser_phone: record.appraiserPhone,
    appraisal_date: record.appraisalDate,
    appraisal_cost: record.appraisalCost,
    appraisal_report_received: record.appraisalReportReceived,
    appraisal_status: record.appraisalStatus,
    buyer_lawyer_name: record.buyerLawyerName,
    buyer_lawyer_phone: record.buyerLawyerPhone,
    buyer_lawyer_email: record.buyerLawyerEmail,
    seller_lawyer_name: record.sellerLawyerName,
    seller_lawyer_phone: record.sellerLawyerPhone,
    seller_lawyer_email: record.sellerLawyerEmail,
    legal_contract_received: record.legalContractReceived,
    legal_rights_received: record.legalRightsReceived,
    legal_registration_received: record.legalRegistrationReceived,
    signing_date: record.signingDate,
    signing_location: record.signingLocation,
    signing_notes: record.signingNotes,
    collateral_life_insurance: record.lifeInsurance,
    collateral_property_insurance: record.propertyInsurance,
    collateral_mortgage_registration: record.mortgageRegistration,
    collateral_pledge_registration: record.pledgeRegistration,
    collateral_municipality_documents: record.municipalityDocuments,
    collateral_completion_percent: record.collateralCompletionPercent,
    funds_release_status: record.fundsReleaseStatus,
    overall_progress_percent: record.overallProgressPercent,
  };
}

function fromRow(row = {}) {
  const pipelineStage = normalizePipelineStage(row.pipeline_stage || row.lead_status || row.status);
  const lead = {
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
    status: normalizePipelineStage(row.status || pipelineStage),
    assignedAdvisor: row.assigned_advisor,
    advisorPhone: row.advisor_phone,
    advisorEmail: row.advisor_email || "",
    assignedAdvisorId: row.assigned_advisor_id || "",
    leadStatus: normalizePipelineStage(row.lead_status || row.status || pipelineStage),
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
    storeStatus: row.store_status || "pending_review",
    storePrice: toOptionalNumber(row.store_price) ?? 0,
    exclusivePrice: toOptionalNumber(row.exclusive_price) ?? 0,
    previewSummary: row.preview_summary || "",
    soldAt: row.sold_at || "",
    buyerAdvisorId: row.buyer_advisor_id || "",
    firstContactAt: row.first_contact_at || "",
    lastActivityAt: row.last_activity_at || "",
    heatScore: toOptionalNumber(row.heat_score) ?? 0,
    missingDocumentsCount: toOptionalNumber(row.missing_documents_count) ?? 0,
    pipelineStage,
    stageUpdatedAt: row.stage_updated_at || "",
    nextAction: row.next_action || "",
    nextActionAt: row.next_action_at || "",
    bankName: row.bank_name || "",
    mortgageType: row.mortgage_type || "",
    documentsCompletionPercent: toOptionalNumber(row.documents_completion_percent) ?? 0,
    appraiserName: row.appraiser_name || "",
    appraiserPhone: row.appraiser_phone || "",
    appraisalDate: row.appraisal_date || "",
    appraisalCost: toOptionalNumber(row.appraisal_cost) ?? "",
    appraisalReportReceived: toBool(row.appraisal_report_received),
    appraisalStatus: normalizeAppraisalStatus(row.appraisal_status),
    buyerLawyerName: row.buyer_lawyer_name || "",
    buyerLawyerPhone: row.buyer_lawyer_phone || "",
    buyerLawyerEmail: row.buyer_lawyer_email || "",
    sellerLawyerName: row.seller_lawyer_name || "",
    sellerLawyerPhone: row.seller_lawyer_phone || "",
    sellerLawyerEmail: row.seller_lawyer_email || "",
    legalContractReceived: toBool(row.legal_contract_received),
    legalRightsReceived: toBool(row.legal_rights_received),
    legalRegistrationReceived: toBool(row.legal_registration_received),
    signingDate: row.signing_date || "",
    signingLocation: row.signing_location || "",
    signingNotes: row.signing_notes || "",
    lifeInsurance: toBool(row.collateral_life_insurance),
    propertyInsurance: toBool(row.collateral_property_insurance),
    mortgageRegistration: toBool(row.collateral_mortgage_registration),
    pledgeRegistration: toBool(row.collateral_pledge_registration),
    municipalityDocuments: toBool(row.collateral_municipality_documents),
    collateralCompletionPercent: toOptionalNumber(row.collateral_completion_percent),
    fundsReleaseStatus: normalizeFundsReleaseStatus(row.funds_release_status),
    overallProgressPercent: toOptionalNumber(row.overall_progress_percent),
  };
  lead.collateralCompletionPercent = lead.collateralCompletionPercent ?? calculateCollateralProgress(lead);
  lead.overallProgressPercent = lead.overallProgressPercent ?? calculateOverallMortgageProgress(lead);
  return lead;
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
  firstContactAt: "first_contact_at",
  lastActivityAt: "last_activity_at",
  heatScore: "heat_score",
  missingDocumentsCount: "missing_documents_count",
  pipelineStage: "pipeline_stage",
  stageUpdatedAt: "stage_updated_at",
  nextAction: "next_action",
  nextActionAt: "next_action_at",
  bankName: "bank_name",
  mortgageType: "mortgage_type",
  documentsCompletionPercent: "documents_completion_percent",
  appraiserName: "appraiser_name",
  appraiserPhone: "appraiser_phone",
  appraisalDate: "appraisal_date",
  appraisalCost: "appraisal_cost",
  appraisalReportReceived: "appraisal_report_received",
  appraisalStatus: "appraisal_status",
  buyerLawyerName: "buyer_lawyer_name",
  buyerLawyerPhone: "buyer_lawyer_phone",
  buyerLawyerEmail: "buyer_lawyer_email",
  sellerLawyerName: "seller_lawyer_name",
  sellerLawyerPhone: "seller_lawyer_phone",
  sellerLawyerEmail: "seller_lawyer_email",
  legalContractReceived: "legal_contract_received",
  legalRightsReceived: "legal_rights_received",
  legalRegistrationReceived: "legal_registration_received",
  signingDate: "signing_date",
  signingLocation: "signing_location",
  signingNotes: "signing_notes",
  lifeInsurance: "collateral_life_insurance",
  propertyInsurance: "collateral_property_insurance",
  mortgageRegistration: "collateral_mortgage_registration",
  pledgeRegistration: "collateral_pledge_registration",
  municipalityDocuments: "collateral_municipality_documents",
  collateralCompletionPercent: "collateral_completion_percent",
  fundsReleaseStatus: "funds_release_status",
  overallProgressPercent: "overall_progress_percent",
};

function toPartialRow(changes) {
  const patch = { last_updated: new Date().toISOString() };
  for (const [camel, snake] of Object.entries(ALLOWED_CHANGES_MAP)) {
    if (Object.prototype.hasOwnProperty.call(changes, camel)) {
      if (["pipelineStage", "leadStatus", "status"].includes(camel)) {
        patch[snake] = normalizePipelineStage(changes[camel]);
      } else if (camel === "appraisalStatus") {
        patch[snake] = normalizeAppraisalStatus(changes[camel]);
      } else if (camel === "fundsReleaseStatus") {
        patch[snake] = normalizeFundsReleaseStatus(changes[camel]);
      } else {
        patch[snake] = changes[camel];
      }
    }
  }
  return patch;
}

export const LEAD_STATUSES = [
  ...PIPELINE_STAGES,
  // legacy — kept so old DB rows don't fail validation
  "חדש", "מחכים למסמכים", "פגישה נקבעה", "נסגר", "אבוד", "נשלח ליועץ", "בטיפול", "נקבעה שיחה", "אושר עקרונית",
  "ליד חדש", "נוצר קשר", "נשלחה רשימת מסמכים", "מחכה למסמכים", "מסמכים התקבלו", "בדיקת זכאות", "הוגש לבנק",
  "אישור עקרוני", 'מו"מ מול בנקים', "משא ומתן מול בנקים", "נבחר תמהיל", "נקבעו חתימות", "נסגר בהצלחה",
  "לא עונה", "לא רלוונטי", "נדחה בבנק", "עבר ליועץ אחר", "בוטל",
];
export const COMMISSION_STATUSES = ["pending", "invoiced", "paid"];
export const LEAD_QUALITIES = ["לא סווג", "חם", "בינוני", "חלש"];
export const LEAD_PRIORITIES = ["גבוה", "רגיל", "נמוך"];
export const FOLLOW_UP_STAGES = ["לא טופל", "ניסיון 1", "ניסיון 2", "נקבעה שיחה", "נשלחו מסמכים", "ממתין ללקוח", "נסגר"];

async function readLeadsWithColumns(columnsIn) {
  assertConfig();
  const columns = [...columnsIn];

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

export async function readLeads() {
  return readLeadsWithColumns(LEADS_SELECT_COLUMNS);
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
  if (advisor.authUserId !== undefined) row.auth_user_id = advisor.authUserId;
  if (advisor.region !== undefined) row.region = advisor.region;
  if (advisor.advisorType !== undefined) row.advisor_type = advisor.advisorType;
  if (advisor.businessName !== undefined) row.business_name = advisor.businessName;
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
  if (Object.prototype.hasOwnProperty.call(changes, "authUserId")) patch.auth_user_id = changes.authUserId;
  if (Object.prototype.hasOwnProperty.call(changes, "region")) patch.region = changes.region;
  if (Object.prototype.hasOwnProperty.call(changes, "advisorType")) patch.advisor_type = changes.advisorType;
  if (Object.prototype.hasOwnProperty.call(changes, "businessName")) patch.business_name = changes.businessName;

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
    mortgageAmount: toNumberOrDefault(lead.mortgageAmount ?? lead.mortgage ?? analysis.mortgage),
    purchaseStatus: lead.purchaseStatus || "",
    approvalScore: toNumberOrDefault(lead.approvalScore ?? lead.approval ?? analysis.approval),
    mainIssue: lead.mainIssue || analysis.mainIssue || "",
    source: lead.source || "mortgai2",
    status: "new_lead",
    assignedAdvisor: "", advisorPhone: "", advisorEmail: "", assignedAdvisorId: "",
    leadStatus: "new_lead",
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
    pipelineStage: normalizePipelineStage(lead.pipelineStage || lead.pipeline_stage || lead.leadStatus || lead.lead_status || "new_lead"),
    stageUpdatedAt: lead.stageUpdatedAt || lead.stage_updated_at || now,
    nextAction: lead.nextAction || lead.next_action || "",
    nextActionAt: lead.nextActionAt || lead.next_action_at || "",
    bankName: lead.bankName || lead.bank_name || "",
    mortgageType: lead.mortgageType || lead.mortgage_type || "",
    documentsCompletionPercent: toOptionalNumber(lead.documentsCompletionPercent ?? lead.documents_completion_percent) ?? 0,
    appraiserName: lead.appraiserName || lead.appraiser_name || "",
    appraiserPhone: lead.appraiserPhone || lead.appraiser_phone || "",
    appraisalDate: lead.appraisalDate || lead.appraisal_date || "",
    appraisalCost: toOptionalNumber(lead.appraisalCost ?? lead.appraisal_cost) ?? null,
    appraisalReportReceived: toBool(lead.appraisalReportReceived ?? lead.appraisal_report_received),
    appraisalStatus: normalizeAppraisalStatus(lead.appraisalStatus || lead.appraisal_status),
    buyerLawyerName: lead.buyerLawyerName || lead.buyer_lawyer_name || "",
    buyerLawyerPhone: lead.buyerLawyerPhone || lead.buyer_lawyer_phone || "",
    buyerLawyerEmail: lead.buyerLawyerEmail || lead.buyer_lawyer_email || "",
    sellerLawyerName: lead.sellerLawyerName || lead.seller_lawyer_name || "",
    sellerLawyerPhone: lead.sellerLawyerPhone || lead.seller_lawyer_phone || "",
    sellerLawyerEmail: lead.sellerLawyerEmail || lead.seller_lawyer_email || "",
    legalContractReceived: toBool(lead.legalContractReceived ?? lead.legal_contract_received),
    legalRightsReceived: toBool(lead.legalRightsReceived ?? lead.legal_rights_received),
    legalRegistrationReceived: toBool(lead.legalRegistrationReceived ?? lead.legal_registration_received),
    signingDate: lead.signingDate || lead.signing_date || "",
    signingLocation: lead.signingLocation || lead.signing_location || "",
    signingNotes: lead.signingNotes || lead.signing_notes || "",
    lifeInsurance: toBool(lead.lifeInsurance ?? lead.collateral_life_insurance),
    propertyInsurance: toBool(lead.propertyInsurance ?? lead.collateral_property_insurance),
    mortgageRegistration: toBool(lead.mortgageRegistration ?? lead.collateral_mortgage_registration),
    pledgeRegistration: toBool(lead.pledgeRegistration ?? lead.collateral_pledge_registration),
    municipalityDocuments: toBool(lead.municipalityDocuments ?? lead.collateral_municipality_documents),
    fundsReleaseStatus: normalizeFundsReleaseStatus(lead.fundsReleaseStatus || lead.funds_release_status),
  };
  record.collateralCompletionPercent = calculateCollateralProgress(record);
  record.overallProgressPercent = calculateOverallMortgageProgress(record);
  record.leadStatus = record.pipelineStage;
  record.status = record.pipelineStage;
  record.leadQuality = lead.leadQuality || inferLeadQuality(record);
  record.leadPriority = lead.leadPriority || inferLeadPriority(record.leadQuality);

  const candidate = sanitizeLeadRowForInsert(toRow(record));
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
  const available = allLeads.filter((lead) => {
    if (lead.leadQuality === "חלש") return false;
    if (lead.storeStatus !== "available") return false;
    return true;
  });

  // Fetch purchase counts per lead from lead_purchases (no schema change needed)
  let purchaseCounts = {};
  if (available.length > 0) {
    try {
      const ids = available.map((l) => l.id).join(",");
      const url = endpoint(LEAD_PURCHASES_TABLE, `lead_id=in.(${ids})&select=lead_id`);
      const res = await fetch(url, { method: "GET", headers: baseHeaders() });
      if (res.ok) {
        const rows = await res.json().catch(() => []);
        for (const row of rows) {
          purchaseCounts[row.lead_id] = (purchaseCounts[row.lead_id] || 0) + 1;
        }
      }
    } catch {
      // Non-critical — proceed without counts
    }
  }

  return available.map((lead) => {
    const purchaseCount = purchaseCounts[lead.id] || 0;

    // Compute FINZO score and dynamic pricing. Pass boolean flags for name/phone
    // so the scoring engine can measure data completeness without exposing PII.
    const pricing = computePricing({
      hasName:              Boolean(lead.name),
      hasPhone:             Boolean(lead.phone),
      city:                 lead.city,
      mortgageAmount:       lead.mortgageAmount,
      monthlyIncome:        lead.monthlyIncome,
      equityAmount:         lead.equityAmount,
      debtLevel:            lead.debtLevel,
      purchaseStatus:       lead.purchaseStatus,
      requestedContactTime: lead.requestedContactTime,
      hasExistingMortgage:  lead.hasExistingMortgage,
      createdAt:            lead.createdAt,
      purchaseCount,
    });

    // Dynamic price overrides DB stored price. If admin has set a manual price
    // (storePrice > 0), honour it; otherwise use the computed dynamic price.
    const finalRegular   = lead.storePrice > 0   ? lead.storePrice   : pricing.regularPrice;
    const finalExclusive = lead.exclusivePrice > 0 ? lead.exclusivePrice : pricing.exclusivePrice;

    return {
      id:               lead.id,
      createdAt:        lead.createdAt,
      city:             lead.city,
      mortgageAmount:   lead.mortgageAmount,
      propertyPrice:    lead.propertyPrice,
      approvalScore:    Number(lead.approvalScore || lead.estimatedApprovalResult || 0),
      leadQuality:      lead.leadQuality,
      mainIssue:        lead.mainIssue,
      previewSummary:   lead.previewSummary || "",
      storeStatus:      lead.storeStatus || "available",
      storePrice:       finalRegular,
      exclusivePrice:   finalExclusive,
      contractStatus:   lead.contractStatus || "",
      employmentStatus: lead.employmentStatus || "",
      purchaseStatus:   lead.purchaseStatus || "",
      purchaseCount,
      // Scoring & transparency fields
      finzoScore:          pricing.finzoScore,
      computedQuality:     pricing.quality,
      regularBasePrice:    pricing.regularBasePrice,
      exclusiveBasePrice:  pricing.exclusiveBasePrice,
      ageDiscountPct:      pricing.ageDiscountPct,
      pricingBullets:      pricing.bullets,
    };
  });
}

export async function createLeadPurchase({ leadId, advisorId, purchaseType = "regular", price = 0, isExclusive = false }) {
  assertConfig();
  const record = {
    id: randomUUID(),
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
    logSupabase("insert.lead_purchases.error", { status: res.status, body });
    if (isTableMissingError(body)) {
      throw new LeadStoreError("TABLE_MISSING", "lead_purchases table does not exist — run the SQL migration", body);
    }
    throw new LeadStoreError("SUPABASE_CREATE_FAILED", `createLeadPurchase ${res.status}`, body);
  }

  const rows = await res.json().catch(() => []);
  const purchase = Array.isArray(rows) && rows.length > 0 ? rows[0] : record;

  if (isExclusive) {
    // Must mark the lead sold. If this fails, the purchase row exists but the lead remains
    // visible in the store — throw so the caller can surface the error rather than silently
    // leaving an exclusive lead purchasable again.
    // Note: true atomicity requires a DB transaction; this is the minimal safe improvement.
    try {
      await updateLead(leadId, { storeStatus: "sold", buyerAdvisorId: advisorId, soldAt: new Date().toISOString() });
    } catch (err) {
      logSupabase("purchase.exclusive_status_update_failed", { leadId, error: err?.message });
      throw new LeadStoreError(
        "EXCLUSIVE_STATUS_UPDATE_FAILED",
        "הרכישה הבלעדית נרשמה אך עדכון סטטוס הליד נכשל. צרו קשר עם התמיכה.",
        err?.message || String(err),
      );
    }
  }

  return purchase;
}

export async function readAdvisorPurchasedLeadIds(advisorId) {
  assertConfig();
  const url = endpoint(LEAD_PURCHASES_TABLE, `advisor_id=eq.${encodeURIComponent(advisorId)}&select=lead_id`);
  try {
    const res = await fetch(url, { method: "GET", headers: baseHeaders() });
    if (!res.ok) return new Set();
    const rows = await res.json().catch(() => []);
    return new Set(Array.isArray(rows) ? rows.map((r) => r.lead_id).filter(Boolean) : []);
  } catch {
    // Non-critical for store display; fail-open so transient errors don't block the page
    return new Set();
  }
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

// List-optimized variant: fetches only the columns the advisor list/kanban page needs.
// Reduces Supabase → server payload to ~27 columns instead of 70+.
export async function readMyLeadsForList(advisorId) {
  assertConfig();
  const url = endpoint(LEAD_PURCHASES_TABLE, `advisor_id=eq.${encodeURIComponent(advisorId)}&order=purchased_at.desc`);
  let res;
  try {
    res = await fetch(url, { method: "GET", headers: baseHeaders() });
  } catch (error) {
    logFetchError("select.my_leads_list", error);
    throw new LeadStoreError("SUPABASE_READ_FAILED", "readMyLeadsForList fetch failed", error?.message || String(error));
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (isTableMissingError(body)) return [];
    throw new LeadStoreError("SUPABASE_READ_FAILED", `readMyLeadsForList ${res.status}`, body);
  }

  const payload = await safeReadResponse("select.my_leads_list.success", res);
  const purchases = Array.isArray(payload.parsed) ? payload.parsed : [];
  if (purchases.length === 0) return [];

  const purchasedLeadIds = new Set(purchases.map((p) => p.lead_id).filter(Boolean));
  const allLeads = await readLeadsWithColumns(LEADS_LIST_COLUMNS);

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

export function isAdminPassword(value) {
  const expected = String(process.env.ADMIN_PASSWORD || "").trim();
  const submitted = String(value || "").trim();
  if (!expected || expected.length !== submitted.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(submitted));
}
