import { clampNumber, toNumber, toPositiveNumber } from "./format";

export const PROPERTY_TYPES = {
  single: { label: "דירה יחידה", maxLtv: 75 },
  replacement: { label: "משפרי דיור", maxLtv: 70 },
  investment: { label: "דירה להשקעה", maxLtv: 50 },
};

export const CREDIT_STATUSES = {
  clean: { label: "תקין", penalty: 0 },
  late: { label: "היו פיגורים", penalty: 16 },
  negative: { label: "BDI שלילי", penalty: 30 },
  unknown: { label: "לא בטוח", penalty: 8 },
};

export const INDEXATION_TYPES = {
  unlinked: { label: "לא צמוד למדד", annualInflation: 0 },
  linked: { label: "צמוד למדד", annualInflation: 2.5 },
};

export const REPAYMENT_METHODS = {
  spitzer: { label: "לוח שפיצר - החזר קבוע" },
  equalPrincipal: { label: "קרן שווה - החזר יורד" },
};

const DEFAULT_RATES = {
  primeMortgage: 5.1,
  fixedUnlinked: 5.45,
  variable5: 5.35,
};

const TRACKS = [
  { key: "prime", label: "פריים", share: 0.33, rateKey: "primeMortgage" },
  { key: "fixed", label: "קבועה לא צמודה", share: 0.34, rateKey: "fixedUnlinked" },
  { key: "variable", label: "משתנה כל 5 שנים", share: 0.33, rateKey: "variable5" },
];

export function monthlyPayment(principal, annualRate, years) {
  const amount = toPositiveNumber(principal);
  const safeYears = clampNumber(years, 1, 40);
  const months = Math.max(1, Math.round(safeYears * 12));
  const safeRate = clampNumber(annualRate, 0, 25);
  const monthlyRate = safeRate / 100 / 12;

  if (!amount) return 0;
  if (!monthlyRate) return Math.round(amount / months);

  return Math.round((amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months)));
}

function equalPrincipalPayment(principal, annualRate, years, month = 1) {
  const amount = toPositiveNumber(principal);
  const safeYears = clampNumber(years, 1, 40);
  const months = Math.max(1, Math.round(safeYears * 12));
  const safeRate = clampNumber(annualRate, 0, 25);
  const monthlyRate = safeRate / 100 / 12;
  const principalPart = amount / months;
  const remainingPrincipal = Math.max(0, amount - principalPart * Math.max(0, month - 1));

  if (!amount) return { payment: 0, principalPart: 0, interestPart: 0 };

  const interestPart = remainingPrincipal * monthlyRate;
  return {
    payment: Math.round(principalPart + interestPart),
    principalPart: Math.round(principalPart),
    interestPart: Math.round(interestPart),
  };
}

