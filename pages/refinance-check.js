import Head from "next/head";
import { useMemo, useRef, useState } from "react";
import { ActionCard, MoneyInput } from "../components/Shared";
import { extractMortgageReport, readPdfText } from "../lib/extractMortgageReport";
import { cleanNumber, displayNumber, formatILS, formatPct, toNumber } from "../lib/format";
import { monthlyPayment } from "../lib/mortgage";

const showExtractionDebug = process.env.NODE_ENV !== "production";

const initialData = {
  balance: "",
  currentPayment: "",
  remainingYears: "",
  currentRate: "",
  newRate: "4.9",
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
  purchaseStatus: "refinance",
};

function displayDecimal(value) {
  return String(value || "").replace(/[^\d.]/g, "");
}

function formatMonths(months) {
  if (!months) return "לא מחושב כרגע";
  if (months < 12) return `${months} חודשים`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years} שנים ו-${rest} חודשים` : `${years} שנים`;
}

function formatILSExact(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "--";
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
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
  const disposableIncome = Math.max(0, income - expenses - loans);
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
      note: "בודק מה קורה אם מקצרים את התקופה. ההחזר החודשי עולה אבל סך הריבית יורד.",
      payment: hasRequiredInputs ? monthlyPayment(balance, newRate, shorterYears) : 0,
      rate: newRate,
      years: shorterYears,
    },
    {
      title: "ריבית ותקופה משולבים",
      note: "בודק שילוב של הורדת ריבית קלה עם קיצור תקופה מתון — עשוי לשפר גם חיסכון וגם גמישות.",
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
  score += monthlySavings > 800 ? 24 : monthlySavings > 350 ? 16 : monthlySavings > 100 ? 8 : 0;
  score += netSavings > 100000 ? 22 : netSavings > 40000 ? 14 : netSavings > 10000 ? 6 : 0;
  score += rateGap >= 1 ? 12 : rateGap >= 0.5 ? 7 : rateGap > 0 ? 3 : 0;
  score += breakEvenWithinTerm && breakEvenMonths <= 24 ? 10 : breakEvenWithinTerm ? 5 : 0;
  score -= totalObligationsRatio > 45 ? 12 : totalObligationsRatio > 35 ? 6 : 0;
  if (!isWorthwhile && !isBorderline) score = Math.min(score, 42);
  score = hasRequiredInputs ? clamp(Math.round(score)) : 0;

  const recommendation = !hasRequiredInputs
    ? "הזינו נתונים כדי לקבל אומדן"
    : isWorthwhile
      ? "נראה שיש פוטנציאל לבדיקה מקצועית"
      : isBorderline
        ? "הכדאיות אינה חד-משמעית"
        : "לפי הנתונים כרגע — המחזור כנראה לא משתלם";

  const recommendationText = !hasRequiredInputs
    ? "העלו דוח או הזינו ידנית יתרה, ריבית ותקופה שנותרה."
    : isWorthwhile
      ? "ייתכן שניתן לחסוך בהחזר או בריבית הכוללת, בכפוף לריביות בפועל ועלויות מחזור."
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
        ? "נקודת האיזון ארוכה מהתקופה שנותרה — כנראה לא משתלם"
        : refinanceCost === 0
          ? "ללא עלות מחזור שהוזנה"
          : `החיסכון מכסה את עלויות המחזור בתוך ${formatMonths(breakEvenMonths)}`;

  const risk = !hasRequiredInputs
    ? "ממתין לנתונים"
    : totalObligationsRatio > 45 || afterRefinance < 0
      ? "גבוהה"
      : totalObligationsRatio > 35
        ? "בינונית"
        : "נמוכה";

  const scoreTone = !hasRequiredInputs
    ? "from-mort-blue to-mort-emerald"
    : isWorthwhile
      ? "from-emerald-600 to-teal-600"
      : isBorderline
        ? "from-amber-500 to-orange-500"
        : "from-slate-600 to-slate-700";

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
    currentTotalPaid,
    newTotalPaid,
    currentInterestEstimate,
    newInterestEstimate,
    monthlyDifference,
    monthlySavings,
    totalInterestDifference,
    totalInterestSavings,
    netSavings,
    breakEvenMonths,
    breakEvenWithinTerm,
    isWorthwhile,
    isBorderline,
    totalObligationsRatio,
    disposableIncome,
    afterRefinance,
    score,
    scoreTone,
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
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [extractedReport, setExtractedReport] = useState(null);
  const [extractionConfirmed, setExtractionConfirmed] = useState(false);
  const [lead, setLead] = useState(initialLead);
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadSent, setLeadSent] = useState(false);
  const [leadError, setLeadError] = useState("");
  const fileInputRef = useRef(null);
  const manualInputRef = useRef(null);
  const result = useMemo(() => calculateRefinance(data), [data]);
  const upload = useMemo(() => ({
    status: pdfLoading
      ? "loading"
      : extractionConfirmed
        ? "confirmed"
        : extractedReport
          ? pdfError
            ? "partial"
            : "ready"
          : pdfError
            ? "error"
            : "idle",
    fileName: uploadedFileName,
    extracted: extractedReport,
    error: pdfError,
  }), [extractedReport, extractionConfirmed, pdfError, pdfLoading, uploadedFileName]);

  function update(key, value) {
    setData((current) => ({ ...current, [key]: value }));
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    setPdfLoading(true);
    setPdfError("");
    setExtractedReport(null);
    setExtractionConfirmed(false);
    try {
      const pdfData = await readPdfText(file);
      const extracted = extractMortgageReport(pdfData);
      setExtractedReport(extracted);
      if (extracted.missingFields.length) {
        setPdfError("לא הצלחנו לזהות את כל הנתונים. אפשר להשלים ידנית ולהמשיך.");
      }
      if (!extracted.payoffBalance && !extracted.balance && !extracted.currentPayment && !extracted.currentRate) {
        setPdfError("לא הצלחנו לקרוא את כל הנתונים מהקובץ. אפשר להזין ידנית את החסרים ולהמשיך בבדיקה.");
      }
    } catch {
      setExtractedReport(null);
      setPdfError("לא הצלחנו לקרוא את כל הנתונים מהקובץ. אפשר להזין ידנית את החסרים ולהמשיך בבדיקה.");
    } finally {
      setPdfLoading(false);
    }
  }

  function confirmExtracted() {
    if (!extractedReport) return;
    if (!extractedReport.payoffBalance) {
      setPdfError("לא זוהתה יתרה לסילוק. אפשר להשלים ידנית.");
      manualInputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setData((current) => ({
      ...current,
      balance: String(extractedReport.payoffBalance),
      currentPayment: extractedReport.currentPayment ? String(extractedReport.currentPayment) : current.currentPayment,
      remainingYears: extractedReport.remainingYears ? String(extractedReport.remainingYears) : current.remainingYears,
      currentRate: extractedReport.currentRate ? String(extractedReport.currentRate) : current.currentRate,
      refinanceCost: extractedReport.refinanceCost ? String(extractedReport.refinanceCost) : current.refinanceCost,
    }));
    setExtractionConfirmed(true);
    window.requestAnimationFrame(() => {
      document.getElementById("summary")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function submitLead(event) {
    event.preventDefault();
    if (leadLoading || leadSent) return;
    const phone = cleanNumber(lead.phone);
    if (!lead.name.trim() || phone.length < 9) {
      setLeadError("יש להזין שם וטלפון תקין.");
      return;
    }

    const record = {
      ...lead,
      phone,
      mortgageAmount: cleanNumber(lead.mortgageAmount) || result.balance,
      purchaseStatus: "refinance",
      source: "refinance-check",
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
      if (!response.ok) throw new Error("Lead request failed");
      const apiResult = await response.json().catch(() => null);
      if (!apiResult?.ok) throw new Error("Lead request was not confirmed");
      const saved = JSON.parse(localStorage.getItem("mortgai2_leads") || "[]");
      localStorage.setItem("mortgai2_leads", JSON.stringify([record, ...saved]));
      setLeadSent(true);
    } catch {
      setLeadSent(false);
      setLeadError("הפנייה לא נשלחה. נסה שוב או צור קשר ישירות.");
    } finally {
      setLeadLoading(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen px-4 py-5 text-mort-text sm:px-6 lg:px-8">
      <Head>
        <title>בדיקת מחזור משכנתא | בדיקת זכאות למשכנתא</title>
        <meta name="description" content="בדיקה ראשונית למחזור משכנתא: העלאת דוח או הזנת נתונים ידנית לקבלת אומדן חיסכון חודשי, חיסכון ריבית, נקודת איזון וכדאיות מחזור." />
        <meta property="og:title" content="בדיקת כדאיות מחזור משכנתא | בדיקת זכאות למשכנתא" />
        <meta name="robots" content="index, follow" />
      </Head>

      <div className="mx-auto w-full max-w-6xl">
        <Header />

        <section id="top" className="py-16 text-center sm:py-24">
          <span className="pill border-emerald-200 bg-emerald-50 text-emerald-800">מחזור משכנתא</span>
          <h1 className="mx-auto mt-6 max-w-4xl text-[40px] font-black leading-[1.02] tracking-normal text-mort-ink sm:text-6xl lg:text-7xl">
            בדיקת כדאיות מחזור משכנתא — לפני שממחזרים
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg font-bold leading-8 text-mort-muted">
            העלו דוח משכנתא או הזינו נתונים ידנית, וקבלו אומדן ראשוני: חיסכון חודשי, חיסכון ריבית, נקודת איזון והאם המחזור באמת משתלם.
          </p>
          <a className="mt-9 inline-flex rounded-2xl bg-gradient-to-br from-mort-emerald to-mort-blue px-8 py-4 text-lg font-black text-white shadow-glow transition hover:-translate-y-0.5" href="#inputs">
            בדוק כדאיות מחזור
          </a>
          <p className="mx-auto mt-5 max-w-3xl text-sm font-bold leading-7 text-mort-muted">
            הסימולציה אינה אישור בנקאי. היא נועדה לעזור להבין האם שווה להתקדם לבדיקה מקצועית.
          </p>
        </section>

        <SectionIntro
          id="inputs"
          label="שלב 1 · העלאת נתונים"
          title="מעלים דוח או מזינים ידנית"
          text="אפשר להתחיל מדוח יתרות לסילוק מהבנק, או למלא את הנתונים המרכזיים ידנית. הנתונים שחולצו מהדוח מוצגים לאישור לפני החישוב."
        />

        <section className="grid gap-5 lg:grid-cols-2">
          <UploadCard upload={upload} fileInputRef={fileInputRef} onUpload={handleUpload} />
          <ManualInputCard data={data} update={update} manualInputRef={manualInputRef} />
        </section>

        {upload.status !== "idle" && (
          <ExtractedReportCard upload={upload} onConfirm={confirmExtracted} onEdit={() => manualInputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} />
        )}

        {extractedReport && <DetectedTracksSection tracks={extractedReport.tracks || []} />}

        <SectionIntro
          id="summary"
          label="שלב 2 · ניתוח כדאיות"
          title="תוצאת המחזור לפי הנתונים שהוזנו"
          text="התוצאה מציגה אומדן בלבד: האם יש פוטנציאל לחיסכון, מה נקודת האיזון, ומה הסיכון המרכזי לפני שמתקדמים."
        />

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <ResultSummary result={result} />
          <ResultBars result={result} />
        </section>

        <AdvisorCta result={result} lead={lead} setLead={setLead} submitLead={submitLead} leadLoading={leadLoading} leadSent={leadSent} leadError={leadError} />

        <SectionIntro
          id="comparison"
          label="שלב 3 · לפני ואחרי"
          title="לפני ואחרי המחזור"
          text="השוואה פשוטה בין המצב הנוכחי לבין תרחיש המחזור שהוזן. אם אין חיסכון נטו, העמוד לא יציג המלצה חיובית."
        />

        <BeforeAfterComparison result={result} />

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <FormulaExplanation result={result} />
          <BreakEvenExplanation result={result} />
        </section>

        <SectionIntro
          id="scenarios"
          label="שלב 4 · אפשרויות שיפור"
          title="דרכים אפשריות להקטין החזר או לשפר כדאיות"
          text="התרחישים אינם הצעה בנקאית. הם עוזרים להבין אילו מנופים כדאי לבדוק מול יועץ או בנק."
        />

        <section className="mort-two-card-grid">
          {result.scenarios.map((scenario) => (
            <ScenarioCard key={scenario.title} scenario={scenario} active={result.hasRequiredInputs} />
          ))}
        </section>

        <section className="mt-5 mort-two-card-grid">
          <ActionCard title="להאריך שנים" text="יכול להוריד החזר חודשי, אבל חשוב לבדוק כמה ריבית נוספת משלמים." />
          <ActionCard title="להוריד ריבית" text="הדרך החזקה ביותר: גם החזר חודשי נמוך וגם פחות ריבית מצטברת." />
          <ActionCard title="לשנות תמהיל" text="פיזור נכון בין מסלולים עשוי לשפר יציבות, גמישות וסיכון עתידי." />
          <ActionCard title="לבדוק קנסות ועלויות" text="עמלות פירעון מוקדם משפיעות על נקודת האיזון ועל הכדאיות." />
        </section>

        <AdvisorCta result={result} lead={lead} setLead={setLead} submitLead={submitLead} leadLoading={leadLoading} leadSent={leadSent} leadError={leadError} compact />

        <FaqAndDisclaimer />

        <footer className="mt-10 border-t border-slate-200 py-8 text-center">
          <p className="text-sm font-bold leading-7 text-mort-muted">
            בדיקת מחזור משכנתא היא כלי סימולציה ראשוני בלבד. הנתונים אינם מהווים ייעוץ משכנתאות, אישור בנקאי או הצעת מחיר מחייבת.
          </p>
          <div className="mt-3 flex justify-center gap-4 text-sm font-black text-mort-emerald">
            <a href="/" className="hover:underline">בדיקת זכאות למשכנתא</a>
            <span className="text-slate-300">|</span>
            <a href="#top" className="hover:underline">חזרה למעלה</a>
          </div>
        </footer>
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="flex flex-col gap-4 border-b border-slate-200/70 bg-white/80 py-5 md:flex-row md:items-center md:justify-between">
      <a href="/" className="block" aria-label="דף הבית">
        <strong className="block text-2xl font-black text-mort-ink">בדיקת זכאות למשכנתא</strong>
        <span className="text-sm font-bold text-mort-muted">תשובה פשוטה לפני שפונים לבנק</span>
      </a>
      <nav className="flex flex-wrap gap-2 text-sm font-black text-mort-muted" aria-label="ניווט ראשי">
        <a className="rounded-full border border-slate-200 bg-white px-4 py-2 transition hover:text-mort-ink" href="#inputs">העלאת דוח</a>
        <a className="rounded-full border border-slate-200 bg-white px-4 py-2 transition hover:text-mort-ink" href="#summary">תוצאה</a>
        <a className="rounded-full border border-slate-200 bg-white px-4 py-2 transition hover:text-mort-ink" href="#comparison">השוואה</a>
        <a className="rounded-full bg-mort-ink px-4 py-2 text-white shadow-soft transition hover:opacity-90" href="/">מחשבון רכישה</a>
      </nav>
    </header>
  );
}

function SectionIntro({ id, label, title, text }) {
  return (
    <section id={id} className="scroll-mt-24 pt-14">
      <span className="pill border-blue-100 bg-blue-50 text-mort-blue">{label}</span>
      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
        <div>
          <h2 className="text-3xl font-black leading-tight text-mort-ink sm:text-4xl">{title}</h2>
          <p className="mt-2 max-w-3xl font-bold leading-7 text-mort-muted">{text}</p>
        </div>
        <div className="h-1 rounded-full bg-gradient-to-l from-mort-emerald via-mort-blue to-transparent" />
      </div>
    </section>
  );
}

function UploadCard({ upload, fileInputRef, onUpload }) {
  const hasFile = Boolean(upload.fileName);
  return (
    <article className="glass-card p-6 sm:p-8">
      <span className="pill border-emerald-200 bg-emerald-50 text-emerald-800">דוח משכנתא PDF</span>
      <h3 className="mt-4 text-2xl font-black text-mort-ink">העלאת דוח מהבנק</h3>
      <p className="mt-2 font-bold leading-7 text-mort-muted">
        העלו דוח יתרות לסילוק / דוח משכנתא. ננסה לזהות יתרה, החזר, תקופה, ריבית ועלויות מחזור.
      </p>
      <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={onUpload} />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="mt-6 flex min-h-40 w-full flex-col items-center justify-center rounded-[26px] border-2 border-dashed border-emerald-300 bg-white/75 p-6 text-center shadow-soft transition hover:-translate-y-0.5"
      >
        <strong className="text-xl font-black text-mort-ink">{hasFile ? upload.fileName : "בחרו קובץ PDF להעלאה"}</strong>
        <span className="mt-2 font-bold text-mort-muted">
          {upload.status === "loading" ? "קורא את הדוח..." : "הקובץ נשאר בדפדפן לצורך חילוץ ראשוני של נתונים."}
        </span>
      </button>
      {upload.error && <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-black leading-6 text-amber-900">{upload.error}</p>}
      <div className="mt-5 grid gap-3 rounded-[22px] border border-slate-200 bg-white/70 p-4">
        {["נכנסים לאפליקציה או לאתר הבנק", "עוברים לאזור המשכנתאות", "מורידים דוח יתרות לסילוק / דוח הלוואות", "מעלים כאן ומאשרים את הנתונים שחולצו"].map((item, index) => (
          <span key={item} className="flex gap-3 text-sm font-black leading-6 text-mort-muted">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-mort-ink text-xs text-white">{index + 1}</span>
            {item}
          </span>
        ))}
      </div>
    </article>
  );
}

function ManualInputCard({ data, update, manualInputRef }) {
  return (
    <article id="manual-inputs" ref={manualInputRef} className="glass-card scroll-mt-24 p-6 sm:p-8">
      <span className="pill border-blue-100 bg-blue-50 text-mort-blue">הזנה ידנית</span>
      <h3 className="mt-4 text-2xl font-black text-mort-ink">נתוני המשכנתא הקיימת</h3>
      <p className="mt-2 font-bold leading-7 text-mort-muted">
        שלושת הנתונים החיוניים: יתרה לסילוק, ריבית קיימת ושנים שנותרו. אם ההחזר החודשי חסר, נחושב אותו לפי נוסחת שפיצר.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <MoneyInput required label="יתרת משכנתא לסילוק" helper="הסכום שנשאר להחזיר לפי דוח יתרות לסילוק." value={data.balance} onChange={(v) => update("balance", v)} />
        <MoneyInput label="החזר חודשי נוכחי" helper="אם לא מוזן, נחושב משוער לפי היתרה, הריבית והתקופה." value={data.currentPayment} onChange={(v) => update("currentPayment", v)} />
        <RateInput required label="ריבית קיימת ממוצעת" helper="הריבית הממוצעת במסלולים הקיימים." value={data.currentRate} onChange={(v) => update("currentRate", v)} />
        <NumberInput required label="שנים שנותרו" helper="מספר השנים שנותרו עד סיום המשכנתא." value={data.remainingYears} onChange={(v) => update("remainingYears", v)} />
        <RateInput label="ריבית חדשה לבדיקה" helper="הריבית שתרצו לבדוק בתרחיש המחזור." value={data.newRate} onChange={(v) => update("newRate", v)} />
        <MoneyInput label="עלות מחזור משוערת" helper="שכר טרחה, פתיחת תיק, שמאות ועמלות." value={data.refinanceCost} onChange={(v) => update("refinanceCost", v)} />
      </div>
      <div className="mt-5 rounded-[22px] border border-slate-200 bg-white/70 p-4">
        <p className="mb-3 text-xs font-black uppercase tracking-wide text-mort-muted">אופציונלי · יחס החזר לאחר מחזור</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <MoneyInput label="הכנסה נטו" value={data.income} onChange={(v) => update("income", v)} />
          <MoneyInput label="הוצאות קבועות" value={data.expenses} onChange={(v) => update("expenses", v)} />
          <MoneyInput label="הלוואות קיימות" value={data.loans} onChange={(v) => update("loans", v)} />
        </div>
      </div>
    </article>
  );
}

function ExtractedReportCard({ upload, onConfirm, onEdit }) {
  const extracted = upload.extracted;
  return (
    <section className="mt-5 glass-card p-6 sm:p-8">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
        <div>
          <span className="pill border-amber-200 bg-amber-50 text-mort-gold">אישור נתוני הדוח</span>
          <h3 className="mt-4 text-2xl font-black text-mort-ink">
            {extracted ? "מצאנו את הנתונים הבאים בדוח" : "נתונים שחולצו אוטומטית יופיעו כאן"}
          </h3>
          <p className="mt-2 font-bold leading-7 text-mort-muted">
            נתונים שחולצו אוטומטית — יש לאשר לפני חישוב. אם משהו חסר או לא מדויק, אפשר לערוך ידנית ולהמשיך בבדיקה.
          </p>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-white/75 p-4 text-sm font-black leading-6 text-mort-muted">
          {upload.status === "loading" ? "קורא את הדוח..." : upload.fileName ? `קובץ: ${upload.fileName}` : "עדיין לא הועלה קובץ"}
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-white/80">
        <ExtractedRow label="יתרה לסילוק לפי הדוח" value={extracted?.payoffBalance ? formatILSExact(extracted.payoffBalance) : extracted?.balance ? formatILSExact(extracted.balance) : "--"} />
        <ExtractedRow label="קרן / יתרת קרן אם קיימת" value={extracted?.principalBalance ? formatILSExact(extracted.principalBalance) : "--"} />
        <ExtractedRow label="החזר חודשי נוכחי" value={extracted?.currentPayment ? formatILSExact(extracted.currentPayment) : "--"} />
        <ExtractedRow label="תקופה שנותרה" value={extracted?.remainingYears ? `${extracted.remainingYears} שנים` : "--"} />
        <ExtractedRow label="ריבית כוללת חזויה" value={extracted?.currentRate ? formatPct(extracted.currentRate, 4) : "--"} />
        <ExtractedRow label="מסלולים שזוהו" value={extracted?.tracks?.length ? `${extracted.tracks.length} מסלולים זוהו חלקית` : "--"} />
        <ExtractedRow label="עמלת פירעון מוקדם / עלויות מחזור אם זוהו" value={extracted?.refinanceCost ? formatILSExact(extracted.refinanceCost) : "--"} />
        <ExtractedRow label="רמת ביטחון בזיהוי" value={confidenceLabel(extracted?.confidence)} />
        <ExtractedRow label="נתונים חסרים" value={extracted?.missingFields?.length ? extracted.missingFields.join(", ") : extracted ? "לא זוהו חסרים מרכזיים" : "--"} warn={Boolean(extracted?.missingFields?.length)} />
      </div>

      {showExtractionDebug && extracted && <PdfExtractionDebug extracted={extracted} />}

      {showExtractionDebug && extracted?.rawTextPreview && (
        <details className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-4">
          <summary className="cursor-pointer font-black text-mort-ink">תצוגה מקדימה של טקסט שחולץ</summary>
          <p className="mt-3 text-xs font-bold leading-6 text-mort-muted">{extracted.rawTextPreview}</p>
        </details>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button type="button" disabled={!extracted} onClick={onConfirm} className="rounded-2xl bg-mort-ink px-5 py-3 font-black text-white shadow-soft transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          אשר והמשך לחישוב
        </button>
        <button type="button" onClick={onEdit} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-black text-mort-ink shadow-soft transition hover:-translate-y-0.5">
          ערוך ידנית
        </button>
      </div>
    </section>
  );
}

function confidenceLabel(confidence) {
  if (confidence === "high") return "גבוהה";
  if (confidence === "medium") return "בינונית";
  if (confidence === "low") return "נמוכה";
  return "--";
}

function DetectedTracksSection({ tracks }) {
  return (
    <section className="mt-5 glass-card p-6 sm:p-8">
      <span className="pill border-blue-100 bg-blue-50 text-mort-blue">מסלולים שזוהו בדוח</span>
      <h3 className="mt-4 text-2xl font-black text-mort-ink">מבנה המשכנתא לפי הדוח</h3>
      <p className="mt-2 font-bold leading-7 text-mort-muted">
        המערכת זיהתה את מבנה המשכנתא מתוך הדוח. הנתונים מוצגים לבדיקה בלבד, ויש לוודא אותם מול הדוח המקורי.
      </p>

      {tracks.length ? (
        <div className="mt-5 mort-two-card-grid">
          {tracks.map((track, index) => (
            <article key={`${track.loanNumber || "track"}-${index}`} className="equal-card rounded-[22px] border border-slate-200 bg-white/80 p-5 shadow-soft">
              <div>
                <strong dir="ltr" className="block text-lg font-black text-mort-ink">{track.loanNumber || `Track ${index + 1}`}</strong>
                <div className="mt-4 grid gap-2 text-sm font-bold text-mort-muted">
                  <TrackField label="סוג מסלול" value={track.rateType || "--"} />
                  <TrackField label="יתרה / סכום אם זוהה" value={track.balance ? formatILSExact(track.balance) : track.originalAmount ? formatILSExact(track.originalAmount) : "--"} />
                  <TrackField label="ריבית" value={track.rate ? formatPct(track.rate, 3) : "--"} />
                  <TrackField label="הצמדה" value={track.indexation || "--"} />
                  <TrackField label="תאריך סיום" value={track.finalPaymentDate || "--"} />
                  <TrackField label="שיטת החזר" value={track.repaymentMethod || "--"} />
                </div>
              </div>
              <small className="mt-4 rounded-2xl bg-surface-low px-3 py-2 text-xs font-black text-mort-muted">זיהוי {confidenceLabel(track.confidence)}</small>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-black leading-7 text-amber-900">
          לא זוהו מסלולים בצורה מלאה. אפשר להמשיך לבדיקה לפי הסיכום הכללי ולהשלים ידנית.
        </p>
      )}
    </section>
  );
}

function TrackField({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white/75 px-3 py-2">
      <span>{label}</span>
      <strong className="text-mort-ink">{value}</strong>
    </div>
  );
}

function PdfExtractionDebug({ extracted }) {
  const candidates = extracted.candidatePayoffNumbers || [];
  const rejected = extracted.rejectedPayoffCandidates || [];

  return (
    <details className="mt-4 rounded-2xl border border-slate-300 bg-white/80 p-4">
      <summary className="cursor-pointer font-black text-mort-ink">Debug PDF Extraction</summary>
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <DebugRow label="payoffBalance" value={debugMoney(extracted.payoffBalance)} />
        <DebugRow label="balance" value={debugMoney(extracted.balance)} />
        <DebugRow label="principalBalance" value={debugMoney(extracted.principalBalance)} />
        <DebugRow label="currentPayment" value={debugMoney(extracted.currentPayment)} />
        <DebugRow label="currentRate" value={extracted.currentRate ? formatPct(extracted.currentRate, 4) : "--"} />
        <DebugRow label="refinanceCost" value={debugMoney(extracted.refinanceCost)} />
        <DebugRow label="extractionMethod" value={extracted.extractionMethod || "--"} />
        <DebugRow label="anchorName" value={extracted.anchorName || "--"} />
        <DebugRow label="anchorIndex" value={Number.isFinite(extracted.anchorIndex) ? extracted.anchorIndex : "--"} />
        <DebugRow label="detectedSummaryLine" value={<DebugPre value={extracted.detectedSummaryLine || "--"} />} />
        <DebugRow label="windowText" value={<DebugPre value={extracted.windowText || "--"} />} />
        <DebugRow label="candidatePayoffNumbers" value={<DebugPre value={JSON.stringify(candidates, null, 2)} />} />
        <DebugRow label="rejectedPayoffCandidates" value={<DebugPre value={JSON.stringify(rejected, null, 2)} />} />
        <DebugRow label="tracks" value={<DebugPre value={JSON.stringify(extracted.tracks || [], null, 2)} />} />
      </div>
      <p className="mt-3 text-xs font-bold leading-6 text-mort-muted">
        Temporary debug view: this shows exactly what the parser returned after PDF upload so production mapping issues can be diagnosed.
      </p>
    </details>
  );
}

function debugMoney(value) {
  return value ? formatILSExact(value) : "--";
}

function DebugRow({ label, value }) {
  return (
    <div className="grid gap-2 border-b border-slate-100 p-3 last:border-b-0 sm:grid-cols-[220px_minmax(0,1fr)]">
      <span dir="ltr" className="font-mono text-xs font-black text-slate-500">{label}</span>
      <strong className="min-w-0 break-words text-sm font-black text-mort-ink">{value}</strong>
    </div>
  );
}

function DebugPre({ value }) {
  return (
    <pre dir="ltr" className="max-h-52 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-left font-mono text-xs font-bold leading-5 text-slate-700">
      {value}
    </pre>
  );
}

function ExtractedRow({ label, value, warn = false }) {
  return (
    <div className={`grid gap-2 border-b border-slate-100 p-4 last:border-b-0 sm:grid-cols-[1fr_1.4fr] ${warn ? "bg-amber-50 text-amber-900" : ""}`}>
      <span className="font-black text-mort-muted">{label}</span>
      <strong className="font-black text-mort-ink">{value}</strong>
    </div>
  );
}

function ResultSummary({ result }) {
  return (
    <section className="glass-card p-6 sm:p-8">
      <div className={`rounded-[28px] bg-gradient-to-br ${result.scoreTone} p-6 text-white shadow-glow`}>
        <span className="text-sm font-black opacity-85">ציון כדאיות למחזור</span>
        <strong className="mt-2 block text-7xl font-black leading-none">{result.hasRequiredInputs ? result.score : "--"}</strong>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${result.score}%` }} />
        </div>
        <h3 className="mt-5 text-2xl font-black">{result.recommendation}</h3>
        <p className="mt-2 font-bold leading-7 text-white/85">{result.recommendationText}</p>
      </div>

      <div className="mt-5 mort-two-card-grid">
        <ResultCard label="חיסכון חודשי משוער" value={result.hasRequiredInputs ? formatILS(result.monthlySavings) : "--"} highlight={result.monthlySavings > 200} />
        <ResultCard label="חיסכון ריבית כולל משוער" value={result.hasRequiredInputs ? formatILS(result.totalInterestSavings) : "--"} highlight={result.totalInterestSavings > 10000} />
        <ResultCard label="חיסכון נטו לאחר עלויות" value={result.hasRequiredInputs ? formatILS(result.netSavings) : "--"} highlight={result.netSavings > 0} warn={result.hasRequiredInputs && result.netSavings <= 0} />
        <ResultCard label="נקודת איזון" value={result.hasRequiredInputs ? formatMonths(result.breakEvenMonths) : "--"} highlight={result.breakEvenWithinTerm && result.breakEvenMonths <= 24} warn={result.hasRequiredInputs && !result.breakEvenWithinTerm && result.monthlySavings > 0} />
      </div>
    </section>
  );
}

