import Head from "next/head";
import { useMemo, useState } from "react";
import { cleanNumber, formatILS } from "../lib/format";

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
  purchaseStatus: "לפני חוזה",
  contractStatus: "לפני חוזה",
  employmentStatus: "שכיר",
  hasExistingMortgage: "לא",
  requestedContactTime: "בוקר",
  creditStatus: "תקין",
  notes: "",
};

function toNumber(value) {
  return Number(cleanNumber(value, true)) || 0;
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

function Field({ label, children }) {
  return <label className="block"><span className="mb-1 block text-xs font-black text-slate-500">{label}</span>{children}</label>;
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return <Field label={label}><input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || label} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-violet-500" /></Field>;
}

function Select({ label, value, onChange, children }) {
  return <Field label={label}><select value={value || ""} onChange={(e) => onChange(e.target.value)} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-violet-500">{children}</select></Field>;
}

function Metric({ label, value }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><span className="block text-xs font-black text-slate-500">{label}</span><strong className="mt-1 block text-xl font-black text-slate-950">{value}</strong></div>;
}

export default function LeadPage() {
  const [lead, setLead] = useState(initialLead);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const scoring = useMemo(() => scoreLead(lead), [lead]);
  const mortgageAmount = toNumber(lead.mortgageAmount) || Math.max(0, toNumber(lead.propertyPrice) - toNumber(lead.equityAmount));

  function update(key, value) {
    setLead((current) => ({ ...current, [key]: value }));
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
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
    } catch (err) {
      setError("הפנייה לא נשלחה. בדוק את חיבור ה־CRM או נסה שוב.");
    } finally {
      setLoading(false);
    }
  }

  return <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8"><Head><title>בדיקת זכאות מורחבת למשכנתא</title><meta name="robots" content="noindex,nofollow" /></Head><section className="mx-auto max-w-6xl"><div className="grid gap-6 lg:grid-cols-[1fr_380px]"><form onSubmit={submit} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl sm:p-8"><span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-black text-violet-800">טופס סינון לידים חכם</span><h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">בדיקת זכאות מורחבת למשכנתא</h1><p className="mt-3 max-w-2xl text-base font-bold leading-7 text-slate-600">הטופס אוסף יותר פרטים כדי להבין אם התיק מתאים להמשך טיפול מול יועץ.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2"><Input label="שם מלא" value={lead.name} onChange={(v) => update("name", v)} /><Input label="טלפון" value={lead.phone} onChange={(v) => update("phone", v)} placeholder="05xxxxxxxx" /><Input label="עיר מגורים" value={lead.city} onChange={(v) => update("city", v)} /><Input label="עיר הנכס" value={lead.propertyCity} onChange={(v) => update("propertyCity", v)} /><Input label="מחיר נכס" value={lead.propertyPrice} onChange={(v) => update("propertyPrice", v)} /><Input label="הון עצמי זמין" value={lead.equityAmount} onChange={(v) => update("equityAmount", v)} /><Input label="סכום משכנתא מבוקש" value={lead.mortgageAmount} onChange={(v) => update("mortgageAmount", v)} placeholder="אפשר להשאיר ריק לחישוב אוטומטי" /><Input label="הכנסה חודשית נטו" value={lead.monthlyIncome} onChange={(v) => update("monthlyIncome", v)} /><Input label="החזרי הלוואות קיימים" value={lead.debtLevel} onChange={(v) => update("debtLevel", v)} />
          <Select label="סטטוס חוזה" value={lead.contractStatus} onChange={(v) => update("contractStatus", v)}><option>חוזה חתום</option><option>לפני חוזה</option><option>בדיקה ראשונית</option></Select><Select label="סטטוס תעסוקה" value={lead.employmentStatus} onChange={(v) => update("employmentStatus", v)}><option>שכיר</option><option>עצמאי מעל שנתיים</option><option>עצמאי חדש</option><option>לא עובד כרגע</option></Select><Select label="יש משכנתא קיימת?" value={lead.hasExistingMortgage} onChange={(v) => update("hasExistingMortgage", v)}><option>לא</option><option>כן</option></Select><Select label="מצב אשראי" value={lead.creditStatus} onChange={(v) => update("creditStatus", v)}><option>תקין</option><option>לא בטוח</option><option>היו פיגורים</option><option>BDI שלילי</option></Select><Select label="מועד נוח לחזרה" value={lead.requestedContactTime} onChange={(v) => update("requestedContactTime", v)}><option>בוקר</option><option>צהריים</option><option>ערב</option><option>כל שעה</option></Select></div>

        <label className="mt-4 block"><span className="mb-1 block text-xs font-black text-slate-500">הערות נוספות</span><textarea value={lead.notes} onChange={(e) => update("notes", e.target.value)} className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-violet-500" placeholder="לדוגמה: יש הלוואה שנסגרת, קיים אישור עקרוני, דירה בדימונה וכו׳" /></label>

        {error && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 font-black text-red-800">{error}</div>}{sent && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 font-black text-emerald-800">הפנייה נשלחה בהצלחה ונכנסה ל־CRM.</div>}

        <button disabled={loading || sent} className="mt-6 w-full rounded-2xl bg-violet-700 px-6 py-4 text-lg font-black text-white shadow-lg disabled:opacity-60">{loading ? "שולח..." : sent ? "נשלח" : "שליחת בדיקה ליועץ"}</button></form>

      <aside className="grid content-start gap-4"><div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl"><h2 className="text-2xl font-black">איכות ליד משוערת</h2><div className="mt-4 grid gap-3"><Metric label="ציון ליד" value={`${scoring.score}/100`} /><Metric label="איכות" value={scoring.quality} /><Metric label="סכום משכנתא" value={money(mortgageAmount)} /><Metric label="אחוז מימון משוער" value={scoring.ltv ? `${Math.round(scoring.ltv)}%` : "-"} /></div><p className="mt-4 text-sm font-bold leading-6 text-slate-500">הציון נשמר ב־CRM ומאפשר סינון אוטומטי בין לידים חמים, בינוניים וחלשים.</p></div><a href="/" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center font-black text-slate-800 shadow-sm">חזרה למחשבון הראשי</a></aside></div></section></main>;
}
