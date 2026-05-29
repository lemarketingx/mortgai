import Head from "next/head";
import Link from "next/link";
import { canonicalUrl, stringifyJsonLd, breadcrumbSchema, absoluteUrl } from "../lib/seo";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mortgai-gxjc.vercel.app";

const stats = [
  { value: "200+", label: "לידים בחודש" },
  { value: "78%", label: "לידים חמים ובינוניים" },
  { value: "3 שעות", label: "זמן תגובה ממוצע" },
  { value: "4 שלבי", label: "סינון לכל ליד" },
];

const steps = [
  {
    n: "01",
    title: "משתמשים ממלאים את המחשבון",
    body: "רוכשי דירה פוטנציאליים ממלאים את מחשבון הזכאות של MortgAI — הכנסה, הון עצמי, יחס החזר ומצב חוזי.",
  },
  {
    n: "02",
    title: "המערכת מסננת ומדרגת",
    body: "אלגוריתם הניקוד מנתח 8 פרמטרים ומסווג כל ליד: חם / בינוני / חלש. לידים חלשים לא מועברים.",
  },
  {
    n: "03",
    title: "הליד מגיע אליכם בזמן אמת",
    body: "תוך דקות ממילוי הטופס הליד מועבר לפורטל שלכם עם כל הנתונים: סכום, עיר, הכנסה, אחוז אישור.",
  },
];

const filters = [
  { icon: "📊", title: "יחס החזר", body: "מחושב לפי הכנסה נטו + כל ההתחייבויות הקיימות — לא רק המשכורת." },
  { icon: "🏦", title: "הון עצמי", body: "נבדק LTV צפוי. לידים עם הון עצמי נמוך מדי מסוננים מראש." },
  { icon: "💼", title: "יציבות תעסוקתית", body: "שכיר / עצמאי / לא יציב — משפיע על ציון הליד." },
  { icon: "📋", title: "מצב חוזי", body: "האם יש חוזה חתום? מבקש? בשלב חיפוש? מספק הקשר לדחיפות." },
];

const leadTypes = [
  { emoji: "🏠", title: "דירה ראשונה", sub: "רוכשים עם LTV עד 75%, לרוב זוגות צעירים עם הון עצמי מתגבש" },
  { emoji: "🔄", title: "מחזור משכנתא", sub: "לווים קיימים שבודקים חיסכון — ליד חם עם מוטיבציה גבוהה" },
  { emoji: "⬆️", title: "משפרי דיור", sub: "מוכרים דירה וקונים חדשה — עסקאות גדולות, לרוב עם הון עצמי" },
  { emoji: "💑", title: "זוגות צעירים", sub: "מוטיבציה גבוהה, לעיתים זכאות לתוכניות מדינה — ליד פעיל" },
];

const regions = ["תל אביב והמרכז", "ירושלים", "חיפה והצפון", "באר שבע והנגב", "השרון", "שפלה", "מודיעין"];

const trustItems = [
  "כל ליד עובר ניקוד אוטומטי לפני העברה",
  "ממשק נקי עם כל נתוני הליד",
  "גישה 24/7 לפורטל הלידים",
  "ללא עמלת תיווך — תשלום ישיר על ליד",
];

