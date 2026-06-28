import Head from "next/head";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTheme } from "./_app";
import { cleanNumber, displayNumber, formatILS, formatPct, toNumber } from "../lib/format";
import { monthlyPayment } from "../lib/mortgage";
import {
  REFINANCE_SEO,
  absoluteUrl,
  faqSchema,
  financialServiceSchema,
  organizationSchema,
  stringifyJsonLd,
  webPageSchema,
} from "../lib/seo";

const initialData = {
  balance: "",
  currentPayment: "",
  remainingYears: "",
  currentRate: "",
  newRate: "",
  refinanceCost: "",
  income: "",
  expenses: "",
  loans: "",
};

const initialLead = {
  name: "",
  phone: "",
  city: "",
  mortgageAmount: "",
  income: "",
  loans: "",
  requestedContactTime: "",
  purchaseStatus: "refinance",
  hasExistingMortgage: "yes",
};

const navLinks = [
  ["דף הבית", "/"],
  ["בדיקת מחזור", "#calculator"],
  ["תוצאה", "#summary"],
  ["השוואה", "#comparison"],
  ["שאלות נפוצות", "#faq"],
];

const improvementCards = [
  ["הורדת ריבית", "בדיקה אם לפי תנאי השוק והבנק עשויה להתקבל ריבית נמוכה יותר ולצמצם עלות כוללת."],
  ["שינוי תקופה", "קיצור או הארכת תקופה יכולים לשנות החזר חודשי וריבית מצטברת."],
  ["שינוי תמהיל", "חלוקה אחרת בין מסלולים עשויה לשפר יציבות וגמישות."],
  ["בדיקת עלויות", "עמלות וקנסות משפיעים ישירות על נקודת האיזון."],
];

