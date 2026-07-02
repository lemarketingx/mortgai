import Head from "next/head";
import Link from "next/link";
import { guides } from "../../lib/guides";
import { breadcrumbSchema, canonicalUrl, stringifyJsonLd } from "../../lib/seo";
import BrandLogo from "../../components/BrandLogo";

export default function GuidesIndexPage() {
  return (
    <>
      <Head>
        <title>מדריכי משכנתא | Finzo</title>
        <meta name="description" content="מדריכי משכנתא קצרים וברורים: יחס החזר, הון עצמי, אישור עקרוני, מחזור משכנתא, הלוואת גישור ועוד." />
        <link rel="canonical" href={canonicalUrl("/guides")} />
              <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: stringifyJsonLd(
              breadcrumbSchema([
                { name: "דף הבית", path: "/" },
                { name: "מדריכי משכנתא", path: "/guides" },
              ])
            ),
          }}
        />
      </Head>
      <div dir="rtl" className="min-h-screen bg-white">
        <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            <Link href="/" className="inline-flex items-center"><BrandLogo size="sm" withTagline={false} /></Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-bold text-slate-500">מדריכי משכנתא</span>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4">מדריכי משכנתא</h1>
        <p className="mb-8 text-lg">ריכזנו מדריכים קצרים שיעזרו לכם להבין מושגים מרכזיים לפני קבלת החלטה.</p>
        <ul className="space-y-3">
          {guides.map((guide) => (
            <li key={guide.path} className="border rounded-md p-4 hover:bg-slate-50">
              <Link href={guide.path} className="text-brand-700 font-medium hover:underline">{guide.h1}</Link>
              <p className="text-sm mt-1 text-slate-700">{guide.description}</p>
            </li>
          ))}
        </ul>
        </main>
      </div>
    </>
  );
}
