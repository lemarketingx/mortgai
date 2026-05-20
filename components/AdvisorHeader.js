import Link from "next/link";

export default function AdvisorHeader({ active }) {
  const links = [
    { href: "/advisor", label: "לוח בקרה" },
    { href: "/advisor/leads", label: "שוק לידים" },
    { href: "/advisor/my-leads", label: "הלידים שלי" },
  ];

  function logout() {
    fetch("/api/advisor/login", { method: "DELETE" }).finally(() => {
      window.location.href = "/advisor/login";
    });
  }

  return (
    <header className="bg-slate-950/95 backdrop-blur-sm text-white sticky top-0 z-40 border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4">

        {/* Desktop bar */}
        <div className="hidden md:flex items-center h-12 gap-5">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-black tracking-tight">FINZO</span>
            <span className="text-[10px] font-black text-violet-400 bg-violet-400/10 border border-violet-400/20 px-1.5 py-0.5 rounded-full tracking-widest">PRO</span>
          </div>

          <nav className="flex items-center gap-0.5 flex-1 justify-center">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3.5 py-1.5 text-sm rounded-lg transition-all ${
                  active === href
                    ? "bg-white/[0.13] text-white font-black"
                    : "text-slate-400 font-semibold hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-colors"
              aria-label="התראות"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
            <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-[11px] font-black text-white shrink-0 select-none">
              F
            </div>
            <button
              onClick={logout}
              className="text-xs text-slate-500 hover:text-slate-200 font-semibold transition-colors"
            >
              יציאה
            </button>
          </div>
        </div>

        {/* Mobile bar */}
        <div className="flex md:hidden items-center justify-between h-11 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black">FINZO</span>
            <span className="text-[10px] font-black text-violet-400 bg-violet-400/10 border border-violet-400/20 px-1.5 py-0.5 rounded-full tracking-widest">PRO</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-[10px] font-black text-white select-none">F</div>
            <button onClick={logout} className="text-xs text-slate-500 font-semibold">יציאה</button>
          </div>
        </div>
        <nav className="flex md:hidden border-t border-white/[0.06]">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex-1 text-center py-2.5 text-xs transition-colors ${
                active === href ? "text-white font-black bg-white/[0.08]" : "text-slate-500 font-semibold hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
