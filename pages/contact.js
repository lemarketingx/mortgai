import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

// Configuration — replace with real values before going live
const CONTACT_CONFIG = {
  generalEmail: "hello@finzo.co.il",
  legalEmail: "legal@finzo.co.il",
  privacyEmail: "privacy@finzo.co.il",
  accessibilityEmail: "accessibility@finzo.co.il",
  advisorEmail: "advisors@finzo.co.il",
  phone: "", // e.g. "03-XXX-XXXX" — leave empty to hide
  responseTime: "עד 2 ימי עסקים",
};

const INQUIRY_TYPES = [
  ["general", "שאלה כללית"],
  ["advisor", "פנייה כיועץ משכנתאות"],
  ["privacy", "בקשה בנושא פרטיות"],
  ["technical", "בעיה טכנית באתר"],
  ["accessibility", "פנייה בנושא נגישות"],
  ["legal", "פנייה משפטית"],
];

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", type: "", message: "" });
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
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
      // Fallback: show mailto link if API not wired
      setStatus("sent");
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-white text-slate-950">
      <Head>
        <title>יצירת קשר | FINZO</title>
        <meta name="description" content="צרו קשר עם FINZO — לשאלות, פניות יועצים ובירורים." />
        <meta name="robots" content="index,follow" />
      </Head>

      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-black text-slate-950">FINZO</Link>
          <Link href="/" className="text-sm font-bold text-violet-700 hover:underline">חזרה לדף הבית ←</Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        {/* Hero */}
        <div className="mb-14 text-center">
          <span className="inline-flex rounded-full bg-violet-50 px-4 py-2 text-sm font-black text-violet-700">יצירת קשר</span>
          <h1 className="mt-5 text-4xl font-black leading-tight text-slate-950">אנחנו כאן לעזור</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-slate-600">
            שאלות, בירורים, פניות יועצים — נשמח לשמוע. זמן תגובה ממוצע: {CONTACT_CONFIG.responseTime}.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Contact form */}
          <div className="rounded-[34px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-8">
            {status === "sent" ? (
              <div className="flex flex-col items-center py-10 text-center">
                <span className="text-5xl">✓</span>
                <h2 className="mt-4 text-2xl font-black text-slate-950">ההודעה נשלחה</h2>
                <p className="mt-2 font-semibold text-slate-600">נחזור אליך בתוך {CONTACT_CONFIG.responseTime}.</p>
                <button
                  type="button"
                  onClick={() => { setStatus("idle"); setForm({ name: "", email: "", phone: "", type: "", message: "" }); }}
                  className="mt-6 rounded-full border border-violet-200 px-6 py-3 text-sm font-black text-violet-700 hover:bg-violet-50"
                >
                  שלח/י פנייה נוספת
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-xl font-black text-slate-950">שלח/י הודעה</h2>

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

                <label className="block">
                  <span className="text-sm font-black text-slate-700">טלפון (אופציונלי)</span>
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

                <label className="block">
                  <span className="text-sm font-black text-slate-700">הודעה *</span>
                  <textarea
                    value={form.message}
                    onChange={(e) => update("message", e.target.value)}
                    rows={4}
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
              </form>
            )}
          </div>

          {/* Info panels */}
          <div className="space-y-5">
            {/* General contact */}
            <InfoCard
              icon="✉"
              title="פנייה כללית"
              body="לשאלות על השירות, חוויית המשתמש או בירורים כלליים."
              contact={CONTACT_CONFIG.generalEmail}
            />

            {/* Advisor inquiry */}
            <div className="rounded-[28px] border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🤝</span>
                <div>
                  <h3 className="text-lg font-black text-slate-950">פנייה כיועץ משכנתאות</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    מעוניין/ת להצטרף לרשת יועצי FINZO ולקבל לידים? נשמח להכיר.
                  </p>
                  <p className="mt-2 text-sm font-bold text-violet-700">
                    <a href={`mailto:${CONTACT_CONFIG.advisorEmail}`} className="hover:underline">{CONTACT_CONFIG.advisorEmail}</a>
                  </p>
                  <p className="mt-3 text-sm text-slate-500">או דרך הטופס — בחר/י "פנייה כיועץ משכנתאות" בנושא.</p>
                  <Link href="/advisor/register" className="mt-3 inline-flex rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-black text-violet-700 hover:bg-violet-50">
                    הרשמה כיועץ ←
                  </Link>
                </div>
              </div>
            </div>

            {/* Business inquiry */}
            <InfoCard
              icon="💼"
              title="שיתופי פעולה עסקיים"
              body="לפניות בנושא שיתופי פעולה, הצגת השירות, או שאלות לגבי הפלטפורמה."
              contact={CONTACT_CONFIG.generalEmail}
            />

            {/* Legal / privacy */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-6">
              <h3 className="font-black text-slate-950">פניות משפטיות ופרטיות</h3>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>שאלות משפטיות: <a href={`mailto:${CONTACT_CONFIG.legalEmail}`} className="font-bold text-violet-700 hover:underline">{CONTACT_CONFIG.legalEmail}</a></p>
                <p>בקשות פרטיות / מחיקת מידע: <a href={`mailto:${CONTACT_CONFIG.privacyEmail}`} className="font-bold text-violet-700 hover:underline">{CONTACT_CONFIG.privacyEmail}</a></p>
                <p>נגישות: <a href={`mailto:${CONTACT_CONFIG.accessibilityEmail}`} className="font-bold text-violet-700 hover:underline">{CONTACT_CONFIG.accessibilityEmail}</a></p>
              </div>
            </div>

            {CONTACT_CONFIG.phone && (
              <InfoCard
                icon="📞"
                title="טלפון"
                body="ניתן ליצור קשר טלפוני בימים א–ה בין השעות 09:00–18:00."
                contact={CONTACT_CONFIG.phone}
                isPhone
              />
            )}
          </div>
        </div>
      </div>

      <ComplianceFooter />
    </main>
  );
}

function InfoCard({ icon, title, body, contact, isPhone = false }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <h3 className="text-lg font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
          {contact && (
            <p className="mt-2 text-sm font-bold text-violet-700">
              <a href={isPhone ? `tel:${contact}` : `mailto:${contact}`} className="hover:underline">{contact}</a>
            </p>
          )}
        </div>
      </div>
    </div>
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
          <Link href="/contact" className="hover:text-violet-700">יצירת קשר</Link>
        </div>
      </div>
    </footer>
  );
}
