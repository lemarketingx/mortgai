import Head from "next/head";
import { useMemo, useRef, useState } from "react";
import BrandLogo from "../components/BrandLogo";
import { cleanNumber, displayNumber, formatILS, formatPct, toNumber } from "../lib/format";
import {
  absoluteUrl,
  faqSchema,
  financialServiceSchema,
  organizationSchema,
  stringifyJsonLd,
  webPageSchema,
} from "../lib/seo";

const TRANSACTION_COST_SEO = {
  title: "מחשבון עלות עסקת נדל\"ן מלאה | מס רכישה, עו\"ד, תיווך ועוד",
  description:
    "חשבו את העלות האמיתית של רכישת דירה בישראל: מס רכישה לפי מדרגות, שכר טרחת עו\"ד, דמי תיווך, שמאות, ביטוח ועלויות נוספות — הכל במקום אחד.",
  path: "/transaction-cost",
  keywords:
    "מס רכישה, עלות עסקת נדל\"ן, מחשבון מס רכישה, דמי תיווך, שכר טרחת עו\"ד, עלויות רכישת דירה, עלות אמיתית דירה ישראל",
};

// Purchase tax brackets (Israel, updated 2024)
const BRACKETS_SINGLE = [
  { from: 0, to: 1_978_745, rate: 0 },
  { from: 1_978_745, to: 2_347_040, rate: 0.035 },
  { from: 2_347_040, to: 6_055_070, rate: 0.05 },
  { from: 6_055_070, to: 20_183_565, rate: 0.08 },
  { from: 20_183_565, to: Infinity, rate: 0.1 },
];

const BRACKETS_INVESTMENT = [
  { from: 0, to: 6_055_070, rate: 0.08 },
  { from: 6_055_070, to: Infinity, rate: 0.1 },
];

function calcPurchaseTax(price, buyerType) {
  if (!price) return 0;
  const brackets = buyerType === "investment" ? BRACKETS_INVESTMENT : BRACKETS_SINGLE;
  let tax = 0;
  for (const b of brackets) {
    if (price <= b.from) break;
    tax += (Math.min(price, b.to) - b.from) * b.rate;
  }
  return Math.round(tax);
}

function calcPurchaseTaxBrackets(price, buyerType) {
  if (!price) return [];
  const brackets = buyerType === "investment" ? BRACKETS_INVESTMENT : BRACKETS_SINGLE;
  return brackets
    .filter((b) => price > b.from)
    .map((b) => {
      const taxable = Math.min(price, b.to) - b.from;
      return { rate: b.rate, taxable, tax: Math.round(taxable * b.rate) };
    });
}

function calculate(data) {
  const price = toNumber(data.price);
  const equity = toNumber(data.equity);
  const lawyerPct = Math.max(0.1, Math.min(3, toNumber(data.lawyerPct) || 0.75));
  const hasAgent = data.hasAgent !== false;
  const renovation = toNumber(data.renovation);
  const buyerType = data.buyerType || "single";
  const mortgage = Math.max(0, price - equity);
  const hasMortgage = price > 0 && mortgage > 0;

  const purchaseTax = calcPurchaseTax(price, buyerType);
  const taxBrackets = calcPurchaseTaxBrackets(price, buyerType);

  const lawyerBase = Math.round(price * lawyerPct / 100);
  const lawyerVat = Math.round(lawyerBase * 0.17);
  const lawyerTotal = lawyerBase + lawyerVat;

  const agentBase = hasAgent ? Math.round(price * 0.02) : 0;
  const agentVat = hasAgent ? Math.round(agentBase * 0.17) : 0;
  const agentTotal = agentBase + agentVat;

  const appraisalFee = hasMortgage ? 3000 : 0;
  const mortgageSetupFee = hasMortgage ? 4000 : 0;
  const registrationFee = price > 0 ? 1500 : 0;
  const insuranceFee = price > 0 ? 2500 : 0;

  const totalFees = purchaseTax + lawyerTotal + agentTotal + appraisalFee + mortgageSetupFee + registrationFee + insuranceFee;
  const totalAdditional = totalFees + renovation;
  const totalCost = price + totalAdditional;
  const feesPct = price > 0 ? (totalFees / price) * 100 : 0;
  const requiredCapital = equity + totalFees;

  return {
    price, equity, mortgage, hasMortgage, buyerType, lawyerPct, hasAgent, renovation,
    purchaseTax, taxBrackets,
    lawyerBase, lawyerVat, lawyerTotal,
    agentBase, agentVat, agentTotal,
    appraisalFee, mortgageSetupFee, registrationFee, insuranceFee,
    totalFees, totalAdditional, totalCost, feesPct, requiredCapital,
    hasInputs: price > 0,
  };
}

