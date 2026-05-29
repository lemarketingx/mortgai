import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { formatILS } from "../lib/format";

const DEFAULT_STATUSES = ["חדש", "נשלח ליועץ", "בטיפול", "אושר עקרונית", "נסגר", "לא רלוונטי"];
const DEFAULT_COMMISSION_STATUSES = ["pending", "invoiced", "paid"];
const LEAD_QUALITIES = ["", "חם", "בינוני", "חלש", "לא סווג"];
const LEAD_PRIORITIES = ["", "גבוה", "רגיל", "נמוך"];
const FOLLOW_UP_STAGES = ["לא טופל", "ניסיון 1", "ניסיון 2", "נקבעה שיחה", "נשלחו מסמכים", "ממתין ללקוח", "נסגר"];

function getAdminErrorMessage(code, fallback = "") {
  const messages = {
    ADMIN_AUTH_REQUIRED: "החיבור לאדמין פג או לא קיים. יש להתחבר מחדש.",
    ADMIN_AUTH_NOT_CONFIGURED: "חסר ADMIN_SESSION_SECRET ב־Vercel.",
    SUPABASE_ENV_MISSING: "חסרים משתני Supabase ב־Vercel: SUPABASE_URL או SUPABASE_SERVICE_KEY.",
    SUPABASE_URL_INVALID: "כתובת Supabase לא תקינה. שים SUPABASE_URL בלי ‎/rest/v1 ובלי / בסוף.",
    SUPABASE_READ_FAILED: "שגיאת קריאה מ־Supabase. בדוק שהטבלה leads קיימת והעמודות תואמות.",
    SUPABASE_UPDATE_FAILED: "שגיאת עדכון ב־Supabase. בדוק הרשאות ועמודות בטבלה.",
    LEADS_READ_FAILED: "לא ניתן לטעון את הלידים כרגע.",
    LEAD_UPDATE_FAILED: "לא ניתן לעדכן את הליד כרגע.",
    LEAD_NOT_FOUND: "הליד לא נמצא במסד הנתונים.",
    LEAD_DELETE_FAILED: "לא ניתן למחוק את הליד כרגע.",
    ADVISOR_CREATE_FAILED: "לא ניתן ליצור יועץ כרגע.",
    ADVISOR_ID_EXISTS: "מזהה היועץ כבר קיים.",
    METHOD_NOT_ALLOWED: "פעולה לא נתמכת.",
  };
  return messages[code] || fallback || "אירעה שגיאה לא צפויה.";
}

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function normalizeSearchText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function qualityClasses(quality) {
  if (quality === "חם") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (quality === "בינוני") return "border-amber-200 bg-amber-50 text-amber-800";
  if (quality === "חלש") return "border-red-200 bg-red-50 text-red-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function statusClasses(status) {
  const current = status || "חדש";
  if (current === "חדש") return "border-blue-200 bg-blue-50 text-blue-800";
  if (current === "נשלח ליועץ") return "border-violet-200 bg-violet-50 text-violet-800";
  if (current === "בטיפול") return "border-amber-200 bg-amber-50 text-amber-800";
  if (current === "אושר עקרונית") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (current === "נסגר") return "border-green-300 bg-green-100 text-green-900";
  if (current === "לא רלוונטי") return "border-slate-200 bg-slate-100 text-slate-500";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function advisorName(advisor) {
  return advisor?.name || advisor?.advisor_name || advisor?.advisorId || advisor?.advisor_id || "";
}

function advisorId(advisor) {
  return advisor?.advisor_id || advisor?.advisorId || advisorName(advisor);
}

function advisorPhone(advisor) {
  return advisor?.phone || advisor?.advisor_phone || "";
}

function advisorEmail(advisor) {
  return advisor?.email || advisor?.advisor_email || "";
}

function Field({ label, children }) {
  return <label className="block"><span className="mb-1 block text-xs font-black text-mort-muted">{label}</span>{children}</label>;
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return <Field label={label}><input type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder || label} className="focus-field min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-mort-ink" /></Field>;
}

function Select({ label, value, onChange, options, allowEmpty = false }) {
  return <Field label={label}><select value={value || ""} onChange={(event) => onChange(event.target.value)} className="focus-field min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-mort-ink">{allowEmpty && <option value="">הכל</option>}{options.map((option) => <option key={option} value={option}>{option || "הכל"}</option>)}</select></Field>;
}

