import Head from "next/head";
import Script from "next/script";
import ErrorBoundary from "../components/ErrorBoundary";
import "../styles/globals.css";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export default function App({ Component, pageProps }) {
  return (
    <ErrorBoundary>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#6d28d9" />
        <meta name="format-detection" content="telephone=no" />
        <meta httpEquiv="content-language" content="he-IL" />
        <meta property="og:locale" content="he_IL" />
        {process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? (
          <meta name="google-site-verification" content={process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION} />
        ) : null}
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
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
          </Script>
        </>
      ) : null}

      <Component {...pageProps} />
    </ErrorBoundary>
  );
}
