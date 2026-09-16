import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="he" dir="rtl">
      <Head>
        {/* FINZO Design System fonts — belongs in _document, not next/head in _app,
            so the stylesheet is emitted once per request instead of on every route change.
            Every Google Fonts family the site uses (including Assistant/Manrope, formerly
            loaded via a separate CSS @import in globals.css) is combined into this single
            request so the browser's preload scanner can discover and fetch it immediately,
            instead of waiting to parse globals.css first. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;500;700;900&family=Heebo:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&family=Assistant:wght@400;600;700;800;900&family=Manrope:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
