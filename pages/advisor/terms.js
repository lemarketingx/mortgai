import Head from "next/head";
import Link from "next/link";

export default function AdvisorTermsPage() {
  return (
    <>
      <Head>
        <title>תנאי שימוש ליועצים | FINZO PRO</title>
        <meta name="description" content="תנאי השימוש של FINZO PRO ליועצי משכנתאות — חובות, הגבלות ומדיניות לידים." />
        <meta name="robots" content="index, follow" />
      </Head>
      <div dir="rtl" className="min-h-screen bg-white">
        <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            <Link href="/" className="text-xl font-black text-violet-700">FINZO PRO</Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-bold text-slate-500">תנאי שימוש ליועצים</span>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <h1 className="text-3xl font-black text-slate-900 sm:text-4xl">תנאי שימוש — FINZO PRO</h1>
          <p className="mt-2 text-sm text-slate-500">עדכון אחרון: ינואר 2026 | מיועד ליועצי משכנתאות בלבד</p>

          <div className="mt-6 rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 text-sm font-bold text-amber-800">
            קריאת מסמך זה וקבלתו הינה תנאי הכרחי לשימוש בפלטפורמת FINZO PRO ולרכישת לידים.
          </div>

          <div className="mt-8 space-y-8 text-slate-700 leading-relaxed">

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">1. מהות הפלטפורמה</h2>
              <p>
                FINZO PRO היא פלטפורמה המחברת בין לקוחות פוטנציאליים ליועצי משכנתאות עצמאיים. החברה המפעילה (ל.א.ה שיווק) אינה מספקת ייעוץ פיננסי ואינה אחראית לתוצאות הייעוץ שמספקים היועצים.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">2. תנאי הלידים וגבולות תוקפם</h2>
              <p className="mb-3">
                ליד נחשב תקין אם הפרטים שנמסרו על ידי הלקוח תואמים לנתונים בפלטפורמה. FINZO אינה מתחייבת לכך שכל ליד יגיע לעסקה.
              </p>
              <p className="font-bold text-slate-900 mb-2">הדברים הבאים <span className="text-red-700">אינם</span> מהווים עילה להחזר, זיכוי או החלפת ליד:</p>
              <ul className="list-disc list-inside space-y-1 mr-4 text-slate-700">
                <li>הלקוח אינו עונה לשיחות או להודעות</li>
                <li>הלקוח שינה את דעתו או אינו מעוניין עוד בייעוץ</li>
                <li>הלקוח כבר קיבל ייעוץ ממשרד אחר</li>
                <li>הליד לא הסתיים בעסקה</li>
                <li>הלקוח לא עומד בתנאי זכאות</li>
                <li>מחירי שוק או ריביות השתנו לאחר רכישת הליד</li>
                <li>הלקוח בחר שלא להמשיך בתהליך</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">3. מדיניות דיווח על תקינות ליד</h2>
              <p className="mb-2">
                ניתן לדווח על בעיית תקינות בליד רק בגין הנסיבות הבאות:
              </p>
              <ul className="list-disc list-inside space-y-1 mr-4">
                <li>מספר טלפון שגוי לחלוטין (לא ניתן להתקשר בכלל)</li>
                <li>הלקוח טוען שלא השאיר פרטים ולא מכיר את השירות</li>
                <li>ליד כפול שנרכש בעבר על ידי אותו יועץ</li>
                <li>תקלה טכנית מהותית בפרטי הליד</li>
              </ul>
              <p className="mt-3 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">
                דיווח על תקינות ליד אינו מהווה התחייבות לזיכוי. FINZO תבחן כל פנייה לפי הנתונים הקיימים במערכת.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">4. הגבלות שימוש במידע</h2>
              <p className="mb-2">מידע הלקוחות המתקבל דרך FINZO PRO מיועד לשימוש <strong>לצורך ייעוץ משכנתאות בלבד</strong>. חל איסור מוחלט על:</p>
              <ul className="list-disc list-inside space-y-1 mr-4">
                <li>מכירת המידע לצד שלישי</li>
                <li>שימוש בפרטי לקוחות לצורכי שיווק שלא קשור לייעוץ משכנתאות</li>
                <li>העברת הפרטים ליועצים אחרים שאינם חלק מהפלטפורמה</li>
                <li>יצירת קשר עם לקוחות לאחר שנה ממועד רכישת הליד ללא הסכמה מחודשת</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">5. חובות היועץ</h2>
              <ul className="list-disc list-inside space-y-1 mr-4">
                <li>לפעול בהתאם לחוק הפיקוח על שירותים פיננסיים</li>
                <li>להחזיק ברישיון בר-תוקף לאורך כל תקופת הפעילות בפלטפורמה</li>
                <li>לעדכן את ל.א.ה שיווק בכל שינוי ברישיון, בכתובת או בפרטי ההתקשרות</li>
                <li>לא לעשות שימוש מטעה בשם FINZO או FINZO PRO בפרסום חיצוני</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">6. הפסקת שירות</h2>
              <p>
                ל.א.ה שיווק שומרת לעצמה את הזכות להשעות או לבטל חשבון יועץ בכל עת, ללא הודעה מוקדמת, במקרה של הפרת תנאים אלו.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">7. יצירת קשר</h2>
              <p>
                לשאלות:{" "}
                <a href="mailto:lemarketingx@gmail.com" className="text-violet-700 hover:underline">lemarketingx@gmail.com</a>
              </p>
            </section>
          </div>

          <div className="mt-12 border-t border-slate-200 pt-6 flex flex-wrap gap-4 text-sm">
            <Link href="/advisor/register" className="text-violet-700 hover:underline font-bold">← הרשמה כיועץ</Link>
            <Link href="/advisor/login" className="text-violet-700 hover:underline font-bold">כניסה לפורטל</Link>
            <Link href="/" className="text-slate-400 hover:underline font-bold">חזרה לעמוד הבית</Link>
          </div>
        </main>
      </div>
    </>
  );
}
