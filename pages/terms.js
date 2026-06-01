import Head from "next/head";
import Link from "next/link";

const LAST_UPDATED = "1 ביוני 2025";
const CONTACT_EMAIL = "legal@finzo.co.il";

export default function Terms() {
  return (
    <main dir="rtl" className="min-h-screen bg-white text-slate-950">
      <Head>
        <title>תנאי שימוש | FINZO</title>
        <meta name="description" content="תנאי השימוש של FINZO — כללי השימוש בפלטפורמה ובשירות." />
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
          <h1 className="mt-5 text-4xl font-black leading-tight text-slate-950">תנאי שימוש</h1>
          <p className="mt-3 text-slate-500 font-semibold">עודכן לאחרונה: {LAST_UPDATED}</p>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            השימוש בפלטפורמת FINZO מהווה הסכמה לתנאי שימוש אלה. אנא קרא/י בעיון לפני השימוש.
          </p>
        </header>

        <div className="space-y-10 leading-8 text-slate-700">
          <Section title="1. FINZO אינה בנק ואינה גוף מימון">
            <p>
              FINZO היא פלטפורמה טכנולוגית בלבד. היא אינה בנק, אינה חברת ביטוח, אינה גוף אשראי ואינה נותנת ייעוץ פיננסי מוסדרי.
            </p>
            <p className="mt-2">
              FINZO אינה מחזיקה ברישיון ייעוץ משכנתאות על פי חוק הפיקוח על שירותים פיננסיים.
              השירות מוגבל לאומדן ראשוני ולחיבור בין משתמשים לבין יועצי משכנתאות עצמאיים מורשים.
            </p>
          </Section>

          <Section title="2. התוצאות הן אומדן בלבד">
            <p>
              כל תוצאה המוצגת באתר — לרבות אחוז סיכוי אישור, החזר חודשי משוער, ניתוח זכאות, ציון FINZO ומחיר — היא
              אומדן ראשוני בלבד, המבוסס על הנתונים שהוזנו ועל פרמטרים כלליים.
            </p>
            <p className="mt-2">
              אומדן זה אינו מהווה הצעה לעסקה, הסכם, אישור בנקאי, התחייבות מצד בנק כלשהו, ואינו תחליף לבדיקה מקצועית.
            </p>
            <p className="mt-2">
              תוצאות הבדיקה עשויות להשתנות בהתאם לנתונים מדויקים, תנאי שוק, מדיניות הגוף המממן ופרמטרים נוספים.
            </p>
          </Section>

          <Section title="3. אחריות המשתמש למידע שנמסר">
            <p>
              המשתמש/ת מצהיר/ה ומאשר/ת כי הנתונים שנמסרו בטפסי האתר הינם נכונים, מדויקים ומעודכנים ככל האפשר.
            </p>
            <p className="mt-2">
              FINZO אינה אחראית לאי-דיוק בתוצאות הנובע ממידע שגוי, חלקי או לא מעודכן שנמסר על ידי המשתמש/ת.
            </p>
            <p className="mt-2">
              מסירת פרטים שגויים במכוון עשויה לפגוע בתהליך הבדיקה ובשירות שיינתן.
            </p>
          </Section>

          <Section title="4. יועצי משכנתאות עצמאיים">
            <p>
              יועצי משכנתאות הפועלים דרך מערכת FINZO הם עצמאיים ואינם עובדי FINZO.
              FINZO אינה אחראית לפעולות, ייעוץ, שגיאות, מחדלים או הנחיות של יועצים אלה.
            </p>
            <p className="mt-2">
              המשתמש/ת רשאי/ת לסרב לקבל שירות מיועץ כלשהו ולפנות ל-FINZO לבירורים.
            </p>
            <p className="mt-2">
              כל התקשרות עסקית עם יועץ היא בין היועץ לבין הלקוח בלבד.
            </p>
          </Section>

          <Section title="5. העברת פרטים ליועצים">
            <p>
              בעת שליחת טופס בדיקת התאמה ומתן הסכמה מפורשת, הפרטים שמסרת עשויים להיות מועברים ליועצי משכנתאות
              לצורך יצירת קשר ומתן שירות ייעוצי.
            </p>
            <p className="mt-2">
              ניתן לבקש הסרה ממאגר המידע בכל עת על ידי פנייה לכתובת: <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-700 hover:underline font-bold">{CONTACT_EMAIL}</a>
            </p>
          </Section>

          <Section title="6. קניין רוחני">
            <p>
              כל התכנים באתר FINZO — לרבות טקסטים, גרפיקה, עיצוב, לוגו, חישובים ואלגוריתמים —
              הם קניינה הבלעדי של FINZO ומוגנים בחוק זכויות יוצרים.
            </p>
            <p className="mt-2">
              אין לשכפל, להעתיק, לפרסם מחדש או לעשות שימוש מסחרי בתכנים ללא אישור בכתב מ-FINZO.
            </p>
          </Section>

          <Section title="7. הגבלת אחריות">
            <p>
              FINZO וכל מי מטעמה לא יישאו באחריות לנזקים ישירים, עקיפים, מקריים או תוצאתיים הנובעים מ:
            </p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>שימוש בתוצאות האומדן לצורך קבלת החלטה פיננסית</li>
              <li>תקלות טכניות, שגיאות מערכת או הפסקות זמניות בשירות</li>
              <li>פעולות יועצים עצמאיים שהתחברו דרך הפלטפורמה</li>
              <li>מידע שגוי שנמסר על ידי המשתמש</li>
              <li>שינויים בתנאי שוק, ריבית או מדיניות בנקים</li>
            </ul>
          </Section>

          <Section title="8. שינויים בתנאים">
            <p>
              FINZO שומרת לעצמה את הזכות לשנות תנאים אלה בכל עת. שינויים מהותיים יפורסמו בעמוד זה.
              המשך השימוש בשירות מהווה הסכמה לתנאים המעודכנים.
            </p>
          </Section>

          <Section title="9. ברירת דין וסמכות שיפוט">
            <p>
              תנאי שימוש אלה כפופים לדיני מדינת ישראל. כל מחלוקת תובא בפני בתי המשפט המוסמכים בישראל.
            </p>
          </Section>

          <Section title="10. יצירת קשר">
            <p>לשאלות משפטיות או בירורים בנוגע לתנאים אלה:</p>
            <div className="mt-3 rounded-[20px] border border-slate-200 bg-slate-50 px-6 py-5 space-y-1">
              <p className="font-black text-slate-900">FINZO — מחלקה משפטית</p>
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
