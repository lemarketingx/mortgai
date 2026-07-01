import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import BrandLogo from "../components/BrandLogo";

const INQUIRY_TYPES = [
  { value: "", label: "בחרו סוג פנייה" },
  { value: "general", label: "שאלה כללית על השירות" },
  { value: "privacy", label: "פנייה בנושא פרטיות / מחיקת מידע" },
  { value: "advisor", label: "פנייה של יועץ משכנתאות" },
  { value: "accessibility", label: "בעיית נגישות" },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", type: "", message: "" });
  const [sent, setSent] = useState(false);

  function buildMailto() {
    const subject = encodeURIComponent(`פנייה מאתר FINZO — ${INQUIRY_TYPES.find(t => t.value === form.type)?.label || "כללי"}`);
    const body = encodeURIComponent(`שם: ${form.name}\nאימייל: ${form.email}\n\n${form.message}`);
    return `mailto:lemarketingx@gmail.com?subject=${subject}&body=${body}`;
  }

  function handleSubmit(e) {
    e.preventDefault();
    window.location.href = buildMailto();
    setSent(true);
  }

  return (
    <>
      <Head>
        <title>יצירת קשר | FINZO</title>
        <meta name="description" content="יצירת קשר עם FINZO — לשאלות, בקשות פרטיות, ייעוץ ליועצים ובעיות נגישות." />
        <meta name="robots" content="index, follow" />
      </Head>
      <div dir="rtl" className="min-h-screen bg-white">
        <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            <Link href="/"><BrandLogo variant="public" mode="light" size="sm" /></Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-bold text-slate-500">יצירת קשר</span>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
          <h1 className="text-3xl font-black text-slate-900 sm:text-4xl">יצירת קשר</h1>
          <p className="mt-3 text-slate-600 font-semibold">
            תמיכה ניתנת דרך ערוצים דיגיטליים בלבד. נחזור אליכם תוך 1–3 ימי עסקים.
          </p>

          <div className="mt-4 rounded-2xl bg-violet-50 border border-violet-200 px-5 py-4 text-sm font-bold text-violet-800">
            כתובת אימייל ישירה:{" "}
            <a href="mailto:lemarketingx@gmail.com" className="text-violet-700 hover:underline">
              lemarketingx@gmail.com
            </a>
          </div>

          {sent ? (
            <div className="mt-8 rounded-[28px] border border-emerald-200 bg-emerald-50 p-8 text-center">
              <p className="text-2xl font-black text-emerald-800">הפנייה נשלחה</p>
              <p className="mt-2 text-sm font-semibold text-emerald-700">נפתחה אפליקציית הדואר האלקטרוני שלכם עם הפנייה.</p>
              <p className="mt-1 text-xs text-emerald-600">אם לא נפתח כלום, שלחו אלינו ישירות ל-lemarketingx@gmail.com</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-1.5">שם מלא</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-slate-200 bg-white rounded-2xl px-4 py-3 text-base text-slate-950 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 h-12"
                  placeholder="הכניסו את שמכם"
                />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-1.5">כתובת אימייל</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-slate-200 bg-white rounded-2xl px-4 py-3 text-base text-slate-950 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 h-12"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-1.5">סוג הפנייה</label>
                <select
                  required
                  value={form.type}
                  onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-slate-200 bg-white rounded-2xl px-4 py-3 text-base text-slate-950 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 h-12"
                >
                  {INQUIRY_TYPES.map(t => (
                    <option key={t.value} value={t.value} disabled={!t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-1.5">תוכן הפנייה</label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
                  className="w-full border border-slate-200 bg-white rounded-2xl px-4 py-3 text-base text-slate-950 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 resize-none"
                  placeholder="תארו את פנייתכם בפירוט..."
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-violet-700 hover:bg-violet-800 px-6 py-4 font-black text-white transition text-sm"
              >
                שלחו פנייה ←
              </button>
              <p className="text-center text-xs text-slate-400">
                לחיצה על הכפתור תפתח את אפליקציית הדואר האלקטרוני שלכם עם הפנייה המוכנה לשליחה.
              </p>
            </form>
          )}

          <div className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-400">
            <Link href="/" className="text-violet-700 hover:underline font-bold">← חזרה לעמוד הבית</Link>
          </div>
        </main>
      </div>
    </>
  );
}
