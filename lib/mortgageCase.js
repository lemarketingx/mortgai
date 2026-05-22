import { getPipelineProgress } from "./pipeline";

// ─── Case Types (Phase 1) ─────────────────────────────────────────────────────
// 6 supported mortgage case types. Stored in lead.mortgageType field.
export const CASE_TYPES = [
  "רכישת דירה יד 2",
  "רכישת דירה מקבלן",
  "מחזור משכנתא",
  "בנייה עצמית",
  "רכישת מגרש",
  "שיעבוד נכס קיים",
];

export const CASE_TYPE_ICONS = {
  "רכישת דירה יד 2":   "🏠",
  "רכישת דירה מקבלן": "🏗",
  "מחזור משכנתא":      "🔄",
  "בנייה עצמית":       "🔨",
  "רכישת מגרש":        "🌳",
  "שיעבוד נכס קיים":   "🔒",
};

export function normalizeCaseType(value) {
  const v = String(value || "").trim();
  return CASE_TYPES.includes(v) ? v : "";
}

export function isRefinanceCase(caseType) {
  return caseType === "מחזור משכנתא";
}

export const MORTGAGE_DOCUMENTS = [
  { key: "id_card", label: "תעודת זהות", appliesTo: "all" },
  { key: "id_appendix", label: "ספח תעודת זהות", appliesTo: "all" },
  { key: "salary_slips_3", label: "3 תלושי שכר", appliesTo: "employee" },
  { key: "bank_statements_3", label: 'דפי עו"ש 3 חודשים', appliesTo: "all" },
  { key: "employment_confirmation", label: "אישור העסקה", appliesTo: "employee" },
  { key: "purchase_contract", label: "חוזה רכישה", appliesTo: "all" },
  { key: "land_registry", label: "נסח טאבו / אישור זכויות", appliesTo: "all" },
  { key: "equity_confirmations", label: "אישורי הון עצמי", appliesTo: "all" },
  { key: "existing_loans", label: "אישורי הלוואות קיימות", appliesTo: "all" },
  { key: "tax_assessment", label: "שומת מס", appliesTo: "self_employed" },
  { key: "profit_loss_report", label: "דוח רווח והפסד", appliesTo: "self_employed" },
  { key: "accountant_confirmation", label: 'אישור רו"ח', appliesTo: "self_employed" },
  // Refinance-specific documents
  { key: "mortgage_statement", label: "דוח התנהלות משכנתא", appliesTo: "refinance" },
  { key: "payoff_report", label: "דוח יתרות לסילוק", appliesTo: "refinance" },
];

export const DOCUMENT_STATUSES = ["missing", "requested", "received", "approved", "rejected", "not_required"];

export const DOCUMENT_STATUS_LABELS = {
  missing: "חסר",
  requested: "התבקש",
  received: "התקבל",
  approved: "אושר",
  rejected: "לא תקין",
  not_required: "לא רלוונטי",
};

export const DOCUMENT_STATUS_MARKS = {
  missing:      "❌",
  requested:    "⏳",
  received:     "📥",
  approved:     "✓",
  rejected:     "❌",
  not_required: "—",
};

export const APPRAISAL_STATUSES = ["not_ordered", "ordered", "visit_completed", "report_received"];

export const APPRAISAL_STATUS_LABELS = {
  not_ordered: "לא הוזמנה",
  ordered: "הוזמנה",
  visit_completed: "ביקור בוצע",
  report_received: "דוח התקבל",
};

export const APPRAISAL_PROGRESS = {
  not_ordered: 0,
  ordered: 35,
  visit_completed: 70,
  report_received: 100,
};

export const LEGAL_CHECKLIST = [
  { key: "legalContractReceived", column: "legal_contract_received", label: "חוזה התקבל" },
  { key: "legalRightsReceived", column: "legal_rights_received", label: "אישור זכויות התקבל" },
  { key: "legalRegistrationReceived", column: "legal_registration_received", label: "רישום התקבל" },
];

export const COLLATERAL_CHECKLIST = [
  { key: "lifeInsurance", column: "collateral_life_insurance", label: "ביטוח חיים" },
  { key: "propertyInsurance", column: "collateral_property_insurance", label: "ביטוח נכס" },
  { key: "mortgageRegistration", column: "collateral_mortgage_registration", label: "רישום משכנתא" },
  { key: "pledgeRegistration", column: "collateral_pledge_registration", label: "רישום משכון" },
  { key: "municipalityDocuments", column: "collateral_municipality_documents", label: "מסמכי עירייה" },
];

export const FUNDS_RELEASE_STATUSES = ["not_released", "partially_released", "fully_released"];

export const FUNDS_RELEASE_STATUS_LABELS = {
  not_released: "לא שוחררו",
  partially_released: "שוחררו חלקית",
  fully_released: "שוחררו במלואם",
};

export const LEGACY_DOCUMENT_TYPE_MAP = {
  "תעודת_זהות": "id_card",
  "תעודת זהות": "id_card",
  "ספח תעודת זהות": "id_appendix",
  "תלושי_שכר_3_אחרונים": "salary_slips_3",
  "3 תלושי שכר": "salary_slips_3",
  "דפי_עו_ש_3_חודשים": "bank_statements_3",
  'דפי עו"ש 3 חודשים': "bank_statements_3",
  "אישור_עבודה_ומשכורת": "employment_confirmation",
  "אישור העסקה": "employment_confirmation",
  "חוזה_רכישה": "purchase_contract",
  "חוזה רכישה": "purchase_contract",
  "נסח_טאבו": "land_registry",
  "נסח טאבו": "land_registry",
  "נסח טאבו / אישור זכויות": "land_registry",
  "אישורי הון עצמי": "equity_confirmations",
  "אישורי הלוואות קיימות": "existing_loans",
  "שומת_מס_אחרונה": "tax_assessment",
  "שומת מס": "tax_assessment",
  "דוח_פנסיה": "profit_loss_report",
  "דוח רווח והפסד": "profit_loss_report",
  'אישור רו"ח': "accountant_confirmation",
};

