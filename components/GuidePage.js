import Link from "next/link";
import Head from "next/head";
import { absoluteUrl, breadcrumbSchema, canonicalUrl, faqSchema, stringifyJsonLd, webPageSchema } from "../lib/seo";
import { trackEvent } from "../lib/analytics";

export default function GuidePage({ guide, allGuides }) {
  function handleGuideCtaClick() {
    trackEvent("cta_click", { location: "guide" }, { source: "guide" });
  }
  const relatedGuides = guide.related
    .map((item) => {
      if (item.startsWith("/")) {
        return { path: item, h1: item === "/refinance-check" ? "בדיקת מחזור משכנתא" : item };
      }
      return allGuides.find((g) => g.slug === item);
    })
    .filter(Boolean);

  const disclaimer = "המידע בעמוד זה הוא מידע כללי בלבד ואינו מהווה אישור בנקאי, התחייבות למתן הלוואה או ייעוץ פיננסי אישי.";

  return (
    <>
      <Head>
        <title>{guide.title}</title>
        <meta name="description" content={guide.description} />
        <link rel="canonical" href={canonicalUrl(guide.path)} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={guide.title} />
        <meta property="og:description" content={guide.description} />
        <meta property="og:url" content={absoluteUrl(guide.path)} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: stringifyJsonLd(webPageSchema({ title: guide.title, description: guide.description, path: guide.path })) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: stringifyJsonLd(faqSchema(guide.faqs)) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: stringifyJsonLd(
              breadcrumbSchema([
                { name: "דף הבית", path: "/" },
                { name: "מדריכי משכנתא", path: "/guides" },
                { name: guide.h1, path: guide.path },
              ])
            ),
          }}
        />
      </Head>

      <main className="max-w-4xl mx-auto px-4 py-10 text-slate-800" dir="rtl">
        <nav className="text-sm mb-6">
          <Link href="/" className="text-blue-700 hover:underline">דף הבית</Link>
          <span> / </span>
          <Link href="/guides" className="text-blue-700 hover:underline">מדריכי משכנתא</Link>
        </nav>

        <h1 className="text-3xl font-bold mb-4">{guide.h1}</h1>
        <p className="text-lg leading-8 mb-8">{guide.intro}</p>

        {guide.sections.map((section) => (
          <section key={section.heading} className="mb-8">
            <h2 className="text-2xl font-semibold mb-3">{section.heading}</h2>
            <p className="leading-8">{section.text}</p>
          </section>
        ))}

        <section className="bg-blue-50 border border-blue-100 rounded-lg p-5 my-10">
          <h2 className="text-2xl font-semibold mb-2">בדיקת זכאות חינם</h2>
          <p className="mb-4">רוצים אומדן ראשוני לפי הנתונים שלכם? חזרו למחשבון המשכנתא הראשי ובצעו בדיקה תוך דקות.</p>
          <Link href="/#eligibility-check" onClick={handleGuideCtaClick} className="inline-block bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-800">בדיקת זכאות חינם</Link>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">שאלות נפוצות</h2>
          <div className="space-y-4">
            {guide.faqs.map(([question, answer]) => (
              <details key={question} className="border rounded-md p-4">
                <summary className="font-medium cursor-pointer">{question}</summary>
                <p className="mt-2 leading-7">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">מדריכים קשורים</h2>
          <ul className="list-disc pr-6 space-y-2">
            {relatedGuides.map((related) => (
              <li key={related.path}>
                <Link href={related.path} className="text-blue-700 hover:underline">{related.h1}</Link>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-sm text-slate-600 border-t pt-4">{disclaimer}</p>
      </main>
    </>
  );
}
