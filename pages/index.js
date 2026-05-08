import Head from "next/head";
import { useEffect, useMemo, useRef, useState } from "react";
import { cleanNumber, displayNumber, formatILS, formatPct } from "../lib/format";
import { calculateMortgageAnalysis } from "../lib/mortgage";

const initialData = {
  income: "",
  expenses: "",
  loans: "",
  loansToClose: "",
  currentHousing: "",
  price: "",
  equity: "",
  mortgageAmount: "",
  annualRate: "",
  indexation: "unlinked",
  repaymentMethod: "spitzer",
  years: 30,
  propertyType: "single",
  credit: "clean",
};

const fallbackRates = {
  bankOfIsraelRate: 4.5,
  primeRate: 6,
  inflation12m: 3.1,
  nextRateDecision: "לא זמין",
  lastUpdated: "2025-04",
  primeMortgage: 5.1,
  fixedUnlinked: 5.45,
  fixedLinked: 3.9,
  variable5: 5.35,
  variable5Linked: 3.7,
};

const navLinks = [
  ["דף הבית", "#home"],
  ["מחשבון משכנתא", "#calculator"],
  ["מחזור משכנתא", "#refinance"],
  ["איך זה עובד", "#how-it-works"],
  ["שאלות נפוצות", "#faq"],
];

const trustItems = [
  "מבוסס נתוני ריבית",
  "חישוב יחס החזר",
  "בדיקת הון עצמי",
  "השוואת מצב קיים מול חדש",
];

const steps = [
  {
    title: "ממלאים נתונים",
    text: "הכנסה, הוצאות, מחיר נכס, הון עצמי ותקופת החזר.",
    icon: "M12 6v12m6-6H6",
  },
  {
    title: "מקבלים חיווי בנקאי",
    text: "המערכת בודקת יחס החזר, LTV והתחייבויות קיימות.",
    icon: "M5 13l4 4L19 7",
  },
  {
    title: "רואים החזר משוער",
    text: "מקבלים אומדן החזר חודשי, יתרה למחיה ועלות ריבית.",
    icon: "M4 19h16M7 15l3-3 3 2 4-6",
  },
  {
    title: "משאירים פרטים ליועץ",
    text: "אם תרצו, אפשר להעביר את הנתונים לבדיקה אנושית.",
    icon: "M8 11a4 4 0 118 0M4 20a8 8 0 0116 0",
  },
];

const propertyOptions = [
  ["single", "דירה יחידה - עד 75% מימון"],
  ["replacement", "משפרי דיור - עד 70% מימון"],
  ["investment", "דירה להשקעה - עד 50% מימון"],
];

const creditOptions = [
  ["clean", "תקין"],
  ["unknown", "לא בטוח"],
  ["late", "היו פיגורים"],
  ["negative", "BDI שלילי"],
];

const indexationOptions = [
  ["unlinked", "לא צמוד למדד"],
  ["linked", "צמוד למדד"],
];

const repaymentOptions = [
  ["spitzer", "לוח שפיצר - החזר קבוע"],
  ["equalPrincipal", "קרן שווה - החזר יורד"],
];

const faqItems = [
  {
    question: "האם זו בדיקת זכאות רשמית?",
    answer:
      "לא. זו סימולציה ראשונית לפי הנתונים שהוזנו. אישור בנקאי מתקבל רק לאחר בדיקת מסמכים, שמאות ותנאי הבנק.",
  },
  {
    question: "כמה הון עצמי צריך בישראל?",
    answer:
      "בדרך כלל דירה יחידה מאפשרת עד 75% מימון, משפרי דיור עד 70%, ודירה להשקעה עד 50%. המחשבון מציג אם חסר הון עצמי לפי סוג העסקה.",
  },
  {
    question: "מהו יחס החזר תקין?",
    answer:
      "רוב הבנקים יעדיפו החזר משכנתא סביב 30%-35% מהכנסה נטו, אך הם בודקים גם הלוואות קיימות, יציבות הכנסה ויתרה למחיה.",
  },
  {
    question: "מתי כדאי לדבר עם יועץ?",
    answer:
      "כאשר יחס ההחזר גבולי, חסר הון עצמי, יש הלוואות קיימות או כשאתם רוצים להשוות תמהיל וריביות לפני פנייה לבנק.",
  },
];