export default function AdvisorsPage() {
  const schema = breadcrumbSchema([
    { name: "דף הבית", path: "/" },
    { name: "לידים למשכנתאות", path: "/advisors" },
  ]);

  return (
    <>
      <Head>
        <title>לידים למשכנתאות ליועצים | MortgAI — מערכת לידים מסוננים</title>
        <meta
          name="description"
          content="MortgAI מספקת ליועצי משכנתאות לידים חמים ומסוננים: דירה ראשונה, מחזור, משפרי דיור. כל ליד עם ניקוד איכות, נתוני הכנסה וסטטוס חוזי."
        />
        <link rel="canonical" href={canonicalUrl("/advisors")} />
        <meta property="og:title" content="לידים למשכנתאות | MortgAI" />
        <meta property="og:description" content="מערכת לידים מסוננים ליועצי משכנתאות — חמים, מדורגים, בזמן אמת." />
        <meta property="og:url" content={absoluteUrl("/advisors")} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: stringifyJsonLd(schema) }} />
      </Head>

      <main dir="rtl" className="bg-white">

        {/* ── Hero ── */}
        <section className="bg-gradient-to-b from-mort-ink via-slate-800 to-slate-900 text-white pt-16 pb-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-block text-xs font-black text-violet-400 uppercase tracking-widest mb-5 px-4 py-1.5 rounded-full border border-violet-400/30 bg-violet-400/10">
              מערכת לידים ליועצי משכנתאות
            </span>
            <h1 className="text-3xl md:text-5xl font-black leading-tight mb-5">
              לידים חמים למשכנתא —<br className="hidden md:block" />
              <span className="text-violet-400">מסוננים, מדורגים, מוכנים</span>
            </h1>
            <p className="text-slate-300 text-base md:text-lg leading-8 max-w-2xl mx-auto mb-8">
              MortgAI מייצרת מדי חודש מאות לידים של רוכשי דירה פוטנציאליים.
              כל ליד עבר ניקוד אוטומטי לפי 8 פרמטרים — ומגיע אליכם עם נתונים מלאים.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/advisor/login"
                className="inline-block bg-violet-600 hover:bg-violet-700 text-white font-black px-8 py-4 rounded-2xl transition-colors shadow-[0_14px_34px_rgba(109,40,217,0.35)] text-base"
              >
                כניסה לפורטל הלידים ←
              </Link>
              <a
                href="#how-it-works"
                className="inline-block border border-white/20 hover:border-white/50 text-white font-bold px-8 py-4 rounded-2xl transition-colors text-base"
              >
                איך זה עובד?
              </a>
            </div>
          </div>
        </section>

        {/* ── Stats bar ── */}
        <section className="bg-surface-low border-b border-surface-high py-8 px-4">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-black text-mort-ink font-number">{s.value}</p>
                <p className="text-sm font-bold text-mort-muted mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how-it-works" className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs font-black text-violet-600 uppercase tracking-widest mb-3 text-center">התהליך</p>
            <h2 className="text-2xl md:text-3xl font-black text-mort-ink text-center mb-12">איך הלידים מגיעים אליכם</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {steps.map((s) => (
                <div key={s.n} className="relative bg-white border border-slate-200 rounded-2xl p-6 shadow-soft">
                  <span className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-violet-600 text-white text-xs font-black flex items-center justify-center shadow-md">
                    {s.n}
                  </span>
                  <h3 className="text-base font-black text-mort-ink mb-2 mt-2">{s.title}</h3>
                  <p className="text-mort-muted text-sm leading-6">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Lead scoring ── */}
        <section className="bg-surface-low py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs font-black text-violet-600 uppercase tracking-widest mb-3 text-center">איכות הלידים</p>
            <h2 className="text-2xl md:text-3xl font-black text-mort-ink text-center mb-4">דירוג לידים — 3 רמות</h2>
            <p className="text-mort-muted text-center text-sm mb-10 max-w-xl mx-auto">
              כל ליד מקבל ציון אוטומטי. רק לידים חמים ובינוניים מועברים — לידים חלשים מסוננים מראש.
            </p>
            <div className="grid md:grid-cols-3 gap-5">
              <div className="bg-white rounded-2xl border-2 border-emerald-400 p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3 text-xl">🔥</div>
                <p className="text-lg font-black text-mort-ink mb-1">ליד חם</p>
                <p className="text-xs font-bold text-emerald-600 mb-3">ציון 70–100</p>
                <p className="text-mort-muted text-sm leading-6">הכנסה גבוהה, הון עצמי מוכן, חוזה חתום או עומד להיחתם. דחיפות גבוהה — מומלץ לחזור תוך שעה.</p>
              </div>
              <div className="bg-white rounded-2xl border-2 border-amber-400 p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3 text-xl">☀️</div>
                <p className="text-lg font-black text-mort-ink mb-1">ליד בינוני</p>
                <p className="text-xs font-bold text-amber-600 mb-3">ציון 40–69</p>
                <p className="text-mort-muted text-sm leading-6">פרמטרים סבירים, לרוב בשלב חיפוש פעיל. פוטנציאל גבוה לסגירה עם טיפול נכון.</p>
              </div>
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 text-center opacity-60">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-xl">❄️</div>
                <p className="text-lg font-black text-mort-ink mb-1">ליד חלש</p>
                <p className="text-xs font-bold text-slate-400 mb-3">ציון מתחת ל-40</p>
                <p className="text-mort-muted text-sm leading-6">לא מועבר ליועצים. מסוננים מראש על ידי המערכת.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Filters ── */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs font-black text-violet-600 uppercase tracking-widest mb-3 text-center">הסינון</p>
            <h2 className="text-2xl md:text-3xl font-black text-mort-ink text-center mb-10">איך הלידים מסוננים</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filters.map((f) => (
                <div key={f.title} className="flex gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0 text-lg">{f.icon}</div>
                  <div>
                    <p className="font-black text-mort-ink text-sm mb-1">{f.title}</p>
                    <p className="text-mort-muted text-sm leading-6">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Lead types ── */}
        <section className="bg-surface-low py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs font-black text-violet-600 uppercase tracking-widest mb-3 text-center">סוגי לידים</p>
            <h2 className="text-2xl md:text-3xl font-black text-mort-ink text-center mb-10">מי הלקוחות שבמאגר</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {leadTypes.map((t) => (
                <div key={t.title} className="flex gap-4 bg-white border border-slate-200 rounded-2xl p-5">
                  <span className="text-2xl mt-0.5">{t.emoji}</span>
                  <div>
                    <p className="font-black text-mort-ink mb-1">{t.title}</p>
                    <p className="text-mort-muted text-sm leading-6">{t.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Regions ── */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs font-black text-violet-600 uppercase tracking-widest mb-3">אזורי פעילות</p>
            <h2 className="text-2xl md:text-3xl font-black text-mort-ink mb-8">לידים מכל הארץ</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {regions.map((r) => (
                <span key={r} className="px-4 py-2 bg-surface-low border border-surface-high rounded-full text-sm font-bold text-mort-text">
                  {r}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Trust ── */}
        <section className="bg-mort-ink text-white py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-black text-violet-400 uppercase tracking-widest mb-3">למה MortgAI</p>
            <h2 className="text-2xl md:text-3xl font-black mb-10">לידים שמגיעים מוכנים לעבודה</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right mb-12">
              {trustItems.map((item) => (
                <div key={item} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
                  <span className="text-emerald-400 mt-0.5 text-lg shrink-0">✓</span>
                  <span className="text-sm font-bold text-slate-200 leading-6">{item}</span>
                </div>
              ))}
            </div>
            <Link
              href="/advisor/login"
              className="inline-block bg-violet-600 hover:bg-violet-700 text-white font-black px-10 py-4 rounded-2xl transition-colors shadow-[0_14px_34px_rgba(109,40,217,0.35)] text-base"
            >
              כניסה לפורטל הלידים ←
            </Link>
            <p className="text-slate-500 text-xs mt-4">גישה למערכת מותנית באישור מוקדם</p>
          </div>
        </section>

      </main>
    </>
  );
}
