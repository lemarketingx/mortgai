export const PIPELINE_STAGES = [
  "new_lead",
  "contacted",
  "documents_requested",
  "waiting_documents",
  "documents_received",
  "eligibility_review",
  "appraisal_ordered",
  "appraisal_completed",
  "lawyer_review",
  "submitted_to_bank",
  "principle_approval",
  "bank_negotiation",
  "selected_track",
  "signing_scheduled",
  "signed",
  "collateral_completion",
  "funds_released",
  "closed_won",
  "closed_lost",
];

export const PIPELINE_STAGE_LABELS = {
  new_lead: "ליד חדש",
  contacted: "נוצר קשר",
  documents_requested: "נשלחה רשימת מסמכים",
  waiting_documents: "מחכה למסמכים",
  documents_received: "מסמכים התקבלו",
  eligibility_review: "בדיקת זכאות",
  appraisal_ordered: "הוזמנה שמאות",
  appraisal_completed: "שמאות התקבלה",
  lawyer_review: "בדיקת עורכי דין",
  submitted_to_bank: "הוגש לבנק",
  principle_approval: "אישור עקרוני",
  bank_negotiation: 'מו"מ מול בנקים',
  selected_track: "נבחר תמהיל",
  signing_scheduled: "נקבעו חתימות",
  signed: "נחתם",
  collateral_completion: "השלמת בטחונות",
  funds_released: "כספים שוחררו",
  closed_won: "נסגר בהצלחה",
  closed_lost: "נסגר כהפסד",
};

export const PIPELINE_PROGRESS = {
  new_lead: 5,
  contacted: 10,
  documents_requested: 16,
  waiting_documents: 22,
  documents_received: 29,
  eligibility_review: 35,
  appraisal_ordered: 42,
  appraisal_completed: 48,
  lawyer_review: 54,
  submitted_to_bank: 60,
  principle_approval: 66,
  bank_negotiation: 72,
  selected_track: 78,
  signing_scheduled: 84,
  signed: 90,
  collateral_completion: 95,
  funds_released: 98,
  closed_won: 100,
  closed_lost: 100,
};

export const CLOSED_LOST_REASONS = [
  "no_answer",
  "not_relevant",
  "rejected_by_bank",
  "moved_to_other_advisor",
  "canceled",
  "lost",
];

export const CLOSED_LOST_REASON_LABELS = {
  no_answer: "לא עונה",
  not_relevant: "לא רלוונטי",
  rejected_by_bank: "נדחה בבנק",
  moved_to_other_advisor: "עבר ליועץ אחר",
  canceled: "בוטל",
  lost: "אבוד",
};

const LEGACY_STAGE_MAP = {
  "ליד חדש": "new_lead",
  "חדש": "new_lead",
  "נוצר קשר": "contacted",
  "נשלחה רשימת מסמכים": "documents_requested",
  "נשלחו מסמכים": "documents_requested",
  "מחכה למסמכים": "waiting_documents",
  "מחכים למסמכים": "waiting_documents",
  "מסמכים התקבלו": "documents_received",
  "בדיקת זכאות": "eligibility_review",
  "הוזמנה שמאות": "appraisal_ordered",
  "שמאות הוזמנה": "appraisal_ordered",
  "שמאות בוצעה": "appraisal_completed",
  "שמאות התקבלה": "appraisal_completed",
  "בדיקת עורכי דין": "lawyer_review",
  "בדיקה משפטית": "lawyer_review",
  "הוגש לבנק": "submitted_to_bank",
  "אישור עקרוני": "principle_approval",
  "אושר עקרונית": "principle_approval",
  'מו"מ מול בנקים': "bank_negotiation",
  "משא ומתן מול בנקים": "bank_negotiation",
  "נבחר תמהיל": "selected_track",
  "נקבעו חתימות": "signing_scheduled",
  "נחתם": "signed",
  "חתום": "signed",
  "השלמת בטחונות": "collateral_completion",
  "בטחונות": "collateral_completion",
  "כספים שוחררו": "funds_released",
  "שחרור כספים": "funds_released",
  "נסגר בהצלחה": "closed_won",
  "נסגר": "closed_won",
  "לא עונה": "closed_lost",
  "לא רלוונטי": "closed_lost",
  "נדחה בבנק": "closed_lost",
  "בוטל": "closed_lost",
  "אבוד": "closed_lost",
  "עבר ליועץ אחר": "closed_lost",
  "נשלח ליועץ": "contacted",
  "בטיפול": "contacted",
  "נקבעה שיחה": "contacted",
  "פגישה נקבעה": "contacted",
};

export function normalizePipelineStage(value) {
  const stage = String(value || "").trim();
  if (PIPELINE_STAGES.includes(stage)) return stage;
  return LEGACY_STAGE_MAP[stage] || "new_lead";
}

export function getPipelineStageLabel(stage) {
  return PIPELINE_STAGE_LABELS[normalizePipelineStage(stage)];
}

export function getPipelineProgress(stage) {
  return PIPELINE_PROGRESS[normalizePipelineStage(stage)] ?? PIPELINE_PROGRESS.new_lead;
}

export function isClosedPipelineStage(stage) {
  const normalized = normalizePipelineStage(stage);
  return normalized === "closed_won" || normalized === "closed_lost";
}
