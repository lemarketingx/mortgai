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

const optionalText = (max, field) => z.union([boundedText(max, field), z.literal(""), z.undefined()])
  .transform((value) => value || "");

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
  }).passthrough(),
  analysis: z.any().optional(),
}).passthrough();

export const adminLeadPatchSchema = z.object({
  id: z.string().trim().min(1, "MISSING_LEAD_ID").max(120, "LEAD_ID_TOO_LONG"),
  changes: z.object({
    status: statusSchema.optional(),
    assignedAdvisor: optionalText(80, "ASSIGNED_ADVISOR").optional(),
    advisorPhone: optionalText(30, "ADVISOR_PHONE").optional(),
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

export function validationErrorPayload(error) {
  const first = error?.issues?.[0];
  return {
    error: first?.message || "VALIDATION_ERROR",
    details: error?.issues || [],
  };
}
