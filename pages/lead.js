import Head from "next/head";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cleanNumber, formatILS, formatPct } from "../lib/format";
import { Tag, StatusDot } from "../components/ui/Tag";
import { ToastContainer, useToast } from "../components/ui/Toast";
import { useTheme } from "./_app";

const STORAGE_KEY = "finzo_lead_draft";
const TOTAL_STEPS = 3;

const PURCHASE_STATUS_OPTIONS = [
  ["", "מה סוג הבדיקה?"],
  ["new_purchase",       "רכישת דירה"],
  ["first_apartment",    "דירה ראשונה"],
  ["upgrader",           "משפר דיור"],
  ["investment",         "דירה להשקעה / דירה שנייה"],
  ["refinance",          "מחזור משכנתא"],
  ["bank_declined",      "סורב בבנק"],
  ["bdi_credit_issue",   "הייתה בעיה באישור בנקאי / אשראי"],
  ["senior_60plus",      "משכנתא גיל 60+"],
  ["debt_consolidation", "איחוד הלוואות"],
  ["general",            "בדיקה כללית"],
];

const EMPLOYMENT_OPTIONS = [
  ["שכיר", "שכיר"],
  ["עצמאי מעל שנתיים", "עצמאי מעל שנתיים"],
  ["עצמאי חדש", "עצמאי חדש (פחות משנתיים)"],
  ["אחר", "אחר"],
];

const CONTRACT_OPTIONS = [
  ["לפני חוזה", "לפני חוזה"],
  ["חוזה חתום", "חוזה חתום"],
  ["בדיקה ראשונית", "בדיקה ראשונית"],
];

const CREDIT_OPTIONS = [
  ["תקין", "תקין"],
  ["לא בטוח", "לא בטוח"],
  ["היו פיגורים", "היו פיגורים"],
];

const TIMEFRAME_OPTIONS = [
  ["עד 30 יום", "עד 30 יום"],
  ["1-3 חודשים", "1-3 חודשים"],
  ["3-6 חודשים", "3-6 חודשים"],
  ["מעל 6 חודשים", "מעל 6 חודשים"],
  ["לא ידוע", "לא ידוע"],
];

const COMPLEXITY_OPTIONS = [
  ["פשוט", "פשוט — שכיר, אשראי תקין"],
  ["בינוני", "בינוני — עצמאי או מעט בעיות"],
  ["מורכב", "מורכב — פיגורים / מספר לווים / נכס ישן"],
];

const initialLead = {
  name: "", phone: "", purchaseStatus: "", propertyPrice: "",
  equityAmount: "", monthlyIncome: "", debtLevel: "", employmentStatus: "שכיר",
  hasExistingProperty: "לא", contractStatus: "לפני חוזה", creditStatus: "תקין",
  timeframe: "", coBorrower: "לא", age: "", purchaseRegion: "", currentBank: "",
  creditComplexity: "פשוט", notes: "", city: "", propertyCity: "",
  mortgageAmount: "", hasExistingMortgage: "לא", requestedContactTime: "בוקר",
};

const QUALITY_TAG_VARIANT = { "חם": "upgrade", "בינוני": "refi", "חלש": "danger" };
const QUALITY_CONSUMER_LABEL = { "חם": "נראה חזק", "בינוני": "יש מה לשפר", "חלש": "דורש התייחסות" };
const PRIORITY_TO_STATUS = { "גבוה": "won", "רגיל": "progress", "נמוך": "lost" };

function toNumber(value) { return Number(cleanNumber(value, true)) || 0; }
function money(value) { const a = Number(value || 0); return a ? formatILS(a) : "-"; }

