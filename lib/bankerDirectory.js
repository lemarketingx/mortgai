/**
 * Banker / bank directory helpers for FINZO PRO advisor CRM.
 *
 * BANK_LIST        — display names matching the BANKS constant in lead/[id].js
 * BANK_SUBMISSION_STATUSES — lifecycle of a bank submission
 * normalizeBankName()      — coerce raw strings to a canonical bank name
 */

export const BANK_LIST = [
  { key: "leumi",         name: "בנק לאומי" },
  { key: "hapoalim",      name: "בנק הפועלים" },
  { key: "discount",      name: "בנק דיסקונט" },
  { key: "mizrahi",       name: "מזרחי-טפחות" },
  { key: "international", name: "הבינלאומי" },
  { key: "one_zero",      name: "One Zero" },
  { key: "eurocom",       name: "יורוקום" },
  { key: "other",         name: "אחר" },
];

export const BANK_SUBMISSION_STATUSES = [
  { key: "not_submitted",     label: "טרם הוגש לבנק" },
  { key: "preparing",         label: "בהכנת תיק לבנק" },
  { key: "submitted",         label: "הוגש לבנק" },
  { key: "awaiting_response", label: "ממתין לתשובת בנק" },
  { key: "principle_approval",label: "אישור עקרוני התקבל" },
  { key: "conditions_pending",label: "ממתין לקיום תנאים" },
  { key: "final_approval",    label: "אישור סופי התקבל" },
  { key: "rejected",          label: "נדחה על ידי הבנק" },
];

export const BANK_SUBMISSION_STATUS_MAP = Object.fromEntries(
  BANK_SUBMISSION_STATUSES.map((s) => [s.key, s.label])
);

/**
 * Normalize a raw bank name string to one of the BANK_LIST names.
 * Falls back to the original string if no match found.
 */
export function normalizeBankName(raw) {
  if (!raw) return "";
  const s = String(raw).trim();
  const found = BANK_LIST.find(
    (b) => b.name === s || b.key === s || b.name.includes(s) || s.includes(b.name)
  );
  return found ? found.name : s;
}

/**
 * Placeholder banker contact object shape.
 * Actual data is stored on the lead record (bankerName, bankerPhone, bankerEmail, bankBranch, bankNotes, bankSubmissionStatus).
 *
 * @typedef {Object} BankerContact
 * @property {string} name
 * @property {string} phone
 * @property {string} email
 * @property {string} branch
 * @property {string} notes
 * @property {string} submissionStatus  — one of BANK_SUBMISSION_STATUSES[].key
 */
