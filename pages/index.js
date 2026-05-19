import Head from "next/head";
import { useEffect, useMemo, useRef, useState } from "react";
import { cleanNumber, displayNumber, formatILS, formatPct } from "../lib/format";
import { calculateMortgageAnalysis } from "../lib/mortgage";
import { initializeAnalyticsLayer, trackEvent as trackAnalyticsEvent } from "../lib/analytics";
import BrandLogo from "../components/BrandLogo";
import {
  HOME_SEO,
  absoluteUrl,
  canonicalUrl,
  faqSchema,
  financialServiceSchema,
  organizationSchema,
  stringifyJsonLd,
  webPageSchema,
} from "../lib/seo";

const PROGRESS_BAR_STYLE = { willChange: "width" };

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
  ["מחשבון משכנתא", "#eligibility-check"],
  ["מחזור משכנתא", "#refinance"],
  ["איך זה עובד", "#how-it-works"],
  ["שאלות נפוצות", "#faq"],
  ["בלוג", "/blog"],
];

const trustItems = [
  { text: "הנתונים נשארים אצלנו ולא נשלחים לבנק ללא אישורך", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
  { text: "הבדיקה היא אומדן ראשוני בלבד — לא אישור בנקאי", icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" },
  { text: "המטרה היא לעזור לך להבין איפה אתה עומד לפני פנייה ליועץ או לבנק", icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { text: "תוצאה ראשונית תוך דקה — ללא עלות", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
];

const steps = [
  { title: "ממלאים נתונים", text: "הכנסה, הוצאות, מחיר נכס, הון עצמי ותקופת החזר.", icon: "M12 6v12m6-6H6" },
  { title: "מקבלים בדיקה חכמה", text: "המערכת מבצעת ניתוח פיננסי ראשוני של יחס החזר, LTV והתחייבויות קיימות.", icon: "M5 13l4 4L19 7" },
  { title: "רואים אומדן ראשוני", text: "מקבלים הפרדה ברורה בין אומדן זכאות, החזר חודשי ואינדיקציית סיכון.", icon: "M4 19h16M7 15l3-3 3 2 4-6" },
  { title: "ממשיכים ליועץ מקצועי", text: "רק אם תרצו, הנתונים עוברים להמשך בדיקה אנושית ללא התחייבות.", icon: "M8 11a4 4 0 118 0M4 20a8 8 0 0116 0" },
];

const propertyOptions = [
  ["single", "דירה יחידה - לרוב עד כ-75% מימון"],
  ["replacement", "משפרי דיור - לרוב עד כ-70% מימון"],
  ["investment", "דירה להשקעה - לרוב עד כ-50% מימון"],
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

const wizardSteps = [
  { key: "property", title: "א. פרטי הנכס" },
  { key: "profile", title: "ב. הכנסות והתחייבויות" },
  { key: "terms", title: "ג. מצב אישי" },
  { key: "review", title: "סיכום" },
];

const faqItems = [
  {
    question: "האם FINZO מאשרת משכנתא?",
    answer: "לא. FINZO היא כלי לאומדן ראשוני בלבד. הבדיקה מציגה חיווי התחלתי לפי הנתונים שהזנת, אבל אישור משכנתא בפועל ניתן רק על ידי בנק, לאחר בדיקת מסמכים, שמאות ונתוני אשראי.",
  },
  {
    question: "האם הבדיקה מחייבת אותי?",
    answer: "לא. הבדיקה היא ראשונית ואינה מחייבת לשום פעולה. אין עלות, אין חוזה ואין שום התחייבות מצדך — גם אם תשאיר פרטים.",
  },
  {
    question: "האם הנתונים נשלחים לבנק?",
    answer: "לא. הנתונים שאתה מזין נשמרים אצלנו בלבד ולא מועברים לאף בנק ללא אישורך המפורש. אנחנו לא חולקים מידע אישי עם גורמים חיצוניים ללא הסכמה.",
  },
  {
    question: "מה קורה אחרי שאני משאיר פרטים?",
    answer: "יועץ מקצועי חוזר אליך לשיחה קצרה, עובר איתך על האומדן הראשוני ומכוון אותך לצעד הבא — ללא התחייבות ולפי הצורך שלך. אין לחץ ואין מכירות אגרסיביות.",
  },
  {
    question: "כמה הון עצמי צריך?",
    answer: "בדרך כלל, מגבלות המימון המקובלות לדירה ראשונה מגיעות עד כ-75%, למשפרי דיור עד כ-70%, ולדירה להשקעה עד כ-50%, בכפוף למדיניות הגוף המממן. המחשבון מציג אומדן ראשוני אם חסר הון עצמי לפי סוג העסקה.",
  },
  {
    question: "מהו יחס החזר תקין?",
    answer: "ברוב המקרים נהוג לראות יחס החזר סביב 30%-35% כטווח נוח לבדיקה. יחס החזר גבוה מ-40% עשוי להקשות על קבלת אישור, תלוי בהכנסה, בהלוואות קיימות וביתרה למחיה.",
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
  if (analysis.hardLimitExceeded) return "עשוי לדרוש התאמה לפני פנייה לבנק";
  if (analysis.approval >= 75) return "בסיס ראשוני טוב לבדיקה";
  if (analysis.approval >= 45) return "גבולי - כדאי לבדוק";
  return "סיכון גבוה";
}

function leadRecommendation(analysis, ready) {
  if (!ready) return "מלאו את הנתונים המרכזיים כדי לקבל אומדן ראשוני.";
  if (analysis.hardLimitExceeded) return "מומלץ לבצע בדיקה ראשונית של התאמות לפני הגשה, משום שהנתונים עשויים להשפיע על החלטת הגוף המממן.";
  if (analysis.approval >= 70) return "יש בסיס ראשוני טוב לבדיקה מקצועית - עכשיו כדאי לבדוק ריביות, תמהיל וחיסכון אפשרי.";
  if (analysis.approval >= 45) return "התיק גבולי. לפני פנייה לבנק כדאי לבדוק מה משפר את יחס ההחזר או אחוז המימון.";
  return "מומלץ לבצע התאמות ובדיקה מקצועית לפני הגשה, משום שהנתונים עשויים להקשות על קבלת אישור או להשפיע על תנאי ההלוואה.";
}

function evaluateLeadProfile(lead) {
  const monthlyIncome = toNumeric(lead.monthlyIncome);
  const propertyPrice = toNumeric(lead.propertyPrice);
  const equityAmount = toNumeric(lead.equityAmount);
  const equityRatio = propertyPrice > 0 ? (equityAmount / propertyPrice) * 100 : 0;

  let score = 0;
  if (monthlyIncome >= 22000) score += 2;
  else if (monthlyIncome >= 14000) score += 1;

  if (equityRatio >= 30) score += 2;
  else if (equityRatio >= 20) score += 1;

  if (lead.contractStatus === "signed") score += 2;
  else if (lead.contractStatus === "negotiation") score += 1;

  if (lead.creditStatus === "clean") score += 2;
  else if (lead.creditStatus === "unknown") score += 1;
  else if (lead.creditStatus === "bad") score -= 1;

  if (monthlyIncome < 10000) score -= 1;
  if (equityRatio > 0 && equityRatio < 15) score -= 1;

  const leadQuality = score >= 6 ? "חם" : score >= 3 ? "בינוני" : "חלש";
  const leadPriority = score >= 6 ? "גבוה" : score >= 3 ? "רגיל" : "נמוך";
  return { leadQuality, leadPriority, leadScore: score };
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
  const [lead, setLead] = useState({
    name: "",
    phone: "",
    city: "",
    mortgageAmount: "",
    purchaseStatus: "",
    propertyPrice: "",
    equityAmount: "",
    monthlyIncome: "",
    debtLevel: "",
    employmentStatus: "",
    contractStatus: "before",
    hasExistingMortgage: "no",
    requestedContactTime: "",
    creditStatus: "unknown",
    notes: "",
  });
  const [leadSent, setLeadSent] = useState(false);
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [bottomLead, setBottomLead] = useState({ name: "", phone: "", city: "" });
  const [bottomLeadSent, setBottomLeadSent] = useState(false);
  const [bottomLeadLoading, setBottomLeadLoading] = useState(false);
  const [bottomLeadError, setBottomLeadError] = useState("");
  const [openFaq, setOpenFaq] = useState(null);
  const [isInsideEligibility, setIsInsideEligibility] = useState(false);
  const leadSuccessRef = useRef(null);
  const bottomLeadSeenRef = useRef(false);
  const sourceMetaRef = useRef({
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    utmContent: "",
    utmTerm: "",
    referrer: "",
    landingPath: "",
  });
  const eventSentRef = useRef({ wizardStarted: false, wizardCompleted: false });

  useEffect(() => {
    fetch("/api/rates")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("rates unavailable"))))
      .then((json) => setRates({ ...fallbackRates, ...json }))
      .catch(() => setRates(fallbackRates));
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const utmFields = {
        utmSource: params.get("utm_source") || "",
        utmMedium: params.get("utm_medium") || "",
        utmCampaign: params.get("utm_campaign") || "",
        utmContent: params.get("utm_content") || "",
        utmTerm: params.get("utm_term") || "",
      };
      const sourceMeta = {
        ...utmFields,
        referrer: document.referrer || "",
        landingPath: `${window.location.pathname}${window.location.search}` || "",
      };
      sourceMetaRef.current = sourceMeta;
      setLead((current) => ({ ...current, ...sourceMeta }));
    } catch {
      // URL parsing not critical
    }
  }, []);

  useEffect(() => {
    initializeAnalyticsLayer();
  }, []);

  useEffect(() => {
    const section = document.getElementById("eligibility-check");
    if (!section || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      setIsInsideEligibility(entry.isIntersecting);
    }, { threshold: 0.2 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const section = document.getElementById("bottom-lead");
    if (!section || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !bottomLeadSeenRef.current) {
        bottomLeadSeenRef.current = true;
        trackEvent("bottom_lead_viewed");
      }
    }, { threshold: 0.35 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  function trackEvent(eventName, payload = {}) {
    trackAnalyticsEvent(eventName, payload, {
      source: "homepage",
      sourceMeta: sourceMetaRef.current || {},
    });
  }
  function handleCtaClick(location) {
    trackEvent("cta_click", { location });
  }

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

  function updateBottomLead(key, value) {
    setBottomLead((current) => ({ ...current, [key]: value }));
    if (bottomLeadError) setBottomLeadError("");
  }

  async function submitBottomLead(event) {
    event.preventDefault();
    if (bottomLeadLoading || bottomLeadSent) return;

    trackEvent("bottom_lead_submit_started");

    const phone = cleanNumber(bottomLead.phone);
    if (bottomLead.name.trim().length < 2 || !/^05\d{8}$|^9725\d{8}$/.test(phone)) {
      setBottomLeadError("יש להזין שם וטלפון ישראלי תקין.");
      return;
    }

    setBottomLeadLoading(true);
    setBottomLeadError("");

    const leadPayload = {
      ...bottomLead,
      ...sourceMetaRef.current,
      phone,
      source: "homepage_bottom",
      createdAt: new Date().toISOString(),
      approval: Math.round(analysis?.approval || 0),
      mainIssue: ready ? analysis.mainIssue : "פנייה מהטופס התחתון",
      estimatedApprovalResult: Math.round(analysis?.approval || 0),
      estimatedPayment: Math.round(analysis?.monthly || 0),
      propertyPrice: toNumeric(data?.price),
      equityAmount: toNumeric(data?.equity),
      monthlyIncome: toNumeric(data?.income),
      debtLevel: toNumeric(data?.loans) || toNumeric(data?.expenses) || 0,
    };

    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead: leadPayload, analysis }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.ok !== true || result?.success === false) {
        throw new Error(result?.message || result?.error || "BOTTOM_LEAD_SUBMIT_FAILED");
      }
      setBottomLeadSent(true);
      trackEvent("bottom_lead_submit_success");
    } catch {
      setBottomLeadSent(false);
      setBottomLeadError("הפנייה לא נשלחה. נסו שוב.");
    } finally {
      setBottomLeadLoading(false);
    }
  }

  async function submitLead(event) {
    event.preventDefault();
    if (leadLoading || leadSent) return;
    trackEvent("lead_submit_started", {
      approvalEstimate: Math.round(analysis?.approval || 0),
      paymentEstimate: Math.round(analysis?.monthly || 0),
    });

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
      estimatedApprovalResult: Math.round(analysis?.approval || 0),
      estimatedPayment: Math.round(analysis?.monthly || 0),
      propertyPrice: toNumeric(lead.propertyPrice) || toNumeric(data?.price),
      equityAmount: toNumeric(lead.equityAmount) || toNumeric(data?.equity),
      monthlyIncome: toNumeric(lead.monthlyIncome) || toNumeric(data?.income),
      debtLevel: toNumeric(lead.debtLevel) || toNumeric(data?.loans) || toNumeric(data?.expenses) || 0,
      employmentStatus: lead.employmentStatus || "",
      contractStatus: lead.contractStatus || "",
      hasExistingMortgage: lead.hasExistingMortgage || "",
      requestedContactTime: lead.requestedContactTime || "",
      creditStatus: lead.creditStatus || "",
      notes: lead.notes?.trim() || "",
    };
    const { leadQuality, leadPriority, leadScore } = evaluateLeadProfile(leadPayload);
    leadPayload.leadQuality = leadQuality;
    leadPayload.leadPriority = leadPriority;
    leadPayload.leadScore = leadScore;

    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead: leadPayload, analysis }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.ok !== true || result?.success === false) {
        throw new Error(result?.message || result?.error || "LEAD_SUBMIT_FAILED");
      }

      try {
        const saved = JSON.parse(localStorage.getItem("mortgai_leads") || "[]");
        localStorage.setItem("mortgai_leads", JSON.stringify([{ ...leadPayload, analysis }, ...saved].slice(0, 50)));
      } catch {
        // Local backup is best-effort only. Server response already succeeded.
      }

      setLeadSent(true);
      trackEvent("lead_submit_success", {
        approvalEstimate: Math.round(analysis?.approval || 0),
        paymentEstimate: Math.round(analysis?.monthly || 0),
      });
      window.requestAnimationFrame(() => leadSuccessRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
    } catch (error) {
      setLeadSent(false);
      trackEvent("lead_submit_failed", {
        approvalEstimate: Math.round(analysis?.approval || 0),
        paymentEstimate: Math.round(analysis?.monthly || 0),
        errorCode: error?.message || "UNKNOWN_ERROR",
      });
      setLeadError("הפנייה לא נשלחה. נסו שוב או צרו קשר ישירות.");
    } finally {
      setLeadLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>{HOME_SEO.title}</title>
        <meta name="description" content={HOME_SEO.description} />
        <meta name="keywords" content={HOME_SEO.keywords} />
        <meta name="robots" content="index,follow" />
        <meta name="language" content="he" />
        <meta property="og:title" content={HOME_SEO.title} />
        <meta property="og:description" content={HOME_SEO.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={absoluteUrl(HOME_SEO.path)} />
        <meta property="og:site_name" content="Finzo" />
        <meta property="og:locale" content="he_IL" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={HOME_SEO.title} />
        <meta name="twitter:description" content={HOME_SEO.description} />
        <link rel="canonical" href={canonicalUrl(HOME_SEO.path)} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: stringifyJsonLd([
              organizationSchema(),
              financialServiceSchema({ url: absoluteUrl(HOME_SEO.path), name: "Finzo", description: HOME_SEO.description }),
              webPageSchema(HOME_SEO),
              faqSchema(faqItems),
            ]),
          }}
        />
      </Head>

      <main id="home" dir="rtl" className="min-h-screen bg-finzo-paper pb-24 text-finzo-ink md:pb-0">
        <a href="#eligibility-check" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:right-3 focus:z-[60] focus:rounded-finzo-pill focus:bg-finzo-white focus:px-4 focus:py-2 focus:text-finzo-ink">
          דילוג למחשבון
        </a>
        <Header onCtaClick={handleCtaClick} />
        <Hero onCtaClick={handleCtaClick} />
        <TickerStrip />
        <HowItWorks />
        <CalculatorSection
          data={data}
          updateData={updateData}
          analysis={analysis}
          ready={ready}
          recommendation={recommendation}
          trackEvent={trackEvent}
          eventSentRef={eventSentRef}
        />
        <ResultsSection analysis={analysis} ready={ready} />
        <TrustContentSection />
        <SeoContentSection />
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
          trackEvent={trackEvent}
        />
        <FinzoProTeaser />
        <FaqSection openFaq={openFaq} setOpenFaq={setOpenFaq} />
        <BottomLeadSection
          bottomLead={bottomLead}
          updateBottomLead={updateBottomLead}
          submitBottomLead={submitBottomLead}
          bottomLeadLoading={bottomLeadLoading}
          bottomLeadSent={bottomLeadSent}
          bottomLeadError={bottomLeadError}
        />
        <Footer onCtaClick={handleCtaClick} />
        <MobileStickyCta onCtaClick={handleCtaClick} hidden={isInsideEligibility} />
      </main>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   HEADER
───────────────────────────────────────────────────────────────────────────── */
function Header({ onCtaClick }) {
  return (
    <header className="sticky top-0 z-50 border-b border-finzo-line bg-finzo-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <a href="#home"><BrandLogo /></a>

        <nav aria-label="ניווט ראשי" className="hidden items-center gap-6 lg:flex">
          {navLinks.map(([label, href]) => (
            <a key={href} href={href} className="text-[14px] text-finzo-ink-2 transition hover:text-finzo-ink">
              {label}
            </a>
          ))}
        </nav>

        <a
          href="#eligibility-check"
          onClick={() => onCtaClick?.("header")}
          aria-label="מעבר מהיר למחשבון זכאות"
          className="inline-flex items-center gap-2 rounded-finzo-pill bg-finzo-cobalt px-5 py-3 text-[14px] font-medium text-white shadow-e-cobalt transition hover:bg-finzo-cobalt-d"
        >
          בדיקת זכאות חינם למשכנתא
        </a>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   HERO
───────────────────────────────────────────────────────────────────────────── */
function Hero({ onCtaClick }) {
  return (
    <section className="relative overflow-hidden bg-finzo-paper py-14 sm:py-20">
      {/* decorative sky blob */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 end-0 h-[520px] w-[520px] rounded-full bg-finzo-sky opacity-60"
        style={{ filter: "blur(2px)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-80px] start-[40%] h-[220px] w-[220px] rounded-full bg-finzo-cobalt opacity-30"
        style={{ filter: "blur(1px)" }}
      />

      <div className="relative mx-auto grid max-w-6xl items-end gap-14 px-4 sm:px-6 lg:grid-cols-2">
        {/* left col — copy */}
        <div>
          <div className="inline-flex items-center gap-[10px] font-mono text-[12px] uppercase tracking-[0.12em] text-finzo-ink-3">
            <span className="h-[7px] w-[7px] rounded-full bg-finzo-cobalt" aria-hidden="true" />
            בדיקה ראשונית · ללא עלות · ללא התחייבות
          </div>

          <h1 className="mt-5 font-serif text-[clamp(40px,5.2vw,72px)] font-medium leading-[1.04] tracking-[-0.028em] text-finzo-ink">
            בדיקת זכאות{" "}
            <span className="rounded-[6px] bg-finzo-cobalt px-[0.12em] text-white" style={{ boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>
              למשכנתא
            </span>{" "}
            <span className="italic text-finzo-ink-2 font-normal">תוך דקה</span>
          </h1>

          <p className="mt-6 max-w-lg text-[18px] leading-[1.55] text-finzo-ink-2">
            FINZO מנתחת את הנתונים שלך ומציגה אומדן ראשוני לסיכוי אישור, החזר חודשי ויחס החזר — בצורה פשוטה וברורה.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#eligibility-check"
              onClick={() => onCtaClick?.("hero_primary")}
              aria-label="התחלת בדיקת זכאות למשכנתא"
              className="inline-flex items-center gap-2 rounded-finzo-pill bg-finzo-cobalt px-7 py-4 text-[16px] font-medium text-white shadow-e-cobalt transition hover:bg-finzo-cobalt-d"
            >
              בדיקת זכאות חינם למשכנתא
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-finzo-pill border border-finzo-ink bg-transparent px-6 py-4 text-[15px] font-medium text-finzo-ink transition hover:bg-finzo-ink hover:text-white"
            >
              איך זה עובד
            </a>
          </div>

          <div className="mt-6 flex flex-wrap gap-5 text-[13.5px] text-finzo-ink-2">
            {["ללא עלות", "ללא התחייבות", "לא מועבר לבנק ללא אישורך"].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-finzo-cobalt text-[10px] text-white" aria-hidden="true">✓</span>
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* right col — neo calculator card */}
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-finzo-lg border-[1.5px] border-finzo-ink bg-finzo-paper shadow-neo">
            {/* card head */}
            <div className="flex items-center justify-between border-b border-finzo-line px-6 py-4">
              <span className="font-serif text-[18px] text-finzo-ink">מחשבון משכנתא</span>
              <span className="font-mono text-[12px] tracking-[0.08em] text-finzo-mute">שלב 1 מתוך 4</span>
            </div>

            {/* mock calc fields */}
            <div className="grid gap-4 px-6 py-5">
              {[
                { label: "מחיר הנכס", value: "1,850,000", unit: "₪" },
                { label: "הון עצמי", value: "450,000",   unit: "₪" },
                { label: "הכנסה חודשית", value: "22,000", unit: "₪" },
              ].map(({ label, value, unit }) => (
                <div key={label} className="grid gap-[6px]">
                  <span className="text-[13px] text-finzo-ink-2">{label}</span>
                  <div className="flex items-center justify-between rounded-finzo-md border border-finzo-line bg-finzo-cream px-4 py-3">
                    <span className="font-mono text-[17px] text-finzo-ink" style={{ fontFeatureSettings: '"tnum" 1' }}>{value}</span>
                    <span className="font-mono text-[14px] text-finzo-mute">{unit}</span>
                  </div>
                </div>
              ))}

              {/* slider mockup */}
              <div className="mt-1">
                <div className="h-[6px] w-full rounded-full bg-finzo-cream-2 relative">
                  <div className="absolute inset-y-0 start-0 w-[62%] rounded-full bg-finzo-ink" />
                  <div className="absolute top-1/2 start-[62%] h-[18px] w-[18px] -translate-y-1/2 translate-x-1/2 rounded-full border-2 border-finzo-ink bg-finzo-cobalt" />
                </div>
              </div>
            </div>

            {/* card foot — result */}
            <div className="flex items-center justify-between border-t border-dashed border-finzo-line-2 px-6 py-4">
              <div>
                <p className="font-mono text-[12px] text-finzo-mute">החזר חודשי משוער</p>
                <p className="mt-1 font-mono text-[22px] text-finzo-ink" style={{ fontFeatureSettings: '"tnum" 1' }}>8,240 ₪</p>
              </div>
              <a
                href="#eligibility-check"
                onClick={() => onCtaClick?.("hero_calc_cta")}
                className="inline-flex items-center gap-2 rounded-finzo-pill bg-finzo-cobalt px-5 py-3 text-[14px] font-medium text-white shadow-e-cobalt transition hover:bg-finzo-cobalt-d"
              >
                בדיקה מלאה
              </a>
            </div>
          </div>

          <p className="mt-4 text-center font-mono text-[11.5px] tracking-[0.04em] text-finzo-mute">
            אומדן ראשוני בלבד · לא אישור בנקאי · ללא התחייבות
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   TICKER STRIP
───────────────────────────────────────────────────────────────────────────── */
const tickerItems = [
  "בדיקת זכאות ראשונית ללא עלות",
  "לא מועבר לבנק ללא אישורך",
  "ניתוח יחס החזר מיידי",
  "התאמה להון העצמי",
  "אומדן LTV לפי סוג עסקה",
  "ללא התחייבות בשום שלב",
];

function TickerStrip() {
  const items = [...tickerItems, ...tickerItems];
  return (
    <div className="overflow-hidden border-y-[1.5px] border-finzo-ink bg-finzo-ink py-[18px]" aria-hidden="true">
      <div
        className="flex gap-14 whitespace-nowrap font-mono text-[13px] tracking-[0.08em] text-finzo-paper"
        style={{ animation: "ticker 36s linear infinite" }}
      >
        {items.map((text, i) => (
          <span key={i} className="flex items-center gap-[14px] shrink-0">
            <span className="h-2 w-2 rounded-full bg-finzo-cobalt shrink-0" />
            {text}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   HOW IT WORKS
───────────────────────────────────────────────────────────────────────────── */
const stepBgs = [
  "bg-finzo-paper",
  "bg-finzo-cream",
  "bg-finzo-cobalt-l",
  "bg-finzo-ink text-white",
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeader
        eyebrow="איך זה עובד"
        title="מדקה אחת לתמונת מצב ראשונית"
        text="תהליך קצר וברור — בלי ניירת, בלי בנקים ובלי לחץ."
      />

      <div className="mt-10 overflow-hidden rounded-finzo-lg border-[1.5px] border-finzo-ink" style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        {steps.map((step, index) => {
          const isDark = index === 3;
          return (
            <div
              key={step.title}
              className={[
                "p-8 relative",
                stepBgs[index],
                index % 2 === 0 && index < 2 ? "border-e border-finzo-line" : "",
                index < 2 ? "border-b border-finzo-line" : "",
              ].filter(Boolean).join(" ")}
            >
              <p className={`font-mono text-[13px] tracking-[0.08em] ${isDark ? "text-white/60" : "text-finzo-ink-3"}`}>
                0{index + 1}
              </p>
              <h3 className={`mt-3 font-serif text-[26px] leading-[1.18] ${isDark ? "text-white" : "text-finzo-ink"}`}>
                {step.title}
              </h3>
              <p className={`mt-3 text-[15px] leading-[1.6] max-w-[380px] ${isDark ? "text-white/70" : "text-finzo-ink-2"}`}>
                {step.text}
              </p>
              <div className={`mt-5 flex items-center gap-2 font-mono text-[12px] tracking-[0.04em] ${isDark ? "text-finzo-cobalt" : "text-finzo-ink-2"}`}>
                <span className={`h-[6px] w-[6px] rounded-full ${isDark ? "bg-finzo-cobalt" : "bg-finzo-azure"}`} />
                שלב {index + 1}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CALCULATOR SECTION
───────────────────────────────────────────────────────────────────────────── */
function CalculatorSection({ data, updateData, analysis, ready, recommendation, trackEvent, eventSentRef }) {
  return (
    <section id="eligibility-check" className="border-y border-finzo-line bg-finzo-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader
          eyebrow="בדיקת זכאות"
          title="מלאו נתונים — קבלו אומדן ראשוני מיד"
          text="כמה שאלות פיננסיות בסיסיות. תוצאה מיידית. ללא עלות."
        />
        <div className="mt-10 grid items-start gap-6 lg:grid-cols-2">
          <MortgageForm
            data={data}
            updateData={updateData}
            analysis={analysis}
            ready={ready}
            recommendation={recommendation}
            trackEvent={trackEvent}
            eventSentRef={eventSentRef}
          />
          <LiveResultPanel analysis={analysis} ready={ready} recommendation={recommendation} />
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MORTGAGE FORM WIZARD
───────────────────────────────────────────────────────────────────────────── */
function MortgageForm({ data, updateData, analysis, ready, recommendation, trackEvent, eventSentRef }) {
  const [step, setStep] = useState(0);
  const scrollYRef = useRef(0);

  function moveStep(nextStep) {
    const bounded = Math.max(0, Math.min(wizardSteps.length - 1, nextStep));
    scrollYRef.current = window.scrollY;
    if (!eventSentRef.current.wizardStarted && bounded > 0) {
      eventSentRef.current.wizardStarted = true;
      trackEvent("wizard_started", { step: 1, stepName: wizardSteps[0]?.key || "property" });
    }
    trackEvent("wizard_step_completed", {
      step: step + 1,
      stepName: wizardSteps[step]?.key || "",
      nextStep: bounded + 1,
      approvalEstimate: Math.round(analysis?.approval || 0),
      paymentEstimate: Math.round(analysis?.monthly || 0),
    });
    if (bounded === wizardSteps.length - 1 && !eventSentRef.current.wizardCompleted) {
      eventSentRef.current.wizardCompleted = true;
      trackEvent("wizard_completed", {
        step: wizardSteps.length,
        stepName: wizardSteps[wizardSteps.length - 1]?.key || "review",
        steps: wizardSteps.length,
        approvalEstimate: Math.round(analysis?.approval || 0),
        paymentEstimate: Math.round(analysis?.monthly || 0),
      });
    }
    setStep(bounded);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: scrollYRef.current, behavior: "auto" });
    });
  }

  const pct = Math.round(((step + 1) / wizardSteps.length) * 100);

  return (
    <form
      aria-label="אשף בדיקת זכאות למשכנתא"
      className="rounded-finzo-lg border border-finzo-line bg-finzo-white p-5 shadow-e-2 sm:p-7"
    >
      {/* progress */}
      <div className="mb-6 rounded-finzo-md bg-finzo-paper p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[12px] tracking-[0.08em] text-finzo-cobalt">
            שלב {step + 1} מתוך {wizardSteps.length}
          </span>
          <span className="text-[13px] font-medium text-finzo-ink-2">{wizardSteps[step].title}</span>
        </div>
        <div className="h-[6px] w-full overflow-hidden rounded-full bg-finzo-cream-2">
          <div
            className="h-full rounded-full bg-finzo-cobalt transition-all duration-300"
            style={{ ...PROGRESS_BAR_STYLE, width: `${pct}%` }}
          />
        </div>
      </div>

      {step === 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="סוג עסקה" value={data.propertyType} onChange={(v) => updateData("propertyType", v)} options={propertyOptions} />
          <MoneyField label="מחיר הנכס" value={data.price} onChange={(v) => updateData("price", v)} />
          <MoneyField label="הון עצמי" value={data.equity} onChange={(v) => updateData("equity", v)} />
          <MoneyField label="סכום משכנתא" helper="אפשר להשאיר ריק — נחושב אוטומטית" value={data.mortgageAmount} onChange={(v) => updateData("mortgageAmount", v)} />
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyField label="הכנסה חודשית נטו" value={data.income} onChange={(v) => updateData("income", v)} />
          <MoneyField label="הוצאות קבועות" value={data.expenses} onChange={(v) => updateData("expenses", v)} />
          <MoneyField label="הלוואות קיימות היום" value={data.loans} onChange={(v) => updateData("loans", v)} />
          <MoneyField label="הלוואות שייסגרו עם הרכישה" value={data.loansToClose} onChange={(v) => updateData("loansToClose", v)} />
          <MoneyField label="החזר דיור נוכחי" helper="שכירות או משכנתא שאתם משלמים היום" value={data.currentHousing} onChange={(v) => updateData("currentHousing", v)} className="sm:col-span-2" />
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="תקופה בשנים" min="5" max="30" value={data.years} onChange={(v) => updateData("years", v)} />
          <RateField label="ריבית שנתית משוערת" value={data.annualRate} onChange={(v) => updateData("annualRate", v)} />
          <SelectField label="סטטוס אשראי" value={data.credit} onChange={(v) => updateData("credit", v)} options={creditOptions} />
          <SelectField label="סוג הצמדה" value={data.indexation} onChange={(v) => updateData("indexation", v)} options={indexationOptions} />
          <SelectField label="שיטת החזר" value={data.repaymentMethod} onChange={(v) => updateData("repaymentMethod", v)} options={repaymentOptions} className="sm:col-span-2" />
        </div>
      )}

      {step === 3 && (
        <div className="rounded-finzo-md bg-finzo-paper p-5 space-y-3">
          <p className="font-mono text-[12px] tracking-[0.06em] text-finzo-mute uppercase">אומדן ראשוני — לא מחייב ולא אישור בנקאי</p>
          <ResultSummaryRow label="אומדן סיכוי אישור" value={ready ? `${Math.round(analysis.approval)}%` : "--"} highlight={ready && analysis.approval >= 65} />
          <ResultSummaryRow label="החזר חודשי משוער" value={displayMoney(analysis.monthly, ready)} />
          <ResultSummaryRow label="יחס החזר" value={displayPercent(analysis.mortgageOnlyRatio, ready)} warn={ready && analysis.mortgageOnlyRatio > 40} />
          <ResultSummaryRow label="יתרה למחיה" value={displayMoney(analysis.afterHousing, ready)} />
          <p className="rounded-finzo-md bg-finzo-white p-3 text-[14px] text-finzo-ink-2 leading-[1.6]">
            {ready ? recommendation : "השלימו נתונים לקבלת חיווי מלא."}
          </p>
          <a
            href="#lead"
            className="block rounded-finzo-pill bg-finzo-cobalt px-5 py-3 text-center text-[14px] font-medium text-white shadow-e-cobalt transition hover:bg-finzo-cobalt-d"
          >
            רוצים להבין איך לשפר? דברו איתנו
          </a>
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={() => moveStep(step - 1)}
          disabled={step === 0}
          className="h-12 flex-1 rounded-finzo-pill border border-finzo-line bg-finzo-white font-medium text-finzo-ink transition hover:bg-finzo-cream disabled:opacity-40"
        >
          חזרה
        </button>
        <button
          type="button"
          onClick={() => moveStep(step + 1)}
          disabled={step === wizardSteps.length - 1}
          className="h-12 flex-1 rounded-finzo-pill bg-finzo-cobalt font-medium text-white shadow-e-cobalt transition hover:bg-finzo-cobalt-d disabled:opacity-40"
        >
          המשך
        </button>
      </div>
    </form>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LIVE RESULT PANEL
───────────────────────────────────────────────────────────────────────────── */
function LiveResultPanel({ analysis, ready, recommendation }) {
  const score = ready ? Math.round(analysis.approval) : 0;

  return (
    <aside className="rounded-finzo-lg border border-finzo-ink bg-finzo-ink p-6 text-white shadow-e-4 sm:p-8">
      <p className="font-mono text-[12px] tracking-[0.06em] text-white/60">
        {ready ? "תוצאה מתעדכנת בזמן אמת" : "מלאו נתונים לבדיקה ראשונית"}
      </p>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <h3 className="font-serif text-[24px] leading-[1.2] text-white">אומדן סיכוי אישור</h3>
          <p className="mt-1 font-mono text-[13px] text-white/65">{approvalLabel(analysis, ready)}</p>
        </div>
        <span
          className="font-serif text-[52px] leading-none tracking-[-0.02em] text-white"
          style={{ fontFeatureSettings: '"tnum" 1' }}
        >
          {ready ? `${score}%` : "--"}
        </span>
      </div>

      <div className="mt-5 h-[6px] w-full overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-white transition-all duration-500"
          style={{ width: ready ? `${Math.min(100, Math.max(0, score))}%` : "0%" }}
        />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <DarkMetric label="החזר חודשי משוער" value={displayMoney(analysis.monthly, ready)} />
        <DarkMetric label="יחס החזר" value={displayPercent(analysis.mortgageOnlyRatio, ready)} />
        <DarkMetric label="יתרה למחיה" value={displayMoney(analysis.afterHousing, ready)} />
        <DarkMetric label="אחוז מימון LTV" value={displayPercent(analysis.ltv, ready)} />
      </div>

      <div className="mt-5 rounded-finzo-md border border-white/10 bg-white/08 p-5">
        <p className="font-mono text-[12px] text-white/60 uppercase tracking-[0.06em]">נקודת שיפור מרכזית</p>
        <p className="mt-2 font-serif text-[20px] leading-[1.3] text-white">
          {ready ? analysis.mainIssue : "הזינו נתונים כדי לקבל חיווי"}
        </p>
        {ready && <p className="mt-3 text-[14px] leading-[1.6] text-white/70">{recommendation}</p>}
      </div>

      <a
        href="#lead"
        className="mt-5 block rounded-finzo-pill bg-finzo-cobalt px-6 py-4 text-center text-[15px] font-medium text-white shadow-e-cobalt transition hover:bg-finzo-cobalt-d"
      >
        רוצים לשפר את הסיכוי? דברו איתנו
      </a>
      <p className="mt-3 text-center font-mono text-[11px] text-white/50">אומדן ראשוני בלבד · לא אישור בנקאי · ללא התחייבות</p>
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   RESULTS SECTION
───────────────────────────────────────────────────────────────────────────── */
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
    ["החזר חודשי משוער", displayMoney(analysis.monthly, ready), "אומדן לפי תקופה, ריבית ושיטת החזר — לא מחיר סופי"],
    ["יחס החזר", displayPercent(analysis.mortgageOnlyRatio, ready), "אחוז מההכנסה נטו שמוקדש להחזר המשכנתא"],
    ["יתרה למחיה", displayMoney(analysis.afterHousing, ready), "מה נשאר מדי חודש לאחר הוצאות, הלוואות ומשכנתא"],
    ["נקודת שיפור מרכזית", ready ? analysis.mainIssue : "--", ready ? "פעולה אחת שעשויה לשפר את תוצאת הבדיקה" : ""],
    ["הון עצמי", ready ? (analysis.missingEquity > 0 ? `חסר ${formatILS(analysis.missingEquity)}` : "נראה תקין") : "--", "לפי אומדן LTV לסוג העסקה"],
    ["סך ריבית צפויה", displayMoney(analysis.totalInterestEstimate, ready), "אומדן עלות ריבית כוללת לאורך כל התקופה"],
    ["מצב תזרים חודשי", ready ? formatILS(analysis.monthlyGap) : "--", flowText],
  ];

  return (
    <section id="results" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeader
        eyebrow="אומדן ראשוני"
        title="סיכום הבדיקה — בצורה פשוטה וברורה"
        text="כל הנתונים המרכזיים במקום אחד. זהו אומדן ראשוני בלבד ולא אישור בנקאי."
      />
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {resultCards.map(([label, value, note]) => (
          <ResultCard key={label} label={label} value={value} note={note} />
        ))}
      </div>

      {ready && (
        <details className="mt-6 rounded-finzo-lg border border-finzo-line bg-finzo-paper p-5 open:bg-finzo-white sm:p-7">
          <summary className="cursor-pointer text-[17px] font-medium text-finzo-cobalt">צפייה בניתוח פיננסי מלא</summary>
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
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   TRUST CONTENT SECTION
───────────────────────────────────────────────────────────────────────────── */
const trustBlocks = [
  {
    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
    title: "הנתונים נשארים אצלנו",
    text: "הנתונים שאתה מזין לא מועברים לאף בנק, יועץ או גורם חיצוני ללא אישורך המפורש.",
    iconBg: "bg-finzo-ink",
  },
  {
    icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
    title: "אומדן ראשוני — לא הבטחה",
    text: "הבדיקה מבוססת על הנתונים שהזנת ונועדה לתת תמונת מצב התחלתית. אישור בנקאי בפועל כרוך בבדיקת מסמכים ושמאות.",
    iconBg: "bg-finzo-cobalt",
  },
  {
    icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "המטרה שלנו — לעזור לך להבין",
    text: "FINZO לא מוכרת משכנתאות. המטרה היא לעזור לך להבין איפה אתה עומד לפני פנייה ליועץ או לבנק.",
    iconBg: "bg-finzo-coral",
  },
  {
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "ללא התחייבות בשום שלב",
    text: "השימוש במחשבון ואפילו השארת פרטים לא מחייבים אותך לשום דבר. אתה בשליטה מלאה על ההמשך.",
    iconBg: "bg-finzo-ink",
  },
];

function TrustContentSection() {
  return (
    <section id="why-finzo" aria-labelledby="trust-content-title" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <h2 id="trust-content-title" className="sr-only">למה לבחור בבדיקה עם FINZO</h2>
      <SectionHeader
        eyebrow="למה FINZO"
        title="שקיפות מלאה — לפני שמתחילים"
        text="אנחנו מאמינים שהחלטה פיננסית טובה מתחילה בהבנה ברורה של המצב, לא בלחץ מכירתי."
      />
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {trustBlocks.map((item) => (
          <article key={item.title} className="flex gap-5 rounded-finzo-lg border border-finzo-line bg-finzo-white p-6">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-finzo-sm ${item.iconBg} text-white`}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <h3 className="font-serif text-[20px] text-finzo-ink">{item.title}</h3>
              <p className="mt-2 text-[15px] leading-[1.6] text-finzo-ink-2">{item.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SEO CONTENT SECTION
───────────────────────────────────────────────────────────────────────────── */
function SeoContentSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="mortgage-seo-title">
      <div className="rounded-finzo-lg border border-finzo-line bg-finzo-white p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-[10px] font-mono text-[12px] uppercase tracking-[0.12em] text-finzo-ink-3">
              <span className="h-[7px] w-[7px] rounded-full bg-finzo-cobalt" aria-hidden="true" />
              בדיקת משכנתא בישראל
            </span>
            <h2 id="mortgage-seo-title" className="mt-4 font-serif text-[32px] leading-[1.12] text-finzo-ink">
              מה בודקים לפני שלוקחים משכנתא?
            </h2>
            <p className="mt-4 text-[15px] leading-[1.7] text-finzo-ink-2">
              לפני שפונים לבנק כדאי להבין אם המספרים עובדים: מה סכום המשכנתא הדרוש, מה ההחזר החודשי המשוער, כמה הון עצמי חסר אם בכלל, ומה יחס ההחזר ביחס להכנסה. בדיקה מוקדמת יכולה לעזור לזהות נקודות סיכון לפני חתימת חוזה.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["יחס החזר", "בודק כמה מההכנסה נטו מיועד להחזר המשכנתא והתחייבויות קיימות."],
              ["אחוז מימון LTV", "משווה בין סכום המשכנתא לשווי הנכס לפי סוג העסקה."],
              ["הון עצמי", "מציג אם ההון העצמי מספיק ביחס למחיר הנכס ולמגבלות המימון."],
              ["תזרים אחרי העסקה", "בודק כמה נשאר למחיה אחרי הוצאות, הלוואות והחזר משכנתא."],
            ].map(([title, text]) => (
              <article key={title} className="rounded-finzo-md bg-finzo-paper p-5">
                <h3 className="font-serif text-[17px] text-finzo-ink">{title}</h3>
                <p className="mt-2 text-[13.5px] leading-[1.6] text-finzo-ink-2">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   REFINANCE SECTION
───────────────────────────────────────────────────────────────────────────── */
function RefinanceSection() {
  return (
    <section id="refinance" className="bg-finzo-ink py-16 text-white sm:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-finzo-pill border border-finzo-coral/40 bg-finzo-coral/10 px-4 py-2 font-mono text-[12px] tracking-[0.08em] text-finzo-coral">
            מחזור משכנתא
          </span>
          <h2 className="mt-5 font-serif text-[clamp(28px,3.5vw,40px)] leading-[1.1] text-white">
            בדיקת כדאיות למחזור משכנתא
          </h2>
          <p className="mt-4 max-w-lg text-[16px] leading-[1.6] text-white/70">
            כבר יש לכם משכנתא? בדקו אם שינוי ריבית, תקופה או תמהיל עשוי להפחית החזר או ריבית כוללת.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "החזר חודשי נוכחי מול החזר חדש",
              "חיסכון ריבית משוער לאחר עלויות מחזור",
              "נקודת איזון והאם היא בתוך התקופה שנותרה",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-[15px] text-white/80">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-finzo-cobalt text-[10px] text-white">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-finzo-lg border-[1.5px] border-white/10 bg-white/05 p-6">
          <p className="font-serif text-[22px] text-white">האם המחזור כדאי?</p>
          <p className="mt-2 text-[14px] text-white/60">השוואה בין משכנתא קיימת לחדשה</p>

          <div className="mt-5 space-y-3">
            {[
              ["החזר נוכחי", "8,900 ₪", "now"],
              ["החזר אחרי מחזור", "7,400 ₪", "after"],
            ].map(([label, val, type]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="font-mono text-[13px] text-white/70">{label}</span>
                <div className="mx-4 flex-1 h-[10px] rounded-full bg-white/08 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${type === "after" ? "bg-finzo-cobalt w-[52%]" : "bg-white/30 w-[78%]"}`}
                  />
                </div>
                <span className="font-mono text-[14px] text-white" style={{ fontFeatureSettings: '"tnum" 1' }}>{val}</span>
              </div>
            ))}
          </div>

          <p className="mt-4 font-mono text-[12px] text-white/50">חיסכון חודשי משוער: 1,500 ₪ · נקודת איזון: 18 חודשים</p>

          <a
            href="/refinance-check"
            className="mt-5 block rounded-finzo-pill bg-finzo-cobalt px-6 py-4 text-center font-medium text-white shadow-e-cobalt transition hover:bg-finzo-cobalt-d"
          >
            בדיקת מחזור משכנתא
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LEAD SECTION
───────────────────────────────────────────────────────────────────────────── */
function LeadSection({ lead, updateLead, submitLead, leadLoading, leadSent, leadError, successRef, analysis, ready, trackEvent }) {
  return (
    <section id="lead" className="bg-finzo-ink py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-[10px] font-mono text-[12px] uppercase tracking-[0.12em] text-white/60">
            <span className="h-[7px] w-[7px] rounded-full bg-finzo-cobalt" aria-hidden="true" />
            כיוון ראשוני
          </div>
          <h2 className="mt-4 font-serif text-[clamp(28px,4vw,44px)] leading-[1.1] text-white">
            רוצים להבין איך לשפר את הסיכוי לאישור?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-[1.6] text-white/70">
            השאירו פרטים ונחזור אליכם עם כיוון ראשוני לבדיקה מול יועץ מתאים.
          </p>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          {/* left — summary panel */}
          <div className="rounded-finzo-lg border border-white/10 bg-white/05 p-6">
            {ready ? (
              <div className="space-y-3">
                <ResultSummaryRow label="אומדן בדיקה ראשונית" value={`${Math.round(analysis.approval)}%`} highlight={analysis.approval >= 65} dark />
                <ResultSummaryRow label="החזר חודשי משוער" value={formatILS(analysis.monthly)} dark />
                <ResultSummaryRow label="יחס החזר" value={formatPct(analysis.mortgageOnlyRatio)} warn={analysis.mortgageOnlyRatio > 40} dark />
                <ResultSummaryRow label="יתרה למחיה" value={formatILS(analysis.afterHousing)} warn={analysis.afterHousing < 3000} dark />
                {analysis.mainIssue && (
                  <div className="mt-2 rounded-finzo-md border border-white/10 bg-white/08 px-4 py-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-white/50">הנושא המרכזי לטיפול</p>
                    <p className="mt-1 font-medium text-white">{analysis.mainIssue}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-finzo-md border border-white/10 bg-white/08 px-4 py-5 text-center">
                <p className="text-white/60">מלאו נתונים במחשבון כדי לראות כאן את סיכום הסימולציה.</p>
              </div>
            )}

            <ul className="mt-6 space-y-2">
              {[
                "בדיקת זכאות חינם וללא התחייבות",
                "אינה פוגעת בדירוג אשראי",
                "פרטיות מלאה ושימוש במידע לצורך חזרה בלבד",
                "שיחה מקצועית קצרה להבנת הצעד הבא",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-[14px] text-white/70">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-finzo-cobalt text-[10px] text-white">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* right — form */}
          <form
            onSubmit={submitLead}
            aria-busy={leadLoading ? "true" : "false"}
            className="rounded-finzo-lg border border-white/10 bg-finzo-white p-6"
          >
            <p className="mb-5 font-mono text-[12px] uppercase tracking-[0.08em] text-finzo-ink-3">פרטים ליצירת קשר</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="שם מלא" value={lead.name} onChange={(v) => updateLead("name", v)} autoComplete="name" required />
              <TextField label="טלפון" value={lead.phone} onChange={(v) => updateLead("phone", v)} placeholder="05X-XXXXXXX" autoComplete="tel" required />
              <TextField label="עיר" value={lead.city} onChange={(v) => updateLead("city", v)} autoComplete="address-level2" className="sm:col-span-2" />
            </div>

            <p className="mb-4 mt-6 font-mono text-[12px] uppercase tracking-[0.08em] text-finzo-ink-3">פרטי העסקה (אופציונלי)</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <MoneyField label="מחיר נכס" value={lead.propertyPrice} onChange={(v) => updateLead("propertyPrice", v)} />
              <MoneyField label="הון עצמי" value={lead.equityAmount} onChange={(v) => updateLead("equityAmount", v)} />
              <MoneyField label="הכנסה חודשית נטו" value={lead.monthlyIncome} onChange={(v) => updateLead("monthlyIncome", v)} />
              <SelectField
                label="סטטוס חוזה"
                value={lead.contractStatus}
                onChange={(v) => updateLead("contractStatus", v)}
                options={[
                  ["before", "לפני חוזה"],
                  ["negotiation", "במו\"מ / טיוטות"],
                  ["signed", "חוזה חתום"],
                ]}
              />
              <TextField
                label="מועד נוח לחזרה"
                value={lead.requestedContactTime}
                onChange={(v) => updateLead("requestedContactTime", v)}
                placeholder="למשל: א'-ה' 17:00-20:00"
                className="sm:col-span-2"
              />
            </div>

            {leadError && (
              <p role="alert" className="mt-4 rounded-finzo-md border border-finzo-danger/20 bg-finzo-danger/08 px-4 py-3 text-[14px] text-finzo-danger">
                {leadError}
              </p>
            )}
            {leadSent && (
              <p ref={successRef} role="status" className="mt-4 rounded-finzo-md border border-finzo-success/20 bg-finzo-success/08 px-4 py-4 text-center text-[14px] text-finzo-success">
                הפנייה נשלחה בהצלחה. נחזור אליכם בהקדם עם כיוון ראשוני.
              </p>
            )}

            <div className="mt-5 rounded-finzo-md bg-finzo-paper px-4 py-3">
              <p className="text-[13px] font-medium text-finzo-ink">מה קורה אחרי השליחה?</p>
              <p className="mt-1 text-[13px] text-finzo-ink-2">יועץ חוזר אליכם לשיחה קצרה, עובר על האומדן הראשוני ומכוון לצעד הבא. ללא התחייבות.</p>
            </div>

            <button
              type="submit"
              disabled={leadLoading || leadSent}
              className="mt-4 min-h-12 w-full rounded-finzo-pill bg-finzo-cobalt px-7 py-4 text-[15px] font-medium text-white shadow-e-cobalt transition hover:bg-finzo-cobalt-d disabled:cursor-not-allowed disabled:opacity-60"
            >
              {leadLoading ? "שולח..." : leadSent ? "נשלח בהצלחה ✓" : "שלחו פרטים — נחזור אליכם"}
            </button>
            <p className="mt-3 text-center font-mono text-[11px] text-finzo-mute">
              ללא עלות · ללא התחייבות · המידע לא נשלח לבנק ללא אישורך
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FINZO PRO TEASER (new)
───────────────────────────────────────────────────────────────────────────── */
function FinzoProTeaser() {
  return (
    <section className="bg-finzo-cream py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.12em] text-finzo-ink-3">
              <span className="h-[7px] w-[7px] rounded-full bg-finzo-cobalt" aria-hidden="true" />
              FINZO Pro
            </div>
            <h2 className="mt-4 font-serif text-[clamp(28px,3.5vw,42px)] leading-[1.1] text-finzo-ink">
              יועצי משכנתא — הצטרפו לפלטפורמה
            </h2>
            <p className="mt-4 max-w-lg text-[16px] leading-[1.6] text-finzo-ink-2">
              FINZO Pro מחבר יועצים מוסמכים עם לידים איכותיים. לוח בקרה מלא, ניהול תיקים, וגישה לשוק הלידים.
            </p>
            <ul className="mt-6 space-y-3">
              {["גישה ללידים מסווגים לפי אזור וסוג עסקה", "לוח בקרה עם KPI בזמן אמת", "ניהול תיקי לקוחות במקום אחד"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-[14px] text-finzo-ink-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-finzo-ink text-[10px] text-white">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/advisor/register"
                className="inline-flex items-center gap-2 rounded-finzo-pill bg-finzo-cobalt px-6 py-3 text-[14px] font-medium text-white shadow-e-cobalt transition hover:bg-finzo-cobalt-d"
              >
                הצטרפו בחינם
              </a>
              <a
                href="/advisor/login"
                className="inline-flex items-center gap-2 rounded-finzo-pill border border-finzo-ink bg-transparent px-6 py-3 text-[14px] font-medium text-finzo-ink transition hover:bg-finzo-ink hover:text-white"
              >
                כניסה ליועצים
              </a>
            </div>
          </div>

          {/* advisor card preview */}
          <div className="rounded-finzo-lg border-[1.5px] border-finzo-ink bg-finzo-white shadow-neo">
            <div className="border-b border-finzo-line px-5 py-4 flex items-center justify-between">
              <span className="font-serif text-[16px] text-finzo-ink">לוח בקרה · יועץ</span>
              <span className="font-mono text-[10.5px] tracking-[0.1em] bg-finzo-ink text-white px-2 py-1 rounded-finzo-xs">PRO</span>
            </div>
            <div className="grid grid-cols-2 gap-3 p-5">
              {[
                { label: "לידים חדשים", value: "12", delta: "+3 השבוע", up: true },
                { label: "בתהליך", value: "5", delta: "2 בהמתנה", up: false },
                { label: "הכנסה חודשית", value: "18,400 ₪", delta: "+8.2%", up: true },
                { label: "שיעור סגירה", value: "38%", delta: "ממוצע אחרון", up: true },
              ].map(({ label, value, delta, up }) => (
                <div key={label} className="rounded-finzo-md border border-finzo-line p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-finzo-ink-3">{label}</p>
                  <p className="mt-2 font-serif text-[26px] text-finzo-ink" style={{ fontFeatureSettings: '"tnum" 1' }}>{value}</p>
                  <p className={`mt-1 font-mono text-[11.5px] ${up ? "text-finzo-success" : "text-finzo-mute"}`}>{delta}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FAQ SECTION
───────────────────────────────────────────────────────────────────────────── */
function FaqSection({ openFaq, setOpenFaq }) {
  return (
    <section id="faq" className="bg-finzo-paper py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <SectionHeader
          eyebrow="שאלות נפוצות"
          title="שאלות שכולם שואלים לפני שמתחילים"
          text="תשובות ישירות ופשוטות — בלי עמימות ובלי שיווק."
        />
        <div className="mt-10 space-y-2">
          {faqItems.map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={item.question} className="rounded-finzo-lg border border-finzo-line bg-finzo-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-start"
                >
                  <span className="font-serif text-[18px] text-finzo-ink">{item.question}</span>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-finzo-sm bg-finzo-paper font-mono text-[18px] font-medium text-finzo-ink-2 transition">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <p id={`faq-answer-${index}`} className="px-6 pb-6 text-[15px] leading-[1.7] text-finzo-ink-2">
                    {item.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   BOTTOM LEAD SECTION
───────────────────────────────────────────────────────────────────────────── */
function BottomLeadSection({ bottomLead, updateBottomLead, submitBottomLead, bottomLeadLoading, bottomLeadSent, bottomLeadError }) {
  return (
    <section id="bottom-lead" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="rounded-finzo-lg border-[1.5px] border-finzo-ink bg-finzo-ink p-6 sm:p-8">
        <h2 className="font-serif text-[clamp(22px,3vw,32px)] text-white">
          רוצים להבין איך לשפר את הסיכוי לאישור?
        </h2>
        <p className="mt-2 text-[15px] text-white/70">השאירו פרטים ונחזור אליכם עם כיוון ראשוני.</p>

        <form onSubmit={submitBottomLead} className="mt-6 grid gap-3 sm:grid-cols-4" dir="rtl">
          <TextField label="שם מלא" value={bottomLead.name} onChange={(v) => updateBottomLead("name", v)} autoComplete="name" required contrastMode="dark" />
          <TextField label="טלפון" value={bottomLead.phone} onChange={(v) => updateBottomLead("phone", v)} autoComplete="tel" placeholder="05X-XXXXXXX" required contrastMode="dark" />
          <TextField label="עיר" value={bottomLead.city} onChange={(v) => updateBottomLead("city", v)} autoComplete="address-level2" contrastMode="dark" />
          <button
            type="submit"
            disabled={bottomLeadLoading || bottomLeadSent}
            className="min-h-12 self-end rounded-finzo-pill bg-finzo-cobalt px-5 py-3 text-[14px] font-medium text-white shadow-e-cobalt transition hover:bg-finzo-cobalt-d disabled:opacity-60"
          >
            {bottomLeadLoading ? "שולח..." : bottomLeadSent ? "נשלח ✓" : "שליחה לנציג מקצועי"}
          </button>
        </form>

        {bottomLeadError && (
          <p role="alert" className="mt-3 rounded-finzo-md bg-finzo-danger/10 px-4 py-3 text-[14px] text-finzo-danger">
            {bottomLeadError}
          </p>
        )}
        {bottomLeadSent && (
          <p role="status" className="mt-3 rounded-finzo-md bg-finzo-success/10 px-4 py-3 text-[14px] text-finzo-success">
            הפנייה נשלחה בהצלחה. נחזור אליכם בהקדם.
          </p>
        )}

        <p className="mt-4 font-mono text-[11px] text-white/40">ללא התחייבות. הפרטים ישמשו לחזרה אליכם בלבד.</p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FOOTER
───────────────────────────────────────────────────────────────────────────── */
function Footer({ onCtaClick }) {
  return (
    <footer className="border-t border-finzo-line bg-finzo-white py-10">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-3">
        <div className="space-y-3">
          <BrandLogo withTagline={false} />
          <p className="text-[13px] leading-[1.6] text-finzo-ink-3">המידע באתר הוא לצורך מידע כללי בלבד ואינו מהווה ייעוץ פיננסי, ייעוץ משכנתאות או אישור בנקאי.</p>
        </div>
        <div className="space-y-2">
          <p className="font-serif text-[16px] text-finzo-ink">פרטיות ושימוש במידע</p>
          <p className="text-[13px] leading-[1.6] text-finzo-ink-3">המידע נמסר מרצון ומשמש לצורך אומדן ראשוני וחזרה מקצועית בלבד. לא מתבצעת התחייבות לפעולה פיננסית.</p>
        </div>
        <address className="not-italic space-y-2">
          <p className="font-serif text-[16px] text-finzo-ink">יצירת קשר</p>
          <p className="text-[13px] leading-[1.6] text-finzo-ink-3">לשאלות או הבהרות ניתן להשאיר פנייה בטופס ונחזור בהקדם.</p>
          <p className="text-[11px] text-finzo-mute">התוכן באתר הינו מידע כללי בלבד ואינו ייעוץ פיננסי או משפטי.</p>
        </address>
      </div>

      <div className="mx-auto mt-8 max-w-6xl border-t border-finzo-line px-4 pt-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="#eligibility-check"
            onClick={() => onCtaClick?.("footer")}
            className="inline-flex items-center gap-2 rounded-finzo-pill bg-finzo-cobalt px-5 py-3 text-[14px] font-medium text-white shadow-e-cobalt transition hover:bg-finzo-cobalt-d"
          >
            בדיקת זכאות חינם למשכנתא
          </a>
          <a
            href="#bottom-lead"
            onClick={() => onCtaClick?.("footer_bottom_lead")}
            className="inline-flex items-center gap-2 rounded-finzo-pill border border-finzo-line px-5 py-3 text-[14px] font-medium text-finzo-ink transition hover:bg-finzo-cream"
          >
            השאירו פרטים
          </a>
          <a href="/blog" className="text-[13px] text-finzo-cobalt hover:underline">בלוג משכנתאות</a>
          <a href="/guides" className="text-[13px] text-finzo-cobalt hover:underline">מדריכי משכנתא</a>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MOBILE STICKY CTA
───────────────────────────────────────────────────────────────────────────── */
function MobileStickyCta({ onCtaClick, hidden }) {
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-finzo-line bg-finzo-white/95 px-4 pb-safe pt-2 pb-2 backdrop-blur-xl transition-transform md:hidden ${hidden ? "translate-y-full" : "translate-y-0"}`}
    >
      <div className="mx-auto grid max-w-sm grid-cols-2 gap-3">
        <a
          href="#eligibility-check"
          onClick={() => onCtaClick?.("sticky_mobile")}
          className="rounded-finzo-pill bg-finzo-cobalt px-4 py-3 text-center text-[14px] font-medium text-white shadow-e-cobalt"
        >
          בדיקת זכאות חינם
        </a>
        <a
          href="#bottom-lead"
          className="rounded-finzo-pill border border-finzo-ink bg-transparent px-4 py-3 text-center text-[14px] font-medium text-finzo-ink"
        >
          השאירו פרטים
        </a>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SHARED PRIMITIVES
───────────────────────────────────────────────────────────────────────────── */
function SectionHeader({ eyebrow, title, text }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="inline-flex items-center gap-[10px] font-mono text-[12px] uppercase tracking-[0.12em] text-finzo-ink-3">
        <span className="h-[7px] w-[7px] rounded-full bg-finzo-cobalt" aria-hidden="true" />
        {eyebrow}
      </div>
      <h2 className="mt-4 font-serif text-[clamp(28px,4vw,44px)] leading-[1.08] tracking-[-0.022em] text-finzo-ink">
        {title}
      </h2>
      <p className="mt-4 text-[17px] leading-[1.6] text-finzo-ink-2">{text}</p>
    </div>
  );
}

function ResultSummaryRow({ label, value, highlight = false, warn = false, dark = false }) {
  const valColor = highlight ? "text-finzo-success" : warn ? "text-finzo-warning" : dark ? "text-white" : "text-finzo-ink";
  const rowBg = dark ? "border border-white/10 bg-white/08" : "border border-finzo-line bg-finzo-white";
  return (
    <div className={`flex items-center justify-between rounded-finzo-md px-4 py-3 ${rowBg}`}>
      <span className={`text-[13.5px] ${dark ? "text-white/70" : "text-finzo-ink-2"}`}>{label}</span>
      <span className={`font-mono text-[15px] font-medium ${valColor}`} style={{ fontFeatureSettings: '"tnum" 1' }}>{value}</span>
    </div>
  );
}

function DarkMetric({ label, value }) {
  return (
    <div className="rounded-finzo-md border border-white/10 bg-white/08 p-4">
      <p className="font-mono text-[11.5px] text-white/60 uppercase tracking-[0.06em]">{label}</p>
      <p className="mt-2 font-mono text-[20px] font-medium text-white" style={{ fontFeatureSettings: '"tnum" 1' }}>{value}</p>
    </div>
  );
}

function ResultCard({ label, value, note }) {
  return (
    <article className="flex h-full flex-col justify-between rounded-finzo-lg border border-finzo-line bg-finzo-white p-6">
      <div>
        <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-finzo-ink-3">{label}</p>
        <p className="mt-3 font-serif text-[32px] leading-none text-finzo-ink" style={{ fontFeatureSettings: '"tnum" 1' }}>{value}</p>
      </div>
      <p className="mt-4 text-[14px] leading-[1.6] text-finzo-ink-2">{note}</p>
    </article>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-finzo-md bg-finzo-paper px-4 py-3">
      <span className="text-[13.5px] text-finzo-ink-2">{label}</span>
      <span className="font-mono text-[14px] text-finzo-ink" style={{ fontFeatureSettings: '"tnum" 1' }}>{value}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FORM FIELD COMPONENTS — logic preserved, visual updated
───────────────────────────────────────────────────────────────────────────── */
function MoneyField({ label, value, onChange, helper, className = "" }) {
  const fieldId = useMemo(() => `field-${label.replace(/\s+/g, "-")}`, [label]);
  return (
    <label className={`block ${className}`}>
      <span className="text-[13px] text-finzo-ink-2" id={`${fieldId}-label`}>{label}</span>
      <span className="relative mt-[6px] flex items-center overflow-hidden rounded-finzo-md border border-finzo-line bg-finzo-white transition focus-within:border-finzo-ink focus-within:ring-2 focus-within:ring-finzo-cobalt-l">
        <span className="shrink-0 px-3 font-mono text-[13px] text-finzo-mute select-none">₪</span>
        <input
          id={fieldId}
          aria-labelledby={`${fieldId}-label`}
          inputMode="numeric"
          dir="ltr"
          pattern="[0-9,]*"
          value={displayNumber(value || "")}
          onChange={(event) => onChange(cleanNumber(event.target.value))}
          className="h-12 min-w-0 flex-1 bg-transparent py-3 pl-3 pr-2 font-mono text-[15px] text-finzo-ink outline-none"
          style={{ fontFeatureSettings: '"tnum" 1' }}
        />
      </span>
      {helper && <span className="mt-1 block font-mono text-[11px] leading-5 text-finzo-mute">{helper}</span>}
    </label>
  );
}

function TextField({ label, value, onChange, placeholder = "", required = false, className = "", autoComplete, contrastMode = "light" }) {
  const fieldId = useMemo(() => `field-${label.replace(/\s+/g, "-")}`, [label]);
  const isDark = contrastMode === "dark";
  return (
    <label className={`block ${className}`}>
      <span className={`text-[13px] ${isDark ? "text-white/80" : "text-finzo-ink-2"}`} id={`${fieldId}-label`}>{label}</span>
      <input
        id={fieldId}
        aria-labelledby={`${fieldId}-label`}
        value={value}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-[6px] h-12 w-full rounded-finzo-md px-4 text-[15px] outline-none transition ${
          isDark
            ? "border border-white/20 bg-finzo-white text-finzo-ink placeholder:text-finzo-mute focus:border-finzo-cobalt focus:ring-2 focus:ring-finzo-cobalt-l"
            : "border border-finzo-line bg-finzo-white text-finzo-ink placeholder:text-finzo-mute focus:border-finzo-ink focus:ring-2 focus:ring-finzo-cobalt-l"
        }`}
      />
    </label>
  );
}

function NumberField({ label, value, onChange, min, max }) {
  const fieldId = useMemo(() => `field-${label.replace(/\s+/g, "-")}`, [label]);
  return (
    <label className="block">
      <span className="text-[13px] text-finzo-ink-2" id={`${fieldId}-label`}>{label}</span>
      <input
        id={fieldId}
        aria-labelledby={`${fieldId}-label`}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-[6px] h-12 w-full rounded-finzo-md border border-finzo-line bg-finzo-white px-4 font-mono text-[15px] text-finzo-ink outline-none transition focus:border-finzo-ink focus:ring-2 focus:ring-finzo-cobalt-l"
        style={{ fontFeatureSettings: '"tnum" 1' }}
      />
    </label>
  );
}

function RateField({ label, value, onChange }) {
  const fieldId = useMemo(() => `field-${label.replace(/\s+/g, "-")}`, [label]);
  return (
    <label className="block">
      <span className="text-[13px] text-finzo-ink-2" id={`${fieldId}-label`}>{label}</span>
      <span className="relative mt-[6px] flex items-center overflow-hidden rounded-finzo-md border border-finzo-line bg-finzo-white transition focus-within:border-finzo-ink focus-within:ring-2 focus-within:ring-finzo-cobalt-l">
        <input
          id={fieldId}
          aria-labelledby={`${fieldId}-label`}
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(cleanNumber(event.target.value, true))}
          className="h-12 min-w-0 flex-1 bg-transparent px-4 font-mono text-[15px] text-finzo-ink outline-none"
          style={{ fontFeatureSettings: '"tnum" 1' }}
        />
        <span className="shrink-0 px-3 font-mono text-[13px] text-finzo-mute select-none">%</span>
      </span>
    </label>
  );
}

function SelectField({ label, value, onChange, options, className = "" }) {
  const fieldId = useMemo(() => `field-${label.replace(/\s+/g, "-")}`, [label]);
  return (
    <label className={`block ${className}`}>
      <span className="text-[13px] text-finzo-ink-2" id={`${fieldId}-label`}>{label}</span>
      <select
        id={fieldId}
        aria-labelledby={`${fieldId}-label`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-[6px] h-12 w-full cursor-pointer appearance-none rounded-finzo-md border border-finzo-line bg-finzo-white px-4 text-[15px] text-finzo-ink outline-none transition focus:border-finzo-ink focus:ring-2 focus:ring-finzo-cobalt-l"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
