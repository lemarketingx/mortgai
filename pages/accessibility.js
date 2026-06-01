import Head from "next/head";
import Link from "next/link";

export default function AccessibilityPage() {
  return (
    <>
      <Head>
        <title>נגישות | FINZO</title>
        <meta name="description" content="מחויבות FINZO לנגישות דיגיטלית — אנו פועלים לשיפור הנגישות באופן שוטף." />
        <meta name="robots" content="index, follow" />
      </Head>
      <div dir="rtl" className="min-h-screen bg-white">
        <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            <Link href="/" className="text-xl font-black text-violet-700">FINZO</Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-bold text-slate-500">נגישות</span>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <h1 className="text-3xl font-black text-slate-900 sm:text-4xl">נגישות</h1>
          <p className="mt-2 text-sm text-slate-500">עדכון אחרון: ינואר 2026</p>

          <div className="mt-8 space-y-8 text-slate-700 leading-relaxed">

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">המחויבות שלנו לנגישות</h2>
              <p>
                ל.א.ה שיווק, מפעילת שירות FINZO, מאמינה שכל אדם זכאי לגישה נוחה לשירותים דיגיטליים.
                אנו עושים מאמצים סבירים להנגיש את האתר למגוון משתמשים, ופועלים לשיפור הנגישות באופן שוטף.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">גישת הפיתוח</h2>
              <p>
                האתר נבנה תוך התחשבות בעקרונות נגישות מקובלים, כגון שימוש בתגיות HTML סמנטיות, ניגודיות טקסט,
                ותמיכה בכיוון RTL לעברית. ייתכן שחלקים מסוימים עדיין דורשים שיפור, ואנחנו עובדים על כך.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">מגבלות ידועות</h2>
              <p>
                לא ביצענו ביקורת נגישות פורמלית מלאה. ייתכן שחלק מהרכיבים אינם נגישים במלואם לכלל המשתמשים.
                אנו מזמינים אתכם לדווח לנו על כל חסם שנתקלתם בו, ונפעל לטפל בו בהקדם.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">דיווח על בעיית נגישות</h2>
              <p>
                אם נתקלתם בבעיה כלשהי בגישה לתכנים באתר, נשמח לקבל פנייה לכתובת:{" "}
                <a href="mailto:lemarketingx@gmail.com" className="text-violet-700 hover:underline">lemarketingx@gmail.com</a>
              </p>
              <p className="mt-2">
                נחזור אליכם בהקדם ונעשה כמיטב יכולתנו לסייע.
              </p>
            </section>

          </div>

          <div className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-400">
            <Link href="/" className="text-violet-700 hover:underline font-bold">← חזרה לעמוד הבית</Link>
          </div>
        </main>
      </div>
    </>
  );
}
