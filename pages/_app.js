import Head from "next/head";
import Script from "next/script";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { Analytics } from "@vercel/analytics/next";
import ErrorBoundary from "../components/ErrorBoundary";
import BetaBanner from "../components/BetaBanner";
import WhatsAppButton from "../components/WhatsAppButton";
import "../styles/globals.css";

const THEME_KEY = "finzo_theme_mode";
const ThemeContext = createContext({ dark: false, toggle: () => {} });
export function useTheme() { return useContext(ThemeContext); }

function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(THEME_KEY) === "dark";
    } catch { return false; }
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      try { localStorage.setItem(THEME_KEY, next ? "dark" : "light"); } catch {}
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

const PRIVATE_PREFIXES = ["/advisor", "/admin", "/client"];

function pathWithoutQuery(url = "") {
  return String(url).split("?")[0].split("#")[0] || "/";
}

function isPrivatePath(url = "") {
  const path = pathWithoutQuery(url);
  return PRIVATE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function captureSafePostHogPageview(url = "") {
  if (typeof window === "undefined" || !window.posthog) return;
  const path = pathWithoutQuery(url || window.location.pathname || "/");
  if (isPrivatePath(path)) return;

  window.posthog.capture("$pageview", {
    path,
    source: "next_router",
  });
}

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const showBanner = !PRIVATE_PREFIXES.some((prefix) =>
    router.pathname.startsWith(prefix)
  );

  // GA4 page-view tracking on route changes
  useEffect(() => {
    if (!GA_ID) return;
    function handleRouteChange(url) {
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("config", GA_ID, { page_path: url });
      }
    }
    router.events.on("routeChangeComplete", handleRouteChange);
    return () => router.events.off("routeChangeComplete", handleRouteChange);
  }, [router.events]);

  // Privacy-safe PostHog page views. Query strings are intentionally removed.
  useEffect(() => {
    if (!POSTHOG_KEY) return undefined;

    captureSafePostHogPageview(router.asPath || "/");
    function handleRouteChange(url) {
      captureSafePostHogPageview(url);
    }

    router.events.on("routeChangeComplete", handleRouteChange);
    return () => router.events.off("routeChangeComplete", handleRouteChange);
  }, [router.asPath, router.events]);

  return (
    <ErrorBoundary>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#7B3DFF" />
        <meta name="format-detection" content="telephone=no" />
        <meta httpEquiv="content-language" content="he-IL" />
        <meta property="og:locale" content="he_IL" />
        <link rel="icon" type="image/png" href="/brand/finzo/finzo-app-icon.png" key="favicon" />
        {process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? (
          <meta name="google-site-verification" content={process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION} />
        ) : null}
      </Head>

      <Script id="finzo-dark-mode-init" strategy="beforeInteractive">
        {`try{if(localStorage.getItem("finzo_theme_mode")==="dark")document.documentElement.classList.add("dark")}catch(e){}`}
      </Script>
      <Script id="mortgai-datalayer-init" strategy="beforeInteractive">
        {`window.dataLayer = window.dataLayer || [];`}
      </Script>

      {POSTHOG_KEY ? (
        <Script id="finzo-posthog-init" strategy="afterInteractive">
          {`
!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once set_config unregister identify alias setPersonProperties group reset onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onCapture".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])}}(document,window.posthog||[]);
posthog.init(${JSON.stringify(POSTHOG_KEY)}, {
  api_host: ${JSON.stringify(POSTHOG_HOST)},
  capture_pageview: false,
  capture_pageleave: false,
  autocapture: false,
  person_profiles: "identified_only",
  mask_all_text: true,
  mask_all_element_attributes: true,
  sanitize_properties: function(properties) {
    var blocked = ["name","fullName","phone","email","idNumber","tz","teudatZehut","address","city","notes","income","monthlyIncome","propertyPrice","equityAmount","debtLevel","mortgageAmount","obligations","existingPropertyValue","existingMortgageBalance"];
    if (!properties) return properties;
    blocked.forEach(function(key) {
      if (Object.prototype.hasOwnProperty.call(properties, key)) delete properties[key];
    });
    return properties;
  },
  loaded: function(posthog) {
    posthog.capture("finzo_posthog_ready", { source: "app_init" });
  }
});
          `}
        </Script>
      ) : null}

      {GTM_ID ? (
        <>
          <Script id="mortgai-gtm" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
          </Script>
          <noscript>
            <iframe src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`} height="0" width="0" style={{display:'none',visibility:'hidden'}} />
          </noscript>
        </>
      ) : null}

      {GA_ID ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}');`}
          </Script>
        </>
      ) : null}

      {showBanner && <BetaBanner />}
      <ThemeProvider>
        <Component {...pageProps} />
      </ThemeProvider>
      {showBanner && <WhatsAppButton />}
      <Analytics />
    </ErrorBoundary>
  );
}
