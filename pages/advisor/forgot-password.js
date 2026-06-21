import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

export default function AdvisorForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) { setError("יש להזין כתובת אימייל תקינה."); return; }
    setError("");
    setLoading(true);
    try {
      await fetch("/api/advisor/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      // Always show success regardless of result — prevents email enumeration
      setSent(true);
    } catch {
      setSent(true); // Still show success — no network error revealed
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>איפוס סיסמה | FINZO PRO</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main dir="rtl" className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-800 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          <div className="text-center mb-8">
            <Link href="/advisors" className="inline-flex items-center gap-2.5">
              <span className="text-2xl font-black text-white">FINZO</span>
              <span className="text-sm font-black text-violet-400 bg-violet-400/10 border border-violet-400/30 px-2.5 py-0.5 rounded-full">PRO</span>
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8">
            {sent ? (
              <div className="text-center py-4">
                <div className="text-5xl mb-4">📧</div>
                <h1 className="text-xl font-black text-slate-950 dark:text-slate-100 mb-3">בדקו את תיבת הדוא״ל שלכם</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-6">
                  אם האימייל קיים במערכת, נשלח קישור לאיפוס סיסמה.
                </p>
                <Link href="/advisor/login" className="mt-8 inline-block text-sm font-bold text-violet-600 hover:underline">
                  ← חזרה לכניסה
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-black text-slate-950 mb-1">איפוס סיסמה</h1>
                  <p className="text-slate-500 text-sm">הזינו את כתובת האימייל המשויכת לחשבון שלכם.</p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-black text-slate-700 mb-1.5">אימייל</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      placeholder="you@example.com"
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                      required
                      autoComplete="email"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700 font-bold">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-violet-700 hover:bg-violet-800 disabled:opacity-60 text-white font-black py-3.5 rounded-2xl transition-colors text-sm"
                  >
                    {loading ? "שולח..." : "שלח קישור לאיפוס סיסמה"}
                  </button>
                </form>

                <p className="text-xs text-slate-400 mt-6 text-center">
                  <Link href="/advisor/login" className="text-violet-600 hover:underline font-bold">
                    ← חזרה לכניסה
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