function toNumeric(value) {
  return Number(cleanNumber(value, true)) || 0;
}

function hasEnoughData(data) {
  const income = toNumeric(data.income);
  const price = toNumeric(data.price);
  const equity = toNumeric(data.equity);
  const mortgageAmount = toNumeric(data.mortgageAmount);
  return income > 0 && (mortgageAmount > 0 || (price > 0 && equity >= 0));
}

function approvalLabel(analysis, ready) {
  if (!ready) return "הזינו נתונים";
  if (analysis.hardLimitExceeded) return "דורש התאמה לפני פנייה לבנק";
  if (analysis.approval >= 75) return "בסיס טוב לבדיקה";
  if (analysis.approval >= 45) return "גבולי - כדאי לבדוק";
  return "סיכון גבוה";
}

function leadRecommendation(analysis, ready) {
  if (!ready) return "מלאו את הנתונים המרכזיים כדי לקבל אומדן ראשוני.";
  if (analysis.hardLimitExceeded) return "מומלץ לבדוק התאמות לפני הגשה כדי להפחית סיכון לסירוב.";
  if (analysis.approval >= 70) return "יש בסיס טוב לבדיקה מקצועית - עכשיו כדאי לבדוק ריביות, תמהיל וחיסכון אפשרי.";
  if (analysis.approval >= 45) return "התיק גבולי. לפני פנייה לבנק כדאי לבדוק מה משפר את יחס ההחזר או אחוז המימון.";
  return "מומלץ לבצע התאמות לפני הגשה כדי להפחית סיכון לסירוב.";
}

function displayMoney(value, ready = true) {
  return ready ? formatILS(value) : "--";
}

function displayPercent(value, ready = true) {
  return ready ? formatPct(value) : "--";
}

