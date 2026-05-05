import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { MoneyInput } from "../components/Shared";
import { cleanNumber, displayNumber, formatILS, formatPct } from "../lib/format";
import { calculateMortgageAnalysis, CREDIT_STATUSES, INDEXATION_TYPES, PROPERTY_TYPES, REPAYMENT_METHODS } from "../lib/mortgage";

const initialData = {
  income: "",
  expenses: "",
  loans: "",
  loansToClose: "",
  currentHousing: "",
  price: "",
  equity: "",
  mortgageAmount: "",
  annualRate: "",
  indexation: "unlinked",
  repaymentMethod: "spitzer",
  years: 30,
  propertyType: "single",
  credit: "clean",
};

const fallbackRates = {
  bankOfIsraelRate: 4.5,
  primeRate: 6,
  inflation12m: 3.1,
  nextRateDecision: "לא זמין",
  lastUpdated: "2025-04",
  primeMortgage: 5.1,
  fixedUnlinked: 5.45,
  fixedLinked: 3.9,
  variable5: 5.35,
  variable5Linked: 3.7,
  forecastText: "נתוני ריבית לסימולציה בלבד. יש לוודא נתונים עדכניים מול בנק ישראל והבנקים לפני קבלת החלטה.",
};

const mortgageTracks = [
  {
    name: "פריים",
    rateRange: "P‑0.5% עד P+1.5% (כיום ~5.5%–7.5%)",
    benefit: "גמיש, לרוב ללא קנס פירעון מוקדם משמעותי.",
    downside: "רגיש לעליית ריבית הפריים – ההחזר יכול להשתנות.",
    fit: "למי שרוצה גמישות ויכול לספוג שינוי בהחזר.",
    risk: "בינונית",
    boi: "מקסימום 1/3 מסך המשכנתא לפי הוראות בנק ישראל",
  },
  {
    name: "קבועה לא צמודה",
    rateRange: "כ‑5.0%–6.5% (בדוק בבנק)",
    benefit: "החזר ידוע מראש ואינו צמוד למדד – ביטחון מלא.",
    downside: "ריבית התחלתית גבוהה יותר, ייתכנו קנסות פירעון.",
    fit: "למי שמעדיף ודאות ויציבות לאורך שנים.",
    risk: "נמוכה",
    boi: "",
  },
  {
    name: "קבועה צמודה למדד",
    rateRange: "כ‑3.5%–5.0% + מדד",
    benefit: "ריבית התחלתית נמוכה יחסית לקבועה לא צמודה.",
    downside: "הקרן צמודה למדד – החוב יכול לגדול עם האינפלציה.",
    fit: "למי שמבין את סיכון המדד ורוצה החזר התחלתי נמוך יותר.",
    risk: "בינונית",
    boi: "",
  },
  {
    name: "משתנה כל 5 לא צמודה",
    rateRange: "כ‑5.0%–6.2% בתחנת היציאה",
    benefit: "מאפשרת נקודות שינוי ומחזור כל כמה שנים.",
    downside: "הריבית יכולה להשתנות בכל תחנת יציאה.",
    fit: "למי שצופה שינוי בהכנסה או מיחזור עתידי.",
    risk: "בינונית-גבוהה",
    boi: "",
  },
  {
    name: "משתנה כל 5 צמודה",
    rateRange: "כ‑3.2%–4.5% + מדד",
    benefit: "לעיתים החזר התחלתי נמוך יחסית.",
    downside: "חשיפה גם לשינוי ריבית וגם למדד – סיכון כפול.",
    fit: "למי שמוכן לקחת סיכון גבוה בתמורה להחזר התחלתי נמוך.",
    risk: "גבוהה",
    boi: "",
  },
  {
    name: "תמהיל מומלץ",
    rateRange: "שילוב 2–3 מסלולים",
    benefit: "פיזור סיכון: חלק ודאי, חלק גמיש. עשוי לסייע באיזון עלות מול יציבות.",
    downside: "דורש בנייה מותאמת אישית לפי הכנסה, אופק ויכולת ספיגת שינויים.",
    fit: "נדרש להתאמה אישית לפי הכנסה, תקופה, סיכון וריביות בפועל.",
    risk: "נמוכה",
    boi: "עד שליש פריים; שאר – קבועה ומשתנה בפריסה מאוזנת לפי הצורך",
  },
];

const FAQ_ITEMS = [
  {
    q: "כמה הון עצמי צריך לרכישת דירה בישראל?",
    a: 'לפי תקנות בנק ישראל: דירה יחידה – מינימום 25% הון עצמי (מימון מקסימלי 75%). משפרי דיור – 30% (מימון עד 70%). דירה להשקעה – 50% (מימון עד 50%). חריגה מהמגבלות אינה אפשרית בבנקים מפוקחים בישראל.',
  },
  {
    q: "מה ההחזר החודשי שהבנקים עשויים לאשר?",
    a: "הבנקים בישראל בדרך כלל מעדיפים שההחזר החודשי יהיה סביב 30-35% מהכנסה נטו, ושיחס ההתחייבויות הכולל (כולל הלוואות נוספות) לא יהיה גבוה מדי. החישוב המדויק תלוי בכל בנק ובנסיבות הספציפיות.",
  },
  {
    q: "מה הגבלת בנק ישראל על מסלול פריים?",
    a: "לפי הוראות בנק ישראל, מסלול הפריים (ריבית משתנה) יכול להוות לכל היותר שליש (33.3%) מסך המשכנתא. שאר הסכום חייב להיות במסלולים קבועים או משתנים-בנקודות. חריגה מהמגבלה עשויה למנוע אישור במסלול בנקאי מפוקח.",
  },
  {
    q: "מה ההבדל בין אישור עקרוני לאישור סופי?",
    a: "אישור עקרוני הוא הצהרת כוונות ראשונית של הבנק, תלוי בבדיקת מסמכים ושמאות. אישור סופי ניתן לאחר בדיקת כל המסמכים, שמאות לנכס ואישור ועדת האשראי. בין השניים עשויות לצוץ בעיות שהאישור העקרוני לא לקח בחשבון.",
  },
  {
    q: "מתי כדאי למחזר משכנתא?",
    a: "מחזור כדאי כשהפרש הריבית לטובתכם הוא לפחות 0.5%, ועוד מספיק שנים להחזר. יש לקחת בחשבון קנסות פירעון מוקדם, עמלות פתיחת תיק ועלויות שמאות. ניתוח מדויק דורש השוואה מול ציר הזמן שנותר.",
  },
  {
    q: "כמה עולה יועץ משכנתאות ומה מקבלים?",
    a: 'שכר טרחה מקובל הוא 6,000–9,000 ₪ לפני מע"מ לייעוץ מלא (תמהיל, משא ומתן, ליווי עד חתימה). במקרים מסוימים ייעוץ מקצועי עשוי להפחית עלויות לאורך חיי המשכנתא, אך הדבר תלוי בנתוני הלקוח, בריביות בפועל ובתנאי הבנקים.',
  },
  {
    q: "האם אפשר לקבל משכנתא עם הלוואות קיימות?",
    a: "כן, אך הלוואות קיימות עשויות להקטין את סכום המשכנתא שהבנק עשוי לאשר. הבנק בוחן את כלל ההתחייבויות ביחד, ולעיתים סגירת הלוואות לפני ההגשה יכולה לשפר את יחס ההחזר ואת אומדן האישור.",
  },
  {
    q: "מה זה תמהיל משכנתא ולמה הוא חשוב?",
    a: "תמהיל הוא פיזור המשכנתא בין מסלולים שונים: פריים, קבועה לא צמודה, קבועה צמודה ומשתנה. תמהיל נכון עשוי להפחית עלויות ולשפר יציבות, אך נדרש להתאים אותו אישית לפי הכנסה, תקופה, סיכון וריביות בפועל.",
  },
];

const TRACK_ROW_COLORS = {
  יתרון: "text-mort-emerald",
  חיסרון: "text-mort-danger",
  "למי מתאים": "text-mort-blue",
};

function approvalLabel(score) {
  if (score >= 80) return "אומדן חיובי לבדיקה";
  if (score >= 60) return "אומדן סביר לבדיקה";
  if (score >= 40) return "דורש התאמות לפני פנייה לבנק";
  return "סיכון גבוה לסירוב";
}