function ResultBars({ result }) {
  const monthlyPct = clamp((result.monthlySavings / 1500) * 100);
  const netPct = clamp((Math.max(0, result.netSavings) / 150000) * 100);
  const breakEvenPct = result.breakEvenMonths ? clamp(100 - (result.breakEvenMonths / Math.max(result.months, 1)) * 100) : 0;
  return (
    <section className="glass-card p-6 sm:p-8">
      <span className="pill border-blue-100 bg-blue-50 text-mort-blue">מה זה אומר?</span>
      <h3 className="mt-4 text-2xl font-black text-mort-ink">מדדי כדאיות מרכזיים</h3>
      <p className="mt-2 font-bold leading-7 text-mort-muted">
        המדדים מציגים אם יש חיסכון חודשי, אם נשאר חיסכון נטו אחרי עלויות, והאם נקודת האיזון מגיעה בזמן סביר.
      </p>
      <div className="mt-6 grid gap-4">
        <ProgressMetric label="חיסכון חודשי" value={result.hasRequiredInputs ? formatILS(result.monthlySavings) : "--"} pct={monthlyPct} good={result.monthlySavings > 0} />
        <ProgressMetric label="חיסכון נטו" value={result.hasRequiredInputs ? formatILS(result.netSavings) : "--"} pct={netPct} good={result.netSavings > 0} />
        <ProgressMetric label="נקודת איזון" value={result.hasRequiredInputs ? result.breakEvenNote : "--"} pct={breakEvenPct} good={result.breakEvenWithinTerm} />
        <ProgressMetric label="רמת כדאיות" value={result.hasRequiredInputs ? `${result.score}/100` : "--"} pct={result.score} good={result.isWorthwhile} />
      </div>
      {result.hasRequiredInputs && !result.isWorthwhile && (
        <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-black leading-6 text-amber-900">
          לפי הנתונים כרגע אין המלצה חיובית למחזור. כדאי לבדוק אם ריבית נמוכה יותר, עלויות נמוכות יותר או תמהיל אחר משנים את התמונה.
        </p>
      )}
    </section>
  );
}

