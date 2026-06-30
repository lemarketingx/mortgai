// FINZO Lead Score Engine v2
// All scoring runs server-side only (pages/api/lead.js).
// Client never receives score, tier, or price directly.

export const SCORE_VERSION = "v2";

// ── Tiers & Prices ────────────────────────────────────────────────────────────
export const LEAD_TIERS = [
  { min: 95, tier: "Elite",        price: 349, label: "Elite" },
  { min: 86, tier: "Premium",      price: 249, label: "Premium" },
  { min: 76, tier: "Pro",          price: 179, label: "Pro" },
  { min: 61, tier: "Standard",     price: 129, label: "Standard" },
  { min: 41, tier: "Basic",        price: 89,  label: "Basic" },
  { min: 0,  tier: "not_sellable", price: 0,   label: "לא למכירה" },
];

// ── A. Data Completeness (0–20) ───────────────────────────────────────────────
function scoreCompleteness(d) {
  let pts = 0;
  const name = String(d.fullName || d.name || "").trim();
  const phone = String(d.phone || "").replace(/\D/g, "");

  if (name.length >= 2)                                    pts += 2; // שם מלא
  if (phone.length >= 7)                                   pts += 4; // טלפון תקין
  if (d.email && String(d.email).includes("@"))            pts += 2; // אימייל
  if (d.serviceType)                                       pts += 3; // סוג שירות
  if (Number(d.mortgageAmount) > 0)                        pts += 3; // סכום משכנתא
  if (Number(d.propertyValue) > 0)                         pts += 3; // שווי נכס
  if (String(d.city || "").trim().length > 0)              pts += 1; // עיר/אזור
  if (String(d.notes || "").trim().length > 5)             pts += 2; // הערות

  return Math.min(20, pts);
}

// ── B. Client Readiness (0–25) ────────────────────────────────────────────────
const PROCESS_STAGE_SCORES = {
  exploring:       3,  // רק בודק אפשרויות
  searching:       8,  // מחפש דירה
  found_property: 13,  // מצא נכס, לא חתם
  pre_signing:    18,  // לפני חתימה / מו"מ
  signed:         25,  // כבר חתם חוזה
};

function scoreReadiness(d) {
  // Also accept legacy contractStatus mapping
  const stageMap = {
    "חוזה חתום":      "signed",
    "לפני חוזה":      "pre_signing",
    "בדיקה ראשונית":  "exploring",
    before:            "exploring",
    negotiation:       "pre_signing",
    signed:            "signed",
  };
  const stage = d.processStage || stageMap[d.contractStatus] || "";
  return PROCESS_STAGE_SCORES[stage] || 0;
}

// ── C. Financial Feasibility (0–25) ──────────────────────────────────────────
function scoreFinancial(d) {
  let pts = 0;
  const propertyValue  = Number(d.propertyValue || d.propertyPrice) || 0;
  const mortgageAmount = Number(d.mortgageAmount) || 0;
  const equity         = Number(d.equityAmount)   || 0;
  const income         = Number(d.monthlyIncome)  || 0;
  const obligations    = Number(d.monthlyObligations || d.debtLevel) || 0;
  const serviceType    = d.serviceType || d.purchaseStatus || "";

  // LTV check (0–8 pts)
  const maxLtvMap = {
    investment:   0.50,
    upgrader:     0.70,
    refinance:    0.70,
    first_apartment: 0.75,
    new_purchase: 0.75,
    bank_declined: 0.65,
  };
  const maxLtv = maxLtvMap[serviceType] || 0.75;

  if (propertyValue > 0 && mortgageAmount > 0) {
    const ltv = mortgageAmount / propertyValue;
    if (ltv <= maxLtv * 0.85)        pts += 8; // comfortably within limit
    else if (ltv <= maxLtv)           pts += 5; // within limit
    else if (ltv <= maxLtv + 0.05)   pts += 2; // slightly over
    // > maxLtv + 5%: 0 pts — likely won't be approved
  } else if (equity > 0) {
    pts += 2; // has equity data but missing property price
  }

  // Income adequacy (0–7 pts)
  if (income >= 25000)      pts += 7;
  else if (income >= 15000) pts += 5;
  else if (income >= 10000) pts += 3;
  else if (income >= 6000)  pts += 1;

  // Debt-to-income ratio (0–3 pts)
  if (obligations === 0 && income > 0)               pts += 3;
  else if (income > 0 && obligations / income <= 0.3) pts += 3;
  else if (income > 0 && obligations / income <= 0.5) pts += 1;

  // No red flags (0–3 pts)
  let redFlags = 0;
  if (propertyValue > 0 && mortgageAmount > propertyValue * 1.1) redFlags++;
  if (income > 0 && obligations > income * 0.7)                  redFlags++;
  if (equity < 0)                                                 redFlags++;
  if (redFlags === 0) pts += 3;

  // "Refinance / any purpose" without full data = conservative scoring
  if ((serviceType === "refinance" || serviceType === "debt_consolidation") && mortgageAmount === 0) {
    pts = Math.max(0, pts - 4);
  }

  return Math.min(25, pts);
}

