// FINZO Lead Scoring & Dynamic Pricing Engine
// Scores are calculated from real lead data only. No invented values.

const SCORE_BANDS = [
  { min: 91, quality: "פרימיום",  price: 249 },
  { min: 76, quality: "חם מאוד", price: 199 },
  { min: 61, quality: "חם",       price: 149 },
  { min: 41, quality: "בינוני",   price: 99  },
  { min: 0,  quality: "הזדמנות", price: 49  },
];

// Lead type value contribution (out of 30). Higher-value cases score higher.
const TYPE_SCORE_MAP = {
  refinance:          28,
  investment:         26,
  debt_consolidation: 24,
  bank_declined:      22,
  bdi_credit_issue:   20,
  upgrader:           22,
  senior_60plus:      18,
  new_purchase:       18,
  first_apartment:    16,
  general:            10,
};

export function getBand(score) {
  return SCORE_BANDS.find((b) => score >= b.min) || SCORE_BANDS[SCORE_BANDS.length - 1];
}

// ─── A. Data completeness (0–30) ──────────────────────────────────────────────
function scoreCompleteness(lead) {
  const checks = [
    Boolean(lead.hasName),
    Boolean(lead.hasPhone),
    Boolean(lead.city),
    (lead.mortgageAmount || 0) > 0,
    (lead.monthlyIncome || 0) > 0,
    (lead.equityAmount || 0) > 0,
    Boolean(lead.purchaseStatus),
    Boolean(lead.requestedContactTime),
    Boolean(lead.hasExistingMortgage),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 30);
}

// ─── B. Financial strength (0–40) ─────────────────────────────────────────────
function scoreFinancial(lead) {
  let pts = 0;

  // Income (0–15)
  const income = Number(lead.monthlyIncome) || 0;
  if (income >= 25000)      pts += 15;
  else if (income >= 15000) pts += 12;
  else if (income >= 10000) pts += 8;
  else if (income >= 6000)  pts += 5;
  else if (income > 0)      pts += 2;

  // Equity (0–15)
  const equity = Number(lead.equityAmount) || 0;
  if (equity >= 500000)      pts += 15;
  else if (equity >= 300000) pts += 12;
  else if (equity >= 150000) pts += 8;
  else if (equity >= 50000)  pts += 5;
  else if (equity > 0)       pts += 2;

  // Debt burden (0–10) — lower debt relative to income = better
  const debt = Number(lead.debtLevel) || 0;
  const incRef = Math.max(Number(lead.monthlyIncome) || 0, 1);
  if (debt === 0)                      pts += 10;
  else if (debt < incRef * 0.3)        pts += 7;
  else if (debt < incRef * 0.5)        pts += 4;
  else if (debt < incRef * 0.7)        pts += 2;

  return Math.min(40, pts);
}

// ─── C. Lead type value (0–30) ────────────────────────────────────────────────
function scoreLeadType(lead) {
  return TYPE_SCORE_MAP[lead.purchaseStatus] || 10;
}

// ─── Main score computation ────────────────────────────────────────────────────
export function computeFinzoScore(lead) {
  const completeness = scoreCompleteness(lead);
  const financial    = scoreFinancial(lead);
  const typeScore    = scoreLeadType(lead);
  return {
    total: Math.min(100, completeness + financial + typeScore),
    completeness,
    financial,
    typeScore,
  };
}

// ─── Full pricing computation (score + fixed additions + breakdown) ────────────
export function computePricing(lead) {
  const { total: score, completeness, financial, typeScore } = computeFinzoScore(lead);
  const band = getBand(score);

  // Service type addition (specialist/complex cases are more valuable)
  const SERVICE_ADDITIONS = {
    upgrader:           25,
    investment:         25,
    new_purchase:       25,
    debt_consolidation: 50,
    bank_declined:      50,
    bdi_credit_issue:   50,
    senior_60plus:      50,
  };
  const serviceAdd = SERVICE_ADDITIONS[lead.purchaseStatus] || 0;

  // Mortgage amount addition
  const mortgage = Number(lead.mortgageAmount) || 0;
  let mortgageAdd = 0;
  if (mortgage > 2000000)      mortgageAdd = 50;
  else if (mortgage > 1500000) mortgageAdd = 30;
  else if (mortgage > 1000000) mortgageAdd = 20;
  else if (mortgage > 500000)  mortgageAdd = 10;

  // Lead freshness addition (fresh = more valuable; stale = less)
  const days = Math.floor((Date.now() - new Date(lead.createdAt || 0).getTime()) / 86400000);
  let freshnessAdd = 0;
  if (days === 0)      freshnessAdd =  25;
  else if (days <= 3)  freshnessAdd =  15;
  else if (days <= 7)  freshnessAdd =   0;
  else if (days <= 14) freshnessAdd = -15;
  else if (days <= 30) freshnessAdd = -30;
  else                 freshnessAdd = -50;

  // Data completeness addition (max +20₪)
  const completenessAdd = Math.min(20, Math.round((completeness / 30) * 20));

  const raw = band.price + serviceAdd + mortgageAdd + freshnessAdd + completenessAdd;
  // Clamp to [79, 349]
  const price = Math.max(79, Math.min(349, raw));

  // Transparency bullets — honest positives and negatives
  const bullets = [];
  if (completeness >= 24)
    bullets.push("✓ נתונים מלאים");
  else if (completeness >= 15)
    bullets.push("~ נתונים חלקיים");
  else
    bullets.push("✗ נתונים דלים");

  const income = Number(lead.monthlyIncome) || 0;
  if (income >= 15000)      bullets.push("✓ הכנסה גבוהה");
  else if (income >= 8000)  bullets.push("~ הכנסה בינונית");
  else if (income > 0)      bullets.push("✗ הכנסה נמוכה");

  const equity = Number(lead.equityAmount) || 0;
  if (equity >= 300000)      bullets.push("✓ הון עצמי גבוה");
  else if (equity >= 100000) bullets.push("~ הון עצמי בינוני");

  if (typeScore >= 24)       bullets.push("✓ סוג תיק מבוקש");
  else if (typeScore >= 18)  bullets.push("~ סוג תיק סטנדרטי");

  const debt = Number(lead.debtLevel) || 0;
  const incRef = Math.max(income, 1);
  if (debt === 0)               bullets.push("✓ ללא חובות");
  else if (debt < incRef * 0.3) bullets.push("✓ יחס חוב תקין");
  else if (debt < incRef * 0.5) bullets.push("~ חוב מתון");
  else if (debt > 0)            bullets.push("✗ חוב גבוה");

  return {
    finzoScore: score,
    quality:    band.quality,
    price,
    bullets,
  };
}

export { SCORE_BANDS, TYPE_SCORE_MAP };
