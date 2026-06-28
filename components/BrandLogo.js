// LOCKED BRAND COMPONENT
// Do not rewrite this logo in future feature tasks.
// The site is RTL, so the English wordmark must remain isolated with dir="ltr" + unicodeBidi.
// Changing this component previously caused the logo to render incorrectly as oFinz.
export default function BrandLogo({ withTagline = true, className = "" }) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`} dir="ltr" aria-label="Finzo" style={{ unicodeBidi: "isolate" }}>
      <span className="flex h-9 w-9 shrink-0 flex-col justify-center gap-1.5" aria-hidden="true">
        <span className="block h-1.5 w-8 rounded-full bg-[#2563EB]" />
        <span className="block h-1.5 w-6 rounded-full bg-[#4F46E5]" />
        <span className="block h-1.5 w-3 rounded-full bg-[#06B6D4]" />
      </span>
      <span className="flex flex-col items-start leading-none">
        <span dir="ltr" className="text-4xl font-black tracking-tight text-[#0F172A] dark:text-white" style={{ unicodeBidi: "isolate" }}>Finzo</span>
        {withTagline && <span dir="rtl" className="mt-1 text-xs font-extrabold text-slate-500 dark:text-slate-400">בדיקת זכאות חכמה למשכנתא בישראל</span>}
      </span>
    </div>
  );
}
