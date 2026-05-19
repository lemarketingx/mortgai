import Head from "next/head";
import Link from "next/link";
import { canonicalUrl } from "../lib/seo";

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "מתחברים לחנות הלידים",
    body: "נרשמים לפלטפורמה ומקבלים גישה לפורטל. ניתן לראות את הלידים הזמינים בזמן אמת.",
  },
  {
    n: "02",
    title: "בוחרים ליד לפי פרטים חלקיים",
    body: "לפני רכישה רואים: עיר, סכום משכנתא, מחיר נכס, ציון אישור ואיכות ליד. שם וטלפון נחשפים לאחר רכישה בלבד.",
  },
  {
    n: "03",
    title: "רוכשים ליד — רגיל או בלעדי",
    body: "ליד רגיל מאפשר מספר מוגבל של יועצים לרכוש אותו. ליד בלעדי נמכר ליועץ אחד בלבד ונחסם לרכישה נוספת.",
  },
  {
    n: "04",
    title: "מנהלים לידים שנרכשו בפורטל",
    body: "כל הלידים שרכשתם מנוהלים בפורטל: פרטי קשר מלאים, סטטוס, הערות פנימיות ומועד מעקב.",
  },
];

const TRUST_BULLETS = [
  "כל ליד עובר סינון אוטומטי לפי יחס החזר, הון עצמי ואיכות לפני שנכנס לחנות",
  "לידים חלשים לא מוצגים בחנות — רק חמים ובינוניים",
  "פרטי יצירת קשר (שם וטלפון) נחשפים אך ורק לאחר רכישה",
  "ניתן לראות מידע חלקי לפני החלטת הרכישה",
  "ללא מנוי חודשי — משלמים רק על לידים שרכשתם בפועל",
  "פורטל ניהול מלא: סטטוס, הערות, מועד מעקב ופרטי קשר",
];

const LEAD_TYPES = [
  { emoji: "🏠", title: "דירה ראשונה", sub: "רוכשים עם LTV עד 75%, הון עצמי מתגבש — ליד פעיל עם מוטיבציה גבוהה" },
  { emoji: "🔄", title: "מחזור משכנתא", sub: "לווים קיימים שבודקים חיסכון — ליד עם מוכנות גבוהה לפעולה" },
  { emoji: "⬆️", title: "משפרי דיור", sub: "מוכרים דירה וקונים חדשה — עסקאות גדולות, לרוב עם הון עצמי" },
  { emoji: "💑", title: "זוגות צעירים", sub: "מוטיבציה גבוהה, זכאות לתוכניות מדינה — ליד פעיל בשלב מוקדם" },
];