const faqItems = [
  ["מתי מחזור משכנתא עשוי להשתלם?", "כאשר יש חיסכון חודשי או חיסכון ריבית משמעותי, ועלויות המחזור מוחזרות בתוך תקופה סבירה ביחס לשנים שנותרו."],
  ["האם חיסכון חודשי מספיק כדי להחליט?", "לא. צריך לבדוק גם חיסכון נטו אחרי עלויות, סך ריבית לאורך התקופה ונקודת איזון."],
  ["מה קורה אם אין חיסכון לפי הנתונים?", "העמוד יציג זאת בצורה ברורה ולא יציג המלצה חיובית למחזור. עדיין אפשר לבדוק מול יועץ אם יש נתונים חסרים."],
  ["האם זו הצעה בנקאית?", "לא. זו סימולציה ראשונית בלבד, ויש לוודא נתונים מול בנק או יועץ משכנתאות מורשה."],
  ["אילו נתונים צריך כדי לבדוק מחזור משכנתא?", "כדאי להזין יתרת משכנתא לסילוק, החזר חודשי נוכחי, ריבית קיימת, שנים שנותרו, ריבית חדשה משוערת ועלויות מחזור או עמלת פירעון מוקדם אם קיימת."],
  ["מהי נקודת איזון במחזור משכנתא?", "נקודת איזון היא משך הזמן שבו החיסכון החודשי מכסה את עלויות המחזור. אם נקודת האיזון ארוכה מהתקופה שנותרה, המחזור עלול להיות פחות משתלם."],
];

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function formatMonths(months) {
  if (!months) return "לא מחושב כרגע";
  if (months < 12) return `${months} חודשים`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years} שנים ו-${rest} חודשים` : `${years} שנים`;
}

function calculateRefinance(data) {
  const balance = toNumber(data.balance);
  const enteredCurrentPayment = toNumber(data.currentPayment);
  const remainingYears = Math.min(30, Math.max(1, toNumber(data.remainingYears) || 0));
  const currentRate = Number(data.currentRate) || 0;
  const newRate = Number(data.newRate) || 0;
  const refinanceCost = toNumber(data.refinanceCost) || 0;
  const income = toNumber(data.income);
  const expenses = toNumber(data.expenses);
  const loans = toNumber(data.loans);
  const months = remainingYears * 12;
  const hasRequiredInputs = balance > 0 && currentRate > 0 && remainingYears > 0 && newRate > 0;

  const calculatedCurrentPayment = hasRequiredInputs ? monthlyPayment(balance, currentRate, remainingYears) : 0;
  const currentPayment = enteredCurrentPayment || calculatedCurrentPayment;
  const newPayment = hasRequiredInputs ? monthlyPayment(balance, newRate, remainingYears) : 0;
  const currentTotalPaid = hasRequiredInputs ? currentPayment * months : 0;
  const newTotalPaid = hasRequiredInputs ? newPayment * months : 0;
  const currentInterestEstimate = Math.max(0, currentTotalPaid - balance);
  const newInterestEstimate = Math.max(0, newTotalPaid - balance);
  const monthlyDifference = currentPayment - newPayment;
  const monthlySavings = Math.max(0, monthlyDifference);
  const totalInterestDifference = currentInterestEstimate - newInterestEstimate;
  const totalInterestSavings = Math.max(0, totalInterestDifference);
  const netSavings = totalInterestSavings - refinanceCost;
  const breakEvenMonths = monthlySavings > 0 && refinanceCost > 0 ? Math.ceil(refinanceCost / monthlySavings) : 0;
  const breakEvenWithinTerm = refinanceCost === 0 ? monthlySavings > 0 : breakEvenMonths > 0 && breakEvenMonths <= months;
  const isWorthwhile = hasRequiredInputs && monthlySavings > 0 && netSavings > 0 && breakEvenWithinTerm;
  const isBorderline = hasRequiredInputs && !isWorthwhile && monthlySavings > 0 && (totalInterestSavings > 0 || breakEvenMonths > 0);
  const totalObligationsRatio = income ? ((newPayment + loans) / income) * 100 : 0;
  const afterRefinance = income ? income - expenses - loans - newPayment : 0;
  const newMonthlyRate = newRate / 100 / 12;
  const rateGap = currentRate - newRate;

  const lowerRate = Math.max(0.1, newRate - 0.4);
  const longerYears = Math.min(30, remainingYears ? remainingYears + 5 : 25);
  const shorterYears = Math.max(5, remainingYears ? remainingYears - 5 : 5);
  const combinedYears = Math.max(5, remainingYears ? remainingYears - 3 : 5);
  const scenarios = [
    {
      title: "הורדת ריבית",
      note: "בודק מה קורה אם מצליחים לקבל ריבית נמוכה יותר בכ-0.4%.",
      payment: hasRequiredInputs ? monthlyPayment(balance, lowerRate, remainingYears) : 0,
      rate: lowerRate,
      years: remainingYears,
    },
    {
      title: "הארכת תקופה",
      note: "מוריד החזר חודשי, אך בדרך כלל מגדיל את סך הריבית לאורך השנים.",
      payment: hasRequiredInputs ? monthlyPayment(balance, newRate, longerYears) : 0,
      rate: newRate,
      years: longerYears,
    },
    {
      title: "קיצור תקופה",
      note: "ההחזר החודשי עולה, אבל סך הריבית עשוי לרדת משמעותית.",
      payment: hasRequiredInputs ? monthlyPayment(balance, newRate, shorterYears) : 0,
      rate: newRate,
      years: shorterYears,
    },
    {
      title: "ריבית ותקופה משולבים",
      note: "שילוב של הורדת ריבית קלה עם קיצור תקופה מתון.",
      payment: hasRequiredInputs ? monthlyPayment(balance, lowerRate, combinedYears) : 0,
      rate: lowerRate,
      years: combinedYears,
    },
  ].map((scenario) => ({
    ...scenario,
    monthlyChange: currentPayment ? currentPayment - scenario.payment : 0,
    totalInterest: Math.max(0, scenario.payment * scenario.years * 12 - balance),
    riskExplanation: scenario.years > remainingYears
      ? "החזר נמוך יותר בדרך כלל מגיע עם יותר ריבית לאורך התקופה."
      : scenario.years < remainingYears
        ? "קיצור תקופה עשוי לחסוך ריבית, אך ההחזר החודשי יכול לעלות."
        : "התרחיש תלוי בריבית שתתקבל בפועל ובעלויות המחזור.",
  }));

  let score = 25;
  score += monthlySavings > 800 ? 24 : monthlySavings > 350 ? 18 : monthlySavings > 150 ? 12 : monthlySavings > 50 ? 6 : 0;
  score += netSavings > 150000 ? 24 : netSavings > 80000 ? 20 : netSavings > 40000 ? 14 : netSavings > 15000 ? 8 : netSavings > 5000 ? 4 : 0;
  score += rateGap >= 1.5 ? 12 : rateGap >= 0.8 ? 9 : rateGap >= 0.3 ? 6 : rateGap > 0 ? 3 : 0;
  score += breakEvenWithinTerm && breakEvenMonths <= 12 ? 12 : breakEvenWithinTerm && breakEvenMonths <= 36 ? 8 : breakEvenWithinTerm ? 4 : 0;
  score -= totalObligationsRatio > 50 ? 10 : totalObligationsRatio > 42 ? 5 : totalObligationsRatio > 35 ? 2 : 0;
  if (!isWorthwhile && !isBorderline) score = Math.min(score, 45);
  score = hasRequiredInputs ? clamp(Math.round(score)) : 0;

  const recommendation = !hasRequiredInputs
    ? "הזינו נתונים כדי לקבל אומדן"
    : isWorthwhile
      ? "נראה שיש פוטנציאל לבדיקה מקצועית"
      : isBorderline
        ? "הכדאיות אינה חד-משמעית"
        : "לפי הנתונים כרגע - המחזור נראה פחות משתלם באומדן הראשוני";

  const recommendationText = !hasRequiredInputs
    ? "הזינו יתרה, ריבית ותקופה שנותרה. אם ההחזר החודשי חסר, נחושב אותו לפי נוסחת שפיצר."
    : isWorthwhile
      ? "ייתכן שניתן לחסוך בהחזר או בריבית הכוללת, בכפוף לריביות בפועל, עלויות מחזור ואישור הגוף המממן."
      : isBorderline
        ? "החיסכון קיים, אך צריך לבדוק אם הוא מצדיק את עלויות המחזור ונקודת האיזון."
        : monthlySavings <= 0
          ? "אין חיסכון חודשי לפי הנתונים שהוזנו."
          : "ייתכן שהחיסכון נמוך מדי או שנקודת האיזון רחוקה מדי.";

  const breakEvenNote = !hasRequiredInputs
    ? "ממתין לנתונים"
    : monthlySavings <= 0
      ? "אין חיסכון חודשי לפי הנתונים"
      : breakEvenMonths > months
        ? "נקודת האיזון ארוכה מהתקופה שנותרה - באומדן הראשוני נראה פחות משתלם"
        : refinanceCost === 0
          ? "לא הוזנה עלות מחזור"
          : `החיסכון מכסה את עלויות המחזור בתוך ${formatMonths(breakEvenMonths)}`;

  const risk = !hasRequiredInputs
    ? "ממתין לנתונים"
    : totalObligationsRatio > 45 || afterRefinance < 0
      ? "גבוהה"
      : totalObligationsRatio > 35
        ? "בינונית"
        : "נמוכה";

  return {
    balance,
    currentPayment,
    calculatedCurrentPayment,
    enteredCurrentPayment,
    remainingYears,
    months,
    currentRate,
    newRate,
    newMonthlyRate,
    refinanceCost,
    newPayment,
    currentInterestEstimate,
    newInterestEstimate,
    monthlySavings,
    totalInterestSavings,
    netSavings,
    breakEvenMonths,
    breakEvenWithinTerm,
    isWorthwhile,
    isBorderline,
    totalObligationsRatio,
    afterRefinance,
    score,
    recommendation,
    recommendationText,
    breakEvenNote,
    risk,
    scenarios,
    hasRequiredInputs,
  };
}

export default function RefinanceCheck() {
  const [data, setData] = useState(initialData);
  const [lead, setLead] = useState(initialLead);
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadSent, setLeadSent] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [leadConsent, setLeadConsent] = useState(false);
  const [pdfState, setPdfState] = useState({ status: "idle", message: "", fields: null });
  const [pdfConfirmed, setPdfConfirmed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const successRef = useRef(null);
  const result = useMemo(() => calculateRefinance(data), [data]);

  const resetForm = useCallback(() => {
    setData(initialData);
    setPdfState({ status: "idle", message: "", fields: null });
    setPdfConfirmed(false);
  }, []);

  function trackEvent(action, label, value) {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", action, { event_category: "refinance", event_label: label, value });
    }
    if (typeof window !== "undefined" && window.dataLayer) {
      window.dataLayer.push({ event: action, category: "refinance", label, value });
    }
  }

  function shareWhatsApp() {
    if (!result.hasRequiredInputs) return;
    const text = `בדיקת מחזור משכנתא - FINZO\n\nציון כדאיות: ${result.score}/100\nחיסכון חודשי: ${formatILS(result.monthlySavings)}\nחיסכון נטו: ${formatILS(result.netSavings)}\nנקודת איזון: ${formatMonths(result.breakEvenMonths)}\n\n${result.recommendation}\n\nלבדיקה: ${typeof window !== "undefined" ? window.location.href : ""}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    trackEvent("share_whatsapp", "refinance_result");
  }

  function downloadResultPdf() {
    if (!result.hasRequiredInputs) return;
    trackEvent("download_pdf", "refinance_result");
    const html = `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>בדיקת מחזור משכנתא - FINZO</title><style>body{font-family:Arial,Helvetica,sans-serif;max-width:700px;margin:0 auto;padding:32px;color:#1e293b}h1{color:#6d28d9;font-size:24px}h2{font-size:18px;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin-top:28px}.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9}.label{color:#64748b}.value{font-weight:bold}.score{font-size:48px;font-weight:900;color:#6d28d9}.note{background:#f5f3ff;border-radius:12px;padding:16px;margin-top:12px;font-size:14px;color:#4c1d95}.disclaimer{margin-top:32px;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:16px}</style></head><body><h1>FINZO · בדיקת מחזור משכנתא</h1><p class="score">${result.score}/100</p><div class="note">${result.recommendation}<br/>${result.recommendationText}</div><h2>נתוני המשכנתא</h2><div class="row"><span class="label">יתרה לסילוק</span><span class="value">${formatILS(result.balance)}</span></div><div class="row"><span class="label">ריבית קיימת</span><span class="value">${formatPct(result.currentRate)}</span></div><div class="row"><span class="label">ריבית חדשה</span><span class="value">${formatPct(result.newRate)}</span></div><div class="row"><span class="label">שנים שנותרו</span><span class="value">${result.remainingYears}</span></div><h2>תוצאות</h2><div class="row"><span class="label">החזר נוכחי</span><span class="value">${formatILS(result.currentPayment)}</span></div><div class="row"><span class="label">החזר חדש</span><span class="value">${formatILS(result.newPayment)}</span></div><div class="row"><span class="label">חיסכון חודשי</span><span class="value">${formatILS(result.monthlySavings)}</span></div><div class="row"><span class="label">חיסכון נטו</span><span class="value">${formatILS(result.netSavings)}</span></div><div class="row"><span class="label">נקודת איזון</span><span class="value">${formatMonths(result.breakEvenMonths)}</span></div><div class="row"><span class="label">רמת סיכון</span><span class="value">${result.risk}</span></div><h2>תרחישים</h2>${result.scenarios.map(s => `<div class="row"><span class="label">${s.title} (${formatPct(s.rate)}, ${s.years} שנים)</span><span class="value">${formatILS(s.payment)}/חודש</span></div>`).join("")}<p class="disclaimer">אומדן ראשוני בלבד, לא אישור בנקאי ולא ייעוץ אישי. יש לוודא נתונים מול בנק או יועץ משכנתאות מורשה.<br/>FINZO · ${new Date().toLocaleDateString("he-IL")}</p></body></html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  }

  async function handlePdfUpload(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setPdfState({ status: "error", message: "יש להעלות קובץ PDF בלבד.", fields: null });
      return;
    }
    setPdfState({ status: "loading", message: "מעבד את ה-PDF...", fields: null });
    setPdfConfirmed(false);
    trackEvent("pdf_upload", "refinance_pdf");

    try {
      const res = await fetch("/api/parse-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        setPdfState({
          status: "error",
          message: json.message || "לא ניתן לחלץ נתונים מה-PDF. נסו להזין ידנית.",
          fields: null,
        });
        return;
      }

      setPdfState({ status: "confirm", message: json.message, fields: json.fields });
    } catch {
      setPdfState({ status: "error", message: "שגיאה בהעלאת הקובץ. בדקו חיבור לאינטרנט ונסו שנית.", fields: null });
    }
  }

  function applyPdfFields() {
    if (!pdfState.fields) return;
    const f = pdfState.fields;
    setData((current) => ({
      ...current,
      ...(f.balance != null ? { balance: String(Math.round(f.balance)) } : {}),
      ...(f.currentPayment != null ? { currentPayment: String(Math.round(f.currentPayment)) } : {}),
      ...(f.remainingYears != null ? { remainingYears: String(f.remainingYears) } : {}),
      ...(f.currentRate != null ? { currentRate: String(f.currentRate) } : {}),
      ...(f.refinanceCost != null ? { refinanceCost: String(Math.round(f.refinanceCost)) } : {}),
    }));
    setPdfConfirmed(true);
    setPdfState((s) => ({ ...s, status: "done" }));
  }

  function cancelPdf() {
    setPdfState({ status: "idle", message: "", fields: null });
    setPdfConfirmed(false);
  }

  function update(key, value) {
    setData((current) => ({ ...current, [key]: value }));
  }

  async function submitLead(event) {
    event.preventDefault();
    if (leadLoading || leadSent) return;
    const phone = cleanNumber(lead.phone);
    if (lead.name.trim().length < 2 || phone.length < 7) {
      setLeadError("יש להשלים שם וטלפון כדי לשלוח את הבדיקה");
      return;
    }
    if (!leadConsent) {
      setLeadError("יש לאשר את הסכמתכם לשיתוף המידע לפני שליחה.");
      return;
    }

    const record = {
      name: lead.name.trim(),
      phone,
      propertyCity: lead.city.trim(),
      city: lead.city.trim(),
      mortgageAmount: cleanNumber(lead.mortgageAmount) || String(result.balance || ""),
      monthlyIncome: cleanNumber(lead.income) || String(result.income || ""),
      debtLevel: cleanNumber(lead.loans) || "",
      requestedContactTime: lead.requestedContactTime,
      purchaseStatus: "refinance",
      hasExistingMortgage: "yes",
      source: "refinance-check",
      estimatedPayment: result.newPayment ? String(Math.round(result.newPayment)) : "",
      estimatedApprovalResult: result.score ? String(result.score) : "",
      approval: result.score,
      mainIssue: result.recommendation,
      monthly: result.newPayment,
      mortgage: result.balance,
      createdAt: new Date().toISOString(),
    };

    setLeadError("");
    setLeadLoading(true);
    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead: record, analysis: result }),
      });
      const apiResult = await response.json().catch(() => ({}));
      if (!response.ok || apiResult?.ok !== true) {
        const msg = apiResult?.message || apiResult?.error || "";
        throw new Error(msg || "Lead request was not confirmed");
      }

      try {
        const saved = JSON.parse(localStorage.getItem("mortgai2_leads") || "[]");
        localStorage.setItem("mortgai2_leads", JSON.stringify([record, ...saved].slice(0, 50)));
      } catch {
        // Browser backup is optional. Server accepted the lead.
      }

      setLeadSent(true);
      trackEvent("lead_submit", "refinance_lead", result.score || 0);
      window.requestAnimationFrame(() => successRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
    } catch (err) {
      setLeadSent(false);
      setLeadError(err?.message && err.message !== "Lead request was not confirmed"
        ? err.message
        : "לא הצלחנו לשלוח את הפרטים כרגע. נסה שוב בעוד רגע.");
    } finally {
      setLeadLoading(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-white dark:bg-slate-900 pb-24 text-slate-950 dark:text-slate-100 md:pb-0">
      <Head>
        <title>{REFINANCE_SEO.title}</title>
        <meta name="description" content={REFINANCE_SEO.description} />
        <meta name="keywords" content={REFINANCE_SEO.keywords} />
        <meta name="robots" content="index,follow" />
        <meta property="og:title" content={REFINANCE_SEO.title} />
        <meta property="og:description" content={REFINANCE_SEO.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={absoluteUrl(REFINANCE_SEO.path)} />
        <meta property="og:site_name" content="FINZO" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={REFINANCE_SEO.title} />
        <meta name="twitter:description" content={REFINANCE_SEO.description} />
        <link rel="canonical" href={absoluteUrl(REFINANCE_SEO.path)} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: stringifyJsonLd([
              organizationSchema(),
              financialServiceSchema({
                url: absoluteUrl(REFINANCE_SEO.path),
                name: "בדיקת מחזור משכנתא",
                description: REFINANCE_SEO.description,
              }),
              webPageSchema(REFINANCE_SEO),
              faqSchema(faqItems),
            ]),
          }}
        />
      </Head>

      <Header mobileNav={mobileNav} setMobileNav={setMobileNav} />
      <Hero />

      <section id="calculator" className="bg-gradient-to-b from-white via-violet-50/35 to-white dark:from-slate-900 dark:via-violet-950/20 dark:to-slate-900 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeader
            eyebrow="בדיקת מחזור"
            title="הזינו את נתוני המשכנתא הקיימת"
            text="ניתן להעלות דוח משכנתא PDF לחילוץ נתונים, או להזין ידנית. תמיד תוצג אפשרות לאשר לפני השימוש בנתונים שחולצו."
          />
          <div className="mt-10 grid items-start gap-6 lg:grid-cols-2">
            <ManualForm data={data} update={update} pdfState={pdfState} pdfConfirmed={pdfConfirmed} onPdfUpload={handlePdfUpload} onPdfApply={applyPdfFields} onPdfCancel={cancelPdf} onReset={resetForm} />
            <ResultPanel result={result} onShareWhatsApp={shareWhatsApp} onDownloadPdf={downloadResultPdf} />
          </div>
        </div>
      </section>

      <section id="summary" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeader
          eyebrow="תוצאה"
          title="האם המחזור נראה משתלם?"
          text="העמוד מציג אומדן בלבד: חיסכון חודשי, חיסכון נטו אחרי עלויות ונקודת איזון ביחס לתקופה שנותרה."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <MetricCard label="ציון כדאיות למחזור" value={result.hasRequiredInputs ? `${result.score}/100` : "--"} note={result.recommendation} />
          <MetricCard label="חיסכון חודשי משוער" value={result.hasRequiredInputs ? formatILS(result.monthlySavings) : "--"} note={result.monthlySavings <= 0 && result.hasRequiredInputs ? "אין חיסכון חודשי לפי הנתונים" : "הפרש בין ההחזר הנוכחי לחדש"} />
          <MetricCard label="חיסכון נטו לאחר עלויות" value={result.hasRequiredInputs ? formatILS(result.netSavings) : "--"} note={result.netSavings <= 0 && result.hasRequiredInputs ? "לא מוצגת המלצה חיובית כשאין חיסכון נטו" : "חיסכון ריבית פחות עלויות מחזור"} />
          <MetricCard label="נקודת איזון" value={result.hasRequiredInputs ? formatMonths(result.breakEvenMonths) : "--"} note={result.breakEvenNote} />
        </div>

        <AdvisorCta
          result={result}
          lead={lead}
          setLead={setLead}
          submitLead={submitLead}
          leadLoading={leadLoading}
          leadSent={leadSent}
          leadError={leadError}
          successRef={successRef}
          consent={leadConsent}
          setConsent={setLeadConsent}
        />
      </section>

      <section id="comparison" className="bg-slate-50 dark:bg-slate-950 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeader
            eyebrow="לפני ואחרי"
            title="השוואת המשכנתא הנוכחית מול תרחיש המחזור"
            text="אם הנתונים לא מצביעים על חיסכון, ההמלצה תישאר זהירה ולא תציג מחזור כמשתלם."
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <ComparisonColumn
              title="מצב נוכחי"
              rows={[
                ["החזר חודשי", result.hasRequiredInputs ? formatILS(result.currentPayment) : "--"],
                ["ריבית ממוצעת", result.hasRequiredInputs ? formatPct(result.currentRate) : "--"],
                ["יתרה לסילוק", result.hasRequiredInputs ? formatILS(result.balance) : "--"],
                ["סך ריבית משוער", result.hasRequiredInputs ? formatILS(result.currentInterestEstimate) : "--"],
              ]}
            />
            <ComparisonColumn
              title="מצב חדש"
              highlighted
              rows={[
                ["החזר חודשי חדש", result.hasRequiredInputs ? formatILS(result.newPayment) : "--"],
                ["ריבית חדשה", result.hasRequiredInputs ? formatPct(result.newRate) : "--"],
                ["חיסכון חודשי", result.hasRequiredInputs ? formatILS(result.monthlySavings) : "--"],
                ["חיסכון נטו לאחר עלויות", result.hasRequiredInputs ? formatILS(result.netSavings) : "--"],
              ]}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeader
          eyebrow="תרחישים"
          title="ארבע דרכים לבדוק את המחזור"
          text="כל תרחיש מציג תוצאה שונה כדי להבין מה משפיע על ההחזר ועל הריבית הכוללת."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {result.scenarios.map((scenario) => (
            <ScenarioCard key={scenario.title} scenario={scenario} active={result.hasRequiredInputs} />
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {improvementCards.map(([title, text]) => (
            <InfoCard key={title} title={title} text={text} />
          ))}
        </div>
      </section>

      <section id="faq" className="bg-slate-50 dark:bg-slate-950 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <SectionHeader eyebrow="שאלות נפוצות" title="מה חשוב לדעת לפני מחזור?" text="הבדיקה כאן היא כלי ראשוני, לא הצעה בנקאית ולא ייעוץ מחייב." />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {faqItems.map(([title, text]) => (
              <InfoCard key={title} title={title} text={text} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <MobileStickyCta />
    </main>
  );
}

function Header({ mobileNav, setMobileNav }) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <a href="/" className="flex items-center gap-2.5">
          <span className="text-lg font-black text-slate-950 dark:text-white">FINZO</span>
          <span className="text-[11px] font-black text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-950 border border-violet-200 dark:border-slate-800 px-2 py-0.5 rounded-full">בדיקת מחזור משכנתא</span>
        </a>
        <nav aria-label="ניווט ראשי" className="hidden items-center gap-6 text-sm font-bold text-slate-600 dark:text-slate-400 lg:flex">
          {navLinks.map(([label, href]) => (
            <a key={href} href={href} className="transition hover:text-violet-700">{label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a href="#calculator" className="rounded-full bg-violet-700 px-5 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(109,40,217,0.28)] transition hover:bg-violet-800">
            בדיקה חינם
          </a>
          <button
            type="button"
            onClick={() => setMobileNav((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 lg:hidden"
            aria-label={mobileNav ? "סגור תפריט" : "פתח תפריט"}
            aria-expanded={mobileNav}
          >
            {mobileNav ? (
              <svg className="h-5 w-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="h-5 w-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
      </div>
      {mobileNav && (
        <nav className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-3">
            {navLinks.map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMobileNav(false)} className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800">{label}</a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.18),transparent_45%)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
        <div className="mx-auto max-w-2xl text-center lg:text-right">
          <span className="inline-flex rounded-full border border-violet-200 dark:border-slate-800 bg-violet-50 dark:bg-violet-950 px-4 py-2 text-sm font-black text-violet-800 dark:text-violet-300">מחזור משכנתא</span>
          <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">
            בדיקת כדאיות למחזור משכנתא
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg font-semibold leading-8 text-slate-600 dark:text-slate-400 lg:mx-0">
            הזינו כמה נתונים בסיסיים וקבלו אומדן חיסכון חודשי, חיסכון ריבית, נקודת איזון והאם כדאי להתקדם לבדיקה מקצועית ראשונית.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <a href="#calculator" className="rounded-full bg-violet-700 px-8 py-4 text-center text-base font-black text-white shadow-[0_18px_44px_rgba(109,40,217,0.32)] transition hover:-translate-y-0.5 hover:bg-violet-800">
              בדקו מחזור עכשיו
            </a>
            <a href="/" className="rounded-full border border-violet-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 py-4 text-center text-base font-black text-violet-800 dark:text-violet-300 shadow-sm transition hover:border-violet-300 hover:bg-violet-50">
              מחשבון רכישה
            </a>
          </div>
          <p className="mt-5 text-sm font-bold text-slate-500 dark:text-slate-400">סימולציה ראשונית בלבד, לא אישור בנקאי או ייעוץ משכנתאות רשמי.</p>
        </div>
        <Illustration />
      </div>
    </section>
  );
}

function Illustration() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="absolute -inset-6 rounded-[56px] bg-violet-200/30 blur-3xl" />
      <div className="relative rounded-[44px] border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50 to-violet-50 dark:from-slate-900 dark:via-slate-800 dark:to-violet-950 p-8 shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
        <div className="rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <p className="text-sm font-black text-slate-500 dark:text-slate-400">אומדן מחזור</p>
          <div className="mt-5 space-y-4">
            <Line label="החזר נוכחי" width="92%" />
            <Line label="החזר חדש" width="68%" purple />
            <Line label="חיסכון נטו" width="74%" />
          </div>
          <div className="mt-6 rounded-3xl bg-violet-700 p-5 text-white">
            <p className="text-sm font-black text-violet-100">נקודת איזון</p>
            <p className="mt-2 text-3xl font-black">בדיקה מהירה</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Line({ label, width, purple = false }) {
  return (
    <div>
      <div className="flex justify-between text-sm font-black text-slate-500 dark:text-slate-400"><span>{label}</span><span>{width}</span></div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${purple ? "bg-violet-600" : "bg-slate-300"}`} style={{ width }} /></div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, text }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <span className="inline-flex rounded-full bg-violet-50 dark:bg-violet-950 px-4 py-2 text-sm font-black text-violet-700 dark:text-violet-300">{eyebrow}</span>
      <h2 className="mt-5 text-3xl font-black leading-tight text-slate-950 dark:text-white sm:text-4xl">{title}</h2>
      <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-400">{text}</p>
    </div>
  );
}

