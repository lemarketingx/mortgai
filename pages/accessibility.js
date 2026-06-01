import Head from "next/head";
import Link from "next/link";

const LAST_UPDATED = "1 ביוני 2025";
const CONTACT_EMAIL = "lemarketingx@gmail.com";

export default function Accessibility() {
  return (
    <main dir="rtl" className="min-h-screen bg-white text-slate-950">
      <Head>
        <title>הצהרת נגישות | FINZO</title>
        <meta name="description" content="הצהרת הנגישות של FINZO — מחויבותנו לנגישות דיגיטלית לכלל המשתמשים." />
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
          <span className="inline-flex rounded-full bg-violet-50 px-4 py-2 text-sm font-black text-violet-700">נגישות</span>
          <h1 className="mt-5 text-4xl font-black leading-tight text-slate-950">הצהרת נגישות</h1>
          <p className="mt-3 text-slate-500 font-semibold">עודכן לאחרונה: {LAST_UPDATED}</p>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            FINZO מחויבת לנגישות דיגיטלית מלאה ולאפשר לכלל המשתמשים — לרבות אנשים עם מוגבלות — להשתמש בשירות בצורה שוויונית ועצמאית.
          </p>
        </header>

        <div className="space-y-10 leading-8 text-slate-700">
          <Section title="1. מחויבותנו לנגישות">
            <p>
              FINZO שואפת לעמוד בדרישות תקן הנגישות הישראלי IS 5568 (המבוסס על WCAG 2.1 ברמת AA).
              אנו מאמינים שכל אדם, ללא קשר ליכולותיו הפיזיות, הקוגניטיביות או הטכנולוגיות, זכאי לגישה מלאה לשירותינו.
            </p>
          </Section>

          <Section title="2. התאמות שבוצעו באתר">
            <p className="font-black text-slate-800">עיצוב ומבנה:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>כיוון RTL מלא בכל עמודי האתר</li>
              <li>ניגודיות צבע עומדת בדרישות WCAG AA</li>
              <li>גופנים ברורים וגדולים עם גובה שורה מספק</li>
              <li>מבנה כותרות היררכי (H1, H2, H3) לניווט קורא מסך</li>
              <li>עיצוב רספונסיבי המותאם למסכים מכל הגדלים</li>
            </ul>

            <p className="mt-4 font-black text-slate-800">טפסים ואינטראקציות:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>תוויות (labels) מפורשות לכל שדה טופס</li>
              <li>הודעות שגיאה ברורות ומיידיות בעברית</li>
              <li>סדר טאב (Tab order) לוגי ועקבי</li>
              <li>אזורי focus גלויים לניווט מקלדת</li>
              <li>aria-label ו-aria-labelledby על רכיבים אינטראקטיביים</li>
              <li>aria-busy על טפסים בזמן שליחה</li>
              <li>role="alert" על הודעות שגיאה</li>
              <li>role="status" על הודעות הצלחה</li>
            </ul>

            <p className="mt-4 font-black text-slate-800">ניווט:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>קישור דילוג (skip-link) לתוכן המרכזי</li>
              <li>ניווט ראשי עם aria-label</li>
              <li>מבנה עמוד עם landmark regions (header, main, footer, nav)</li>
            </ul>

            <p className="mt-4 font-black text-slate-800">מדיה ותמונות:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>אין תמונות קריטיות ללא חלופת טקסט</li>
              <li>אייקוני SVG כוללים title או aria-hidden בהתאם לשימוש</li>
            </ul>
          </Section>

          <Section title="3. מגבלות נגישות ידועות">
            <p>
              חרף מאמצינו, ייתכן כי חלק מהתכנים אינם עדיין נגישים במלואם. אנו עובדים על שיפור מתמיד. אם נתקלת/ת בקושי נגישות, פנה/י אלינו ונשוב אליך בהקדם.
            </p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>חלק מהגרפים והוויזואליזציות עשויים להיות חסרי תיאור מלא לקורא מסך</li>
              <li>מחשבון ה-PDF עשוי להיות בעל נגישות חלקית בגרסאות ישנות של קורא מסך</li>
            </ul>
          </Section>

          <Section title="4. פנייה בנושאי נגישות">
            <p>
              נתקלת/ת בבעיית נגישות? שמח/ה לשמוע. פנייתך תסייע לנו לשפר את השירות לכולם.
            </p>
            <div className="mt-3 rounded-[20px] border border-slate-200 bg-slate-50 px-6 py-5 space-y-1">
              <p className="font-black text-slate-900">רכז/ת נגישות — FINZO</p>
              <p>דוא"ל: <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-700 hover:underline font-bold">{CONTACT_EMAIL}</a></p>
              <p>לחלופין ניתן לפנות דרך <Link href="/contact" className="text-violet-700 hover:underline font-bold">טופס יצירת הקשר</Link></p>
              <p className="text-sm text-slate-500">נשוב אליך בתוך 5 ימי עסקים.</p>
            </div>
          </Section>

          <Section title="5. בקשת תוכן נגיש">
            <p>
              אם נזקק/ת לתוכן מסוים בפורמט נגיש (כגון קובץ PDF נגיש, גרסת הגדלת טקסט, או תיאור חלופי לאינפוגרפיקה), אנא פנה/י אלינו ונעשה כמיטב יכולתנו לסייע.
            </p>
          </Section>

          <Section title="6. תאריך עדכון">
            <p>
              הצהרת נגישות זו עודכנה לאחרונה בתאריך: <strong>{LAST_UPDATED}</strong>.
              אנו מתחייבים לסקור ולעדכן הצהרה זו אחת לשנה לכל הפחות.
            </p>
          </Section>
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