function BeforeAfterComparison({ result }) {
  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <ComparisonColumn
        title="מצב נוכחי"
        tone="slate"
        rows={[
          ["החזר חודשי", result.hasRequiredInputs ? formatILS(result.currentPayment) : "--"],
          ["ריבית ממוצעת", result.hasRequiredInputs ? formatPct(result.currentRate) : "--"],
          ["יתרה", result.hasRequiredInputs ? formatILS(result.balance) : "--"],
          ["סך ריבית משוער", result.hasRequiredInputs ? formatILS(result.currentInterestEstimate) : "--"],
        ]}
      />
      <ComparisonColumn
        title="מצב חדש"
        tone="emerald"
        rows={[
          ["החזר חודשי חדש", result.hasRequiredInputs ? formatILS(result.newPayment) : "--"],
          ["ריבית חדשה", result.hasRequiredInputs ? formatPct(result.newRate) : "--"],
          ["חיסכון חודשי", result.hasRequiredInputs ? formatILS(result.monthlySavings) : "--"],
          ["חיסכון נטו לאחר עלויות", result.hasRequiredInputs ? formatILS(result.netSavings) : "--"],
        ]}
      />
    </section>
  );
}

function ComparisonColumn({ title, rows, tone }) {
  const toneClass = tone === "emerald" ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200 bg-white/80";
  return (
    <article className={`equal-card rounded-[28px] border p-6 shadow-soft ${toneClass}`}>
      <div>
        <h3 className="text-2xl font-black text-mort-ink">{title}</h3>
        <div className="mt-5 grid gap-3">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 rounded-2xl bg-white/75 p-4">
              <span className="font-black text-mort-muted">{label}</span>
              <strong className="number-display text-xl font-black text-mort-ink">{value}</strong>
            </div>
          ))}
        </div>
      </div>
      <span className="mt-4 rounded-2xl bg-white/80 px-3 py-2 text-xs font-black text-mort-muted">אומדן לפי הנתונים שהוזנו</span>
    </article>
  );
}