const initialData = {
  price: "",
  equity: "",
  buyerType: "single",
  lawyerPct: "0.75",
  hasAgent: true,
  renovation: "",
};

const initialLead = { name: "", phone: "", city: "" };

const faqItems = [
  ["מהו מס רכישה ומי משלם אותו?", "מס רכישה הוא מס המוטל על הקונה בעת רכישת נדל\"ן. הוא מחושב לפי מדרגות — ככל שמחיר הנכס גבוה יותר, כך שיעור המס עולה. לקונים דירה יחידה יש מדרגות פטור מיוחדות עד כ-1.98 מיליון ₪."],
  ["מה ההבדל בין דירה יחידה לדירה נוספת לצורך מס רכישה?", "קונה דירה יחידה (ובמקרים מסוימים משפרי דיור) נהנה ממדרגות נמוכות יותר ופטור חלקי. קונה דירה נוספת או דירה להשקעה משלם 8% מהשקל הראשון, ללא פטור."],
  ["מתי משפרי דיור נחשבים כ'דירה יחידה' לצורך מס?", "משפרי דיור שמכרו או יימכרו את דירתם הישנה בתוך 18 חודש מהרכישה החדשה זכאים למדרגות מס כמו דירה יחידה ולהחזר מס רכישה."],
  ["האם שכר טרחת עו\"ד כולל מע\"מ?", "כן. שכר הטרחה חייב במע\"מ (17%). בדרך כלל נע בין 0.5% ל-1.5% ממחיר הנכס, בתוספת מע\"מ."],
  ["האם ניתן לדלג על תיווך?", "ברכישה ישירה מיזם או ממוכר ללא מתווך — כן. אם נעזרים במתווך, דמי התיווך המקובלים הם 2% + מע\"מ מהקונה."],
  ["מה כלול בהערכה השמאית ומתי צריך אותה?", "שמאות נדרשת על ידי הבנק לצורך אישור המשכנתא. העלות הממוצעת היא 2,500–4,000 ₪ בהתאם לסוג הנכס. אם אין משכנתא — בדרך כלל לא נדרשת."],
];