function buildPaymentProjection({ mortgage, annualRate, years, method, indexation }) {
  const amount = toPositiveNumber(mortgage);
  const safeYears = clampNumber(years, 1, 40);
  const safeRate = clampNumber(annualRate, 0, 25);
  const months = Math.max(1, Math.round(safeYears * 12));
  const monthlyRate = safeRate / 100 / 12;
  const index = INDEXATION_TYPES[indexation] || INDEXATION_TYPES.unlinked;
  const inflationFactor = index.annualInflation ? Math.pow(1 + index.annualInflation / 100, safeYears) : 1;

  if (!amount) {
    return {
      firstMonthlyPayment: 0,
      monthlyPaymentEstimate: 0,
      maxMonthlyPaymentEstimate: 0,
      firstPrincipalPart: 0,
      firstInterestPart: 0,
      totalPaidEstimate: 0,
      totalInterestEstimate: 0,
    };
  }

  if (method === "equalPrincipal") {
    const first = equalPrincipalPayment(amount, safeRate, safeYears, 1);
    const last = equalPrincipalPayment(amount, safeRate, safeYears, months);
    const totalInterest = Math.round(monthlyRate * amount * (months + 1) / 2);
    const linkedAddition = Math.round((amount + totalInterest) * Math.max(0, inflationFactor - 1) * 0.45);
    const totalPaid = amount + totalInterest + linkedAddition;

    return {
      firstMonthlyPayment: first.payment,
      monthlyPaymentEstimate: first.payment,
      maxMonthlyPaymentEstimate: first.payment,
      firstPrincipalPart: first.principalPart,
      firstInterestPart: first.interestPart,
      lastMonthlyPaymentEstimate: last.payment,
      totalPaidEstimate: Math.round(totalPaid),
      totalInterestEstimate: Math.max(0, Math.round(totalPaid - amount)),
    };
  }

  const monthly = monthlyPayment(amount, safeRate, safeYears);
  const firstInterestPart = Math.round(amount * monthlyRate);
  const firstPrincipalPart = Math.max(0, monthly - firstInterestPart);
  const baseTotalPaid = monthly * months;
  const linkedAddition = Math.round(baseTotalPaid * Math.max(0, inflationFactor - 1) * 0.45);
  const totalPaid = baseTotalPaid + linkedAddition;

  return {
    firstMonthlyPayment: monthly,
    monthlyPaymentEstimate: monthly,
    maxMonthlyPaymentEstimate: Math.round(monthly * (index.annualInflation ? 1 + index.annualInflation / 100 * Math.min(safeYears, 12) / 2 : 1)),
    firstPrincipalPart,
    firstInterestPart,
    lastMonthlyPaymentEstimate: monthly,
    totalPaidEstimate: Math.round(totalPaid),
    totalInterestEstimate: Math.max(0, Math.round(totalPaid - amount)),
  };
}

export function mortgagePrincipalFromPayment(payment, annualRate, years) {
  const monthly = toPositiveNumber(payment);
  const safeYears = clampNumber(years, 1, 40);
  const months = Math.max(1, Math.round(safeYears * 12));
  const safeRate = clampNumber(annualRate, 0, 25);
  const monthlyRate = safeRate / 100 / 12;

  if (!monthly) return 0;
  if (!monthlyRate) return Math.round(monthly * months);

  return Math.round((monthly * (1 - Math.pow(1 + monthlyRate, -months))) / monthlyRate);
}

function getTracks(mortgage, rates = {}, years = 30, rateShift = 0) {
  const safeMortgage = toPositiveNumber(mortgage);
  const safeYears = clampNumber(years, 1, 40);
  return TRACKS.map((track, index) => {
    const amount = index === TRACKS.length - 1
      ? Math.max(0, safeMortgage - Math.round(safeMortgage * TRACKS[0].share) - Math.round(safeMortgage * TRACKS[1].share))
      : Math.round(safeMortgage * track.share);
    const annualRate = clampNumber(Number(rates?.[track.rateKey] ?? DEFAULT_RATES[track.rateKey]) + rateShift, 0.1, 25);

    return {
      ...track,
      amount,
      annualRate,
      monthly: monthlyPayment(amount, annualRate, safeYears),
    };
  });
}

function ratioStatus(ratio) {
  if (ratio > 50) return { label: "סיכון גבוה", tone: "danger" };
  if (ratio > 40) return { label: "גבולי - עשוי לדרוש התאמה", tone: "warning" };
  if (ratio > 30) return { label: "סביר", tone: "good" };
  return { label: "מצב מצוין", tone: "good" };
}

function getTotalObligationsStatus(ratio) {
  if (ratio > 55) return { label: "סיכון גבוה מאוד", tone: "danger" };
  if (ratio > 50) return { label: "סיכון גבוה", tone: "danger" };
  if (ratio > 40) return { label: "גבולי", tone: "warning" };
  return { label: "תקין", tone: "good" };
}