function FormulaExplanation({ result }) {
  return (
    <section className="glass-card p-6 sm:p-8">
      <span className="pill border-blue-100 bg-blue-50 text-mort-blue">הסבר חישוב</span>
      <h3 className="mt-4 text-2xl font-black text-mort-ink">איך ההחזר החודשי מחושב?</h3>
      <p className="mt-2 font-bold leading-7 text-mort-muted">
        אומדן לפי נוסחת שפיצר: יתרת הקרן, הריבית השנתית ומספר החודשים שנותרו. בפועל הבנק מחשב לפי מסלולים, הצמדות, עמלות וקנסות פירעון מוקדם.
      </p>
      <div className="mt-5 mort-two-card-grid">
        <MiniMetric label="קרן לחישוב" value={result.hasRequiredInputs ? formatILS(result.balance) : "--"} />
        <MiniMetric label="ריבית חודשית חדשה" value={result.hasRequiredInputs ? formatPct(result.newMonthlyRate * 100, 2) : "--"} />
        <MiniMetric label="מספר חודשים" value={result.hasRequiredInputs ? `${result.months}` : "--"} />
        <MiniMetric label="עלות מחזור" value={formatILS(result.refinanceCost)} />
      </div>
    </section>
  );
}

function BreakEvenExplanation({ result }) {
  return (
    <section className="glass-card p-6 sm:p-8">
      <span className="pill border-amber-200 bg-amber-50 text-mort-gold">נקודת איזון וסיכון</span>
      <h3 className="mt-4 text-2xl font-black text-mort-ink">מתי המחזור מתחיל להשתלם?</h3>
      <p className="mt-2 font-bold leading-7 text-mort-muted">
        נקודת איזון היא הזמן שבו החיסכון החודשי מכסה את עלויות המחזור. אם היא ארוכה מהתקופה שנותרה, בדרך כלל המחזור לא משתלם לפי הנתונים.
      </p>
      <div className="mt-5 rounded-[24px] border border-slate-200 bg-white/80 p-5">
        <strong className="number-display block text-3xl font-black text-mort-ink">{result.hasRequiredInputs ? formatMonths(result.breakEvenMonths) : "--"}</strong>
        <p className="mt-2 font-black leading-7 text-mort-muted">{result.breakEvenNote}</p>
      </div>
      <div className="mt-4 mort-two-card-grid">
        <MiniMetric label="יחס התחייבויות כולל מהכנסה" value={result.hasRequiredInputs ? formatPct(result.totalObligationsRatio) : "--"} />
        <MiniMetric label="רמת סיכון" value={result.risk} />
      </div>
    </section>
  );
}

