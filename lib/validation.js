import { z } from "zod";
import { COMMISSION_STATUSES, FOLLOW_UP_STAGES, LEAD_PRIORITIES, LEAD_QUALITIES, LEAD_STATUSES } from "./leadsStore";
import { PIPELINE_STAGES, normalizePipelineStage } from "./pipeline";
import { APPRAISAL_STATUSES, FUNDS_RELEASE_STATUSES, normalizeAppraisalStatus, normalizeFundsReleaseStatus } from "./mortgageCase";

const israeliPhoneSchema = z.string()
  .transform((value) => String(value || "").trim().replace(/[^\d+]/g, ""))
  .refine((value) => value.replace(/[^\d]/g, "").length >= 7, {
    message: "INVALID_PHONE",
  });

const boundedText = (max, field) => z.string().trim().max(max, `${field}_TOO_LONG`);
const optionalText = (max, field) => z.union([boundedText(max, field), z.literal(""), z.undefined(), z.null()]).transform((value) => value || "");
const optionalNumberish = z.union([z.number(), z.string(), z.literal(""), z.null(), z.undefined()]);
const optionalEmail = z.union([z.string().trim().email("INVALID_EMAIL"), z.literal(""), z.undefined(), z.null()]).transform((value) => value || "");

const statusSchema = z.string().refine((value) => LEAD_STATUSES.includes(value), { message: "INVALID_STATUS" });
const pipelineStageSchema = z.string()
  .refine((value) => LEAD_STATUSES.includes(value) || PIPELINE_STAGES.includes(normalizePipelineStage(value)), { message: "INVALID_PIPELINE_STAGE" })
  .transform((value) => normalizePipelineStage(value));
const commissionStatusSchema = z.string().refine((value) => COMMISSION_STATUSES.includes(value), { message: "INVALID_COMMISSION_STATUS" });
const qualitySchema = z.string().refine((value) => LEAD_QUALITIES.includes(value), { message: "INVALID_LEAD_QUALITY" });
const prioritySchema = z.string().refine((value) => LEAD_PRIORITIES.includes(value), { message: "INVALID_LEAD_PRIORITY" });
const followUpStageSchema = z.string().refine((value) => FOLLOW_UP_STAGES.includes(value), { message: "INVALID_FOLLOW_UP_STAGE" });
const storeStatusSchema = z.string().refine((value) => ["pending_review", "approved_marketplace", "partner_only", "hidden", "claimed_by_partner", "sold", "archived", "available"].includes(value), { message: "INVALID_STORE_STATUS" });
const booleanish = z.union([z.boolean(), z.string(), z.number(), z.null(), z.undefined()]).transform((value) => value === true || value === "true" || value === 1 || value === "1");
const appraisalStatusSchema = z.string().refine((value) => APPRAISAL_STATUSES.includes(normalizeAppraisalStatus(value)), { message: "INVALID_APPRAISAL_STATUS" }).transform(normalizeAppraisalStatus);
const fundsReleaseStatusSchema = z.string().refine((value) => FUNDS_RELEASE_STATUSES.includes(normalizeFundsReleaseStatus(value)), { message: "INVALID_FUNDS_RELEASE_STATUS" }).transform(normalizeFundsReleaseStatus);