export default function TransactionCost() {
  const [data, setData] = useState(initialData);
  const [lead, setLead] = useState(initialLead);
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadSent, setLeadSent] = useState(false);
  const [leadError, setLeadError] = useState("");
  const successRef = useRef(null);
  const result = useMemo(() => calculate(data), [data]);

  function update(key, value) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  async function submitLead(event) {
    event.preventDefault();
    if (leadLoading || leadSent) return;
    const phone = cleanNumber(lead.phone);
    if (lead.name.trim().length < 2 || !/^05\d{8}$|^9725\d{8}$/.test(phone)) {
      setLeadError("יש להזין שם וטלפון ישראלי תקין.");
      return;
    }
    setLeadError("");
    setLeadLoading(true);
    try {
      const record = {
        ...lead,
        phone,
        source: "transaction-cost",
        purchaseStatus: "buying",
        price: result.price || "",
        mortgage: result.mortgage || "",
        createdAt: new Date().toISOString(),
      };
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead: record, analysis: { totalCost: result.totalCost, purchaseTax: result.purchaseTax } }),
      });
      const apiResult = await response.json().catch(() => ({}));
      if (!response.ok || apiResult?.ok !== true) throw new Error("not ok");
      setLeadSent(true);
      window.requestAnimationFrame(() => successRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
    } catch {
      setLeadError("הפנייה לא נשלחה. נסו שוב.");
    } finally {
      setLeadLoading(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-white pb-24 text-slate-950 md:pb-0">
      <Head>
        <title>{TRANSACTION_COST_SEO.title}</title>
        <meta name="description" content={TRANSACTION_COST_SEO.description} />
        <meta name="keywords" content={TRANSACTION_COST_SEO.keywords} />
        <meta name="robots" content="index,follow" />
        <meta property="og:title" content={TRANSACTION_COST_SEO.title} />
        <meta property="og:description" content={TRANSACTION_COST_SEO.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={absoluteUrl(TRANSACTION_COST_SEO.path)} />
        <meta property="og:site_name" content="Finzo" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={absoluteUrl(TRANSACTION_COST_SEO.path)} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: stringifyJsonLd([
              organizationSchema(),
              financialServiceSchema({ url: absoluteUrl(TRANSACTION_COST_SEO.path), name: "מחשבון עלות עסקת נדל\"ן", description: TRANSACTION_COST_SEO.description }),
              webPageSchema(TRANSACTION_COST_SEO),
              faqSchema(faqItems),
            ]),
          }}
        />
      </Head>

      <PageHeader />
      <Hero />

      <section id="calculator" className="bg-gradient-to-b from-white via-violet-50/30 to-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeader
            eyebrow="מחשבון עלות עסקה"
            title="כמה באמת תעלה לכם הדירה?"
            text="הזינו מחיר הנכס וסוג הרוכש — נחשב מס רכישה, שכר טרחה, עלויות נלוות ואת העלות האמיתית הכוללת."
          />
          <div className="mt-10 grid items-start gap-6 lg:grid-cols-2">
            <InputForm data={data} update={update} />
            <LivePanel result={result} />
          </div>
        </div>
      </section>

      <section id="breakdown" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeader
          eyebrow="פירוט מלא"
          title="כל עלות — שורה שורה"
          text="ריכוז כל מרכיבי העלות כדי שלא תופתעו ברגע האחרון."
        />
        <BreakdownTable result={result} />
      </section>

      <section id="faq" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <SectionHeader eyebrow="שאלות נפוצות" title="מה חשוב לדעת לפני חתימה?" text="שאלות שכל רוכש דירה צריך לשאול לפני שמתחייבים." />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {faqItems.map(([title, text]) => (
              <InfoCard key={title} title={title} text={text} />
            ))}
          </div>
        </div>
      </section>

      <section id="lead" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid items-stretch gap-6 rounded-[34px] border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] lg:grid-cols-2">
          <div>
            <span className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-violet-800 shadow-sm">בדיקה עם יועץ</span>
            <h2 className="mt-5 text-3xl font-black leading-tight text-slate-950">גיליתם שיש עלויות גבוהות מהצפוי?</h2>
            <p className="mt-4 leading-8 text-slate-600">
              יועץ משכנתאות יכול לבנות תמהיל שמתאים לתקציב האמיתי שלכם — כולל כל העלויות הנלוות, לא רק ההחזר החודשי.
            </p>
            <ul className="mt-5 space-y-3 font-bold text-slate-700">
              <li>• בדיקת כדאיות בהתאם להון העצמי הפנוי אחרי עלויות</li>
              <li>• תמהיל משכנתא לפי מצב פיננסי אמיתי</li>
              <li>• המלצות לפני חתימה על חוזה</li>
            </ul>
          </div>
          <form onSubmit={submitLead} className="rounded-[28px] bg-white p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="שם מלא" value={lead.name} onChange={(v) => setLead({ ...lead, name: v })} autoComplete="name" />
              <TextField label="טלפון" value={lead.phone} onChange={(v) => setLead({ ...lead, phone: v })} placeholder="05X-XXXXXXX" autoComplete="tel" />
              <TextField label="עיר" value={lead.city} onChange={(v) => setLead({ ...lead, city: v })} autoComplete="address-level2" />
              <MoneyField label="מחיר הנכס" value={data.price} onChange={(v) => update("price", v)} />
            </div>
            {leadError && <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{leadError}</p>}
            {leadSent && <p ref={successRef} role="status" className="mt-4 rounded-2xl bg-emerald-50 px-4 py-4 text-center text-sm font-black text-emerald-800">הפנייה נשלחה בהצלחה. נחזור אליכם בהקדם.</p>}
            <button type="submit" disabled={leadLoading || leadSent} className="mt-5 w-full rounded-full bg-violet-700 px-7 py-4 text-base font-black text-white shadow-[0_16px_40px_rgba(109,40,217,0.25)] transition hover:bg-violet-800 disabled:opacity-70">
              {leadLoading ? "שולח..." : leadSent ? "נשלח בהצלחה" : "בדיקה ראשונית ללא התחייבות"}
            </button>
            <p className="mt-3 text-center text-xs font-bold text-slate-500">הפרטים נשמרים לצורך חזרה אליך בלבד.</p>
          </form>
        </div>
      </section>

      <PageFooter />
      <MobileStickyCta />
    </main>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function PageHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <a href="/"><BrandLogo /></a>
        <nav aria-label="ניווט" className="hidden items-center gap-6 text-sm font-bold text-slate-600 lg:flex">
          <a href="#calculator" className="transition hover:text-violet-700">מחשבון</a>
          <a href="#breakdown" className="transition hover:text-violet-700">פירוט עלויות</a>
          <a href="#faq" className="transition hover:text-violet-700">שאלות נפוצות</a>
          <a href="/refinance-check" className="transition hover:text-violet-700">מחזור משכנתא</a>
          <a href="/" className="transition hover:text-violet-700">בדיקת זכאות</a>
        </nav>
        <a href="#calculator" className="rounded-full bg-violet-700 px-5 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(109,40,217,0.28)] transition hover:bg-violet-800">
          חישוב חינם
        </a>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.16),transparent_45%)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
        <div className="mx-auto max-w-2xl text-center lg:text-right">
          <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-black text-violet-800">עלות עסקה מלאה</span>
          <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            כמה באמת עולה דירה בישראל?
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg font-semibold leading-8 text-slate-600 lg:mx-0">
            מחיר הדירה הוא רק ההתחלה. מס רכישה, עו"ד, תיווך, שמאות ורישום — הכל ביחד יכול להוסיף מאות אלפי שקלים.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <a href="#calculator" className="rounded-full bg-violet-700 px-8 py-4 text-center text-base font-black text-white shadow-[0_18px_44px_rgba(109,40,217,0.32)] transition hover:-translate-y-0.5 hover:bg-violet-800">
              חשבו עכשיו
            </a>
            <a href="/" className="rounded-full border border-violet-200 bg-white px-8 py-4 text-center text-base font-black text-violet-800 shadow-sm transition hover:border-violet-300 hover:bg-violet-50">
              בדיקת זכאות
            </a>
          </div>
          <p className="mt-5 text-sm font-bold text-slate-500">אומדן ראשוני בלבד. מס רכישה לפי מדרגות 2024. אינו מהווה ייעוץ משפטי או פיננסי.</p>
        </div>
        <HeroIllustration />
      </div>
    </section>
  );
}

