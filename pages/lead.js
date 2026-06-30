import Head from "next/head";
import { useCallback, useEffect, useRef, useState } from "react";
import { cleanNumber } from "../lib/format";
import { ToastContainer, useToast } from "../components/ui/Toast";

const STORAGE_KEY = "finzo_lead_draft";
const PREFILL_KEY = "finzo_calc_prefill";
const TOTAL_STEPS = 4;

const PURCHASE_STATUS_OPTIONS = [
  ["", "בחר סוג בדיקה"],
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

const PROCESS_STAGE_OPTIONS = [
  ["", "בחר שלב"],
  ["exploring",      "רק בודק אפשרויות"],
  ["searching",      "מחפש דירה"],
  ["found_property", "מצאתי נכס, עדיין לא חתמתי"],
  ["pre_signing",    "לפני חתימה / במשא ומתן"],
  ["signed",         "כבר חתמתי חוזה"],
];

const EMPLOYMENT_OPTIONS = [
  ["שכיר",               "שכיר"],
  ["עצמאי מעל שנתיים",  "עצמאי מעל שנתיים"],
  ["עצמאי חדש",         "עצמאי חדש (פחות משנתיים)"],
  ["אחר",                "אחר"],
];

const CONTACT_TIME_OPTIONS = [
  ["בוקר",   "בוקר (08:00–12:00)"],
  ["צהריים", "צהריים (12:00–16:00)"],
  ["ערב",    "ערב (16:00–20:00)"],
  ["כל שעה","כל שעה"],
];

const CONTACT_METHOD_OPTIONS = [
  ["phone",    "שיחת טלפון"],
  ["whatsapp", "WhatsApp"],
  ["email",    "אימייל"],
];

const STEP_TITLES = [
  "מה אתה צריך?",
  "מספרים פיננסיים",
  "שלב בתהליך",
  "פרטי קשר",
];

const STEP_SUBTITLES = [
  "ספר לנו מה אתה מחפש",
  "נתונים פיננסיים יעזרו לנו להתאים את היועץ הנכון",
  "היכן אתה עומד בתהליך הרכישה/מחזור?",
  "איך ניצור איתך קשר?",
];

const initialLead = {
  // Step 1
  purchaseStatus: "",
  city: "",
  // Step 2
  propertyPrice: "",
  equityAmount: "",
  mortgageAmount: "",
  monthlyIncome: "",
  monthlyObligations: "",
  employmentStatus: "שכיר",
  // Step 3
  processStage: "",
  // Step 4
  name: "",
  phone: "",
  email: "",
  requestedContactTime: "בוקר",
  preferredContactMethod: "whatsapp",
  notes: "",
  consentAdvisorContact: false,
};

function MoneyField({ label, value, onChange, placeholder, hint }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-slate-500 dark:text-slate-400">{label}</span>
      {hint && <span className="mb-1 block text-[11px] text-slate-400 dark:text-slate-500">{hint}</span>}
      <span className="relative block">
        <input inputMode="numeric" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || "0"}
          className="min-h-12 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-3 pl-10 pr-4 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-violet-500" />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">₪</span>
      </span>
    </label>
  );
}

