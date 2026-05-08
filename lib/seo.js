export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://mortgai-gxjc.vercel.app").replace(/\/$/, "");
export const SITE_NAME = "בדיקת זכאות למשכנתא";

export const HOME_SEO = {
  title: "מחשבון משכנתא חכם | בדיקת זכאות והחזר חודשי",
  description:
    "בדקו תוך דקה כמה משכנתא תוכלו לקבל, מה ההחזר החודשי המשוער ומה אומדן סיכוי האישור לפי הכנסה, הון עצמי, יחס החזר ואחוז מימון.",
  path: "/",
  keywords:
    "מחשבון משכנתא, בדיקת זכאות למשכנתא, החזר חודשי משכנתא, יחס החזר, הון עצמי למשכנתא, אחוז מימון, LTV, משכנתא בישראל",
};

export const REFINANCE_SEO = {
  title: "בדיקת מחזור משכנתא | חיסכון חודשי ונקודת איזון",
  description:
    "בדיקה ראשונית למחזור משכנתא: הזינו יתרה, ריבית ותקופה וקבלו אומדן חיסכון חודשי, חיסכון ריבית, עלויות מחזור ונקודת איזון.",
  path: "/refinance-check",
  keywords:
    "מחזור משכנתא, בדיקת מחזור משכנתא, מחשבון מחזור משכנתא, חיסכון במשכנתא, נקודת איזון מחזור, ריביות משכנתא",
};

export function absoluteUrl(path = "/") {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function stringifyJsonLd(schema) {
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/"),
    areaServed: {
      "@type": "Country",
      name: "Israel",
    },
    inLanguage: "he-IL",
  };
}

export function financialServiceSchema({ url = SITE_URL, name = SITE_NAME, description }) {
  return {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    name,
    url,
    description,
    serviceType: ["Mortgage calculator", "Mortgage eligibility estimate", "Mortgage refinance estimate"],
    areaServed: {
      "@type": "Country",
      name: "Israel",
    },
    audience: {
      "@type": "Audience",
      audienceType: "Israeli mortgage borrowers",
    },
    inLanguage: "he-IL",
  };
}

export function faqSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => {
      const question = Array.isArray(item) ? item[0] : item.question;
      const answer = Array.isArray(item) ? item[1] : item.answer;
      return {
        "@type": "Question",
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text: answer,
        },
      };
    }),
  };
}

export function webPageSchema({ title, description, path }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: absoluteUrl(path),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
    inLanguage: "he-IL",
  };
}
