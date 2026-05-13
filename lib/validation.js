import { z } from "zod";
import { COMMISSION_STATUSES, LEAD_STATUSES } from "./leadsStore";

const israeliPhoneSchema = z.string()
  .transform((value) => value.replace(/[^\d]/g, ""))
  .refine((value) => /^05\d{8}$/.test(value) || /^9725\d{8}$/.test(value), {
    message: "INVALID_ISRAELI_PHONE",
  });

const boundedText = (max, field) => z.string()
  .trim()
  .max(max, `${field}_TOO_LONG`);

const optionalText = (max, field) => z.union([boundedText(max, field), z.literal(""), z.undefined(), z.null()])
  .transform((value) => value || "");

const optionalNumberish = z.union([z.number(), z.string(), z.literal(""), z.null(), z.undefined()]);

const statusSchema = z.string().refine((value) => LEAD_STATUSES.includes(value), {
  message: "INVALID_STATUS",
});

const commissionStatusSchema = z.string().refine((value) => COMMISSION_STATUSES.includes(value), {
  message: "INVALID_COMMISSION_STATUS",
});

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
    landing_page: optionalText(500, "LANDING_PAGE").optional(),
    estimatedApprovalResult: optionalNumberish,
    estimated_approval_result: optionalNumberish,
    estimatedPayment: optionalNumberish,
    estimated_payment: optionalNumberish,
    propertyPrice: optionalNumberish,
    property_price: optionalNumberish,
    equityAmount: optionalNumberish,
    equity_amount: optionalNumberish,
    monthlyIncome: optionalNumberish,
    monthly_income: optionalNumberish,
    debtLevel: optionalNumberish,
    debt_level: optionalNumberish,
  }).passthrough(),
  analysis: z.any().optional(),
}).passthrough();

export const adminLeadPatchSchema = z.object({
  id: z.string().trim().min(1, "MISSING_LEAD_ID").max(120, "LEAD_ID_TOO_LONG"),
  changes: z.object({
    status: statusSchema.optional(),
    assignedAdvisor: optionalText(80, "ASSIGNED_ADVISOR").optional(),
    advisorPhone: optionalText(30, "ADVISOR_PHONE").optional(),
    advisorEmail: optionalText(120, "ADVISOR_EMAIL").optional(),
    expectedCommission: optionalText(40, "EXPECTED_COMMISSION").optional(),
    actualCommission: optionalText(40, "ACTUAL_COMMISSION").optional(),
    commissionStatus: commissionStatusSchema.optional(),
    commissionAgreement: optionalText(120, "COMMISSION_AGREEMENT").optional(),
    notes: optionalText(2000, "NOTES").optional(),
    assignedAdvisorId: optionalText(120, "ASSIGNED_ADVISOR_ID").optional(),
    leadStatus: statusSchema.optional(),
    followUpDate: optionalText(40, "FOLLOW_UP_DATE").optional(),
    lastContactedAt: optionalText(60, "LAST_CONTACTED_AT").optional(),
    commissionAmount: optionalText(40, "COMMISSION_AMOUNT").optional(),
    internalNotes: optionalText(2000, "INTERNAL_NOTES").optional(),
  }).strict(),
});

export const adminLeadBulkPatchSchema = z.object({
  ids: z.array(z.string().trim().min(1).max(120)).min(1, "MISSING_IDS").max(200, "TOO_MANY_IDS"),
  changes: z.object({
    status: statusSchema.optional(),
    leadStatus: statusSchema.optional(),
    assignedAdvisor: optionalText(80, "ASSIGNED_ADVISOR").optional(),
    advisorPhone: optionalText(30, "ADVISOR_PHONE").optional(),
    advisorEmail: optionalText(120, "ADVISOR_EMAIL").optional(),
    assignedAdvisorId: optionalText(120, "ASSIGNED_ADVISOR_ID").optional(),
    internalNotes: optionalText(2000, "INTERNAL_NOTES").optional(),
  }).strict(),
});

const advisorCommissionTypeSchema = z.string().trim().min(1, "COMMISSION_TYPE_REQUIRED").max(40, "COMMISSION_TYPE_TOO_LONG");
const advisorCommissionAmountSchema = z.string().trim().min(1, "COMMISSION_AMOUNT_REQUIRED").max(40, "COMMISSION_AMOUNT_TOO_LONG");

export const adminAdvisorCreateSchema = z.object({
  advisorId: z.string().trim().min(1, "ADVISOR_ID_REQUIRED").max(120, "ADVISOR_ID_TOO_LONG"),
  name: z.string().trim().min(1, "NAME_REQUIRED").max(120, "NAME_TOO_LONG"),
  phone: z.string().trim().min(1, "PHONE_REQUIRED").max(30, "PHONE_TOO_LONG"),
  email: z.string().trim().min(1, "EMAIL_REQUIRED").max(120, "EMAIL_TOO_LONG").email("INVALID_EMAIL"),
  commissionType: advisorCommissionTypeSchema,
  commissionAmount: advisorCommissionAmountSchema,
  active: z.boolean().optional().default(true),
});

export const adminAdvisorPatchSchema = z.object({
  advisorId: z.string().trim().min(1, "ADVISOR_ID_REQUIRED").max(120, "ADVISOR_ID_TOO_LONG"),
  changes: z.object({
    name: z.string().trim().min(1, "NAME_REQUIRED").max(120, "NAME_TOO_LONG").optional(),
    phone: z.string().trim().min(1, "PHONE_REQUIRED").max(30, "PHONE_TOO_LONG").optional(),
    email: z.string().trim().min(1, "EMAIL_REQUIRED").max(120, "EMAIL_TOO_LONG").email("INVALID_EMAIL").optional(),
    commissionType: advisorCommissionTypeSchema.optional(),
    commissionAmount: advisorCommissionAmountSchema.optional(),
    active: z.boolean().optional(),
  }).strict(),
});

export function validationErrorPayload(error) {
  const first = error?.issues?.[0];
  return {
    error: first?.message || "VALIDATION_ERROR",
    details: error?.issues || [],
  };
}