function TextField({ label, value, onChange, placeholder, type = "text", inputMode, className = "" }) {
  return (
    <label className={`block ${className}`}>
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
  const { toasts, addToast, removeToast } = useToast();
  // Capture UTM params and referrer from the page URL at mount time.
  // These are NOT available server-side for a POST to /api/lead unless we send them.
  const sourceMetaRef = useRef({});
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      sourceMetaRef.current = {
        utmSource:   params.get("utm_source")   || "",
        utmMedium:   params.get("utm_medium")   || "",
        utmCampaign: params.get("utm_campaign") || "",
        utmContent:  params.get("utm_content")  || "",
        utmTerm:     params.get("utm_term")     || "",
        referrer:    document.referrer          || "",
        landingPage: window.location.href       || "",
      };
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const prefillRaw = localStorage.getItem(PREFILL_KEY);
      const draftRaw = localStorage.getItem(STORAGE_KEY);
      let merged = { ...initialLead };

      if (prefillRaw) {
        const prefill = JSON.parse(prefillRaw);
        if (prefill.mortgageAmount) merged.mortgageAmount = String(prefill.mortgageAmount);
        if (prefill.propertyPrice)  merged.propertyPrice  = String(prefill.propertyPrice);
        if (prefill.equityAmount)   merged.equityAmount   = String(prefill.equityAmount);
        if (prefill.monthlyIncome)  merged.monthlyIncome  = String(prefill.monthlyIncome);
        if (prefill.purchaseStatus) merged.purchaseStatus = prefill.purchaseStatus;
        if (prefill.city)           merged.city           = prefill.city;
      }

      if (draftRaw) {
        const draft = JSON.parse(draftRaw);
        if (draft && (draft.name || draft.purchaseStatus)) {
          merged = { ...merged, ...draft };
          if (draft._step) setStep(draft._step);
        }
      }

      setLead(merged);
    } catch {}
  }, []);

  const autoSave = useCallback((data, currentStep) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, _step: currentStep })); } catch {}
  }, []);

  function update(key, value) {
    setLead((current) => {
      const next = { ...current, [key]: value };
      autoSave(next, step);
      return next;
    });
    setError("");
  }

  function validate(atStep) {
    if (atStep === 1) {
      if (!lead.purchaseStatus) return "יש לבחור סוג בדיקה";
    }
    if (atStep === 4) {
      if (lead.name.trim().length < 2) return "יש להזין שם (לפחות 2 תווים)";
      const phone = cleanNumber(lead.phone);
      if (!/^05\d{8}$|^9725\d{8}$/.test(phone)) return "יש להזין טלפון ישראלי תקין";
      if (!lead.consentAdvisorContact) return "יש לאשר הסכמה לחזרה של יועץ לפני שליחה";
    }
    return "";
  }

  function goNext() {
    const err = validate(step);
    if (err) { setError(err); return; }
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
    const err = validate(4);
    if (err) { setError(err); return; }
    setLoading(true);
    setError("");

    const propPrice  = Number(String(lead.propertyPrice  || "0").replace(/[^\d]/g, "")) || 0;
    const equity     = Number(String(lead.equityAmount   || "0").replace(/[^\d]/g, "")) || 0;
    const mortgage   = lead.mortgageAmount
      ? Number(String(lead.mortgageAmount).replace(/[^\d]/g, "")) || 0
      : Math.max(0, propPrice - equity);

    const payload = {
      name:                   lead.name.trim(),
      phone:                  cleanNumber(lead.phone),
      email:                  lead.email || "",
      city:                   lead.city || "",
      purchaseStatus:         lead.purchaseStatus,
      processStage:           lead.processStage || "",
      mortgageAmount:         String(mortgage),
      propertyPrice:          propPrice,
      equityAmount:           equity,
      monthlyIncome:          Number(String(lead.monthlyIncome      || "0").replace(/[^\d]/g, "")) || 0,
      monthlyObligations:     Number(String(lead.monthlyObligations || "0").replace(/[^\d]/g, "")) || 0,
      employmentStatus:       lead.employmentStatus || "",
      requestedContactTime:   lead.requestedContactTime || "",
      preferredContactMethod: lead.preferredContactMethod || "",
      consentAdvisorContact:  Boolean(lead.consentAdvisorContact),
      notes:                  lead.notes || "",
      source:                 "finzo-lead-form",
      createdAt:              new Date().toISOString(),
      // UTM / attribution — captured from page URL at mount, never from API query string
      utmSource:              sourceMetaRef.current.utmSource   || "",
      utmMedium:              sourceMetaRef.current.utmMedium   || "",
      utmCampaign:            sourceMetaRef.current.utmCampaign || "",
      utmContent:             sourceMetaRef.current.utmContent  || "",
      utmTerm:                sourceMetaRef.current.utmTerm     || "",
      referrer:               sourceMetaRef.current.referrer    || "",
      landingPage:            sourceMetaRef.current.landingPage || "",
    };

    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead: payload }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.ok !== true) {
        console.error("[lead-form] submit failed", {
          status: response.status,
          error: result?.error,
          supabaseCode: result?.supabaseCode,
          supabaseMessage: result?.supabaseMessage,
          supabaseDetails: result?.supabaseDetails,
          message: result?.message,
        });
        throw new Error(result?.message || "LEAD_FAILED");
      }
      setSent(true);
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(PREFILL_KEY);
      } catch {}
      addToast({ title: "הפנייה נשלחה בהצלחה", description: "נחזור אליכם בהקדם.", variant: "success" });
    } catch (err) {
      console.error("[lead-form] catch", err?.message);
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

      <section className="mx-auto max-w-5xl">
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <form onSubmit={submit} aria-busy={loading ? "true" : "false"}
            className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xl sm:p-8">

            <ProgressBar step={step} total={TOTAL_STEPS} />

            <span className="inline-flex rounded-full border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950 px-4 py-2 text-sm font-black text-violet-800 dark:text-violet-300">
              בדיקת זכאות ראשונית
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{STEP_TITLES[step - 1]}</h1>
            <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-slate-600 dark:text-slate-400">{STEP_SUBTITLES[step - 1]}</p>

            {/* ── Step 1: מה אתה צריך ── */}
            {step === 1 && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <SelectField label="סוג בדיקה" value={lead.purchaseStatus} onChange={(v) => update("purchaseStatus", v)}
                  options={PURCHASE_STATUS_OPTIONS} className="sm:col-span-2" />
                <TextField label="עיר / אזור" value={lead.city} onChange={(v) => update("city", v)} placeholder="תל אביב, ירושלים..." className="sm:col-span-2" />
              </div>
            )}

            {/* ── Step 2: מספרים פיננסיים ── */}
            {step === 2 && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <MoneyField label="מחיר הנכס המשוער" value={lead.propertyPrice} onChange={(v) => update("propertyPrice", v)} />
                <MoneyField label="הון עצמי" value={lead.equityAmount} onChange={(v) => update("equityAmount", v)} />
                <MoneyField label="סכום משכנתא מבוקש" value={lead.mortgageAmount} onChange={(v) => update("mortgageAmount", v)}
                  placeholder="יחושב אוטומטית אם ריק" hint="מחיר פחות הון עצמי אם לא מולא" />
                <MoneyField label="הכנסה חודשית נטו" value={lead.monthlyIncome} onChange={(v) => update("monthlyIncome", v)} />
                <MoneyField label="החזרי הלוואות חודשיים" value={lead.monthlyObligations} onChange={(v) => update("monthlyObligations", v)}
                  placeholder="0 אם אין" hint="תשלומי רכב, אשראי, הלוואות" />
                <SelectField label="מצב תעסוקתי" value={lead.employmentStatus} onChange={(v) => update("employmentStatus", v)} options={EMPLOYMENT_OPTIONS} />
              </div>
            )}

            {/* ── Step 3: שלב בתהליך ── */}
            {step === 3 && (
              <div className="mt-6 grid gap-4">
                <SelectField label="באיזה שלב אתה בתהליך?" value={lead.processStage} onChange={(v) => update("processStage", v)}
                  options={PROCESS_STAGE_OPTIONS} />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-5">
                  המידע הזה עוזר לנו להתאים את היועץ שיוכל לסייע לך בשלב הנוכחי. אין תשובה שגויה — גם &quot;רק בודק&quot; זה בסדר גמור.
                </p>
              </div>
            )}

            {/* ── Step 4: פרטי קשר ── */}
            {step === 4 && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <TextField label="שם מלא" value={lead.name} onChange={(v) => update("name", v)} placeholder="ישראל ישראלי" />
                <TextField label="טלפון" value={lead.phone} onChange={(v) => update("phone", v)} placeholder="05X-XXXXXXX" inputMode="tel" />
                <TextField label='אימייל (אופציונלי)' value={lead.email} onChange={(v) => update("email", v)}
                  placeholder="you@example.com" type="email" className="sm:col-span-2" />
                <SelectField label="מועד נוח לחזרה" value={lead.requestedContactTime} onChange={(v) => update("requestedContactTime", v)}
                  options={CONTACT_TIME_OPTIONS} />
                <SelectField label="דרך יצירת קשר מועדפת" value={lead.preferredContactMethod}
                  onChange={(v) => update("preferredContactMethod", v)} options={CONTACT_METHOD_OPTIONS} />
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-xs font-black text-slate-500 dark:text-slate-400">הערות נוספות (אופציונלי)</span>
                  <textarea value={lead.notes} onChange={(e) => update("notes", e.target.value)}
                    placeholder="מידע נוסף שחשוב שנדע"
                    rows={3} className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-violet-500" />
                </label>
                <label className="mt-2 flex items-start gap-3 cursor-pointer sm:col-span-2">
                  <input type="checkbox" checked={lead.consentAdvisorContact}
                    onChange={(e) => update("consentAdvisorContact", e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-violet-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-5">
                    אני מסכים/ה לשיתוף הפרטים עם יועצי משכנתאות מורשים לצורך קבלת ייעוץ.{" "}
                    <a href="/privacy" className="text-violet-600 hover:underline">מדיניות פרטיות</a>
                  </span>
                </label>
              </div>
            )}

            {error && (
              <p role="alert" className="mt-4 rounded-2xl bg-red-50 dark:bg-red-950 px-4 py-3 text-sm font-bold text-red-700 dark:text-red-300">{error}</p>
            )}

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

          {/* ── Info Sidebar ── */}
          <aside className="grid content-start gap-4 self-start">
            <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <p className="text-sm font-black text-slate-800 dark:text-slate-200">מה קורה אחרי השליחה?</p>
              <ol className="mt-3 grid gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                <li>1. נבדוק את הנתונים שהזנת</li>
                <li>2. נזהה נקודות שיכולות להשפיע על אישור</li>
                <li>3. מומחה משכנתאות יחזור אליך להמשך בדיקה</li>
                <li>4. תקבל הכוונה ראשונית ללא התחייבות</li>
              </ol>
            </div>
            <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <p className="text-sm font-black text-slate-800 dark:text-slate-200">למה FINZO?</p>
              <ul className="mt-3 grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <li>✓ יועצים מורשים ומנוסים בלבד</li>
                <li>✓ ללא עמלה נסתרת מהלקוח</li>
                <li>✓ פרטיות מלאה ואבטחת מידע</li>
                <li>✓ חזרה תוך 24 שעות</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </main>
  );
}
