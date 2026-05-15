import { z } from "zod";
import { COMMISSION_STATUSES, FOLLOW_UP_STAGES, LEAD_PRIORITIES, LEAD_QUALITIES, LEAD_STATUSES } from "./leadsStore";

const israeliPhoneSchema = z.string()
  .transform((value) => value.replace(/[^\d]/g, ""))
  .refine((value) => /^05\d{8}$/.test(value) || /^9725\d{8}$/.test(value), {
    message: "INVALID_ISRAELI_PHONE",
  })
  .transform((value) => (value.startsWith("972") ? `0${value.slice(3)}` : value));

const boundedText = (max, field) => z.string().trim().max(max, `${field}_TOO_LONG`);
const optionalText = (max, field) => z.union([boundedText(max, field), z.literal(""), z.undefined(), z.null()]).transform((value) => value || "");
const optionalNumberish = z.union([z.number(), z.string(), z.literal(""), z.null(), z.undefined()]);
const optionalEmail = z.union([z.string().trim().email("INVALID_EMAIL"), z.literal(""), z.undefined(), z.null()]).transform((value) => value || "");

const statusSchema = z.string().refine((value) => LEAD_STATUSES.includes(value), { message: "INVALID_STATUS" });
const commissionStatusSchema = z.string().refine((value) => COMMISSION_STATUSES.includes(value), { message: "INVALID_COMMISSION_STATUS" });
const qualitySchema = z.string().refine((value) => LEAD_QUALITIES.includes(value), { message: "INVALID_LEAD_QUALITY" });
const prioritySchema = z.string().refine((value) => LEAD_PRIORITIES.includes(value), { message: "INVALID_LEAD_PRIORITY" });
const followUpStageSchema = z.string().refine((value) => FOLLOW_UP_STAGES.includes(value), { message: "INVALID_FOLLOW_UP_STAGE" });

export const publicLeadSchema = z.object({
  lead: z.object({
    name: boundedText(80, "NAME").min(2, "INVALID_NAME"),
    phone: israeliPhoneSchema,
    city: optionalText(80, "CITY"),
    mortgageAmount: z.union([z.string(), z.number(), z.undefined()]).optional(),
    mortgage: z.union([z.string(), z.number(), z.undefined()]).optional(),
    purchaseStatus: optionalText(80, "PURCHASE_STATUS"),
    source: optionalText(80, "SOURCE"),
    mainIssue: optionalText(220, "MAIN_ISSUE"),
    approval: z.union([z.number(), z.string(), z.undefined()]).optional(),
    createdAt: optionalText(60, "CREATED_AT"),
    utmSource: optionalText(100, "UTM_SOURCE"),
    utmMedium: optionalText(100, "UTM_MEDIUM"),
    utmCampaign: optionalText(200, "UTM_CAMPAIGN"),
    utmContent: optionalText(200, "UTM_CONTENT"),
    utmTerm: optionalText(200, "UTM_TERM"),
    referrer: optionalText(500, "REFERRER"),
    landingPage: optionalText(500, "LANDING_PAGE"),
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