function leadRecommendation(score) {
  if (score >= 70) return "יש בסיס טוב לבדיקה מקצועית — עכשיו כדאי לבדוק ריביות, תמהיל וחיסכון אפשרי.";
  if (score >= 45) return "התיק גבולי. לפני פנייה לבנק כדאי לבדוק מה משפר את יחס ההחזר או אחוז המימון.";
  return "מומלץ לבצע התאמות לפני הגשה כדי להפחית סיכון לסירוב.";
}

function decisionState(analysis, hasStarted) {
  if (!hasStarted) {
    return {
      label: "מוכן לבדיקה",
      title: "הזינו נתונים ותקבלו תמונת מצב ראשונית",
      summary: "המערכת תציג אומדן סיכוי אישור, נקודת חולשה מרכזית, החזר חודשי ויתרה צפויה למחיה.",
      cta: "בדיקה ראשונית ללא התחייבות",
      tone: "border-blue-100 bg-blue-50 text-blue-900",
    };
  }
  if (analysis.hardLimitExceeded || analysis.approval < 40) {
    return {
      label: "סיכון גבוה",
      title: "לפי הנתונים כרגע — לא מומלץ להגיש כך לבנק",
      summary: "היחסים הפיננסיים מצביעים על סיכון לסירוב או צורך בשינוי משמעותי לפני הגשה.",
      cta: "בדיקה ראשונית ללא התחייבות",
      tone: "border-red-200 bg-red-50 text-red-900",
    };
  }
  if (analysis.borderlineCase || analysis.approval < 70) {
    return {
      label: "דורש שיפור",
      title: "יש בסיס, אבל כדאי לחזק את התיק",
      summary: "ייתכן שניתן לשפר את התוצאה באמצעות הורדת התחייבויות, הגדלת הון עצמי, שינוי סכום המשכנתא או התאמת תמהיל.",
      cta: "בדיקה ראשונית ללא התחייבות",
      tone: "border-amber-200 bg-amber-50 text-amber-900",
    };
  }
  return {
    label: "נראה מתאים לבדיקה",
    title: "לפי הנתונים — יש בסיס טוב להתקדם לבדיקה מקצועית",
    summary: "גם כשאומדן האישור חיובי, עדיין חשוב לבדוק ריביות, תמהיל ועלויות לאורך השנים.",
    cta: "בדיקה ראשונית ללא התחייבות",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };
}

function scoreTone(score, hardLimitExceeded, hasStarted = true) {
  if (!hasStarted) return "from-mort-blue to-mort-emerald";
  if (hardLimitExceeded) return "from-red-600 to-rose-600";
  if (score >= 75) return "from-emerald-600 to-teal-600";
  if (score >= 45) return "from-amber-500 to-orange-500";
  return "from-red-600 to-rose-600";
}