function conservativeStatus(ratio) {
  if (ratio > 50) return { label: "סיכון תזרימי", tone: "warning" };
  if (ratio > 40) return { label: "גבולי", tone: "warning" };
  if (ratio > 30) return { label: "סביר", tone: "good" };
  return { label: "מצוין", tone: "good" };
}

function buildRecommendations(analysis) {
  const recommendations = [];

  if (analysis.totalObligationsRatio > 40) {
    recommendations.push("לסגור או למחזר הלוואות קיימות כדי להוריד את יחס ההתחייבויות הכולל.");
  }

  if (analysis.mortgageOnlyRatio > 35 || analysis.disposableRepaymentRatio > 40) {
    recommendations.push("להקטין את סכום המשכנתא או להאריך את תקופת ההחזר כדי להוריד את ההחזר החודשי.");
  }

  if (analysis.ltvLimitExceeded || analysis.missingEquity > 0) {
    recommendations.push("להגדיל הון עצמי או לבחור נכס זול יותר כדי להתקרב לשיעור המימון המקובל לפי סוג העסקה ומדיניות הגוף המממן.");
  }

  if (analysis.afterHousing <= 0 || analysis.afterHousing < analysis.income * 0.18) {
    recommendations.push("להקטין הוצאות, לבדוק תמהיל עם החזר נמוך יותר או להשאיר מרווח מחיה גבוה יותר אחרי העסקה.");
  }

  if (analysis.obligationsToCloseMonthly > 0) {
    recommendations.push("סגירת התחייבויות עשויה לשפר את יחס ההתחייבויות ואת אומדן הבדיקה הראשונית.");
  }

  if (!recommendations.length) {
    recommendations.push("לפי הנתונים שהוזנו התיק נראה מאוזן לבדיקה ראשונית. כדאי להשוות כמה הצעות בנקאיות ולבדוק תמהיל לפני חתימה, בכפוף לאישור סופי.");
  }

  return recommendations;
}

