import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/router";
import BrandLogo from "../../components/BrandLogo";

const ADVISOR_TYPES = ["", "יועץ עצמאי", "משרד יועצים", "אחר"];

function Field({ label, value, onChange, placeholder = "", type = "text", required = false, hint = "" }) {
  return (
    <div>
      <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
        {required && <span className="text-red-500 dark:text-red-400 mr-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={type === "email" ? "email" : type === "password" ? "new-password" : "off"}
        className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 rounded-2xl px-4 py-3 text-base text-slate-950 dark:text-slate-100 outline-none transition focus:border-violet-400 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-violet-100 h-12"
      />
      {hint && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-bold">{hint}</p>}
    </div>
  );
}

export default function AdvisorRegister() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "", phone: "", email: "",
    password: "", region: "",
    businessName: "", advisorType: "",
    terms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    if (error) setError("");
  }

  async function submit(e) {
    e.preventDefault();
    if (loading) return;

    if (form.fullName.trim().length < 2) { setError("יש להזין שם מלא (לפחות 2 תווים)."); return; }
    if (form.phone.trim().length < 9) { setError("יש להזין מספר טלפון תקין."); return; }
    if (!form.email.trim() || !form.email.includes("@")) { setError("יש להזין כתובת אימייל תקינה."); return; }
    if (form.password.length < 8) { setError("הסיסמה חייבת להכיל לפחות 8 תווים."); return; }
    if (!form.terms) { setError("יש לאשר את תנאי השימוש."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/advisor/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.message || "הרשמה נכשלה. נסו שוב.");
        return;
      }
      // Auto-login: session cookie set by server → redirect to lead store
      router.push("/advisor/leads");
    } catch {
      setError("שגיאת רשת. בדקו את החיבור ונסו שוב.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>פתיחת חשבון ב־FINZO PRO</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <header className="bg-[#0B132B] text-white px-4 py-5">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Link href="/advisors" className="flex items-center gap-2.5">
              <BrandLogo variant="advisor" mode="dark" size="sm" withTagline={false} />
            </Link>
            <Link href="/advisor/login" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">
              כניסה לחשבון קיים ←
            </Link>
          </div>
        </header>

        <div className="max-w-xl mx-auto px-4 py-12">
          <div className="mb-8 flex justify-center">
            <BrandLogo variant="advisor" mode="light" size="md" withTagline />
          </div>

          <form onSubmit={submit} className="space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-7 shadow-sm">
            <div className="pb-2">
              <h1 className="text-3xl font-black text-slate-950 dark:text-slate-100">פתיחת חשבון יועץ</h1>
              <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm leading-6">
                גישה מיידית לחנות לידים, ניהול לקוחות ופורטל יועצים.
              </p>
            </div>

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
              required
            />
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-black text-slate-700 dark:text-slate-300">
                  סיסמה<span className="text-red-500 dark:text-red-400 mr-1">*</span>
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="לפחות 8 תווים"
                  autoComplete="new-password"
                  className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 rounded-2xl px-4 py-3 text-base text-slate-950 dark:text-slate-100 outline-none transition focus:border-violet-400 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-violet-100 h-12 pl-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showPassword ? "הסתר" : "הצג"}
                </button>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-bold">לפחות 8 תווים</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="עיר / אזור פעילות"
                value={form.region}
                onChange={(v) => update("region", v)}
                placeholder="תל אביב, מרכז..."
              />
              <Field
                label="שם העסק (אופציונלי)"
                value={form.businessName}
                onChange={(v) => update("businessName", v)}
                placeholder="שם המשרד"
              />
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-1.5">סוג פעילות</label>
              <select
                value={form.advisorType}
                onChange={(e) => update("advisorType", e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 rounded-2xl px-4 py-3 text-base text-slate-950 dark:text-slate-100 outline-none transition focus:border-violet-400 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-violet-100 h-12"
              >
                {ADVISOR_TYPES.map((o) => <option key={o} value={o}>{o || "בחרו..."}</option>)}
              </select>
            </div>

            <label className="flex items-start gap-3 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={form.terms}
                onChange={(e) => update("terms", e.target.checked)}
                className="mt-1 w-4 h-4 accent-violet-600 shrink-0"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400 font-bold leading-6">
                קראתי ואני מסכים/ה ל
                <a href="/advisor/terms" target="_blank" rel="noopener noreferrer" className="text-violet-600 dark:text-violet-400 hover:underline">תנאי השימוש של FINZO PRO</a>
                <span className="text-red-500 dark:text-red-400 mr-1">*</span>
              </span>
            </label>

            {error && (
              <p role="alert" className="rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-4 py-3 text-sm font-bold text-red-700 dark:text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-gradient-to-r from-[#7B3DFF] to-[#FF2EA6] hover:opacity-95 px-6 py-4 font-black text-white transition-colors disabled:opacity-70 text-sm shadow-[0_16px_36px_rgba(123,61,255,0.22)]"
            >
              {loading ? "יוצר חשבון..." : "פתיחת חשבון ב־FINZO PRO ←"}
            </button>

            <p className="text-center text-xs text-slate-400 dark:text-slate-500">
              כבר יש לכם חשבון?{" "}
              <Link href="/advisor/login" className="text-violet-600 dark:text-violet-400 hover:underline font-bold">
                כניסה לפורטל
              </Link>
            </p>
          </form>
        </div>
      </main>
    </>
  );
}
