import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { canonicalUrl } from "../lib/seo";
import BrandLogo from "../components/BrandLogo";

/* ─── Data ─────────────────────────────────────────────────────────────── */

const PROBLEMS = [
  {
    icon: "📉",
    title: "לידים לא רלוונטיים",
    body: "רוב הלידים שמגיעים מהשוק לא עומדים בסף הכנסה או הון עצמי בסיסי. מבזבזים זמן על שיחות שלא מובילות לשום מקום.",
  },
  {
    icon: "🔍",
    title: "אין מידע לפני השיחה",
    body: "מתקשרים ללקוח בלי לדעת שום דבר על מצבו הפיננסי — אין הכנסה, אין הון עצמי, אין אומדן אישור.",
  },
  {
    icon: "⏱️",
    title: "זמן מתבזבז על סינון",
    body: "כל ליד דורש שיחת כישורים ראשונית כדי להחליט אם כדאי להמשיך. שעות רבות הולכות לאיבוד על לידים לא מתאימים.",
  },
  {
    icon: "💸",
    title: "עלות רכישה גבוהה ביחס לאיכות",
    body: "תשלום על לידים ללא שום מידע מקדים — כל רכישה היא סיכון. אין שקיפות, אין Preview, אין בסיס להחלטה.",
  },
];

const SOLUTION_ITEMS = [
  { icon: "🏪", title: "חנות לידים זמינים", body: "גישה לרשימת לידים זמינים בזמן אמת — כולם הגיעו ממשתמשים שמילאו בדיקת זכאות או מחזור." },
  { icon: "👁️", title: "Preview לפני רכישה", body: "ראו עיר, סכום משכנתא, הון עצמי, הכנסה חודשית, ציון אישור ובעיה מרכזית — לפני שמחליטים." },
  { icon: "⭐", title: "דירוג איכות ותמחור בהתאם", body: "כל ליד מדורג לפי יחס החזר, LTV, הכנסה ומצב חוזי — ומתומחר בהתאם לרמתו. בוחרים לפי איכות ומחיר." },
  { icon: "🎯", title: "רכישה רגילה או בלעדית", body: "ליד רגיל פתוח למספר מוגבל של יועצים. ליד בלעדי שייך לכם בלבד ונחסם לרכישה נוספת." },
  { icon: "📋", title: "CRM אישי לניהול תיקים", body: "כל ליד שרכשתם נכנס לסביבת עבודה אישית — סטטוס, מסמכים, מעקב שלבים ופרטי לקוח מלאים." },
];

const HOW_IT_WORKS = [
  { n: "01", title: "לקוח ממלא בדיקת זכאות או מחזור", body: "המשתמש מזין נתונים פיננסיים בסיסיים — הכנסה, הון עצמי, סכום משכנתא — ומקבל אומדן ראשוני." },
  { n: "02", title: "המערכת מסווגת ומדרגת את הליד", body: "אלגוריתם הניקוד מנתח יחס החזר, LTV, הכנסה ומצב חוזי. הליד מקבל ציון ותווית איכות." },
  { n: "03", title: "הליד מדורג ועולה לחנות", body: "FINZO מדרגת את הליד לפי איכות ומתמחרת בהתאם — ליד חם, בינוני, או הזדמנות במחיר כניסה. היועץ בוחר מה מתאים לו." },
  { n: "04", title: "היועץ רואה Preview", body: "לפני רכישה רואים: עיר, סכום משכנתא, הכנסה, ציון אישור ובעיה מרכזית. שם וטלפון מוסתרים." },
  { n: "05", title: "רכישה וקבלת פרטים מלאים", body: "לאחר רכישה — שם מלא, טלפון וכל הנתונים הפיננסיים נכנסים לאזור הניהול האישי." },
];