export function calculateMortgageAnalysis(data, rates = {}) {
  const income = toPositiveNumber(data.income);
  const expenses = toPositiveNumber(data.expenses);
  const obligationsToCloseMonthly = Math.min(expenses, toPositiveNumber(data.obligationsToCloseAmount));
  const remainingExpenses = Math.max(expenses - obligationsToCloseMonthly, 0);
  // Household expenses are stored for advisor review only and never affect the score.
  const householdExpenses = toPositiveNumber(data.householdExpenses);
  const currentHousing = toPositiveNumber(data.currentHousing);
  const price = toPositiveNumber(data.price);
  const equity = toPositiveNumber(data.equity);
  const years = clampNumber(data.years || 30, 5, 30);
  const mortgage = toPositiveNumber(data.mortgageAmount) || Math.max(price - equity, 0);
  const property = PROPERTY_TYPES[data.propertyType] || PROPERTY_TYPES.single;
  const credit = CREDIT_STATUSES[data.credit] || CREDIT_STATUSES.clean;
  const indexation = INDEXATION_TYPES[data.indexation] ? data.indexation : "unlinked";
  const repaymentMethod = REPAYMENT_METHODS[data.repaymentMethod] ? data.repaymentMethod : "spitzer";

  const maxMortgage = price ? Math.round(price * (property.maxLtv / 100)) : 0;
  const requestedAboveLimit = price ? Math.max(mortgage - maxMortgage, 0) : 0;
  const missingEquity = price ? Math.max(requestedAboveLimit, 0) : 0;
  const tracks = getTracks(mortgage, rates, years);
  const highTracks = getTracks(mortgage, rates, years, 1);
  const weightedRate = clampNumber(toNumber(data.annualRate) || tracks.reduce((sum, track) => sum + track.annualRate * track.share, 0), 0, 25);
  const projection = buildPaymentProjection({ mortgage, annualRate: weightedRate, years, method: repaymentMethod, indexation });
  const monthly = projection.monthlyPaymentEstimate;
  const monthlyHigh = Math.max(projection.maxMonthlyPaymentEstimate, highTracks.reduce((sum, track) => sum + track.monthly, 0));
  const rateImpact = weightedRate > 6.25 ? 8 : weightedRate > 5.75 ? 5 : weightedRate > 5.25 ? 2 : 0;

  const disposableIncome = Math.max(0, income - remainingExpenses);
  const mortgageOnlyRatio = income ? (monthly / income) * 100 : 0;
  const totalObligationsRatio = income ? ((monthly + remainingExpenses) / income) * 100 : 0;
  const disposableRepaymentRatio = disposableIncome ? (monthly / disposableIncome) * 100 : 0;
  const repaymentRatio = disposableRepaymentRatio;
  const beforeHousing = income - expenses - currentHousing;
  const afterHousing = income - remainingExpenses - monthly;
  const monthlyGap = afterHousing - beforeHousing;
  const equityRatio = price ? (equity / price) * 100 : 0;
  const ltv = price ? (mortgage / price) * 100 : 0;
  const ltvLimitExceeded = price ? ltv > property.maxLtv : false;
  const totalPaidEstimate = projection.totalPaidEstimate;
  const totalInterestEstimate = projection.totalInterestEstimate;
  const safeMonthlyPayment = Math.max(0, disposableIncome * 0.3);
  const maxRecommendedMortgageByIncome = mortgagePrincipalFromPayment(safeMonthlyPayment, weightedRate, years);
  const requiredDisposableIncomeForMortgage = monthly ? monthly / 0.3 : 0;
  const requiredIncomeForMortgage = requiredDisposableIncomeForMortgage + remainingExpenses;
  const stressAfterHousing = income - remainingExpenses - monthlyHigh;

  const mortgageOnlyStatus = ratioStatus(mortgageOnlyRatio);
  const totalObligationsStatusResult = getTotalObligationsStatus(totalObligationsRatio);
  const conservativeStatusResult = conservativeStatus(disposableRepaymentRatio);
  const hardLimitExceeded = mortgageOnlyRatio > 50 || ltvLimitExceeded || totalObligationsRatio > 55 || afterHousing <= 0;
  const borderlineCase = !hardLimitExceeded && (mortgageOnlyRatio > 40 || totalObligationsRatio > 40 || disposableRepaymentRatio > 50);

  const incomePenalty = income <= 0 ? 60 : income < 6000 ? 30 : income < 10000 ? 10 : 0;
  const mortgageOnlyPenalty = mortgageOnlyRatio > 50 ? 38 : mortgageOnlyRatio > 40 ? 20 : mortgageOnlyRatio > 35 ? 7 : 0;
  const obligationsPenalty = totalObligationsRatio > 55 ? 34 : totalObligationsRatio > 50 ? 24 : totalObligationsRatio > 40 ? 15 : 0;
  const conservativePenalty = disposableRepaymentRatio > 60 ? 24 : disposableRepaymentRatio > 50 ? 18 : disposableRepaymentRatio > 40 ? 8 : 0;
  const equityPenalty = requestedAboveLimit > 0 ? 34 : 0;
  const baseApproval = 92 - incomePenalty - credit.penalty - mortgageOnlyPenalty - obligationsPenalty - conservativePenalty - equityPenalty - rateImpact;
  const approval = hardLimitExceeded ? Math.min(38, Math.max(5, baseApproval)) : Math.max(5, Math.min(96, baseApproval));
  const risk = hardLimitExceeded ? "סיכון גבוה" : borderlineCase ? "תיק גבולי - עשוי לדרוש התאמות" : approval >= 75 ? "בסיס ראשוני טוב לבדיקה" : "דורש בדיקה";
  const mainIssue = hardLimitExceeded
    ? "התיק גבולי ועשוי לדרוש התאמה לפני פנייה לבנק"
    : disposableRepaymentRatio > 50
      ? "ההחזר החודשי גבוה ביחס להכנסה הפנויה"
      : totalObligationsRatio > 40
        ? "יחס ההתחייבויות הכולל גבולי"
        : missingEquity > 0
          ? "חוסר בהון עצמי"
          : credit.penalty > 0
            ? "נדרש לשפר אשראי"
            : "התיק נראה מאוזן לבדיקה ראשונית";
  const recommendedAction = hardLimitExceeded || borderlineCase
    ? "תיק גבולי - עשוי לדרוש התאמות. מומלץ לבדוק אפשרות להקטין משכנתא, להאריך תקופה, להפחית הלוואות או להגדיל הכנסה לפני פנייה לבנק."
    : missingEquity > 0
      ? "להגדיל הון עצמי או לבחור נכס זול יותר."
      : approval < 60
        ? "לשפר נתונים לפני פנייה לבנק."
        : "התיק נראה מתאים לבדיקה מקצועית מול כמה בנקים, בכפוף למדיניות הגוף המממן ולאישור סופי.";

  const analysis = {
    income,
    expenses,
    obligationsToCloseMonthly,
    remainingExpenses,
    householdExpenses,
    currentHousing,
    price,
    equity,
    years,
    mortgage,
    indexation,
    indexationInfo: INDEXATION_TYPES[indexation],
    repaymentMethod,
    repaymentMethodInfo: REPAYMENT_METHODS[repaymentMethod],
    property,
    credit,
    maxMortgage,
    requestedAboveLimit,
    missingEquity,
    tracks,
    monthly,
    annualRate: clampNumber(data.annualRate, 0, 25),
    firstMonthlyPayment: projection.firstMonthlyPayment,
    maxMonthlyPaymentEstimate: projection.maxMonthlyPaymentEstimate,
    firstPrincipalPart: projection.firstPrincipalPart,
    firstInterestPart: projection.firstInterestPart,
    lastMonthlyPaymentEstimate: projection.lastMonthlyPaymentEstimate,
    monthlyHigh,
    weightedRate,
    rateImpact,
    disposableIncome,
    mortgageOnlyRatio,
    mortgageOnlyStatus,
    totalObligationsRatio,
    totalObligationsStatus: totalObligationsStatusResult,
    repaymentRatio,
    disposableRepaymentRatio,
    repaymentStatus: conservativeStatusResult,
    conservativeStatus: conservativeStatusResult,
    beforeHousing,
    afterHousing,
    monthlyGap,
    equityRatio,
    ltv,
    ltvLimitExceeded,
    hardLimitExceeded,
    borderlineCase,
    bankIsraelLimitExceeded: hardLimitExceeded,
    totalPaidEstimate,
    totalInterestEstimate,
    safeMonthlyPayment,
    maxRecommendedMortgageByIncome,
    requiredDisposableIncomeForMortgage,
    requiredIncomeForMortgage,
    stressAfterHousing,
    approval,
    risk,
    mainIssue,
    recommendedAction,
  };

  return {
    ...analysis,
    recommendations: buildRecommendations(analysis),
  };
}

