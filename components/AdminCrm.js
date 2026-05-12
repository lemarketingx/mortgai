import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { formatILS } from "../lib/format";

const fallbackStatuses = ["חדש", "נשלח ליועץ", "בטיפול", "אושר עקרונית", "נסגר", "לא רלוונטי"];
const fallbackCommissionStatuses = ["pending", "invoiced", "paid"];

function adminApiMessage(errorCode) {
  const messages = {
    ADMIN_AUTH_REQUIRED: "החיבור לאדמין פג או לא קיים. יש להתחבר מחדש.",
    ADMIN_AUTH_NOT_CONFIGURED: "ADMIN_SESSION_SECRET לא מוגדר בשרת.",
    SUPABASE_ENV_MISSING: "חסרים משתני Supabase ב-Vercel: SUPABASE_URL או SUPABASE_SERVICE_KEY.",
    SUPABASE_READ_FAILED: "שגיאת קריאה מ-Supabase. בדוק שהטבלה leads קיימת ושה-Service Key תקין.",
    SUPABASE_UPDATE_FAILED: "שגיאת עדכון ב-Supabase. בדוק הרשאות Service Key ומבנה טבלת leads.",
    LEADS_READ_FAILED: "לא ניתן לטעון את הלידים כרגע בגלל שגיאת שרת.",
    LEAD_UPDATE_FAILED: "לא ניתן היה לעדכן את הליד בגלל שגיאת שרת.",
    LEAD_NOT_FOUND: "הליד לא נמצא במסד הנתונים.",
    ADVISOR_ID_EXISTS: "Advisor ID כבר קיים במערכת.",
    ADVISOR_ID_REQUIRED: "יש להזין advisorId.",
    NAME_REQUIRED: "יש להזין שם.",
    PHONE_REQUIRED: "יש להזין טלפון.",
    EMAIL_REQUIRED: "יש להזין אימייל.",
    INVALID_EMAIL: "האימייל אינו בפורמט תקין.",
  };
  return messages[errorCode] || "לא ניתן להשלים את הפעולה כרגע.";
}

function statusBadgeClass(status) {
  switch (status) {
    case "חדש": return "border-blue-200 bg-blue-50 text-blue-800";
    case "נשלח ליועץ": return "border-violet-200 bg-violet-50 text-violet-800";
    case "בטיפול": return "border-amber-200 bg-amber-50 text-amber-800";
    case "אושר עקרונית": return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "נסגר": return "border-green-300 bg-green-100 text-green-900";
    case "לא רלוונטי": return "border-slate-200 bg-slate-100 text-slate-500";
    default: return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

// ─── Analytics helpers ────────────────────────────────────────────────────────

function groupLeadsByDay(leads, days = 30) {
  const now = new Date();
  const buckets = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    buckets[d.toISOString().slice(0, 10)] = 0;
  }
  leads.forEach((lead) => {
    const key = lead.createdAt ? lead.createdAt.slice(0, 10) : null;
    if (key && key in buckets) buckets[key]++;
  });
  return Object.entries(buckets).map(([label, count]) => ({ label, count }));
}

function groupLeadsByWeek(leads, weeks = 12) {
  const now = new Date();
  const buckets = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(start.getDate() - i * 7 - start.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    buckets.push({
      label: `${start.getDate()}/${start.getMonth() + 1}`,
      start: start.toISOString(),
      end: end.toISOString(),
      count: 0,
    });
  }
  leads.forEach((lead) => {
    if (!lead.createdAt) return;
    const ts = lead.createdAt;
    for (const b of buckets) {
      if (ts >= b.start && ts <= b.end) { b.count++; break; }
    }
  });
  return buckets;
}

function groupLeadsByMonth(leads, months = 12) {
  const now = new Date();
  const buckets = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      label: `${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`,
      year: d.getFullYear(),
      month: d.getMonth(),
      count: 0,
    });
  }
  leads.forEach((lead) => {
    if (!lead.createdAt) return;
    const d = new Date(lead.createdAt);
    for (const b of buckets) {
      if (b.year === d.getFullYear() && b.month === d.getMonth()) { b.count++; break; }
    }
  });
  return buckets;
}