const BENEFITS = [
  { icon: "⚡", title: "פחות זמן על סינון", body: "מגיעים לשיחה עם מידע פיננסי ראשוני. פחות שיחות סינון, יותר שיחות עבודה." },
  { icon: "🎛️", title: "שליטה מלאה בתקציב", body: "בוחרים אילו לידים לרכוש ובאיזה מחיר — לפי התאמה, אזור ואיכות. שקיפות מלאה לפני כל רכישה." },
  { icon: "📍", title: "בחירה לפי אזור ואיכות", body: "סננו לידים לפי עיר ואיכות. קבלו בדיוק את הלידים שמתאימים לאזור הפעילות שלכם." },
  { icon: "🔄", title: "ניהול המשך טיפול", body: "עדכנו סטטוס, הוסיפו הערות ותזכורות — הכל בפורטל אחד, בלי דפי Excel." },
  { icon: "🏢", title: "מתאים ליועצים ולמשרדים", body: "מערכת שמתאימה ליועץ עצמאי שרוצה גמישות, ולמשרד שמחפש זרם לידים קבוע." },
];

const LEAD_TYPES = [
  { emoji: "🏠", title: "רכישת דירה ראשונה", sub: "לקוחות שבודקים רכישת דירה ראשונה, עם נתוני הון עצמי ומשכנתא ראשוניים — פעילים ומחפשים ייעוץ." },
  { emoji: "🔄", title: "מחזור משכנתא", sub: "לווים קיימים שבודקים חיסכון — מוכנות גבוהה ופוטנציאל ברור לסגירה מהירה." },
  { emoji: "⬆️", title: "משפרי דיור", sub: "מוכרים דירה, קונים חדשה — עסקאות גדולות עם הון עצמי, לרוב לקוחות בשלים." },
  { emoji: "💳", title: "איחוד הלוואות / בדיקת יכולת", sub: "לקוחות עם מספר התחייבויות שבודקים אפשרויות — ליד שדורש הכוונה מקצועית." },
];

const PRICING_POINTS = [
  { icon: "✓", title: "מודל רכישה גמיש לפי ליד", body: "בוחרים את הלידים שמתאימים לכם ורוכשים רק מה שרלוונטי לפעילות שלכם." },
  { icon: "✓", title: "מחיר מוצג לפני רכישה", body: "המחיר מופיע על כל כרטיס ליד לפני שמחליטים לרכוש. שקיפות מלאה בכל שלב." },
  { icon: "✓", title: "ליד רגיל או בלעדי", body: "ליד רגיל — עלות נמוכה יותר, פתוח למספר מוגבל של יועצים. ליד בלעדי — שלכם לגמרי." },
  { icon: "✓", title: "עובדים לפי בחירה", body: "רואים את פרטי הליד, בוחנים התאמה, ורוכשים רק לידים שרלוונטיים לפעילות שלכם." },
];

const TRUST_ITEMS = [
  { icon: "🔒", title: "שקיפות לפני רכישה", body: "נתונים פיננסיים ראשוניים — כולל ציון אישור, הכנסה וסכום משכנתא — גלויים לפני כל רכישה." },
  { icon: "👤", title: "פרטי קשר רק אחרי רכישה", body: "שם מלא וטלפון נחשפים אך ורק לאחר רכישת הליד. כל ליד שייך לרוכש בלבד לפי סוג הרכישה." },
  { icon: "📊", title: "ניקוד ואיכות לפני כל ליד", body: "לידים מדורגים אוטומטית לפי יחס החזר, LTV, הכנסה ומצב חוזי. כל ליד מתומחר לפי רמתו — ובוחרים בהתאם לצרכים." },
  { icon: "🗂️", title: "ניהול לידים באזור אישי", body: "כל הלידים שרכשתם מנוהלים בפורטל — סטטוס, הערות, מועד מעקב ופרטי לקוח מלאים." },
];

const CRM_FEATURES = [
  "CRM אישי לניהול לידים",
  "מעקב סטטוס טיפול בכל לקוח",
  "ניהול תיק משכנתא לפי שלבים",
  "קישור מסמכים ללקוח",
  "מעקב אחרי מסמכים חסרים",
  "ספריית בנקאים ואנשי קשר",
  "הכנת תיק מסודר לבנק",
  "תיעוד פעולות והמשך טיפול",
];

