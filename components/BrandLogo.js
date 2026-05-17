export default function BrandLogo({ withTagline = true, className = "" }) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`} dir="ltr">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <defs>
          <linearGradient id="finzoGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>
        <rect x="2" y="4" width="16" height="5" rx="2.5" fill="url(#finzoGrad)" />
        <rect x="6" y="11.5" width="16" height="5" rx="2.5" fill="url(#finzoGrad)" />
        <rect x="10" y="19" width="16" height="5" rx="2.5" fill="url(#finzoGrad)" />
      </svg>
      <span className="leading-tight">
        <span className="inline-flex items-end text-2xl font-black tracking-tight text-[#0B1B45]">
          Finz<span className="relative inline-flex pl-0.5">o<span className="absolute -top-0.5 -right-1 h-1.5 w-1.5 rounded-full bg-[#2563EB]" /></span>
        </span>
        {withTagline && <span className="hidden text-xs font-bold text-slate-500 sm:block" dir="rtl">בדיקת זכאות חכמה למשכנתא בישראל</span>}
      </span>
    </div>
  );
}
