import Head from "next/head";
import Script from "next/script";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { Analytics } from "@vercel/analytics/next";
import ErrorBoundary from "../components/ErrorBoundary";
import BetaBanner from "../components/BetaBanner";
import "../styles/globals.css";

const THEME_KEY = "finzo_theme_mode";
const ThemeContext = createContext({ dark: false, toggle: () => {} });
export function useTheme() { return useContext(ThemeContext); }

function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === "dark") {
        setDark(true);
        document.documentElement.classList.add("dark");
      }
    } catch {}
  }, []);

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

const PRIVATE_PREFIXES = ["/advisor", "/admin", "/client"];

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

  return (
    <ErrorBoundary>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#2C5BFF" />
        <meta name="format-detection" content="telephone=no" />
        <meta httpEquiv="content-language" content="he-IL" />
        <meta property="og:locale" content="he_IL" />
        {process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? (
          <meta name="google-site-verification" content={process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION} />
        ) : null}
        {/* FINZO Design System fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;500;700;900&family=Heebo:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <Script id="mortgai-datalayer-init" strategy="beforeInteractive">
        {`window.dataLayer = window.dataLayer || [];`}
      </Script>

      {GTM_ID ? (
        <>
          <Script id="mortgai-gtm" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtag/js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
          </Script>
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
      <Analytics />
    </ErrorBoundary>
  );
}