/* ────────────────────────────────────────────────
   PHASE 3 — Mortgage Calculator Pro Extensions
   ──────────────────────────────────────────────── */

export const MORTGAGE_TRACKS = {
  fixed_unlinked: { label: 'קבועה לא צמודה (קל"צ)', defaultRate: 5.45, indexation: "unlinked" },
  cpi_linked:     { label: "צמודה למדד",            defaultRate: 3.5,  indexation: "linked" },
  prime:          { label: "פריים",                  defaultRate: 5.1,  indexation: "unlinked" },
};

export function compareTrackPayments(principal, years, customRates = {}) {
  const amount = toPositiveNumber(principal);
  const safeYears = clampNumber(years, 1, 40);
  return Object.entries(MORTGAGE_TRACKS).map(([key, track]) => {
    const rate = clampNumber(Number(customRates[key] ?? track.defaultRate), 0.1, 25);
    const monthly = monthlyPayment(amount, rate, safeYears);
    const totalPaid = monthly * safeYears * 12;
    const totalInterest = totalPaid - amount;
    return { key, label: track.label, rate, monthly, totalPaid, totalInterest, principal: amount, years: safeYears };
  });
}

export function calculateMixPayment(principal, years, mix, customRates = {}) {
  const amount = toPositiveNumber(principal);
  const safeYears = clampNumber(years, 1, 40);
  const tracks = Object.entries(mix).map(([key, share]) => {
    const trackInfo = MORTGAGE_TRACKS[key];
    if (!trackInfo) return null;
    const trackAmount = Math.round(amount * clampNumber(share, 0, 1));
    const rate = clampNumber(Number(customRates[key] ?? trackInfo.defaultRate), 0.1, 25);
    const monthly = monthlyPayment(trackAmount, rate, safeYears);
    const totalPaid = monthly * safeYears * 12;
    return { key, label: trackInfo.label, share, amount: trackAmount, rate, monthly, totalPaid, totalInterest: totalPaid - trackAmount };
  }).filter(Boolean);
  const totalMonthly = tracks.reduce((s, t) => s + t.monthly, 0);
  const totalPaid = tracks.reduce((s, t) => s + t.totalPaid, 0);
  return { tracks, totalMonthly, totalPaid, totalInterest: totalPaid - amount };
}

