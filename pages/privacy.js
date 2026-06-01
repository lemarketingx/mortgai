import Head from "next/head";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>מדיניות פרטיות | FINZO</title>
        <meta name="description" content="מדיניות הפרטיות של FINZO — כיצד אנו אוספים, משתמשים ומגנים על המידע שלכם." />
        <meta name="robots" content="index, follow" />
      </Head>
      <div dir="rtl" className="min-h-screen bg-white">
        <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            <Link href="/" className="text-xl font-black text-violet-700">FINZO</Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-bold text-slate-500">מדיניות פרטיות</span>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <h1 className="text-3xl font-black text-slate-900 sm:text-4xl">מדיניות פרטיות</h1>
          <p className="mt-2 text-sm text-slate-500">עדכון אחרון: ינואר 2026</p>

          <div className="mt-8 space-y-8 text-slate-700 leading-relaxed">

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">1. מי אנחנו</h2>
              <p>
                FINZO הוא שירות דיגיטלי המופעל על ידי <strong>ל.א.ה שיווק</strong> (להלן: "החברה", "אנחנו").
                ניתן ליצור איתנו קשר בכתובת:{" "}
                <a href="mailto:lemarketingx@gmail.com" className="text-violet-700 hover:underline">lemarketingx@gmail.com</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">2. איזה מידע אנחנו אוספים</h2>
              <p className="mb-2">אנו אוספים מידע שנמסר מרצון בעת מילוי טפסים באתר, לרבות:</p>
              <ul className="list-disc list-inside space-y-1 mr-4">
                <li>שם מלא ומספר טלפון</li>
                <li>עיר מגורים ועיר הנכס</li>
                <li>פרטים פיננסיים כגון: הכנסה חודשית, שווי נכס, הון עצמי, גובה משכנתא מבוקשת</li>
                <li>סטטוס רכישה (דירה ראשונה, שדרוג, מחזור, וכו')</li>
                <li>שדות נוספים הקשורים לבקשת ייעוץ משכנתא</li>
              </ul>
              <p className="mt-2">
                בנוסף, אנו אוספים אוטומטית נתוני שימוש כגון: דפדפן, גרסת מערכת הפעלה, כתובת IP, ועמודים שביקרתם.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">3. כיצד אנחנו משתמשים במידע</h2>
              <ul className="list-disc list-inside space-y-1 mr-4">
                <li>לצורך אומדן ראשוני של התאמה למשכנתא</li>
                <li>להעברת הליד ליועץ משכנתאות או נותן שירות רלוונטי הרשום בפלטפורמה שיצור איתכם קשר</li>
                <li>לשיפור השירות ויכולות ה-matching</li>
                <li>לצורכי אנליטיקה פנימית ושיפור חוויית המשתמש</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">4. שיתוף מידע עם צדדים שלישיים</h2>
              <p>
                המידע שמסרתם עשוי להיות מועבר ליועץ משכנתאות או נותן שירות רלוונטי הרשום בפלטפורמה.
                גורמים אלו פועלים באופן עצמאי ואינם עובדי החברה. אין אנו מוכרים את המידע שלכם לגורמים שלישיים למטרות שיווק.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">5. שמירת המידע</h2>
              <p>
                המידע נשמר בשרתים מאובטחים. אנו שומרים את המידע למשך תקופה סבירה הנדרשת לצורכי השירות, ולא יותר ממה שנדרש על פי דין.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">6. מחיקת מידע</h2>
              <p>
                ניתן לפנות אלינו בבקשה למחיקת המידע שלכם בכתובת{" "}
                <a href="mailto:lemarketingx@gmail.com" className="text-violet-700 hover:underline">lemarketingx@gmail.com</a>.
                נטפל בבקשה בהקדם ובהתאם להוראות הדין.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">7. שיווק ישיר</h2>
              <p>
                בעצם מסירת פרטיכם אתם מסכימים לקבל יצירת קשר מחברת ל.א.ה שיווק ו/או מיועצים מורשים לצורך מתן שירות.
                ניתן לבקש הפסקת פנייה שיווקית בכל עת באמצעות פנייה ל-{" "}
                <a href="mailto:lemarketingx@gmail.com" className="text-violet-700 hover:underline">lemarketingx@gmail.com</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">8. עוגיות (Cookies)</h2>
              <p>
                האתר עשוי להשתמש בעוגיות לצורך שיפור חוויית המשתמש ואנליטיקה.
                ראו את <Link href="/cookies" className="text-violet-700 hover:underline">מדיניות העוגיות</Link> לפרטים נוספים.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">9. אבטחת מידע</h2>
              <p>
                אנו נוקטים באמצעי אבטחה סבירים להגנה על המידע שלכם. עם זאת, אין אנו יכולים להבטיח אבטחה מוחלטת של מידע המועבר דרך האינטרנט.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">10. יצירת קשר</h2>
              <p>
                לכל שאלה בנושא פרטיות, פנו אלינו:{" "}
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