function BarChart({ data, height = 120 }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const barWidth = Math.max(4, Math.floor((560 - data.length * 2) / data.length));
  const totalWidth = data.length * (barWidth + 2);

  return (
    <div className="overflow-x-auto" dir="ltr">
      <svg width={Math.max(totalWidth, 300)} height={height + 28} className="block">
        {data.map((d, i) => {
          const barH = Math.max(2, Math.round((d.count / max) * height));
          const x = i * (barWidth + 2);
          const y = height - barH;
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={3}
                fill={d.count > 0 ? "#7c3aed" : "#e2e8f0"}
                opacity={0.85}
              />
              {d.count > 0 && (
                <text x={x + barWidth / 2} y={y - 3} textAnchor="middle" fontSize={9} fill="#7c3aed" fontWeight="bold">
                  {d.count}
                </text>
              )}
              {(data.length <= 20 || i % Math.ceil(data.length / 15) === 0) && (
                <text x={x + barWidth / 2} y={height + 18} textAnchor="middle" fontSize={8} fill="#94a3b8">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function LeadsAnalytics({ leads }) {
  const [tab, setTab] = useState("day");

  const data = useMemo(() => {
    if (tab === "day") return groupLeadsByDay(leads, 30);
    if (tab === "week") return groupLeadsByWeek(leads, 12);
    return groupLeadsByMonth(leads, 12);
  }, [leads, tab]);

  const total = data.reduce((s, d) => s + d.count, 0);
  const avg = total > 0 ? (total / data.length).toFixed(1) : "0";
  const peak = data.reduce((best, d) => d.count > best.count ? d : best, { label: "—", count: 0 });

  const tabs = [
    { key: "day", label: "30 ימים" },
    { key: "week", label: "12 שבועות" },
    { key: "month", label: "12 חודשים" },
  ];

  return (
    <section className="fintech-card mt-5 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-mort-ink">לידים לאורך זמן</h2>
          <p className="text-sm font-bold text-mort-muted">סה״כ בתקופה: <span className="text-violet-700">{total}</span> · ממוצע: <span className="text-violet-700">{avg}</span> · שיא: <span className="text-violet-700">{peak.label} ({peak.count})</span></p>
        </div>
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-xl px-4 py-1.5 text-sm font-black transition ${tab === t.key ? "bg-violet-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5">
        <BarChart data={data} height={110} />
      </div>
    </section>
  );
}

// ─── Migration banner ─────────────────────────────────────────────────────────

const UTM_SQL = `-- Run once in Supabase SQL Editor:
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_source TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_medium TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_campaign TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_content TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_term TEXT NOT NULL DEFAULT '';`;

function MigrationBanner({ onDismiss }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(UTM_SQL).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }
  return (
    <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-black text-amber-900">נדרשת מיגרציית בסיס נתונים — לידים לא נשמרים!</p>
          <p className="mt-1 text-sm font-bold text-amber-700">
            עמודות UTM חסרות בטבלת leads ב-Supabase. יש להריץ את ה-SQL הבא ב-
            <strong> SQL Editor</strong> של Supabase:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-amber-100 p-3 text-xs text-amber-900 ltr">{UTM_SQL}</pre>
          <button onClick={copy} className="mt-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-black text-white hover:bg-amber-700" type="button">
            {copied ? "✓ הועתק!" : "העתק SQL"}
          </button>
        </div>
        <button onClick={onDismiss} className="text-amber-600 hover:text-amber-900 font-black text-lg" type="button" title="סגור">✕</button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PrivateAdmin() {
  const [leads, setLeads] = useState([]);
  const [statuses, setStatuses] = useState(fallbackStatuses);
  const [commissionStatuses, setCommissionStatuses] = useState(fallbackCommissionStatuses);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [advisorFilter, setAdvisorFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [message, setMessage] = useState("");
  const [advisors, setAdvisors] = useState([]);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showMigrationBanner, setShowMigrationBanner] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAdvisorId, setBulkAdvisorId] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  const filteredLeads = useMemo(() => {
    const term = query.trim();
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toTs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;
    return leads.filter((lead) => {
      const matchesStatus = !statusFilter || (lead.leadStatus || lead.status) === statusFilter;
      const matchesAdvisor = !advisorFilter || lead.assignedAdvisorId === advisorFilter;
      const matchesQuery = !term || `${lead.name} ${lead.phone} ${lead.city} ${lead.utmSource || ""}`.includes(term);
      const createdTs = lead.createdAt ? new Date(lead.createdAt).getTime() : null;
      const matchesFrom = !fromTs || (createdTs && createdTs >= fromTs);
      const matchesTo = !toTs || (createdTs && createdTs <= toTs);
      return matchesStatus && matchesAdvisor && matchesQuery && matchesFrom && matchesTo;
    });
  }, [leads, query, statusFilter, advisorFilter, dateFrom, dateTo]);

  const dashboardStats = useMemo(() => {
    const money = (v) => Number(String(v || "").replace(/[^\d.-]/g, "")) || 0;
    return {
      newLeads: leads.filter((l) => (l.leadStatus || l.status) === "חדש").length,
      inProgress: leads.filter((l) => ["בטיפול", "נשלח ליועץ"].includes(l.leadStatus || l.status)).length,
      closed: leads.filter((l) => (l.leadStatus || l.status) === "נסגר").length,
      expectedCommission: leads.reduce((s, l) => s + money(l.expectedCommission), 0),
    };
  }, [leads]);

  const allFilteredSelected = filteredLeads.length > 0 && filteredLeads.every((l) => selectedIds.has(l.id));

  useEffect(() => { loadLeads(); }, []);

  async function loadLeads() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/leads");
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) { setIsAuthenticated(false); setMessage(adminApiMessage(json.error || "ADMIN_AUTH_REQUIRED")); return; }
        throw new Error(adminApiMessage(json.error) || json.message || "Lead load failed");
      }
      setLeads(json.leads || []);
      setStatuses(json.statuses || fallbackStatuses);
      setCommissionStatuses(json.commissionStatuses || fallbackCommissionStatuses);
      setAdvisors(json.advisors || []);
      setIsAuthenticated(true);
      if (!json.leads?.length) setMessage("אין לידים להצגה כרגע. אם שלחת ליד לבדיקה, ודא שהשמירה ל-Supabase הצליחה.");
    } catch (error) {
      setMessage(error.message || "לא ניתן לטעון את הלידים כרגע.");
    } finally {
      setLoading(false);
    }
  }

  async function login(event) {
    event.preventDefault();
    if (!password.trim()) { setMessage("יש להזין סיסמת אדמין."); return; }
    setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (json.error === "ADMIN_PASSWORD_NOT_CONFIGURED") throw new Error("ADMIN_PASSWORD לא מוגדר בשרת.");
        if (json.error === "INVALID_PASSWORD") throw new Error("הסיסמה שגויה.");
        if (json.error === "ADMIN_AUTH_NOT_CONFIGURED") throw new Error("ADMIN_SESSION_SECRET לא מוגדר בשרת.");
        throw new Error("בעיית התחברות לאדמין.");
      }
      setPassword("");
      await loadLeads();
    } catch (error) {
      setMessage(error.message || "סיסמה שגויה או בעיית התחברות.");
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true); setMessage("");
    try { await fetch("/api/admin/login", { method: "DELETE" }); }
    finally { setLeads([]); setIsAuthenticated(false); setLoading(false); }
  }

  async function updateLead(id, changes) {
    setMessage("");
    const response = await fetch("/api/admin/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, changes }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMessage = adminApiMessage(json.error);
      setMessage(errorMessage);
      return { ok: false, error: errorMessage };
    }
    setLeads((current) => current.map((lead) => (lead.id === id ? json.lead : lead)));
    await loadLeads();
    return { ok: true };
  }

  async function bulkUpdate() {
    if (!selectedIds.size) return;
    if (!bulkAdvisorId && !bulkStatus) { setMessage("יש לבחור יועץ או סטטוס לפעולה המרובה."); return; }
    setBulkSaving(true); setMessage("");
    const changes = {};
    if (bulkStatus) { changes.leadStatus = bulkStatus; changes.status = bulkStatus; }
    if (bulkAdvisorId) {
      const advisor = advisors.find((a) => String(a.advisor_id) === bulkAdvisorId);
      changes.assignedAdvisorId = bulkAdvisorId;
      changes.assignedAdvisor = advisor?.name || "";
      changes.advisorPhone = advisor?.phone || "";
      changes.advisorEmail = advisor?.email || "";
    }
    const response = await fetch("/api/admin/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds), changes }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(adminApiMessage(json.error)); }
    else { setMessage(`עודכנו ${json.updated || 0} לידים בהצלחה.`); setSelectedIds(new Set()); setBulkAdvisorId(""); setBulkStatus(""); }
    setBulkSaving(false);
    await loadLeads();
  }

  function toggleSelect(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds((current) => { const next = new Set(current); filteredLeads.forEach((l) => next.delete(l.id)); return next; });
    } else {
      setSelectedIds((current) => { const next = new Set(current); filteredLeads.forEach((l) => next.add(l.id)); return next; });
    }
  }

  if (!isAuthenticated) {
    return (
      <main dir="rtl" className="min-h-screen px-4 py-6 text-mort-text sm:px-6 lg:px-8">
        <Head>
          <title>Admin CRM | MortgAI2</title>
          <meta name="robots" content="noindex,nofollow" key="robots" />
        </Head>
        <div className="mx-auto w-full max-w-lg">
          <section className="glass-card p-6 sm:p-8">
            <span className="pill border-emerald-200 bg-emerald-50 text-emerald-800">CRM פרטי</span>
            <h1 className="mt-3 text-3xl font-black text-mort-ink">כניסת אדמין</h1>
            <p className="mt-2 font-bold text-mort-muted">להמשך יש להזין סיסמת אדמין שהוגדרה בשרת.</p>
            <form className="mt-5 grid gap-3" onSubmit={login}>
              <input className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="סיסמת אדמין" autoComplete="current-password" />
              <button disabled={loading} className="rounded-2xl bg-mort-ink px-5 py-3 font-black text-white shadow-soft disabled:opacity-60" type="submit">{loading ? "מתחבר..." : "כניסה"}</button>
            </form>
            {message && <strong className="mt-4 block rounded-2xl bg-red-100 p-3 text-red-700">{message}</strong>}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen px-4 py-6 text-mort-text sm:px-6 lg:px-8">
      <Head>
        <title>Admin CRM | MortgAI2</title>
        <meta name="robots" content="noindex,nofollow" key="robots" />
      </Head>

      <div className="mx-auto w-full max-w-[1500px] 2xl:max-w-[1680px]">
        {/* Header */}
        <section className="glass-card relative overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-emerald-200/30 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="pill border-emerald-200 bg-emerald-50 text-emerald-800">CRM פרטי</span>
              <h1 className="mt-3 text-4xl font-black text-mort-ink">ניהול לידים ועמלות</h1>
              <p className="mt-2 font-bold text-mort-muted">הלידים נשמרים ב-Supabase דרך השרת.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-3 text-center font-black text-mort-ink shadow-soft" href="/">חזרה למחשבון</a>
              <button className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 font-black text-amber-800 shadow-soft" type="button" onClick={() => setShowMigrationBanner((v) => !v)}>מיגרציית SQL</button>
              <button className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 font-black text-red-700 shadow-soft" type="button" onClick={logout}>התנתק</button>
            </div>
          </div>
        </section>

        {showMigrationBanner && <MigrationBanner onDismiss={() => setShowMigrationBanner(false)} />}

        {/* Stats */}
        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStat label="לידים חדשים" value={dashboardStats.newLeads} />
          <AdminStat label="בטיפול / נשלח ליועץ" value={dashboardStats.inProgress} />
          <AdminStat label="נסגרו" value={dashboardStats.closed} />
          <AdminStat label="עמלה צפויה" value={formatILS(dashboardStats.expectedCommission)} />
        </section>

        {/* Analytics chart */}
        <LeadsAnalytics leads={leads} />

        {/* Filters */}
        <section className="fintech-card mt-5 p-6 sm:p-8">
          <div className="grid gap-3 md:grid-cols-[1fr_200px_200px_auto_auto]">
            <input className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חיפוש לפי שם, טלפון, עיר או UTM" />
            <select className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">כל הסטטוסים</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink" value={advisorFilter} onChange={(e) => setAdvisorFilter(e.target.value)}>
              <option value="">כל היועצים</option>
              {advisors.map((a) => <option key={a.advisor_id} value={a.advisor_id}>{a.name} ({a.advisor_id})</option>)}
            </select>
            <button disabled={loading} onClick={loadLeads} className="rounded-2xl bg-mort-ink px-5 py-3 font-black text-white shadow-soft disabled:opacity-60" type="button">{loading ? "טוען..." : "רענון"}</button>
            <a className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center font-black text-mort-ink shadow-soft" href="/api/admin/export">ייצוא CSV</a>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1"><span className="text-xs font-black text-mort-muted">מתאריך</span><input type="date" className="focus-field min-h-11 rounded-2xl border border-slate-200 bg-white px-3 py-2 font-bold text-mort-ink" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>
            <label className="grid gap-1"><span className="text-xs font-black text-mort-muted">עד תאריך</span><input type="date" className="focus-field min-h-11 rounded-2xl border border-slate-200 bg-white px-3 py-2 font-bold text-mort-ink" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label>
            <div className="flex items-end gap-2">
              <span className="text-sm font-bold text-mort-muted">{filteredLeads.length} / {leads.length} לידים</span>
            </div>
          </div>
          {message && <strong className="mt-4 block rounded-2xl bg-red-100 p-3 text-red-700">{message}</strong>}
        </section>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <section className="fintech-card mt-3 border-violet-200 bg-violet-50 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-black text-violet-800">{selectedIds.size} לידים נבחרו</span>
              <select className="focus-field min-h-11 rounded-2xl border border-slate-200 bg-white px-3 py-2 font-bold text-mort-ink" value={bulkAdvisorId} onChange={(e) => setBulkAdvisorId(e.target.value)}>
                <option value="">שייך ליועץ...</option>
                {advisors.filter((a) => a.active !== false).map((a) => <option key={a.advisor_id} value={a.advisor_id}>{a.name}</option>)}
              </select>
              <select className="focus-field min-h-11 rounded-2xl border border-slate-200 bg-white px-3 py-2 font-bold text-mort-ink" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                <option value="">שנה סטטוס...</option>
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button disabled={bulkSaving} onClick={bulkUpdate} className="rounded-2xl bg-violet-600 px-5 py-2 font-black text-white disabled:opacity-60" type="button">{bulkSaving ? "מעדכן..." : "החל על נבחרים"}</button>
              <button onClick={() => setSelectedIds(new Set())} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 font-black text-mort-ink" type="button">ביטול בחירה</button>
            </div>
          </section>
        )}

        {/* Select all row */}
        {filteredLeads.length > 0 && (
          <div className="mt-3 flex items-center gap-3 px-1">
            <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} className="h-5 w-5 cursor-pointer accent-violet-600" />
            <span className="text-sm font-bold text-mort-muted">{allFilteredSelected ? "בטל בחירת הכל" : "בחר את כל הלידים המוצגים"}</span>
          </div>
        )}

        <AdvisorManagement advisors={advisors} refreshLeads={loadLeads} setMessage={setMessage} />

        {/* Lead cards */}
        <section className="mt-5 grid gap-4">
          {filteredLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              statuses={statuses}
              commissionStatuses={commissionStatuses}
              advisors={advisors}
              updateLead={updateLead}
              selected={selectedIds.has(lead.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
          {!filteredLeads.length && (
            <div className="glass-card p-8 text-center font-black text-mort-muted">אין לידים להצגה.</div>
          )}
        </section>
      </div>
    </main>
  );
}

// ─── LeadCard ─────────────────────────────────────────────────────────────────

function LeadCard({ lead, statuses, commissionStatuses, advisors, updateLead, selected, onToggleSelect }) {
  const [draft, setDraft] = useState({
    assignedAdvisorId: lead.assignedAdvisorId || "",
    assignedAdvisor: lead.assignedAdvisor || "",
    advisorPhone: lead.advisorPhone || "",
    advisorEmail: lead.advisorEmail || "",
    leadStatus: lead.leadStatus || lead.status || "חדש",
    internalNotes: lead.internalNotes || lead.notes || "",
    followUpDate: lead.followUpDate || "",
    lastContactedAt: lead.lastContactedAt || "",
    commissionAmount: lead.commissionAmount || "",
    commissionStatus: lead.commissionStatus || "pending",
  });
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft({
      assignedAdvisorId: lead.assignedAdvisorId || "",
      assignedAdvisor: lead.assignedAdvisor || "",
      advisorPhone: lead.advisorPhone || "",
      advisorEmail: lead.advisorEmail || "",
      leadStatus: lead.leadStatus || lead.status || "חדש",
      internalNotes: lead.internalNotes || lead.notes || "",
      followUpDate: lead.followUpDate || "",
      lastContactedAt: lead.lastContactedAt || "",
      commissionAmount: lead.commissionAmount || "",
      commissionStatus: lead.commissionStatus || "pending",
    });
  }, [lead]);

  const advisorExists = !draft.assignedAdvisorId || advisors.some((a) => String(a.advisor_id) === String(draft.assignedAdvisorId));

  async function saveLead() {
    setIsSaving(true); setSaveMessage("");
    const result = await updateLead(lead.id, { ...draft, status: draft.leadStatus });
    setSaveMessage(result?.ok ? "הליד עודכן בהצלחה." : (result?.error || "שמירת הליד נכשלה."));
    setIsSaving(false);
  }

  async function markCommissionPaid() {
    setIsSaving(true); setSaveMessage("");
    const result = await updateLead(lead.id, { commissionStatus: "paid" });
    if (result?.ok) { setDraft((c) => ({ ...c, commissionStatus: "paid" })); setSaveMessage("העמלה סומנה כשולמה."); }
    else setSaveMessage(result?.error || "עדכון סטטוס העמלה נכשל.");
    setIsSaving(false);
  }

  return (
    <article className={`fintech-card p-5 sm:p-6 transition ${selected ? "ring-2 ring-violet-400 ring-offset-1" : ""}`}>
      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <div>
          <div className="flex flex-wrap items-start gap-3">
            <input type="checkbox" checked={selected} onChange={() => onToggleSelect(lead.id)} className="mt-1 h-5 w-5 cursor-pointer accent-violet-600 shrink-0" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-2xl font-black text-mort-ink">{lead.name || "ללא שם"}</h2>
                  <p className="font-bold text-mort-muted">{lead.phone} · {lead.city || "עיר לא צוינה"}</p>
                </div>
                <span className={`pill ${statusBadgeClass(draft.leadStatus)}`}>{draft.leadStatus}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Info label="סכום משכנתא" value={formatILS(lead.mortgageAmount)} />
                <Info label="סטטוס רכישה" value={lead.purchaseStatus || "לא צוין"} />
                <Info label="סיכוי אישור" value={`${Math.round(Number(lead.approvalScore) || 0)}%`} />
                <Info label="מקור" value={lead.source || "mortgai2"} />
                <Info label="נוצר" value={lead.createdAt ? new Date(lead.createdAt).toLocaleString("he-IL") : "—"} />
                {lead.utmSource && <Info label="UTM מקור" value={lead.utmSource} />}
                {lead.utmCampaign && <Info label="UTM קמפיין" value={lead.utmCampaign} />}
                {lead.mainIssue && (
                  <div className="surface-card col-span-2 p-3">
                    <span className="block text-xs font-black text-mort-muted">נקודת שיפור</span>
                    <strong className="mt-1 block font-bold text-amber-700">{lead.mainIssue}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <select className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink" value={draft.leadStatus} onChange={(e) => setDraft((c) => ({ ...c, leadStatus: e.target.value }))}>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs font-black text-mort-muted">Advisor ID</span>
              <select className="focus-field min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 font-bold text-mort-ink" value={draft.assignedAdvisorId} onChange={(e) => {
                const id = e.target.value;
                const a = advisors.find((a) => String(a.advisor_id) === id);
                setDraft((c) => ({ ...c, assignedAdvisorId: id, assignedAdvisor: a?.name || "", advisorPhone: a?.phone || "", advisorEmail: a?.email || "" }));
              }}>
                <option value="">בחר יועץ</option>
                {advisors.filter((a) => a.active !== false).map((a) => <option key={a.advisor_id} value={a.advisor_id}>{a.name} ({a.advisor_id})</option>)}
              </select>
            </label>
            <AdminInput label="שם יועץ" value={draft.assignedAdvisor} onChange={(v) => setDraft((c) => ({ ...c, assignedAdvisor: v }))} />
            <AdminInput label="טלפון יועץ" value={draft.advisorPhone} onChange={(v) => setDraft((c) => ({ ...c, advisorPhone: v }))} />
            <AdminInput label="אימייל יועץ" value={draft.advisorEmail} onChange={(v) => setDraft((c) => ({ ...c, advisorEmail: v }))} />
            <AdminInput label="סכום עמלה" value={draft.commissionAmount} onChange={(v) => setDraft((c) => ({ ...c, commissionAmount: v }))} />
            <AdminInput label="תאריך מעקב" type="date" value={draft.followUpDate?.slice(0, 10)} onChange={(v) => setDraft((c) => ({ ...c, followUpDate: v }))} />
          </div>
          {!advisorExists && <p className="rounded-2xl bg-amber-100 p-2 text-sm font-bold text-amber-800">לא נמצא Advisor ID כזה בטבלת היועצים.</p>}
          <AdminInput label="יצירת קשר אחרון" value={draft.lastContactedAt} onChange={(v) => setDraft((c) => ({ ...c, lastContactedAt: v }))} />
          <select className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink" value={draft.commissionStatus} onChange={(e) => setDraft((c) => ({ ...c, commissionStatus: e.target.value }))}>
            {commissionStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <textarea className="focus-field min-h-24 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink" value={draft.internalNotes} onChange={(e) => setDraft((c) => ({ ...c, internalNotes: e.target.value }))} placeholder="הערות" />
          {saveMessage && <strong className="rounded-2xl bg-slate-100 p-2 text-sm text-mort-ink">{saveMessage}</strong>}
          <div className="flex flex-wrap gap-2">
            <button disabled={isSaving} className="rounded-2xl bg-mort-ink px-4 py-2 font-black text-white disabled:opacity-60" onClick={saveLead} type="button">{isSaving ? "שומר..." : "עדכן ליד"}</button>
            <button disabled={isSaving} className="rounded-2xl bg-emerald-600 px-4 py-2 font-black text-white disabled:opacity-60" onClick={markCommissionPaid} type="button">עמלה שולמה</button>
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function Info({ label, value }) {
  return (
    <div className="surface-card p-3">
      <span className="block text-xs font-black text-mort-muted">{label}</span>
      <strong className="mt-1 block font-black text-mort-ink">{value}</strong>
    </div>
  );
}

function AdminStat({ label, value }) {
  return (
    <article className="fintech-card p-5">
      <span className="block text-sm font-black text-mort-muted">{label}</span>
      <strong className="number-display mt-2 block text-3xl font-black text-mort-ink">{value}</strong>
    </article>
  );
}

function AdminInput({ label, value, onChange, type = "text" }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-black text-mort-muted">{label}</span>
      <input className="focus-field min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 font-bold text-mort-ink" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function AdvisorManagement({ advisors, refreshLeads, setMessage }) {
  const [form, setForm] = useState({ advisorId: "", name: "", phone: "", email: "", commissionType: "fixed", commissionAmount: "", active: true });
  const [saving, setSaving] = useState(false);

  async function createNewAdvisor(event) {
    event.preventDefault();
    setSaving(true); setMessage("");
    const res = await fetch("/api/admin/advisors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setMessage(adminApiMessage(json.error) || json.message || "יצירת יועץ נכשלה"); setSaving(false); return; }
    setForm({ advisorId: "", name: "", phone: "", email: "", commissionType: "fixed", commissionAmount: "", active: true });
    await refreshLeads();
    setMessage("היועץ נוצר בהצלחה.");
    setSaving(false);
  }

  return (
    <section className="fintech-card mt-5 p-6 sm:p-8">
      <h2 className="text-2xl font-black text-mort-ink">ניהול יועצים</h2>
      <p className="mt-1 font-bold text-mort-muted">צפייה, יצירה וניהול יועצים ישירות מממשק האדמין.</p>
      <form onSubmit={createNewAdvisor} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AdminInput label="Advisor ID" value={form.advisorId} onChange={(v) => setForm((c) => ({ ...c, advisorId: v }))} />
        <AdminInput label="שם" value={form.name} onChange={(v) => setForm((c) => ({ ...c, name: v }))} />
        <AdminInput label="טלפון" value={form.phone} onChange={(v) => setForm((c) => ({ ...c, phone: v }))} />
        <AdminInput label="אימייל" value={form.email} onChange={(v) => setForm((c) => ({ ...c, email: v }))} />
        <AdminInput label="סוג עמלה" value={form.commissionType} onChange={(v) => setForm((c) => ({ ...c, commissionType: v }))} />
        <AdminInput label="סכום עמלה" value={form.commissionAmount} onChange={(v) => setForm((c) => ({ ...c, commissionAmount: v }))} />
        <label className="grid gap-1">
          <span className="text-xs font-black text-mort-muted">סטטוס</span>
          <select className="focus-field min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 font-bold text-mort-ink" value={String(form.active)} onChange={(e) => setForm((c) => ({ ...c, active: e.target.value === "true" }))}>
            <option value="true">פעיל</option>
            <option value="false">לא פעיל</option>
          </select>
        </label>
        <button disabled={saving} className="rounded-2xl bg-mort-ink px-5 py-3 font-black text-white shadow-soft disabled:opacity-60" type="submit">{saving ? "שומר..." : "יצירת יועץ"}</button>
      </form>
      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full text-right">
          <thead><tr className="text-sm text-mort-muted"><th className="pb-2">advisorId</th><th className="pb-2">name</th><th className="pb-2">phone</th><th className="pb-2">email</th><th className="pb-2">active</th><th className="pb-2">commission type</th><th className="pb-2">commission amount</th></tr></thead>
          <tbody>{advisors.map((a) => <tr key={a.advisor_id} className="border-t"><td className="py-2 font-black">{a.advisor_id}</td><td>{a.name}</td><td>{a.phone}</td><td>{a.email}</td><td>{a.active ? "פעיל" : "לא פעיל"}</td><td>{a.commission_type}</td><td>{a.commission_amount}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