const LEAD_TIERS = [
  {
    label: "ליד חם",
    color: "emerald",
    badge: "🔥",
    desc: "לקוח עם נתונים פיננסיים טובים ורמת בשלות גבוהה — הכנסה, הון עצמי ויחס החזר תקינים.",
  },
  {
    label: "ליד בינוני",
    color: "amber",
    badge: "⚡",
    desc: "לקוח שדורש בדיקה נוספת או השלמת מידע — פוטנציאל קיים, מצריך התעמקות.",
  },
  {
    label: "הזדמנות במחיר כניסה",
    color: "slate",
    badge: "🔎",
    desc: "ליד מוקדם או שדורש יותר עבודה — מתומחר בהתאם, מתאים ליועצים שמחפשים נפח או לידים בשלבים מוקדמים.",
  },
];

const FAQ_ITEMS = [
  {
    q: "מה זה FINZO PRO?",
    a: "FINZO PRO היא פלטפורמה ליועצי משכנתאות המשלבת שני דברים: חנות לידים מדורגים לפי איכות, וסביבת CRM אישית לניהול הלידים והתיקים. הלידים מגיעים ממשתמשים שמילאו בדיקת זכאות או מחזור משכנתא, עוברים ניקוד אוטומטי, ומוצגים עם מידע פיננסי ראשוני לפני רכישה.",
  },
  {
    q: "האם אני רואה את פרטי הלקוח לפני רכישה?",
    a: "לא. לפני רכישה רואים: עיר, סכום משכנתא, מחיר נכס, הון עצמי, הכנסה חודשית, ציון אישור ובעיה מרכזית. שם מלא וטלפון נחשפים אך ורק לאחר שרכשתם את הליד.",
  },
  {
    q: "מה ההבדל בין ליד רגיל לליד בלעדי?",
    a: "ליד רגיל עשוי להיות זמין למספר מוגבל של יועצים. ליד בלעדי נמכר ליועץ אחד בלבד — ברגע שרכשתם אותו הוא נחסם ואינו מוצג ליועצים אחרים.",
  },
  {
    q: "איך עובד מודל התשלום?",
    a: "המחיר מוצג לפני רכישת ליד. היועץ רואה Preview, בוחן התאמה, ובוחר אם לרכוש ליד רגיל או בלעדי בהתאם למה שזמין בפורטל. תנאי השימוש והמחירים המלאים מוצגים לפני הצטרפות.",
  },
  {
    q: "איך מקבלים גישה?",
    a: "שלחו בקשת גישה דרך הטופס באתר. נחזור אליכם עם פרטי כניסה לפורטל ולחנות הלידים.",
  },
  {
    q: "איך מדורגים הלידים?",
    a: "FINZO מדרגת כל ליד לפי יחס החזר, LTV, הכנסה ומצב חוזי. כל ליד מקבל תווית איכות ותמחור בהתאם: ליד חם, ליד בינוני, או הזדמנות במחיר כניסה — כך שכל יועץ בוחר לפי הצרכים שלו.",
  },
];

/* ─── Sub-components ────────────────────────────────────────────────────── */

function SampleLeadCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm max-w-sm w-full">
      <div className="flex items-center justify-between mb-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full border bg-success-100 text-success-700 border-success-300">
          🔥 ליד חם
        </span>
        <span className="text-xs font-bold text-slate-400">📍 תל אביב</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-50 rounded-xl px-3 py-2.5">
          <p className="text-xs text-slate-500 font-bold mb-0.5">סכום משכנתא</p>
          <p className="font-black text-slate-950">1,800,000 ₪</p>
        </div>
        <div className="bg-slate-50 rounded-xl px-3 py-2.5">
          <p className="text-xs text-slate-500 font-bold mb-0.5">מחיר נכס</p>
          <p className="font-black text-slate-950">2,400,000 ₪</p>
        </div>
        <div className="bg-slate-50 rounded-xl px-3 py-2.5">
          <p className="text-xs text-slate-500 font-bold mb-0.5">הון עצמי</p>
          <p className="font-black text-slate-950">600,000 ₪</p>
        </div>
        <div className="bg-slate-50 rounded-xl px-3 py-2.5">
          <p className="text-xs text-slate-500 font-bold mb-0.5">הכנסה חודשית</p>
          <p className="font-black text-slate-950">22,000 ₪</p>
        </div>
      </div>
      <div className="mb-4">
        <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
          <span>סיכוי אישור (אומדן)</span><span>78%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-success-500" style={{ width: "78%" }} />
        </div>
      </div>
      <div className="rounded-xl bg-brand-50 border border-brand-100 px-3 py-2 mb-4 text-xs font-bold text-brand-700">
        בסיס ראשוני טוב לבדיקה
      </div>
      <div className="rounded-xl bg-slate-100 px-3 py-2 flex items-center gap-2 mb-4">
        <span className="text-slate-400 text-sm">🔒</span>
        <p className="text-xs font-bold text-slate-500">שם וטלפון מוסתרים לפני רכישה</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button className="text-xs font-black px-3 py-2.5 rounded-full border border-brand-200 bg-brand-50 text-brand-800 cursor-default">
          <span className="block text-xs font-bold text-brand-400 mb-0.5">ליד רגיל</span>
          מחיר לפי תמחור
        </button>
        <button className="text-xs font-black px-3 py-2.5 rounded-full bg-brand-700 text-white cursor-default">
          <span className="block text-xs font-bold text-brand-300 mb-0.5">בלעדי</span>
          מחיר לפי תמחור
        </button>
      </div>
    </div>
  );
}

function FaqItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-right"
        aria-expanded={open}
      >
        <span className="text-base font-black text-slate-950">{item.q}</span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-lg font-black text-brand-700">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && <p className="px-6 pb-6 leading-8 text-slate-600">{item.a}</p>}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function FinzoProLanding() {
  return (
    <>
      <Head>
        <title>FINZO PRO — לידים ומערכת עבודה ליועצי משכנתאות</title>
        <meta name="description" content="FINZO PRO — לידים מדורגים לפי איכות, CRM אישי לניהול תיקים, ומערכת עבודה שמרכזת את הטיפול בלקוח במקום אחד. ליועצי משכנתאות בלבד." />
        <meta name="robots" content="noindex,nofollow" />
        <link rel="canonical" href={canonicalUrl("/advisors")} />
      </Head>

      <main dir="rtl" className="min-h-screen bg-white text-slate-950">

        {/* ── Sticky header ─────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
            <Link href="/" className="inline-flex items-center">
              <BrandLogo variant="advisor" mode="dark" size="sm" withTagline={false} />
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/advisor/login" className="text-sm font-bold text-slate-300 hover:text-white transition-colors hidden sm:block">
                כניסה ליועצים
              </Link>
              <Link href="/advisor/register" className="rounded-full bg-brand-600 hover:bg-brand-500 px-5 py-2.5 text-sm font-black text-white transition-colors">
                הצטרפות
              </Link>
            </div>
          </div>
        </header>

        {/* ── 1. Hero ───────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-slate-950 pb-24 pt-20 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.25),transparent_60%)]" />
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-700/60 bg-brand-900/40 px-4 py-2 text-sm font-black text-brand-300 mb-8">
              <span className="h-2 w-2 rounded-full bg-brand-400 animate-pulse" />
              ליועצי משכנתאות בלבד
            </div>
            <div className="mb-5 flex flex-wrap justify-center gap-2 text-sm font-black">
              <span className="rounded-full bg-success-500/20 border border-success-500/40 px-3 py-1 text-success-300">לידים מדורגים לפי איכות</span>
              <span className="text-slate-600">+</span>
              <span className="rounded-full bg-brand-500/20 border border-brand-500/40 px-3 py-1 text-brand-300">CRM אישי לניהול תיקי משכנתא</span>
            </div>
            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              לידים מדורגים ומערכת עבודה אחת
              <span className="mt-2 block text-brand-300">
                לניהול הלקוח עד הסגירה
              </span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              FINZO PRO מחברת בין לידים שעברו בדיקה ראשונית לבין סביבת CRM אישית לניהול סטטוס, מסמכים, בנקאים והמשך טיפול.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/advisor/register" className="rounded-full bg-brand-600 hover:bg-brand-500 px-9 py-4 text-base font-black text-white shadow-[0_16px_40px_rgba(109,40,217,0.4)] transition hover:-translate-y-0.5">
                הצטרפות ליועצים
              </Link>
              <Link href="/advisor/login" className="rounded-full border border-white/20 bg-white/10 hover:bg-white/15 px-9 py-4 text-base font-black text-white transition">
                כניסה למערכת
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate-500">
              תשלום לפי ליד · מחיר מוצג לפני רכישה · CRM אישי לכל יועץ
            </p>
          </div>
        </section>

        {/* ── 2. Problem ────────────────────────────────────────────────── */}
        <section className="border-b border-slate-100 bg-slate-50 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <span className="inline-block rounded-full bg-danger-50 px-4 py-2 text-sm font-black text-danger-600">
                הבעיה
              </span>
              <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">
                הבעיה היא לא כמות הלידים — אלא איכות המידע שמגיע איתם
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {PROBLEMS.map((p) => (
                <div key={p.title} className="flex gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <span className="text-3xl shrink-0">{p.icon}</span>
                  <div>
                    <h3 className="text-lg font-black text-slate-950">{p.title}</h3>
                    <p className="mt-2 leading-7 text-slate-600">{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. Solution ───────────────────────────────────────────────── */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <span className="inline-block rounded-full bg-brand-50 px-4 py-2 text-sm font-black text-brand-700">
                הפתרון
              </span>
              <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">
                FINZO PRO נותנת לכם שליטה על איכות הלידים
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                לידים שכבר עברו ניתוח פיננסי ראשוני, עם מידע מספיק לקבל החלטת רכישה מושכלת.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {SOLUTION_ITEMS.map((item) => (
                <div key={item.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <span className="text-2xl shrink-0">{item.icon}</span>
                  <div>
                    <h3 className="text-base font-black text-slate-950">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. How it works ───────────────────────────────────────────── */}
        <section className="border-y border-slate-100 bg-slate-50 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <span className="inline-block rounded-full bg-brand-50 px-4 py-2 text-sm font-black text-brand-700">
                איך זה עובד
              </span>
              <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">
                מהלקוח שמילא בדיקה — לליד בפורטל שלכם
              </h2>
            </div>
            <div className="relative">
              <div className="hidden lg:block absolute top-8 right-[2.5rem] left-[2.5rem] h-px bg-slate-200" />
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
                {HOW_IT_WORKS.map((step) => (
                  <div key={step.n} className="relative bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
                    <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-brand-700 text-sm font-black text-white">
                      {step.n}
                    </div>
                    <h3 className="text-sm font-black text-slate-950 leading-snug">{step.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{step.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. Lead card preview ──────────────────────────────────────── */}
        <section className="py-20 bg-slate-950 text-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <span className="inline-block rounded-full bg-brand-900/60 border border-brand-700/60 px-4 py-2 text-sm font-black text-brand-300">
                  Preview לפני רכישה
                </span>
                <h2 className="mt-6 text-3xl font-black leading-tight sm:text-4xl">
                  מחליטים עם מידע — לא בעיוורון
                </h2>
                <p className="mt-5 text-lg leading-8 text-slate-300">
                  לפני כל רכישה רואים נתונים פיננסיים ראשוניים: הכנסה, הון עצמי, סכום משכנתא, ציון אישור ובעיה מרכזית.
                </p>
                <ul className="mt-7 space-y-3">
                  {["עיר ואזור", "סכום משכנתא ומחיר נכס", "הון עצמי", "הכנסה חודשית", "ציון אישור (אומדן)", "בעיה / נקודה מרכזית"].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-slate-200">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success-500/20 text-success-400 text-xs font-black">✓</span>
                      <span className="font-bold">{item}</span>
                    </li>
                  ))}
                  <li className="flex items-center gap-3 text-slate-500">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-700 text-xs font-black">🔒</span>
                    <span className="font-bold">שם וטלפון — לאחר רכישה בלבד</span>
                  </li>
                </ul>
              </div>
              <div className="flex justify-center">
                <SampleLeadCard />
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. Benefits ───────────────────────────────────────────────── */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <span className="inline-block rounded-full bg-brand-50 px-4 py-2 text-sm font-black text-brand-700">
                יתרונות
              </span>
              <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">
                עובדים חכם יותר, לא קשה יותר
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map((b) => (
                <div key={b.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <span className="text-2xl block mb-3">{b.icon}</span>
                  <h3 className="text-lg font-black text-slate-950">{b.title}</h3>
                  <p className="mt-2 leading-7 text-slate-600">{b.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6b. CRM section ───────────────────────────────────────────── */}
        <section className="border-y border-slate-100 bg-slate-950 py-20 text-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <span className="inline-block rounded-full border border-brand-700/60 bg-brand-900/40 px-4 py-2 text-sm font-black text-brand-300">
                לא רק לידים
              </span>
              <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">
                מערכת עבודה ליועצי משכנתאות
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-300">
                FINZO נותנת לכל יועץ סביבת עבודה לניהול הלידים והתיקים שלו — סטטוס טיפול, מסמכים, בנקאים, תיעוד פעולות והמשך טיפול מסודר במקום אחד, במקום לעבוד עם אקסלים, פתקים ושיחות וואטסאפ מפוזרות.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CRM_FEATURES.map((feature) => (
                <div key={feature} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-500/20 text-xs font-black text-brand-400">✓</span>
                  <span className="text-sm font-bold text-slate-200">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6c. CRM system preview (CSS mockups) ─────────────────────── */}
        <section className="py-20 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <span className="inline-block rounded-full bg-brand-50 px-4 py-2 text-sm font-black text-brand-700">
                סביבת העבודה
              </span>
              <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">
                כך נראית סביבת העבודה של FINZO PRO
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                היועץ לא מקבל רק פרטי קשר — הוא מקבל סביבת עבודה לניהול הליד, התיק והמשך הטיפול.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

              {/* Card 1 – Dashboard */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="bg-slate-950 px-4 pt-4 pb-0">
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-danger-400/60" />
                    <span className="h-2.5 w-2.5 rounded-full bg-warning-400/60" />
                    <span className="h-2.5 w-2.5 rounded-full bg-success-400/60" />
                    <span className="mr-auto text-xs font-bold text-slate-500">דשבורד</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[["לידים פעילים","12"],["תיקים בטיפול","7"],["ממתינים לפעולה","3"],["נסגרו החודש","2"]].map(([label, val]) => (
                      <div key={label} className="rounded-xl bg-slate-800 px-2.5 py-2">
                        <p className="text-xs text-slate-500 font-bold">{label}</p>
                        <p className="text-lg font-black text-white">{val}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-t-xl bg-slate-800/50 px-3 py-2.5 h-12 flex items-end gap-1">
                    {[3,5,4,7,6,8,5].map((h, i) => (
                      <div key={i} className="flex-1 rounded-sm bg-brand-500/60" style={{ height: `${h * 5}px` }} />
                    ))}
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm font-black text-slate-950">דשבורד ניהול</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">תמונת מצב של לידים, סטטוסים, תיקים והתקדמות במקום אחד.</p>
                  <span className="mt-2 inline-block text-xs text-slate-400 font-bold">דוגמה בלבד</span>
                </div>
              </div>

              {/* Card 2 – Lead / case management */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-100 px-4 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-100 px-2.5 py-0.5 text-xs font-black text-success-700">🔥 ליד חם</span>
                    <span className="text-xs text-slate-400 font-bold">📍 תל אביב</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex gap-2 items-center">
                      <span className="text-xs font-bold text-slate-500 w-20 shrink-0">שם לקוח</span>
                      <span className="rounded bg-slate-200 h-3 flex-1" />
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-xs font-bold text-slate-500 w-20 shrink-0">טלפון</span>
                      <span className="text-xs font-bold text-slate-400">05X-XXX-XXXX</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-xs font-bold text-slate-500 w-20 shrink-0">משכנתא</span>
                      <span className="text-xs font-black text-slate-700">1,800,000 ₪</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-xs font-bold text-slate-500 w-20 shrink-0">סטטוס</span>
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-black text-brand-700">בטיפול</span>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm font-black text-slate-950">ניהול ליד ותיק משכנתא</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">פרטי לקוח, סטטוס טיפול, נתונים פיננסיים והמשך מעקב בצורה מסודרת.</p>
                  <span className="mt-2 inline-block text-xs text-slate-400 font-bold">דוגמה בלבד</span>
                </div>
              </div>

              {/* Card 3 – Documents tracking */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-100 px-4 py-4">
                  <p className="text-xs font-black text-slate-700 mb-2.5">מסמכים — לקוח לדוגמה</p>
                  <div className="space-y-2">
                    {[
                      { name: "תלושי שכר", done: true },
                      { name: "דפי חשבון בנק", done: true },
                      { name: "הסכם רכישה", done: false },
                      { name: "אישור עקרוני", done: false },
                    ].map((doc) => (
                      <div key={doc.name} className="flex items-center gap-2">
                        <span className={`grid h-4 w-4 shrink-0 place-items-center rounded text-xs font-black ${doc.done ? "bg-success-100 text-success-600" : "bg-slate-200 text-slate-400"}`}>
                          {doc.done ? "✓" : "○"}
                        </span>
                        <span className={`text-xs font-bold ${doc.done ? "text-slate-700" : "text-slate-400"}`}>{doc.name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2.5 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-success-400" style={{ width: "50%" }} />
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm font-black text-slate-950">מסמכים ובקרת חוסרים</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">קישור מסמכים ללקוח, מעקב אחרי מסמכים שהועלו ומה עדיין חסר.</p>
                  <span className="mt-2 inline-block text-xs text-slate-400 font-bold">דוגמה בלבד</span>
                </div>
              </div>

              {/* Card 4 – Bankers / contacts */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-100 px-4 py-4">
                  <p className="text-xs font-black text-slate-700 mb-2.5">בנקאים משויכים לתיק</p>
                  <div className="space-y-2">
                    {[
                      { bank: "בנק לאומי", name: "איש קשר לדוגמה", role: "משכנתאות" },
                      { bank: "בנק הפועלים", name: "איש קשר לדוגמה", role: "לקוחות עסקיים" },
                    ].map((b) => (
                      <div key={b.bank} className="rounded-xl bg-white border border-slate-200 px-3 py-2">
                        <p className="text-xs font-black text-slate-800">{b.bank}</p>
                        <p className="text-xs text-slate-400 font-bold">{b.name} · {b.role}</p>
                      </div>
                    ))}
                  </div>
                  <button className="mt-2.5 w-full rounded-xl border border-dashed border-slate-300 py-2 text-xs font-bold text-slate-400 cursor-default">
                    + הוסף בנקאי
                  </button>
                </div>
                <div className="p-4">
                  <p className="text-sm font-black text-slate-950">עבודה מול בנקאים</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">ספריית אנשי קשר, שיוך בנקאים לתיק והכנת סיכום מסודר לשליחה.</p>
                  <span className="mt-2 inline-block text-xs text-slate-400 font-bold">דוגמה בלבד</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── 6d. Lead quality tiers ────────────────────────────────────── */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <span className="inline-block rounded-full bg-brand-50 px-4 py-2 text-sm font-black text-brand-700">
                דירוג לידים
              </span>
              <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">
                בוחרים לפי איכות ומחיר
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                כל ליד מדורג ומתומחר בהתאם לרמתו — אין לידים שנמחקים, יש לידים שמתאימים לסוגי יועצים שונים.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {LEAD_TIERS.map((tier) => (
                <div key={tier.label} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-2xl">{tier.badge}</span>
                    <span className={`inline-block rounded-full px-3 py-1 text-sm font-black ${
                      tier.color === "emerald" ? "bg-success-100 text-success-700" :
                      tier.color === "amber" ? "bg-warning-100 text-warning-700" :
                      "bg-slate-100 text-slate-700"
                    }`}>{tier.label}</span>
                  </div>
                  <p className="leading-7 text-slate-600">{tier.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. Lead types ─────────────────────────────────────────────── */}
        <section className="border-y border-slate-100 bg-slate-50 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <span className="inline-block rounded-full bg-brand-50 px-4 py-2 text-sm font-black text-brand-700">
                סוגי לידים
              </span>
              <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">
                לידים מכל סוגי הלקוחות
              </h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-4">
              {LEAD_TYPES.map((t) => (
                <div key={t.title} className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
                  <span className="text-3xl block mb-3">{t.emoji}</span>
                  <h3 className="font-black text-slate-950">{t.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{t.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 8. Pricing ────────────────────────────────────────────────── */}
        <section className="py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <span className="inline-block rounded-full bg-brand-50 px-4 py-2 text-sm font-black text-brand-700">
                מודל תשלום
              </span>
              <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">
                שקיפות מלאה — גם במחיר
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                מודל רכישה גמיש לפי ליד, עם שקיפות מלאה לפני כל רכישה.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {PRICING_POINTS.map((p) => (
                <div key={p.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-black text-brand-700">{p.icon}</span>
                  <div>
                    <h3 className="font-black text-slate-950">{p.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-brand-200 bg-brand-50 p-6 text-center">
              <p className="font-black text-brand-900">מחירי הלידים מוצגים בפורטל לפני כל רכישה.</p>
              <p className="mt-1 text-sm text-brand-700">לפרטים נוספים — צרו קשר דרך טופס הצטרפות.</p>
            </div>
          </div>
        </section>

        {/* ── 9. Trust ──────────────────────────────────────────────────── */}
        <section className="border-y border-slate-100 bg-slate-50 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <span className="inline-block rounded-full bg-brand-50 px-4 py-2 text-sm font-black text-brand-700">
                שקיפות ואמון
              </span>
              <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">
                לא מבטיחים מה שלא בטוח — מציגים מה שיש
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {TRUST_ITEMS.map((item) => (
                <div key={item.title} className="flex gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <span className="text-2xl shrink-0">{item.icon}</span>
                  <div>
                    <h3 className="text-lg font-black text-slate-950">{item.title}</h3>
                    <p className="mt-2 leading-7 text-slate-600">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 10. FAQ ───────────────────────────────────────────────────── */}
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="mb-12 text-center">
              <span className="inline-block rounded-full bg-brand-50 px-4 py-2 text-sm font-black text-brand-700">
                שאלות נפוצות
              </span>
              <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">
                כל מה שרציתם לדעת על FINZO PRO
              </h2>
            </div>
            <div className="space-y-3">
              {FAQ_ITEMS.map((item) => (
                <FaqItem key={item.q} item={item} />
              ))}
            </div>
          </div>
        </section>

        {/* ── 11. Final CTA ─────────────────────────────────────────────── */}
        <section className="bg-slate-950 py-24 text-white">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-700/60 bg-brand-900/40 px-4 py-2 text-sm font-black text-brand-300 mb-8">
              <span className="text-xl font-black text-white">FINZO</span>
              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-black text-white">PRO</span>
            </div>
            <h2 className="text-3xl font-black leading-tight sm:text-5xl">
              מערכת עבודה מלאה — לא רק לידים
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-300">
              הצטרפו ל־FINZO PRO וקבלו לידים מדורגים לפי איכות, CRM אישי לניהול תיקים, ומערכת עבודה שמרכזת את הטיפול בלקוח במקום אחד.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/advisor/register" className="rounded-full bg-brand-600 hover:bg-brand-500 px-10 py-4 text-base font-black text-white shadow-[0_16px_40px_rgba(109,40,217,0.4)] transition hover:-translate-y-0.5">
                הצטרפות ליועצים
              </Link>
              <Link href="/advisor/login" className="rounded-full border border-white/20 bg-white/10 hover:bg-white/15 px-10 py-4 text-base font-black text-white transition">
                כניסה למערכת
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate-500">
              תשלום לפי ליד · מחיר מוצג לפני רכישה · CRM אישי · פרטי קשר רק אחרי רכישה
            </p>
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <footer className="border-t border-slate-800 bg-slate-950 py-8 text-center text-xs text-slate-600">
          <p>
            <span className="font-black text-white">FINZO</span>
            <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-xs font-black text-white mr-1.5">PRO</span>
            — פלטפורמת לידים ליועצי משכנתאות | מערכת זו מיועדת ליועצים מקצועיים בלבד
          </p>
        </footer>

      </main>
    </>
  );
}