export default function Home() {
  const [data, setData] = useState(initialData);
  const [rates, setRates] = useState(fallbackRates);
  const [lead, setLead] = useState({ name: "", phone: "", city: "", mortgageAmount: "", purchaseStatus: "" });
  const [leadSent, setLeadSent] = useState(false);
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [openFaq, setOpenFaq] = useState(null);
  const leadSuccessRef = useRef(null);

  useEffect(() => {
    fetch("/api/rates")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("rates unavailable"))))
      .then((json) => setRates({ ...fallbackRates, ...json }))
      .catch(() => setRates(fallbackRates));
  }, []);

  const analysis = useMemo(() => calculateMortgageAnalysis(data, rates), [data, rates]);
  const ready = useMemo(() => hasEnoughData(data), [data]);
  const recommendation = useMemo(() => leadRecommendation(analysis, ready), [analysis, ready]);

  function updateData(key, value) {
    setData((current) => ({ ...current, [key]: value }));
  }

  function updateLead(key, value) {
    setLead((current) => ({ ...current, [key]: value }));
    if (leadError) setLeadError("");
  }

  async function submitLead(event) {
    event.preventDefault();
    if (leadLoading || leadSent) return;

    const phone = cleanNumber(lead.phone);
    if (lead.name.trim().length < 2 || !/^05\d{8}$|^9725\d{8}$/.test(phone)) {
      setLeadError("יש להזין שם וטלפון ישראלי תקין.");
      return;
    }

    setLeadLoading(true);
    setLeadError("");

    const leadPayload = {
      ...lead,
      phone,
      source: "homepage",
      mortgageAmount: cleanNumber(lead.mortgageAmount) || String(analysis.mortgage || ""),
      purchaseStatus: lead.purchaseStatus || data.propertyType,
      approval: Math.round(analysis.approval || 0),
      mainIssue: ready ? analysis.mainIssue : "טרם הוזנו נתונים מלאים",
      createdAt: new Date().toISOString(),
    };

    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead: leadPayload, analysis }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.ok !== true) {
        throw new Error(result?.message || result?.error || "LEAD_SUBMIT_FAILED");
      }

      try {
        const saved = JSON.parse(localStorage.getItem("mortgai_leads") || "[]");
        localStorage.setItem("mortgai_leads", JSON.stringify([{ ...leadPayload, analysis }, ...saved].slice(0, 50)));
      } catch {
        // Local backup is best-effort only. Server response already succeeded.
      }

      setLeadSent(true);
      window.requestAnimationFrame(() => leadSuccessRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
    } catch {
      setLeadSent(false);
      setLeadError("הפנייה לא נשלחה. נסו שוב או צרו קשר ישירות.");
    } finally {
      setLeadLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>מחשבון משכנתא חכם | בדיקת זכאות והחזר חודשי</title>
        <meta
          name="description"
          content="בדקו תוך דקה כמה משכנתא תוכלו לקבל, מה ההחזר המשוער ומה אומדן סיכוי האישור שלכם לפי נתוני הכנסה, הון עצמי ואחוז מימון."
        />
      </Head>

      <main id="home" dir="rtl" className="min-h-screen bg-white text-slate-950">
        <Header />
        <Hero />
        <TrustStrip />
        <HowItWorks />
        <CalculatorSection
          data={data}
          updateData={updateData}
          analysis={analysis}
          ready={ready}
          recommendation={recommendation}
        />
        <ResultsSection analysis={analysis} ready={ready} />
        <RefinanceSection />
        <LeadSection
          lead={lead}
          updateLead={updateLead}
          submitLead={submitLead}
          leadLoading={leadLoading}
          leadSent={leadSent}
          leadError={leadError}
          successRef={leadSuccessRef}
          analysis={analysis}
          ready={ready}
        />
        <FaqSection openFaq={openFaq} setOpenFaq={setOpenFaq} />
        <Footer />
      </main>
    </>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <a href="#home" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-100 text-lg font-black text-violet-700">
            זכ
          </span>
          <span className="leading-tight">
            <span className="block text-base font-black text-slate-950">בדיקת זכאות למשכנתא</span>
            <span className="hidden text-xs font-bold text-slate-500 sm:block">תשובה פשוטה לפני שפונים לבנק</span>
          </span>
        </a>

        <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 lg:flex">
          {navLinks.map(([label, href]) => (
            <a key={href} href={href} className="transition hover:text-violet-700">
              {label}
            </a>
          ))}
        </nav>

        <a
          href="#calculator"
          className="rounded-full bg-violet-700 px-5 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(109,40,217,0.28)] transition hover:bg-violet-800"
        >
          בדיקת זכאות חינם
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.18),transparent_45%)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
        <div className="mx-auto max-w-2xl text-center lg:text-right">
          <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-black text-violet-800">
            סימולציה ראשונית למשכנתאות בישראל
          </span>
          <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            מחשבון משכנתא חכם לבדיקת זכאות והחזר חודשי
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg font-semibold leading-8 text-slate-600 lg:mx-0">
            בדקו תוך דקה כמה משכנתא תוכלו לקבל, מה ההחזר המשוער ומה סיכוי האישור שלכם.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <a
              href="#calculator"
              className="rounded-full bg-violet-700 px-8 py-4 text-center text-base font-black text-white shadow-[0_18px_44px_rgba(109,40,217,0.32)] transition hover:-translate-y-0.5 hover:bg-violet-800"
            >
              בדקו זכאות חינם
            </a>
            <a
              href="/refinance-check"
              className="rounded-full border border-violet-200 bg-white px-8 py-4 text-center text-base font-black text-violet-800 shadow-sm transition hover:border-violet-300 hover:bg-violet-50"
            >
              בדיקת מחזור משכנתא
            </a>
          </div>
          <p className="mt-5 text-sm font-bold text-slate-500">
            אומדן בלבד, לא אישור בנקאי או ייעוץ משכנתאות רשמי.
          </p>
        </div>

        <HeroIllustration />
      </div>
    </section>
  );
}

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