function AdvisorCta({ result, lead, setLead, submitLead, leadLoading, leadSent, leadError, compact = false }) {
  const title = result.isWorthwhile
    ? "נראה שיש פוטנציאל — עכשיו צריך לבדוק איך מממשים אותו"
    : result.isBorderline
      ? "הכדאיות לא חד-משמעית — בדיקה מקצועית יכולה לעשות סדר"
      : "המחזור לא תמיד משתלם — אבל כדאי להבין למה";
  const bullets = [
    "בדיקת הדוח מול הנתונים שחולצו",
    "זיהוי מסלולים יקרים או מסוכנים",
    "בדיקת נקודת איזון ועלויות מחזור",
    "בחינת תמהיל חלופי מול ריביות בפועל",
  ];

  return (
    <section className={`mt-8 rounded-[28px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-7 shadow-luxury ${compact ? "lg:grid lg:grid-cols-[1fr_1fr] lg:gap-6" : ""}`}>
      <div>
        <span className="pill border-emerald-200 bg-white/85 text-emerald-800">בדיקה עם יועץ</span>
        <h2 className="mt-4 text-3xl font-black leading-tight text-mort-ink">{title}</h2>
        <p className="mt-3 font-bold leading-7 text-mort-muted">
          מחזור משכנתא יכול לחסוך כסף — אבל רק אם בודקים את כל התמונה: ריביות, עמלות, תקופה שנותרה, תמהיל ונקודת איזון. השאר פרטים ויועץ יחזור אליך לבדיקה ראשונית.
        </p>
        <div className="mt-4 grid gap-2 rounded-[22px] border border-emerald-200 bg-white/75 p-4">
          {bullets.map((item) => (
            <span key={item} className="flex items-center gap-2 text-sm font-black text-emerald-900">
              <span className="text-mort-emerald">✓</span>
              {item}
            </span>
          ))}
        </div>
      </div>

      <form onSubmit={submitLead} className="mt-6 grid gap-3 lg:mt-0" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <LeadInput label="שם מלא" value={lead.name} onChange={(v) => setLead({ ...lead, name: v })} placeholder="ישראל ישראלי" />
          <LeadInput label="טלפון" value={lead.phone} onChange={(v) => setLead({ ...lead, phone: v })} placeholder="05X-XXXXXXX" inputMode="tel" />
          <LeadInput label="עיר (אופציונלי)" value={lead.city} onChange={(v) => setLead({ ...lead, city: v })} placeholder="עיר מגורים" />
          <LeadInput label="סכום משכנתא" value={lead.mortgageAmount ? displayNumber(lead.mortgageAmount) : displayNumber(result.balance)} onChange={(v) => setLead({ ...lead, mortgageAmount: cleanNumber(v) })} placeholder="סכום משכנתא" inputMode="numeric" />
        </div>
        <button type="submit" disabled={leadLoading || leadSent} className="min-h-14 rounded-2xl bg-gradient-to-br from-mort-emerald to-mort-blue px-5 py-4 text-lg font-black text-white shadow-glow transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
          {leadLoading ? "שולח..." : leadSent ? "✓ נשלח בהצלחה" : "בדיקה ראשונית ללא התחייבות"}
        </button>
        <small className="block text-center font-bold leading-6 text-mort-muted">הפרטים נשמרים לצורך חזרה אליך בלבד.</small>
        {leadSent && <strong className="rounded-2xl bg-emerald-100 p-3 text-center text-emerald-800">הפנייה נשלחה בהצלחה.</strong>}
        {leadError && <strong className="rounded-2xl bg-red-100 p-3 text-center text-red-700">{leadError}</strong>}
        {result.hasRequiredInputs && (
          <p className="rounded-2xl border border-slate-200 bg-white/70 p-3 text-sm font-bold leading-6 text-mort-muted">
            תוצאת הסימולציה כרגע: {result.recommendation}. זו אינה המלצה סופית.
          </p>
        )}
      </form>
    </section>
  );
}

