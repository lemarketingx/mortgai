import { getPipelineProgress } from "./pipeline";

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
];

export const DOCUMENT_STATUSES = ["requested", "received", "approved", "rejected", "missing"];

export const DOCUMENT_STATUS_LABELS = {
  requested: "בטיפול",
  received: "התקבל",
  approved: "התקבל",
  rejected: "חסר",
  missing: "חסר",
};

export const DOCUMENT_STATUS_MARKS = {
  requested: "⏳",
  received: "✓",
  approved: "✓",
  rejected: "✗",
  missing: "✗",
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

export function getRequiredMortgageDocuments(employmentStatus = "") {
  return MORTGAGE_DOCUMENTS.filter((doc) => (
    doc.appliesTo === "all" ||
    doc.appliesTo === "employee" ||
    (doc.appliesTo === "self_employed" && isSelfEmployed(employmentStatus))
  ));
}

export function buildDocumentChecklist(documents = [], employmentStatus = "") {
  const rowsByType = new Map();
  documents.forEach((doc) => {
    const type = normalizeDocumentType(doc.document_type || doc.documentType);
    if (!rowsByType.has(type)) rowsByType.set(type, { ...doc, document_type: type, status: normalizeDocumentStatus(doc.status) });
  });

  const checklist = getRequiredMortgageDocuments(employmentStatus).map((item) => {
    const row = rowsByType.get(item.key);
    const status = row ? normalizeDocumentStatus(row.status) : "missing";
    return {
      ...item,
      ...row,
      document_type: item.key,
      status,
      received: status === "received" || status === "approved",
      missing: status === "missing" || status === "requested" || status === "rejected",
    };
  });

  const receivedCount = checklist.filter((doc) => doc.received).length;
  const totalCount = checklist.length;
  const missingDocuments = checklist.filter((doc) => !doc.received);
  return {
    checklist,
    receivedCount,
    totalCount,
    missingCount: missingDocuments.length,
    missingDocuments,
    completionPercent: totalCount > 0 ? Math.round((receivedCount / totalCount) * 100) : 0,
  };
}

export function calculateCollateralProgress(lead = {}) {
  const completed = COLLATERAL_CHECKLIST.filter((item) => Boolean(lead[item.key])).length;
  return Math.round((completed / COLLATERAL_CHECKLIST.length) * 100);
}

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
