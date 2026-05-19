import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

function Field({ label, value, onChange, placeholder = "", type = "text", required = false }) {
  return (
    <div>
      <label className="block text-sm font-black text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 mr-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 text-base text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 h-12"
      />
    </div>
  );
}

const ADVISOR_TYPES = ["", "יועץ עצמאי", "משרד יועצים", "אחר"];
const EXPERIENCE_OPTIONS = ["", "פחות משנה", "1–3 שנים", "3–7 שנים", "7 שנים ומעלה"];

export default function AdvisorRegister() {
  const [form, setForm] = useState({
    fullName: "", phone: "", email: "",
    region: "", businessName: "",
    experienceYears: "", advisorType: "",
    notes: "", consent: false,
  });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    if (error) setError("");
  }

  async function submit(e) {
    e.preventDefault();
    if (loading || sent) return;
    if (form.fullName.trim().length < 2) { setError("יש להזין שם מלא (לפחות 2 תווים)."); return; }
    if (form.phone.trim().length < 9) { setError("יש להזין מספר טלפון תקין."); return; }
    if (!form.consent) { setError("יש לאשר הסכמה ליצירת קשר."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/advisor/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || "REGISTER_FAILED");
      }
      setSent(true);
    } catch (err) {
      setError(err.message === "REGISTER_FAILED" ? "הבקשה לא נשלחה. נסו שוב." : err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>בקשת הצטרפות ל־FINZO PRO</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main dir="rtl" className="min-h-screen bg-slate-50">
        <header className="bg-slate-950 text-white px-4 py-5">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Link href="/advisors" className="flex items-center gap-2.5">
              <span className="text-lg font-black">FINZO</span>
              <span className="text-xs font-black text-violet-400 bg-violet-400/10 border border-violet-400/30 px-2 py-0.5 rounded-full">PRO</span>
            </Link>
            <Link href="/advisor/login" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">
              כניסה לחשבון קיים ←
            </Link>
          </div>
        </header>

        <div className="max-w-xl mx-auto px-4 py-14">
          <div className="mb-8">
            <span className="inline-block text-xs font-black text-violet-600 bg-violet-50 border border-violet-200 px-3 py-1 rounded-full mb-4">בקשת הצטרפות</span>
            <h1 className="text-3xl font-black text-slate-950">בקשת הצטרפות ל־FINZO PRO</h1>
            <p className="mt-3 text-slate-500 leading-7 text-sm">
              מלאו את הפרטים ונבדוק את הבקשה. הגישה לפלטפורמה ניתנת ליועצי משכנתאות מורשים בלבד — לאחר אישור נחזור אליכם עם פרטי כניסה.
            </p>
          </div>

          {sent ? (
            <div className="rounded-3xl bg-emerald-50 border border-emerald-200 px-8 py-12 text-center">
              <div className="text-5xl mb-4">✓</div>
              <p className="text-2xl font-black text-emerald-800 mb-3">הבקשה התקבלה</p>
              <p className="text-emerald-700 leading-7">
                נבדוק את הפרטים ונחזור אליך בהקדם.
              </p>
              <Link href="/advisors" className="mt-8 inline-block text-sm font-bold text-emerald-700 hover:underline">
                ← חזרה לדף הבית
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5 bg-white border border-slate-200 rounded-3xl p-7 shadow-sm">

              <Field
                label="שם מלא"
                value={form.fullName}
                onChange={(v) => update("fullName", v)}
                placeholder="ישראל ישראלי"
                required
              />
              <Field
                label="טלפון"
                value={form.phone}
                onChange={(v) => update("phone", v)}
                placeholder="05X-XXXXXXX"
                type="tel"
                required
              />
              <Field
                label="אימייל"
                value={form.email}
                onChange={(v) => update("email", v)}
                placeholder="you@example.com"
                type="email"
              />

              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="עיר / אזור פעילות"
                  value={form.region}
                  onChange={(v) => update("region", v)}
                  placeholder="תל אביב, מרכז..."
                />
                <Field
                  label="שם העסק"
                  value={form.businessName}
                  onChange={(v) => update("businessName", v)}
                  placeholder="שם המשרד / עסק"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-1.5">שנות ניסיון</label>
                  <select
                    value={form.experienceYears}
                    onChange={(e) => update("experienceYears", e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 text-base text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 h-12"
                  >
                    {EXPERIENCE_OPTIONS.map((o) => <option key={o} value={o}>{o || "בחרו..."}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-1.5">סוג פעילות</label>
                  <select
                    value={form.advisorType}
                    onChange={(e) => update("advisorType", e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 text-base text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 h-12"
                  >
                    {ADVISOR_TYPES.map((o) => <option key={o} value={o}>{o || "בחרו..."}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-1.5">הערות</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  rows={3}
                  placeholder="מידע נוסף, שאלות, מה אתם מחפשים..."
                  className="w-full border border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 text-base text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 resize-none"
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => update("consent", e.target.checked)}
                  className="mt-1 w-4 h-4 accent-violet-600 shrink-0"
                />
                <span className="text-sm text-slate-600 font-bold leading-6">
                  אני מסכים/ה שצוות FINZO יצור איתי קשר בנוגע לבקשת ההצטרפות
                  <span className="text-red-500 mr-1">*</span>
                </span>
              </label>

              {error && (
                <p role="alert" className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-bold text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-violet-700 hover:bg-violet-800 px-6 py-4 font-black text-white transition-colors disabled:opacity-70 text-sm"
              >
                {loading ? "שולח בקשה..." : "שלח בקשת הצטרפות"}
              </button>

              <p className="text-center text-xs text-slate-400">
                הגישה ל־FINZO PRO ניתנת ליועצי משכנתאות מורשים בלבד לאחר בדיקה ואישור.
              </p>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