function getValidationWarning(data) {
  const rate = Number(data.currentRate);
  const newRate = Number(data.newRate);
  const years = Number(data.remainingYears);
  const balance = toNumber(data.balance);
  const warnings = [];
  if (rate > 0 && rate > 12) warnings.push("ריבית קיימת גבוהה מאוד — בדקו שהערך נכון");
  if (newRate > 0 && newRate > 12) warnings.push("ריבית חדשה גבוהה מאוד — בדקו שהערך נכון");
  if (rate > 0 && rate < 0.5) warnings.push("ריבית קיימת נמוכה מאוד — בדקו שהערך באחוזים");
  if (newRate > 0 && newRate < 0.5) warnings.push("ריבית חדשה נמוכה מאוד — בדקו שהערך באחוזים");
  if (newRate > 0 && rate > 0 && newRate >= rate) warnings.push("הריבית החדשה גבוהה או שווה לקיימת — לא צפוי חיסכון");
  if (years > 0 && years > 30) warnings.push("תקופה מקסימלית: 30 שנה");
  if (balance > 0 && balance < 10000) warnings.push("יתרה נמוכה מאוד — בדקו שהסכום בשקלים");
  return warnings;
}

function ManualForm({ data, update, pdfState, pdfConfirmed, onPdfUpload, onPdfApply, onPdfCancel, onReset }) {
  const fileInputRef = useRef(null);
  const isLoading = pdfState.status === "loading";
  const warnings = getValidationWarning(data);
  const hasAnyData = Object.values(data).some((v) => v !== "");

  return (
    <div className="flex flex-col gap-4">
      {/* PDF Upload area */}
      <div className="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm sm:p-6">
        <p className="text-sm font-black text-slate-700 dark:text-slate-300">העלאת דוח משכנתא PDF <span className="font-semibold text-slate-400 dark:text-slate-500">(אופציונלי)</span></p>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">המערכת תנסה לחלץ יתרה, החזר, ריבית ותקופה. תמיד תוצג אפשרות לאשר לפני השימוש.</p>

        {pdfState.status === "idle" || pdfState.status === "done" ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950 px-4 py-4 text-sm font-black text-violet-800 dark:text-violet-300 transition hover:bg-violet-100 disabled:opacity-50"
          >
            <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {pdfConfirmed ? "העלה דוח אחר" : "לחצו להעלאת PDF"}
          </button>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => onPdfUpload(e.target.files?.[0])}
        />

        {pdfState.status === "loading" && (
          <div className="mt-3 rounded-2xl bg-violet-50 dark:bg-violet-950 px-4 py-4 text-center text-sm font-black text-violet-800 dark:text-violet-300 animate-pulse">
            מעבד את ה-PDF...
          </div>
        )}

        {pdfState.status === "error" && (
          <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700">
            {pdfState.message}
            <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 block text-sm font-black text-red-800 underline">נסה שנית</button>
          </div>
        )}

        {pdfState.status === "confirm" && pdfState.fields && (
          <div className="mt-3 rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950 p-4">
            <p className="text-sm font-black text-violet-900 dark:text-violet-200">{pdfState.message}</p>
            <p className="mt-1 text-xs font-semibold text-violet-700 dark:text-violet-300">בדקו את הנתונים לפני אישור — ערכים שגויים ישפיעו על התוצאה.</p>
            <ul className="mt-3 space-y-1 text-sm font-bold text-slate-800 dark:text-slate-200">
              {pdfState.fields.balance != null && <li>יתרה לסילוק: <span className="text-violet-900">{formatILS(pdfState.fields.balance)}</span></li>}
              {pdfState.fields.currentPayment != null && <li>החזר חודשי: <span className="text-violet-900">{formatILS(pdfState.fields.currentPayment)}</span></li>}
              {pdfState.fields.remainingYears != null && <li>שנים שנותרו: <span className="text-violet-900">{pdfState.fields.remainingYears}</span></li>}
              {pdfState.fields.currentRate != null && <li>ריבית קיימת: <span className="text-violet-900">{pdfState.fields.currentRate}%</span></li>}
              {pdfState.fields.refinanceCost != null && <li>עלות מחזור: <span className="text-violet-900">{formatILS(pdfState.fields.refinanceCost)}</span></li>}
            </ul>
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={onPdfApply} className="flex-1 rounded-full bg-violet-700 px-4 py-2 text-sm font-black text-white transition hover:bg-violet-800">
                אשר ומלא אוטומטית
              </button>
              <button type="button" onClick={() => onPdfCancel()} className="rounded-full border border-slate-200 dark:border-slate-800 px-4 py-2 text-sm font-black text-slate-700 dark:text-slate-300 transition hover:bg-slate-50">
                ביטול
              </button>
            </div>
          </div>
        )}

        {pdfState.status === "done" && (
          <div className="mt-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm font-bold text-emerald-800 dark:text-emerald-300">
            הנתונים מה-PDF מולאו בטופס. בדקו ועדכנו לפי הצורך.
          </div>
        )}
      </div>

      <form className="rounded-[34px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyField label="יתרת משכנתא לסילוק" value={data.balance} onChange={(value) => update("balance", value)} helper="הסכום שנשאר להחזיר לפי הדוח או האפליקציה." />
          <MoneyField label="החזר חודשי נוכחי" value={data.currentPayment} onChange={(value) => update("currentPayment", value)} helper="אם ריק, נחושב לפי יתרה, ריבית ותקופה." />
          <RateField label="ריבית קיימת ממוצעת" value={data.currentRate} onChange={(value) => update("currentRate", value)} helper="בדרך כלל 3%–7%. ניתן למצוא בדוח הבנק." />
          <NumberField label="שנים שנותרו" value={data.remainingYears} onChange={(value) => update("remainingYears", value)} />
          <RateField label="ריבית חדשה לבדיקה" value={data.newRate} onChange={(value) => update("newRate", value)} helper="ריבית משוערת שניתן לקבל כיום. בדקו מול הבנק." />
          <MoneyField label="עלות מחזור משוערת" value={data.refinanceCost} onChange={(value) => update("refinanceCost", value)} helper="כולל עמלת פירעון מוקדם, שמאות, עו״ד ודמי פתיחת תיק." />
          <MoneyField label="הכנסה נטו" value={data.income} onChange={(value) => update("income", value)} />
          <MoneyField label="הוצאות חודשיות" value={data.expenses} onChange={(value) => update("expenses", value)} helper="שכירות, מזון, ביטוחים וכד׳ — לא כולל הלוואות." />
          <MoneyField label="הלוואות חודשיות" value={data.loans} onChange={(value) => update("loans", value)} helper="סך החזרי הלוואות קיימות (לא כולל המשכנתא)." />
        </div>
        {warnings.length > 0 && (
          <div className="mt-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
            {warnings.map((w) => (
              <p key={w} className="text-sm font-bold text-amber-700 dark:text-amber-300 leading-6">⚠ {w}</p>
            ))}
          </div>
        )}
        {hasAnyData && (
          <button type="button" onClick={onReset} className="mt-4 w-full rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-black text-slate-600 dark:text-slate-400 transition hover:bg-slate-50 dark:hover:bg-slate-800">
            נקה הכל והתחל מחדש
          </button>
        )}
      </form>
    </div>
  );
}

