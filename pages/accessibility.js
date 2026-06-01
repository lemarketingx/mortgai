import Head from "next/head";
import Link from "next/link";

export default function AccessibilityPage() {
  return (
    <>
      <Head>
        <title>הצהרת נגישות | FINZO</title>
        <meta name="description" content="הצהרת הנגישות של FINZO — מחויבות לנגישות דיגיטלית לכלל המשתמשים." />
        <meta name="robots" content="index, follow" />
      </Head>
      <div dir="rtl" className="min-h-screen bg-white">
        <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            <Link href="/" className="text-xl font-black text-violet-700">FINZO</Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-bold text-slate-500">הצהרת נגישות</span>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <h1 className="text-3xl font-black text-slate-900 sm:text-4xl">הצהרת נגישות</h1>
          <p className="mt-2 text-sm text-slate-500">עדכון אחרון: ינואר 2026</p>

          <div className="mt-8 space-y-8 text-slate-700 leading-relaxed">

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">מחויבות לנגישות</h2>
              <p>
                ל.א.ה שיווק, מפעילת שירות FINZO, מחויבת להנגשת השירות הדיגיטלי לכלל המשתמשים, לרבות אנשים עם מוגבלויות. אנו פועלים לעמוד בדרישות תקן ישראלי 5568 ובהנחיות WCAG 2.1 ברמה AA.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">מה כולל הסדר הנגישות</h2>
              <ul className="list-disc list-inside space-y-1 mr-4">
                <li>תמיכה בקוראי מסך (Screen Readers)</li>
                <li>ניווט מלא באמצעות מקלדת</li>
                <li>יחסי ניגודיות עומדים בדרישות תקן AA</li>
                <li>תגיות ARIA לרכיבים אינטראקטיביים</li>
                <li>טקסטים חלופיים לאלמנטים גרפיים</li>
                <li>עיצוב RTL מלא לתמיכה בשפה העברית</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">מגבלות ידועות</h2>
              <p>
                למרות מאמצינו, ייתכן שחלק מהרכיבים אינם עומדים בכל דרישות הנגישות. אנו עובדים באופן שוטף לשיפור הנגישות. אם נתקלתם בחסם נגישות, פנו אלינו ונטפל בכך בהקדם.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">דיווח על בעיית נגישות</h2>
              <p>
                לדיווח על בעיית נגישות או לקבלת עזרה, ניתן לפנות אלינו בדואר אלקטרוני:{" "}
                <a href="mailto:lemarketingx@gmail.com" className="text-violet-700 hover:underline">lemarketingx@gmail.com</a>
              </p>
              <p className="mt-2">
                נציג הנגישות שלנו יחזור אליכם בהקדם האפשרי.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">פניות לאחראי נגישות</h2>
              <p>
                אחראי הנגישות של ל.א.ה שיווק זמין לפניות בנושא נגישות בלבד דרך כתובת האימייל:{" "}
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