// ── D. Availability & Verification (0–15) ─────────────────────────────────────
function scoreAvailability(d) {
  let pts = 0;
  const phone = String(d.phone || "").replace(/\D/g, "");

  if (phone.length >= 7)                              pts += 3; // valid phone format
  if (d.consentAdvisorContact)                        pts += 4; // explicit consent
  if (d.requestedContactTime)                         pts += 3; // chose a contact time
  if (d.preferredContactMethod === "whatsapp")        pts += 3; // WhatsApp (higher reach)
  // OTP / SMS verification placeholder (future feature):
  // if (d.phoneVerified) pts += 2;

  return Math.min(15, pts);
}

// ── E. Lead Source Quality (0–10) ─────────────────────────────────────────────
function scoreSource(d) {
  const src = String(d.utmSource || "").toLowerCase();
  const med = String(d.utmMedium || "").toLowerCase();
  const ref = String(d.referrer  || "").toLowerCase();

  if (src === "google" && (med === "cpc" || med === "search"))         return 10;
  if (ref.includes("google.") && (ref.includes("search") || !med))    return 10;
  if (src === "google")                                                 return 8;
  if (ref.includes("google."))                                          return 8;
  if (["facebook", "instagram", "fb", "ig"].some((s) => src.includes(s))) return 6;
  if (ref.includes("facebook.com") || ref.includes("instagram.com"))   return 5;
  if (["taboola", "outbrain"].some((s) => src.includes(s)))            return 4;
  if (!src && !ref)                                                      return 5; // direct traffic
  if (src)                                                               return 3;
  return 2;
}

