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
    <header className="bg-slate-950 text-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4">
        {/* Desktop bar */}
        <div className="hidden md:flex items-center h-14 gap-6">
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-base font-black tracking-tight">FINZO</span>
            <span className="text-[10px] font-black text-violet-400 bg-violet-400/10 border border-violet-400/20 px-2 py-0.5 rounded-full tracking-widest">PRO</span>
          </div>
          <nav className="flex items-center gap-1 flex-1 justify-center">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${
                  active === href
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <button
            onClick={logout}
            className="text-xs text-slate-500 hover:text-white font-bold transition-colors shrink-0"
          >
            יציאה
          </button>
        </div>

        {/* Mobile bar */}
        <div className="flex md:hidden items-center justify-between h-12 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black">FINZO</span>
            <span className="text-[10px] font-black text-violet-400 bg-violet-400/10 border border-violet-400/20 px-1.5 py-0.5 rounded-full tracking-widest">PRO</span>
          </div>
          <button onClick={logout} className="text-xs text-slate-500 font-bold">יציאה</button>
        </div>
        <nav className="flex md:hidden border-t border-slate-800">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex-1 text-center py-2.5 text-xs font-bold transition-colors ${
                active === href ? "bg-white text-slate-950" : "text-slate-400 hover:text-white"
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
