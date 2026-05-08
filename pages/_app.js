import Head from "next/head";
import ErrorBoundary from "../components/ErrorBoundary";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <ErrorBoundary>
      <Head>
        <meta name="theme-color" content="#6d28d9" />
        <meta name="format-detection" content="telephone=no" />
        <meta property="og:locale" content="he_IL" />
        <meta name="robots" content="index, follow" />
      </Head>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}
