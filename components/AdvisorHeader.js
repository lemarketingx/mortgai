import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const PROFILE_KEY = "finzo_advisor_profile_v1";

function getInitials(name, email) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) return email.trim()[0].toUpperCase();
  return "P";
}

function BellIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export default function AdvisorHeader({ active, urgentItems = [] }) {
  const links = [
    { href: "/advisor",          label: "לוח בקרה" },
    { href: "/advisor/leads",    label: "שוק לידים" },
    { href: "/advisor/my-leads", label: "הלידים שלי" },
    { href: "/advisor/bankers",  label: "בנקאים" },
    { href: "/advisor/settings", label: "הגדרות" },
  ];

  const mobileLinks = [
    { href: "/advisor",          label: "ראשי" },
    { href: "/advisor/my-leads", label: "הלידים שלי" },
    { href: "/advisor/leads",    label: "שוק" },
    { href: "/advisor/bankers",  label: "בנקאים" },
    { href: "/advisor/settings", label: "הגדרות" },
  ];

  const [initials, setInitials] = useState("P");
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);

  // Load advisor profile from localStorage for initials
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        setInitials(getInitials(p.name, p.email));
      }
    } catch {}
  }, []);

  // Close bell dropdown on outside click
  useEffect(() => {
    if (!bellOpen) return;
    function onDown(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [bellOpen]);

  function logout() {
    fetch("/api/advisor/login", { method: "DELETE" }).finally(() => {
      window.location.href = "/advisor/login";
    });
  }

  const bellCount = urgentItems.length;

  return (
    <header className="bg-slate-950/95 backdrop-blur-sm text-white sticky top-0 z-40 border-b border-white/[0.06]">
      <div className="max-w-[92rem] mx-auto px-4 lg:px-6">

        {/* ── Desktop bar ──────────────────────────────────────────── */}
        <div className="hidden md:flex items-center h-14 gap-6">
          <Link href="/advisor" className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
            <span className="text-sm font-black tracking-tight">FINZO</span>
            <span className="text-[10px] font-black text-violet-400 bg-violet-400/10 border border-violet-400/20 px-1.5 py-0.5 rounded-full tracking-widest">PRO</span>
          </Link>

          <nav className="flex items-center gap-0.5 flex-1 justify-center">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
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

            {/* Bell with badge */}
            <div ref={bellRef} className="relative">
              <button
                onClick={() => setBellOpen((v) => !v)}
                className="relative w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-colors"
                aria-label="התראות"
              >
                <BellIcon />
                {bellCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 flex items-center justify-center rounded-full bg-rose-500 text-white text-[9px] font-black px-0.5 leading-none">
                    {bellCount > 9 ? "9+" : bellCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50" dir="rtl">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-950">דורשים טיפול</span>
                    {bellCount > 0
                      ? <span className="text-xs font-black text-rose-600 bg-rose-50 rounded-full px-2 py-0.5">{bellCount} פעיל</span>
                      : <span className="text-xs font-bold text-slate-400">הכל תקין ✓</span>}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {urgentItems.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm font-bold text-slate-400">
                        אין פריטים דחופים כרגע
                      </div>
                    ) : (
                      urgentItems.slice(0, 8).map((item, i) => (
                        <Link
                          key={i}
                          href={item.href || `/advisor/lead/${item.lead?.id}`}
                          onClick={() => setBellOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                        >
                          <span className={`h-2 w-2 rounded-full shrink-0 ${item.tag === "danger" ? "bg-rose-500" : item.tag === "warning" ? "bg-amber-400" : item.tag === "docs" ? "bg-amber-400" : "bg-sky-400"}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-black text-slate-900 truncate">{item.lead?.name || "—"}</p>
                            <p className="text-xs font-bold text-slate-400">{item.reason}</p>
                          </div>
                          <span className="text-[11px] font-black text-slate-400 shrink-0">{item.detail}</span>
                        </Link>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-2.5 border-t border-slate-100 text-center">
                    <Link href="/advisor/my-leads" onClick={() => setBellOpen(false)} className="text-xs font-black text-violet-600 hover:underline">
                      כל הלידים שלי →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Avatar → profile */}
            <Link
              href="/advisor/profile"
              aria-label="פרופיל"
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0 select-none transition-colors ${
                active === "/advisor/profile" ? "bg-violet-500 ring-2 ring-violet-400" : "bg-violet-600 hover:bg-violet-500"
              }`}
            >
              {initials}
            </Link>

            <button
              onClick={logout}
              className="text-xs text-slate-500 hover:text-slate-200 font-semibold transition-colors"
            >
              יציאה
            </button>
          </div>
        </div>

        {/* ── Mobile top bar ───────────────────────────────────────── */}
        <div className="flex md:hidden items-center justify-between h-12 gap-3">
          <Link href="/advisor" className="flex items-center gap-2">
            <span className="text-sm font-black">FINZO</span>
            <span className="text-[10px] font-black text-violet-400 bg-violet-400/10 border border-violet-400/20 px-1.5 py-0.5 rounded-full tracking-widest">PRO</span>
          </Link>
          <div className="flex items-center gap-2">
            {/* Mobile bell */}
            <div ref={null} className="relative">
              <button
                onClick={() => setBellOpen((v) => !v)}
                className="relative w-6 h-6 flex items-center justify-center rounded-lg text-slate-500"
                aria-label="התראות"
              >
                <BellIcon />
                {bellCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[13px] h-3 flex items-center justify-center rounded-full bg-rose-500 text-white text-[8px] font-black px-0.5 leading-none">
                    {bellCount > 9 ? "9+" : bellCount}
                  </span>
                )}
              </button>
            </div>
            <Link href="/advisor/profile" className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white select-none ${active === "/advisor/profile" ? "bg-violet-500" : "bg-violet-600"}`}>
              {initials}
            </Link>
            <button onClick={logout} className="text-xs text-slate-500 font-semibold">יציאה</button>
          </div>
        </div>

        {/* ── Mobile bottom nav — all 5 links ─────────────────────── */}
        <nav className="flex md:hidden border-t border-white/[0.06]">
          {mobileLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex-1 text-center py-2 text-[10px] transition-colors ${
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
