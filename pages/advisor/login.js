import { useState } from "react";
import Head from "next/head";
import Link from "next/link";

export default function AdvisorLogin() {
  const [advisorId, setAdvisorId] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    const res = await fetch("/api/advisor/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ advisorId, token }),
    });
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setMessage(j?.message || "פרטי הכניסה שגויים. נסו שוב.");
    window.location.href = "/advisor";
  }

  return (
    <>
      <Head>
        <title>כניסה לפורטל הלידים | MortgAI</title>
        <meta name="robots" content="noindex" />
      </Head>

      <main dir="rtl" className="min-h-screen bg-gradient-to-b from-mort-ink to-slate-800 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Logo / Brand */}
          <div className="text-center mb-8">
            <Link href="/advisors" className="inline-block">
              <span className="text-2xl font-black text-white">MortgAI</span>
              <span className="block text-xs text-violet-400 font-bold mt-1">פורטל לידים למשכנתאות</span>
            </Link>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-luxury p-8">
            <div className="mb-7">
              <h1 className="text-2xl font-black text-mort-ink mb-1">כניסה לפורטל הלידים</h1>
              <p className="text-mort-muted text-sm">גישה למאגר לידים חמים מסוננים</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-black text-mort-text mb-1.5">מזהה יועץ</label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                  value={advisorId}
                  onChange={(e) => setAdvisorId(e.target.value)}
                  placeholder="הזינו את מזהה היועץ שלכם"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-black text-mort-text mb-1.5">סיסמה</label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              {message && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-bold">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-black py-3.5 rounded-xl transition-colors text-sm mt-2"
              >
                {loading ? "מתחבר..." : "כניסה לפורטל הלידים ←"}
              </button>
            </form>

            <p className="text-xs text-mort-muted mt-5 text-center">
              מזהה הגישה נקבע על ידי צוות MortgAI.{" "}
              <Link href="/advisors" className="text-violet-600 hover:underline font-bold">
                מידע על המערכת
              </Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