export function normalizeDocumentType(value) {
  const type = String(value || "").trim();
  if (MORTGAGE_DOCUMENTS.some((doc) => doc.key === type)) return type;
  return LEGACY_DOCUMENT_TYPE_MAP[type] || type || "other";
}

export function getDocumentLabel(type) {
  const normalized = normalizeDocumentType(type);
  return MORTGAGE_DOCUMENTS.find((doc) => doc.key === normalized)?.label || type || "מסמך";
}

export function normalizeDocumentStatus(value) {
  const status = String(value || "").trim();
  return DOCUMENT_STATUSES.includes(status) ? status : "requested";
}

export function normalizeAppraisalStatus(value) {
  const status = String(value || "").trim();
  return APPRAISAL_STATUSES.includes(status) ? status : "not_ordered";
}

export function normalizeFundsReleaseStatus(value) {
  const status = String(value || "").trim();
  return FUNDS_RELEASE_STATUSES.includes(status) ? status : "not_released";
}

function isSelfEmployed(value) {
  const text = String(value || "").toLowerCase();
  return text.includes("עצמ") || text.includes("self") || text.includes("business");
}

export function getRequiredMortgageDocuments(employmentStatus = "", caseType = "") {
  const refinance = isRefinanceCase(caseType);
  return MORTGAGE_DOCUMENTS.filter((doc) => (
    doc.appliesTo === "all" ||
    doc.appliesTo === "employee" ||
    (doc.appliesTo === "self_employed" && isSelfEmployed(employmentStatus)) ||
    (doc.appliesTo === "refinance" && refinance)
  ));
}

export function buildDocumentChecklist(documents = [], employmentStatus = "", caseType = "") {
  const rowsByType = new Map();
  documents.forEach((doc) => {
    const type = normalizeDocumentType(doc.document_type || doc.documentType);
    if (!rowsByType.has(type)) rowsByType.set(type, { ...doc, document_type: type, status: normalizeDocumentStatus(doc.status) });
  });

  const checklist = getRequiredMortgageDocuments(employmentStatus, caseType).map((item) => {
    const row = rowsByType.get(item.key);
    const status = row ? normalizeDocumentStatus(row.status) : "missing";
    return {
      ...item,
      ...row,
      document_type: item.key,
      status,
      received: status === "received" || status === "approved",
      required: status !== "not_required",
      missing: status === "missing" || status === "requested" || status === "rejected",
    };
  });

  const requiredChecklist = checklist.filter((doc) => doc.required);
  const receivedCount = requiredChecklist.filter((doc) => doc.received).length;
  const totalCount = requiredChecklist.length;
  const missingDocuments = requiredChecklist.filter((doc) => !doc.received);

  // 4-way breakdown for the Document Center Card (Phase 7)
  const statusCounts = {
    missing:   requiredChecklist.filter((d) => d.status === "missing").length,
    requested: requiredChecklist.filter((d) => d.status === "requested").length,
    received:  requiredChecklist.filter((d) => d.status === "received").length,
    approved:  requiredChecklist.filter((d) => d.status === "approved").length,
  };

  return {
    checklist,
    receivedCount,
    totalCount,
    missingCount: missingDocuments.length,
    missingDocuments,
    completionPercent: totalCount > 0 ? Math.round((receivedCount / totalCount) * 100) : 0,
    statusCounts,
  };
}

export function calculateCollateralProgress(lead = {}) {
  const completed = COLLATERAL_CHECKLIST.filter((item) => Boolean(lead[item.key])).length;
  return Math.round((completed / COLLATERAL_CHECKLIST.length) * 100);
}

/**
 * Deterministic overall mortgage progress score (Phase 4).
 *
 * Formula:
 *   overall = pipeline_progress × 50%
 *           + documents_completion_percent × 30%
 *           + collateral_completion_percent × 20%
 *
 * pipeline_progress          — from PIPELINE_PROGRESS table in lib/pipeline.js (5–100)
 * documents_completion_percent — server-computed ratio of received+approved / required docs
 * collateral_completion_percent — ratio of checked items in COLLATERAL_CHECKLIST
 *
 * All inputs are 0–100. Result is rounded to the nearest integer.
 * No fake or random values — derived entirely from lead data stored in the DB.
 * Server-computed values (lead.documentsCompletionPercent / lead.collateralCompletionPercent)
 * take precedence; local fallbacks recalculate from lead fields when absent.
 */
export function calculateOverallMortgageProgress(lead = {}) {
  const pipeline = getPipelineProgress(lead.pipelineStage || lead.leadStatus);
  const documents = Number(lead.documentsCompletionPercent || 0);
  const collateral = Number(lead.collateralCompletionPercent ?? calculateCollateralProgress(lead));
  return Math.round((pipeline * 0.5) + (documents * 0.3) + (collateral * 0.2));
}

export function isThisWeek(dateValue) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return date >= start && date < end;
}