function scoreLead(lead) {
  let score = 0;
  const income = toNumber(lead.monthlyIncome);
  const equity = toNumber(lead.equityAmount);
  const price = toNumber(lead.propertyPrice);
  const mortgage = toNumber(lead.mortgageAmount);
  const debts = toNumber(lead.debtLevel);
  const ltv = price > 0 ? (mortgage / price) * 100 : 0;
  const debtRatio = income > 0 ? (debts / income) * 100 : 0;

  if (income >= 18000) score += 25; else if (income >= 12000) score += 18; else if (income >= 8000) score += 10;
  if (equity >= 500000) score += 20; else if (equity >= 250000) score += 14; else if (equity >= 100000) score += 7;
  if (lead.contractStatus === "חוזה חתום") score += 18; else if (lead.contractStatus === "לפני חוזה") score += 12; else if (lead.contractStatus === "בדיקה ראשונית") score += 5;
  if (lead.employmentStatus === "שכיר" || lead.employmentStatus === "עצמאי מעל שנתיים") score += 12; else if (lead.employmentStatus === "עצמאי חדש") score += 6;
  if (lead.creditStatus === "תקין") score += 12; else if (lead.creditStatus === "לא בטוח") score += 5;
  if (ltv > 0 && ltv <= 70) score += 10; else if (ltv > 0 && ltv <= 75) score += 6;
  if (debtRatio <= 20) score += 8; else if (debtRatio <= 35) score += 4;

  const finalScore = Math.max(0, Math.min(100, score));
  const quality = finalScore >= 70 ? "חם" : finalScore >= 45 ? "בינוני" : "חלש";
  const priority = quality === "חם" ? "גבוה" : quality === "בינוני" ? "רגיל" : "נמוך";
  return { score: finalScore, quality, priority, ltv, debtRatio };
}

