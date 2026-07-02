import Link from "next/link";

export default function BetaBanner() {
  return (
    <div
      dir="rtl"
      role="banner"
      aria-label="הודעת גרסת בטא"
      className="w-full border-b border-warning-200 bg-warning-50 px-4 py-2.5"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
        <p className="text-center text-sm font-medium leading-snug text-warning-900 sm:text-right">
          🚧 <strong>FINZO נמצאת בגרסת בטא.</strong>
          <span className="hidden sm:inline"> </span>
          <br className="sm:hidden" />
          אנו ממשיכים לשפר את המערכת. אם נתקלתם בבעיה או תקלה נשמח לקבל דיווח.
        </p>
        <Link
          href="/contact"
          className="shrink-0 rounded-full bg-warning-500 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-warning-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning-500 focus-visible:ring-offset-2"
        >
          צור קשר
        </Link>
      </div>
    </div>
  );
}