function PaymentChart({ current, newPay, active }) {
  const max = Math.max(current, newPay, 1);
  const currentPct = active ? Math.round((current / max) * 100) : 0;
  const newPct = active ? Math.round((newPay / max) * 100) : 0;
  return (
    <div className="mt-6 rounded-3xl bg-white/10 p-5 ring-1 ring-white/10">
      <p className="text-sm font-black text-violet-100">השוואת החזרים</p>
      <div className="mt-4 space-y-3">
        <div>
          <div className="flex justify-between text-xs font-bold text-violet-200 mb-1"><span>החזר נוכחי</span><span>{active ? formatILS(current) : "--"}</span></div>
          <div className="h-4 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-300 transition-all duration-500" style={{ width: `${currentPct}%` }} /></div>
        </div>
        <div>
          <div className="flex justify-between text-xs font-bold text-violet-200 mb-1"><span>החזר חדש</span><span>{active ? formatILS(newPay) : "--"}</span></div>
          <div className="h-4 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${newPct}%` }} /></div>
        </div>
      </div>
    </div>
  );
}

function ResultPanel({ result, onShareWhatsApp, onDownloadPdf }) {
  return (
    <aside aria-live="polite" aria-atomic="true" className="rounded-[34px] border border-violet-100 bg-gradient-to-br from-violet-700 to-violet-950 p-6 text-white shadow-[0_24px_70px_rgba(76,29,149,0.28)] sm:p-8">
      <p className="text-sm font-black text-violet-100">תוצאה בזמן אמת</p>
      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black">ציון כדאיות למחזור</h3>
          <p className="mt-2 text-violet-100">{result.recommendation}</p>
        </div>
        <span className="number-display text-5xl font-black">{result.hasRequiredInputs ? result.score : "--"}</span>
      </div>
      <div className="mt-7 h-3 overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${result.score}%` }} />
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <DarkMetric label="חיסכון חודשי" value={result.hasRequiredInputs ? formatILS(result.monthlySavings) : "--"} />
        <DarkMetric label="חיסכון נטו" value={result.hasRequiredInputs ? formatILS(result.netSavings) : "--"} />
        <DarkMetric label="החזר חדש" value={result.hasRequiredInputs ? formatILS(result.newPayment) : "--"} />
        <DarkMetric label="רמת סיכון" value={result.risk} />
      </div>
      <PaymentChart current={result.currentPayment} newPay={result.newPayment} active={result.hasRequiredInputs} />
      <div className="mt-6 rounded-3xl bg-white/10 p-5 ring-1 ring-white/10">
        <p className="text-sm font-black text-violet-100">הסבר</p>
        <p className="mt-2 leading-7 text-violet-50">{result.recommendationText}</p>
      </div>
      <a href="#lead" className="mt-6 block rounded-full bg-white px-6 py-4 text-center text-base font-black text-violet-800 shadow-lg transition hover:bg-violet-50">
        בדיקה עם יועץ
      </a>
      {result.hasRequiredInputs && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" onClick={onShareWhatsApp} className="rounded-full bg-white/15 px-4 py-3 text-sm font-black text-white ring-1 ring-white/10 transition hover:bg-white/25">
            שתף בוואטסאפ
          </button>
          <button type="button" onClick={onDownloadPdf} className="rounded-full bg-white/15 px-4 py-3 text-sm font-black text-white ring-1 ring-white/10 transition hover:bg-white/25">
            הורד PDF
          </button>
        </div>
      )}
    </aside>
  );
}