function TrustStrip() {
  return (
    <section className="border-y border-slate-200 bg-slate-50/80">
      <div className="mx-auto grid max-w-6xl gap-3 px-4 py-6 sm:grid-cols-2 sm:px-6">
        {trustItems.map((item) => (
          <div key={item} className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-700">
              <CheckIcon />
            </span>
            <span className="font-black text-slate-800">{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <SectionHeader
        eyebrow="איך זה עובד"
        title="ארבעה צעדים פשוטים לפני שפונים לבנק"
        text="המטרה היא לתת תמונת מצב ברורה ולא להציף אתכם במונחים מקצועיים מוקדם מדי."
      />
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {steps.map((step, index) => (
          <div key={step.title} className="flex h-full gap-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-700">
              <LineIcon path={step.icon} />
            </span>
            <div>
              <p className="text-sm font-black text-violet-700">שלב {index + 1}</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">{step.title}</h3>
              <p className="mt-2 leading-7 text-slate-600">{step.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CalculatorSection({ data, updateData, analysis, ready, recommendation }) {
  return (
    <section id="calculator" className="bg-gradient-to-b from-white via-violet-50/35 to-white py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader
          eyebrow="מחשבון משכנתא"
          title="הנתונים לבדיקה"
          text="מלאו רק מה שאתם יודעים - התוצאה תתעדכן אוטומטית ברגע שיש מספיק נתונים לחישוב."
        />

        <div className="mt-10 grid items-start gap-6 lg:grid-cols-2">
          <MortgageForm data={data} updateData={updateData} />
          <LiveResultPanel analysis={analysis} ready={ready} recommendation={recommendation} />
        </div>
      </div>
    </section>
  );
}

function MortgageForm({ data, updateData }) {
  return (
    <form className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField label="הכנסה חודשית נטו" value={data.income} onChange={(value) => updateData("income", value)} />
        <MoneyField label="הוצאות קבועות" value={data.expenses} onChange={(value) => updateData("expenses", value)} />
        <MoneyField label="הלוואות קיימות היום" value={data.loans} onChange={(value) => updateData("loans", value)} />
        <MoneyField label="הלוואות שייסגרו" value={data.loansToClose} onChange={(value) => updateData("loansToClose", value)} />
        <MoneyField
          label="החזר משכנתא / שכירות כיום"
          helper="כמה אתם משלמים היום על דיור לפני העסקה החדשה"
          value={data.currentHousing}
          onChange={(value) => updateData("currentHousing", value)}
        />
        <SelectField label="סוג עסקה" value={data.propertyType} onChange={(value) => updateData("propertyType", value)} options={propertyOptions} />
        <MoneyField label="מחיר הנכס" value={data.price} onChange={(value) => updateData("price", value)} />
        <MoneyField label="הון עצמי" value={data.equity} onChange={(value) => updateData("equity", value)} />
        <MoneyField
          label="סכום משכנתא ידני"
          helper="אפשר להשאיר ריק - נחושב לפי מחיר פחות הון עצמי"
          value={data.mortgageAmount}
          onChange={(value) => updateData("mortgageAmount", value)}
        />
        <NumberField label="תקופה בשנים" min="5" max="30" value={data.years} onChange={(value) => updateData("years", value)} />
        <RateField label="ריבית שנתית משוערת" value={data.annualRate} onChange={(value) => updateData("annualRate", value)} />
        <SelectField label="סטטוס אשראי" value={data.credit} onChange={(value) => updateData("credit", value)} options={creditOptions} />
        <SelectField label="סוג הצמדה" value={data.indexation} onChange={(value) => updateData("indexation", value)} options={indexationOptions} />
        <SelectField label="שיטת החזר" value={data.repaymentMethod} onChange={(value) => updateData("repaymentMethod", value)} options={repaymentOptions} />
      </div>
    </form>
  );
}

function LiveResultPanel({ analysis, ready, recommendation }) {
  const score = ready ? Math.round(analysis.approval) : 0;

  return (
    <aside className="rounded-[34px] border border-violet-100 bg-gradient-to-br from-violet-700 to-violet-950 p-6 text-white shadow-[0_24px_70px_rgba(76,29,149,0.28)] sm:p-8">
      <p className="text-sm font-black text-violet-100">חיווי בזמן אמת</p>
      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black">אומדן סיכוי אישור</h3>
          <p className="mt-2 text-violet-100">{approvalLabel(analysis, ready)}</p>
        </div>
        <div className="text-left">
          <span className="number-display text-5xl font-black">{ready ? `${score}%` : "--"}</span>
        </div>
      </div>

      <div className="mt-7 h-3 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-white transition-all duration-500"
          style={{ width: ready ? `${Math.min(100, Math.max(0, score))}%` : "0%" }}
        />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <DarkMetric label="החזר חודשי משוער" value={displayMoney(analysis.monthly, ready)} />
        <DarkMetric label="יחס החזר" value={displayPercent(analysis.mortgageOnlyRatio, ready)} />
        <DarkMetric label="אחוז מימון LTV" value={displayPercent(analysis.ltv, ready)} />
        <DarkMetric label="יתרה למחיה" value={displayMoney(analysis.afterHousing, ready)} />
      </div>

      <div className="mt-6 rounded-3xl bg-white/10 p-5 ring-1 ring-white/10">
        <p className="text-sm font-black text-violet-100">הבעיה המרכזית</p>
        <p className="mt-2 text-lg font-black">{ready ? analysis.mainIssue : "הזינו נתונים כדי לקבל חיווי"}</p>
        <p className="mt-3 leading-7 text-violet-50">{recommendation}</p>
      </div>

      <a
        href="#lead"
        className="mt-6 block rounded-full bg-white px-6 py-4 text-center text-base font-black text-violet-800 shadow-lg transition hover:bg-violet-50"
      >
        בדיקה ראשונית ללא התחייבות
      </a>
    </aside>
  );
}

function ResultsSection({ analysis, ready }) {
  const flowText = !ready
    ? "הזינו נתונים כדי לראות השוואה."
    : analysis.afterHousing <= 0
      ? "התזרים אחרי העסקה שלילי - כדאי להקטין החזר או לבדוק התאמות."
      : analysis.monthlyGap >= 0
        ? "לפי הנתונים, התזרים החודשי משתפר או נשאר יציב."
        : "לפי הנתונים, העסקה מכבידה על התקציב החודשי.";

  const resultCards = [
    ["אומדן סיכוי אישור", ready ? `${Math.round(analysis.approval)}%` : "--", approvalLabel(analysis, ready)],
    ["החזר חודשי משוער", displayMoney(analysis.monthly, ready), "לפי תקופה, ריבית ושיטת החזר"],
    ["יחס החזר", displayPercent(analysis.mortgageOnlyRatio, ready), "משכנתא בלבד מתוך הכנסה נטו"],
    ["הון עצמי", ready ? (analysis.missingEquity > 0 ? `חסר ${formatILS(analysis.missingEquity)}` : "תקין") : "--", "לפי מגבלת LTV לסוג העסקה"],
    ["יתרה למחיה", displayMoney(analysis.afterHousing, ready), "לאחר הוצאות, הלוואות ומשכנתא"],
    ["סך ריבית צפויה", displayMoney(analysis.totalInterestEstimate, ready), "לאורך כל תקופת המשכנתא"],
    ["סך תשלום צפוי", displayMoney(analysis.totalPaidEstimate, ready), "החזר כולל לאורך התקופה"],
    ["מצב נוכחי מול חדש", ready ? formatILS(analysis.monthlyGap) : "--", flowText],
  ];

  return (
    <section id="results" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <SectionHeader
        eyebrow="תוצאות"
        title="קודם תשובה פשוטה, אחר כך המספרים"
        text="התוצאה מציגה את המדדים החשובים ביותר לקבלת החלטה ראשונית. הניתוח המלא נשאר זמין למי שרוצה להעמיק."
      />

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {resultCards.map(([label, value, note]) => (
          <ResultCard key={label} label={label} value={value} note={note} />
        ))}
      </div>

      <details className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5 open:bg-white sm:p-7">
        <summary className="cursor-pointer text-lg font-black text-violet-800">צפייה בניתוח פיננסי מלא</summary>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <DetailRow label="יחס התחייבויות כולל" value={displayPercent(analysis.totalObligationsRatio, ready)} />
          <DetailRow label="יחס שמרני אחרי הוצאות והלוואות" value={displayPercent(analysis.disposableRepaymentRatio, ready)} />
          <DetailRow label="סכום משכנתא" value={displayMoney(analysis.mortgage, ready)} />
          <DetailRow label="הכנסה נטו" value={displayMoney(analysis.income, ready)} />
          <DetailRow label="הלוואות שיישארו אחרי העסקה" value={displayMoney(analysis.remainingLoansMonthly, ready)} />
          <DetailRow label="חיסכון חודשי מסגירת הלוואות" value={displayMoney(analysis.loanClosureMonthlySaving, ready)} />
          <DetailRow label="תרחיש עליית ריבית" value={displayMoney(analysis.monthlyHigh, ready)} />
          <DetailRow label="הכנסה נדרשת לאומדן זה" value={displayMoney(analysis.requiredIncomeForMortgage, ready)} />
        </div>
      </details>
    </section>
  );
}

function RefinanceSection() {
  return (
    <section id="refinance" className="bg-violet-950 py-20 text-white">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <span className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-black text-violet-100">
            מחזור משכנתא
          </span>
          <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">בדיקת כדאיות למחזור משכנתא</h2>
          <p className="mt-4 max-w-xl text-lg leading-8 text-violet-100">
            כבר יש לכם משכנתא? בדקו אם שינוי ריבית, תקופה או תמהיל עשוי להפחית החזר או ריבית כוללת. בהמשך ניתן להעלות דוח משכנתא לבדיקה נוחה יותר.
          </p>
        </div>
        <div className="rounded-[32px] border border-white/10 bg-white/10 p-6">
          <p className="text-xl font-black">מה בודקים?</p>
          <ul className="mt-4 space-y-3 text-violet-50">
            <li>• החזר חודשי נוכחי מול החזר חדש</li>
            <li>• חיסכון ריבית משוער לאחר עלויות מחזור</li>
            <li>• נקודת איזון והאם היא בתוך התקופה שנותרה</li>
          </ul>
          <a
            href="/refinance-check"
            className="mt-6 block rounded-full bg-white px-6 py-4 text-center font-black text-violet-900 transition hover:bg-violet-50"
          >
            בדיקת מחזור משכנתא
          </a>
        </div>
      </div>
    </section>
  );
}

function LeadSection({ lead, updateLead, submitLead, leadLoading, leadSent, leadError, successRef, analysis, ready }) {
  return (
    <section id="lead" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <div className="rounded-[34px] bg-gradient-to-br from-violet-50 to-white p-7 ring-1 ring-violet-100">
          <span className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-violet-800 shadow-sm">
            בדיקה אנושית
          </span>
          <h2 className="mt-5 text-3xl font-black text-slate-950">רוצים לבדוק איך לשפר את הסיכוי והתנאים?</h2>
          <p className="mt-4 leading-8 text-slate-600">
            השאירו פרטים לבדיקה ראשונית. יועץ יוכל לבחון את הנתונים, לזהות נקודות חולשה ולבדוק אפשרות לשיפור תמהיל וריביות.
          </p>
          <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-black text-slate-500">לפי הסימולציה</p>
            <p className="mt-2 text-xl font-black text-violet-900">
              {ready ? `${Math.round(analysis.approval)}% · ${analysis.mainIssue}` : "מלאו נתונים כדי לקבל אומדן"}
            </p>
          </div>
        </div>

        <form onSubmit={submitLead} className="rounded-[34px] border border-slate-200 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="שם מלא" value={lead.name} onChange={(value) => updateLead("name", value)} required />
            <TextField label="טלפון" value={lead.phone} onChange={(value) => updateLead("phone", value)} placeholder="05X-XXXXXXX" required />
            <TextField label="עיר" value={lead.city} onChange={(value) => updateLead("city", value)} />
            <MoneyField label="סכום משכנתא" value={lead.mortgageAmount} onChange={(value) => updateLead("mortgageAmount", value)} />
            <TextField
              label="סטטוס רכישה"
              value={lead.purchaseStatus}
              onChange={(value) => updateLead("purchaseStatus", value)}
              placeholder="לדוגמה: לפני חוזה / אחרי חוזה"
              className="sm:col-span-2"
            />
          </div>

          {leadError && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{leadError}</p>}
          {leadSent && <p ref={successRef} className="mt-4 rounded-2xl bg-emerald-50 px-4 py-4 text-center text-sm font-black text-emerald-700">הפנייה נשלחה בהצלחה. נחזור אליכם בהקדם.</p>}

          <button
            type="submit"
            disabled={leadLoading || leadSent}
            className="mt-5 w-full rounded-full bg-violet-700 px-7 py-4 text-base font-black text-white shadow-[0_16px_40px_rgba(109,40,217,0.25)] transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {leadLoading ? "שולח..." : leadSent ? "נשלח בהצלחה" : "בדיקה ראשונית ללא התחייבות"}
          </button>
          <p className="mt-3 text-center text-xs font-bold text-slate-500">הפרטים נשמרים לצורך חזרה אליך בלבד.</p>
        </form>
      </div>
    </section>
  );
}

function FaqSection({ openFaq, setOpenFaq }) {
  return (
    <section id="faq" className="bg-slate-50 py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <SectionHeader eyebrow="שאלות נפוצות" title="מה חשוב לדעת לפני בדיקת משכנתא?" text="תשובות קצרות לשאלות שעולות לפני פנייה לבנק או ליועץ." />
        <div className="mt-10 space-y-3">
          {faqItems.map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={item.question} className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-right"
                >
                  <span className="text-lg font-black text-slate-950">{item.question}</span>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-50 text-xl font-black text-violet-700">
                    {isOpen ? "-" : "+"}
                  </span>
                </button>
                {isOpen && <p className="px-6 pb-6 leading-8 text-slate-600">{item.answer}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 text-sm font-semibold text-slate-500 sm:px-6">
        <p className="font-black text-slate-900">בדיקת זכאות למשכנתא</p>
        <p>החישוב הוא סימולציה ראשונית בלבד ואינו מהווה ייעוץ משכנתאות, הצעה מחייבת או אישור בנקאי.</p>
      </div>
    </footer>
  );
}

function SectionHeader({ eyebrow, title, text }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <span className="inline-flex rounded-full bg-violet-50 px-4 py-2 text-sm font-black text-violet-700">{eyebrow}</span>
      <h2 className="mt-5 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{title}</h2>
      <p className="mt-4 text-lg leading-8 text-slate-600">{text}</p>
    </div>
  );
}

function MoneyField({ label, value, onChange, helper, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-black text-slate-700">{label}</span>
      <span className="relative mt-2 block">
        <input
          inputMode="numeric"
          value={displayNumber(value)}
          onChange={(event) => onChange(cleanNumber(event.target.value))}
          className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pl-10 text-base font-black text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">₪</span>
      </span>
      {helper && <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{helper}</span>}
    </label>
  );
}

function TextField({ label, value, onChange, placeholder = "", required = false, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
      />
    </label>
  );
}

function NumberField({ label, value, onChange, min, max }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-black text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
      />
    </label>
  );
}

function RateField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <span className="relative mt-2 block">
        <input
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(cleanNumber(event.target.value, true))}
          className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pl-10 text-base font-black text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">%</span>
      </span>
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-black text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
      >
        {options.map(([optionValue, label]) => (
          <option key={optionValue} value={optionValue}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DarkMetric({ label, value }) {
  return (
    <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/10">
      <p className="text-xs font-black text-violet-100">{label}</p>
      <p className="number-display mt-2 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function ResultCard({ label, value, note }) {
  return (
    <article className="flex h-full flex-col justify-between rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-black text-slate-500">{label}</p>
        <p className="number-display mt-3 text-3xl font-black text-slate-950">{value}</p>
      </div>
      <p className="mt-4 leading-7 text-slate-600">{note}</p>
    </article>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="font-bold text-slate-600">{label}</span>
      <span className="number-display font-black text-slate-950">{value}</span>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LineIcon({ path }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
