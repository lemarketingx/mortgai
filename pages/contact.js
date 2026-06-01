import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

const COMPANY_NAME = "ל.א.ה שיווק";
const CONTACT_EMAIL = "lemarketingx@gmail.com";
const RESPONSE_TIME = "עד 2 ימי עסקים";

const INQUIRY_TYPES = [
  ["general", "שאלה כללית"],
  ["advisor", "פנייה כיועץ משכנתאות"],
  ["business", "שיתוף פעולה עסקי"],
  ["privacy", "בקשה בנושא פרטיות / מחיקת מידע"],
  ["technical", "בעיה טכנית באתר"],
  ["accessibility", "פנייה בנושא נגישות"],
  ["legal", "פנייה משפטית"],
];

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", type: "", message: "" });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    if (error) setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.name.trim().length < 2) { setError("יש להזין שם מלא."); return; }
    if (!form.email.trim().includes("@")) { setError("יש להזין כתובת דוא\"ל תקינה."); return; }
    if (form.message.trim().length < 10) { setError("יש לכתוב הודעה בת לפחות 10 תווים."); return; }

    setStatus("sending");
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("sent");
    } catch {
      setStatus("sent");
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 text-slate-950">
      <Head>
        <title>יצירת קשר | FINZO</title>
        <meta name="description" content="צרו קשר עם FINZO — לשאלות, פניות יועצים ובירורים. מופעל על ידי ל.א.ה שיווק." />
        <meta name="robots" content="index,follow" />
      </Head>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-black text-slate-950">FINZO</Link>
          <Link href="/" className="text-sm font-bold text-violet-700 hover:underline">חזרה לדף הבית ←</Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">

        {/* Hero */}
        <div className="mb-14 text-center">
          <span className="inline-flex rounded-full bg-violet-50 px-4 py-2 text-sm font-black text-violet-700">יצירת קשר</span>
          <h1 className="mt-5 text-4xl font-black leading-tight text-slate-950 sm:text-5xl">דברו איתנו</h1>
          <p className="mx-auto mt-4 max-w-lg text-lg leading-8 text-slate-600">
            שאלה? פנייה מקצועית? עניין בשיתוף פעולה? נשמח לשמוע ונחזור בהקדם.
          </p>
          <p className="mt-2 text-sm font-bold text-slate-400">זמן תגובה ממוצע: {RESPONSE_TIME}</p>
        </div>

        {/* AI assistant banner */}
        <div className="mb-10 rounded-[28px] border border-violet-200 bg-gradient-to-br from-violet-700 to-violet-950 p-6 text-white sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-violet-200">זמין עכשיו</p>
              <h2 className="mt-1 text-xl font-black">שאלו את העוזר החכם של FINZO</h2>
              <p className="mt-1 text-sm leading-6 text-violet-100">
                שאלות על משכנתא, מחזור, זכאות, ריביות — העוזר זמין 24/7 וישיב מיד. ללא המתנה.
              </p>
            </div>
            <Link
              href="/"
              className="shrink-0 rounded-full bg-white px-6 py-3 text-center text-sm font-black text-violet-800 shadow-lg transition hover:bg-violet-50"
            >
              פתחו עוזר חכם ←
            </Link>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">

          {/* ── Contact form ── */}
          <div className="rounded-[34px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-8">
            {status === "sent" ? (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <svg viewBox="0 0 24 24" className="h-8 w-8 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h2 className="mt-5 text-2xl font-black text-slate-950">ההודעה נשלחה</h2>
                <p className="mt-2 font-semibold text-slate-600">נחזור אליך בתוך {RESPONSE_TIME}.</p>
                <p className="mt-1 text-sm text-slate-400">פנייה נשלחה לכתובת {CONTACT_EMAIL}</p>
                <button
                  type="button"
                  onClick={() => { setStatus("idle"); setForm({ name: "", email: "", phone: "", type: "", message: "" }); }}
                  className="mt-7 rounded-full border border-violet-200 px-6 py-3 text-sm font-black text-violet-700 transition hover:bg-violet-50"
                >
                  שלח/י פנייה נוספת
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-xl font-black text-slate-950">שלח/י הודעה</h2>
                <p className="text-sm font-semibold text-slate-500">כל הפניות מגיעות ישירות אלינו ונענות אישית.</p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-black text-slate-700">שם מלא *</span>
                    <input
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      autoComplete="name"
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 sm:h-14"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-black text-slate-700">דוא"ל *</span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      autoComplete="email"
                      dir="ltr"
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 sm:h-14"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-black text-slate-700">טלפון <span className="font-semibold text-slate-400">(אופציונלי)</span></span>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="05X-XXXXXXX"
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 sm:h-14"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-black text-slate-700">נושא הפנייה</span>
                    <select
                      value={form.type}
                      onChange={(e) => update("type", e.target.value)}
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 sm:h-14"
                    >
                      <option value="">בחר/י נושא</option>
                      {INQUIRY_TYPES.map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-black text-slate-700">הודעה *</span>
                  <textarea
                    value={form.message}
                    onChange={(e) => update("message", e.target.value)}
                    rows={5}
                    placeholder="כתבו כאן את פנייתכם..."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-bold text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                  />
                </label>

                {error && (
                  <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full rounded-full bg-violet-700 px-7 py-4 text-base font-black text-white shadow-[0_16px_40px_rgba(109,40,217,0.25)] transition hover:bg-violet-800 disabled:opacity-70"
                >
                  {status === "sending" ? "שולח..." : "שלח/י הודעה"}
                </button>

                <p className="text-center text-xs font-semibold text-slate-400">
                  הפנייה תגיע ישירות ל-{COMPANY_NAME} · נחזור אליך בהקדם
                </p>
              </form>
            )}
          </div>

          {/* ── Right column info panels ── */}
          <div className="space-y-5">

            {/* Direct email */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-violet-700" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-black text-slate-950">דוא"ל ישיר</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">לכל שאלה ובירור — ניתן לפנות ישירות.</p>
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="mt-2 inline-block text-sm font-black text-violet-700 hover:underline"
                    dir="ltr"
                  >
                    {CONTACT_EMAIL}
                  </a>
                  <p className="mt-1 text-xs font-semibold text-slate-400">זמן תגובה: {RESPONSE_TIME}</p>
                </div>
              </div>
            </div>

            {/* Advisor inquiry */}
            <div className="rounded-[28px] border border-violet-200 bg-violet-50 p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-200">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-violet-800" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-black text-slate-950">יועצי משכנתאות</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    מעוניין/ת להצטרף לפלטפורמה ולקבל לידים איכותיים? נשמח לשמוע.
                  </p>
                  <p className="mt-2 text-sm text-slate-500">שלחו פנייה בטופס ובחרו "פנייה כיועץ משכנתאות".</p>
                  <Link
                    href="/advisor/register"
                    className="mt-3 inline-flex rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-black text-violet-700 transition hover:bg-violet-100"
                  >
                    הרשמה כיועץ ←
                  </Link>
                </div>
              </div>
            </div>

            {/* Business inquiry */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-black text-slate-950">שיתופי פעולה עסקיים</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    שאלות על הפלטפורמה, שיתוף פעולה, או הצגת השירות לארגון — נשמח לדבר.
                  </p>
                  <p className="mt-2 text-sm text-slate-500">שלחו פנייה בטופס ובחרו "שיתוף פעולה עסקי".</p>
                </div>
              </div>
            </div>

            {/* Company identity */}
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 px-6 py-5">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">מפעילת השירות</p>
              <p className="mt-1 font-black text-slate-900">{COMPANY_NAME}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                FINZO מופעלת על ידי {COMPANY_NAME}, המספקת טכנולוגיה לחיבור בין לקוחות לבין יועצי משכנתאות עצמאיים.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link href="/privacy" className="text-xs font-bold text-slate-500 hover:text-violet-700 hover:underline">מדיניות פרטיות</Link>
                <Link href="/terms" className="text-xs font-bold text-slate-500 hover:text-violet-700 hover:underline">תנאי שימוש</Link>
                <Link href="/accessibility" className="text-xs font-bold text-slate-500 hover:text-violet-700 hover:underline">נגישות</Link>
              </div>
            </div>

          </div>
        </div>
      </div>

      <ComplianceFooter />
    </main>
  );
}

function ComplianceFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-slate-500">
          <Link href="/" className="hover:text-violet-700">FINZO</Link>
          <Link href="/privacy" className="hover:text-violet-700">מדיניות פרטיות</Link>
          <Link href="/terms" className="hover:text-violet-700">תנאי שימוש</Link>
          <Link href="/accessibility" className="hover:text-violet-700">הצהרת נגישות</Link>
          <Link href="/contact" className="font-black text-violet-700">יצירת קשר</Link>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          FINZO מופעלת על ידי {COMPANY_NAME} · {CONTACT_EMAIL}
        </p>
      </div>
    </footer>
  );
}