function computeHeatScore(lead) {
  let heat = 0;
  if (lead.contractStatus === "חוזה חתום") heat += 30;
  const equity = toNumber(lead.equityAmount);
  const price = toNumber(lead.propertyPrice);
  if (price > 0 && equity / price >= 0.25) heat += 25;
  if (lead.employmentStatus === "שכיר" || lead.employmentStatus === "עצמאי מעל שנתיים") heat += 20;
  if (lead.timeframe === "עד 30 יום") heat += 25;
  else if (lead.timeframe === "1-3 חודשים") heat += 15;

  if (heat >= 70) return { level: "HOT", label: "חם", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800" };
  if (heat >= 40) return { level: "WARM", label: "חמים", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800" };
  return { level: "COLD", label: "קר", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" };
}

function MoneyField({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-slate-500 dark:text-slate-400">{label}</span>
      <span className="relative block">
        <input inputMode="numeric" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || "0"}
          className="min-h-12 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-3 pl-10 pr-4 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-violet-500" />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">₪</span>
      </span>
    </label>
  );
}

function TextField({ label, value, onChange, placeholder, type = "text", inputMode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-slate-500 dark:text-slate-400">{label}</span>
      <input type={type} inputMode={inputMode} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || label}
        className="min-h-12 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-violet-500" />
    </label>
  );
}

function SelectField({ label, value, onChange, options, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-black text-slate-500 dark:text-slate-400">{label}</span>
      <select value={value || ""} onChange={(e) => onChange(e.target.value)}
        className="min-h-12 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-violet-500">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function ProgressBar({ step, total }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">שלב {step} מתוך {total}</span>
        <span className="text-xs font-bold text-violet-600">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full bg-violet-600 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function LeadPage() {
  const [step, setStep] = useState(1);
  const [lead, setLead] = useState(initialLead);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const { toasts, addToast, removeToast } = useToast();
  const { dark } = useTheme();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name) {
          setLead(prev => ({ ...prev, ...parsed }));
          if (parsed._step) setStep(parsed._step);
        }
      }
    } catch {}
  }, []);

  const autoSave = useCallback((data, currentStep) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, _step: currentStep })); } catch {}
  }, []);

  const scoring = useMemo(() => scoreLead(lead), [lead]);
  const heatScore = useMemo(() => computeHeatScore(lead), [lead]);
  const mortgageAmount = toNumber(lead.mortgageAmount) || Math.max(0, toNumber(lead.propertyPrice) - toNumber(lead.equityAmount));

  function update(key, value) {
    setLead(current => {
      const next = { ...current, [key]: value };
      autoSave(next, step);
      return next;
    });
    setError("");
  }

  function goNext() {
    if (step === 1) {
      if (lead.name.trim().length < 2) { setError("יש להזין שם (לפחות 2 תווים)"); return; }
      const phone = cleanNumber(lead.phone);
      if (!/^05\d{8}$|^9725\d{8}$/.test(phone)) { setError("יש להזין טלפון ישראלי תקין"); return; }
      if (!lead.purchaseStatus) { setError("יש לבחור סוג בדיקה"); return; }
    }
    setError("");
    const next = Math.min(step + 1, TOTAL_STEPS);
    setStep(next);
    autoSave(lead, next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    const prev = Math.max(step - 1, 1);
    setStep(prev);
    autoSave(lead, prev);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event) {
    event.preventDefault();
    if (loading || sent) return;
    if (!consent) { setError("יש לאשר את הסכמתכם לשיתוף המידע לפני שליחה."); return; }
    setLoading(true);
    setError("");
    const payload = {
      ...lead, phone: cleanNumber(lead.phone), source: "qualified-lead-page",
      mortgageAmount: String(mortgageAmount), propertyPrice: toNumber(lead.propertyPrice),
      equityAmount: toNumber(lead.equityAmount), monthlyIncome: toNumber(lead.monthlyIncome),
      debtLevel: toNumber(lead.debtLevel), estimatedApprovalResult: scoring.score,
      approval: scoring.score, leadQuality: scoring.quality, leadPriority: scoring.priority,
      heatLevel: heatScore.level,
      mainIssue: scoring.quality === "חם" ? "ליד איכותי להמשך טיפול" : scoring.quality === "בינוני" ? "נדרש בירור נוסף" : "ליד חלש / דורש סינון",
      createdAt: new Date().toISOString(),
    };

    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead: payload, analysis: { approval: scoring.score, mortgage: mortgageAmount, mainIssue: payload.mainIssue } }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.ok !== true) throw new Error(result?.message || "LEAD_FAILED");
      setSent(true);
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      addToast({ title: "הפנייה נשלחה בהצלחה", description: "נחזור אליכם בהקדם.", variant: "success" });
    } catch {
      addToast({ title: "הפנייה לא נשלחה", description: "נסו שוב, או צרו קשר ישירות.", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-8 text-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
      <Head>
        <title>בדיקת זכאות מורחבת למשכנתא</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <section className="mx-auto max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <form onSubmit={submit} aria-busy={loading ? "true" : "false"}
            className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xl sm:p-8">

            <ProgressBar step={step} total={TOTAL_STEPS} />

            <span className="inline-flex rounded-full border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950 px-4 py-2 text-sm font-black text-violet-800 dark:text-violet-300">
              בדיקת זכאות ראשונית
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              {step === 1 ? "פרטים בסיסיים" : step === 2 ? "נתונים פיננסיים" : "פרטים מתקדמים"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-slate-600 dark:text-slate-400">
              {step === 1 ? "נתחיל עם הפרטים הבסיסיים שלך" : step === 2 ? "עכשיו נבדוק את הנתונים הפיננסיים" : "פרטים נוספים שיעזרו לנו להעריך טוב יותר"}
            </p>

            {/* Step 1: Hook */}
            {step === 1 && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <TextField label="שם מלא" value={lead.name} onChange={v => update("name", v)} placeholder="ישראל ישראלי" />
                <TextField label="טלפון" value={lead.phone} onChange={v => update("phone", v)} placeholder="05X-XXXXXXX" inputMode="tel" />
                <SelectField label="מה סוג הבדיקה?" value={lead.purchaseStatus} onChange={v => update("purchaseStatus", v)} options={PURCHASE_STATUS_OPTIONS} className="sm:col-span-2" />
                <MoneyField label="מחיר הנכס" value={lead.propertyPrice} onChange={v => update("propertyPrice", v)} />
              </div>
            )}

            {/* Step 2: Qualification */}
            {step === 2 && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <MoneyField label="הון עצמי" value={lead.equityAmount} onChange={v => update("equityAmount", v)} />
                <MoneyField label="הכנסה חודשית נטו" value={lead.monthlyIncome} onChange={v => update("monthlyIncome", v)} />
                <MoneyField label="החזרי הלוואות חודשיים" value={lead.debtLevel} onChange={v => update("debtLevel", v)} />
                <SelectField label="מצב תעסוקתי" value={lead.employmentStatus} onChange={v => update("employmentStatus", v)} options={EMPLOYMENT_OPTIONS} />
                <SelectField label="האם יש נכס קיים?" value={lead.hasExistingProperty} onChange={v => update("hasExistingProperty", v)} options={[["לא", "לא"], ["כן", "כן"]]} />
                <SelectField label="סטטוס חוזה" value={lead.contractStatus} onChange={v => update("contractStatus", v)} options={CONTRACT_OPTIONS} />
                <SelectField label="מצב אשראי" value={lead.creditStatus} onChange={v => update("creditStatus", v)} options={CREDIT_OPTIONS} />
                <SelectField label="זמן לביצוע" value={lead.timeframe} onChange={v => update("timeframe", v)} options={[["", "בחר"], ...TIMEFRAME_OPTIONS]} />
              </div>
            )}

            {/* Step 3: Deep Qualification */}
            {step === 3 && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <SelectField label="לווה נוסף / בן/בת זוג" value={lead.coBorrower} onChange={v => update("coBorrower", v)} options={[["לא", "לא"], ["כן", "כן"]]} />
                <TextField label="גיל" value={lead.age} onChange={v => update("age", v)} placeholder="35" inputMode="numeric" />
                <TextField label="אזור רכישה" value={lead.purchaseRegion} onChange={v => update("purchaseRegion", v)} placeholder="מרכז / צפון / דרום" />
                <TextField label="בנק נוכחי" value={lead.currentBank} onChange={v => update("currentBank", v)} placeholder="לאומי, פועלים..." />
                <SelectField label="מורכבות אשראית" value={lead.creditComplexity} onChange={v => update("creditComplexity", v)} options={COMPLEXITY_OPTIONS} className="sm:col-span-2" />
                <MoneyField label="סכום משכנתא (ימולא אוטומטית אם ריק)" value={lead.mortgageAmount} onChange={v => update("mortgageAmount", v)} placeholder="יחושב אוטומטית" />
                <SelectField label="מועד נוח לחזרה" value={lead.requestedContactTime} onChange={v => update("requestedContactTime", v)}
                  options={[["בוקר", "בוקר (08:00–12:00)"], ["צהריים", "צהריים (12:00–16:00)"], ["ערב", "ערב (16:00–20:00)"], ["כל שעה", "כל שעה"]]} />
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-xs font-black text-slate-500 dark:text-slate-400">הערות נוספות</span>
                  <textarea value={lead.notes} onChange={e => update("notes", e.target.value)} placeholder="מידע נוסף שחשוב שנדע"
                    rows={3} className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-violet-500" />
                </label>

                <label className="mt-2 flex items-start gap-3 cursor-pointer sm:col-span-2">
                  <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 w-4 h-4 accent-violet-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-5">
                    אני מסכים/ה לשיתוף הפרטים עם יועצי משכנתאות מורשים לצורך קבלת ייעוץ.{" "}
                    <a href="/privacy" className="text-violet-600 hover:underline">מדיניות פרטיות</a>
                  </span>
                </label>
              </div>
            )}

            {error && <p role="alert" className="mt-4 rounded-2xl bg-red-50 dark:bg-red-950 px-4 py-3 text-sm font-bold text-red-700 dark:text-red-300">{error}</p>}

            {sent && (
              <div role="status" className="mt-4 rounded-[28px] border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="mt-3 text-xl font-black text-emerald-800 dark:text-emerald-200">הפנייה נשלחה בהצלחה</p>
                <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">נבדוק את הנתונים ונחזור אליכם בהקדם.</p>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              {step > 1 && (
                <button type="button" onClick={goBack}
                  className="min-h-12 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-7 py-3 text-sm font-black text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                  חזרה
                </button>
              )}
              {step < TOTAL_STEPS ? (
                <button type="button" onClick={goNext}
                  className="min-h-12 flex-1 rounded-full bg-violet-700 px-7 py-3 text-base font-black text-white shadow-[0_16px_40px_rgba(109,40,217,0.25)] transition hover:bg-violet-800">
                  המשך
                </button>
              ) : (
                <button type="submit" disabled={loading || sent}
                  className="min-h-12 flex-1 rounded-full bg-violet-700 px-7 py-4 text-base font-black text-white shadow-[0_16px_40px_rgba(109,40,217,0.25)] transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-70">
                  {loading ? "שולח..." : sent ? "נשלח בהצלחה" : "שליחת פנייה"}
                </button>
              )}
            </div>
            <p className="mt-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
              בדיקת זכאות ללא התחייבות. הנתונים נשמרים אוטומטית.
            </p>
          </form>

          {/* ── SCORING SIDEBAR ── */}
          <aside className={`grid content-start gap-4 self-start transition-opacity ${loading ? "pointer-events-none opacity-60" : ""}`}>
            {/* Score panel */}
            <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <p className="text-sm font-black text-slate-600 dark:text-slate-400">סיכום הנתונים שלך</p>
              <div className="mt-3 flex items-end gap-3">
                <span className={`text-5xl font-black text-slate-950 dark:text-white ${loading ? "animate-pulse" : ""}`}>{scoring.score}</span>
                <span className="text-sm font-black text-slate-500 dark:text-slate-400">/ 100</span>
              </div>
              <Tag variant={QUALITY_TAG_VARIANT[scoring.quality] ?? "default"} className="mt-3">
                {QUALITY_CONSUMER_LABEL[scoring.quality] ?? scoring.quality}
              </Tag>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-violet-700 transition-all duration-300" style={{ width: `${scoring.score}%` }} />
              </div>
            </div>

            {/* Heat Score */}
            <div className={`rounded-[2rem] border p-5 shadow-sm ${heatScore.bg}`}>
              <p className="text-xs font-black text-slate-500 dark:text-slate-400">FINZO Heat Score</p>
              <p className={`mt-2 text-2xl font-black ${heatScore.color}`}>{heatScore.label}</p>
              <p className="mt-1 text-xs font-bold text-slate-600 dark:text-slate-400">
                {heatScore.level === "HOT" ? "ליד מוכן לסגירה — חוזה + הון + יציבות" :
                 heatScore.level === "WARM" ? "חלק מהנתונים חזקים — צריך השלמה" :
                 "חסרים נתונים מהותיים — דורש בירור"}
              </p>
            </div>

            {/* Metrics */}
            <div className="grid gap-3">
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <span className="block text-xs font-black text-slate-500 dark:text-slate-400">סכום משכנתא</span>
                <strong className="mt-1 block text-xl font-black text-slate-950 dark:text-white">{money(mortgageAmount)}</strong>
              </div>
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <span className="block text-xs font-black text-slate-500 dark:text-slate-400">LTV משוער</span>
                <strong className="mt-1 block text-xl font-black text-slate-950 dark:text-white">{scoring.ltv > 0 ? formatPct(scoring.ltv) : "-"}</strong>
                {scoring.ltv > 75 && <span className="mt-1 block text-xs font-bold text-red-600">מעל מגבלת 75%</span>}
              </div>
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <span className="block text-xs font-black text-slate-500 dark:text-slate-400">רמת מוכנות</span>
                <div className="mt-1 flex items-center gap-2">
                  <StatusDot status={PRIORITY_TO_STATUS[scoring.priority] ?? "new"} label="" />
                  <strong className="text-xl font-black text-slate-950 dark:text-white">{scoring.priority}</strong>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <p className="text-sm font-black text-slate-800 dark:text-slate-200">מה קורה אחרי השליחה?</p>
              <ol className="mt-3 grid gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                <li>1. נבדוק את הנתונים שהזנת</li>
                <li>2. נזהה נקודות שיכולות להשפיע על אישור</li>
                <li>3. נציג מקצועי יחזור אליך להמשך בדיקה</li>
                <li>4. תקבל הכוונה ראשונית ללא התחייבות</li>
              </ol>
            </div>
          </aside>
        </div>
      </section>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </main>
  );
}