const CONTACT_TIME_OPTIONS = [
  { value: "", label: "מתי נוח לדבר?" },
  { value: "morning", label: "בוקר (08:00–12:00)" },
  { value: "afternoon", label: "צהריים (12:00–16:00)" },
  { value: "evening", label: "אחה״צ-ערב (16:00–20:00)" },
  { value: "anytime", label: "כל שעה" },
];

function AdvisorCta({ result, lead, setLead, submitLead, leadLoading, leadSent, leadError, successRef, consent, setConsent }) {
  return (
    <section id="lead" className="mt-10 grid items-stretch gap-6 rounded-[34px] border border-violet-100 dark:border-slate-800 bg-gradient-to-br from-violet-50 to-white dark:from-slate-900 dark:to-slate-900 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] lg:grid-cols-2">
      <div>
        <span className="inline-flex rounded-full bg-white dark:bg-slate-800 px-4 py-2 text-sm font-black text-violet-800 dark:text-violet-300 shadow-sm">בדיקה ראשונית</span>
        <h2 className="mt-5 text-3xl font-black leading-tight text-slate-950 dark:text-white">קבלו בדיקת מחזור ראשונית</h2>
        <p className="mt-4 leading-8 text-slate-600 dark:text-slate-400">
          מלאו את פרטי המשכנתא הקיימת ונציג כיוון ראשוני. אם יש פוטנציאל, ניתן יהיה להמשיך לבדיקה מקצועית.
        </p>
        <ul className="mt-5 space-y-3 font-bold text-slate-700 dark:text-slate-300">
          <li>• בדיקת הנתונים מול מצב המשכנתא הקיים</li>
          <li>• זיהוי נקודות חיסכון אפשריות</li>
          <li>• בדיקת נקודת איזון ועלויות מחזור</li>
          <li>• בחינת תמהיל חלופי מול ריביות בפועל</li>
        </ul>
        <p className="mt-6 text-xs font-bold text-slate-400 dark:text-slate-500">אומדן ראשוני בלבד, לא אישור בנקאי ולא ייעוץ אישי.</p>
      </div>

      <form onSubmit={submitLead} aria-busy={leadLoading ? "true" : "false"} className="rounded-[28px] bg-white dark:bg-slate-900 p-5 shadow-sm">
        {/* Classification chip — read-only, confirms lead type to user */}
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
          <span className="text-[11px] font-black text-blue-500 uppercase tracking-wider">סוג הבדיקה</span>
          <span className="text-sm font-black text-blue-900 dark:text-blue-200">🔄 מחזור משכנתא</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="שם מלא" value={lead.name} onChange={(value) => setLead({ ...lead, name: value })} autoComplete="name" />
          <TextField label="טלפון" value={lead.phone} onChange={(value) => setLead({ ...lead, phone: value })} placeholder="05X-XXXXXXX" autoComplete="tel" />
          <TextField label="עיר הנכס" value={lead.city} onChange={(value) => setLead({ ...lead, city: value })} autoComplete="address-level2" />
          <MoneyField
            label="יתרת משכנתא נוכחית"
            value={lead.mortgageAmount || (result.balance ? String(Math.round(result.balance)) : "")}
            onChange={(value) => setLead({ ...lead, mortgageAmount: value })}
          />
          <MoneyField
            label="הכנסה חודשית נטו"
            value={lead.income}
            onChange={(value) => setLead({ ...lead, income: value })}
          />
          <MoneyField
            label="הלוואות חודשיות"
            value={lead.loans}
            onChange={(value) => setLead({ ...lead, loans: value })}
          />
          <div className="sm:col-span-2">
            <label className="block">
              <span className="text-sm font-black text-slate-700 dark:text-slate-300">מתי נוח לדבר?</span>
              <select
                value={lead.requestedContactTime}
                onChange={(e) => setLead({ ...lead, requestedContactTime: e.target.value })}
                className="mt-2 h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 text-base font-bold text-slate-950 dark:text-white outline-none transition focus:border-violet-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900"
              >
                {CONTACT_TIME_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {leadError && <p role="alert" className="mt-4 rounded-2xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm font-bold text-red-700 dark:text-red-300">{leadError}</p>}
        {leadSent && <p ref={successRef} role="status" className="mt-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-4 text-center text-sm font-black text-emerald-800 dark:text-emerald-300">הפנייה נשלחה בהצלחה. נחזור אליכם בהקדם.</p>}
        <label className="mt-4 flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-violet-600 shrink-0"
          />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-5">
            אני מסכים/ה לשיתוף הפרטים עם יועצי משכנתאות מורשים לצורך קבלת ייעוץ.{" "}
            <a href="/privacy" className="text-violet-600 hover:underline">מדיניות פרטיות</a>
          </span>
        </label>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 font-semibold">
          הפרטים שמסרתם עשויים להיות מועברים ליועץ משכנתאות עצמאי שיצור אתכם קשר.
        </p>
        <button type="submit" disabled={leadLoading || leadSent} className="mt-4 w-full rounded-full bg-violet-700 px-7 py-4 text-base font-black text-white shadow-[0_16px_40px_rgba(109,40,217,0.25)] transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-70">
          {leadLoading ? "שולח..." : leadSent ? "נשלח בהצלחה" : "שלחו לבדיקה ראשונית"}
        </button>
        <p className="mt-3 text-center text-xs font-bold text-slate-400 dark:text-slate-500">ללא התחייבות · הנתונים משמשים לאומדן ראשוני בלבד · אין מדובר באישור בנקאי</p>
      </form>
    </section>
  );
}

function MetricCard({ label, value, note }) {
  return (
    <article className="flex h-full flex-col justify-between rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div>
        <p className="text-sm font-black text-slate-500 dark:text-slate-400">{label}</p>
        <p className="number-display mt-3 text-3xl font-black text-slate-950 dark:text-white">{value}</p>
      </div>
      <p className="mt-4 leading-7 text-slate-600 dark:text-slate-400">{note}</p>
    </article>
  );
}

function ComparisonColumn({ title, rows, highlighted = false }) {
  return (
    <article className={`rounded-[30px] border p-6 shadow-sm ${highlighted ? "border-violet-200 dark:border-violet-800 bg-violet-50/70 dark:bg-violet-950/40" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"}`}>
      <h3 className="text-2xl font-black text-slate-950 dark:text-white">{title}</h3>
      <div className="mt-5 grid gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-900 px-4 py-3">
            <span className="font-bold text-slate-600 dark:text-slate-400">{label}</span>
            <strong className="number-display text-lg font-black text-slate-950 dark:text-white">{value}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function ScenarioCard({ scenario, active }) {
  const positive = scenario.monthlyChange > 0;
  return (
    <article className="flex h-full flex-col justify-between rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div>
        <h3 className="text-xl font-black text-slate-950 dark:text-white">{scenario.title}</h3>
        <p className="mt-2 leading-7 text-slate-600 dark:text-slate-400">{scenario.note}</p>
        <div className="mt-5 rounded-2xl bg-slate-50 dark:bg-slate-950 p-4">
          <p className="text-sm font-black text-slate-500 dark:text-slate-400">החזר בתרחיש</p>
          <p className="number-display mt-1 text-2xl font-black text-slate-950 dark:text-white">{active ? formatILS(scenario.payment) : "--"}</p>
          <p className={`mt-2 text-sm font-black ${positive ? "text-emerald-700" : "text-amber-700"}`}>
            שינוי חודשי: {active ? formatILS(scenario.monthlyChange) : "--"}
          </p>
          <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-400">סך ריבית משוער: {active ? formatILS(scenario.totalInterest) : "--"}</p>
        </div>
      </div>
      <p className="mt-4 rounded-2xl bg-violet-50 dark:bg-violet-950 px-4 py-3 text-sm font-bold text-violet-900 dark:text-violet-300">
        {active ? `${formatPct(scenario.rate)} ל-${scenario.years} שנים · ${scenario.riskExplanation}` : "ממתין לנתונים"}
      </p>
    </article>
  );
}

function InfoCard({ title, text }) {
  return (
    <article className="flex h-full flex-col justify-between rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <h3 className="text-xl font-black text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-3 leading-7 text-slate-600 dark:text-slate-400">{text}</p>
    </article>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="text-lg font-black text-slate-900 dark:text-slate-100">FINZO</p>
            <p className="mt-2 text-sm font-semibold leading-7 text-slate-500 dark:text-slate-400">בדיקת זכאות חכמה למשכנתא בישראל. אומדן ראשוני בלבד, לא אישור בנקאי ולא ייעוץ אישי.</p>
          </div>
          <div>
            <p className="text-sm font-black text-slate-700 dark:text-slate-300">ניווט</p>
            <nav className="mt-3 flex flex-col gap-2">
              <a href="/" className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-violet-700 transition">דף הבית</a>
              <a href="#calculator" className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-violet-700 transition">בדיקת מחזור</a>
              <a href="#faq" className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-violet-700 transition">שאלות נפוצות</a>
            </nav>
          </div>
          <div>
            <p className="text-sm font-black text-slate-700 dark:text-slate-300">מידע</p>
            <nav className="mt-3 flex flex-col gap-2">
              <a href="/privacy" className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-violet-700 transition">מדיניות פרטיות</a>
              <a href="/terms" className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-violet-700 transition">תנאי שימוש</a>
              <a href="/accessibility" className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-violet-700 transition">נגישות</a>
            </nav>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-6 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
          © {new Date().getFullYear()} FINZO. יש לוודא נתונים מול בנק או יועץ משכנתאות מורשה.
        </div>
      </div>
    </footer>
  );
}

function MoneyField({ label, value, onChange, helper }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700 dark:text-slate-300">{label}</span>
      <span className="relative mt-2 block">
        <input
          inputMode="numeric"
          value={displayNumber(value)}
          onChange={(event) => onChange(cleanNumber(event.target.value))}
          className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 pl-10 text-base font-black text-slate-950 dark:text-white outline-none transition focus:border-violet-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900"
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400 dark:text-slate-500">₪</span>
      </span>
      {helper && <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{helper}</span>}
    </label>
  );
}

function MobileStickyCta() {
  return (
    <div className="mobile-sticky-cta fixed inset-x-0 bottom-0 z-40 border-t border-violet-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-4 pt-3 shadow-[0_-16px_40px_rgba(15,23,42,0.10)] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-sm grid-cols-2 gap-3">
        <a
          href="#calculator"
          className="rounded-full bg-violet-700 px-4 py-3 text-center text-sm font-black text-white shadow-[0_12px_28px_rgba(109,40,217,0.28)]"
        >
          בדיקת מחזור
        </a>
        <a
          href="#lead"
          className="rounded-full border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950 px-4 py-3 text-center text-sm font-black text-violet-800 dark:text-violet-300"
        >
          חזרה מיועץ
        </a>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder = "", autoComplete }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700 dark:text-slate-300">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 text-base font-bold text-slate-950 dark:text-white outline-none transition focus:border-violet-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900"
      />
    </label>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700 dark:text-slate-300">{label}</span>
      <input
        type="number"
        min="1"
        max="30"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 text-base font-black text-slate-950 dark:text-white outline-none transition focus:border-violet-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900"
      />
    </label>
  );
}

function RateField({ label, value, onChange, helper }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700 dark:text-slate-300">{label}</span>
      <span className="relative mt-2 block">
        <input
          inputMode="decimal"
          value={String(value || "").replace(/[^\d.]/g, "")}
          onChange={(event) => onChange(cleanNumber(event.target.value, true))}
          className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 pl-10 text-base font-black text-slate-950 dark:text-white outline-none transition focus:border-violet-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900"
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400 dark:text-slate-500">%</span>
      </span>
      {helper && <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{helper}</span>}
    </label>
  );
}

function DarkMetric({ label, value }) {
  return (
    <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/10">
      <p className="text-xs font-black text-violet-100">{label}</p>
      <p className="number-display mt-2 text-xl font-black text-white">{value}</p>
    </div>
  );
}
