import Head from "next/head";
import ErrorBoundary from "../components/ErrorBoundary";
import "../styles/globals.css";

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
      </Head>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}
