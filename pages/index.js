import Head from "next/head";
import { useEffect, useMemo, useRef, useState } from "react";
import { cleanNumber, displayNumber, formatILS, formatPct } from "../lib/format";
import { calculateMortgageAnalysis } from "../lib/mortgage";
import { initializeAnalyticsLayer, trackEvent as trackAnalyticsEvent } from "../lib/analytics";
import {
  Header,
  Hero,
  TrustStrip,
  ProblemSection,
  HowItWorks,
  SeoContentSection,
  RefinanceSection,
  TrustContentSection,
  FaqSection,
  Footer,
  MobileStickyCta,
  SectionHeader,
  faqItems,
} from "../components/HomeSections";
import { ToastContainer, useToast } from "../components/ui/Toast";
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

const wizardSteps = [
  { key: "property", title: "א. פרטי הנכס" },
  { key: "profile", title: "ב. הכנסות והתחייבויות" },
  { key: "terms", title: "ג. מצב אישי" },
  { key: "review", title: "סיכום" },
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
  const [leadConsent, setLeadConsent] = useState(false);
  const [bottomLeadConsent, setBottomLeadConsent] = useState(false);
  const [bottomLead, setBottomLead] = useState({
    name: "", phone: "", city: "", propertyCity: "",
    purchaseStatus: "",
    propertyPrice: "", equityAmount: "", mortgageAmount: "", monthlyIncome: "",
    debtLevel: "", hasExistingMortgage: "no", requestedContactTime: "",
  });
  const [bottomLeadSent, setBottomLeadSent] = useState(false);
  const [bottomLeadLoading, setBottomLeadLoading] = useState(false);
  const [bottomLeadError, setBottomLeadError] = useState("");
  const [isInsideEligibility, setIsInsideEligibility] = useState(false);
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
  const { toasts, addToast, removeToast } = useToast();

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
    if (!bottomLeadConsent) {
      setBottomLeadError("יש לאשר את תנאי השימוש ומדיניות הפרטיות לפני השליחה.");
      return;
    }
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
      propertyPrice: toNumeric(bottomLead.propertyPrice) || toNumeric(data?.price),
      equityAmount: toNumeric(bottomLead.equityAmount) || toNumeric(data?.equity),
      mortgageAmount: cleanNumber(bottomLead.mortgageAmount) || "",
      monthlyIncome: toNumeric(bottomLead.monthlyIncome) || toNumeric(data?.income),
      debtLevel: toNumeric(bottomLead.debtLevel) || toNumeric(data?.loans) || toNumeric(data?.expenses) || 0,
      purchaseStatus: bottomLead.purchaseStatus || "",
      hasExistingMortgage: bottomLead.hasExistingMortgage || "",
      requestedContactTime: bottomLead.requestedContactTime || "",
      propertyCity: bottomLead.propertyCity || "",
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
      addToast({ title: "הפנייה נשלחה בהצלחה", description: "נחזור אליכם בהקדם.", variant: "success" });
      trackEvent("bottom_lead_submit_success");
    } catch {
      setBottomLeadSent(false);
      addToast({ title: "הפנייה לא נשלחה", description: "נסו שוב.", variant: "danger" });
      trackEvent("bottom_lead_submit_failed");
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
    if (!leadConsent) {
      setLeadError("יש לאשר את תנאי השימוש ומדיניות הפרטיות לפני השליחה.");
      return;
    }
    if (lead.name.trim().length < 2) {
      setLeadError("יש להזין שם מלא כדי שנדע כיצד לפנות אליכם.");
      return;
    }
    if (phone.length < 7) {
      setLeadError("יש להזין מספר טלפון תקין כדי שנוכל לחזור אליכם.");
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
      addToast({ title: "הפנייה נשלחה בהצלחה", description: "נחזור אליכם בהקדם עם כיוון ראשוני.", variant: "success" });
      trackEvent("lead_submit_success", {
        approvalEstimate: Math.round(analysis?.approval || 0),
        paymentEstimate: Math.round(analysis?.monthly || 0),
      });
    } catch (error) {
      setLeadSent(false);
      addToast({ title: "הפנייה לא נשלחה", description: "לא הצלחנו לשלוח את הפרטים כרגע. נסה שוב בעוד רגע.", variant: "danger" });
      trackEvent("lead_submit_failed", {
        approvalEstimate: Math.round(analysis?.approval || 0),
        paymentEstimate: Math.round(analysis?.monthly || 0),
        errorCode: error?.message || "UNKNOWN_ERROR",
      });
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
        <ProblemSection />
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
          leadConsent={leadConsent}
          setLeadConsent={setLeadConsent}
          analysis={analysis}
          ready={ready}
          trackEvent={trackEvent}
        />
        <FaqSection />
        <BottomLeadSection
          bottomLead={bottomLead}
          updateBottomLead={updateBottomLead}
          submitBottomLead={submitBottomLead}
          bottomLeadLoading={bottomLeadLoading}
          bottomLeadSent={bottomLeadSent}
          bottomLeadError={bottomLeadError}
          bottomLeadConsent={bottomLeadConsent}
          setBottomLeadConsent={setBottomLeadConsent}
        />
        <Footer onCtaClick={handleCtaClick} />
        <MobileStickyCta onCtaClick={handleCtaClick} hidden={isInsideEligibility} />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </main>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  CALCULATOR SECTION                                                  */
/* ------------------------------------------------------------------ */

function CalculatorSection({ data, updateData, analysis, ready, recommendation, trackEvent, eventSentRef }) {
  return (
    <section id="eligibility-check" className="bg-gradient-to-b from-slate-50 via-violet-50/40 to-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader
          eyebrow="בדיקת התאמה"
          title="מלאו נתונים — קבלו אומדן סיכוי התאמה מיד"
          text="כמה שאלות פיננסיות בסיסיות. תוצאה מיידית. ללא עלות, ללא התחייבות."
        />

        <div className="mt-10 grid items-start gap-6 lg:grid-cols-2">
          <MortgageForm data={data} updateData={updateData} analysis={analysis} ready={ready} recommendation={recommendation} trackEvent={trackEvent} eventSentRef={eventSentRef} />
          <LiveResultPanel analysis={analysis} ready={ready} recommendation={recommendation} />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  MORTGAGE FORM                                                       */
/* ------------------------------------------------------------------ */

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
        <p className="text-sm font-black text-slate-700">אומדן ראשוני — לא מחייב ולא אישור בנקאי</p>
        <ResultSummaryRow label="אומדן סיכוי אישור" value={ready ? `${Math.round(analysis.approval)}%` : "--"} highlight={ready && analysis.approval >= 65} />
        <ResultSummaryRow label="החזר חודשי משוער" value={displayMoney(analysis.monthly, ready)} />
        <ResultSummaryRow label="יחס החזר" value={displayPercent(analysis.mortgageOnlyRatio, ready)} warn={ready && analysis.mortgageOnlyRatio > 40} />
        <ResultSummaryRow label="יתרה למחיה" value={displayMoney(analysis.afterHousing, ready)} />
        <p className="rounded-2xl bg-white p-3 text-sm font-bold text-slate-600">{ready ? recommendation : "השלימו נתונים לקבלת חיווי מלא."}</p>
        <a href="#lead" className="block rounded-full bg-violet-700 px-5 py-3 text-center text-sm font-black text-white">רוצים להבין איך לשפר? דברו איתנו</a>
      </div>}

      <div className="mt-5 flex gap-3">
        <button type="button" onClick={() => moveStep(step - 1)} disabled={step === 0} className="h-12 flex-1 rounded-full border border-slate-300 bg-white font-black text-slate-700 disabled:opacity-50">חזרה</button>
        <button type="button" onClick={() => moveStep(step + 1)} disabled={step === wizardSteps.length - 1} className="h-12 flex-1 rounded-full bg-violet-700 font-black text-white disabled:opacity-50">המשך</button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  LIVE RESULT PANEL                                                   */
/* ------------------------------------------------------------------ */

function LiveResultPanel({ analysis, ready, recommendation }) {
  const score = ready ? Math.round(analysis.approval) : 0;

  return (
    <aside className="rounded-[34px] border border-violet-100 bg-gradient-to-br from-violet-700 to-violet-950 p-6 text-white shadow-[0_24px_70px_rgba(76,29,149,0.28)] sm:p-8">
      <p className="text-sm font-black text-violet-100">{ready ? "תוצאה מתעדכנת בזמן אמת" : "מלאו נתונים לבדיקה ראשונית"}</p>
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
        <DarkMetric label="יתרה למחיה" value={displayMoney(analysis.afterHousing, ready)} />
        <DarkMetric label="אחוז מימון LTV" value={displayPercent(analysis.ltv, ready)} />
      </div>

      <div className="mt-6 rounded-3xl bg-white/10 p-5 ring-1 ring-white/10">
        <p className="text-sm font-black text-violet-100">נקודת שיפור מרכזית</p>
        <p className="mt-2 text-lg font-black">{ready ? analysis.mainIssue : "הזינו נתונים כדי לקבל חיווי"}</p>
        <p className="mt-3 leading-7 text-violet-50">{ready ? recommendation : ""}</p>
      </div>

      <a
        href="#lead"
        className="mt-5 block rounded-full bg-white px-6 py-4 text-center text-base font-black text-violet-800 shadow-lg transition hover:bg-violet-50"
      >
        רוצים לשפר את הסיכוי? דברו איתנו
      </a>
      <p className="mt-3 text-center text-xs font-bold text-violet-100">אומדן ראשוני בלבד · לא אישור בנקאי · ללא התחייבות</p>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  RESULTS SECTION                                                     */
/* ------------------------------------------------------------------ */

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
        text="כל הנתונים המרכזיים במקום אחד. זכרו — זהו אומדן ראשוני בלבד ולא אישור בנקאי."
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

/* ------------------------------------------------------------------ */
/*  LEAD SECTION                                                        */
/* ------------------------------------------------------------------ */

function LeadSection({ lead, updateLead, submitLead, leadLoading, leadSent, leadError, leadConsent, setLeadConsent, analysis, ready, trackEvent }) {
  return (
    <section id="lead" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeader
        eyebrow="קבלו תמונת מצב ראשונית"
        title="מלאו כמה פרטים ונציג לכם כיוון ראשוני"
        text="אם יש התאמה, ניתן יהיה להמשיך לבדיקה מקצועית — ללא לחץ, ללא עלות, ללא התחייבות."
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
          <a href="/lead" className="mt-5 block text-center text-sm font-bold text-violet-700 hover:text-violet-800 hover:underline">
            רוצים בדיקה מעמיקה יותר? עברו לטופס המפורט ←
          </a>
        </div>

        <form
          onSubmit={submitLead}
          aria-busy={leadLoading ? "true" : "false"}
          className="rounded-[34px] border border-slate-200 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.10)]"
        >
          <p className="mb-4 text-sm font-black text-slate-700">פרטים ליצירת קשר</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="שם מלא" value={lead.name} onChange={(value) => updateLead("name", value)} autoComplete="name" required />
            <TextField label="טלפון" value={lead.phone} onChange={(value) => updateLead("phone", value)} placeholder="05X-XXXXXXX" autoComplete="tel" inputMode="tel" required />
            <TextField label="עיר" value={lead.city} onChange={(value) => updateLead("city", value)} autoComplete="address-level2" className="sm:col-span-2" />
          </div>

          <p className="mb-4 mt-6 text-sm font-black text-slate-700">פרטי העסקה (אופציונלי — עוזר לנו להגיע מוכנים)</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="מה סוג הבדיקה?"
              value={lead.purchaseStatus}
              onChange={(value) => updateLead("purchaseStatus", value)}
              options={PURCHASE_STATUS_OPTIONS}
              className="sm:col-span-2"
            />
            <MoneyField label="מחיר נכס" value={lead.propertyPrice} onChange={(value) => updateLead("propertyPrice", value)} />
            <MoneyField label="הון עצמי" value={lead.equityAmount} onChange={(value) => updateLead("equityAmount", value)} />
            <MoneyField label="סכום משכנתא מבוקש" value={lead.mortgageAmount} onChange={(value) => updateLead("mortgageAmount", value)} />
            <MoneyField label="הכנסה חודשית נטו" value={lead.monthlyIncome} onChange={(value) => updateLead("monthlyIncome", value)} />
            <MoneyField label="החזרי הלוואות חודשיים" value={lead.debtLevel} onChange={(value) => updateLead("debtLevel", value)} />
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
            <TextField
              label="מועד נוח לחזרה"
              value={lead.requestedContactTime}
              onChange={(value) => updateLead("requestedContactTime", value)}
              placeholder="למשל: א'-ה' 17:00-20:00"
              className="sm:col-span-2"
            />
          </div>

          {leadError && <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{leadError}</p>}

          <p className="mt-4 text-xs font-semibold text-slate-500">ככל שתמלאו יותר נתונים, הבדיקה הראשונית תהיה מדויקת יותר.</p>

          <ConsentCheckbox checked={leadConsent} onChange={setLeadConsent} />

          <p className="mt-3 text-xs font-semibold text-slate-400">
            הפרטים עשויים להיות מועברים ליועצי משכנתאות לצורך יצירת קשר ומתן שירות.
          </p>

          <button
            type="submit"
            disabled={leadLoading || leadSent}
            className="mt-3 min-h-12 w-full rounded-full bg-violet-700 px-7 py-4 text-base font-black text-white shadow-[0_16px_40px_rgba(109,40,217,0.25)] transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {leadLoading ? "שולח..." : leadSent ? "נשלח בהצלחה ✓" : "שלחו לבדיקה ראשונית"}
          </button>
          <p className="mt-3 text-center text-xs font-bold text-slate-500">
            ללא התחייבות · הנתונים משמשים לאומדן ראשוני בלבד · אין מדובר באישור בנקאי
          </p>
        </form>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  BOTTOM LEAD SECTION                                                 */
/* ------------------------------------------------------------------ */

const PURCHASE_STATUS_OPTIONS = [
  ["", "מה סוג הבדיקה?"],
  ["new_purchase",       "רכישת דירה"],
  ["first_apartment",    "דירה ראשונה"],
  ["upgrader",           "משפר דיור"],
  ["investment",         "דירה להשקעה / דירה שנייה"],
  ["refinance",          "מחזור משכנתא"],
  ["bank_declined",      "סורב בבנק"],
  ["bdi_credit_issue",   "הייתה בעיה באישור בנקאי / אשראי"],
  ["senior_60plus",      "משכנתא גיל 60+"],
  ["debt_consolidation", "איחוד הלוואות"],
  ["general",            "בדיקה כללית"],
];

function BottomLeadSection({ bottomLead, updateBottomLead, submitBottomLead, bottomLeadLoading, bottomLeadSent, bottomLeadError, bottomLeadConsent, setBottomLeadConsent }) {
  if (bottomLeadSent) {
    return (
      <section id="bottom-lead" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="rounded-[30px] border border-violet-200/70 bg-gradient-to-br from-slate-950 via-violet-950 to-violet-900 p-8 text-center text-white shadow-[0_28px_70px_rgba(46,16,101,0.35)]">
          <span className="text-5xl">✓</span>
          <h2 className="mt-4 text-2xl font-black">הבדיקה נשלחה בהצלחה</h2>
          <p className="mt-2 font-semibold text-violet-100">נחזור אליכם בהקדם עם כיוון ראשוני בהתאם לפרטים שמסרתם.</p>
          <p className="mt-4 text-xs font-bold text-violet-200">ללא התחייבות · הנתונים משמשים לאומדן ראשוני בלבד · אין מדובר באישור בנקאי</p>
        </div>
      </section>
    );
  }

  return (
    <section id="bottom-lead" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="rounded-[30px] border border-violet-200/70 bg-gradient-to-br from-slate-950 via-violet-950 to-violet-900 p-6 text-white shadow-[0_28px_70px_rgba(46,16,101,0.35)] sm:p-8">

        {/* Header */}
        <div className="mb-6">
          <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-black text-violet-200">
            בדיקת התאמה ראשונית
          </span>
          <h2 className="mt-3 text-2xl font-black sm:text-3xl">קבלו בדיקת התאמה ראשונית למשכנתא</h2>
          <p className="mt-2 font-semibold text-violet-100">
            מלאו כמה פרטים בסיסיים ונציג כיוון ראשוני. אם תהיה התאמה, ניתן יהיה להמשיך לבדיקה מקצועית.
          </p>
        </div>

        <form onSubmit={submitBottomLead} dir="rtl" className="grid gap-4 sm:grid-cols-2">

          {/* Purchase status select — full width */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-black text-violet-100">סוג הבדיקה</label>
            <select
              value={bottomLead.purchaseStatus}
              onChange={(e) => updateBottomLead("purchaseStatus", e.target.value)}
              className="h-12 w-full rounded-2xl border border-violet-200 bg-white px-4 text-base font-bold text-slate-950 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-200 sm:h-14"
            >
              {PURCHASE_STATUS_OPTIONS.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Contact fields */}
          <TextField label="שם מלא" value={bottomLead.name} onChange={(v) => updateBottomLead("name", v)} autoComplete="name" required contrastMode="dark" />
          <TextField label="טלפון" value={bottomLead.phone} onChange={(v) => updateBottomLead("phone", v)} autoComplete="tel" placeholder="05X-XXXXXXX" inputMode="tel" required contrastMode="dark" />
          <TextField label="עיר מגורים" value={bottomLead.city} onChange={(v) => updateBottomLead("city", v)} autoComplete="address-level2" contrastMode="dark" />
          <TextField label="עיר הנכס (אם ידוע)" value={bottomLead.propertyCity} onChange={(v) => updateBottomLead("propertyCity", v)} contrastMode="dark" />

          {/* Financial fields */}
          <MoneyField label="מחיר נכס משוער" value={bottomLead.propertyPrice} onChange={(v) => updateBottomLead("propertyPrice", v)} contrastMode="dark" />
          <MoneyField label="הון עצמי" value={bottomLead.equityAmount} onChange={(v) => updateBottomLead("equityAmount", v)} contrastMode="dark" />
          <MoneyField label="סכום משכנתא מבוקש" value={bottomLead.mortgageAmount} onChange={(v) => updateBottomLead("mortgageAmount", v)} contrastMode="dark" />
          <MoneyField label="הכנסה חודשית נטו" value={bottomLead.monthlyIncome} onChange={(v) => updateBottomLead("monthlyIncome", v)} contrastMode="dark" />
          <MoneyField label="החזרי הלוואות חודשיים" value={bottomLead.debtLevel} onChange={(v) => updateBottomLead("debtLevel", v)} contrastMode="dark" />

          {/* Existing mortgage toggle */}
          <div>
            <label className="mb-1.5 block text-sm font-black text-violet-100">יש לכם משכנתא קיימת?</label>
            <div className="flex gap-3 pt-1">
              {[["no", "לא"], ["yes", "כן"]].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => updateBottomLead("hasExistingMortgage", val)}
                  className={`h-12 flex-1 rounded-2xl border text-sm font-black transition sm:h-14 ${
                    bottomLead.hasExistingMortgage === val
                      ? "border-white bg-white text-violet-900"
                      : "border-white/20 bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Contact time — full width */}
          <TextField
            label="מועד נוח לחזרה (אופציונלי)"
            value={bottomLead.requestedContactTime}
            onChange={(v) => updateBottomLead("requestedContactTime", v)}
            placeholder="למשל: א'-ה' 17:00-20:00"
            contrastMode="dark"
            className="sm:col-span-2"
          />

          {/* Consent + error + submit — full width */}
          <div className="sm:col-span-2">
            <ConsentCheckbox checked={bottomLeadConsent} onChange={setBottomLeadConsent} dark />
            <p className="mt-2 text-xs font-semibold text-violet-300">
              הפרטים עשויים להיות מועברים ליועצי משכנתאות לצורך יצירת קשר ומתן שירות.
            </p>
          </div>

          {bottomLeadError && (
            <p role="alert" className="sm:col-span-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {bottomLeadError}
            </p>
          )}

          <button
            type="submit"
            disabled={bottomLeadLoading}
            className="sm:col-span-2 min-h-[52px] rounded-full bg-white px-7 py-4 text-base font-black text-violet-900 shadow-[0_14px_34px_rgba(255,255,255,0.15)] transition hover:bg-violet-50 disabled:opacity-70"
          >
            {bottomLeadLoading ? "שולח..." : "שלחו לבדיקה ראשונית"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs font-bold text-violet-200">
          ללא התחייבות · הנתונים משמשים לאומדן ראשוני בלבד · אין מדובר באישור בנקאי
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  SHARED DISPLAY COMPONENTS                                           */
/* ------------------------------------------------------------------ */

function ResultSummaryRow({ label, value, highlight = false, warn = false }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
      <span className="font-bold text-slate-600">{label}</span>
      <span className={`number-display font-black ${highlight ? "text-emerald-700" : warn ? "text-amber-700" : "text-slate-950"}`}>{value}</span>
    </div>
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

/* ------------------------------------------------------------------ */
/*  FORM FIELD COMPONENTS                                               */
/* ------------------------------------------------------------------ */

function MoneyField({ label, value, onChange, helper, className = "", contrastMode = "light" }) {
  const fieldId = useMemo(() => `field-${label.replace(/\s+/g, "-")}`, [label]);
  const isDark = contrastMode === "dark";
  return (
    <label className={`block ${className}`}>
      <span className={`text-sm font-black ${isDark ? "text-violet-50" : "text-slate-700"}`} id={`${fieldId}-label`}>{label}</span>
      <span className="relative mt-2 block">
        <input
          id={fieldId}
          aria-labelledby={`${fieldId}-label`}
          inputMode="numeric"
          dir="ltr"
          pattern="[0-9,]*"
          value={displayNumber(value || "")}
          onChange={(event) => onChange(cleanNumber(event.target.value))}
          className={`h-12 w-full rounded-2xl px-4 pl-10 text-base font-black text-slate-950 outline-none transition sm:h-14 ${isDark ? "border border-violet-200 bg-white focus:border-violet-300 focus:ring-4 focus:ring-violet-200" : "border border-slate-200 bg-slate-50 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"}`}
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">₪</span>
      </span>
      {helper && <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{helper}</span>}
    </label>
  );
}

function TextField({ label, value, onChange, placeholder = "", required = false, className = "", autoComplete, contrastMode = "light", inputMode = "text" }) {
  const fieldId = useMemo(() => `field-${label.replace(/\s+/g, "-")}`, [label]);
  const isDark = contrastMode === "dark";
  return (
    <label className={`block ${className}`}>
      <span className={`text-sm font-black ${isDark ? "text-violet-50" : "text-slate-700"}`} id={`${fieldId}-label`}>{label}</span>
      <input
        id={fieldId}
        aria-labelledby={`${fieldId}-label`}
        value={value}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-2 h-12 w-full rounded-2xl px-4 text-base font-bold outline-none transition sm:h-14 ${isDark
          ? "border border-violet-200 bg-white text-slate-950 placeholder:text-slate-500 focus:border-violet-300 focus:ring-4 focus:ring-violet-200"
          : "border border-slate-200 bg-slate-50 text-slate-950 placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"}`}
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
        inputMode="numeric"
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

/* ------------------------------------------------------------------ */
/*  CONSENT CHECKBOX                                                    */
/* ------------------------------------------------------------------ */

function ConsentCheckbox({ checked, onChange, dark = false }) {
  return (
    <label className="mt-4 flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 text-violet-600 accent-violet-600 focus:ring-violet-400"
        aria-required="true"
      />
      <span className={`text-xs font-semibold leading-5 ${dark ? "text-violet-200" : "text-slate-600"}`}>
        אני מאשר/ת את{" "}
        <a href="/terms" target="_blank" rel="noopener noreferrer" className={`font-black underline ${dark ? "text-white" : "text-violet-700"}`}>תנאי השימוש</a>
        {" "}ו
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className={`font-black underline ${dark ? "text-white" : "text-violet-700"}`}>מדיניות הפרטיות</a>
        {" "}ומסכים/ה להעברת הפרטים לצורך קבלת שירות מיועצי משכנתאות.
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  ICONS                                                               */
/* ------------------------------------------------------------------ */

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-violet-600" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
