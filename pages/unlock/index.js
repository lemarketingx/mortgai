import Head from "next/head";
import { useRouter } from "next/router";
import BrandLogo from "../../components/BrandLogo";

export default function UnlockPage() {
  const { query } = useRouter();
  const hasError = query.error === "1";
  const isMisconfigured = query.error === "2";
  const next = query.next || "/";

  return (
    <>
      <Head>
        <title>FINZO — כניסה</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main
        dir="rtl"
        lang="he"
        className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 flex flex-col items-center justify-center px-4 py-12"
      >
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2.5">
            <BrandLogo variant="public" mode="dark" size="lg" />
            <span className="text-sm font-black text-violet-400 bg-violet-400/10 border border-violet-400/30 px-2.5 py-0.5 rounded-full">
              Beta
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Card header */}
          <div className="bg-gradient-to-l from-violet-700 to-violet-900 px-7 py-6">
            <h1 className="text-lg font-black text-white leading-snug">
              FINZO נמצאת בשדרוג
            </h1>
            <p className="mt-1.5 text-sm font-medium text-violet-200 leading-relaxed">
              המערכת נמצאת כעת בשיפור ובבדיקות לפני השקה.
              הכניסה זמנית למורשים בלבד.
            </p>
          </div>

          {/* Form */}
          <form action="/api/unlock" method="POST" className="px-7 py-6 space-y-4">
            <input type="hidden" name="next" value={next} />

            <div>
              <label
                htmlFor="unlock-password"
                className="block text-sm font-black text-slate-700 mb-1.5"
              >
                סיסמה
              </label>
              <input
                id="unlock-password"
                type="password"
                name="password"
                autoComplete="current-password"
                autoFocus
                required
                placeholder="הזינו סיסמת כניסה"
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white placeholder-slate-400"
              />
            </div>

            {hasError && (
              <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-bold text-red-700">
                סיסמה שגויה
              </div>
            )}

            {isMisconfigured && (
              <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-bold text-red-700">
                שגיאת הגדרות שרת — לא ניתן לאמת סיסמה כעת
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-violet-700 hover:bg-violet-800 active:bg-violet-900 text-white font-black py-3.5 rounded-2xl transition-colors text-sm"
            >
              כניסה
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-8 text-xs font-bold text-slate-500">FINZO Beta</p>
      </main>
    </>
  );
}
