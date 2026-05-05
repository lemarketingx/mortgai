import { toNumber } from "./format";

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
  const amount = toNumber(principal);
  const months = Math.max(1, Math.round(toNumber(years) * 12));
  const monthlyRate = Math.max(0, Number(annualRate) || 0) / 100 / 12;

  if (!amount) return 0;
  if (!monthlyRate) return Math.round(amount / months);

  return Math.round((amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months)));
}

function equalPrincipalPayment(principal, annualRate, years, month = 1) {
  const amount = toNumber(principal);
  const months = Math.max(1, Math.round(toNumber(years) * 12));
  const monthlyRate = Math.max(0, Number(annualRate) || 0) / 100 / 12;
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
  const amount = toNumber(mortgage);
  const months = Math.max(1, Math.round(toNumber(years) * 12));
  const monthlyRate = Math.max(0, Number(annualRate) || 0) / 100 / 12;
  const index = INDEXATION_TYPES[indexation] || INDEXATION_TYPES.unlinked;
  const inflationFactor = index.annualInflation ? Math.pow(1 + index.annualInflation / 100, years) : 1;

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
    const first = equalPrincipalPayment(amount, annualRate, years, 1);
    const last = equalPrincipalPayment(amount, annualRate, years, months);
    const totalInterest = Math.round(monthlyRate * amount * (months + 1) / 2);
    const linkedAddition = Math.round((amount + totalInterest) * Math.max(0, inflationFactor - 1) * 0.45);
    const totalPaid = amount + totalInterest + linkedAddition;

    return {
      firstMonthlyPayment: first.payment,
      monthlyPaymentEstimate: first.payment,
      maxMonthlyPaymentEstimate: Math.round(first.payment * (index.annualInflation ? 1 + index.annualInflation / 100 * Math.min(years, 12) / 2 : 1)),
      firstPrincipalPart: first.principalPart,
      firstInterestPart: first.interestPart,
      lastMonthlyPaymentEstimate: last.payment,
      totalPaidEstimate: Math.round(totalPaid),
      totalInterestEstimate: Math.max(0, Math.round(totalPaid - amount)),
    };
  }

  const monthly = monthlyPayment(amount, annualRate, years);
  const firstInterestPart = Math.round(amount * monthlyRate);
  const firstPrincipalPart = Math.max(0, monthly - firstInterestPart);
  const baseTotalPaid = monthly * months;
  const linkedAddition = Math.round(baseTotalPaid * Math.max(0, inflationFactor - 1) * 0.45);
  const totalPaid = baseTotalPaid + linkedAddition;

  return {
    firstMonthlyPayment: monthly,
    monthlyPaymentEstimate: monthly,
    maxMonthlyPaymentEstimate: Math.round(monthly * (index.annualInflation ? 1 + index.annualInflation / 100 * Math.min(years, 12) / 2 : 1)),
    firstPrincipalPart,
    firstInterestPart,
    lastMonthlyPaymentEstimate: monthly,
    totalPaidEstimate: Math.round(totalPaid),
    totalInterestEstimate: Math.max(0, Math.round(totalPaid - amount)),
  };
}

export function mortgagePrincipalFromPayment(payment, annualRate, years) {
  const monthly = Math.max(0, toNumber(payment));
  const months = Math.max(1, Math.round(toNumber(years) * 12));
  const monthlyRate = Math.max(0, Number(annualRate) || 0) / 100 / 12;

  if (!monthly) return 0;
  if (!monthlyRate) return Math.round(monthly * months);

  return Math.round((monthly * (1 - Math.pow(1 + monthlyRate, -months))) / monthlyRate);
}

function getTracks(mortgage, rates = {}, years = 30, rateShift = 0) {
  return TRACKS.map((track, index) => {
    const amount = index === TRACKS.length - 1
      ? Math.max(0, mortgage - Math.round(mortgage * TRACKS[0].share) - Math.round(mortgage * TRACKS[1].share))
      : Math.round(mortgage * track.share);
    const annualRate = Math.max(0.1, Number(rates?.[track.rateKey] ?? DEFAULT_RATES[track.rateKey]) + rateShift);

    return {
      ...track,
      amount,
      annualRate,
      monthly: monthlyPayment(amount, annualRate, years),
    };
  });
}