// ── F. Lead Freshness (0–5) ───────────────────────────────────────────────────
function scoreFreshness(createdAt) {
  if (!createdAt) return 5; // brand new (no timestamp yet)
  const hours = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  if (hours <= 1)    return 5;
  if (hours <= 24)   return 4;
  if (hours <= 72)   return 2;
  if (hours <= 168)  return 1;
  return 0;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function getLeadTier(score) {
  return LEAD_TIERS.find((t) => score >= t.min) || LEAD_TIERS[LEAD_TIERS.length - 1];
}

export function calculateLeadPrice(score) {
  return getLeadTier(score).price;
}

// Compute LTV and DTI for storage and display
export function calculateFinancialFeasibility(d) {
  const propertyValue  = Number(d.propertyValue || d.propertyPrice) || 0;
  const mortgageAmount = Number(d.mortgageAmount) || 0;
  const income         = Number(d.monthlyIncome)  || 0;
  const obligations    = Number(d.monthlyObligations || d.debtLevel) || 0;
  const serviceType    = d.serviceType || d.purchaseStatus || "";

  const maxLtvMap = { investment: 50, upgrader: 70, refinance: 70, bank_declined: 65 };
  const maxLtv = maxLtvMap[serviceType] || 75;

  const ltv = propertyValue > 0 && mortgageAmount > 0
    ? Number((mortgageAmount / propertyValue * 100).toFixed(1))
    : null;
  const dti = income > 0 && obligations > 0
    ? Number((obligations / income * 100).toFixed(1))
    : null;

  const notes = [];
  if (ltv !== null && ltv > maxLtv) notes.push(`LTV ${ltv}% גבוה מהמותר (${maxLtv}%) לסוג עסקה זה`);
  if (dti !== null && dti > 50)      notes.push(`יחס התחייבויות ${dti}% גבוה`);

  return { ltv, dti, maxLtv, notes };
}

// Build a human-readable quality note for the advisor marketplace
function buildQualityNotes(d, breakdown) {
  const parts = [];

  const stageLabels = {
    signed:         "לקוח כבר חתם חוזה",
    pre_signing:    "לקוח לפני חתימה",
    found_property: "לקוח מצא נכס",
    searching:      "לקוח מחפש נכס",
    exploring:      "לקוח בשלב בדיקה",
  };
  const stage = d.processStage || "";
  if (stageLabels[stage]) parts.push(stageLabels[stage]);

  if (breakdown.completeness >= 16)      parts.push("נתונים מלאים");
  else if (breakdown.completeness >= 9)  parts.push("נתונים חלקיים");
  else                                   parts.push("נתונים דלים");

  const propertyValue  = Number(d.propertyValue || d.propertyPrice) || 0;
  const mortgageAmount = Number(d.mortgageAmount) || 0;
  if (propertyValue > 0 && mortgageAmount > 0) {
    const ltv = (mortgageAmount / propertyValue * 100).toFixed(0);
    parts.push(`LTV ${ltv}%`);
  }

  const src = String(d.utmSource || "").toLowerCase();
  const ref = String(d.referrer  || "").toLowerCase();
  if (src.includes("google") || ref.includes("google")) parts.push("מ-Google");
  else if (src.includes("facebook"))                     parts.push("מ-Facebook");

  if (breakdown.freshness >= 4) parts.push("ליד טרי");
  if (d.consentAdvisorContact)  parts.push("אישר חזרה של יועץ");

  return parts.join(", ");
}

// ── Main Export ───────────────────────────────────────────────────────────────
export function calculateLeadScore(d) {
  const breakdown = {
    completeness: scoreCompleteness(d),
    readiness:    scoreReadiness(d),
    financial:    scoreFinancial(d),
    availability: scoreAvailability(d),
    source:       scoreSource(d),
    freshness:    scoreFreshness(d.createdAt),
  };

  const score = Math.min(100, Math.max(0,
    breakdown.completeness +
    breakdown.readiness    +
    breakdown.financial    +
    breakdown.availability +
    breakdown.source       +
    breakdown.freshness
  ));

  const tierData   = getLeadTier(score);
  const isSellable = score >= 41;
  const qualityNotes = buildQualityNotes(d, breakdown);

  return {
    score,
    tier:         tierData.tier,
    price:        tierData.price,
    isSellable,
    breakdown,
    qualityNotes,
    version:      SCORE_VERSION,
  };
}

// Backward-compat shim — old code still calls computePricing() from leadsStore
export function computePricing(lead) {
  const result = calculateLeadScore({
    fullName:              lead.hasName ? "x" : "",
    phone:                 lead.hasPhone ? "0501234567" : "",
    city:                  lead.city,
    mortgageAmount:        lead.mortgageAmount,
    monthlyIncome:         lead.monthlyIncome,
    equityAmount:          lead.equityAmount,
    monthlyObligations:    lead.debtLevel,
    serviceType:           lead.purchaseStatus,
    processStage:          lead.processStage,
    requestedContactTime:  lead.requestedContactTime,
    consentAdvisorContact: Boolean(lead.hasExistingMortgage), // best-effort
    utmSource:             lead.utmSource || "",
    referrer:              lead.referrer  || "",
    createdAt:             lead.createdAt,
  });

  // Return shape that matches the old computePricing API so readStoreLeads keeps working
  return {
    finzoScore:         result.score,
    quality:            result.tier,
    regularBasePrice:   result.price,
    exclusiveBasePrice: result.price,
    regularPrice:       result.price,
    exclusivePrice:     result.price,
    ageDiscountPct:     0,
    bullets:            result.qualityNotes ? [result.qualityNotes] : [],
  };
}

export { LEAD_TIERS as SCORE_BANDS };
