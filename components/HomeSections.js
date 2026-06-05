/**
 * Homepage presentational sections — no state from Home(), zero business logic.
 * Import these in pages/index.js.
 */

import { useState } from "react";
import BrandLogo from "./BrandLogo";

/* ------------------------------------------------------------------ */
/*  DATA                                                                */
/* ------------------------------------------------------------------ */

const navLinks = [
  ["דף הבית", "#home"],
  ["בדיקת התאמה", "#eligibility-check"],
  ["מחזור משכנתא", "/refinance-check"],
  ["איך זה עובד", "#how-it-works"],
  ["שאלות נפוצות", "#faq"],
  ["בלוג", "/blog"],
];

const trustItems = [
  { text: "הנתונים נשארים אצלנו ולא נשלחים לבנק ללא אישורך", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
  { text: "הבדיקה היא אומדן ראשוני בלבד — לא אישור בנקאי", icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" },
  { text: "המטרה — לעזור לך להבין איפה אתה עומד לפני פנייה ליועץ", icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { text: "תמונת מצב ראשונית תוך דקה — ללא עלות", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
];

const problemItems = [
  { text: "לא יודעים כמה משכנתא אפשר לקבל לפי ההכנסה", icon: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { text: "לא בטוחים אם כדאי למחזר את המשכנתא הקיימת", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
  { text: "קשה להבין מה יהיה ההחזר החודשי האמיתי", icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
  { text: "הבנקים ויועצים מדברים בשפה לא תמיד ברורה", icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" },
  { text: "לא ברור מה בדיוק בודקים לפני שמגישים בקשה", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { text: "כל יועץ מבקש מסמכים בצורה שונה ולא ברור מה הכרחי", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
];

const processSteps = [
  {
    number: "01",
    title: "ממלאים כמה פרטים",
    text: "הכנסה, הון עצמי, מחיר נכס — תהליך קצר שלוקח כדקה.",
    icon: "M12 6v12m6-6H6",
  },
  {
    number: "02",
    title: "מקבלים תמונת מצב ראשונית",
    text: "אומדן סיכוי התאמה, החזר חודשי משוער ויחס החזר — מיד ובחינם.",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
  {
    number: "03",
    title: "ממשיכים לבדיקה מקצועית במידת הצורך",
    text: "אם יש התאמה, ניתן להתחיל בדיקה מעמיקה עם יועץ מתאים — ללא לחץ.",
    icon: "M8 11a4 4 0 118 0M4 20a8 8 0 0116 0",
  },
];

export const faqItems = [
  {
    question: "האם FINZO מאשרת משכנתא?",
    answer:
      "לא. FINZO היא כלי לאומדן ראשוני בלבד. הבדיקה מציגה חיווי התחלתי לפי הנתונים שהזנת, אבל אישור משכנתא בפועל ניתן רק על ידי בנק, לאחר בדיקת מסמכים, שמאות ונתוני אשראי.",
  },
  {
    question: "האם הבדיקה מחייבת אותי?",
    answer:
      "לא. הבדיקה היא ראשונית ואינה מחייבת לשום פעולה. אין עלות, אין חוזה ואין שום התחייבות מצדך — גם אם תשאיר פרטים.",
  },
  {
    question: "האם הנתונים נשלחים לבנק?",
    answer:
      "לא. הנתונים שאתה מזין נשמרים אצלנו בלבד ולא מועברים לאף בנק ללא אישורך המפורש. אנחנו לא חולקים מידע אישי עם גורמים חיצוניים ללא הסכמה.",
  },
  {
    question: "מה קורה אחרי שאני משאיר פרטים?",
    answer:
      "יועץ מקצועי חוזר אליך לשיחה קצרה, עובר איתך על האומדן הראשוני ומכוון אותך לצעד הבא — ללא התחייבות ולפי הצורך שלך. אין לחץ ואין מכירות אגרסיביות.",
  },
  {
    question: "כמה הון עצמי צריך?",
    answer:
      "בדרך כלל, מגבלות המימון המקובלות לדירה ראשונה מגיעות עד כ-75%, למשפרי דיור עד כ-70%, ולדירה להשקעה עד כ-50%, בכפוף למדיניות הגוף המממן. המחשבון מציג אומדן ראשוני אם חסר הון עצמי לפי סוג העסקה.",
  },
  {
    question: "מהו יחס החזר תקין?",
    answer:
      "ברוב המקרים נהוג לראות יחס החזר סביב 30%-35% כטווח נוח לבדיקה. יחס החזר גבוה מ-40% עשוי להקשות על קבלת אישור, תלוי בהכנסה, בהלוואות קיימות וביתרה למחיה.",
  },
  {
    question: "מה ההבדל בין FINZO לבין יועץ משכנתאות?",
    answer:
      "FINZO מספקת בדיקה ראשונית ואומדן מהיר כנקודת פתיחה. יועץ משכנתאות מורשה הוא הגורם שמבצע את הבדיקה המלאה, מנהל מול הבנקים ומלווה את כל התהליך. FINZO יכולה לסייע להבין את המצב לפני שמגיעים לשלב הזה.",
  },
];

/* ------------------------------------------------------------------ */
/*  SHARED PRIMITIVES                                                   */
/* ------------------------------------------------------------------ */

export function SectionHeader({ eyebrow, title, text }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <span className="inline-flex rounded-full bg-violet-50 px-4 py-2 text-sm font-black text-violet-700">{eyebrow}</span>
      <h2 className="mt-5 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{title}</h2>
      <p className="mt-4 text-lg leading-8 text-slate-600">{text}</p>
    </div>
  );
}

function LineIcon({ path }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  HEADER                                                              */
/* ------------------------------------------------------------------ */

export function Header({ onCtaClick }) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <a href="#home"><BrandLogo /></a>

        <nav aria-label="ניווט ראשי" className="hidden items-center gap-6 text-sm font-bold text-slate-600 lg:flex">
          {navLinks.map(([label, href]) => (
            <a key={href} href={href} className="transition hover:text-violet-700">
              {label}
            </a>
          ))}
        </nav>

        <a
          href="#eligibility-check"
          onClick={() => onCtaClick?.("header")}
          aria-label="מעבר לבדיקת התאמה"
          className="rounded-full bg-violet-700 px-5 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(109,40,217,0.28)] transition hover:bg-violet-800"
        >
          בדיקת התאמה עכשיו
        </a>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  HERO                                                                */
/* ------------------------------------------------------------------ */

function HeroIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="absolute -inset-6 rounded-[56px] bg-violet-200/30 blur-3xl" />
      <div className="relative rounded-[44px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-violet-50 p-6 shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
        <svg viewBox="0 0 480 380" className="h-auto w-full" role="img" aria-label="איור בדיקת משכנתא">
          <defs>
            <linearGradient id="purpleLine" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#6d28d9" />
            </linearGradient>
          </defs>
          <path d="M78 298h324" stroke="#d8dee9" strokeWidth="8" strokeLinecap="round" />
          <path d="M125 184 240 92l115 92v116H125Z" fill="#fff" stroke="#cbd5e1" strokeWidth="8" strokeLinejoin="round" />
          <path d="M178 300v-78h58v78" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="8" strokeLinejoin="round" />
          <path d="M254 226h54v42h-54Z" fill="#f5f3ff" stroke="#c4b5fd" strokeWidth="7" strokeLinejoin="round" />
          <path d="M150 166 240 94l90 72" fill="none" stroke="url(#purpleLine)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="312" y="72" width="108" height="154" rx="26" fill="#fff" stroke="#d8dee9" strokeWidth="7" />
          <path d="M338 112h54M338 142h38M338 172h48" stroke="#94a3b8" strokeWidth="7" strokeLinecap="round" />
          <circle cx="394" cy="194" r="15" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="7" />
          <path d="M82 118c34-42 84-65 139-68M392 274c-28 32-70 51-121 58" fill="none" stroke="#d8dee9" strokeWidth="7" strokeLinecap="round" strokeDasharray="12 18" />
          <circle cx="93" cy="110" r="18" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="7" />
          <path d="M87 110h12M93 104v12" stroke="#6d28d9" strokeWidth="6" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

export function Hero({ onCtaClick }) {
  return (
    <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
      <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.18),transparent_45%)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2">
        <div className="mx-auto max-w-2xl text-center lg:text-right">
          <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-black text-violet-800">
            ללא עלות · ללא התחייבות · תהליך קצר
          </span>
          <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            בדיקת התאמה למשכנתא או מחזור — בצורה חכמה, פשוטה ומהירה
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg font-semibold leading-8 text-slate-600 lg:mx-0">
            FINZO עוזרת להבין את מצב המשכנתא, לבדוק כיוון ראשוני ולחבר אותך להמשך טיפול מקצועי במידת הצורך.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <a
              href="#eligibility-check"
              onClick={() => onCtaClick?.("hero_primary")}
              aria-label="בדיקת התאמה למשכנתא"
              className="rounded-full bg-violet-700 px-8 py-4 text-center text-base font-black text-white shadow-[0_18px_44px_rgba(109,40,217,0.32)] transition hover:-translate-y-0.5 hover:bg-violet-800"
            >
              בדיקת התאמה עכשיו
            </a>
            <a
              href="#refinance"
              onClick={() => onCtaClick?.("hero_refinance")}
              className="rounded-full border border-violet-200 bg-violet-50 px-8 py-4 text-center text-base font-black text-violet-800 transition hover:bg-violet-100"
            >
              בדיקת מחזור משכנתא
            </a>
          </div>
          <p className="mt-5 text-sm font-bold text-slate-500">
            ללא התחייבות · תהליך קצר · הנתונים משמשים לבדיקה ראשונית בלבד
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
              <p className="text-xs font-black text-slate-500">זמן מילוי</p>
              <p className="mt-1 text-lg font-black text-slate-900">כדקה אחת</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
              <p className="text-xs font-black text-slate-500">תוצאה מיידית</p>
              <p className="mt-1 text-lg font-black text-slate-900">אומדן סיכוי + החזר חודשי</p>
            </div>
          </div>
        </div>

        <HeroIllustration />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  TRUST STRIP                                                         */
/* ------------------------------------------------------------------ */

export function TrustStrip() {
  return (
    <section className="border-y border-slate-200 bg-slate-50/80">
      <div className="mx-auto grid max-w-6xl gap-3 px-4 py-6 sm:grid-cols-2 sm:px-6">
        {trustItems.map(({ text, icon }) => (
          <div key={text} className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-700">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="font-black text-slate-800">{text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  PROBLEM SECTION                                                     */
/* ------------------------------------------------------------------ */

export function ProblemSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeader
        eyebrow="הבעיה שאנחנו פותרים"
        title="קשה להבין את עולם המשכנתאות לבד"
        text="לפני שפונים לבנק או ליועץ, רוב האנשים מתמודדים עם אותן השאלות."
      />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {problemItems.map(({ text, icon }) => (
          <div key={text} className="flex items-start gap-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <p className="font-bold leading-7 text-slate-700">{text}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 rounded-[28px] border border-violet-100 bg-violet-50 p-6 text-center sm:p-8">
        <p className="text-lg font-black text-violet-900">FINZO עוזרת לקבל תמונת מצב ראשונית ברורה — לפני שמגיעים לבנק</p>
        <p className="mt-2 text-slate-600">בדיקה ראשונית חינמית, אומדן מהיר, וחיבור להמשך טיפול מקצועי רק אם רלוונטי.</p>
        <a
          href="#eligibility-check"
          className="mt-5 inline-block rounded-full bg-violet-700 px-8 py-3.5 font-black text-white shadow-[0_14px_34px_rgba(109,40,217,0.25)] transition hover:bg-violet-800"
        >
          בדיקת התאמה עכשיו
        </a>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  HOW IT WORKS — 3 steps                                             */
/* ------------------------------------------------------------------ */

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-slate-50/60 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader
          eyebrow="איך זה עובד"
          title="שלושה שלבים פשוטים לתמונת מצב ראשונית"
          text="תהליך קצר וברור — בלי ניירת, בלי בנקים, בלי לחץ."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {processSteps.map((step) => (
            <div key={step.number} className="relative flex flex-col gap-5 rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-700 font-black text-2xl text-white">
                  {step.number}
                </span>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-700">
                  <LineIcon path={step.icon} />
                </span>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-950">{step.title}</h3>
                <p className="mt-2 leading-7 text-slate-600">{step.text}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm font-bold text-slate-500">
          הבדיקה באתר היא אומדן ראשוני בלבד · אינה מהווה אישור בנקאי · המשך טיפול מקצועי יתבצע מול גורם מוסמך
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  SEO CONTENT                                                         */
/* ------------------------------------------------------------------ */

export function SeoContentSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="mortgage-seo-title">
      <div className="rounded-[34px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <span className="inline-flex rounded-full bg-violet-50 px-4 py-2 text-sm font-black text-violet-700">
              בדיקת משכנתא בישראל
            </span>
            <h2 id="mortgage-seo-title" className="mt-5 text-3xl font-black leading-tight text-slate-950">
              מה בודקים לפני שלוקחים משכנתא?
            </h2>
            <p className="mt-4 leading-8 text-slate-600">
              לפני שפונים לבנק כדאי להבין אם המספרים עובדים: מה סכום המשכנתא הדרוש, מה ההחזר החודשי המשוער, כמה הון עצמי חסר אם בכלל, ומה יחס ההחזר ביחס להכנסה. בדיקה מוקדמת יכולה לעזור לזהות נקודות סיכון לפני חתימת חוזה או הגשת בקשה לאישור עקרוני, אך היא אומדן בלבד וכפופה לבדיקה סופית.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["יחס החזר", "בודק כמה מההכנסה נטו מיועד להחזר המשכנתא והתחייבויות קיימות."],
              ["אחוז מימון LTV", "משווה בין סכום המשכנתא לשווי הנכס לפי סוג העסקה."],
              ["הון עצמי", "מציג אם ההון העצמי מספיק ביחס למחיר הנכס ולמגבלות המימון."],
              ["תזרים אחרי העסקה", "בודק כמה נשאר למחיה אחרי הוצאות, הלוואות והחזר משכנתא."],
            ].map(([title, text]) => (
              <article key={title} className="rounded-3xl bg-slate-50 p-5">
                <h3 className="font-black text-slate-950">{title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  REFINANCE SECTION                                                   */
/* ------------------------------------------------------------------ */

export function RefinanceSection() {
  return (
    <section id="refinance" className="bg-violet-950 py-16 text-white sm:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <span className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-black text-violet-100">
            יש לכם משכנתא קיימת?
          </span>
          <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">
            בדקו אם יש פוטנציאל לחיסכון במחזור
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-8 text-violet-100">
            שינוי ריבית, תקופה או תמהיל עשוי להפחית את ההחזר החודשי או את עלות הריבית הכוללת. הבדיקה מוקדמת, ראשונית ובחינם.
          </p>
        </div>
        <div className="rounded-[32px] border border-white/10 bg-white/10 p-6">
          <p className="text-xl font-black">מה בודקים במחזור?</p>
          <ul className="mt-4 space-y-3 text-violet-50">
            <li className="flex items-start gap-2">
              <span className="mt-1 text-violet-300">•</span>
              <span>החזר חודשי נוכחי מול החזר חדש משוער</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-violet-300">•</span>
              <span>חיסכון ריבית משוער לאחר עלויות המחזור</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-violet-300">•</span>
              <span>נקודת איזון — האם היא בתוך התקופה שנותרה</span>
            </li>
          </ul>
          <a
            href="/refinance-check"
            className="mt-6 block rounded-full bg-white px-6 py-4 text-center font-black text-violet-900 transition hover:bg-violet-50"
          >
            בדיקת מחזור משכנתא
          </a>
          <p className="mt-3 text-center text-xs font-bold text-violet-200">
            אומדן ראשוני בלבד · לא ייעוץ מקצועי
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  TRUST CONTENT                                                       */
/* ------------------------------------------------------------------ */

const trustBlocks = [
  {
    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
    title: "הנתונים נשארים אצלנו",
    text: "הנתונים שאתה מזין לא מועברים לאף בנק, יועץ או גורם חיצוני ללא אישורך המפורש. המידע משמש לבדיקה הראשונית בלבד.",
  },
  {
    icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
    title: "אומדן ראשוני — לא הבטחה",
    text: "הבדיקה מבוססת על הנתונים שהזנת ונועדה לתת תמונת מצב התחלתית. אישור בנקאי בפועל כרוך בבדיקת מסמכים, שמאות ונתוני אשראי.",
  },
  {
    icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "המטרה שלנו — לעזור לך להבין",
    text: "FINZO לא מוכרת משכנתאות ולא מרוויחה מהחלטות שלך. המטרה היא לעזור לך להבין איפה אתה עומד לפני פנייה ליועץ או לבנק.",
  },
  {
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "ללא התחייבות בשום שלב",
    text: "השימוש במחשבון ואפילו השארת פרטים לא מחייבים אותך לשום דבר. אתה בשליטה מלאה על ההמשך.",
  },
];

export function TrustContentSection() {
  return (
    <section id="why-finzo" aria-labelledby="trust-content-title" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeader eyebrow="שקיפות מלאה" title="לפני שמתחילים — כמה דברים חשובים לדעת" text="אנחנו מאמינים שהחלטה פיננסית טובה מתחילה בהבנה ברורה של המצב, לא בלחץ מכירתי." />
      <h2 id="trust-content-title" className="sr-only">למה לבחור בבדיקה עם FINZO</h2>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {trustBlocks.map((item) => (
          <article key={item.title} className="flex gap-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-700">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <h3 className="text-xl font-black text-slate-950">{item.title}</h3>
              <p className="mt-2 leading-7 text-slate-600">{item.text}</p>
            </div>
          </article>
        ))}
      </div>

      {/* Legal disclaimer block */}
      <div className="mt-8 rounded-[24px] border border-amber-200 bg-amber-50 px-6 py-5">
        <p className="text-sm font-black text-amber-900">גילוי נאות חשוב</p>
        <p className="mt-1.5 text-sm leading-7 text-amber-800">
          הבדיקה באתר היא אומדן ראשוני בלבד ואינה מהווה אישור בנקאי, ייעוץ משכנתאות אישי, או התחייבות לפעולה פיננסית כלשהי.
          המשך טיפול מקצועי יתבצע מול גורם מורשה בלבד. התוצאות מבוססות על הנתונים שהוזנו ועשויות להשתנות.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  ADVISOR TEASER                                                      */
/* ------------------------------------------------------------------ */

export function AdvisorTeaser() {
  return (
    <section className="border-t border-slate-200 bg-slate-50 py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-right">
          <div>
            <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
              ליועצי משכנתאות
            </span>
            <h3 className="mt-2 text-xl font-black text-slate-950">
              FINZO מספקת מערכת לניהול לידים ותיקי משכנתא
            </h3>
            <p className="mt-1 text-sm font-bold text-slate-600">
              מערכת Back Office לניהול לידים, מעקב תיקים ושיוך לקוחות.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <a
              href="/advisor/login"
              className="rounded-full border border-violet-200 bg-white px-5 py-3 text-sm font-black text-violet-700 shadow-sm transition hover:bg-violet-50"
            >
              כניסת יועצים
            </a>
            <a
              href="/advisor/register"
              className="rounded-full bg-violet-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-violet-800"
            >
              הצטרפות ליועצים
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ — self-contained state                                          */
/* ------------------------------------------------------------------ */

export function FaqSection() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <section id="faq" className="bg-slate-100/60 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <SectionHeader eyebrow="שאלות נפוצות" title="שאלות שכולם שואלים לפני שמתחילים" text="תשובות ישירות ופשוטות — בלי עמימות." />
        <div className="mt-10 space-y-3">
          {faqItems.map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={item.question} className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                  className="flex w-full min-h-[44px] items-center justify-between gap-4 px-6 py-5 text-right"
                >
                  <span className="text-lg font-black text-slate-950">{item.question}</span>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-50 text-xl font-black text-violet-700">
                    {isOpen ? "-" : "+"}
                  </span>
                </button>
                {isOpen && <p id={`faq-answer-${index}`} className="px-6 pb-6 leading-8 text-slate-600">{item.answer}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FOOTER                                                              */
/* ------------------------------------------------------------------ */

export function Footer({ onCtaClick }) {
  return (
    <footer className="border-t border-slate-200 bg-white py-10">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 text-sm font-semibold text-slate-500 sm:px-6 lg:grid-cols-3">
        <div className="space-y-2">
          <BrandLogo withTagline={false} />
          <p>המידע באתר הוא לצורך מידע כללי בלבד ואינו מהווה ייעוץ פיננסי, ייעוץ משכנתאות או אישור בנקאי.</p>
        </div>
        <div className="space-y-2">
          <p className="font-black text-slate-900">פרטיות ושימוש במידע</p>
          <p>המידע נמסר מרצון ומשמש לצורך אומדן ראשוני וחזרה מקצועית בלבד. לא מתבצעת התחייבות לפעולה פיננסית.</p>
        </div>
        <address className="not-italic space-y-2">
          <p className="font-black text-slate-900">יצירת קשר</p>
          <p>לשאלות או הבהרות ניתן להשאיר פנייה בטופס ונחזור בהקדם.</p>
          <p className="text-xs">התוכן באתר הינו מידע כללי בלבד ואינו ייעוץ פיננסי או משפטי.</p>
        </address>
      </div>
      <div className="mx-auto mt-6 max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <a href="#eligibility-check" onClick={() => onCtaClick?.("footer")} className="inline-flex rounded-full bg-violet-700 px-5 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(109,40,217,0.28)] transition hover:bg-violet-800">
            בדיקת התאמה עכשיו
          </a>
          <a href="#bottom-lead" onClick={() => onCtaClick?.("footer_bottom_lead")} className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-5 py-3 text-sm font-black text-violet-800 transition hover:bg-violet-100">
            השאירו פרטים
          </a>
          <a href="/refinance-check" className="text-sm font-bold text-violet-700 hover:underline">בדיקת מחזור ←</a>
          <a href="/blog" className="text-sm font-bold text-violet-700 hover:underline">בלוג משכנתאות ←</a>
          <a href="/guides" className="text-sm font-bold text-violet-700 hover:underline">מדריכי משכנתא ←</a>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          יועצי משכנתאות?{" "}
          <a href="/advisor/login" className="font-semibold text-slate-500 hover:underline">לחצו כאן לכניסה למערכת</a>
        </p>
        <nav aria-label="קישורים משפטיים" className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
          <a href="/privacy" className="text-xs text-slate-400 hover:text-slate-600 hover:underline">מדיניות פרטיות</a>
          <a href="/terms" className="text-xs text-slate-400 hover:text-slate-600 hover:underline">תנאי שימוש</a>
          <a href="/accessibility" className="text-xs text-slate-400 hover:text-slate-600 hover:underline">נגישות</a>
          <a href="/cookies" className="text-xs text-slate-400 hover:text-slate-600 hover:underline">עוגיות</a>
          <a href="/contact" className="text-xs text-slate-400 hover:text-slate-600 hover:underline">יצירת קשר</a>
          <a href="/advisor/register" className="text-xs text-slate-400 hover:text-slate-600 hover:underline">הצטרפות יועצים</a>
        </nav>
        <p className="mt-3 text-xs text-slate-400">© 2026 ל.א.ה שיווק. כל הזכויות שמורות.</p>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  MOBILE STICKY CTA                                                   */
/* ------------------------------------------------------------------ */

export function MobileStickyCta({ onCtaClick, hidden }) {
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-violet-100 bg-white/95 px-4 pt-3 shadow-[0_-16px_40px_rgba(15,23,42,0.10)] backdrop-blur-xl transition md:hidden ${
        hidden ? "pointer-events-none translate-y-full opacity-0" : "translate-y-0 opacity-100"
      }`}
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}
    >
      <div className="mx-auto grid max-w-sm grid-cols-2 gap-3">
        <a
          href="#eligibility-check"
          onClick={() => onCtaClick?.("sticky_mobile")}
          className="flex min-h-[44px] items-center justify-center rounded-full bg-violet-700 px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(109,40,217,0.28)]"
        >
          בדיקת התאמה
        </a>
        <a
          href="#refinance"
          className="flex min-h-[44px] items-center justify-center rounded-full border border-violet-200 bg-violet-50 px-4 text-sm font-black text-violet-800"
        >
          בדיקת מחזור
        </a>
      </div>
    </div>
  );
}
