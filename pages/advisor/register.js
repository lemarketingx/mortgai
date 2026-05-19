import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

function Field({ label, value, onChange, placeholder = "", type = "text", required = false }) {
  return (
    <div>
      <label className="block text-sm font-black text-slate-700 mb-2">{label}</label>
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

export default function AdvisorRegister() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", region: "", license: "", message: "" });
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
    if (form.name.trim().length < 2 || form.phone.trim().length < 9) {
      setError("יש להזין שם מלא וטלפון תקין.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/advisor/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("REGISTER_FAILED");
      setSent(true);
    } catch {
      setError("הבקשה לא נשלחה. נסו שוב.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>בקשת גישה ליועצים | FINZO</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main dir="rtl" className="min-h-screen bg-slate-50">
        <header className="bg-slate-950 text-white px-4 py-5">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Link href="/advisors" className="flex items-center gap-2">
              <span className="text-lg font-black">FINZO</span>
              <span className="text-xs text-violet-400 font-bold">חנות לידים</span>
            </Link>
            <Link href="/advisor/login" className="text-sm font-bold text-violet-300 hover:text-white transition-colors">
              כניסה לפורטל ←
            </Link>
          </div>
        </header>

        <div className="max-w-xl mx-auto px-4 py-14">
          <h1 className="text-3xl font-black text-slate-950">בקשת גישה לפלטפורמה</h1>
          <p className="mt-3 text-slate-600 leading-7">מלאו את הפרטים ונחזור אליכם בהקדם עם פרטי כניסה לפורטל ולחנות הלידים.</p>

          {sent ? (
            <div className="mt-8 rounded-2xl bg-emerald-50 border border-emerald-200 px-6 py-10 text-center">
              <p className="text-3xl font-black text-emerald-700 mb-2">הבקשה נשלחה ✓</p>
              <p className="text-emerald-600">נחזור אליכם בהקדם עם פרטי גישה לפורטל.</p>
              <Link href="/advisors" className="mt-6 inline-block text-sm font-bold text-emerald-700 hover:underline">
                חזרה לדף הבית ←
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-4 bg-white border border-slate-200 rounded-2xl p-7 shadow-sm">
              <Field label="שם מלא *" value={form.name} onChange={(v) => update("name", v)} placeholder="ישראל ישראלי" required />
              <Field label="טלפון *" value={form.phone} onChange={(v) => update("phone", v)} placeholder="05X-XXXXXXX" type="tel" required />
              <Field label="אימייל" value={form.email} onChange={(v) => update("email", v)} placeholder="you@example.com" type="email" />
              <Field label="אזור / עיר פעילות" value={form.region} onChange={(v) => update("region", v)} placeholder="תל אביב, מרכז, צפון..." />
              <Field label="רישיון / ניסיון (אופציונלי)" value={form.license} onChange={(v) => update("license", v)} placeholder="רישיון יועץ, שנות ניסיון..." />
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">הערה / מידע נוסף</label>
                <textarea
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                  rows={3}
                  placeholder="כל מידע נוסף שיעזור לנו להכין גישה מותאמת"
                  className="w-full border border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 text-base text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 resize-none"
                />
              </div>
              {error && (
                <p role="alert" className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-bold text-red-700">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-violet-700 hover:bg-violet-800 px-6 py-4 font-black text-white transition-colors disabled:opacity-70"
              >
                {loading ? "שולח..." : "שלח בקשת גישה"}
              </button>
              <p className="text-center text-xs text-slate-500">הגישה ניתנת ליועצי משכנתאות בלבד</p>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