function FaqAndDisclaimer() {
  const items = [
    ["מתי מחזור משכנתא עשוי להשתלם?", "כאשר יש חיסכון חודשי או חיסכון ריבית משמעותי, ועלויות המחזור מוחזרות בתוך תקופה סבירה ביחס לשנים שנותרו."],
    ["למה צריך דוח יתרות לסילוק?", "הדוח מציג יתרה, מסלולים, ריביות, הצמדות וקנסות פירעון. בלי הנתונים האלה קשה לדעת אם המחזור באמת משתלם."],
    ["האם חיסכון חודשי מספיק כדי להחליט?", "לא. צריך לבדוק גם חיסכון נטו אחרי עלויות, סך ריבית לאורך התקופה ונקודת איזון."],
    ["האם זו הצעה בנקאית?", "לא. זו סימולציה ראשונית בלבד, ויש לוודא נתונים מול בנק או יועץ משכנתאות מורשה."],
  ];
  return (
    <section className="mt-10 glass-card p-6 sm:p-8">
      <span className="pill border-blue-100 bg-blue-50 text-mort-blue">שאלות נפוצות</span>
      <h2 className="mt-4 text-3xl font-black text-mort-ink">מה חשוב לדעת לפני מחזור?</h2>
      <div className="mt-6 mort-two-card-grid">
        {items.map(([title, text]) => (
          <article key={title} className="equal-card rounded-[22px] border border-slate-200 bg-white/75 p-5 shadow-soft">
            <div>
              <strong className="block text-lg font-black text-mort-ink">{title}</strong>
              <p className="mt-2 font-bold leading-7 text-mort-muted">{text}</p>
            </div>
            <span className="mt-4 rounded-2xl bg-surface-low px-3 py-2 text-xs font-black text-mort-muted">מידע כללי בלבד</span>
          </article>
        ))}
      </div>
      <p className="mt-5 rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm font-bold leading-7 text-mort-muted">
        החישוב הוא סימולציה ראשונית בלבד ואינו מהווה ייעוץ משכנתאות, המלצה פיננסית או אישור בנקאי.
      </p>
    </section>
  );
}

