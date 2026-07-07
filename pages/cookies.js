import Head from "next/head";
import Link from "next/link";
import BrandLogo from "../components/BrandLogo";

export default function CookiesPage() {
  return (
    <>
      <Head>
        <title>מדיניות עוגיות | FINZO</title>
        <meta name="description" content="מדיניות העוגיות של FINZO — מה אנחנו אוספים ואיך ניתן לשלוט בעוגיות." />
        <meta name="robots" content="index, follow" />
      </Head>
      <div dir="rtl" className="min-h-screen bg-white">
        <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            <Link href="/" className="inline-flex items-center"><BrandLogo size="sm" withTagline={false} /></Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-bold text-slate-500">מדיניות עוגיות</span>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <h1 className="text-3xl font-black text-slate-900 sm:text-4xl">מדיניות עוגיות</h1>
          <p className="mt-2 text-sm text-slate-500">עדכון אחרון: ינואר 2026</p>

          <div className="mt-8 space-y-8 text-slate-700 leading-relaxed">

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">מה הן עוגיות?</h2>
              <p>
                עוגיות (Cookies) הן קבצי טקסט קטנים הנשמרים במחשב או במכשיר הנייד שלכם בעת ביקור באתר. הן מאפשרות לאתר לזכור מידע על הביקור שלכם ולשפר את חוויית השימוש.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">אילו עוגיות אנחנו משתמשים?</h2>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-black text-slate-900 mb-1">עוגיות הכרחיות</p>
                  <p className="text-sm">נדרשות לפעילות בסיסית של האתר — כגון שמירת סשן הפעלה וזיהוי. לא ניתן לבטלן.</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-black text-slate-900 mb-1">עוגיות אנליטיקה</p>
                  <p className="text-sm">מאפשרות לנו לאסוף נתונים אנונימיים על שימוש באתר, כגון: עמודים שביקרתם, זמן שהייה, ומקור ההגעה. הנתונים משמשים לשיפור השירות בלבד.</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-black text-slate-900 mb-1">עוגיות שיווקיות</p>
                  <p className="text-sm">עשויות לשמש לצורך מדידת אפקטיביות קמפיינים דיגיטליים. הנתונים אינם מועברים לצד שלישי לצורך שיווק שאינו קשור לשירות FINZO.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">כיצד לשלוט בעוגיות</h2>
              <p className="mb-3">
                ניתן לנהל ולמחוק עוגיות דרך הגדרות הדפדפן שלכם. ייתכן שחסימת עוגיות תפגע בחלק מתפקודי האתר.
              </p>
              <ul className="list-disc list-inside space-y-1 mr-4 text-sm">
                <li><strong>Chrome:</strong> הגדרות ← פרטיות ואבטחה ← עוגיות</li>
                <li><strong>Firefox:</strong> הגדרות ← פרטיות ואבטחה</li>
                <li><strong>Safari:</strong> העדפות ← פרטיות</li>
                <li><strong>Edge:</strong> הגדרות ← עוגיות והרשאות אתר</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">פרטיות ועוגיות</h2>
              <p>
                לפרטים על אופן השימוש במידע שנאסף, ראו את{" "}
                <Link href="/privacy" className="text-brand-700 hover:underline">מדיניות הפרטיות</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">יצירת קשר</h2>
              <p>
                לשאלות בנוגע לעוגיות:{" "}
                <a href="mailto:support@finzo.co.il" className="text-brand-700 hover:underline">support@finzo.co.il</a>
              </p>
            </section>
          </div>

          <div className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-400">
            <Link href="/" className="text-brand-700 hover:underline font-bold">← חזרה לעמוד הבית</Link>
          </div>
        </main>
      </div>
    </>
  );
}
