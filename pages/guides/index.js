import Head from "next/head";
import Link from "next/link";
import { guides } from "../../lib/guides";
import { canonicalUrl } from "../../lib/seo";

export default function GuidesIndexPage() {
  return (
    <>
      <Head>
        <title>מדריכי משכנתא | MortgAI</title>
        <meta name="description" content="מדריכי משכנתא קצרים וברורים: יחס החזר, הון עצמי, אישור עקרוני, מחזור משכנתא, הלוואת גישור ועוד." />
        <link rel="canonical" href={canonicalUrl("/guides")} />
      </Head>
      <main className="max-w-4xl mx-auto px-4 py-10" dir="rtl">
        <h1 className="text-3xl font-bold mb-4">מדריכי משכנתא</h1>
        <p className="mb-8 text-lg">ריכזנו מדריכים קצרים שיעזרו לכם להבין מושגים מרכזיים לפני קבלת החלטה.</p>
        <ul className="space-y-3">
          {guides.map((guide) => (
            <li key={guide.path} className="border rounded-md p-4 hover:bg-slate-50">
              <Link href={guide.path} className="text-blue-700 font-medium hover:underline">{guide.h1}</Link>
              <p className="text-sm mt-1 text-slate-700">{guide.description}</p>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