function ratioStatus(ratio) {
  if (ratio > 50) return { label: "סיכון גבוה", tone: "danger" };
  if (ratio > 40) return { label: "גבולי - דורש התאמה", tone: "warning" };
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
    recommendations.push("להגדיל הון עצמי או לבחור נכס זול יותר כדי לעמוד בשיעור המימון המותר.");
  }

  if (analysis.afterHousing <= 0 || analysis.afterHousing < analysis.income * 0.18) {
    recommendations.push("להקטין הוצאות, לבדוק תמהיל עם החזר נמוך יותר או להשאיר מרווח מחיה גבוה יותר אחרי העסקה.");
  }

  if (analysis.loansToCloseMonthly > 0) {
    recommendations.push("סגירת הלוואות משפרת את יחס ההתחייבויות ואת סיכוי האישור.");
  }

  if (!recommendations.length) {
    recommendations.push("התיק נראה מאוזן. כדאי להשוות כמה הצעות בנקאיות ולבדוק תמהיל לפני חתימה.");
  }

  return recommendations;
}

export function calculateMortgageAnalysis(data, rates = {}) {
  const income = toNumber(data.income);
  const expenses = toNumber(data.expenses);
  const existingLoansMonthly = toNumber(data.loans);
  const loansToCloseMonthly = Math.min(existingLoansMonthly, toNumber(data.loansToClose));
  const remainingLoansMonthly = Math.max(existingLoansMonthly - loansToCloseMonthly, 0);
  const loanClosureMonthlySaving = existingLoansMonthly - remainingLoansMonthly;
  const currentHousing = toNumber(data.currentHousing);
  const price = toNumber(data.price);
  const equity = toNumber(data.equity);
  const years = Math.min(30, Math.max(5, toNumber(data.years) || 30));
  const mortgage = toNumber(data.mortgageAmount) || Math.max(price - equity, 0);
  const property = PROPERTY_TYPES[data.propertyType] || PROPERTY_TYPES.single;
  const credit = CREDIT_STATUSES[data.credit] || CREDIT_STATUSES.clean;
  const indexation = INDEXATION_TYPES[data.indexation] ? data.indexation : "unlinked";
  const repaymentMethod = REPAYMENT_METHODS[data.repaymentMethod] ? data.repaymentMethod : "spitzer";

  const maxMortgage = price ? Math.round(price * (property.maxLtv / 100)) : 0;
  const requestedAboveLimit = price ? Math.max(mortgage - maxMortgage, 0) : 0;
  const missingEquity = price ? Math.max(price - maxMortgage - equity, 0) : 0;
  const tracks = getTracks(mortgage, rates, years);
  const highTracks = getTracks(mortgage, rates, years, 1);
  const weightedRate = toNumber(data.annualRate) || tracks.reduce((sum, track) => sum + track.annualRate * track.share, 0);
  const projection = buildPaymentProjection({ mortgage, annualRate: weightedRate, years, method: repaymentMethod, indexation });
  const monthly = projection.monthlyPaymentEstimate;
  const monthlyHigh = Math.max(projection.maxMonthlyPaymentEstimate, highTracks.reduce((sum, track) => sum + track.monthly, 0));
  const rateImpact = weightedRate > 6.25 ? 8 : weightedRate > 5.75 ? 5 : weightedRate > 5.25 ? 2 : 0;

  const disposableIncome = Math.max(0, income - expenses - remainingLoansMonthly);
  const mortgageOnlyRatio = income ? (monthly / income) * 100 : 0;
  const totalObligationsRatio = income ? ((monthly + remainingLoansMonthly) / income) * 100 : 0;
  const disposableRepaymentRatio = disposableIncome ? (monthly / disposableIncome) * 100 : 0;
  const repaymentRatio = disposableRepaymentRatio;
  const beforeHousing = income - expenses - existingLoansMonthly - currentHousing;
  const afterHousing = income - expenses - remainingLoansMonthly - monthly;
  const monthlyGap = afterHousing - beforeHousing;
  const equityRatio = price ? (equity / price) * 100 : 0;
  const ltv = price ? (mortgage / price) * 100 : 0;
  const ltvLimitExceeded = price ? ltv > property.maxLtv : false;
  const totalPaidEstimate = projection.totalPaidEstimate;
  const totalInterestEstimate = projection.totalInterestEstimate;
  const safeMonthlyPayment = Math.max(0, disposableIncome * 0.3);
  const maxRecommendedMortgageByIncome = mortgagePrincipalFromPayment(safeMonthlyPayment, weightedRate, years);
  const requiredDisposableIncomeForMortgage = monthly ? monthly / 0.3 : 0;
  const requiredIncomeForMortgage = requiredDisposableIncomeForMortgage + expenses + remainingLoansMonthly;
  const stressAfterHousing = income - expenses - remainingLoansMonthly - monthlyHigh;

  const mortgageOnlyStatus = ratioStatus(mortgageOnlyRatio);
  const totalObligationsStatusResult = getTotalObligationsStatus(totalObligationsRatio);
  const conservativeStatusResult = conservativeStatus(disposableRepaymentRatio);
  const hardLimitExceeded = mortgageOnlyRatio > 50 || ltvLimitExceeded || totalObligationsRatio > 55 || afterHousing <= 0;
  const borderlineCase = !hardLimitExceeded && (mortgageOnlyRatio > 40 || totalObligationsRatio > 40 || disposableRepaymentRatio > 50);

  const mortgageOnlyPenalty = mortgageOnlyRatio > 50 ? 38 : mortgageOnlyRatio > 40 ? 20 : mortgageOnlyRatio > 35 ? 7 : 0;
  const obligationsPenalty = totalObligationsRatio > 55 ? 34 : totalObligationsRatio > 50 ? 24 : totalObligationsRatio > 40 ? 15 : 0;
  const conservativePenalty = disposableRepaymentRatio > 60 ? 24 : disposableRepaymentRatio > 50 ? 18 : disposableRepaymentRatio > 40 ? 8 : 0;
  const equityPenalty = requestedAboveLimit > 0 ? 34 : missingEquity > 0 ? 22 : 0;
  const baseApproval = 92 - credit.penalty - mortgageOnlyPenalty - obligationsPenalty - conservativePenalty - equityPenalty - rateImpact;
  const approval = hardLimitExceeded ? Math.min(38, Math.max(5, baseApproval)) : Math.max(5, Math.min(96, baseApproval));
  const risk = hardLimitExceeded ? "סיכון גבוה" : borderlineCase ? "תיק גבולי - ניתן לאישור עם התאמות" : approval >= 75 ? "מצב טוב" : "דורש בדיקה";
  const mainIssue = hardLimitExceeded
    ? "התיק גבולי ודורש התאמה לפני פנייה לבנק"
    : disposableRepaymentRatio > 50
      ? "ההחזר החודשי גבוה ביחס להכנסה הפנויה"
      : totalObligationsRatio > 40
        ? "יחס ההתחייבויות הכולל גבולי"
        : missingEquity > 0
          ? "חוסר בהון עצמי"
          : credit.penalty > 0
            ? "נדרש לשפר אשראי"
            : "התיק נראה מאוזן";
  const recommendedAction = hardLimitExceeded || borderlineCase
    ? "תיק גבולי - ניתן לאישור עם התאמות. מומלץ להקטין משכנתא, להאריך תקופה, להפחית הלוואות או להגדיל הכנסה."
    : missingEquity > 0
      ? "להגדיל הון עצמי או לבחור נכס זול יותר."
      : approval < 60
        ? "לשפר נתונים לפני פנייה לבנק."
        : "התיק נראה מתאים לבדיקה מול כמה בנקים.";

  const analysis = {
    income,
    expenses,
    loans: existingLoansMonthly,
    existingLoansMonthly,
    loansToCloseMonthly,
    remainingLoansMonthly,
    loanClosureMonthlySaving,
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
    annualRate: toNumber(data.annualRate),
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
