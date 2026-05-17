import Head from "next/head";
import { useState } from "react";
import BrandLogo from "../components/BrandLogo";

const benefits = [
  "לידים עם נתונים פיננסיים",
  "מקור ליד ברור",
  "סיכוי זכאות ראשוני",
  "פרטי קשר מלאים",
  "אפשרות לשיוך וניהול ב־CRM",
];

export default function AdvisorsPage() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    area: "",
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
  };

  return (
    <>
      <Head>
        <title>Finzo ליועצי משכנתאות | קבלו לידים איכותיים</title>
        <meta name="description" content="עמוד B2B ליועצי משכנתאות: קבלת לידים איכותיים עם נתונים פיננסיים ופרטי קשר מלאים." />
      </Head>

      <main className="bg-slate-50" dir="rtl">
        <section className="bg-gradient-to-br from-slate-950 via-violet-950 to-violet-900 py-16 text-white sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <BrandLogo withTagline={false} />
            <h1 className="mt-8 text-3xl font-black leading-tight sm:text-5xl">קבלו לידים איכותיים למשכנתאות</h1>
            <p className="mt-4 max-w-3xl text-base font-semibold leading-8 text-violet-100 sm:text-lg">
              Finzo מרכזת פניות איכות של בדיקת זכאות למשכנתא ושל בדיקת עלויות עסקה, ומחברת בינן לבין יועצי משכנתאות שמחפשים לקוחות רלוונטיים.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[1.2fr,1fr] lg:items-start">
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
              <h2 className="text-2xl font-black text-slate-950">מה מקבלים בפלטפורמה</h2>
              <p className="mt-3 text-base font-semibold leading-7 text-slate-600">
                כל ליד נבנה מפנייה אמיתית של משתמש עם צורך ממשי, כולל הקשר ברור לסוג השירות הנדרש.
              </p>
              <ul className="mt-6 space-y-3">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3 rounded-2xl bg-emerald-50 px-4 py-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-600 text-sm font-black text-white">✓</span>
                    <span className="text-sm font-black text-emerald-900 sm:text-base">{benefit}</span>
                  </li>
                ))}
              </ul>
            </article>

            <aside className="rounded-[28px] border border-violet-200 bg-white p-6 shadow-soft sm:p-8">
              <h2 className="text-2xl font-black text-slate-950">השאירו פרטים ונחזור אליכם</h2>
              <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
                <Field label="שם" value={formData.name} onChange={(value) => handleChange("name", value)} autoComplete="name" required />
                <Field label="טלפון" value={formData.phone} onChange={(value) => handleChange("phone", value)} autoComplete="tel" required />
                <Field label="אימייל" value={formData.email} onChange={(value) => handleChange("email", value)} autoComplete="email" type="email" required />
                <Field label="אזור פעילות" value={formData.area} onChange={(value) => handleChange("area", value)} autoComplete="address-level1" required />
                <button type="submit" className="mt-2 min-h-12 rounded-full bg-violet-700 px-6 py-3 text-sm font-black text-white transition hover:bg-violet-800">
                  שליחה
                </button>
              </form>
              <p className="mt-4 text-xs font-bold leading-5 text-slate-500">* אין התחייבות לסגירת עסקה. איכות ליד תלויה בהתאמה, זמינות ומשך טיפול.</p>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}

function Field({ label, value, onChange, type = "text", autoComplete, required = false }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-slate-700">{label}{required ? " *" : ""}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
      />
    </label>
  );
}
