import Head from "next/head";
import { useMemo, useState } from "react";
import { cleanNumber, formatILS, formatPct } from "../lib/format";
import { Tag, StatusDot } from "../components/ui/Tag";
import { ToastContainer, useToast } from "../components/ui/Toast";

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

const initialLead = {
  name: "",
  phone: "",
  city: "",
  propertyCity: "",
  mortgageAmount: "",
  propertyPrice: "",
  equityAmount: "",
  monthlyIncome: "",
  debtLevel: "",
  purchaseStatus: "",
  contractStatus: "לפני חוזה",
  employmentStatus: "שכיר",
  hasExistingMortgage: "לא",
  requestedContactTime: "בוקר",
  creditStatus: "תקין",
  notes: "",
};

// Map lead quality to Tag variant (infrastructure use of shared primitive)
const QUALITY_TAG_VARIANT = {
  "חם": "upgrade",   // bg-[#edfaf3] text-[#0F7A48] — green, matches current emerald style
  "בינוני": "refi",  // bg-[#fff3ec] text-[#C25E2A] — amber-orange, matches current amber style
  "חלש": "danger",   // bg-red-50 text-red-700 border-red-100 — risk signal preserved
};

// Consumer-safe display labels for internal quality values
const QUALITY_CONSUMER_LABEL = {
  "חם": "נראה חזק",
  "בינוני": "יש מה לשפר",
  "חלש": "דורש התייחסות",
};

// Map priority to StatusDot status
const PRIORITY_TO_STATUS = {
  "גבוה": "won",
  "רגיל": "progress",
  "נמוך": "lost",
};

function toNumber(value) {
  return Number(cleanNumber(value, true)) || 0;
}

function money(value) {
  const amount = Number(value || 0);
  return amount ? formatILS(amount) : "-";
}

function pct(value) {
  const n = Number(value || 0);
  return n ? formatPct(n) : "-";
}

function scoreLead(lead) {
  let score = 0;
  const income = toNumber(lead.monthlyIncome);
  const equity = toNumber(lead.equityAmount);
  const price = toNumber(lead.propertyPrice);
  const mortgage = toNumber(lead.mortgageAmount);
  const debts = toNumber(lead.debtLevel);
  const ltv = price > 0 ? (mortgage / price) * 100 : 0;
  const debtRatio = income > 0 ? (debts / income) * 100 : 0;

  if (income >= 18000) score += 25;
  else if (income >= 12000) score += 18;
  else if (income >= 8000) score += 10;

  if (equity >= 500000) score += 20;
  else if (equity >= 250000) score += 14;
  else if (equity >= 100000) score += 7;

  if (lead.contractStatus === "חוזה חתום") score += 18;
  else if (lead.contractStatus === "לפני חוזה") score += 12;
  else if (lead.contractStatus === "בדיקה ראשונית") score += 5;

  if (lead.employmentStatus === "שכיר" || lead.employmentStatus === "עצמאי מעל שנתיים") score += 12;
  else if (lead.employmentStatus === "עצמאי חדש") score += 6;

  if (lead.creditStatus === "תקין") score += 12;
  else if (lead.creditStatus === "לא בטוח") score += 5;

  if (ltv > 0 && ltv <= 70) score += 10;
  else if (ltv > 0 && ltv <= 75) score += 6;

  if (debtRatio <= 20) score += 8;
  else if (debtRatio <= 35) score += 4;

  const finalScore = Math.max(0, Math.min(100, score));
  const quality = finalScore >= 70 ? "חם" : finalScore >= 45 ? "בינוני" : "חלש";
  const priority = quality === "חם" ? "גבוה" : quality === "בינוני" ? "רגיל" : "נמוך";
  return { score: finalScore, quality, priority, ltv, debtRatio };
}

function MoneyField({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-slate-500">{label}</span>
      <span className="relative block">
        <input
          inputMode="numeric"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "0"}
          className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-bold text-slate-900 outline-none focus:border-violet-500"
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">₪</span>
      </span>
    </label>
  );
}

function TextField({ label, value, onChange, placeholder, type = "text", inputMode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-slate-500">{label}</span>
      <input
        type={type}
        inputMode={inputMode}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || label}
        className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-violet-500"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-black text-slate-500">{label}</span>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-violet-500"
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function Metric({ label, value, sub }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="block text-xs font-black text-slate-500">{label}</span>
      <strong className="mt-1 block text-xl font-black text-slate-950">{value}</strong>
      {sub && <span className="mt-1 block text-xs font-bold text-slate-500">{sub}</span>}
    </div>
  );
}

