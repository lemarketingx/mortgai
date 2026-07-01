import Head from "next/head";
import Link from "next/link";
import BrandLogo from "../components/BrandLogo";

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>תנאי שימוש | FINZO</title>
        <meta name="description" content="תנאי השימוש של FINZO — קראו לפני השימוש בשירות." />
        <meta name="robots" content="index, follow" />
      </Head>
      <div dir="rtl" className="min-h-screen bg-white">
        <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            <Link href="/"><BrandLogo variant="public" mode="light" size="sm" /></Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-bold text-slate-500">תנאי שימוש</span>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <h1 className="text-3xl font-black text-slate-900 sm:text-4xl">תנאי שימוש</h1>
          <p className="mt-2 text-sm text-slate-500">עדכון אחרון: ינואר 2026</p>

          <div className="mt-8 space-y-8 text-slate-700 leading-relaxed">

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">1. כללי</h2>
              <p>
                ברוכים הבאים ל-FINZO, שירות דיגיטלי המופעל על ידי <strong>ל.א.ה דיגיטל</strong>. השימוש באתר מהווה הסכמה לתנאים המפורטים להלן. אם אינכם מסכימים לתנאים, אנא הפסיקו את השימוש בשירות.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">2. מהות השירות</h2>
              <p>
                FINZO הוא כלי לאומדן ראשוני של התאמה למשכנתא. המידע המוצג באתר <strong>אינו ייעוץ פיננסי, ייעוץ משכנתאות, אישור בנקאי או התחייבות לקבלת מימון.</strong> האתר אינו בנק, אינו גוף מוסדי ואינו מוסמך להעניק אישורים פיננסיים כלשהם.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">3. אומדנים וחישובים</h2>
              <p>
                כל חישוב, הערכה או תוצאה המוצגת באתר היא אומדן ראשוני בלבד, המבוסס על הנתונים שהזנתם. תוצאות אלו אינן מחייבות ואינן מהוות הצעה, התחייבות, ייעוץ או אינדיקציה לאישור עתידי מצד בנק או גוף מממן.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">4. עצמאות היועצים</h2>
              <p>
                יועצי המשכנתאות הפועלים דרך פלטפורמת FINZO PRO הם עצמאיים ואינם עובדי ל.א.ה דיגיטל. החברה אינה אחראית לייעוץ, לשירות, לתוצאות או לטיב הפעילות של יועצים אלה. כל הסכם בין לקוח ויועץ הוא בין הצדדים ישירות.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">5. הגבלת אחריות</h2>
              <p>
                ל.א.ה דיגיטל לא תישא באחריות לכל נזק ישיר, עקיף, מיוחד או תוצאתי הנובע משימוש בשירות, לרבות החלטות פיננסיות שהתקבלו בהסתמך על מידע מהאתר.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">6. קניין רוחני</h2>
              <p>
                כל התכנים, העיצובים, הלוגואים והפיתוחים באתר FINZO הם קניינה של ל.א.ה דיגיטל. אין להעתיק, לשכפל, להפיץ או לעשות שימוש מסחרי בתכנים ללא אישור מפורש בכתב.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">7. שינויים בתנאים</h2>
              <p>
                החברה רשאית לשנות את תנאי השימוש בכל עת. שינויים יפורסמו בעמוד זה. המשך השימוש לאחר פרסום השינויים מהווה הסכמה אליהם.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">8. דין וסמכות שיפוט</h2>
              <p>
                תנאי שימוש אלה כפופים לדיני מדינת ישראל. סמכות השיפוט הבלעדית לכל סכסוך נתונה לבתי המשפט המוסמכים בישראל.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">9. יצירת קשר</h2>
              <p>
                לשאלות בנוגע לתנאי השימוש:{" "}
                <a href="mailto:lemarketingx@gmail.com" className="text-violet-700 hover:underline">lemarketingx@gmail.com</a>
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
