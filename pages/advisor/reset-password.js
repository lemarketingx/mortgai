import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";

function parseHashParams() {
  if (typeof window === "undefined") return {};
  const hash = window.location.hash ? window.location.hash.slice(1) : "";
  const params = new URLSearchParams(hash);
  return {
    accessToken: params.get("access_token") || "",
    type: params.get("type") || "",
    error: params.get("error_description") || params.get("error") || "",
  };
}

export default function AdvisorResetPassword() {
  const [status, setStatus] = useState("checking"); // checking | ready | invalid | done
  const [accessToken, setAccessToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { accessToken: token, type, error: hashError } = parseHashParams();
    if (hashError) {
      setStatus("invalid");
      return;
    }
    if (token && type === "recovery") {
      setAccessToken(token);
      setStatus("ready");
      // Clear the token from the visible URL once captured
      if (window.history?.replaceState) {
        window.history.replaceState(null, "", window.location.pathname);
      }
      return;
    }
    setStatus("invalid");
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("הסיסמה חייבת להכיל לפחות 8 תווים.");
      return;
    }
    if (password !== confirmPassword) {
      setError("הסיסמאות אינן תואמות.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/advisor/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, password }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j?.message || "האיפוס נכשל. בקשו קישור חדש ונסו שוב.");
        return;
      }
      setStatus("done");
    } catch {
      setError("אירעה שגיאה. נסו שוב.");
    } finally {
      setLoading(false);
    }
  }

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
            {status === "checking" && (
              <div className="text-center py-6 text-slate-500 text-sm font-bold">בודק את הקישור...</div>
            )}

            {status === "invalid" && (
              <div className="text-center py-4">
                <div className="text-5xl mb-4">⚠️</div>
                <h1 className="text-xl font-black text-slate-950 mb-3">הקישור אינו תקף</h1>
                <p className="text-slate-500 text-sm leading-6">
                  ייתכן שהקישור פג תוקף או שכבר נעשה בו שימוש. ניתן לבקש קישור חדש לאיפוס סיסמה.
                </p>
                <Link href="/advisor/forgot-password" className="mt-6 inline-block bg-violet-700 hover:bg-violet-800 text-white font-black py-3 px-6 rounded-2xl transition-colors text-sm">
                  בקשת קישור חדש
                </Link>
              </div>
            )}

            {status === "done" && (
              <div className="text-center py-4">
                <div className="text-5xl mb-4">✅</div>
                <h1 className="text-xl font-black text-slate-950 mb-3">הסיסמה עודכנה בהצלחה</h1>
                <p className="text-slate-500 text-sm leading-6">כעת ניתן להתחבר עם הסיסמה החדשה.</p>
                <Link href="/advisor/login" className="mt-6 inline-block bg-violet-700 hover:bg-violet-800 text-white font-black py-3 px-6 rounded-2xl transition-colors text-sm">
                  מעבר לכניסה
                </Link>
              </div>
            )}

            {status === "ready" && (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-black text-slate-950 mb-1">הגדרת סיסמה חדשה</h1>
                  <p className="text-slate-500 text-sm">בחרו סיסמה חדשה לחשבון FINZO PRO שלכם.</p>
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
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-slate-700 mb-1.5">אימות סיסמה</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                      placeholder="הקלידו שוב את הסיסמה"
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                      autoComplete="new-password"
                      required
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
                    {loading ? "מעדכן..." : "עדכון סיסמה"}
                  </button>
                </form>
              </>
            )}

            <p className="text-xs text-slate-400 mt-6 text-center">
              <Link href="/advisor/login" className="text-violet-600 hover:underline font-bold">
                ← חזרה לכניסה
              </Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