function ProgressMetric({ label, value, pct, good }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white/75 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-black text-mort-muted">{label}</span>
        <strong className={`text-sm font-black ${good ? "text-emerald-800" : "text-mort-ink"}`}>{value}</strong>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${good ? "bg-mort-emerald" : "bg-mort-blue"}`} style={{ width: `${clamp(pct)}%` }} />
      </div>
    </div>
  );
}

function ResultCard({ label, value, highlight, warn }) {
  return (
    <article className={`equal-card rounded-[22px] border p-4 shadow-soft ${warn ? "border-amber-200 bg-amber-50/70" : highlight ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white/85"}`}>
      <div>
        <span className="block text-xs font-black text-mort-muted">{label}</span>
        <strong className={`number-display mt-2 block text-2xl font-black leading-7 ${warn ? "text-amber-900" : highlight ? "text-mort-emerald" : "text-mort-ink"}`}>{value}</strong>
      </div>
      <span className={`mt-4 rounded-2xl px-3 py-2 text-xs font-black ${warn ? "bg-white/80 text-amber-900" : highlight ? "bg-white/80 text-emerald-800" : "bg-surface-low text-mort-muted"}`}>נתון מרכזי להחלטת מחזור</span>
    </article>
  );
}

function MiniMetric({ label, value }) {
  return (
    <article className="surface-card equal-card p-4">
      <div>
        <span className="block text-xs font-black text-mort-muted">{label}</span>
        <strong className="number-display mt-1 block text-xl font-black text-mort-ink">{value}</strong>
      </div>
      <span className="mt-3 rounded-xl bg-white/75 px-3 py-2 text-[11px] font-black text-mort-muted">חלק מתמונת הכדאיות</span>
    </article>
  );
}