export default function AdvisorsLanding() {
  return (
    <>
      <Head>
        <title>חנות לידים ליועצי משכנתאות | FINZO</title>
        <meta name="description" content="פלטפורמת לידים ליועצי משכנתאות — צפייה בלידים זמינים, רכישת ליד רגיל או בלעדי, ניהול לידים בפורטל מובנה." />
        <meta name="robots" content="noindex,nofollow" />
        <link rel="canonical" href={canonicalUrl("/advisors")} />
      </Head>

      <main dir="rtl" className="min-h-screen bg-slate-50">

        {/* ── Header ── */}
        <header className="bg-slate-950 text-white">
          <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
            <div>
              <span className="text-xl font-black tracking-tight">FINZO</span>
              <span className="text-xs text-violet-400 font-bold mr-3">חנות לידים</span>
            </div>
            <Link href="/advisor/login" className="text-sm font-black text-white bg-violet-600 hover:bg-violet-500 px-5 py-2.5 rounded-full transition-colors">
              כניסה לפורטל ←
            </Link>
          </div>
        </header>

        {/* ── Hero ── */}
        <section className="bg-slate-950 text-white pb-16 pt-12">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <span className="inline-flex rounded-full bg-violet-900/60 border border-violet-700/60 px-4 py-1.5 text-sm font-black text-violet-300 mb-6">
              ליועצי משכנתאות בלבד
            </span>
            <h1 className="text-4xl font-black leading-tight sm:text-5xl">
              חנות לידים למשכנתאות
            </h1>
            <p className="mt-5 text-lg text-slate-300 leading-8 max-w-xl mx-auto">
              גלשו בלידים זמינים, ראו מידע חלקי לפני רכישה, ורכשו ליד רגיל או בלעדי. כל הלידים עברו סינון אוטומטי לפי יחס החזר, הון עצמי ואיכות.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/advisor/login" className="rounded-full bg-violet-600 hover:bg-violet-500 px-8 py-4 font-black text-white transition-colors">
                כניסה לחנות הלידים
              </Link>
              <Link href="/advisor/register" className="rounded-full bg-white/10 hover:bg-white/15 border border-white/20 px-8 py-4 font-black text-white transition-colors">
                בקשת גישה
              </Link>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-black text-slate-950 text-center mb-10">איך זה עובד</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.n} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <p className="text-sm font-black text-violet-600 mb-2">{step.n}</p>
                <h3 className="text-lg font-black text-slate-950 mb-2">{step.title}</h3>
                <p className="text-slate-600 leading-7">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Purchase types ── */}
        <section className="bg-white border-y border-slate-200 py-14">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl font-black text-slate-950 text-center mb-8">אפשרויות רכישה</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="border border-slate-200 rounded-2xl p-7 shadow-sm">
                <p className="text-sm font-black text-slate-500 mb-1">ליד רגיל</p>
                <h3 className="text-xl font-black text-slate-950">גישה לפרטי הליד</h3>
                <p className="mt-3 text-slate-600 leading-7">לאחר רכישה תקבלו גישה לשם, טלפון ופרטי קשר מלאים. ליד רגיל יכול להיות זמין למספר מוגבל של יועצים.</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2"><span className="text-emerald-500 font-black">✓</span> שם וטלפון מלאים</li>
                  <li className="flex items-center gap-2"><span className="text-emerald-500 font-black">✓</span> כל פרטי הליד</li>
                  <li className="flex items-center gap-2"><span className="text-emerald-500 font-black">✓</span> ניהול בפורטל</li>
                </ul>
              </div>
              <div className="bg-violet-950 border border-violet-800 rounded-2xl p-7 shadow-sm text-white">
                <p className="text-sm font-black text-violet-300 mb-1">ליד בלעדי</p>
                <h3 className="text-xl font-black">גישה מלאה — יועץ אחד בלבד</h3>
                <p className="mt-3 text-violet-100 leading-7">ליד בלעדי נמכר ליועץ אחד בלבד. לאחר רכישה הליד נחסם ולא ניתן לרכישה על ידי יועצים אחרים.</p>
                <ul className="mt-4 space-y-2 text-sm text-violet-100">
                  <li className="flex items-center gap-2"><span className="text-violet-300 font-black">✓</span> שם וטלפון מלאים</li>
                  <li className="flex items-center gap-2"><span className="text-violet-300 font-black">✓</span> ליד ייחודי לך בלבד</li>
                  <li className="flex items-center gap-2"><span className="text-violet-300 font-black">✓</span> ניהול בפורטל</li>
                  <li className="flex items-center gap-2"><span className="text-violet-300 font-black">✓</span> לא יימכר ליועץ נוסף</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Lead types ── */}
        <section className="max-w-5xl mx-auto px-4 py-14">
          <h2 className="text-2xl font-black text-slate-950 text-center mb-8">סוגי לידים בחנות</h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {LEAD_TYPES.map((t) => (
              <div key={t.title} className="rounded-2xl bg-violet-50 border border-violet-100 p-5">
                <p className="text-2xl mb-2">{t.emoji}</p>
                <p className="font-black text-slate-950">{t.title}</p>
                <p className="mt-1.5 text-sm text-slate-600 leading-6">{t.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Trust bullets ── */}
        <section className="bg-slate-100/60 border-y border-slate-200 py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-xl font-black text-slate-950 text-center mb-7">על הלידים ועל הפלטפורמה</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {TRUST_BULLETS.map((b) => (
                <div key={b} className="flex items-start gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm">
                  <span className="text-violet-600 font-black shrink-0 mt-0.5">✓</span>
                  <span className="text-slate-700 font-bold leading-6">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-black text-slate-950">מעוניינים בגישה לחנות הלידים?</h2>
          <p className="mt-3 text-slate-600">כבר יש לכם חשבון? התחברו לפורטל. אין? שלחו בקשת גישה ונחזור אליכם.</p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/advisor/login" className="rounded-full bg-violet-700 hover:bg-violet-800 px-8 py-4 font-black text-white transition-colors">
              כניסה לפורטל
            </Link>
            <Link href="/advisor/register" className="rounded-full border border-violet-200 bg-violet-50 hover:bg-violet-100 px-8 py-4 font-black text-violet-800 transition-colors">
              בקשת גישה
            </Link>
          </div>
        </section>

        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          <p>FINZO — פלטפורמת לידים למשכנתאות | מערכת זו מיועדת ליועצי משכנתאות בלבד</p>
        </footer>

      </main>
    </>
  );
}