export default function LeadPage() {
  const [lead, setLead] = useState(initialLead);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const { toasts, addToast, removeToast } = useToast();

  const scoring = useMemo(() => scoreLead(lead), [lead]);
  const mortgageAmount = toNumber(lead.mortgageAmount) || Math.max(0, toNumber(lead.propertyPrice) - toNumber(lead.equityAmount));

  function update(key, value) {
    setLead((current) => ({ ...current, [key]: value }));
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    if (loading || sent) return;
    const phone = cleanNumber(lead.phone);
    if (lead.name.trim().length < 2 || !/^05\d{8}$|^9725\d{8}$/.test(phone)) {
      setError("יש להזין שם וטלפון ישראלי תקין.");
      return;
    }
    setLoading(true);
    setError("");
    const payload = {
      ...lead,
      phone,
      source: "qualified-lead-page",
      mortgageAmount: String(mortgageAmount),
      propertyPrice: toNumber(lead.propertyPrice),
      equityAmount: toNumber(lead.equityAmount),
      monthlyIncome: toNumber(lead.monthlyIncome),
      debtLevel: toNumber(lead.debtLevel),
      estimatedApprovalResult: scoring.score,
      approval: scoring.score,
      leadQuality: scoring.quality,
      leadPriority: scoring.priority,
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
      if (!response.ok || result?.ok !== true) throw new Error(result?.message || result?.error || "LEAD_FAILED");
      setSent(true);
      addToast({ title: "הפנייה נשלחה בהצלחה", description: "נחזור אליכם בהקדם.", variant: "success" });
    } catch {
      addToast({ title: "הפנייה לא נשלחה", description: "נסו שוב, או צרו קשר ישירות.", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <Head>
        <title>בדיקת זכאות מורחבת למשכנתא</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <section className="mx-auto max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">

          {/* ── FORM ── */}
          <form
            onSubmit={submit}
            aria-busy={loading ? "true" : "false"}
            className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl sm:p-8"
          >
            <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-black text-violet-800">
              בדיקת זכאות ראשונית
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">בדיקת זכאות מורחבת למשכנתא</h1>
            <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-slate-600">
              הטופס עוזר לנו להבין את מצבך הפיננסי ולהציג בדיקת זכאות ראשונית למשכנתא או למחזור.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <TextField label="שם מלא" value={lead.name} onChange={(v) => update("name", v)} placeholder="ישראל ישראלי" />
              <TextField label="טלפון" value={lead.phone} onChange={(v) => update("phone", v)} placeholder="05X-XXXXXXX" inputMode="tel" />
              <SelectField
                label="מה סוג הבדיקה?"
                value={lead.purchaseStatus}
                onChange={(v) => update("purchaseStatus", v)}
                options={PURCHASE_STATUS_OPTIONS}
                className="sm:col-span-2"
              />
              <TextField label="עיר מגורים" value={lead.city} onChange={(v) => update("city", v)} placeholder="תל אביב" />
              <TextField label="עיר הנכס" value={lead.propertyCity} onChange={(v) => update("propertyCity", v)} placeholder="רחובות" />
              <MoneyField label="מחיר הנכס" value={lead.propertyPrice} onChange={(v) => update("propertyPrice", v)} />
              <MoneyField label="הון עצמי" value={lead.equityAmount} onChange={(v) => update("equityAmount", v)} />
              <MoneyField label="סכום משכנתא" value={lead.mortgageAmount} onChange={(v) => update("mortgageAmount", v)} placeholder="יחושב אוטומטית" />
              <MoneyField label="הכנסה חודשית נטו" value={lead.monthlyIncome} onChange={(v) => update("monthlyIncome", v)} />
              <MoneyField label="החזרי הלוואות קיימים" value={lead.debtLevel} onChange={(v) => update("debtLevel", v)} />
              <SelectField
                label="סטטוס תעסוקה"
                value={lead.employmentStatus}
                onChange={(v) => update("employmentStatus", v)}
                options={[
                  ["שכיר", "שכיר"],
                  ["עצמאי מעל שנתיים", "עצמאי מעל שנתיים"],
                  ["עצמאי חדש", "עצמאי חדש"],
                  ["אחר", "אחר"],
                ]}
              />
              <SelectField
                label="סטטוס חוזה"
                value={lead.contractStatus}
                onChange={(v) => update("contractStatus", v)}
                options={[
                  ["לפני חוזה", "לפני חוזה"],
                  ["חוזה חתום", "חוזה חתום"],
                  ["בדיקה ראשונית", "בדיקה ראשונית"],
                ]}
              />
              <SelectField
                label="האם יש משכנתא קיימת"
                value={lead.hasExistingMortgage}
                onChange={(v) => update("hasExistingMortgage", v)}
                options={[
                  ["לא", "לא"],
                  ["כן", "כן"],
                ]}
              />
              <SelectField
                label="מצב אשראי"
                value={lead.creditStatus}
                onChange={(v) => update("creditStatus", v)}
                options={[
                  ["תקין", "תקין"],
                  ["לא בטוח", "לא בטוח"],
                  ["היו פיגורים", "היו פיגורים"],
                ]}
              />
              <SelectField
                label="מועד נוח לחזרה"
                value={lead.requestedContactTime}
                onChange={(v) => update("requestedContactTime", v)}
                options={[
                  ["בוקר", "בוקר (08:00–12:00)"],
                  ["צהריים", "צהריים (12:00–16:00)"],
                  ["ערב", "ערב (16:00–20:00)"],
                  ["כל שעה", "כל שעה"],
                ]}
              />
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-black text-slate-500">הערות נוספות</span>
                <textarea
                  value={lead.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="מידע נוסף שחשוב שנדע לפני החזרה"
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-violet-500"
                />
              </label>
            </div>

            {/* Validation error — stays inline near the form */}
            {error && (
              <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>
            )}

            {/* Success state card — replaces the inline success paragraph */}
            {sent && (
              <div role="status" className="mt-4 rounded-[28px] border border-emerald-200 bg-emerald-50 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="mt-3 text-xl font-black text-emerald-800">הפנייה נשלחה בהצלחה</p>
                <p className="mt-1 text-sm font-semibold text-emerald-700">נבדוק את הנתונים ונחזור אליכם בהקדם האפשרי.</p>
                <p className="mt-3 text-sm font-bold text-emerald-700">נציג מקצועי יחזור אליכם בהקדם.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || sent}
              className="mt-5 min-h-12 w-full rounded-full bg-violet-700 px-7 py-4 text-base font-black text-white shadow-[0_16px_40px_rgba(109,40,217,0.25)] transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "שולח..." : sent ? "נשלח בהצלחה ✓" : "שליחת פנייה לבדיקת זכאות"}
            </button>
            <p className="mt-3 text-center text-xs font-bold text-slate-500">
              בדיקת זכאות ללא התחייבות. המידע נשמר לצורך חזרה בלבד.
            </p>
          </form>

          {/* ── SCORING SIDEBAR ── */}
          <aside
            className={`grid content-start gap-4 self-start transition-opacity ${loading ? "pointer-events-none opacity-60" : ""}`}
          >
            {/* Score panel */}
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-black text-slate-600">סיכום הנתונים שלך</p>
              <div className="mt-3 flex items-end gap-3">
                <span className={`text-5xl font-black text-slate-950 ${loading ? "animate-pulse" : ""}`}>
                  {scoring.score}
                </span>
                <span className="text-sm font-black text-slate-500">/ 100</span>
              </div>
              <Tag variant={QUALITY_TAG_VARIANT[scoring.quality] ?? "default"} className="mt-3">
                {QUALITY_CONSUMER_LABEL[scoring.quality] ?? scoring.quality}
              </Tag>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-violet-700 transition-all duration-300"
                  style={{ width: `${scoring.score}%` }}
                />
              </div>
            </div>

            {/* Metrics */}
            <div className="grid gap-3">
              <Metric
                label="סכום משכנתא"
                value={money(mortgageAmount || toNumber(lead.mortgageAmount))}
              />
              <Metric
                label="LTV משוער"
                value={scoring.ltv > 0 ? pct(scoring.ltv) : "-"}
                sub={scoring.ltv > 75 ? "⚠ מעל מגבלת 75%" : scoring.ltv > 0 ? "תקין" : ""}
              />
              <Metric
                label="יחס חוב להכנסה"
                value={scoring.debtRatio > 0 ? pct(scoring.debtRatio) : "-"}
                sub={scoring.debtRatio > 35 ? "⚠ גבולי" : scoring.debtRatio > 0 ? "תקין" : ""}
              />
              {/* Priority metric with StatusDot indicator */}
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="block text-xs font-black text-slate-500">רמת מוכנות</span>
                <div className="mt-1 flex items-center gap-2">
                  <StatusDot status={PRIORITY_TO_STATUS[scoring.priority] ?? "new"} label="" />
                  <strong className="text-xl font-black text-slate-950">{scoring.priority}</strong>
                </div>
              </div>
            </div>

            {/* Info card */}
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-black text-slate-800">מה קורה אחרי השליחה?</p>
              <ol className="mt-3 grid gap-2 text-sm font-semibold text-slate-600">
                <li>1. נבדוק את הנתונים שהזנת</li>
                <li>2. נזהה נקודות שיכולות להשפיע על אישור</li>
                <li>3. נציג מקצועי יחזור אליך להמשך בדיקה</li>
                <li>4. תקבל הכוונה ראשונית ללא התחייבות</li>
              </ol>
              <div className="mt-4 grid gap-2 text-xs font-bold text-slate-500">
                <span className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-800">ללא התחייבות</span>
                <span className="inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800">לא מהווה אישור בנקאי</span>
                <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">הפרטים ישמשו לחזרה אליך בלבד</span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </main>
  );
}