function Metric({ label, value, sub }) {
  return <div className="surface-card p-4"><span className="block text-xs font-black text-mort-muted">{label}</span><strong className="number-display mt-1 block text-xl font-black text-mort-ink">{value}</strong>{sub && <span className="mt-1 block text-xs font-bold text-mort-muted">{sub}</span>}</div>;
}

function Detail({ label, value }) {
  return <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3"><span className="block text-xs font-black text-mort-muted">{label}</span><strong className="mt-1 block break-words text-sm font-black text-mort-ink">{value || "-"}</strong></div>;
}

function Bar({ label, value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return <div><div className="mb-1 flex justify-between text-xs font-black text-mort-muted"><span>{label}</span><span>{value} · {pct}%</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-mort-ink" style={{ width: `${pct}%` }} /></div></div>;
}

export default function AdminCrm() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [leads, setLeads] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [statuses, setStatuses] = useState(DEFAULT_STATUSES);
  const [commissionStatuses, setCommissionStatuses] = useState(DEFAULT_COMMISSION_STATUSES);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [qualityFilter, setQualityFilter] = useState("");
  const [advisorFilter, setAdvisorFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAdvisorId, setBulkAdvisorId] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [newAdvisor, setNewAdvisor] = useState({ advisorId: "", name: "", phone: "", email: "", commissionType: "lead", commissionAmount: "" });

  const filteredLeads = useMemo(() => {
    const term = normalizeSearchText(query);
    return leads.filter((lead) => {
      const leadStatus = lead.leadStatus || lead.status || "חדש";
      const quality = lead.leadQuality || "לא סווג";
      const priority = lead.leadPriority || "רגיל";
      const leadAdvisorId = lead.assignedAdvisorId || lead.assignedAdvisor || "";
      const searchable = normalizeSearchText([lead.name, lead.phone, lead.city, lead.source, lead.utmSource, lead.utmCampaign, lead.assignedAdvisor, lead.propertyCity].join(" "));
      return (!statusFilter || leadStatus === statusFilter)
        && (!qualityFilter || quality === qualityFilter)
        && (!priorityFilter || priority === priorityFilter)
        && (!advisorFilter || leadAdvisorId === advisorFilter || lead.assignedAdvisor === advisorFilter)
        && (!term || searchable.includes(term));
    });
  }, [leads, query, statusFilter, qualityFilter, priorityFilter, advisorFilter]);

  const stats = useMemo(() => {
    const total = leads.length;
    const hot = leads.filter((lead) => lead.leadQuality === "חם").length;
    const medium = leads.filter((lead) => lead.leadQuality === "בינוני").length;
    const weak = leads.filter((lead) => lead.leadQuality === "חלש").length;
    const open = leads.filter((lead) => !["נסגר", "לא רלוונטי"].includes(lead.leadStatus || lead.status || "חדש")).length;
    const closed = leads.filter((lead) => (lead.leadStatus || lead.status) === "נסגר").length;
    const assigned = leads.filter((lead) => lead.assignedAdvisor || lead.assignedAdvisorId).length;
    const today = new Date().toDateString();
    const todayCount = leads.filter((lead) => lead.createdAt && new Date(lead.createdAt).toDateString() === today).length;
    const closeRate = total > 0 ? Math.round((closed / total) * 100) : 0;
    return { total, hot, medium, weak, open, closed, assigned, todayCount, closeRate };
  }, [leads]);

  const advisorStats = useMemo(() => advisors.map((advisor) => {
    const id = advisorId(advisor);
    const name = advisorName(advisor);
    const count = leads.filter((lead) => lead.assignedAdvisorId === id || lead.assignedAdvisor === name).length;
    return { id, name, count };
  }).filter((item) => item.name), [advisors, leads]);

  useEffect(() => { loadLeads({ silent: true }); }, []);

  function showMessage(text, type = "info") { setMessage(text || ""); setMessageType(type); }

  async function loadLeads({ silent = false } = {}) {
    if (!silent) showMessage("", "info");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/leads", { method: "GET" });
      const json = await response.json().catch(() => ({}));
      if (response.status === 401) { setIsAuthenticated(false); if (!silent) showMessage("יש להתחבר מחדש.", "error"); return; }
      if (!response.ok) throw new Error(getAdminErrorMessage(json.error, json.message));
      setLeads(Array.isArray(json.leads) ? json.leads : []);
      setAdvisors(Array.isArray(json.advisors) ? json.advisors : []);
      setStatuses(Array.isArray(json.statuses) && json.statuses.length ? json.statuses : DEFAULT_STATUSES);
      setCommissionStatuses(Array.isArray(json.commissionStatuses) && json.commissionStatuses.length ? json.commissionStatuses : DEFAULT_COMMISSION_STATUSES);
      setIsAuthenticated(true);
      if (!silent) showMessage("הלידים נטענו בהצלחה.", "success");
    } catch (error) {
      showMessage(error.message || "לא ניתן לטעון את ה־CRM.", "error");
    } finally { setLoading(false); }
  }

  async function login(event) {
    event.preventDefault();
    showMessage("", "info");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(getAdminErrorMessage(json.error, json.message || "סיסמה שגויה או שגיאת התחברות."));
      setPassword("");
      await loadLeads();
    } catch (error) { setIsAuthenticated(false); showMessage(error.message || "שגיאת התחברות", "error"); }
    finally { setLoading(false); }
  }

  async function patchLead(id, changes) {
    setSavingId(id);
    showMessage("", "info");
    try {
      const response = await fetch("/api/admin/leads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, changes }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(getAdminErrorMessage(json.error, json.message));
      if (json.lead) setLeads((current) => current.map((lead) => (lead.id === id ? json.lead : lead)));
      showMessage("הליד עודכן.", "success");
    } catch (error) { showMessage(error.message || "העדכון נכשל.", "error"); }
    finally { setSavingId(""); }
  }

  async function bulkPatch(changes) {
    if (selectedIds.length === 0) { showMessage("בחר לפחות ליד אחד.", "error"); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/admin/leads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selectedIds, changes }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(getAdminErrorMessage(json.error, json.message));
      showMessage(`עודכנו ${json.updated || selectedIds.length} לידים.${json.failed ? ` נכשלו ${json.failed}.` : ""}`, "success");
      setSelectedIds([]);
      await loadLeads({ silent: true });
    } catch (error) { showMessage(error.message || "עדכון מרוכז נכשל.", "error"); }
    finally { setLoading(false); }
  }

  async function bulkAssignAdvisor() {
    const advisor = advisors.find((item) => advisorId(item) === bulkAdvisorId);
    if (!advisor) { showMessage("בחר יועץ לשיוך.", "error"); return; }
    await bulkPatch({
      assignedAdvisorId: advisorId(advisor),
      assignedAdvisor: advisorName(advisor),
      advisorPhone: advisorPhone(advisor),
      advisorEmail: advisorEmail(advisor),
      leadStatus: "נשלח ליועץ",
      status: "נשלח ליועץ",
    });
    setBulkAdvisorId("");
  }

  async function deleteSingleLead(id) {
    const confirmed = window.confirm("האם למחוק את הליד לצמיתות?");
    if (!confirmed) return;
    setSavingId(id);
    showMessage("", "info");
    try {
      const response = await fetch("/api/admin/leads", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(getAdminErrorMessage(json.error, json.message));
      setLeads((current) => current.filter((lead) => lead.id !== id));
      setSelectedIds((current) => current.filter((item) => item !== id));
      showMessage("הליד נמחק בהצלחה.", "success");
    } catch (error) {
      showMessage(error.message || "מחיקת הליד נכשלה.", "error");
    } finally {
      setSavingId("");
    }
  }

  async function bulkDeleteLeads() {
    if (!selectedIds.length) { showMessage("בחר לפחות ליד אחד.", "error"); return; }
    const confirmed = window.confirm("האם למחוק את הלידים לצמיתות?");
    if (!confirmed) return;
    setLoading(true);
    showMessage("", "info");
    try {
      const response = await fetch("/api/admin/leads", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selectedIds }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(getAdminErrorMessage(json.error, json.message));
      const selectedSet = new Set(selectedIds);
      setLeads((current) => current.filter((lead) => !selectedSet.has(lead.id)));
      setSelectedIds([]);
      showMessage(`נמחקו ${json.deleted || 0} לידים.${json.failed ? ` נכשלו ${json.failed}.` : ""}`, "success");
    } catch (error) {
      showMessage(error.message || "מחיקה מרוכזת נכשלה.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function createAdvisor(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = { ...newAdvisor, advisorId: newAdvisor.advisorId || newAdvisor.phone || newAdvisor.name };
      const response = await fetch("/api/admin/advisors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(getAdminErrorMessage(json.error, json.message));
      setNewAdvisor({ advisorId: "", name: "", phone: "", email: "", commissionType: "lead", commissionAmount: "" });
      showMessage("יועץ נוסף בהצלחה.", "success");
      await loadLeads({ silent: true });
    } catch (error) { showMessage(error.message || "יצירת יועץ נכשלה.", "error"); }
    finally { setLoading(false); }
  }

  function toggleSelected(id) { setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  function toggleSelectAll() { setSelectedIds((current) => current.length === filteredLeads.length ? [] : filteredLeads.map((lead) => lead.id)); }

  const messageClass = messageType === "error" ? "border-red-200 bg-red-50 text-red-800" : messageType === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-blue-200 bg-blue-50 text-blue-800";

  if (!isAuthenticated) {
    return <main dir="rtl" className="min-h-screen px-4 py-8 text-mort-text sm:px-6 lg:px-8"><Head><title>Admin CRM | Finzo</title><meta name="robots" content="noindex,nofollow" /></Head><section className="mx-auto max-w-xl glass-card p-6 sm:p-8"><span className="pill border-emerald-200 bg-emerald-50 text-emerald-800">CRM פרטי</span><h1 className="mt-4 text-3xl font-black text-mort-ink">כניסת אדמין</h1><p className="mt-2 text-sm font-bold text-mort-muted">התחברות לניהול לידים, סטטוסים, יועצים ועמלות.</p><form className="mt-6 grid gap-3" onSubmit={login}><input className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="סיסמת אדמין" autoComplete="current-password" /><button disabled={loading} className="rounded-2xl bg-mort-ink px-5 py-3 font-black text-white disabled:opacity-60" type="submit">{loading ? "מתחבר..." : "כניסה ל־CRM"}</button></form>{message && <div className={`mt-4 rounded-2xl border p-3 text-sm font-black ${messageClass}`}>{message}</div>}</section></main>;
  }

  return <main dir="rtl" className="min-h-screen px-4 py-6 text-mort-text sm:px-6 lg:px-8"><Head><title>Admin CRM | Finzo</title><meta name="robots" content="noindex,nofollow" /></Head><div className="mx-auto w-full max-w-[1560px]">
    <section className="glass-card p-5 sm:p-7"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><span className="pill border-slate-200 bg-white text-mort-muted">Admin CRM</span><h1 className="mt-3 text-3xl font-black text-mort-ink sm:text-4xl">ניהול לידים ויועצים</h1><p className="mt-2 max-w-2xl text-sm font-bold text-mort-muted">שיוך מרוכז, דירוג איכות, מעקב, סינון וגרפים בסיסיים.</p></div><button disabled={loading} onClick={() => loadLeads()} className="rounded-2xl bg-mort-ink px-5 py-3 font-black text-white disabled:opacity-60" type="button">{loading ? "טוען..." : "רענון לידים"}</button></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric label="סה״כ לידים" value={stats.total} /><Metric label="לידים חמים" value={stats.hot} /><Metric label="פתוחים" value={stats.open} /><Metric label="משויכים" value={stats.assigned} /><Metric label="יחס סגירה" value={`${stats.closeRate}%`} /></div>
    <div className="mt-5 grid gap-4 lg:grid-cols-3"><div className="fintech-card p-4"><h3 className="font-black text-mort-ink">איכות לידים</h3><div className="mt-3 grid gap-3"><Bar label="חם" value={stats.hot} total={stats.total} /><Bar label="בינוני" value={stats.medium} total={stats.total} /><Bar label="חלש" value={stats.weak} total={stats.total} /></div></div><div className="fintech-card p-4"><h3 className="font-black text-mort-ink">לפי יועץ</h3><div className="mt-3 grid gap-3">{advisorStats.length ? advisorStats.map((item) => <Bar key={item.id} label={item.name} value={item.count} total={stats.total} />) : <p className="text-sm font-bold text-mort-muted">עדיין אין יועצים.</p>}</div></div><div className="fintech-card p-4"><h3 className="font-black text-mort-ink">סטטוס טיפול</h3><div className="mt-3 grid gap-3"><Bar label="פתוחים" value={stats.open} total={stats.total} /><Bar label="נסגרו" value={stats.closed} total={stats.total} /><Bar label="היום" value={stats.todayCount} total={stats.total} /></div></div></div>
    <div className="mt-5 grid gap-3 lg:grid-cols-5"><input className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink lg:col-span-2" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש לפי שם, טלפון, עיר, מקור או יועץ" /><Select label="סטטוס" value={statusFilter} onChange={setStatusFilter} options={statuses} allowEmpty /><Select label="איכות" value={qualityFilter} onChange={setQualityFilter} options={LEAD_QUALITIES} /><Select label="עדיפות" value={priorityFilter} onChange={setPriorityFilter} options={LEAD_PRIORITIES} /></div>
    <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_240px_180px]"><select className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink" value={advisorFilter} onChange={(event) => setAdvisorFilter(event.target.value)}><option value="">כל היועצים</option>{advisors.map((advisor) => <option key={advisorId(advisor)} value={advisorId(advisor)}>{advisorName(advisor)}</option>)}</select><select className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink" value={bulkAdvisorId} onChange={(event) => setBulkAdvisorId(event.target.value)}><option value="">בחר יועץ לשיוך</option>{advisors.map((advisor) => <option key={advisorId(advisor)} value={advisorId(advisor)}>{advisorName(advisor)}</option>)}</select><button type="button" onClick={bulkAssignAdvisor} disabled={loading || selectedIds.length === 0} className="rounded-2xl bg-violet-700 px-5 py-3 font-black text-white disabled:opacity-50">שייך {selectedIds.length || ""} לידים</button></div>
    {message && <div className={`mt-4 rounded-2xl border p-3 text-sm font-black ${messageClass}`}>{message}</div>}</section>

    <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_380px]"><div className="grid gap-4"><div className="fintech-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><label className="flex items-center gap-2 text-sm font-black text-mort-ink"><input type="checkbox" checked={filteredLeads.length > 0 && selectedIds.length === filteredLeads.length} onChange={toggleSelectAll} /> בחר הכל ({filteredLeads.length})</label><div className="flex flex-wrap gap-2"><button type="button" onClick={() => bulkPatch({ leadQuality: "חם", leadPriority: "גבוה" })} disabled={!selectedIds.length} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800 disabled:opacity-50">סמן חם</button><button type="button" onClick={() => bulkPatch({ followUpStage: "ניסיון 1" })} disabled={!selectedIds.length} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-black text-amber-800 disabled:opacity-50">מעקב ניסיון 1</button><button type="button" onClick={() => bulkPatch({ leadStatus: "לא רלוונטי", status: "לא רלוונטי" })} disabled={!selectedIds.length} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700 disabled:opacity-50">לא רלוונטי</button><button type="button" onClick={bulkDeleteLeads} disabled={!selectedIds.length || loading} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-black text-red-700 disabled:opacity-50">מחק נבחרים</button></div></div>
    {!loading && filteredLeads.length === 0 && <div className="fintech-card p-8 text-center"><h2 className="text-2xl font-black text-mort-ink">אין לידים להצגה</h2><p className="mt-2 font-bold text-mort-muted">שנה סינון או בדוק שהלידים נשמרים ב־Supabase.</p></div>}
    {filteredLeads.map((lead) => { const leadStatus = lead.leadStatus || lead.status || "חדש"; const isSaving = savingId === lead.id; const quality = lead.leadQuality || "לא סווג"; return <article key={lead.id} className="fintech-card overflow-hidden p-5 sm:p-6"><div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between"><div className="flex gap-3"><input className="mt-2" type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => toggleSelected(lead.id)} /><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-black text-mort-ink">{lead.name || "ליד ללא שם"}</h2><span className={`pill ${statusClasses(leadStatus)}`}>{leadStatus}</span><span className={`pill ${qualityClasses(quality)}`}>{quality}</span>{isSaving && <span className="pill border-amber-200 bg-amber-50 text-amber-800">שומר...</span>}</div><p className="mt-1 text-sm font-bold text-mort-muted">נוצר: {formatDate(lead.createdAt)} · יועץ: {lead.assignedAdvisor || "לא שויך"}</p></div></div><div className="flex items-center gap-2"><a className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-center font-black text-mort-ink" href={lead.phone ? `tel:${lead.phone}` : undefined}>חיוג</a><button type="button" onClick={() => deleteSingleLead(lead.id)} className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-center font-black text-red-700">מחק ליד</button></div></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Detail label="טלפון" value={lead.phone} /><Detail label="עיר" value={lead.city} /><Detail label="משכנתא" value={formatILS(toNumber(lead.mortgageAmount))} /><Detail label="סיכוי אישור" value={lead.approvalScore || lead.estimatedApprovalResult ? `${lead.approvalScore || lead.estimatedApprovalResult}%` : "-"} /><Detail label="הכנסה" value={lead.monthlyIncome ? formatILS(toNumber(lead.monthlyIncome)) : "-"} /><Detail label="הון עצמי" value={lead.equityAmount ? formatILS(toNumber(lead.equityAmount)) : "-"} /><Detail label="סטטוס חוזה" value={lead.contractStatus || lead.purchaseStatus} /><Detail label="מועד חזרה" value={lead.requestedContactTime} /></div><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Select label="סטטוס" value={leadStatus} options={statuses} onChange={(value) => patchLead(lead.id, { leadStatus: value, status: value })} /><Select label="איכות" value={quality} options={LEAD_QUALITIES.filter(Boolean)} onChange={(value) => patchLead(lead.id, { leadQuality: value })} /><Select label="שלב מעקב" value={lead.followUpStage || "לא טופל"} options={FOLLOW_UP_STAGES} onChange={(value) => patchLead(lead.id, { followUpStage: value })} /><Input label="תאריך מעקב" type="date" value={lead.followUpDate} onChange={(value) => patchLead(lead.id, { followUpDate: value })} /><Input label="שם יועץ" value={lead.assignedAdvisor} onChange={(value) => patchLead(lead.id, { assignedAdvisor: value })} /><Input label="טלפון יועץ" value={lead.advisorPhone} onChange={(value) => patchLead(lead.id, { advisorPhone: value })} /><Input label="עמלה" value={lead.expectedCommission || lead.commissionAmount} onChange={(value) => patchLead(lead.id, { expectedCommission: value, commissionAmount: value })} /><Select label="סטטוס עמלה" value={lead.commissionStatus || "pending"} options={commissionStatuses} onChange={(value) => patchLead(lead.id, { commissionStatus: value })} /></div><textarea className="focus-field mt-4 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-mort-ink" defaultValue={lead.internalNotes || ""} onBlur={(event) => { if (event.target.value !== (lead.internalNotes || "")) patchLead(lead.id, { internalNotes: event.target.value }); }} placeholder="הערות פנימיות לצוות" /></article>; })}</div>
    <aside className="grid content-start gap-4"><section className="fintech-card p-5"><h2 className="text-xl font-black text-mort-ink">הוספת יועץ</h2><form className="mt-4 grid gap-3" onSubmit={createAdvisor}><Input label="שם יועץ" value={newAdvisor.name} onChange={(value) => setNewAdvisor((c) => ({ ...c, name: value, advisorId: c.advisorId || value }))} /><Input label="טלפון" value={newAdvisor.phone} onChange={(value) => setNewAdvisor((c) => ({ ...c, phone: value }))} /><Input label="אימייל" value={newAdvisor.email} onChange={(value) => setNewAdvisor((c) => ({ ...c, email: value }))} /><Input label="עמלה" value={newAdvisor.commissionAmount} onChange={(value) => setNewAdvisor((c) => ({ ...c, commissionAmount: value }))} /><button className="rounded-2xl bg-mort-ink px-5 py-3 font-black text-white" type="submit" disabled={loading}>הוסף יועץ</button></form></section><section className="fintech-card p-5"><h2 className="text-xl font-black text-mort-ink">יועצים קיימים</h2><div className="mt-4 grid gap-3">{advisors.length ? advisors.map((advisor) => <div key={advisorId(advisor)} className="rounded-2xl border border-slate-200 bg-white p-3"><strong className="block text-mort-ink">{advisorName(advisor)}</strong><span className="block text-sm font-bold text-mort-muted">{advisorPhone(advisor)}</span><span className="block text-sm font-bold text-mort-muted">{advisorEmail(advisor)}</span></div>) : <p className="text-sm font-bold text-mort-muted">אין יועצים עדיין.</p>}</div></section></aside></section>
  </div></main>;
}