export default function Home() {
  const [data, setData] = useState(initialData);
  const [rates, setRates] = useState(fallbackRates);
  const [lead, setLead] = useState({ name: "", phone: "", city: "", mortgageAmount: "", purchaseStatus: "" });
  const [leadSent, setLeadSent] = useState(false);
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [financialOpen, setFinancialOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    fetch("/api/rates")
      .then((res) => res.json())
      .then((json) => setRates({ ...fallbackRates, ...json }))
      .catch(() => setRates(fallbackRates));
  }, []);

  const hasStarted = useMemo(
    () => ["income", "price", "equity", "mortgageAmount"].some((key) => cleanNumber(data[key])),
    [data]
  );
  const analysis = useMemo(() => calculateMortgageAnalysis(data, rates), [data, rates]);
  const decision = useMemo(() => decisionState(analysis, hasStarted), [analysis, hasStarted]);
  const smartLeadText = useMemo(() => leadRecommendation(analysis.approval), [analysis]);

  const marketRows = useMemo(() => [
    ["ריבית בנק ישראל", formatPct(rates.bankOfIsraelRate), `נתון לסימולציה בלבד · נכון לאומדן ${rates.lastUpdated || "לא זמין"}`],
    ["ריבית פריים", formatPct(rates.primeRate), `נתון לסימולציה: בנק ישראל + 1.5% · ${rates.lastUpdated || "לא זמין"}`],
    ["אינפלציה 12 חודשים", formatPct(rates.inflation12m), `משפיעה על מסלולים צמודים · ${rates.lastUpdated || "לא זמין"}`],
    ["מועד החלטת ריבית הבאה", rates.nextRateDecision || "לא זמין", "יש לוודא מול מקור רשמי"],
  ], [rates]);

  const financialRows = useMemo(() => [
    ["יחס החזר משכנתא בלבד", formatPct(analysis.mortgageOnlyRatio), analysis.mortgageOnlyStatus.label, analysis.mortgageOnlyRatio > 35],
    ["יחס התחייבויות כולל", formatPct(analysis.totalObligationsRatio), analysis.totalObligationsStatus.label, analysis.totalObligationsRatio > 40],
    ["יחס החזר שמרני אחרי הוצאות והלוואות", formatPct(analysis.disposableRepaymentRatio), analysis.conservativeStatus.label, analysis.disposableRepaymentRatio > 40],
    ["שיעור מימון LTV", formatPct(analysis.ltv), `מגבלה: ${formatPct(analysis.property.maxLtv)}`, analysis.ltvLimitExceeded],
    ["ריבית שנתית לחישוב", formatPct(analysis.weightedRate), analysis.annualRate ? "הוזנה ידנית" : "לפי תמהיל בסיסי"],
    ["סוג הצמדה", analysis.indexationInfo.label, "משפיע על תחזית ההחזר המקסימלי"],
    ["שיטת החזר", analysis.repaymentMethodInfo.label, "משפיעה על ההחזר הראשון וסך הריבית"],
    ["פירוק החזר ראשון", `${formatILS(analysis.firstPrincipalPart)} קרן / ${formatILS(analysis.firstInterestPart)} ריבית`, "אומדן לפי החודש הראשון"],
    ["סכום משכנתא", formatILS(analysis.mortgage), `תקרת מימון: ${formatILS(analysis.maxMortgage)}`, analysis.requestedAboveLimit > 0],
    ["הון עצמי חסר", formatILS(analysis.missingEquity), analysis.missingEquity ? "חסר הון עצמי ביחס למגבלת המימון" : "אין חוסר לפי הנתונים", analysis.missingEquity > 0],
    ["הכנסה נטו", formatILS(analysis.income), "לפני הוצאות והתחייבויות"],
    ["הוצאות קבועות", formatILS(analysis.expenses), "נגרעות מהתזרים"],
    ["הלוואות קיימות היום", formatILS(analysis.existingLoansMonthly), "לפני העסקה"],
    ["הלוואות שייסגרו", formatILS(analysis.loansToCloseMonthly), "לפני המשכנתא / לאחר מכירת נכס", analysis.loansToCloseMonthly > 0],
    ["הלוואות שיישארו אחרי העסקה", formatILS(analysis.remainingLoansMonthly), "משמשות לאומדן יכולת ההחזר", analysis.remainingLoansMonthly > 0],
    ["חיסכון חודשי מסגירת הלוואות", formatILS(analysis.loanClosureMonthlySaving), "שיפור תזרים חודשי", analysis.loanClosureMonthlySaving > 0],
    ["יתרה לפני העסקה", formatILS(analysis.beforeHousing), "כולל החזר דיור כיום והלוואות קיימות"],
    ["יתרה אחרי העסקה", formatILS(analysis.afterHousing), analysis.afterHousing <= 0 ? "אזהרה: תזרים שלילי אחרי המשכנתא" : "משכנתא חדשה + הלוואות שנשארו", analysis.afterHousing <= 0],
    ["שינוי חודשי", formatILS(analysis.monthlyGap), "אחרי העסקה פחות לפני", analysis.monthlyGap < 0],
    ["סה״כ תשלום צפוי", formatILS(analysis.totalPaidEstimate), `${analysis.years} שנים לפי שיטת ההחזר שנבחרה`],
    ["סך ריבית צפויה לאורך כל התקופה", formatILS(analysis.totalInterestEstimate), "סה״כ תשלומים פחות קרן המשכנתא"],
    ["תרחיש עליית ריבית", formatILS(analysis.stressAfterHousing), `החזר בלחץ: ${formatILS(analysis.monthlyHigh)}`, analysis.stressAfterHousing < 0],
  ], [analysis]);

  const keyMetrics = useMemo(() => [
    ["החזר חודשי ראשון", formatILS(analysis.firstMonthlyPayment), analysis.repaymentMethodInfo.label],
    ["תחזית החזר מקסימלי", formatILS(analysis.maxMonthlyPaymentEstimate), "תרחיש שמרני של עליית ריבית / מדד"],
    ["יתרה אחרי העסקה", formatILS(analysis.afterHousing), analysis.afterHousing <= 0 ? "אזהרה: תזרים שלילי" : "תזרים לאחר משכנתא"],
    ["סך ריבית צפויה", formatILS(analysis.totalInterestEstimate), "לאורך כל תקופת המשכנתא"],
  ], [analysis]);

  const bankCheckItems = useMemo(() => [
    ["יכולת החזר", "יחס החזר, התחייבויות קיימות ויתרה למחיה"],
    ["אחוז מימון", `מגבלת LTV לסוג הרכישה: ${formatPct(analysis.property.maxLtv)}`],
    ["אשראי וסיכון", `${analysis.credit.label} · ${analysis.risk}`],
    ["הבעיה המרכזית", analysis.mainIssue],
  ], [analysis]);

  const actionRecommendations = useMemo(() => {
    const cards = (analysis.recommendations || []).slice(0, 2).map((item) => ({
      title: "המלצה",
      text: item,
    }));

    cards.push(
      {
        title: "השלב הבא",
        text: "בדקו אם כדאי לשפר החזר, הון עצמי או יחס התחייבויות לפני פנייה לבנק.",
      },
      {
        title: "בדיקת מחזור",
        text: "אם כבר יש משכנתא, כדאי לבדוק אם מחזור עשוי להקטין החזר או להפחית עלויות לאורך השנים.",
      },
      {
        title: "שיחה עם יועץ",
        text: "בדיקה אנושית יכולה לוודא שהנתונים מתאימים לפני פנייה לבנק או לפני משא ומתן.",
      },
      {
        title: "ניתוח מלא",
        text: "מי שרוצה להבין לעומק יכול לפתוח את הפירוט הפיננסי ולבדוק יחסים, ריביות ותרחישי לחץ.",
      }
    );

    return cards.slice(0, 4);
  }, [analysis.recommendations]);

  function update(key, value) {
    setData((current) => ({ ...current, [key]: value }));
  }

  function toggleFinancialDetails() {
    setFinancialOpen((value) => !value);
    window.requestAnimationFrame(() => {
      document.getElementById("financial-details")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function submitLead(event) {
    event.preventDefault();
    if (leadSent || leadLoading) return;
    const phone = cleanNumber(lead.phone);
    if (!lead.name.trim() || phone.length < 9) {
      setLeadError("יש להזין שם וטלפון תקין.");
      return;
    }
    const record = {
      ...lead,
      phone,
      mortgageAmount: cleanNumber(lead.mortgageAmount) || analysis.mortgage,
      createdAt: new Date().toISOString(),
      approval: Math.round(analysis.approval),
      mainIssue: analysis.mainIssue,
      mortgageOnlyRatio: analysis.mortgageOnlyRatio,
      totalObligationsRatio: analysis.totalObligationsRatio,
      disposableRepaymentRatio: analysis.disposableRepaymentRatio,
      ltv: analysis.ltv,
      monthly: analysis.monthly,
      mortgage: analysis.mortgage,
    };
    setLeadError("");
    setLeadLoading(true);
    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead: record, analysis }),
      });
      if (!response.ok) throw new Error("Lead request failed");
      const result = await response.json().catch(() => null);
      if (!result?.ok) throw new Error("Lead request was not confirmed");
      const saved = JSON.parse(localStorage.getItem("mortgai2_leads") || "[]");
      localStorage.setItem("mortgai2_leads", JSON.stringify([record, ...saved]));
      setLeadSent(true);
    } catch {
      setLeadSent(false);
      setLeadError("הפנייה לא נשלחה. נסה שוב או פנה ישירות.");
    } finally {
      setLeadLoading(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen px-4 py-5 text-mort-text sm:px-6 lg:px-8">
      <Head>
        <title>בדיקת זכאות למשכנתא | סיכוי אישור והחזר חודשי תוך דקה</title>
        <meta name="description" content="בדיקה פשוטה למשכנתא: הזינו נתונים בסיסיים וקבלו אומדן סיכוי אישור, החזר חודשי משוער, הון עצמי נדרש וניתוח פיננסי מלא למי שרוצה להעמיק." />
        <meta property="og:title" content="בדיקת זכאות למשכנתא | תשובה פשוטה לפני שפונים לבנק" />
        <meta property="og:description" content="בדיקת זכאות פשוטה למשכנתא עם אומדן החזר חודשי, הון עצמי נדרש ונקודת חולשה מרכזית." />
        <meta property="og:type" content="website" />
        <meta name="robots" content="index, follow" />
      </Head>

      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-slate-200/70 bg-white/80 py-5 md:flex-row md:items-center md:justify-between">
          <a href="#top" className="block" aria-label="דף הבית">
            <strong className="block text-2xl font-black text-mort-ink">בדיקת זכאות למשכנתא</strong>
            <span className="text-sm font-bold text-mort-muted">תשובה פשוטה לפני שפונים לבנק</span>
          </a>
          <nav className="flex flex-wrap gap-2 text-sm font-black text-mort-muted" aria-label="ניווט ראשי">
            <a className="rounded-full border border-slate-200 bg-white px-4 py-2 transition hover:text-mort-ink" href="#how-it-works">איך זה עובד</a>
            <a className="rounded-full border border-slate-200 bg-white px-4 py-2 transition hover:text-mort-ink" href="#calculator">הבדיקה</a>
            <a className="rounded-full border border-slate-200 bg-white px-4 py-2 transition hover:text-mort-ink" href="#financial-details">ניתוח מלא</a>
            <a className="rounded-full bg-mort-ink px-4 py-2 text-white shadow-soft transition hover:opacity-90" href="#calculator">בדקו זכאות עכשיו</a>
          </nav>
        </header>

        <section id="top" className="py-16 text-center sm:py-24">
          <span className="pill border-emerald-200 bg-emerald-50 text-emerald-800">בדיקה פשוטה למשכנתא בישראל</span>
          <h1 className="mx-auto mt-6 max-w-4xl text-[40px] font-black leading-[1.02] tracking-normal text-mort-ink sm:text-6xl lg:text-7xl">
            לפני שפונים לבנק — בודקים אם המספרים באמת עובדים
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg font-bold leading-8 text-mort-muted">
            בדיקה חכמה שמנתחת הכנסה, התחייבויות, הון עצמי, אחוז מימון והחזר חודשי — ומציגה אומדן ראשוני לסיכוי אישור, נקודות סיכון ותזרים אחרי המשכנתא.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {["בדיקה פשוטה", "ללא התחייבות", "מידע מתקדם למי שרוצה"].map((badge) => (
              <span key={badge} className="pill border-slate-200 bg-white text-mort-text shadow-sm">{badge}</span>
            ))}
          </div>
          <a className="mt-9 inline-flex rounded-2xl bg-gradient-to-br from-mort-emerald to-mort-blue px-8 py-4 text-lg font-black text-white shadow-glow transition hover:-translate-y-0.5" href="#calculator">
            התחל בדיקה חינם
          </a>
          <p className="mx-auto mt-5 max-w-3xl text-sm font-bold leading-7 text-mort-muted">
            הסימולציה מבוססת על פרמטרים מקובלים בבדיקות משכנתא: יחס החזר, LTV, התחייבויות קיימות ויתרה למחיה.
          </p>
        </section>

        <section id="how-it-works" className="py-10">
          <SectionHeader eyebrow="איך זה עובד" title="ארבעה צעדים, בלי להציף אתכם במספרים" />
          <div className="mt-8 grid gap-3 md:grid-cols-4">
            <ProcessStep step="1" title="מזינים נתונים" text="הכנסה, הון עצמי, מחיר נכס והתחייבויות." />
            <ProcessStep step="2" title="מקבלים אומדן" text="אומדן סיכוי אישור והחזר חודשי משוער." />
            <ProcessStep step="3" title="רואים מה מפריע לאישור" text="הנקודה המרכזית שיכולה להכביד על הבנק." />
            <ProcessStep step="4" title="מחליטים אם לפנות ליועץ" text="אם צריך, משאירים פרטים לבדיקה אנושית." />
          </div>
        </section>

        <section id="calculator" className="py-12">
          <SectionHeader eyebrow="הבדיקה" title="הנתונים לבדיקה" text="מלאו רק מה שאתם יודעים — התוצאה תתעדכן אוטומטית." />
          <div className="mx-auto mt-8 max-w-3xl">
            <MortgageForm data={data} update={update} />
          </div>
        </section>

        <section id="results" className="py-12">
          <SectionHeader eyebrow="תוצאה פשוטה" title="מה מצב המשכנתא לפי הנתונים שהוזנו?" />
          <div className="mx-auto mt-8 max-w-4xl">
            <SimpleResults
              analysis={analysis}
              decision={decision}
              hasStarted={hasStarted}
              onDetailsClick={toggleFinancialDetails}
            />
          </div>
          <div className="mx-auto mt-8 max-w-3xl">
            <LeadBox
              lead={lead}
              setLead={setLead}
              submitLead={submitLead}
              leadLoading={leadLoading}
              leadSent={leadSent}
              leadError={leadError}
              defaultMortgage={analysis.mortgage}
              contextText={smartLeadText}
              buttonText="בדיקה ראשונית ללא התחייבות"
            />
          </div>
        </section>

        <section id="financial-details" className="scroll-mt-24 py-12">
          <div className="glass-card p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="pill border-amber-200 bg-amber-50 text-mort-gold">ניתוח פיננסי מלא</span>
                <h2 className="mt-3 text-3xl font-black text-mort-ink">איך הבנק עשוי להסתכל על הנתונים שלך</h2>
                <p className="mt-2 max-w-3xl font-bold leading-7 text-mort-muted">
                  הבנקים לא בודקים רק הכנסה. הם בוחנים כמה התחייבויות יש, כמה נשאר למחיה ומה אחוז המימון ביחס לנכס.
                </p>
              </div>
              <button type="button" onClick={toggleFinancialDetails} className="rounded-2xl bg-mort-ink px-5 py-3 font-black text-white shadow-soft transition hover:opacity-90">
                {financialOpen ? "סגירת ניתוח פיננסי מלא" : "צפייה בניתוח פיננסי מלא"}
              </button>
            </div>
            {financialOpen && (
              <div className="mt-6 overflow-hidden rounded-[22px] border border-slate-200 bg-white/80 animate-fade-in">
                {financialRows.map(([label, value, note, warn]) => (
                  <div key={label} className={`grid gap-2 border-b border-slate-200 p-4 last:border-b-0 md:grid-cols-[1.4fr_1fr_1.8fr] ${warn ? "bg-red-50/80 text-red-800" : "text-mort-ink"}`}>
                    <span className="font-black">{label}</span>
                    <strong className="text-xl font-black">{value}</strong>
                    <small className="font-bold leading-6 text-mort-muted">{note}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="refinance" className="py-12">
          <div className="rounded-[28px] border border-emerald-200 bg-gradient-to-br from-white to-emerald-50 p-8 text-center shadow-soft">
            <span className="pill border-emerald-200 bg-white text-emerald-800">מחזור משכנתא</span>
            <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-black leading-tight text-mort-ink">כבר יש לכם משכנתא? בדקו אם כדאי למחזר</h2>
            <p className="mx-auto mt-3 max-w-2xl font-bold leading-7 text-mort-muted">
              בדיקה נפרדת למחזור משכנתא: חיסכון חודשי משוער, חיסכון ריבית ונקודת איזון.
            </p>
            <a className="mt-6 inline-flex rounded-2xl bg-mort-ink px-6 py-4 font-black text-white shadow-soft transition hover:-translate-y-0.5" href="/refinance-check">
              בדיקת מחזור משכנתא
            </a>
          </div>
        </section>

        <section id="faq" className="py-12">
          <SectionHeader eyebrow="שאלות נפוצות" title="שאלות נפוצות על בדיקת זכאות למשכנתא" />
          <div className="mx-auto mt-8 grid max-w-4xl gap-3">
            {FAQ_ITEMS.map((item, index) => (
              <FAQItem
                key={index}
                question={item.q}
                answer={item.a}
                isOpen={openFaq === index}
                onToggle={() => setOpenFaq(openFaq === index ? null : index)}
              />
            ))}
          </div>
        </section>

        <footer className="border-t border-slate-200 py-8 text-center">
          <p className="text-sm font-bold leading-7 text-mort-muted">
            בדיקת זכאות למשכנתא היא כלי סימולציה ראשוני בלבד. הנתונים אינם מהווים ייעוץ משכנתאות, אישור בנקאי או הצעת מחיר מחייבת.
          </p>
          <p className="mt-2 text-xs font-bold text-mort-muted opacity-70">© 2026 בדיקת זכאות למשכנתא</p>
        </footer>
      </div>
    </main>
  );
}

function SectionHeader({ eyebrow, title, text }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow && <span className="pill border-blue-100 bg-blue-50 text-mort-blue">{eyebrow}</span>}
      <h2 className="mt-4 text-3xl font-black leading-tight text-mort-ink sm:text-4xl">{title}</h2>
      {text && <p className="mt-3 font-bold leading-7 text-mort-muted">{text}</p>}
    </div>
  );
}

function MortgageForm({ data, update }) {
  return (
    <form className="glass-card p-5 sm:p-7" noValidate>
      <div className="grid gap-5">
        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-mort-muted">הכנסות והתחייבויות</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <MoneyInput label="הכנסה נטו חודשית" value={data.income} onChange={(v) => update("income", v)} />
            <MoneyInput label="הוצאות קבועות" value={data.expenses} onChange={(v) => update("expenses", v)} />
            <MoneyInput label="הלוואות קיימות היום" value={data.loans} onChange={(v) => update("loans", v)} />
            <MoneyInput label="הלוואות שייסגרו לפני המשכנתא" helper="אם יש הלוואות שייסגרו לפני העסקה" value={data.loansToClose} onChange={(v) => update("loansToClose", v)} />
            <MoneyInput label="החזר משכנתא / שכירות כיום" helper="כמה משלמים היום על דיור" value={data.currentHousing} onChange={(v) => update("currentHousing", v)} />
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-mort-muted">נתוני העסקה</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <MoneyInput label="מחיר נכס" value={data.price} onChange={(v) => update("price", v)} />
            <MoneyInput label="הון עצמי" value={data.equity} onChange={(v) => update("equity", v)} />
            <MoneyInput label="סכום משכנתא מתוכנן" value={data.mortgageAmount} onChange={(v) => update("mortgageAmount", v)} placeholder="מחושב אוטומטית אם ריק" />
            <RateInput label="ריבית שנתית משוערת" helper="אם ריק, נשתמש באומדן שוק בסיסי" value={data.annualRate} onChange={(v) => update("annualRate", v)} />
            <label className="grid gap-2 sm:col-span-2">
              <span className="flex items-center justify-between gap-3 text-sm font-black text-mort-muted">
                <span>תקופת משכנתא</span>
                <strong className="rounded-full bg-mort-ink px-3 py-1 text-white">{data.years || 30} שנים</strong>
              </span>
              <input
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-mort-emerald"
                type="range"
                min="4"
                max="30"
                value={data.years}
                onChange={(e) => update("years", cleanNumber(e.target.value).slice(0, 2))}
                aria-label="תקופת משכנתא בשנים"
              />
              <div className="flex justify-between text-xs font-black text-mort-muted">
                <span>4 שנים</span>
                <span>30 שנים</span>
              </div>
            </label>
            <SelectInput label="סוג הצמדה" value={data.indexation} onChange={(v) => update("indexation", v)} options={INDEXATION_TYPES} />
            <SelectInput label="שיטת החזר" value={data.repaymentMethod} onChange={(v) => update("repaymentMethod", v)} options={REPAYMENT_METHODS} />
            <SelectInput label="סוג רכישה" value={data.propertyType} onChange={(v) => update("propertyType", v)} options={PROPERTY_TYPES} />
            <SelectInput label="מצב אשראי" value={data.credit} onChange={(v) => update("credit", v)} options={CREDIT_STATUSES} />
          </div>
        </div>
      </div>
    </form>
  );
}

function SimpleResults({ analysis, decision, hasStarted, onDetailsClick }) {
  const missingEquityText = analysis.missingEquity > 0 ? `חסר ${formatILS(analysis.missingEquity)}` : "לא זוהה חוסר";
  const warnings = [];

  if (hasStarted && analysis.missingEquity > 0) {
    warnings.push(`חסר הון עצמי ביחס למגבלת המימון: ${formatILS(analysis.missingEquity)}.`);
  }
  if (hasStarted && analysis.afterHousing <= 0) {
    warnings.push("לפי הנתונים שהוזנו, התזרים אחרי המשכנתא שלילי ודורש התאמה לפני פנייה לבנק.");
  }
  if (hasStarted && analysis.totalObligationsRatio > 40) {
    warnings.push(`יחס ההתחייבויות הכולל הוא ${formatPct(analysis.totalObligationsRatio)} ולכן הבנק עשוי לדרוש התאמות.`);
  }
  if (hasStarted && analysis.mortgageOnlyRatio > 35) {
    warnings.push(`יחס החזר המשכנתא בלבד הוא ${formatPct(analysis.mortgageOnlyRatio)} ולכן כדאי לבדוק הקטנת החזר, פריסה או סכום משכנתא.`);
  }

  return (
    <section className="glass-card p-6 sm:p-8">
      <div className="grid gap-5 md:grid-cols-[240px_minmax(0,1fr)]">
        <ApprovalScoreCard approval={analysis.approval} hardLimitExceeded={analysis.hardLimitExceeded} hasStarted={hasStarted} />
        <div>
          <span className="pill border-emerald-200 bg-emerald-50 text-emerald-800">תשובה ראשונית</span>
          <h3 className="mt-3 text-3xl font-black leading-tight text-mort-ink">{decision.title}</h3>
          <p className={`mt-4 rounded-2xl border p-4 font-black leading-7 ${decision.tone}`}>{decision.summary}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ResultLine label="החזר חודשי משוער" value={hasStarted ? formatILS(analysis.monthly) : "--"} />
            <ResultLine label="הון עצמי חסר אם יש" value={hasStarted ? missingEquityText : "--"} />
            <ResultLine label="הבעיה המרכזית" value={hasStarted ? analysis.mainIssue : "--"} />
            <ResultLine label="פעולה מומלצת" value={hasStarted ? analysis.recommendedAction : "--"} />
          </div>
          {warnings.length > 0 && (
            <div className="mt-5 grid gap-2">
              {warnings.map((warning) => (
                <p key={warning} className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-black leading-6 text-amber-900">
                  {warning}
                </p>
              ))}
            </div>
          )}
          <button type="button" onClick={onDetailsClick} className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-black text-mort-ink shadow-soft transition hover:-translate-y-0.5">
            צפייה בניתוח פיננסי מלא
          </button>
        </div>
      </div>
    </section>
  );
}

function ResultLine({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/75 p-4">
      <span className="block text-xs font-black text-mort-muted">{label}</span>
      <strong className="mt-1 block text-lg font-black leading-6 text-mort-ink">{value}</strong>
    </div>
  );
}

function ApprovalScoreCard({ approval, hardLimitExceeded, hasStarted, variant = "default" }) {
  const isHero = variant === "hero";
  const roundCls = isHero ? "rounded-[26px]" : "rounded-[28px]";
  const label = isHero ? "אומדן סיכוי אישור" : "אומדן סיכוי אישור";
  const emptyLabel = isHero ? "החישוב יופיע אחרי הזנת נתונים" : "ממתין לנתונים";
  const score = hasStarted ? Math.round(approval) : 0;
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;
  return (
    <div className={`${roundCls} relative overflow-hidden bg-gradient-to-br ${scoreTone(approval, hardLimitExceeded, hasStarted)} p-6 text-white shadow-glow`}>
      <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
      <div className="relative z-10">
        <span className="text-sm font-black opacity-85">{label}</span>
        <div className="relative mx-auto mt-5 grid h-36 w-36 place-items-center">
          <svg className="h-36 w-36 -rotate-90" viewBox="0 0 140 140" aria-hidden="true">
            <circle cx="70" cy="70" r={radius} fill="transparent" stroke="currentColor" strokeWidth="10" className="text-white/15" />
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={hasStarted ? dashOffset : circumference}
              className="text-white transition-all duration-700"
            />
          </svg>
          <strong className="number-display absolute text-5xl font-black leading-none">
            {hasStarted ? `${score}%` : "--"}
          </strong>
        </div>
        <span className={`mt-4 block text-center font-black ${isHero ? "text-xl" : ""}`}>
          {hasStarted ? approvalLabel(approval) : emptyLabel}
        </span>
        <small className="mt-3 block text-center text-xs font-bold leading-5 text-white/85">
          {hasStarted ? "זהו אומדן ראשוני בלבד לפי הנתונים שהוזנו, ולא אישור בנקאי." : "הזינו נתונים כדי לקבל אומדן ראשוני."}
        </small>
      </div>
    </div>
  );
}

function TrustStat({ icon, label }) {
  return (
    <div className="equal-card items-center rounded-[18px] border border-white bg-white/85 p-3 text-center shadow-soft">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-50 text-xl">{icon}</span>
      <span className="mt-2 text-xs font-black leading-4 text-mort-muted">{label}</span>
      <span className="mt-3 rounded-full bg-white px-3 py-1 text-[11px] font-black text-mort-emerald">מתאים לבדיקה ראשונית</span>
    </div>
  );
}

function FAQItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white/75 shadow-soft overflow-hidden">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 p-5 text-right font-black text-mort-ink hover:bg-white/90 transition" aria-expanded={isOpen}>
        <span className="text-base leading-6">{question}</span>
        <span className={`shrink-0 text-2xl font-light text-mort-emerald transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}>+</span>
      </button>
      {isOpen && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4 faq-open">
          <p className="font-bold leading-7 text-mort-muted">{answer}</p>
        </div>
      )}
    </div>
  );
}

function StatusLine({ label, value }) {
  return (
    <div className="equal-card rounded-2xl border border-slate-200 bg-white/75 p-4">
      <div>
        <span className="block text-xs font-black text-mort-muted">{label}</span>
        <strong className="mt-1 block text-lg font-black leading-6 text-mort-ink">{value}</strong>
      </div>
      <span className="mt-4 rounded-xl bg-surface-low px-3 py-2 text-xs font-black text-mort-muted">נתון לתשובה הראשית</span>
    </div>
  );
}

function MainDecisionCard({ decision, smartLeadText }) {
  return (
    <article className={`equal-card rounded-[28px] border p-6 ${decision.tone}`}>
      <div>
        <span className="block text-sm font-black opacity-80">החלטה מהירה</span>
        <strong className="mt-2 block text-2xl font-black leading-tight">{decision.label}</strong>
        <p className="mt-3 font-black leading-7">{decision.summary}</p>
      </div>
      <span className="mt-4 rounded-2xl bg-white/65 px-3 py-2 text-xs font-black">{smartLeadText}</span>
    </article>
  );
}

function StartGuideCard() {
  return (
    <aside className="glass-card p-7">
      <span className="pill border-emerald-200 bg-emerald-50 text-emerald-800">מה עושים כאן?</span>
      <h2 className="mt-4 text-3xl font-black leading-tight text-mort-ink">בדיקה קצרה לפני שפונים לבנק</h2>
      <p className="mt-3 font-bold leading-7 text-mort-muted">
        מלאו כמה נתונים בסיסיים, וקבלו תשובה פשוטה: האם התיק נראה מתאים, מה הבעיה המרכזית ומה כדאי לשפר.
      </p>
      <div className="mt-6 grid gap-3">
        <a className="rounded-2xl bg-gradient-to-br from-mort-emerald to-mort-blue px-5 py-4 text-center font-black text-white shadow-glow transition hover:-translate-y-0.5" href="#calculator">
          להתחיל בדיקת זכאות
        </a>
        <a className="rounded-2xl border border-emerald-200 bg-white/90 px-5 py-4 text-center font-black text-mort-ink shadow-soft transition hover:-translate-y-0.5" href="/refinance-check">
          בדיקת מחזור משכנתא
        </a>
      </div>
      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
        <strong className="block font-black text-mort-ink">הפירוט המקצועי מחכה בהמשך</strong>
        <p className="mt-1 text-sm font-bold leading-6 text-mort-muted">
          קודם מקבלים תשובה ברורה. רק אחר כך אפשר לפתוח יחסים, LTV, ריביות ותמהיל.
        </p>
      </div>
    </aside>
  );
}

function ProcessStep({ step, title, text }) {
  return (
    <article className="equal-card rounded-[22px] border border-white bg-white/80 p-4 shadow-soft">
      <div>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-mort-ink text-sm font-black text-white">{step}</span>
        <strong className="mt-3 block text-lg font-black text-mort-ink">{title}</strong>
        <small className="mt-1 block font-bold leading-5 text-mort-muted">{text}</small>
      </div>
      <span className="mt-4 rounded-2xl bg-surface-low px-3 py-2 text-xs font-black text-mort-muted">שלב {step} מתוך 4</span>
    </article>
  );
}

function KeyMetric({ label, value, helper }) {
  return (
    <article className="surface-card equal-card p-4">
      <div>
        <span className="block text-xs font-black text-mort-muted">{label}</span>
        <strong className="number-display mt-2 block text-2xl font-black text-mort-ink">{value}</strong>
        <small className="mt-1 block font-bold leading-5 text-mort-muted">{helper}</small>
      </div>
      <span className="mt-4 rounded-2xl bg-white/80 px-3 py-2 text-xs font-black text-mort-muted">נכלל בתוצאה הראשית</span>
    </article>
  );
}

function PaymentBreakdownCard({ analysis, hasStarted }) {
  const total = Math.max(1, analysis.firstPrincipalPart + analysis.firstInterestPart);
  const principalPct = hasStarted ? Math.round((analysis.firstPrincipalPart / total) * 100) : 0;
  const interestPct = hasStarted ? Math.max(0, 100 - principalPct) : 0;

  return (
    <div className="mt-5 mort-two-card-grid">
      <article className="surface-card equal-card p-5">
        <div>
          <span className="block text-xs font-black text-mort-muted">פירוק החזר ראשון</span>
          <h3 className="mt-2 text-2xl font-black text-mort-ink">{hasStarted ? formatILS(analysis.firstMonthlyPayment) : "--"}</h3>
          <div className="mt-4 overflow-hidden rounded-full bg-slate-200">
            <div className="flex h-3">
              <span className="bg-mort-emerald" style={{ width: `${principalPct}%` }} />
              <span className="bg-mort-blue" style={{ width: `${interestPct}%` }} />
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-sm font-black">
            <span className="flex items-center justify-between gap-3 text-mort-emerald">
              <span>קרן</span>
              <span>{hasStarted ? formatILS(analysis.firstPrincipalPart) : "--"}</span>
            </span>
            <span className="flex items-center justify-between gap-3 text-mort-blue">
              <span>ריבית</span>
              <span>{hasStarted ? formatILS(analysis.firstInterestPart) : "--"}</span>
            </span>
          </div>
        </div>
        <span className="mt-4 rounded-2xl bg-white/80 px-3 py-2 text-xs font-black text-mort-muted">
          {hasStarted ? `חלוקה: ${principalPct}% קרן / ${interestPct}% ריבית` : "החלוקה תופיע אחרי הזנת נתונים"}
        </span>
      </article>
      <article className="surface-card equal-card p-5">
        <div>
          <span className="block text-xs font-black text-mort-muted">איך החישוב נעשה?</span>
          <h3 className="mt-2 text-xl font-black leading-tight text-mort-ink">{analysis.repaymentMethodInfo.label}</h3>
          <p className="mt-3 text-sm font-bold leading-6 text-mort-muted">
            החישוב משתמש בסכום המשכנתא, ריבית שנתית, תקופה, סוג הצמדה ושיטת החזר. התוצאה היא אומדן ראשוני בלבד.
          </p>
          <div className="mt-4 grid gap-2 text-sm font-black text-mort-ink">
            <span>הצמדה: {analysis.indexationInfo.label}</span>
            <span>סך תשלום צפוי: {hasStarted ? formatILS(analysis.totalPaidEstimate) : "--"}</span>
          </div>
        </div>
        <span className="mt-4 rounded-2xl bg-white/80 px-3 py-2 text-xs font-black text-mort-muted">
          {hasStarted ? `ריבית לחישוב: ${formatPct(analysis.weightedRate)} · תקופה: ${analysis.years} שנים` : "הזינו ריבית ותקופה כדי לראות אומדן"}
        </span>
      </article>
    </div>
  );
}

function CalculatorSupportRail({ analysis, hasStarted, smartLeadText }) {
  const ltvText = hasStarted ? `${formatPct(analysis.ltv)} מתוך ${formatPct(analysis.property.maxLtv)}` : "--";
  const monthlyText = hasStarted ? formatILS(analysis.monthly) : "--";
  const remainingText = hasStarted ? formatILS(analysis.afterHousing) : "--";

  return (
    <div className="mort-two-card-grid">
      <article className="insight-card p-6">
        <span className="pill border-emerald-200 bg-white text-emerald-800">תמונה מהירה</span>
        <h3 className="mt-4 text-2xl font-black leading-tight text-mort-ink">מה חשוב לבדוק לפני הבנק?</h3>
        <div className="mt-5 mort-two-card-grid">
          <SavingsMetric label="החזר משוער" value={monthlyText} />
          <SavingsMetric label="שיעור מימון LTV" value={ltvText} highlight />
          <SavingsMetric label="יתרה אחרי דיור" value={remainingText} />
          <SavingsMetric label="אומדן סיכוי אישור" value={hasStarted ? `${Math.round(analysis.approval)}%` : "--"} />
        </div>
      </article>

      <article className="fintech-card p-6">
        <span className="pill border-blue-100 bg-blue-50 text-mort-blue">אחרי החישוב</span>
        <h3 className="mt-4 text-2xl font-black leading-tight text-mort-ink">שלושת הדברים שמורידים סיכון</h3>
        <div className="mt-5 mort-two-card-grid">
          <ActionCard title="יחס החזר" text="לוודא שההחזר לא מכביד על ההכנסה נטו ועל התזרים אחרי הוצאות." />
          <ActionCard title="הון עצמי" text="לבדוק שהמימון לא עובר את מגבלת בנק ישראל לפי סוג הרכישה." />
          <ActionCard title="תמהיל וריביות" text="להשוות כמה מסלולים ולא להסתכל רק על ההחזר הראשון." />
          <ActionCard title="בדיקה לפני בנק" text="לוודא שהנתונים נראים הגיוניים לפני שמבקשים אישור עקרוני." />
        </div>
      </article>

      <article className="rounded-[28px] border border-blue-100 bg-surface-low/80 p-6 shadow-soft">
        <span className="pill border-blue-100 bg-white text-mort-blue">כיוון פעולה</span>
        <p className="mt-4 font-black leading-7 text-mort-ink">{smartLeadText}</p>
        <a href="#lead" className="mt-5 block rounded-2xl bg-mort-ink px-5 py-4 text-center font-black text-white shadow-soft transition hover:-translate-y-0.5">
          בדיקה אנושית של התיק
        </a>
      </article>
    </div>
  );
}

function ConversionProofRail({ analysis, hasStarted, smartLeadText }) {
  const potentialMonthlyImprovement = hasStarted ? Math.max(0, analysis.monthly - analysis.safeMonthlyPayment) : 0;
  const potentialLongTermImprovement = potentialMonthlyImprovement * analysis.years * 12;

  return (
    <div className="grid gap-5">
      <BeforeAfterSavingsCard
        hasStarted={hasStarted}
        beforeHousing={analysis.beforeHousing}
        afterHousing={analysis.afterHousing}
        monthlyGap={analysis.monthlyGap}
        potentialMonthlyImprovement={potentialMonthlyImprovement}
        potentialLongTermImprovement={potentialLongTermImprovement}
      />
      <TestimonialsCard />
    </div>
  );
}

function BeforeAfterSavingsCard({ hasStarted, beforeHousing, afterHousing, monthlyGap, potentialMonthlyImprovement, potentialLongTermImprovement }) {
  const isPositiveGap = monthlyGap >= 0;

  return (
    <article className="insight-card p-6">
      <span className="pill border-blue-100 bg-white text-mort-blue">לפני / אחרי</span>
      <h3 className="mt-4 text-2xl font-black leading-tight text-mort-ink">מה משתנה בתזרים החודשי אחרי המשכנתא</h3>
      <p className="mt-2 font-bold leading-7 text-mort-muted">
        ההשוואה מציגה האם העסקה משפרת או מכבידה על התקציב החודשי לפי הנתונים שהוזנו.
      </p>
      <div className="mt-5 mort-two-card-grid">
        <SavingsMetric label="יתרה לפני העסקה" value={hasStarted ? formatILS(beforeHousing) : "--"} />
        <SavingsMetric label="יתרה אחרי העסקה" value={hasStarted ? formatILS(afterHousing) : "--"} highlight />
        <div className={`rounded-2xl border p-4 ${isPositiveGap ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          <span className="block text-xs font-black opacity-80">שינוי חודשי</span>
          <strong className="mt-1 block text-2xl font-black">{hasStarted ? formatILS(monthlyGap) : "--"}</strong>
          <small className="mt-1 block font-bold leading-5">
            {hasStarted ? (isPositiveGap && afterHousing > 0 ? "התזרים משתפר או נשאר יציב." : isPositiveGap ? "יש שיפור יחסי, אך התזרים נשאר שלילי — דורש בדיקה." : "כאן כדאי לבדוק התאמת החזר או סגירת הלוואות.") : "הזינו נתונים כדי לראות השוואה."}
          </small>
        </div>
        <div className="rounded-[22px] border border-white bg-white/80 p-4">
          <span className="block text-xs font-black text-mort-muted">יעד שיפור אפשרי</span>
          <strong className="mt-1 block text-2xl font-black text-mort-ink">
            {hasStarted && potentialMonthlyImprovement > 0 ? formatILS(potentialMonthlyImprovement) : "בדיקה עם יועץ"}
          </strong>
          <small className="mt-1 block font-bold leading-6 text-mort-muted">
            {hasStarted && potentialMonthlyImprovement > 0
              ? `אומדן פער חודשי מול החזר שמרני. לאורך התקופה: ${formatILS(potentialLongTermImprovement)}.`
            : "יועץ יכול לבדוק אם תמהיל, ריבית או פריסה עשויים לשפר את התוצאה."}
          </small>
        </div>
      </div>
    </article>
  );
}

function SavingsMetric({ label, value, highlight = false }) {
  return (
    <div className={`equal-card rounded-2xl border p-4 ${highlight ? "border-emerald-100 bg-white" : "border-slate-200 bg-surface-low/70"}`}>
      <div>
        <span className="block text-xs font-black text-mort-muted">{label}</span>
        <strong className="number-display mt-1 block text-2xl font-black text-mort-ink">{value}</strong>
      </div>
      <span className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-[11px] font-black text-mort-muted">חלק מהשוואת התזרים</span>
    </div>
  );
}

function TestimonialsCard() {
  const cases = [
    ["זוג לפני חתימה", "בדק אם יחס ההחזר גבולי ואילו הלוואות כדאי לסגור לפני הבנק."],
    ["משפחה עם הלוואות קיימות", "קיבלה תמונת מצב ברורה לפני הגשת בקשה לאישור עקרוני."],
    ["בעלי משכנתא קיימת", "בדקו אם מחזור יכול להוריד החזר או לחסוך ריבית לאורך השנים."],
    ["לפני פנייה לבנק", "קיבלו סדר במספרים והבינו מה כדאי לשפר לפני הגשה."],
  ];

  return (
    <article className="rounded-[28px] border border-slate-200 bg-white/85 p-6 shadow-soft">
      <span className="pill border-emerald-200 bg-emerald-50 text-emerald-800">אמון לפני פנייה</span>
      <h3 className="mt-4 text-2xl font-black leading-tight text-mort-ink">מקרים נפוצים שמשתמשים בודקים</h3>
      <div className="mt-5 mort-two-card-grid">
        {cases.map(([title, text]) => (
          <TestimonialItem key={title} title={title} text={text} />
        ))}
      </div>
      <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold leading-6 text-mort-muted">
        לא מוצגות כאן המלצות מזויפות. אלו תרחישים נפוצים שמחשבון משכנתא ויועץ יכולים לעזור לבדוק.
      </p>
    </article>
  );
}

function TestimonialItem({ title, text }) {
  return (
    <div className="equal-card rounded-2xl border border-slate-200 bg-white/80 p-4">
      <div>
        <strong className="block text-lg font-black text-mort-ink">{title}</strong>
        <p className="mt-1 font-bold leading-6 text-mort-muted">{text}</p>
      </div>
      <span className="mt-3 rounded-xl bg-surface-low px-3 py-2 text-[11px] font-black text-mort-muted">תרחיש נפוץ לבדיקה</span>
    </div>
  );
}

function BankCheckItem({ title, text }) {
  return (
    <article className="equal-card rounded-[22px] border border-blue-100 bg-blue-50/70 p-4">
      <div>
        <span className="block text-xs font-black text-mort-blue">מה הבנק בודק</span>
        <strong className="mt-1 block font-black text-mort-ink">{title}</strong>
        <small className="mt-1 block font-bold leading-5 text-mort-muted">{text}</small>
      </div>
      <span className="mt-4 rounded-2xl bg-white/70 px-3 py-2 text-xs font-black text-mort-blue">נבדק בסימולציה</span>
    </article>
  );
}

function HumanCheckCard({ title, items }) {
  return (
    <article className="equal-card rounded-[22px] border border-slate-200 bg-white/75 p-5 shadow-soft">
      <div>
        <h3 className="text-xl font-black text-mort-ink">{title}</h3>
        <ul className="mt-3 grid gap-2">
          {items.map((item) => (
            <li key={item} className="flex gap-2 font-bold leading-6 text-mort-muted">
              <span className="mt-0.5 text-mort-emerald shrink-0">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <span className="mt-4 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800">חשוב לשיחה עם יועץ</span>
    </article>
  );
}

function MarketRates({ rows, note }) {
  return (
    <div>
      <div className="mort-two-card-grid">
        {rows.map(([label, value, helper]) => (
          <article key={label} className="equal-card rounded-[22px] border border-slate-200 bg-white/75 p-5 shadow-soft">
            <div>
              <span className="text-sm font-black text-mort-muted">{label}</span>
              <strong className="mt-2 block text-2xl font-black text-mort-ink">{value}</strong>
              <small className="mt-2 block font-bold leading-6 text-mort-muted">{helper}</small>
            </div>
            <span className="mt-4 rounded-2xl bg-surface-low px-3 py-2 text-xs font-black text-mort-muted">נתון ריבית לסימולציה בלבד</span>
          </article>
        ))}
      </div>
      <p className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm font-bold leading-7 text-mort-muted">{note}</p>
    </div>
  );
}

function MortgageTracks() {
  return (
    <div className="mort-two-card-grid">
      {mortgageTracks.map((track) => {
        const riskColor =
          track.risk === "נמוכה" ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : track.risk === "בינונית" ? "border-amber-200 bg-amber-50 text-mort-gold"
          : "border-red-200 bg-red-50 text-red-800";
        return (
          <article key={track.name} className="equal-card rounded-[22px] border border-slate-200 bg-white/75 p-5 shadow-soft">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-xl font-black text-mort-ink">{track.name}</h3>
                  <span className="text-sm font-bold text-mort-blue">{track.rateRange}</span>
                </div>
                <span className={`pill ${riskColor}`}>סיכון: {track.risk}</span>
              </div>
              {track.boi && (
                <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs font-black text-blue-900">
                  {track.boi}
                </div>
              )}
              <dl className="mt-4 grid gap-3">
                <TrackRow label="יתרון" value={track.benefit} />
                <TrackRow label="חיסרון" value={track.downside} />
                <TrackRow label="למי מתאים" value={track.fit} />
              </dl>
            </div>
            <span className="mt-4 rounded-2xl bg-surface-low px-3 py-2 text-xs font-black text-mort-muted">תמהיל נכון עשוי להפחית עלויות ולשפר יציבות, אך נדרש להתאמה אישית.</span>
          </article>
        );
      })}
    </div>
  );
}

function AdvisorCost() {
  return (
    <div className="mort-two-card-grid">
      <div className="equal-card rounded-[22px] border border-slate-200 bg-white/75 p-5 shadow-soft">
        <div>
          <span className="text-sm font-black text-mort-muted">שכר טרחה מקובל</span>
          <strong className="mt-2 block text-3xl font-black text-mort-ink">6,000–9,000 ₪</strong>
          <p className="mt-2 text-sm font-bold leading-6 text-mort-muted">לפני מע"מ, לייעוץ מלא. תיקים מורכבים יכולים לעלות יותר.</p>
        </div>
        <span className="mt-4 rounded-2xl bg-surface-low px-3 py-2 text-xs font-black text-mort-muted">הערכה בלבד, לא מחיר מחייב</span>
      </div>
      <div className="equal-card rounded-[22px] border border-emerald-200 bg-emerald-50/60 p-5 shadow-soft">
        <div>
          <span className="text-sm font-black text-emerald-800">פוטנציאל להפחתת עלויות</span>
          <strong className="mt-2 block text-3xl font-black text-mort-ink">30,000–100,000 ₪</strong>
          <p className="mt-2 text-sm font-bold leading-6 text-mort-muted">הערכה כללית בלבד. התוצאה תלויה בריביות בפועל, בתמהיל, בתקופה ובנתוני הלקוח.</p>
        </div>
        <span className="mt-4 rounded-2xl bg-white/80 px-3 py-2 text-xs font-black text-emerald-800">דורש בדיקה מקצועית מול נתונים עדכניים</span>
      </div>
    </div>
  );
}

function TrackRow({ label, value }) {
  return (
    <div>
      <dt className={`text-sm font-black ${TRACK_ROW_COLORS[label] || "text-mort-muted"}`}>{label}</dt>
      <dd className="mt-1 font-bold leading-6 text-mort-muted">{value}</dd>
    </div>
  );
}

function LeadNextStepsCard() {
  const steps = [
    ["1", "בודקים את הנתונים", "יועץ עובר על יחס החזר, שיעור מימון והלוואות קיימות."],
    ["2", "מחפשים נקודות שיפור", "בודקים תמהיל, פריסה, סגירת הלוואות וריביות אפשריות."],
    ["3", "מחליטים אם להתקדם", "מקבלים כיוון פעולה לפני פנייה לבנק או בקשת אישור עקרוני."],
    ["4", "משווים אפשרויות", "בוחנים אם כדאי לפנות לכמה בנקים או לבדוק מחזור משכנתא."],
  ];

  return (
    <article className="rounded-[28px] border border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-emerald-50/70 p-6 shadow-soft">
      <span className="pill border-blue-100 bg-white text-mort-blue">מה קורה אחרי השליחה?</span>
      <div className="mt-5 mort-two-card-grid">
        {steps.map(([step, title, text]) => (
          <div key={step} className="equal-card rounded-2xl border border-white bg-white/80 p-4">
            <div className="flex gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-mort-ink text-sm font-black text-white">{step}</span>
              <span>
                <strong className="block font-black text-mort-ink">{title}</strong>
                <small className="mt-1 block font-bold leading-5 text-mort-muted">{text}</small>
              </span>
            </div>
            <span className="mt-3 rounded-xl bg-surface-low px-3 py-2 text-[11px] font-black text-mort-muted">שלב בתהליך</span>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-2xl bg-white/75 p-4 text-sm font-bold leading-6 text-mort-muted">
        המטרה היא להגיע לבנק מוכנים יותר, בלי הבטחות לאישור ובלי הצעה בנקאית מחייבת.
      </p>
    </article>
  );
}

function LeadBox({ lead, setLead, submitLead, leadLoading, leadSent, leadError, defaultMortgage, contextText, buttonText = "בדיקה ראשונית ללא התחייבות", compact = false }) {
  const fieldGridClass = compact ? "grid gap-3" : "grid items-stretch gap-3 sm:grid-cols-2";
  return (
    <form onSubmit={submitLead} className="rounded-[28px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-7 shadow-luxury" noValidate>
      <span className="pill border-emerald-200 bg-white/85 text-emerald-800">בדיקה לפני אישור עקרוני</span>
      <h3 className="mt-4 text-3xl font-black leading-tight text-mort-ink">רוצה לבדוק איך לשפר את הסיכוי והתנאים?</h3>
      <p className="mt-3 font-bold leading-7 text-mort-muted">
        השאר פרטים לבדיקה ראשונית. יועץ יוכל לבחון את הנתונים, לזהות נקודות חולשה ולבדוק אפשרות לשיפור תמהיל וריביות.
      </p>
      {contextText && (
        <p className="mt-3 rounded-2xl border border-emerald-200 bg-white/75 p-3 text-sm font-black leading-6 text-emerald-900">
          {contextText}
        </p>
      )}
      <div className="mt-4 grid gap-2 rounded-[22px] border border-emerald-200 bg-white/75 p-4">
        {["בדיקה לפי הנתונים שהזנת במחשבון", "כיוון פעולה לפני בקשת אישור עקרוני", "אפשרות לבדוק תמהיל וריביות מול כמה בנקים"].map((item) => (
          <span key={item} className="flex items-center gap-2 text-sm font-black text-emerald-900">
            <span className="text-mort-emerald">✓</span>
            {item}
          </span>
        ))}
      </div>
      <div className="mt-6 grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-black text-mort-ink">שדות חובה</span>
          <span className="text-xs font-black text-mort-muted">פחות מדקה</span>
        </div>
        <div className={fieldGridClass}>
          <LeadInput label="שם מלא" value={lead.name} onChange={(v) => setLead({ ...lead, name: v })} placeholder="ישראל ישראלי" />
          <div className="grid gap-1">
            <LeadInput label="טלפון" value={lead.phone} onChange={(v) => setLead({ ...lead, phone: v })} placeholder="05X-XXXXXXX" inputMode="tel" />
            <span className="text-xs font-bold text-mort-muted">נשתמש בו רק לצורך חזרה אליך</span>
          </div>
        </div>
        {!compact && (
          <>
            <span className="mt-1 text-sm font-black text-mort-muted">פרטים שעוזרים לדייק את הבדיקה</span>
            <div className={fieldGridClass}>
              <LeadInput label="עיר (אופציונלי)" value={lead.city} onChange={(v) => setLead({ ...lead, city: v })} placeholder="עיר מגורים" />
              <LeadInput label="סכום משכנתא (אופציונלי)" value={lead.mortgageAmount ? displayNumber(lead.mortgageAmount) : displayNumber(defaultMortgage)} onChange={(v) => setLead({ ...lead, mortgageAmount: cleanNumber(v) })} placeholder="סכום משכנתא" inputMode="numeric" />
            </div>
            <label className="grid gap-2">
              <span className="text-sm font-black text-mort-muted">סטטוס רכישה (אופציונלי)</span>
              <select className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink" value={lead.purchaseStatus} onChange={(e) => setLead({ ...lead, purchaseStatus: e.target.value })}>
                <option value="">בחר סטטוס</option>
                <option value="planning">רק בודק אפשרות</option>
                <option value="found_property">מצאתי נכס</option>
                <option value="contract">לפני חתימה / בתהליך חוזה</option>
                <option value="refinance">מחזור משכנתא קיימת</option>
              </select>
            </label>
          </>
        )}
        <button type="submit" disabled={leadLoading || leadSent} className="min-h-14 rounded-2xl bg-gradient-to-br from-mort-emerald to-mort-blue px-5 py-4 text-lg font-black text-white shadow-glow transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
          {leadLoading ? "שולח..." : leadSent ? "✓ נשלח בהצלחה" : buttonText}
        </button>
      </div>
      <small className="mt-4 block text-center font-bold leading-6 text-mort-muted">הפרטים נשמרים לצורך חזרה אליך בלבד.</small>
      {leadSent && (
        <div className="mt-4 rounded-2xl bg-emerald-100 p-4 text-center">
          <strong className="block text-emerald-800">הפנייה נשלחה בהצלחה! יועץ ייצור איתך קשר בקרוב.</strong>
        </div>
      )}
      {leadError && <strong className="mt-4 block rounded-2xl bg-red-100 p-3 text-red-700">{leadError}</strong>}
    </form>
  );
}

function SelectInput({ label, value, onChange, options }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-mort-muted">{label}</span>
      <select className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-black text-mort-ink" value={value} onChange={(e) => onChange(e.target.value)}>
        {Object.entries(options).map(([key, option]) => (
          <option key={key} value={key}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function RateInput({ label, value, onChange, helper }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-mort-muted">{label}</span>
      <div className="flex min-h-12 overflow-hidden rounded-2xl border border-slate-200 bg-white ring-emerald-200 transition focus-within:ring-4">
        <span className="grid w-14 shrink-0 place-items-center bg-blue-50 font-black text-mort-blue">%</span>
        <input
          className="min-w-0 flex-1 px-4 py-3 text-lg font-black text-mort-ink outline-none"
          inputMode="decimal"
          value={String(value || "").replace(/[^\d.]/g, "")}
          onChange={(e) => onChange(cleanNumber(e.target.value, true))}
          placeholder="לדוגמה 5.4"
        />
      </div>
      {helper && <small className="font-bold leading-5 text-mort-muted">{helper}</small>}
    </label>
  );
}

function LeadInput({ label, value, onChange, placeholder, inputMode }) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-sm font-black text-mort-muted">{label}</span>
      <input className="focus-field min-h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink" value={value} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}
