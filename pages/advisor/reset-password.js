import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdvisorResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [tokenType, setTokenType] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Parse recovery token from URL hash (Supabase appends it after redirect)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    setAccessToken(params.get("access_token") || "");
    setTokenType(params.get("type") || "");
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("הסיסמה חייבת להכיל לפחות 8 תווים."); return; }
    if (password !== confirm) { setError("הסיסמאות אינן תואמות."); return; }
    if (!accessToken || tokenType !== "recovery") {
      setError("קישור שחזור לא תקין או שפג תוקפו. אנא בקשו קישור חדש.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/advisor/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.message || "שגיאה בעדכון הסיסמה. נסו שוב."); return; }
      setDone(true);
    } catch {
      setError("שגיאת חיבור. בדקו את החיבור לאינטרנט ונסו שוב.");
    } finally {
      setLoading(false);
    }
  }

  const invalidLink = !accessToken && typeof window !== "undefined";

  return (
    <>
      <Head>
        <title>הגדרת סיסמה חדשה | FINZO PRO</title>
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

          <div className="bg-white rounded-3xl shadow-2xl p-8">
            {done ? (
              <div className="text-center py-4">
                <div className="text-5xl mb-4">✅</div>
                <h1 className="text-xl font-black text-slate-950 mb-3">הסיסמה עודכנה בהצלחה</h1>
                <p className="text-slate-500 text-sm leading-6">כעת תוכלו להתחבר עם הסיסמה החדשה שלכם.</p>
                <Link href="/advisor/login" className="mt-8 inline-block w-full text-center bg-violet-700 hover:bg-violet-800 text-white font-black py-3.5 rounded-2xl transition-colors text-sm">
                  כניסה למערכת
                </Link>
              </div>
            ) : invalidLink ? (
              <div className="text-center py-4">
                <div className="text-5xl mb-4">⚠️</div>
                <h1 className="text-xl font-black text-slate-950 mb-3">קישור לא תקין</h1>
                <p className="text-slate-500 text-sm leading-6 mb-6">
                  הקישור אינו תקין או שפג תוקפו. אנא בקשו קישור שחזור חדש.
                </p>
                <Link href="/advisor/forgot-password" className="inline-block w-full text-center bg-violet-700 hover:bg-violet-800 text-white font-black py-3.5 rounded-2xl transition-colors text-sm">
                  בקשת קישור חדש
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-black text-slate-950 mb-1">הגדרת סיסמה חדשה</h1>
                  <p className="text-slate-500 text-sm">הזינו סיסמה חדשה לחשבונכם.</p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-black text-slate-700 mb-1.5">סיסמה חדשה</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      placeholder="לפחות 8 תווים"
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                      required
                      autoComplete="new-password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-black text-slate-700 mb-1.5">אימות סיסמה</label>
                    <input
                      type="password"
                      value={confirm}
                      onChange={(e) => { setConfirm(e.target.value); setError(""); }}
                      placeholder="הזינו שוב את הסיסמה"
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                      required
                      autoComplete="new-password"
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
                    {loading ? "שומר..." : "עדכון סיסמה"}
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
