import Head from "next/head";
import Link from "next/link";
import BrandLogo from "../components/BrandLogo";

export default function NotFoundPage() {
  return (
    <>
      <Head>
        <title>הדף לא נמצא | FINZO</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div dir="rtl" className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
        <Link href="/" className="mb-8 inline-flex items-center"><BrandLogo size="sm" withTagline={false} /></Link>
        <span className="text-sm font-black text-brand-700">שגיאה 404</span>
        <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">הדף שחיפשתם לא נמצא</h1>
        <p className="mt-3 max-w-md text-slate-500">
          ייתכן שהקישור שגוי או שהדף הוסר. אפשר לחזור לעמוד הבית או לבדוק את בדיקת הזכאות למשכנתא.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className="rounded-full bg-brand-700 px-7 py-3 text-sm font-black text-white transition hover:bg-brand-800">
            חזרה לעמוד הבית
          </Link>
          <Link href="/refinance-check" className="rounded-full border border-slate-200 bg-white px-7 py-3 text-sm font-black text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700">
            בדיקת מחזור משכנתא
          </Link>
        </div>
      </div>
    </>
  );
}
