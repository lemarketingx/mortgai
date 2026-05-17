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
  { text: "לפי כללי בנק ישראל", icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" },
  { text: "תוצאה ראשונית תוך דקות", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { text: "100% מאובטח", icon: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" },
  { text: "ללא התחייבות", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
,
  { text: "מותאם לישראלים", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
];

const steps = [
  {
    title: "ממלאים נתונים",
    text: "הכנסה, הוצאות, מחיר נכס, הון עצמי ותקופת החזר.",
    icon: "M12 6v12m6-6H6",
  },
  {
    title: "מקבלים בדיקה חכמה",
    text: "המערכת מבצעת ניתוח פיננסי ראשוני של יחס החזר, LTV והתחייבויות קיימות.",
    icon: "M5 13l4 4L19 7",
  },
  {
    title: "רואים אומדן ראשוני",
    text: "מקבלים הפרדה ברורה בין אומדן זכאות, החזר חודשי ואינדיקציית סיכון.",
    icon: "M4 19h16M7 15l3-3 3 2 4-6",
  },
  {
    title: "ממשיכים ליועץ מקצועי",
    text: "רק אם תרצו, הנתונים עוברים להמשך בדיקה אנושית ללא התחייבות.",
    icon: "M8 11a4 4 0 118 0M4 20a8 8 0 0116 0",
  },
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
  { key: "property", title: "פרטי הנכס" },
  { key: "profile", title: "הכנסות והתחייבויות" },
  { key: "terms", title: "תנאי משכנתא" },
  { key: "review", title: "סיכום והמשך" },
];

const faqItems = [
  {
    question: "האם זו בדיקת זכאות רשמית?",
    answer:
      "לא. זו סימולציה ראשונית לפי הנתונים שהוזנו. אישור בנקאי, אם יינתן, כפוף לבדיקת מסמכים, שמאות, נתוני אשראי ותנאי הבנק.",
  },
  {
    question: "כמה הון עצמי צריך בישראל?",
    answer:
      "בדרך כלל, מגבלות המימון המקובלות לדירה ראשונה יכולות להגיע עד כ-75%, למשפרי דיור עד כ-70%, ולדירה להשקעה עד כ-50%, בכפוף למדיניות הגוף המממן. המחשבון מציג אומדן ראשוני אם חסר הון עצמי לפי סוג העסקה.",
  },
  {
    question: "מהו יחס החזר תקין?",
    answer:
      "ברוב המקרים נהוג לראות יחס החזר סביב 30%-35% כטווח נוח יותר לבדיקה. יחס החזר גבוה, סביב 35%-40% ומעלה, עשוי להקשות על קבלת אישור או להשפיע על תנאי ההלוואה, לצד בדיקת הלוואות קיימות, יציבות הכנסה ויתרה למחיה.",
  },
  {
    question: "מתי כדאי לדבר עם יועץ?",
    answer:
      "כאשר יחס ההחזר גבולי, חסר הון עצמי, יש הלוואות קיימות או כשאתם רוצים להשוות תמהיל וריביות לפני פנייה לבנק.",
  },
  {
    question: "איך מחשבים החזר חודשי משוער למשכנתא?",
    answer:
      "החזר חודשי מושפע מסכום המשכנתא, תקופת ההחזר, הריבית, סוג ההצמדה ושיטת ההחזר. המחשבון מציג אומדן לפי הנתונים שהוזנו, אך הריבית בפועל תיקבע רק לאחר בדיקה מול בנק או יועץ.",
  },
  {
    question: "מהו אחוז מימון LTV ולמה הוא חשוב?",
    answer:
      "LTV הוא היחס בין סכום המשכנתא לבין שווי הנכס. בישראל נהוגות מגבלות מימון לפי סוג העסקה ולפי מדיניות הגוף המממן, ולכן אחוז מימון גבוה עשוי להשפיע על בדיקת הבקשה ועל התנאים שהבנק עשוי להציע.",
  },
  {
    question: "האם המחשבון מתאים גם לפני חתימת חוזה?",
    answer:
      "כן. הבדיקה נועדה לתת תמונת מצב ראשונית לפני פנייה לבנק או חתימת חוזה, כדי להבין החזר חודשי, הון עצמי נדרש, יחס החזר ונקודות שעשויות להשפיע על בדיקת הבקשה.",
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
              financialServiceSchema({
                url: absoluteUrl(HOME_SEO.path),
                name: "Finzo",
                description: HOME_SEO.description,
              }),
              webPageSchema(HOME_SEO),
              faqSchema(faqItems),
            ]),
          }}
        />
      </Head>

      <main id="home" dir="rtl" className="min-h-screen bg-slate-50 pb-24 text-slate-950 md:pb-0">
        <a href="#eligibility-check" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:right-3 focus:z-[60] focus:rounded-full focus:bg-white focus:px-4 focus:py-2">דילוג למחשבון</a>
        <Header onCtaClick={handleCtaClick} />
        <Hero onCtaClick={handleCtaClick} />
        <TrustStrip />
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

function Header({ onCtaClick }) {
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
          onClick={() => onCtaClick?.("hero")}
          aria-label="מעבר מהיר למחשבון זכאות"
          className="rounded-full bg-violet-700 px-5 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(109,40,217,0.28)] transition hover:bg-violet-800"
        >
          בדיקת זכאות חינם
        </a>
      </div>
    </header>
  );
}

function Hero({ onCtaClick }) {
  return (
    <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
      <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.18),transparent_45%)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2">
        <div className="mx-auto max-w-2xl text-center lg:text-right">
          <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-black text-violet-800">
            בדיקת זכאות חכמה למשכנתא בישראל
          </span>
          <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            האם יאשרו לכם משכנתא?
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg font-semibold leading-8 text-slate-600 lg:mx-0">
            בדיקת זכאות חכמה למשכנתא לפי נתונים פיננסיים, יחס החזר והנחיות בנק ישראל.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <a
              href="#eligibility-check"
              onClick={() => onCtaClick?.("hero")}
              aria-label="התחלת בדיקת זכאות"
              className="rounded-full bg-violet-700 px-8 py-4 text-center text-base font-black text-white shadow-[0_18px_44px_rgba(109,40,217,0.32)] transition hover:-translate-y-0.5 hover:bg-violet-800"
            >
              בדיקת זכאות חינם
            </a>
            <a
              href="/refinance-check"
              aria-label="מעבר לבדיקת מחזור משכנתא"
              className="rounded-full border border-violet-200 bg-white px-8 py-4 text-center text-base font-black text-violet-800 shadow-sm transition hover:border-violet-300 hover:bg-violet-50"
            >
              בדיקת מחזור משכנתא
            </a>
          </div>
          <p className="mt-5 text-sm font-bold text-slate-500">
            אומדן ראשוני · ללא התחייבות · לא מהווה אישור בנקאי
          </p>
          <a href="#eligibility-check" onClick={() => onCtaClick?.("hero")} className="mt-4 inline-flex items-center gap-2 text-sm font-black text-violet-700 hover:text-violet-800">
            <span>הבדיקה מתחילה כאן</span>
            <span aria-hidden="true">↓</span>
          </a>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
              <p className="text-xs font-black text-slate-500">זמן מילוי</p>
              <p className="mt-1 text-lg font-black text-slate-900">כדקה אחת</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
              <p className="text-xs font-black text-slate-500">תוצאה מיידית</p>
              <p className="mt-1 text-lg font-black text-slate-900">יחס החזר + LTV</p>
            </div>
          </div>
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

function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeader
        eyebrow="איך זה עובד"
        title="ארבעה צעדים פשוטים לפני שפונים לבנק"
        text="תהליך קצר שמייצר תמונת מצב פיננסית ברורה, בלי עומס ובלי לחץ לפני קבלת החלטה."
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

function SeoContentSection() {
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

function CalculatorSection({ data, updateData, analysis, ready, recommendation, trackEvent, eventSentRef }) {
  return (
    <section id="eligibility-check" className="bg-gradient-to-b from-slate-50 via-violet-50/40 to-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader
          eyebrow="מחשבון משכנתא"
          title="בדיקה חכמה לפי הנתונים שלכם"
          text="ממלאים רק נתונים בסיסיים, ומקבלים אומדן ראשוני שמתעדכן בזמן אמת."
        />

        <div className="mt-10 grid items-start gap-6 lg:grid-cols-2">
          <MortgageForm data={data} updateData={updateData} analysis={analysis} ready={ready} recommendation={recommendation} trackEvent={trackEvent} eventSentRef={eventSentRef} />
          <LiveResultPanel analysis={analysis} ready={ready} recommendation={recommendation} />
        </div>
      </div>
    </section>
  );
}

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

  return (
    <form aria-label="אשף בדיקת זכאות למשכנתא" className="rounded-[34px] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-7">
      <div className="mb-5 rounded-2xl bg-slate-100 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-black text-violet-700">שלב {step + 1} מתוך {wizardSteps.length}</p>
          <p className="text-sm font-black text-slate-700">{wizardSteps[step].title}</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-violet-700 transition-all duration-300" style={{ ...PROGRESS_BAR_STYLE, width: `${((step + 1) / wizardSteps.length) * 100}%` }} />
        </div>
      </div>

      {step === 0 && <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="סוג עסקה" value={data.propertyType} onChange={(value) => updateData("propertyType", value)} options={propertyOptions} />
        <MoneyField label="מחיר הנכס" value={data.price} onChange={(value) => updateData("price", value)} />
        <MoneyField label="הון עצמי" value={data.equity} onChange={(value) => updateData("equity", value)} />
        <MoneyField label="סכום משכנתא" helper="אפשר להשאיר ריק — נחושב אוטומטית לפי מחיר פחות הון עצמי" value={data.mortgageAmount} onChange={(value) => updateData("mortgageAmount", value)} />
      </div>}

      {step === 1 && <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField label="הכנסה חודשית נטו" value={data.income} onChange={(value) => updateData("income", value)} />
        <MoneyField label="הוצאות קבועות" value={data.expenses} onChange={(value) => updateData("expenses", value)} />
        <MoneyField label="הלוואות קיימות היום" value={data.loans} onChange={(value) => updateData("loans", value)} />
        <MoneyField label="הלוואות שייסגרו עם הרכישה" value={data.loansToClose} onChange={(value) => updateData("loansToClose", value)} />
        <MoneyField label="החזר דיור נוכחי" helper="שכירות או משכנתא שאתם משלמים היום" value={data.currentHousing} onChange={(value) => updateData("currentHousing", value)} className="sm:col-span-2" />
      </div>}

      {step === 2 && <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="תקופה בשנים" min="5" max="30" value={data.years} onChange={(value) => updateData("years", value)} />
        <RateField label="ריבית שנתית משוערת" value={data.annualRate} onChange={(value) => updateData("annualRate", value)} />
        <SelectField label="סטטוס אשראי" value={data.credit} onChange={(value) => updateData("credit", value)} options={creditOptions} />
        <SelectField label="סוג הצמדה" value={data.indexation} onChange={(value) => updateData("indexation", value)} options={indexationOptions} />
        <SelectField label="שיטת החזר" value={data.repaymentMethod} onChange={(value) => updateData("repaymentMethod", value)} options={repaymentOptions} className="sm:col-span-2" />
      </div>}

      {step === 3 && <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
        <p className="text-sm font-black text-slate-700">סיכום אומדן ראשוני לפני המשך</p>
        <ResultSummaryRow label="אומדן בדיקה ראשונית" value={ready ? `${Math.round(analysis.approval)}%` : "--"} highlight={ready && analysis.approval >= 65} />
        <ResultSummaryRow label="החזר חודשי" value={displayMoney(analysis.monthly, ready)} />
        <ResultSummaryRow label="יחס החזר" value={displayPercent(analysis.mortgageOnlyRatio, ready)} warn={ready && analysis.mortgageOnlyRatio > 40} />
        <p className="rounded-2xl bg-white p-3 text-sm font-bold text-slate-600">{ready ? recommendation : "השלימו נתונים לקבלת חיווי מלא."}</p>
        <a href="#lead" className="block rounded-full bg-violet-700 px-5 py-3 text-center text-sm font-black text-white">בדיקת זכאות חינם</a>
      </div>}

      <div className="mt-5 flex gap-3">
        <button type="button" onClick={() => moveStep(step - 1)} disabled={step === 0} className="h-12 flex-1 rounded-full border border-slate-300 bg-white font-black text-slate-700 disabled:opacity-50">חזרה</button>
        <button type="button" onClick={() => moveStep(step + 1)} disabled={step === wizardSteps.length - 1} className="h-12 flex-1 rounded-full bg-violet-700 font-black text-white disabled:opacity-50">המשך</button>
      </div>
    </form>
  );
}

function LiveResultPanel({ analysis, ready, recommendation }) {
  const score = ready ? Math.round(analysis.approval) : 0;

  return (
    <aside className="rounded-[34px] border border-violet-100 bg-gradient-to-br from-violet-700 to-violet-950 p-6 text-white shadow-[0_24px_70px_rgba(76,29,149,0.28)] sm:p-8">
      <p className="text-sm font-black text-violet-100">{ready ? "ניתוח פיננסי בזמן אמת" : "מלאו נתונים לבדיקה חכמה"}</p>
      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black">אומדן ראשוני לבדיקת משכנתא</h3>
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
        className="mt-5 block rounded-full bg-white px-6 py-4 text-center text-base font-black text-violet-800 shadow-lg transition hover:bg-violet-50"
      >
        בדיקת זכאות חינם
      </a>
      <p className="mt-3 text-center text-xs font-bold text-violet-100">אומדן ראשוני בלבד • לא מהווה אישור בנקאי • ללא התחייבות</p>
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
    ["אומדן בדיקה ראשונית", ready ? `${Math.round(analysis.approval)}%` : "--", approvalLabel(analysis, ready)],
    ["החזר חודשי משוער", displayMoney(analysis.monthly, ready), "לפי תקופה, ריבית ושיטת החזר"],
    ["אינדיקציית סיכון (יחס החזר)", displayPercent(analysis.mortgageOnlyRatio, ready), "משכנתא בלבד מתוך הכנסה נטו"],
    ["הון עצמי", ready ? (analysis.missingEquity > 0 ? `חסר ${formatILS(analysis.missingEquity)}` : "נראה תקין") : "--", "לפי אומדן LTV לסוג העסקה"],
    ["יתרה למחיה", displayMoney(analysis.afterHousing, ready), "לאחר הוצאות, הלוואות ומשכנתא"],
    ["סך ריבית צפויה", displayMoney(analysis.totalInterestEstimate, ready), "לאורך כל תקופת המשכנתא"],
    ["סך תשלום צפוי", displayMoney(analysis.totalPaidEstimate, ready), "החזר כולל לאורך התקופה"],
    ["מצב נוכחי מול חדש", ready ? formatILS(analysis.monthlyGap) : "--", flowText],
  ];

  return (
    <section id="results" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeader
        eyebrow="תוצאות"
        title="תוצאה ברורה לקבלת החלטה ראשונית"
        text="הפרדה ברורה בין אומדן זכאות, החזר חודשי ואינדיקציית סיכון — לפני בדיקה מקצועית מול גורם אנושי."
      />

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {resultCards.map(([label, value, note]) => (
          <ResultCard key={label} label={label} value={value} note={note} />
        ))}
      </div>

      {ready && <details className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5 open:bg-white sm:p-7">
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
      </details>}
    </section>
  );
}

function RefinanceSection() {
  return (
    <section id="refinance" className="bg-violet-950 py-16 text-white sm:py-20">
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

function TrustContentSection() {
  const trustBlocks = [
    {
      title: "איך אומדן הזכאות עובד",
      text: "האומדן משלב יחס החזר, הון עצמי, אחוז מימון (LTV), התחייבויות ויציבות תזרים - כדי לתת תמונת מצב ראשונית בלבד לפני פנייה לבנק.",
    },
    {
      title: "מה עשוי להשפיע על הבדיקה",
      text: "הבנקים בוחנים בדרך כלל הכנסה נטו, הלוואות קיימות, אחוז מימון, היסטוריית אשראי ויכולת החזר לאורך זמן. שינוי קטן בנתונים עשוי לשפר את תוצאת הבדיקה הראשונית.",
    },
    {
      title: "מה זה מחזור משכנתא",
      text: "מחזור הוא החלפת תנאי המשכנתא הקיימת כדי להפחית החזר חודשי או עלות כוללת. בדיקה ראשונית מסייעת להבין אם הפוטנציאל מצדיק המשך תהליך.",
    },
    {
      title: "ללא התחייבות",
      text: "השימוש במחשבון ובפנייה ליועץ הוא ראשוני בלבד. אין התחייבות לתהליך, והמידע משמש לחזרה מקצועית בהתאם לבקשה שלכם.",
    },
  ];

  return (
    <section aria-labelledby="trust-content-title" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeader eyebrow="שקיפות ואמינות" title="הבסיס המקצועי מאחורי האומדן" text="תוכן קצר וברור שמסביר מה נבדק, מה עשוי להשפיע על בדיקת הבקשה ומה המשמעות של בדיקה ללא התחייבות." />
      <h2 id="trust-content-title" className="sr-only">מידע אמון והסבר מקצועי</h2>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {trustBlocks.map((item) => (
          <article key={item.title} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-black text-slate-950">{item.title}</h3>
            <p className="mt-3 leading-7 text-slate-600">{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function LeadSection({ lead, updateLead, submitLead, leadLoading, leadSent, leadError, successRef, analysis, ready, trackEvent }) {
  return (
    <section id="lead" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeader
        eyebrow="המשך מקצועי"
        title="קבלו המשך בדיקה מקצועית"
        text="השאירו פרטים ונציג מקצועי יוכל לחזור אליכם להמשך בדיקה."
      />
      <div className="mt-10 grid items-stretch gap-6 lg:grid-cols-2">
        <div className="rounded-[34px] bg-gradient-to-br from-violet-50 to-white p-7 ring-1 ring-violet-100">
          <div className="space-y-3">
            {ready ? (
              <>
                <ResultSummaryRow label="אומדן בדיקה ראשונית" value={`${Math.round(analysis.approval)}%`} highlight={analysis.approval >= 65} />
                <ResultSummaryRow label="החזר חודשי משוער" value={formatILS(analysis.monthly)} />
                <ResultSummaryRow label="יחס החזר" value={formatPct(analysis.mortgageOnlyRatio)} warn={analysis.mortgageOnlyRatio > 40} />
                <ResultSummaryRow label="יתרה למחיה" value={formatILS(analysis.afterHousing)} warn={analysis.afterHousing < 3000} />
                {analysis.mainIssue && (
                  <div className="mt-2 rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs font-black text-slate-500">הנושא המרכזי לטיפול</p>
                    <p className="mt-1 font-black text-violet-900">{analysis.mainIssue}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl bg-white px-4 py-5 text-center shadow-sm">
                <p className="font-black text-slate-500">מלאו נתונים במחשבון כדי לראות כאן את סיכום הסימולציה.</p>
              </div>
            )}
          </div>
          <ul className="mt-6 space-y-2 text-sm font-bold text-slate-600">
            <li className="flex items-center gap-2"><CheckIcon /><span>בדיקת זכאות חינם וללא התחייבות</span></li>
            <li className="flex items-center gap-2"><CheckIcon /><span>אינה פוגעת בדירוג אשראי</span></li>
            <li className="flex items-center gap-2"><CheckIcon /><span>פרטיות מלאה ושימוש במידע לצורך חזרה בלבד</span></li>
            <li className="flex items-center gap-2"><CheckIcon /><span>שיחה מקצועית קצרה להבנת הצעד הבא</span></li>
          </ul>
        </div>

        <form
          onSubmit={submitLead}
          aria-busy={leadLoading ? "true" : "false"}
          className="rounded-[34px] border border-slate-200 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.10)]"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="שם מלא" value={lead.name} onChange={(value) => updateLead("name", value)} autoComplete="name" required />
            <TextField label="טלפון" value={lead.phone} onChange={(value) => updateLead("phone", value)} placeholder="05X-XXXXXXX" autoComplete="tel" required />
            <TextField label="עיר" value={lead.city} onChange={(value) => updateLead("city", value)} autoComplete="address-level2" />
            <MoneyField label="סכום משכנתא" value={lead.mortgageAmount} onChange={(value) => updateLead("mortgageAmount", value)} />
            <MoneyField label="מחיר נכס" value={lead.propertyPrice} onChange={(value) => updateLead("propertyPrice", value)} />
            <MoneyField label="הון עצמי" value={lead.equityAmount} onChange={(value) => updateLead("equityAmount", value)} />
            <MoneyField label="הכנסה חודשית נטו" value={lead.monthlyIncome} onChange={(value) => updateLead("monthlyIncome", value)} />
            <MoneyField label="החזרי הלוואות קיימים" value={lead.debtLevel} onChange={(value) => updateLead("debtLevel", value)} />
            <TextField label="סטטוס תעסוקה" value={lead.employmentStatus} onChange={(value) => updateLead("employmentStatus", value)} placeholder="שכיר / עצמאי / אחר" />
            <TextField
              label="סטטוס רכישה"
              value={lead.purchaseStatus}
              onChange={(value) => updateLead("purchaseStatus", value)}
              placeholder="לפני חוזה / אחרי חוזה"
            />
            <SelectField
              label="סטטוס חוזה"
              value={lead.contractStatus}
              onChange={(value) => updateLead("contractStatus", value)}
              options={[
                ["before", "לפני חוזה"],
                ["negotiation", "במו\"מ / טיוטות"],
                ["signed", "חוזה חתום"],
              ]}
            />
            <SelectField
              label="האם קיימת משכנתא"
              value={lead.hasExistingMortgage}
              onChange={(value) => updateLead("hasExistingMortgage", value)}
              options={[
                ["no", "לא"],
                ["yes", "כן"],
              ]}
            />
            <SelectField
              label="מצב אשראי"
              value={lead.creditStatus}
              onChange={(value) => updateLead("creditStatus", value)}
              options={[
                ["unknown", "לא ידוע"],
                ["clean", "תקין"],
                ["medium", "גבולי"],
                ["bad", "בעייתי"],
              ]}
            />
            <TextField
              label="מועד נוח לחזרה"
              value={lead.requestedContactTime}
              onChange={(value) => updateLead("requestedContactTime", value)}
              placeholder="למשל: א'-ה' 17:00-20:00"
            />
            <TextField
              label="הערות נוספות"
              value={lead.notes}
              onChange={(value) => updateLead("notes", value)}
              placeholder="מידע נוסף שחשוב שנדע"
              className="sm:col-span-2"
            />
          </div>

          {leadError && <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{leadError}</p>}
          {leadSent && <p ref={successRef} role="status" className="mt-4 rounded-2xl bg-emerald-50 px-4 py-4 text-center text-sm font-black text-emerald-700">הפנייה נשלחה בהצלחה. נחזור אליכם בהקדם.</p>}

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-black text-slate-700">מה קורה אחרי השליחה?</p>
            <p className="mt-1 text-sm font-semibold text-slate-600">יועץ מקצועי חוזר אליכם לתיאום שיחה קצרה, מעבר על האומדן הראשוני והכוונה לצעד הבא. ללא התחייבות.</p>
          </div>

          <button
            type="submit"
            disabled={leadLoading || leadSent}
            className="mt-4 min-h-12 w-full rounded-full bg-violet-700 px-7 py-4 text-base font-black text-white shadow-[0_16px_40px_rgba(109,40,217,0.25)] transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {leadLoading ? "שולח..." : leadSent ? "נשלח בהצלחה" : "בדיקת זכאות חינם"}
          </button>
          <p className="mt-3 text-center text-xs font-bold text-slate-500">
            בדיקת זכאות חינם היא אומדן ראשוני בלבד, לא מהווה אישור בנקאי, וללא כל התחייבות. המידע נשמר באופן מאובטח לצורך חזרה בלבד.
          </p>
        </form>
      </div>
    </section>
  );
}

function ResultSummaryRow({ label, value, highlight = false, warn = false }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
      <span className="font-bold text-slate-600">{label}</span>
      <span className={`number-display font-black ${highlight ? "text-emerald-700" : warn ? "text-amber-700" : "text-slate-950"}`}>{value}</span>
    </div>
  );
}

function FaqSection({ openFaq, setOpenFaq }) {
  return (
    <section id="faq" className="bg-slate-100/60 py-16 sm:py-20">
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
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-right"
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


function BottomLeadSection({ bottomLead, updateBottomLead, submitBottomLead, bottomLeadLoading, bottomLeadSent, bottomLeadError }) {
  return (
    <section id="bottom-lead" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="rounded-[30px] border border-violet-200/70 bg-gradient-to-br from-slate-950 via-violet-950 to-violet-900 p-6 text-white shadow-[0_28px_70px_rgba(46,16,101,0.35)] sm:p-8">
        <h2 className="text-2xl font-black sm:text-3xl">רוצים לבדוק זכאות בצורה מקצועית?</h2>
        <p className="mt-2 text-sm font-semibold text-violet-100 sm:text-base">השאירו פרטים ונציג מקצועי יחזור אליכם להמשך בדיקה.</p>
        <form onSubmit={submitBottomLead} className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-4">
          <TextField label="שם מלא" value={bottomLead.name} onChange={(value) => updateBottomLead("name", value)} autoComplete="name" required />
          <TextField label="טלפון" value={bottomLead.phone} onChange={(value) => updateBottomLead("phone", value)} autoComplete="tel" placeholder="05X-XXXXXXX" required />
          <TextField label="עיר" value={bottomLead.city} onChange={(value) => updateBottomLead("city", value)} autoComplete="address-level2" />
          <button type="submit" disabled={bottomLeadLoading || bottomLeadSent} className="min-h-12 rounded-2xl bg-white px-5 py-3 text-sm font-black text-violet-900 transition hover:bg-violet-50 disabled:opacity-70">
            {bottomLeadLoading ? "שולח..." : bottomLeadSent ? "נשלח בהצלחה" : "שליחה לנציג מקצועי"}
          </button>
        </form>
        {bottomLeadError && <p role="alert" className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{bottomLeadError}</p>}
        {bottomLeadSent && <p role="status" className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">הפנייה נשלחה בהצלחה. נחזור אליכם בהקדם.</p>}
        <p className="mt-3 text-xs font-bold text-violet-100">ללא התחייבות. הפרטים ישמשו לחזרה אליכם בלבד.</p>
      </div>
    </section>
  );
}

function Footer({ onCtaClick }) {
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
        <div className="flex flex-wrap gap-3 items-center">
          <a href="#eligibility-check" onClick={() => onCtaClick?.("footer")} className="inline-flex rounded-full bg-violet-700 px-5 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(109,40,217,0.28)] transition hover:bg-violet-800">
            בדיקת זכאות חינם
          </a>
          <a href="#bottom-lead" onClick={() => onCtaClick?.("footer_bottom_lead")} className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-5 py-3 text-sm font-black text-violet-800 transition hover:bg-violet-100">
            השאר פרטים
          </a>
          <a href="/blog" className="text-sm font-bold text-violet-700 hover:underline">בלוג משכנתאות ←</a>
          <a href="/guides" className="text-sm font-bold text-violet-700 hover:underline">מדריכי משכנתא ←</a>
        </div>
      </div>
    </footer>
  );
}

function MobileStickyCta({ onCtaClick, hidden }) {
  return (
    <div className={`mobile-sticky-cta fixed inset-x-0 bottom-0 z-40 border-t border-violet-100 bg-white/95 px-4 pt-2 pb-2 shadow-[0_-16px_40px_rgba(15,23,42,0.10)] backdrop-blur-xl transition md:hidden ${hidden ? "pointer-events-none translate-y-full opacity-0" : "translate-y-0 opacity-100"}`}>
      <div className="mx-auto grid max-w-sm grid-cols-2 gap-3">
        <a
          href="#eligibility-check"
          onClick={() => onCtaClick?.("sticky_mobile")}
          className="rounded-full bg-violet-700 px-4 py-3 text-center text-sm font-black text-white shadow-[0_12px_28px_rgba(109,40,217,0.28)]"
        >
          בדיקת זכאות חינם
        </a>
        <a
          href="#bottom-lead"
          className="rounded-full border border-violet-200 bg-violet-50 px-4 py-3 text-center text-sm font-black text-violet-800"
        >
          השאר פרטים
        </a>
      </div>
    </div>
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
  const fieldId = useMemo(() => `field-${label.replace(/\s+/g, "-")}`, [label]);
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-black text-slate-700" id={`${fieldId}-label`}>{label}</span>
      <span className="relative mt-2 block">
        <input
          id={fieldId}
          aria-labelledby={`${fieldId}-label`}
          inputMode="numeric"
          dir="ltr"
          pattern="[0-9,]*"
          value={displayNumber(value || "")}
          onChange={(event) => onChange(cleanNumber(event.target.value))}
          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pl-10 text-base font-black text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 sm:h-14"
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">₪</span>
      </span>
      {helper && <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{helper}</span>}
    </label>
  );
}

function TextField({ label, value, onChange, placeholder = "", required = false, className = "", autoComplete }) {
  const fieldId = useMemo(() => `field-${label.replace(/\s+/g, "-")}`, [label]);
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-black text-slate-700" id={`${fieldId}-label`}>{label}</span>
      <input
        id={fieldId}
        aria-labelledby={`${fieldId}-label`}
        value={value}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 sm:h-14"
      />
    </label>
  );
}

function NumberField({ label, value, onChange, min, max }) {
  const fieldId = useMemo(() => `field-${label.replace(/\s+/g, "-")}`, [label]);
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700" id={`${fieldId}-label`}>{label}</span>
      <input
        id={fieldId}
        aria-labelledby={`${fieldId}-label`}
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
  const fieldId = useMemo(() => `field-${label.replace(/\s+/g, "-")}`, [label]);
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700" id={`${fieldId}-label`}>{label}</span>
      <span className="relative mt-2 block">
        <input
          id={fieldId}
          aria-labelledby={`${fieldId}-label`}
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(cleanNumber(event.target.value, true))}
          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pl-10 text-base font-black text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 sm:h-14"
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">%</span>
      </span>
    </label>
  );
}

function SelectField({ label, value, onChange, options, className = "" }) {
  const fieldId = useMemo(() => `field-${label.replace(/\s+/g, "-")}`, [label]);
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-black text-slate-700" id={`${fieldId}-label`}>{label}</span>
      <select
        id={fieldId}
        aria-labelledby={`${fieldId}-label`}
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