function ScenarioCard({ scenario, active }) {
  const positive = scenario.monthlyChange > 0;
  return (
    <article className="equal-card rounded-[24px] border border-slate-200 bg-white/80 p-5 shadow-soft">
      <div>
        <strong className="block text-xl font-black text-mort-ink">{scenario.title}</strong>
        <p className="mt-2 text-sm font-bold leading-6 text-mort-muted">{scenario.note}</p>
        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
          <span className="block text-xs font-black text-mort-muted">החזר בתרחיש</span>
          <strong className="mt-1 block text-2xl font-black text-mort-ink">{active ? formatILS(scenario.payment) : "--"}</strong>
          <span className={`mt-2 block text-sm font-black ${positive ? "text-mort-emerald" : "text-amber-700"}`}>
            שינוי חודשי: {active ? formatILS(scenario.monthlyChange) : "--"}
          </span>
          <span className="mt-2 block text-sm font-black text-mort-muted">
            סך ריבית משוער: {active ? formatILS(scenario.totalInterest) : "--"}
          </span>
        </div>
      </div>
      <small className="mt-4 block rounded-2xl bg-surface-low px-3 py-2 font-bold text-mort-muted">
        {active ? `${formatPct(scenario.rate)} ל-${scenario.years} שנים` : "ממתין לנתונים"}
      </small>
      <small className="mt-2 block rounded-2xl bg-white/80 px-3 py-2 font-bold text-mort-muted">
        {active ? scenario.riskExplanation : "הסבר סיכון יוצג לאחר הזנת נתונים"}
      </small>
    </article>
  );
}

function LeadInput({ label, value, onChange, placeholder, inputMode = "text" }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-mort-muted">{label}</span>
      <input
        className="focus-field min-h-12 min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-black text-mort-ink"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
      />
    </label>
  );
}

function NumberInput({ label, value, onChange, helper, required = false }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-mort-muted">{label}{required ? " *" : ""}</span>
      <input
        className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-lg font-black text-mort-ink"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(cleanNumber(e.target.value).slice(0, 2))}
        required={required}
      />
      {helper && <small className="font-bold leading-5 text-mort-muted">{helper}</small>}
    </label>
  );
}

function RateInput({ label, value, onChange, helper, required = false }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-mort-muted">{label}{required ? " *" : ""}</span>
      <div className="flex min-h-12 overflow-hidden rounded-2xl border border-slate-200 bg-white ring-emerald-200 transition focus-within:ring-4">
        <span className="grid w-14 shrink-0 place-items-center bg-blue-50 font-black text-mort-blue">%</span>
        <input
          className="min-w-0 flex-1 px-4 py-3 text-lg font-black text-mort-ink outline-none"
          inputMode="decimal"
          value={displayDecimal(value)}
          onChange={(e) => onChange(cleanNumber(e.target.value, true))}
          required={required}
        />
      </div>
      {helper && <small className="font-bold leading-5 text-mort-muted">{helper}</small>}
    </label>
  );
}
