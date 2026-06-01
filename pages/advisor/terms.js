import Head from "next/head";
import Link from "next/link";

const LAST_UPDATED = "1 ביוני 2025";
const CONTACT_EMAIL = "lemarketingx@gmail.com";

export default function AdvisorTerms() {
  return (
    <main dir="rtl" className="min-h-screen bg-white text-slate-950">
      <Head>
        <title>תנאי שימוש ליועצים | FINZO</title>
        <meta name="description" content="תנאי השימוש של יועצי משכנתאות בפלטפורמת FINZO." />
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-black text-slate-950">FINZO</Link>
          <Link href="/advisor/login" className="text-sm font-bold text-violet-700 hover:underline">כניסה לפורטל ←</Link>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
        <header className="mb-12">
          <span className="inline-flex rounded-full bg-violet-50 px-4 py-2 text-sm font-black text-violet-700">ליועצי משכנתאות</span>
          <h1 className="mt-5 text-4xl font-black leading-tight text-slate-950">תנאי שימוש ליועצים</h1>
          <p className="mt-3 text-slate-500 font-semibold">עודכן לאחרונה: {LAST_UPDATED}</p>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            תנאים אלה חלים על כל יועץ משכנתאות המשתמש במערכת FINZO לרכישת לידים ומתן שירות. שימוש במערכת מהווה הסכמה לתנאים אלה.
          </p>
        </header>

        <div className="space-y-10 leading-8 text-slate-700">
          <Section title="1. זכאות לשימוש במערכת">
            <p>
              השימוש במערכת FINZO מותר אך ורק ליועצי משכנתאות המורשים על פי חוק ומחזיקים ברישיון בתוקף לפי חוק הפיקוח על שירותים פיננסיים.
            </p>
            <p className="mt-2">
              יועץ המשתמש במערכת מצהיר שרישיונו בתוקף, שאין עליו חקירה פעילה, ושאינו נמצא בהליכי פשיטת רגל.
            </p>
          </Section>

          <Section title="2. שימוש בלידים לצורך טיפול בלבד">
            <p>
              לידים הנרכשים דרך מערכת FINZO מיועדים אך ורק לטיפול ישיר ומתן שירות ייעוץ לאותו לקוח.
            </p>
            <p className="mt-2">
              חל איסור מוחלט להשתמש בפרטי הלקוח לצורך כל מטרה אחרת, לרבות: שיווק שירותים נוספים שאינם קשורים ישירות לבקשת הלקוח, איסוף נתונים לצרכים פנימיים, ו/או העברה לצדדים שלישיים.
            </p>
          </Section>

          <Section title="3. איסור מכירה מחדש של לידים">
            <p>
              חל איסור מוחלט ובלתי ניתן להתנייה על מכירה, העברה, השכרה, שיתוף, או כל העברה אחרת של ליד שנרכש דרך FINZO לכל גורם שלישי — בתמורה או ללא תמורה.
            </p>
            <p className="mt-2">
              ליד שנרכש הינו לשימוש הבלעדי של היועץ הרוכש בלבד.
            </p>
          </Section>

          <Section title="4. איסור העברת מידע לצד שלישי">
            <p>
              כל מידע אישי שנמסר על ידי הלקוח (שם, טלפון, הכנסה, פרטי נכס, וכו') הינו סודי ומוגן.
            </p>
            <p className="mt-2">חל איסור על:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>שיתוף פרטי לקוח עם כל גורם שלישי שאינו נדרש ישירות לצורך מתן השירות</li>
              <li>מכירת או העברת נתוני לקוח לחברות ביטוח, בנקים, גופי שיווק או כל גורם אחר</li>
              <li>שימוש בנתונים לאחר סיום הקשר עם הלקוח</li>
              <li>הוספת הלקוח לרשימות תפוצה ללא הסכמה מפורשת</li>
            </ul>
          </Section>

          <Section title="5. שמירת סודיות">
            <p>
              יועץ המשתמש במערכת FINZO מתחייב לשמור בסוד את כל המידע שנחשף בפניו בקשר ללקוחות, לעסקאות, למחירי הלידים ולמבנה הפלטפורמה.
            </p>
            <p className="mt-2">
              מחויבות זו חלה גם לאחר סיום השימוש במערכת FINZO.
            </p>
          </Section>

          <Section title="6. מדיניות רכישת לידים">
            <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-5 space-y-2">
              <p className="font-black text-slate-900">כללי הרכישה:</p>
              <ul className="space-y-1 list-disc list-inside text-slate-700">
                <li>רכישה רגילה מאפשרת עד 3 יועצים לליד אחד</li>
                <li>רכישה בלעדית מוגבלת ליועץ אחד, ואפשרית רק לפני כל רכישה רגילה</li>
                <li>ליד שנרכש לא יוחזר ולא יוחלף אלא בנסיבות חריגות ובאישור FINZO</li>
                <li>המחיר המוצג הוא סופי — אין הנחות, קיזוזים או ביטולים לאחר הרכישה</li>
                <li>FINZO אינה מתחייבת שהלקוח יגיב לפנייה מהיועץ</li>
              </ul>
            </div>
          </Section>

          <Section title="7. שימוש הוגן במערכת">
            <p>יועצים מתחייבים:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>לא לנסות לנחש, לחלץ, או לגשת ללידים שלא נרכשו</li>
              <li>לא לנסות לחשוף מידע על יועצים אחרים שרכשו את אותו הליד</li>
              <li>לא לנסות לפגוע, לעקוף, לשבש או לטעון יתר על מנת לגשת למערכת</li>
              <li>לא לנצל פגמים טכניים לצורך קבלת לידים ללא תשלום</li>
              <li>לדווח ל-FINZO על כל בעיה טכנית שגורמת לגישה בלתי מורשית</li>
              <li>לפנות ללקוחות בנימוס ובמקצועיות ולא לנהוג בצורה פוגעת</li>
            </ul>
          </Section>

          <Section title="8. סנקציות במקרה של הפרה">
            <p>הפרת תנאים אלה עשויה לגרור, על פי שיקול דעת FINZO:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>השעיה זמנית של חשבון היועץ</li>
              <li>חסימה קבועה וביטול הרשאת הגישה למערכת</li>
              <li>חיוב כספי בגין הפרות שגרמו נזק ל-FINZO או ללקוחות</li>
              <li>דיווח לרגולטור הרלוונטי (רשות שוק ההון)</li>
              <li>נקיטת הליכים משפטיים בגין נזקים</li>
            </ul>
            <p className="mt-3">
              FINZO שומרת לעצמה את הזכות לפעול באחד מהאמצעים הנ"ל ללא התראה מוקדמת במקרים חמורים.
            </p>
          </Section>

          <Section title="9. שינויים בתנאים">
            <p>
              FINZO רשאית לעדכן תנאים אלה בכל עת. יועצים יקבלו הודעה על שינויים מהותיים. המשך השימוש במערכת מהווה הסכמה לתנאים המעודכנים.
            </p>
          </Section>

          <Section title="10. יצירת קשר">
            <p>לשאלות, בירורים, או דיווח על הפרות:</p>
            <div className="mt-3 rounded-[20px] border border-slate-200 bg-slate-50 px-6 py-5 space-y-1">
              <p className="font-black text-slate-900">FINZO — מחלקת יועצים</p>
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
