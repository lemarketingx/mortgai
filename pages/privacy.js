import Head from "next/head";
import Link from "next/link";

const LAST_UPDATED = "1 ביוני 2025";
const CONTACT_EMAIL = "lemarketingx@gmail.com";

export default function Privacy() {
  return (
    <main dir="rtl" className="min-h-screen bg-white text-slate-950">
      <Head>
        <title>מדיניות פרטיות | FINZO</title>
        <meta name="description" content="מדיניות הפרטיות של FINZO — כיצד אנו אוספים, משתמשים ומגנים על המידע שלך." />
        <meta name="robots" content="index,follow" />
      </Head>

      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-black text-slate-950">FINZO</Link>
          <Link href="/" className="text-sm font-bold text-violet-700 hover:underline">חזרה לדף הבית ←</Link>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
        <header className="mb-12">
          <span className="inline-flex rounded-full bg-violet-50 px-4 py-2 text-sm font-black text-violet-700">מסמך משפטי</span>
          <h1 className="mt-5 text-4xl font-black leading-tight text-slate-950">מדיניות פרטיות</h1>
          <p className="mt-3 text-slate-500 font-semibold">עודכן לאחרונה: {LAST_UPDATED}</p>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            מדיניות זו מתארת כיצד FINZO אוספת, משתמשת ומגנה על המידע האישי שלך. אנא קרא/י אותה בעיון לפני השימוש בשירות.
          </p>
        </header>

        <div className="space-y-10 leading-8 text-slate-700">
          <Section title="1. מי אנחנו">
            <p>
              FINZO היא פלטפורמה דיגיטלית לבדיקת התאמה ראשונית למשכנתא ולחיבור בין לקוחות לבין יועצי משכנתאות עצמאיים מורשים.
              FINZO אינה בנק, אינה גוף אשראי ואינה מתחייבת לאישור משכנתא כלשהו. כל תוצאה המוצגת באתר היא אומדן ראשוני בלבד.
            </p>
          </Section>

          <Section title="2. איזה מידע נאסף">
            <p className="font-black text-slate-800">א. מידע ליצירת קשר</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>שם מלא</li>
              <li>מספר טלפון</li>
              <li>עיר מגורים</li>
              <li>מועד נוח לחזרה</li>
            </ul>

            <p className="mt-4 font-black text-slate-800">ב. נתוני משכנתא</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>סכום משכנתא מבוקש</li>
              <li>מחיר הנכס</li>
              <li>הון עצמי</li>
              <li>סוג העסקה (רכישה, מחזור, השקעה וכדומה)</li>
              <li>עיר הנכס</li>
            </ul>

            <p className="mt-4 font-black text-slate-800">ג. נתוני הכנסה והתחייבויות</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>הכנסה חודשית נטו</li>
              <li>סך החזרי הלוואות קיימות</li>
              <li>הוצאות חודשיות קבועות</li>
              <li>קיום משכנתא קיימת</li>
            </ul>

            <p className="mt-4 font-black text-slate-800">ד. נתוני שימוש טכניים</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>כתובת IP</li>
              <li>סוג דפדפן ומכשיר</li>
              <li>עמודים שנצפו ודפוסי ניווט</li>
              <li>פרמטרי UTM ומקור הגעה (אם רלוונטי)</li>
            </ul>
          </Section>

          <Section title="3. כיצד המידע נאסף">
            <p>המידע נאסף ישירות ממך כאשר אתה/את:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>ממלא/ת טופס בקשה לבדיקת התאמה</li>
              <li>משתמש/ת במחשבון המשכנתא</li>
              <li>פונה דרך טופס יצירת הקשר</li>
              <li>מאשר/ת העברת פרטים ליועץ</li>
            </ul>
            <p className="mt-3">חלק מנתוני השימוש נאספים אוטומטית באמצעות קבצי cookie וטכנולוגיות דומות.</p>
          </Section>

          <Section title="4. שימוש במידע">
            <p>המידע שנאסף משמש אך ורק למטרות הבאות:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>הצגת אומדן ראשוני לזכאות ולהחזר משכנתא</li>
              <li>העברת פרטייך ליועץ משכנתאות מורשה לצורך חזרה טלפונית</li>
              <li>שיפור איכות השירות וחוויית המשתמש</li>
              <li>תמיכה טכנית ומניעת תקלות</li>
              <li>ניתוח סטטיסטי מצטבר ואנונימי</li>
            </ul>
            <p className="mt-3 font-black text-slate-800">לא נשתמש במידע שלך לצרכי שיווק ישיר ללא הסכמה מפורשת נוספת.</p>
          </Section>

          <Section title="5. העברת מידע ליועצי משכנתאות">
            <p>
              כאשר אתה/את מאשר/ת שליחת טופס בדיקת התאמה, הפרטים שלך עשויים להיות מועברים ליועץ משכנתאות עצמאי מורשה שפועל דרך מערכת FINZO.
            </p>
            <p className="mt-3">
              יועצים אלה מחויבים לשמור על סודיות המידע, להשתמש בו אך ורק לצורך מתן שירות ייעוץ, ולא להעביר אותו לצד שלישי.
            </p>
            <p className="mt-3">
              FINZO אינה מוכרת, משכירה או מעבירה מידע אישי לגורמים מסחריים שלישיים שאינם קשורים למתן השירות.
            </p>
            <p className="mt-3 font-black text-slate-800">
              חשוב: יועצים שמקבלים את פרטייך פועלים באופן עצמאי ואחריותם האישית על הטיפול במידע היא שלהם בלבד.
            </p>
          </Section>

          <Section title="6. אבטחת מידע">
            <p>אנו נוקטים באמצעי אבטחה טכניים וארגוניים סבירים להגנה על המידע:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>תקשורת מוצפנת באמצעות HTTPS/TLS</li>
              <li>אחסון נתונים בשרתי ענן מאובטחים</li>
              <li>גישה מוגבלת למידע לאנשי צוות מורשים בלבד</li>
              <li>הרשאות גישה מבוססות תפקיד</li>
            </ul>
            <p className="mt-3">
              למרות האמצעים הנ"ל, אין ביכולתנו להבטיח אבטחה מוחלטת של המידע המועבר דרך האינטרנט.
            </p>
          </Section>

          <Section title="7. שמירת מידע">
            <p>
              המידע האישי שלך נשמר לתקופה הנדרשת למתן השירות ולא יותר מ-24 חודשים ממועד קבלתו, אלא אם כן נדרש שמירה ממושכת יותר לפי דין.
            </p>
            <p className="mt-3">
              נתונים סטטיסטיים מצטברים ואנונימיים עשויים להישמר לתקופה ארוכה יותר.
            </p>
          </Section>

          <Section title="8. זכויותיך">
            <p>בהתאם לחוק הגנת הפרטיות (תשמ"א–1981) ותיקוניו, יש לך הזכות:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>לבקש עיון במידע האישי שמוחזק עליך</li>
              <li>לבקש תיקון מידע שגוי</li>
              <li>לבקש מחיקת המידע שלך ממאגרינו</li>
              <li>להתנגד לעיבוד מידע לצורכי שיווק</li>
            </ul>
            <p className="mt-3">
              לבקשות עיון, תיקון או מחיקה אנא פנה/י אלינו בכתב לכתובת:
            </p>
            <p className="mt-2 font-black text-violet-700">{CONTACT_EMAIL}</p>
            <p className="mt-2">נשוב אליך בתוך 30 ימי עסקים.</p>
          </Section>

          <Section title="9. קבצי Cookie">
            <p>
              האתר משתמש בקבצי cookie לצורך תפעול שוטף, שיפור חוויית המשתמש וניתוח סטטיסטי של השימוש.
              שימוש נמשך באתר מהווה הסכמה לשימוש זה. ניתן לנהל הגדרות cookie בדפדפן שלך.
            </p>
          </Section>

          <Section title="10. שינויים במדיניות">
            <p>
              FINZO שומרת לעצמה את הזכות לעדכן מדיניות פרטיות זו מעת לעת. שינויים מהותיים יפורסמו בעמוד זה.
              המשך השימוש בשירות לאחר פרסום שינויים מהווה הסכמה לתנאים המעודכנים.
            </p>
          </Section>

          <Section title="11. יצירת קשר">
            <p>לשאלות, בקשות או פניות בנושא פרטיות:</p>
            <div className="mt-3 rounded-[20px] border border-slate-200 bg-slate-50 px-6 py-5 space-y-1">
              <p className="font-black text-slate-900">FINZO</p>
              <p>דוא"ל: <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-700 hover:underline font-bold">{CONTACT_EMAIL}</a></p>
              <p>לחלופין ניתן לפנות דרך <Link href="/contact" className="text-violet-700 hover:underline font-bold">טופס יצירת הקשר</Link></p>
            </div>
          </Section>
        </div>

        <div className="mt-12 rounded-[20px] border border-slate-200 bg-slate-50 px-6 py-4 text-sm font-semibold text-slate-500">
          מסמך זה אינו מהווה ייעוץ משפטי. לשאלות משפטיות מורכבות מומלץ להתייעץ עם עורך/ת דין.
        </div>
      </article>

      <ComplianceFooter />
    </main>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-black text-slate-950">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function ComplianceFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-slate-500">
          <Link href="/" className="hover:text-violet-700">FINZO</Link>
          <Link href="/privacy" className="hover:text-violet-700">מדיניות פרטיות</Link>
          <Link href="/terms" className="hover:text-violet-700">תנאי שימוש</Link>
          <Link href="/accessibility" className="hover:text-violet-700">הצהרת נגישות</Link>
          <Link href="/contact" className="hover:text-violet-700">יצירת קשר</Link>
        </div>
      </div>
    </footer>
  );
}
