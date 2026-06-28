import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "../pages/_app";

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

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

const TYPE_META = {
  lead_purchase:     { dot: "bg-emerald-500", label: "רכישת ליד" },
  overdue_task:      { dot: "bg-rose-500",    label: "משימה באיחור" },
  missing_documents: { dot: "bg-amber-400",   label: "מסמכים חסרים" },
  bank_status:       { dot: "bg-blue-500",    label: "עדכון בנק" },
  reminder_due:      { dot: "bg-sky-400",     label: "תזכורת" },
  stage_change:      { dot: "bg-violet-500",  label: "שינוי שלב" },
  system:            { dot: "bg-slate-400",   label: "מערכת" },
};

function formatTimeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "עכשיו";
  if (mins < 60) return `לפני ${mins} דק׳`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שע׳`;
  const days = Math.floor(hours / 24);
  return `לפני ${days} ימים`;
}

export default function AdvisorHeader({ active, urgentItems = [] }) {
  const links = [
    { href: "/advisor",          label: "לוח בקרה" },
    { href: "/advisor/leads",    label: "שוק לידים" },
    { href: "/advisor/my-leads", label: "הלידים שלי" },
    { href: "/advisor/calendar",  label: "יומן" },
    { href: "/advisor/bankers",  label: "בנקאים" },
    { href: "/advisor/settings", label: "הגדרות" },
  ];

  const mobileLinks = [
    { href: "/advisor",          label: "ראשי" },
    { href: "/advisor/my-leads", label: "הלידים שלי" },
    { href: "/advisor/leads",    label: "שוק" },
    { href: "/advisor/calendar", label: "יומן" },
    { href: "/advisor/bankers",  label: "בנקאים" },
  ];

  const { dark, toggle: toggleTheme } = useTheme();
  const [initials, setInitials] = useState("P");
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoaded, setNotifLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        setInitials(getInitials(p.name, p.email));
      }
    } catch {}
  }, []);

  const fetchNotifications = useCallback(() => {
    fetch("/api/advisor/notifications")
      .then((r) => r.ok ? r.json() : { notifications: [] })
      .then((j) => {
        const items = j.notifications || [];
        setNotifications(items);
        setUnreadCount(items.filter((n) => !n.isRead).length);
        setNotifLoaded(true);
      })
      .catch(() => setNotifLoaded(true));
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

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

  function handleMarkRead(e, notifId) {
    e.preventDefault();
    e.stopPropagation();
    fetch("/api/advisor/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", notificationId: notifId }),
    }).then(() => {
      setNotifications((prev) => prev.map((n) => n.id === notifId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    }).catch(() => {});
  }

  function handleMarkAllRead() {
    fetch("/api/advisor/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read" }),
    }).then(() => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    }).catch(() => {});
  }

  const displayItems = notifications.length > 0
    ? notifications.slice(0, 20)
    : urgentItems.slice(0, 8).map((item, i) => ({
        id: `urgent-${i}`,
        type: item.tag === "danger" ? "overdue_task" : item.tag === "docs" ? "missing_documents" : "system",
        title: item.lead?.name || "—",
        message: item.reason || "",
        entityType: "lead",
        entityId: item.lead?.id,
        isRead: false,
        createdAt: null,
        priority: item.tag === "danger" ? "high" : "normal",
        _isComputed: true,
      }));

  const bellCount = notifications.length > 0 ? unreadCount : urgentItems.length;

  return (
    <header className="bg-slate-950/95 dark:bg-slate-950 backdrop-blur-sm text-white sticky top-0 z-40 border-b border-white/[0.06]">
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

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-colors"
              aria-label={dark ? "מצב בהיר" : "מצב כהה"}
              title={dark ? "מצב בהיר" : "מצב כהה"}
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>

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
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50" dir="rtl">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-950 dark:text-slate-50">התראות</span>
                    <div className="flex items-center gap-2">
                      {bellCount > 0 && (
                        <>
                          <span className="text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 rounded-full px-2 py-0.5">{bellCount}</span>
                          <button
                            onClick={handleMarkAllRead}
                            className="text-[11px] font-black text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 transition-colors"
                          >
                            סמן הכל כנקרא
                          </button>
                        </>
                      )}
                      {bellCount === 0 && <span className="text-xs font-bold text-slate-400 dark:text-slate-500">הכל נקרא ✓</span>}
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {displayItems.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm font-bold text-slate-400 dark:text-slate-500">
                        אין התראות חדשות
                      </div>
                    ) : (
                      displayItems.map((item) => {
                        const meta = TYPE_META[item.type] || TYPE_META.system;
                        const href = item.entityType === "lead" && item.entityId
                          ? `/advisor/lead/${item.entityId}`
                          : "/advisor/my-leads";
                        return (
                          <div key={item.id} className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-800 last:border-0 transition-colors ${item.isRead ? "bg-white dark:bg-slate-900" : "bg-violet-50/30 dark:bg-violet-900/10"}`}>
                            <Link
                              href={href}
                              onClick={() => setBellOpen(false)}
                              className="flex items-start gap-3 min-w-0 flex-1"
                            >
                              <span className={`h-2 w-2 rounded-full shrink-0 mt-1.5 ${meta.dot}`} />
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm truncate ${item.isRead ? "font-bold text-slate-600 dark:text-slate-400" : "font-black text-slate-900 dark:text-slate-100"}`}>{item.title}</p>
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 truncate">{item.message}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600">{meta.label}</span>
                                  {item.createdAt && <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600">{formatTimeAgo(item.createdAt)}</span>}
                                </div>
                              </div>
                            </Link>
                            {!item.isRead && !item._isComputed && (
                              <button
                                onClick={(e) => handleMarkRead(e, item.id)}
                                className="shrink-0 mt-1 w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                                title="סמן כנקרא"
                              >
                                <CheckIcon />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 text-center">
                    <Link href="/advisor/my-leads" onClick={() => setBellOpen(false)} className="text-xs font-black text-violet-600 dark:text-violet-400 hover:underline">
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
            {/* Mobile theme toggle */}
            <button onClick={toggleTheme} className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-500" aria-label={dark ? "מצב בהיר" : "מצב כהה"}>
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
            {/* Mobile bell */}
            <div className="relative">
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
