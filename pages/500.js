import Head from "next/head";
import Link from "next/link";
import BrandLogo from "../components/BrandLogo";

export default function ServerErrorPage() {
  return (
    <>
      <Head>
        <title>שגיאת שרת | FINZO</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div dir="rtl" className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
        <Link href="/" className="mb-8 inline-flex items-center"><BrandLogo size="sm" withTagline={false} /></Link>
        <span className="text-sm font-black text-danger-700">שגיאה 500</span>
        <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">משהו השתבש מהצד שלנו</h1>
        <p className="mt-3 max-w-md text-slate-500">
          אירעה שגיאה זמנית בשרת. נסו לרענן את הדף, ואם הבעיה חוזרת אפשר לפנות אלינו.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className="rounded-full bg-brand-700 px-7 py-3 text-sm font-black text-white transition hover:bg-brand-800">
            חזרה לעמוד הבית
          </Link>
          <Link href="/contact" className="rounded-full border border-slate-200 bg-white px-7 py-3 text-sm font-black text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700">
            צור קשר
          </Link>
        </div>
      </div>
    </>
  );
}