export const publicLeadSchema = z.object({
  lead: z.object({
    name: boundedText(80, "NAME").min(2, "INVALID_NAME"),
    phone: israeliPhoneSchema,
    city: optionalText(80, "CITY").optional(),
    mortgageAmount: z.union([z.string(), z.number(), z.undefined()]).optional(),
    mortgage: z.union([z.string(), z.number(), z.undefined()]).optional(),
    purchaseStatus: optionalText(80, "PURCHASE_STATUS").optional(),
    source: optionalText(80, "SOURCE").optional(),
    mainIssue: optionalText(220, "MAIN_ISSUE").optional(),
    approval: z.union([z.number(), z.string(), z.undefined()]).optional(),
    createdAt: optionalText(60, "CREATED_AT").optional(),
    utmSource: optionalText(100, "UTM_SOURCE").optional(),
    utmMedium: optionalText(100, "UTM_MEDIUM").optional(),
    utmCampaign: optionalText(200, "UTM_CAMPAIGN").optional(),
    utmContent: optionalText(200, "UTM_CONTENT").optional(),
    utmTerm: optionalText(200, "UTM_TERM").optional(),
    referrer: optionalText(500, "REFERRER").optional(),
    landingPage: optionalText(500, "LANDING_PAGE").optional(),
    landingPath: optionalText(500, "LANDING_PATH").optional(),
    landing_page: optionalText(500, "LANDING_PAGE").optional(),
    estimatedApprovalResult: optionalNumberish.optional(),
    estimated_approval_result: optionalNumberish.optional(),
    estimatedPayment: optionalNumberish.optional(),
    estimated_payment: optionalNumberish.optional(),
    propertyPrice: optionalNumberish.optional(),
    property_price: optionalNumberish.optional(),
    equityAmount: optionalNumberish.optional(),
    equity_amount: optionalNumberish.optional(),
    monthlyIncome: optionalNumberish.optional(),
    monthly_income: optionalNumberish.optional(),
    debtLevel: optionalNumberish.optional(),
    debt_level: optionalNumberish.optional(),
    employmentStatus: optionalText(80, "EMPLOYMENT_STATUS").optional(),
    employment_status: optionalText(80, "EMPLOYMENT_STATUS").optional(),
    hasExistingMortgage: optionalText(80, "HAS_EXISTING_MORTGAGE").optional(),
    has_existing_mortgage: optionalText(80, "HAS_EXISTING_MORTGAGE").optional(),
    contractStatus: optionalText(80, "CONTRACT_STATUS").optional(),
    contract_status: optionalText(80, "CONTRACT_STATUS").optional(),
    propertyCity: optionalText(80, "PROPERTY_CITY").optional(),
    property_city: optionalText(80, "PROPERTY_CITY").optional(),
    requestedContactTime: optionalText(80, "REQUESTED_CONTACT_TIME").optional(),
    requested_contact_time: optionalText(80, "REQUESTED_CONTACT_TIME").optional(),
    hasExistingProperty: optionalText(10, "HAS_EXISTING_PROPERTY").optional(),
    has_existing_property: optionalText(10, "HAS_EXISTING_PROPERTY").optional(),
    existingPropertyValue: optionalNumberish.optional(),
    existing_property_value: optionalNumberish.optional(),
    existingMortgageBalance: optionalNumberish.optional(),
    existing_mortgage_balance: optionalNumberish.optional(),
    householdExpenses: optionalNumberish.optional(),
    household_expenses: optionalNumberish.optional(),
    // FINZO Lead Score v2 — new lead form fields
    email: optionalEmail.optional(),
    processStage: optionalText(60, "PROCESS_STAGE").optional(),
    process_stage: optionalText(60, "PROCESS_STAGE").optional(),
    preferredContactMethod: optionalText(30, "PREFERRED_CONTACT_METHOD").optional(),
    preferred_contact_method: optionalText(30, "PREFERRED_CONTACT_METHOD").optional(),
    monthlyObligations: optionalNumberish.optional(),
    monthly_obligations: optionalNumberish.optional(),
    desiredMonthlyPayment: optionalNumberish.optional(),
    desired_monthly_payment: optionalNumberish.optional(),
    consentAdvisorContact: z.any().transform((v) => v === true || v === "true" || v === "on" || v === 1 || v === "1").optional(),
    consent_advisor_contact: z.any().transform((v) => v === true || v === "true" || v === "on" || v === 1 || v === "1").optional(),
  }).passthrough(),
  analysis: z.any().optional(),
}).passthrough();

