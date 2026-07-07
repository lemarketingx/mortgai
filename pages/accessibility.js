import Head from "next/head";
import Link from "next/link";
import BrandLogo from "../components/BrandLogo";

// Accessibility coordinator ("רכז נגישות") — required by IS 5568 / Israeli
// accessibility regulations. Configurable via env so the branded support
// address and phone can be set without a code change.
const A11Y_EMAIL = process.env.NEXT_PUBLIC_A11Y_EMAIL || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "lemarketingx@gmail.com";
const A11Y_PHONE = process.env.NEXT_PUBLIC_A11Y_PHONE || "";
const A11Y_UPDATED = "יולי 2026";

export default function AccessibilityPage() {
  return (
    <>
      <Head>
        <title>הצהרת נגישות | FINZO</title>
        <meta name="description" content="הצהרת הנגישות של FINZO — מחויבות לנגישות דיגיטלית לפי תקן ישראלי ת״י 5568 ו-WCAG 2.0 ברמה AA." />
        <meta name="robots" content="index, follow" />
      </Head>
      <div dir="rtl" className="min-h-screen bg-white">
        <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            <Link href="/" className="inline-flex items-center"><BrandLogo size="sm" withTagline={false} /></Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-bold text-slate-500">הצהרת נגישות</span>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <h1 className="text-3xl font-black text-slate-900 sm:text-4xl">הצהרת נגישות</h1>
          <p className="mt-2 text-sm text-slate-500">עודכן לאחרונה: {A11Y_UPDATED}</p>

          <div className="mt-8 space-y-8 text-slate-700 leading-relaxed">

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">המחויבות שלנו לנגישות</h2>
              <p>
                ל.א.ה שיווק, מפעילת שירות FINZO, רואה חשיבות רבה במתן שירות שוויוני ונגיש לכלל הציבור, לרבות אנשים עם
                מוגבלות. אנו משקיעים מאמצים ומשאבים כדי להנגיש את האתר ולאפשר גלישה נוחה ועצמאית ככל הניתן, מתוך אמונה
                שלכל אדם מגיעה זכות שווה לקבל מידע ולהשתמש בשירותים דיגיטליים.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">רמת הנגישות באתר</h2>
              <p>
                אתר זה נבנה ומתוחזק בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע”ג-2013,
                ומיישם את הוראות התקן הישראלי <strong>ת״י 5568</strong> לנגישות תכנים באינטרנט, המבוסס על הנחיות
                <strong> WCAG 2.0</strong> של ארגון ה-W3C, ברמת התאמה <strong>AA</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">מה הונגש באתר</h2>
              <ul className="list-disc pr-6 space-y-1.5">
                <li>מבנה HTML סמנטי ותמיכה מלאה בכיוון כתיבה מימין לשמאל (RTL) בעברית.</li>
                <li>ניווט מלא באמצעות מקלדת וסימון מיקוד (focus) גלוי לאלמנטים אינטראקטיביים.</li>
                <li>ניגודיות צבעים מותאמת בין טקסט לרקע לשיפור הקריאוּת.</li>
                <li>טקסט חלופי לתמונות בעלות משמעות, ותוויות (labels) לשדות טופס.</li>
                <li>אפשרות להגדלת התצוגה בדפדפן ללא אובדן תוכן או תפקודיות.</li>
                <li>תאימות לטכנולוגיות מסייעות (קוראי מסך) בדפדפנים הנפוצים.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">מגבלות ידועות</h2>
              <p>
                חרף מאמצינו להנגיש את כלל הדפים והרכיבים, ייתכן שיימצאו חלקים שטרם הונגשו במלואם או שנגישותם חלקית.
                אנו ממשיכים לפעול לשיפור הנגישות באופן שוטף, כחלק ממחויבותנו לאפשר שימוש נוח לכלל האוכלוסייה.
                אם נתקלתם ברכיב שאינו נגיש — נשמח שתעדכנו אותנו ונפעל לתקנו בהקדם.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">פנייה ורכז הנגישות</h2>
              <p>
                אם נתקלתם בבעיית נגישות באתר, או שברצונכם לקבל מידע נוסף, ניתן לפנות אל רכז הנגישות שלנו:
              </p>
              <div className="mt-4 rounded-2xl bg-brand-50 border border-brand-200 px-5 py-4 text-sm font-bold text-brand-800 space-y-1.5">
                <p>רכז נגישות: צוות FINZO</p>
                <p>
                  דוא”ל:{" "}
                  <a href={`mailto:${A11Y_EMAIL}`} className="text-brand-700 hover:underline">{A11Y_EMAIL}</a>
                </p>
                {A11Y_PHONE ? (
                  <p>
                    טלפון:{" "}
                    <a href={`tel:${A11Y_PHONE.replace(/[^\d+]/g, "")}`} className="text-brand-700 hover:underline">{A11Y_PHONE}</a>
                  </p>
                ) : null}
              </div>
              <p className="mt-3">
                בפנייתכם נשמח שתפרטו את הבעיה, את הדף שבו נתקלתם בה ואת סוג הדפדפן/הטכנולוגיה המסייעת בה השתמשתם — כדי
                שנוכל לטפל ביעילות. נחזור אליכם בהקדם האפשרי.
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
