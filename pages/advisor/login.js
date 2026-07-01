import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import BrandLogo from "../../components/BrandLogo";

export default function AdvisorLogin() {
  const router = useRouter();
  const { error: oauthError } = router.query;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(
    oauthError === "oauth_cancelled" ? "" :
    oauthError === "session_expired" ? "פג תוקף הבקשה. נסו שוב." :
    oauthError ? "כניסה עם OAuth נכשלה. נסו שוב." : "",
  );
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMessage("");
    if (!email.trim() || !password) { setMessage("יש להזין אימייל וסיסמה."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/advisor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setMessage(j?.message || "אימייל או סיסמה שגויים."); return; }
      // Seed localStorage so the header avatar can show real initials immediately
      try {
        const existing = JSON.parse(localStorage.getItem("finzo_advisor_profile_v1") || "{}");
        const merged = {
          ...existing,
          email: email.trim(),
          ...(j?.advisor?.name ? { name: j.advisor.name } : {}),
        };
        localStorage.setItem("finzo_advisor_profile_v1", JSON.stringify(merged));
      } catch {}
      router.push("/advisor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>כניסה ל־FINZO PRO</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main dir="rtl" className="min-h-screen bg-gradient-to-b from-[#0B132B] via-slate-950 to-slate-900 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          <div className="text-center mb-8">
            <Link href="/advisors" className="inline-flex justify-center">
              <BrandLogo variant="advisor" mode="dark" size="lg" withTagline />
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-black text-slate-950 dark:text-slate-100 mb-1">כניסה לחשבון</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">ברוכים הבאים חזרה ל־FINZO PRO.</p>
            </div>

            {/* OAuth buttons — requires Supabase Dashboard setup (see /api/advisor/auth/[provider].js) */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <a
                href="/api/advisor/auth/google"
                className="flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </a>
              <a
                href="/api/advisor/auth/facebook"
                className="flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </a>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">או כניסה עם אימייל</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-1.5">אימייל</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white dark:bg-slate-800 dark:text-slate-100"
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-black text-slate-700 dark:text-slate-300">סיסמה</label>
                  <Link href="/advisor/forgot-password" className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline">
                    שכחתי סיסמה
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white dark:bg-slate-800 dark:text-slate-100 pl-14"
                    required
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
              </div>

              {message && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-2xl px-4 py-3 text-sm text-red-700 dark:text-red-400 font-bold">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#7B3DFF] to-[#FF2EA6] hover:opacity-95 disabled:opacity-60 text-white font-black py-3.5 rounded-2xl transition-colors text-sm shadow-[0_16px_36px_rgba(123,61,255,0.26)]"
              >
                {loading ? "מתחבר..." : "כניסה ←"}
              </button>
            </form>

            <p className="text-xs text-slate-400 dark:text-slate-500 mt-6 text-center">
              עדיין אין לכם חשבון?{" "}
              <Link href="/advisor/register" className="text-violet-600 dark:text-violet-400 hover:underline font-bold">
                פתיחת חשבון ב־FINZO PRO
              </Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