function HeroIllustration() {
  const items = [
    { label: "מס רכישה", pct: "55%", color: "bg-violet-600" },
    { label: "שכר טרחת עו\"ד", pct: "20%", color: "bg-indigo-400" },
    { label: "דמי תיווך", pct: "18%", color: "bg-slate-400" },
    { label: "עלויות נלוות", pct: "7%", color: "bg-slate-200" },
  ];
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="absolute -inset-6 rounded-[56px] bg-violet-200/25 blur-3xl" />
      <div className="relative rounded-[44px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-violet-50 p-8 shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
        <div className="rounded-[32px] border border-slate-100 bg-white p-6">
          <p className="text-sm font-black text-slate-500">פירוק עלויות נוספות טיפוסיות</p>
          <div className="mt-5 space-y-4">
            {items.map(({ label, pct, color }) => (
              <div key={label}>
                <div className="flex justify-between text-sm font-bold text-slate-600">
                  <span>{label}</span><span className="font-black text-slate-900">{pct}</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${color}`} style={{ width: pct }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-3xl bg-gradient-to-br from-violet-700 to-violet-900 p-5 text-white">
            <p className="text-sm font-black text-violet-100">עלויות נוספות ממוצעות</p>
            <p className="mt-1 text-3xl font-black">3%–8% ממחיר הנכס</p>
            <p className="mt-1 text-sm font-bold text-violet-200">לפני שיפוץ ראשוני</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Input Form ───────────────────────────────────────────────────────────────

const BUYER_TYPES = [
  { value: "single", label: "דירה יחידה", note: "פטור חלקי עד כ-1.98 מיליון ₪" },
  { value: "upgrade", label: "משפרי דיור", note: "כמו דירה יחידה, בתנאי מכירה ב-18 חודש" },
  { value: "investment", label: "דירה נוספת / השקעה", note: "8% מהשקל הראשון" },
];

function InputForm({ data, update }) {
  return (
    <div className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.09)] sm:p-7">
      <p className="text-base font-black text-slate-900">פרטי העסקה</p>
      <p className="mt-1 text-sm font-semibold text-slate-500">הזינו מחיר הנכס ופרטים נוספים לחישוב מיידי.</p>

      <div className="mt-6 grid gap-5">
        <MoneyField label="מחיר הנכס" value={data.price} onChange={(v) => update("price", v)} helper="מחיר חוזה הרכישה בשקלים." />
        <MoneyField label="הון עצמי" value={data.equity} onChange={(v) => update("equity", v)} helper="אם יש משכנתא — נוסיף שמאות ופתיחת תיק." />

        <fieldset>
          <legend className="text-sm font-black text-slate-700">סוג רוכש לצורך מס רכישה</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {BUYER_TYPES.map(({ value, label, note }) => (
              <button
                key={value}
                type="button"
                onClick={() => update("buyerType", value)}
                className={`rounded-2xl border p-3 text-right transition ${
                  data.buyerType === value
                    ? "border-violet-400 bg-violet-50 shadow-sm ring-2 ring-violet-200"
                    : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40"
                }`}
              >
                <p className="text-sm font-black text-slate-900">{label}</p>
                <p className="mt-1 text-xs font-semibold leading-4 text-slate-500">{note}</p>
              </button>
            ))}
          </div>
          {data.buyerType === "upgrade" && (
            <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
              משפרי דיור: לאחר מכירת הדירה הישנה בתוך 18 חודש ניתן לקבל החזר מס. הסכום המוצג כולל זכאות ראשונית.
            </p>
          )}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-black text-slate-700">שכר טרחת עו"ד (%)</span>
            <span className="relative mt-2 block">
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="3"
                value={data.lawyerPct}
                onChange={(e) => update("lawyerPct", e.target.value)}
                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pl-10 text-base font-black text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">%</span>
            </span>
            <span className="mt-1 block text-xs font-semibold text-slate-500">בתוספת מע"מ 17%. מקובל 0.5%–1.5%.</span>
          </label>

          <MoneyField label="שיפוץ ראשוני" value={data.renovation} onChange={(v) => update("renovation", v)} helper={'אופציונלי. לא כולל מע"מ.'} />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-black text-slate-900">דמי תיווך (2% + מע"מ)</p>
            <p className="text-xs font-semibold text-slate-500">אם נעזרים במתווך מטעם הקונה.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={data.hasAgent}
            onClick={() => update("hasAgent", !data.hasAgent)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${data.hasAgent ? "bg-violet-600" : "bg-slate-300"}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${data.hasAgent ? "translate-x-1" : "translate-x-6"}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Live Result Panel ────────────────────────────────────────────────────────

function LivePanel({ result }) {
  const { hasInputs, totalCost, totalFees, feesPct, purchaseTax, lawyerTotal, agentTotal, price } = result;
  const fmt = (v) => (hasInputs ? formatILS(v) : "--");

  return (
    <aside className="rounded-[34px] border border-violet-100 bg-gradient-to-br from-violet-700 to-violet-950 p-6 text-white shadow-[0_24px_70px_rgba(76,29,149,0.28)] sm:p-8">
      <p className="text-sm font-black text-violet-100">תוצאה בזמן אמת</p>

      <div className="mt-6">
        <p className="text-sm font-black text-violet-200">עלות כוללת אמיתית</p>
        <p className="number-display mt-2 text-4xl font-black leading-none">{fmt(totalCost)}</p>
        {hasInputs && (
          <p className="mt-2 text-sm font-bold text-violet-200">
            מחיר הנכס + {formatILS(result.totalAdditional)} עלויות נוספות
          </p>
        )}
      </div>

      <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-white transition-all duration-500"
          style={{ width: hasInputs ? `${Math.min(100, feesPct * 8)}%` : "0%" }}
        />
      </div>
      <p className="mt-2 text-xs font-bold text-violet-200">
        {hasInputs ? `עלויות נלוות: ${formatPct(feesPct)} ממחיר הנכס` : "ממתין לנתונים"}
      </p>

      <div className="mt-7 grid grid-cols-2 gap-3">
        <DarkMetric label="מס רכישה" value={fmt(purchaseTax)} />
        <DarkMetric label={'עו"ד (כולל מע"מ)'} value={fmt(lawyerTotal)} />
        <DarkMetric label={'תיווך (כולל מע"מ)'} value={result.hasAgent && hasInputs ? formatILS(agentTotal) : hasInputs ? "ללא תיווך" : "--"} />
        <DarkMetric label={'עלויות נלוות סה"כ'} value={fmt(totalFees)} />
      </div>

      {hasInputs && result.hasMortgage && (
        <div className="mt-5 rounded-3xl bg-white/10 p-4 ring-1 ring-white/10">
          <p className="text-sm font-black text-violet-100">הון עצמי נדרש</p>
          <p className="number-display mt-1 text-2xl font-black">{formatILS(result.requiredCapital)}</p>
          <p className="mt-1 text-xs font-bold text-violet-200">הון עצמי להשלמה + כל עלויות העסקה</p>
        </div>
      )}

      {!hasInputs && (
        <div className="mt-6 rounded-3xl bg-white/10 p-5 ring-1 ring-white/10">
          <p className="text-sm font-black text-violet-100">כיצד להשתמש?</p>
          <p className="mt-2 text-sm leading-6 text-violet-100">הזינו מחיר הנכס וסוג הרוכש — שאר הנתונים אופציונליים.</p>
        </div>
      )}

      <a href="#lead" className="mt-6 block rounded-full bg-white px-6 py-4 text-center text-base font-black text-violet-800 shadow-lg transition hover:bg-violet-50">
        בדיקה עם יועץ
      </a>
    </aside>
  );
}

// ─── Breakdown Table ──────────────────────────────────────────────────────────

function BreakdownTable({ result }) {
  const { hasInputs, price, purchaseTax, taxBrackets, lawyerBase, lawyerVat, lawyerTotal,
    agentBase, agentVat, agentTotal, hasAgent, appraisalFee, mortgageSetupFee,
    registrationFee, insuranceFee, renovation, totalFees, totalAdditional, totalCost, hasMortgage } = result;

  const fmt = (v) => (hasInputs ? formatILS(v) : "--");

  const rows = [
    {
      label: "מחיר הנכס",
      value: fmt(price),
      sub: null,
      bold: true,
      accent: false,
    },
    {
      label: "מס רכישה",
      value: fmt(purchaseTax),
      sub: hasInputs && taxBrackets.length > 0
        ? taxBrackets.filter(b => b.tax > 0).map(b => `${formatPct(b.rate * 100, 1)} על ${formatILS(b.taxable)}`).join(" · ")
        : "לפי מדרגות 2024",
      bold: false,
      accent: purchaseTax > 0,
    },
    {
      label: `שכר טרחת עו"ד (${result.lawyerPct}% + מע"מ)`,
      value: fmt(lawyerTotal),
      sub: hasInputs ? `${formatILS(lawyerBase)} + מע"מ ${formatILS(lawyerVat)}` : null,
      bold: false,
      accent: false,
    },
    hasAgent
      ? {
          label: 'דמי תיווך (2% + מע"מ)',
          value: fmt(agentTotal),
          sub: hasInputs ? `${formatILS(agentBase)} + מע"מ ${formatILS(agentVat)}` : null,
          bold: false,
          accent: false,
        }
      : {
          label: "דמי תיווך",
          value: "לא רלוונטי",
          sub: "לא נכלל בסכום",
          bold: false,
          accent: false,
          muted: true,
        },
    hasMortgage
      ? { label: "שמאות (אומדן)", value: fmt(appraisalFee), sub: "נדרשת לאישור משכנתא", bold: false, accent: false }
      : { label: "שמאות", value: "לא נדרש", sub: "אין משכנתא", bold: false, accent: false, muted: true },
    hasMortgage
      ? { label: "פתיחת תיק משכנתא (אומדן)", value: fmt(mortgageSetupFee), sub: null, bold: false, accent: false }
      : null,
    { label: "רישום בטאבו / ברשות (אומדן)", value: fmt(registrationFee), sub: null, bold: false, accent: false },
    { label: "ביטוח מבנה — שנה ראשונה (אומדן)", value: fmt(insuranceFee), sub: null, bold: false, accent: false },
    renovation > 0 || hasInputs
      ? { label: "שיפוץ ראשוני", value: renovation > 0 ? fmt(renovation) : "לא הוזן", sub: "לא כולל מע\"מ", bold: false, accent: false, muted: renovation === 0 }
      : null,
  ].filter(Boolean);

  return (
    <div className="mt-10 overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-6 py-4 text-right text-sm font-black text-slate-700">מרכיב</th>
              <th className="px-6 py-4 text-left text-sm font-black text-slate-700">סכום</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <tr key={i} className={row.bold ? "bg-slate-50/50" : ""}>
                <td className="px-6 py-4">
                  <p className={`text-sm font-black ${row.muted ? "text-slate-400" : "text-slate-900"}`}>{row.label}</p>
                  {row.sub && <p className="mt-0.5 text-xs font-semibold text-slate-500">{row.sub}</p>}
                </td>
                <td className={`number-display px-6 py-4 text-left text-base font-black ${row.muted ? "text-slate-400" : row.accent ? "text-violet-700" : "text-slate-950"}`}>
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-violet-50">
              <td className="px-6 py-5">
                <p className="text-base font-black text-slate-900">עלויות נוספות (ללא מחיר הנכס)</p>
                <p className="text-xs font-bold text-slate-500">סה"כ מסים, שכ"ט, עלויות</p>
              </td>
              <td className="number-display px-6 py-5 text-left text-xl font-black text-violet-700">{fmt(totalAdditional)}</td>
            </tr>
            <tr className="border-t border-violet-200 bg-gradient-to-l from-violet-700 to-violet-900 text-white">
              <td className="px-6 py-5">
                <p className="text-base font-black">עלות כוללת אמיתית</p>
                <p className="text-xs font-bold text-violet-200">מחיר נכס + כל העלויות</p>
              </td>
              <td className="number-display px-6 py-5 text-left text-2xl font-black">{fmt(totalCost)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="border-t border-slate-100 px-6 py-4 text-xs font-semibold leading-5 text-slate-500">
        * מס רכישה לפי מדרגות 2024. שמאות, פתיחת תיק, ביטוח ורישום הם אומדנים בלבד. שיעורי מע"מ 17%. יש לוודא מול עו"ד ורואה חשבון לפני חתימה.
      </p>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function PageFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-10">
      <div className="mx-auto max-w-6xl px-4 text-sm font-semibold leading-7 text-slate-500 sm:px-6">
        <p className="font-black text-slate-900">Finzo — מחשבון עלות עסקת נדל"ן</p>
        <p>החישוב הוא אומדן ראשוני בלבד ואינו מהווה ייעוץ משפטי, פיננסי או מס. מדרגות מס רכישה עשויות להשתנות. יש לוודא מול עורך דין לפני כל עסקה.</p>
        <div className="mt-4 flex flex-wrap gap-4">
          <a href="/" className="font-bold text-violet-700 hover:underline">בדיקת זכאות למשכנתא</a>
          <a href="/refinance-check" className="font-bold text-violet-700 hover:underline">מחזור משכנתא</a>
          <a href="/blog" className="font-bold text-violet-700 hover:underline">בלוג משכנתאות</a>
          <a href="/guides" className="font-bold text-violet-700 hover:underline">מדריכים</a>
        </div>
      </div>
    </footer>
  );
}

// ─── Mobile Sticky CTA ────────────────────────────────────────────────────────

function MobileStickyCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-violet-100 bg-white/95 px-4 pt-3 pb-4 shadow-[0_-16px_40px_rgba(15,23,42,0.10)] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-sm grid-cols-2 gap-3">
        <a href="#calculator" className="rounded-full bg-violet-700 px-4 py-3 text-center text-sm font-black text-white shadow-[0_12px_28px_rgba(109,40,217,0.28)]">
          חישוב מיידי
        </a>
        <a href="#lead" className="rounded-full border border-violet-200 bg-violet-50 px-4 py-3 text-center text-sm font-black text-violet-800">
          בדיקה עם יועץ
        </a>
      </div>
    </div>
  );
}

// ─── Shared UI components ─────────────────────────────────────────────────────

function SectionHeader({ eyebrow, title, text }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <span className="inline-flex rounded-full bg-violet-50 px-4 py-2 text-sm font-black text-violet-700">{eyebrow}</span>
      <h2 className="mt-5 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{title}</h2>
      <p className="mt-4 text-lg leading-8 text-slate-600">{text}</p>
    </div>
  );
}

function InfoCard({ title, text }) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">{title}</h3>
      <p className="mt-3 leading-7 text-slate-600">{text}</p>
    </article>
  );
}

function DarkMetric({ label, value }) {
  return (
    <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/10">
      <p className="text-xs font-black text-violet-100">{label}</p>
      <p className="number-display mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function MoneyField({ label, value, onChange, helper }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <span className="relative mt-2 block">
        <input
          inputMode="numeric"
          value={displayNumber(value)}
          onChange={(e) => onChange(cleanNumber(e.target.value))}
          className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pl-10 text-base font-black text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">₪</span>
      </span>
      {helper && <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{helper}</span>}
    </label>
  );
}

function TextField({ label, value, onChange, placeholder = "", autoComplete }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
      />
    </label>
  );
}