export function stressTest(principal, years, baseRates = {}, shifts = [1, 2, 3]) {
  const amount = toPositiveNumber(principal);
  const safeYears = clampNumber(years, 1, 40);
  const base = calculateMixPayment(amount, safeYears, { fixed_unlinked: 0.34, cpi_linked: 0.33, prime: 0.33 }, baseRates);
  return shifts.map(shift => {
    const shiftedRates = {};
    for (const key of Object.keys(MORTGAGE_TRACKS)) {
      shiftedRates[key] = Number(baseRates[key] ?? MORTGAGE_TRACKS[key].defaultRate) + shift;
    }
    const stressed = calculateMixPayment(amount, safeYears, { fixed_unlinked: 0.34, cpi_linked: 0.33, prime: 0.33 }, shiftedRates);
    return { shift, totalMonthly: stressed.totalMonthly, increase: stressed.totalMonthly - base.totalMonthly, increasePercent: base.totalMonthly ? ((stressed.totalMonthly - base.totalMonthly) / base.totalMonthly * 100) : 0 };
  });
}

export function buildAmortizationTable(principal, annualRate, years) {
  const amount = toPositiveNumber(principal);
  const safeYears = clampNumber(years, 1, 40);
  const months = safeYears * 12;
  const rate = clampNumber(annualRate, 0, 25) / 100 / 12;
  const monthly = monthlyPayment(amount, annualRate, safeYears);
  const rows = [];
  let balance = amount;
  let totalInterest = 0;
  let totalPrincipal = 0;

  for (let m = 1; m <= months; m++) {
    const interestPart = Math.round(balance * rate);
    const principalPart = Math.min(monthly - interestPart, balance);
    balance = Math.max(0, balance - principalPart);
    totalInterest += interestPart;
    totalPrincipal += principalPart;
    rows.push({ month: m, payment: monthly, principalPart, interestPart, balance, totalInterest, totalPrincipal });
  }
  return { rows, totalPaid: monthly * months, totalInterest, totalPrincipal: amount };
}