const leadChangesSchema = z.object({
  status: statusSchema.optional(),
  assignedAdvisor: optionalText(80, "ASSIGNED_ADVISOR").optional(),
  advisorPhone: optionalText(30, "ADVISOR_PHONE").optional(),
  advisorEmail: optionalText(120, "ADVISOR_EMAIL").optional(),
  assignedAdvisorId: optionalText(120, "ASSIGNED_ADVISOR_ID").optional(),
  leadStatus: statusSchema.optional(),
  leadQuality: qualitySchema.optional(),
  leadPriority: prioritySchema.optional(),
  followUpDate: optionalText(40, "FOLLOW_UP_DATE").optional(),
  followUpStage: followUpStageSchema.optional(),
  lastContactedAt: optionalText(60, "LAST_CONTACTED_AT").optional(),
  expectedCommission: optionalText(40, "EXPECTED_COMMISSION").optional(),
  actualCommission: optionalText(40, "ACTUAL_COMMISSION").optional(),
  commissionStatus: commissionStatusSchema.optional(),
  commissionAgreement: optionalText(120, "COMMISSION_AGREEMENT").optional(),
  commissionAmount: optionalText(40, "COMMISSION_AMOUNT").optional(),
  internalNotes: optionalText(2000, "INTERNAL_NOTES").optional(),
  notes: optionalText(2000, "NOTES").optional(),
  employmentStatus: optionalText(80, "EMPLOYMENT_STATUS").optional(),
  hasExistingMortgage: optionalText(80, "HAS_EXISTING_MORTGAGE").optional(),
  contractStatus: optionalText(80, "CONTRACT_STATUS").optional(),
  propertyCity: optionalText(80, "PROPERTY_CITY").optional(),
  requestedContactTime: optionalText(80, "REQUESTED_CONTACT_TIME").optional(),
  preferredContactMethod: optionalText(30, "PREFERRED_CONTACT_METHOD").optional(),
  storeStatus: storeStatusSchema.optional(),
  storePrice: optionalNumberish.optional(),
  exclusivePrice: optionalNumberish.optional(),
  soldAt: optionalText(80, "SOLD_AT").optional(),
  buyerAdvisorId: optionalText(120, "BUYER_ADVISOR_ID").optional(),
  previewSummary: optionalText(500, "PREVIEW_SUMMARY").optional(),
  firstContactAt: optionalText(80, "FIRST_CONTACT_AT").optional(),
  lastActivityAt: optionalText(80, "LAST_ACTIVITY_AT").optional(),
  heatScore: optionalNumberish.optional(),
  missingDocumentsCount: optionalNumberish.optional(),
  pipelineStage: pipelineStageSchema.optional(),
  stageUpdatedAt: optionalText(80, "STAGE_UPDATED_AT").optional(),
  nextAction: optionalText(500, "NEXT_ACTION").optional(),
  nextActionAt: optionalText(80, "NEXT_ACTION_AT").optional(),
  bankName: optionalText(120, "BANK_NAME").optional(),
  mortgageType: optionalText(120, "MORTGAGE_TYPE").optional(),
  documentsCompletionPercent: optionalNumberish.optional(),
  appraiserName: optionalText(120, "APPRAISER_NAME").optional(),
  appraiserPhone: optionalText(40, "APPRAISER_PHONE").optional(),
  appraisalDate: optionalText(80, "APPRAISAL_DATE").optional(),
  appraisalCost: optionalNumberish.optional(),
  appraisalReportReceived: booleanish.optional(),
  appraisalStatus: appraisalStatusSchema.optional(),
  buyerLawyerName: optionalText(120, "BUYER_LAWYER_NAME").optional(),
  buyerLawyerPhone: optionalText(40, "BUYER_LAWYER_PHONE").optional(),
  buyerLawyerEmail: optionalEmail.optional(),
  sellerLawyerName: optionalText(120, "SELLER_LAWYER_NAME").optional(),
  sellerLawyerPhone: optionalText(40, "SELLER_LAWYER_PHONE").optional(),
  sellerLawyerEmail: optionalEmail.optional(),
  legalContractReceived: booleanish.optional(),
  legalRightsReceived: booleanish.optional(),
  legalRegistrationReceived: booleanish.optional(),
  signingDate: optionalText(80, "SIGNING_DATE").optional(),
  signingLocation: optionalText(200, "SIGNING_LOCATION").optional(),
  signingNotes: optionalText(1000, "SIGNING_NOTES").optional(),
  lifeInsurance: booleanish.optional(),
  propertyInsurance: booleanish.optional(),
  mortgageRegistration: booleanish.optional(),
  pledgeRegistration: booleanish.optional(),
  municipalityDocuments: booleanish.optional(),
  collateralCompletionPercent: optionalNumberish.optional(),
  fundsReleaseStatus: fundsReleaseStatusSchema.optional(),
  overallProgressPercent: optionalNumberish.optional(),
}).strict();

export const adminLeadPatchSchema = z.object({
  id: z.string().trim().min(1, "MISSING_LEAD_ID").max(120, "LEAD_ID_TOO_LONG"),
  changes: leadChangesSchema,
});

export const adminLeadBulkPatchSchema = z.object({
  ids: z.array(z.string().trim().min(1).max(120)).min(1, "MISSING_IDS").max(200, "TOO_MANY_IDS"),
  changes: leadChangesSchema,
});

const advisorCommissionTypeSchema = optionalText(40, "COMMISSION_TYPE");
const advisorCommissionAmountSchema = optionalText(40, "COMMISSION_AMOUNT");

export const adminAdvisorCreateSchema = z.object({
  advisorId: z.string().trim().min(1, "ADVISOR_ID_REQUIRED").max(120, "ADVISOR_ID_TOO_LONG"),
  name: z.string().trim().min(1, "NAME_REQUIRED").max(120, "NAME_TOO_LONG"),
  phone: z.string().trim().min(1, "PHONE_REQUIRED").max(30, "PHONE_TOO_LONG"),
  email: optionalEmail,
  commissionType: advisorCommissionTypeSchema.optional().default("lead"),
  commissionAmount: advisorCommissionAmountSchema.optional().default(""),
  active: z.boolean().optional().default(true),
});

export const adminAdvisorPatchSchema = z.object({
  advisorId: z.string().trim().min(1, "ADVISOR_ID_REQUIRED").max(120, "ADVISOR_ID_TOO_LONG"),
  changes: z.object({
    name: z.string().trim().min(1, "NAME_REQUIRED").max(120, "NAME_TOO_LONG").optional(),
    phone: z.string().trim().min(1, "PHONE_REQUIRED").max(30, "PHONE_TOO_LONG").optional(),
    email: optionalEmail.optional(),
    commissionType: advisorCommissionTypeSchema.optional(),
    commissionAmount: advisorCommissionAmountSchema.optional(),
    active: z.boolean().optional(),
  }).strict(),
});

export function validationErrorPayload(error) {
  const first = error?.issues?.[0];
  return { error: first?.message || "VALIDATION_ERROR", details: error?.issues || [] };
}