export function calculateAdditionalCosts(propertyPrice, options = {}) {
  const price = toPositiveNumber(propertyPrice);
  const appraiserFee = toPositiveNumber(options.appraiserFee) || Math.round(Math.max(2500, Math.min(5000, price * 0.001)));
  const lawyerFee = toPositiveNumber(options.lawyerFee) || Math.round(price * 0.005 + 2000);
  const brokerFee = toPositiveNumber(options.brokerFee) || Math.round(price * 0.02);
  const isFirstApartment = options.isFirstApartment !== false;
  let purchaseTax = 0;
  if (isFirstApartment) {
    if (price > 1919155) purchaseTax = Math.round((price - 1919155) * 0.035);
  } else {
    if (price <= 6055070) purchaseTax = Math.round(price * 0.08);
    else purchaseTax = Math.round(price * 0.10);
  }
  const total = appraiserFee + lawyerFee + brokerFee + purchaseTax;
  return { appraiserFee, lawyerFee, brokerFee, purchaseTax, total, breakdown: [
    { label: "שמאי", amount: appraiserFee },
    { label: 'עו"ד', amount: lawyerFee },
    { label: "תיווך", amount: brokerFee },
    { label: "מס רכישה", amount: purchaseTax },
  ]};
}

export function explainApprovalScore(analysis) {
  const factors = [];
  if (!analysis) return factors;

  const { income, mortgageOnlyRatio, totalObligationsRatio, disposableRepaymentRatio, ltvLimitExceeded, missingEquity, credit } = analysis;

  if (income <= 0) factors.push({ factor: "הכנסה", impact: "שלילי", points: -60, tip: "יש להזין הכנסה חודשית נטו" });
  else if (income < 6000) factors.push({ factor: "הכנסה נמוכה", impact: "שלילי", points: -30, tip: "הכנסה מתחת ל-₪6,000 מקשה על אישור" });
  else if (income < 10000) factors.push({ factor: "הכנסה בינונית", impact: "מתון", points: -10, tip: "הגדלת הכנסה תשפר את הציון" });
  else factors.push({ factor: "הכנסה", impact: "חיובי", points: 0, tip: "הכנסה טובה — נקודת חוזק" });

  if (mortgageOnlyRatio > 50) factors.push({ factor: "יחס החזר/הכנסה", impact: "שלילי", points: -38, tip: "להקטין סכום משכנתא או להאריך תקופה" });
  else if (mortgageOnlyRatio > 40) factors.push({ factor: "יחס החזר/הכנסה", impact: "מתון", points: -20, tip: "היחס גבולי — שקלו להקטין את ההחזר" });
  else factors.push({ factor: "יחס החזר/הכנסה", impact: "חיובי", points: 0, tip: "יחס תקין" });

  if (totalObligationsRatio > 55) factors.push({ factor: "התחייבויות כוללות", impact: "שלילי", points: -34, tip: "לסגור הלוואות קיימות לפני הגשה" });
  else if (totalObligationsRatio > 40) factors.push({ factor: "התחייבויות כוללות", impact: "מתון", points: -15, tip: "מומלץ להפחית התחייבויות" });
  else factors.push({ factor: "התחייבויות כוללות", impact: "חיובי", points: 0, tip: "רמת התחייבויות סבירה" });

  if (ltvLimitExceeded || missingEquity > 0) factors.push({ factor: "הון עצמי", impact: "שלילי", points: -34, tip: "להגדיל הון עצמי או לבחור נכס זול יותר" });
  else factors.push({ factor: "הון עצמי", impact: "חיובי", points: 0, tip: "הון עצמי מספיק" });

  if (credit && credit.penalty > 0) factors.push({ factor: "אשראי", impact: "שלילי", points: -credit.penalty, tip: "לשפר דירוג אשראי — לסגור פיגורים ולהסדיר חובות" });
  else factors.push({ factor: "אשראי", impact: "חיובי", points: 0, tip: "מצב אשראי תקין" });

  return factors;
}

/* ────────────────────────────────────────────────
   PHASE 4 — Refinance Engine Extensions
   ──────────────────────────────────────────────── */

/**
 * Early-payment (היוון) penalty estimate.
 * The discounting penalty is driven by the DIFFERENCE between the loan's rate
 * and the current market/offered rate — not by the full loan rate. Pass the
 * comparison rate as `marketRate`; when it is omitted the full loan rate is
 * used as the gap (legacy conservative estimate).
 */
export function calculateEarlyPaymentPenalty(remainingPrincipal, annualRate, remainingMonths, penaltyType = "standard", marketRate = null) {
  const principal = toPositiveNumber(remainingPrincipal);
  const rate = clampNumber(annualRate, 0, 25);
  const months = Math.max(1, remainingMonths);

  if (penaltyType === "prime") return { penalty: 0, description: "מסלול פריים — ללא עמלת פירעון מוקדם" };

  const rateGap = marketRate == null ? rate : Math.max(0, rate - clampNumber(marketRate, 0, 25));
  const differentialMonths = Math.min(months, 18);
  const monthlyGap = rateGap / 100 / 12;
  const penalty = Math.round(principal * monthlyGap * differentialMonths * 0.6);

  return { penalty, differentialMonths, rateGap, description: `עמלת היוון: ${differentialMonths} חודשים × 60% מהפרש הריביות` };
}

export function calculateCpiEffect(principal, annualCpi, years) {
  const amount = toPositiveNumber(principal);
  const cpi = clampNumber(annualCpi, -5, 15);
  const safeYears = clampNumber(years, 1, 40);
  const factor = Math.pow(1 + cpi / 100, safeYears);
  const adjustedPrincipal = Math.round(amount * factor);
  const cpiCost = adjustedPrincipal - amount;
  return { originalPrincipal: amount, adjustedPrincipal, cpiCost, factor, years: safeYears, annualCpi: cpi };
}

export function calculateRefinanceBreakeven(currentMonthly, newMonthly, refinanceCosts) {
  const currentPmt = toPositiveNumber(currentMonthly);
  const newPmt = toPositiveNumber(newMonthly);
  const costs = toPositiveNumber(refinanceCosts);
  const monthlySavings = currentPmt - newPmt;
  if (monthlySavings <= 0) return { breakEvenMonths: Infinity, monthlySavings: 0, worthIt: false, reason: "ההחזר החדש גבוה מהקיים" };
  const breakEvenMonths = Math.ceil(costs / monthlySavings);
  return { breakEvenMonths, monthlySavings, totalCosts: costs, worthIt: breakEvenMonths <= 36, reason: breakEvenMonths <= 36 ? `המחזור ישתלם אחרי ${breakEvenMonths} חודשים` : `נקודת איזון רק אחרי ${breakEvenMonths} חודשים — שקלו בכובד ראש` };
}

export function refinanceRecommendation(currentLoan, newTerms) {
  const { principal, rate, remainingYears, trackType } = currentLoan;
  const { newRate, newYears } = newTerms;
  const currentMonthly = monthlyPayment(principal, rate, remainingYears);
  const newMonthly = monthlyPayment(principal, newRate, newYears || remainingYears);
  const penalty = calculateEarlyPaymentPenalty(principal, rate, remainingYears * 12, trackType, newRate);
  const refinanceCosts = penalty.penalty + 3000;
  const breakeven = calculateRefinanceBreakeven(currentMonthly, newMonthly, refinanceCosts);
  const currentTotal = currentMonthly * remainingYears * 12;
  const newTotal = newMonthly * (newYears || remainingYears) * 12 + refinanceCosts;
  const totalSavings = currentTotal - newTotal;

  let recommendation = "לא מומלץ";
  if (totalSavings > 20000 && breakeven.worthIt) recommendation = "מומלץ מאוד";
  else if (totalSavings > 5000 && breakeven.breakEvenMonths <= 48) recommendation = "כדאי לבדוק";

  return { currentMonthly, newMonthly, monthlySavings: breakeven.monthlySavings, penalty: penalty.penalty, refinanceCosts, breakEvenMonths: breakeven.breakEvenMonths, totalSavings, recommendation, currentTotal, newTotal };
}
