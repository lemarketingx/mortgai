import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { formatILS } from "../lib/format";

const DEFAULT_STATUSES = ["חדש", "נשלח ליועץ", "בטיפול", "אושר עקרונית", "נסגר", "לא רלוונטי"];
const DEFAULT_COMMISSION_STATUSES = ["pending", "invoiced", "paid"];
const LEAD_QUALITIES = ["", "חם", "בינוני", "חלש", "לא סווג"];
const LEAD_PRIORITIES = ["", "גבוה", "רגיל", "נמוך"];
const FOLLOW_UP_STAGES = ["לא טופל", "ניסיון 1", "ניסיון 2", "נקבעה שיחה", "נשלחו מסמכים", "ממתין ללקוח", "נסגר"];

const NAV_ITEMS = [
  { id: "dashboard", label: "דשבורד", icon: "◈" },
  { id: "all", label: "כל הלידים", icon: "≡" },
  { id: "hot", label: "לידים חמים", icon: "◆" },
  { id: "unassigned", label: "לא משויכים", icon: "○" },
  { id: "advisors", label: "יועצים", icon: "◇" },
  { id: "commissions", label: "עמלות", icon: "₪" },
];

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

function formatDateShort(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(date);
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

function qualityDot(quality) {
  if (quality === "חם") return "bg-emerald-500";
  if (quality === "בינוני") return "bg-amber-400";
  if (quality === "חלש") return "bg-red-400";
  return "bg-slate-300";
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

function Detail({ label, value }) {
  return <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3"><span className="block text-xs font-black text-mort-muted">{label}</span><strong className="mt-1 block break-words text-sm font-black text-mort-ink">{value || "-"}</strong></div>;
}

function Bar({ label, value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return <div><div className="mb-1 flex justify-between text-xs font-black text-mort-muted"><span>{label}</span><span>{value} · {pct}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-finzo-cobalt" style={{ width: `${pct}%` }} /></div></div>;
}

function KpiCard({ label, value, sub, accent }) {
  const accentMap = {
    blue: "border-finzo-cobalt/30 bg-finzo-cobalt-l/40",
    green: "border-emerald-200 bg-emerald-50/60",
    amber: "border-amber-200 bg-amber-50/60",
    red: "border-red-200 bg-red-50/60",
    slate: "border-slate-200 bg-white",
  };
  const base = accentMap[accent] || accentMap.slate;
  return (
    <div className={`rounded-2xl border p-4 shadow-e-1 ${base}`}>
      <span className="block text-xs font-bold text-mort-muted">{label}</span>
      <strong className="mt-1.5 block font-number text-2xl font-black text-mort-ink">{value}</strong>
      {sub && <span className="mt-1 block text-xs font-bold text-mort-muted">{sub}</span>}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="text-xs font-black uppercase tracking-widest text-mort-muted">{children}</h2>;
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
  const [activeSection, setActiveSection] = useState("all");
  const [expandedLeadId, setExpandedLeadId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sectionLeads = useMemo(() => {
    if (activeSection === "hot") return leads.filter((l) => l.leadQuality === "חם");
    if (activeSection === "unassigned") return leads.filter((l) => !l.assignedAdvisor && !l.assignedAdvisorId);
    if (activeSection === "commissions") return leads.filter((l) => l.commissionStatus || l.expectedCommission || l.commissionAmount);
    return leads;
  }, [leads, activeSection]);

  const filteredLeads = useMemo(() => {
    const term = normalizeSearchText(query);
    return sectionLeads.filter((lead) => {
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
  }, [sectionLeads, query, statusFilter, qualityFilter, priorityFilter, advisorFilter]);

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
  function clearFilters() { setQuery(""); setStatusFilter(""); setQualityFilter(""); setPriorityFilter(""); setAdvisorFilter(""); }
  const hasFilters = query || statusFilter || qualityFilter || priorityFilter || advisorFilter;

  const messageClass = messageType === "error"
    ? "border-red-200 bg-red-50 text-red-800"
    : messageType === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-blue-200 bg-blue-50 text-blue-800";

  if (!isAuthenticated) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-finzo-paper px-4 py-12">
        <Head><title>Admin Back Office | FINZO</title><meta name="robots" content="noindex,nofollow" /></Head>
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <span className="inline-block rounded-full border border-finzo-line bg-white px-4 py-1.5 text-xs font-black tracking-widest text-finzo-ink-3 uppercase">FINZO</span>
            <h1 className="mt-4 text-3xl font-black text-finzo-ink">Back Office</h1>
            <p className="mt-2 text-sm font-bold text-mort-muted">מערכת ניהול לידים ויועצים — גישה מורשית בלבד</p>
          </div>
          <div className="rounded-3xl border border-finzo-line bg-white p-8 shadow-e-3">
            <form className="grid gap-4" onSubmit={login}>
              <div>
                <label className="mb-1.5 block text-xs font-black text-mort-muted">סיסמת כניסה</label>
                <input
                  className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-mort-ink focus:border-finzo-cobalt focus:bg-white focus:outline-none focus:ring-2 focus:ring-finzo-cobalt/20"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="הזן סיסמה"
                  autoComplete="current-password"
                />
              </div>
              <button
                disabled={loading}
                className="min-h-12 rounded-2xl bg-finzo-ink px-5 py-3 font-black text-white transition-opacity disabled:opacity-60"
                type="submit"
              >
                {loading ? "מתחבר..." : "כניסה למערכת"}
              </button>
            </form>
            {message && (
              <div className={`mt-4 rounded-2xl border p-3 text-sm font-bold ${messageClass}`}>{message}</div>
            )}
          </div>
          <p className="mt-6 text-center text-xs font-bold text-mort-muted">FINZO Admin · Back Office v1</p>
        </div>
      </main>
    );
  }

  const showDashboard = activeSection === "dashboard";
  const showAdvisors = activeSection === "advisors";
  const showLeads = !showDashboard && !showAdvisors;

  return (
    <div dir="rtl" className="flex min-h-screen bg-finzo-paper text-mort-text">
      <Head><title>Admin Back Office | FINZO</title><meta name="robots" content="noindex,nofollow" /></Head>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — right side in RTL */}
      <aside className={`fixed inset-y-0 right-0 z-30 flex w-60 flex-col border-l border-finzo-line bg-white shadow-e-3 transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 lg:shadow-none ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}>
        <div className="border-b border-finzo-line px-5 py-5">
          <span className="block text-xs font-black tracking-widest text-finzo-cobalt uppercase">FINZO</span>
          <span className="mt-0.5 block text-base font-black text-finzo-ink">Back Office</span>
          <span className="mt-0.5 block text-xs font-bold text-mort-muted">ניהול לידים ומכירות</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-2 text-xs font-black uppercase tracking-widest text-mort-muted">תפריט ראשי</p>
          <ul className="grid gap-0.5">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-black transition-colors ${activeSection === item.id ? "bg-finzo-cobalt-l text-finzo-cobalt" : "text-mort-text hover:bg-finzo-paper"}`}
                >
                  <span className="w-5 text-center text-base leading-none">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.id === "hot" && stats.hot > 0 && (
                    <span className="mr-auto rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-black text-emerald-800">{stats.hot}</span>
                  )}
                  {item.id === "unassigned" && (stats.total - stats.assigned) > 0 && (
                    <span className="mr-auto rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-black text-amber-800">{stats.total - stats.assigned}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-finzo-line px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-bold text-mort-muted">מערכת פעילה</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Top header */}
        <header className="sticky top-0 z-10 border-b border-finzo-line bg-white/95 backdrop-blur-sm">
          <div className="flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-xl border border-finzo-line bg-white p-2 text-mort-muted shadow-e-1 lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
              <div>
                <h1 className="text-base font-black text-finzo-ink leading-tight">
                  {NAV_ITEMS.find((n) => n.id === activeSection)?.label || "ניהול לידים"}
                </h1>
                <p className="text-xs font-bold text-mort-muted">FINZO · ניהול לידים, יועצים ומכירות</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-1.5 rounded-full border border-finzo-line bg-finzo-paper px-3 py-1.5 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs font-bold text-mort-muted">מחובר</span>
              </div>
              <button
                disabled={loading}
                onClick={() => loadLeads()}
                className="rounded-xl border border-finzo-line bg-white px-4 py-2 text-sm font-black text-mort-ink shadow-e-1 hover:bg-finzo-paper disabled:opacity-60 transition-colors"
                type="button"
              >
                {loading ? "טוען..." : "רענון"}
              </button>
            </div>
          </div>
        </header>

        {/* System message banner */}
        {message && (
          <div className={`mx-5 mt-4 rounded-2xl border px-4 py-3 text-sm font-bold ${messageClass}`}>
            {message}
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-5">

          {/* ── Dashboard section ── */}
          {showDashboard && (
            <div className="grid gap-6">
              <div>
                <SectionTitle>מדדים עיקריים</SectionTitle>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <KpiCard label="סה״כ לידים" value={stats.total} accent="slate" />
                  <KpiCard label="לידים חדשים היום" value={stats.todayCount} sub="תוך 24 שעות" accent="blue" />
                  <KpiCard label="לידים חמים" value={stats.hot} accent="green" />
                  <KpiCard label="לידים פתוחים" value={stats.open} accent="amber" />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <KpiCard label="משויכים ליועץ" value={stats.assigned} accent="blue" />
                  <KpiCard label="נסגרו" value={stats.closed} accent="green" />
                  <KpiCard label="יחס סגירה" value={`${stats.closeRate}%`} sub={`${stats.closed} מתוך ${stats.total}`} accent="slate" />
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-finzo-line bg-white p-5 shadow-e-1">
                  <h3 className="text-sm font-black text-mort-ink">בקרת איכות לידים</h3>
                  <div className="mt-4 grid gap-3">
                    <Bar label="חם" value={stats.hot} total={stats.total} />
                    <Bar label="בינוני" value={stats.medium} total={stats.total} />
                    <Bar label="חלש" value={stats.weak} total={stats.total} />
                  </div>
                </div>
                <div className="rounded-2xl border border-finzo-line bg-white p-5 shadow-e-1">
                  <h3 className="text-sm font-black text-mort-ink">שיוך ליועצים</h3>
                  <div className="mt-4 grid gap-3">
                    {advisorStats.length
                      ? advisorStats.map((item) => <Bar key={item.id} label={item.name} value={item.count} total={stats.total} />)
                      : <p className="text-sm font-bold text-mort-muted">עדיין אין יועצים.</p>}
                  </div>
                </div>
                <div className="rounded-2xl border border-finzo-line bg-white p-5 shadow-e-1">
                  <h3 className="text-sm font-black text-mort-ink">סטטוס מכירה</h3>
                  <div className="mt-4 grid gap-3">
                    <Bar label="פתוחים" value={stats.open} total={stats.total} />
                    <Bar label="נסגרו" value={stats.closed} total={stats.total} />
                    <Bar label="היום" value={stats.todayCount} total={stats.total} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Advisors section ── */}
          {showAdvisors && (
            <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
              <div className="rounded-2xl border border-finzo-line bg-white p-5 shadow-e-1">
                <h2 className="text-sm font-black text-mort-ink">הוספת יועץ חדש</h2>
                <form className="mt-4 grid gap-3" onSubmit={createAdvisor}>
                  <Input label="שם מלא" value={newAdvisor.name} onChange={(value) => setNewAdvisor((c) => ({ ...c, name: value, advisorId: c.advisorId || value }))} />
                  <Input label="טלפון" value={newAdvisor.phone} onChange={(value) => setNewAdvisor((c) => ({ ...c, phone: value }))} />
                  <Input label="אימייל" value={newAdvisor.email} onChange={(value) => setNewAdvisor((c) => ({ ...c, email: value }))} />
                  <Input label="עמלה" value={newAdvisor.commissionAmount} onChange={(value) => setNewAdvisor((c) => ({ ...c, commissionAmount: value }))} />
                  <button className="min-h-11 rounded-2xl bg-finzo-ink px-5 py-3 text-sm font-black text-white disabled:opacity-60" type="submit" disabled={loading}>
                    {loading ? "שומר..." : "הוסף יועץ"}
                  </button>
                </form>
              </div>
              <div className="rounded-2xl border border-finzo-line bg-white p-5 shadow-e-1">
                <h2 className="text-sm font-black text-mort-ink">יועצים פעילים</h2>
                {advisors.length ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {advisors.map((advisor) => {
                      const stat = advisorStats.find((s) => s.id === advisorId(advisor));
                      return (
                        <div key={advisorId(advisor)} className="rounded-2xl border border-finzo-line bg-finzo-paper p-4">
                          <strong className="block font-black text-finzo-ink">{advisorName(advisor)}</strong>
                          <span className="mt-0.5 block text-xs font-bold text-mort-muted">{advisorPhone(advisor)}</span>
                          <span className="block text-xs font-bold text-mort-muted">{advisorEmail(advisor)}</span>
                          {stat && (
                            <span className="mt-2 inline-block rounded-full bg-finzo-cobalt-l px-2.5 py-0.5 text-xs font-black text-finzo-cobalt">
                              {stat.count} לידים
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-4 text-sm font-bold text-mort-muted">אין יועצים עדיין.</p>
                )}
              </div>
            </div>
          )}

          {/* ── Leads section ── */}
          {showLeads && (
            <div className="grid gap-4">

              {/* KPI strip */}
              <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
                <KpiCard label="סה״כ" value={stats.total} accent="slate" />
                <KpiCard label="היום" value={stats.todayCount} accent="blue" />
                <KpiCard label="חמים" value={stats.hot} accent="green" />
                <KpiCard label="פתוחים" value={stats.open} accent="amber" />
                <KpiCard label="משויכים" value={stats.assigned} accent="blue" />
                <KpiCard label="נסגרו" value={stats.closed} accent="green" />
                <KpiCard label="סגירה" value={`${stats.closeRate}%`} accent="slate" />
              </div>

              {/* Filters toolbar */}
              <div className="rounded-2xl border border-finzo-line bg-white p-4 shadow-e-1">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-black text-mort-muted">חיפוש</label>
                    <input
                      className="min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-mort-ink focus:border-finzo-cobalt focus:bg-white focus:outline-none focus:ring-2 focus:ring-finzo-cobalt/20"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="חיפוש לפי שם, טלפון, עיר, מקור, יועץ..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 lg:flex lg:items-end">
                    <div>
                      <label className="mb-1 block text-xs font-black text-mort-muted">סטטוס</label>
                      <select className="min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-mort-ink focus:border-finzo-cobalt focus:outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="">הכל</option>
                        {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-black text-mort-muted">איכות</label>
                      <select className="min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-mort-ink focus:border-finzo-cobalt focus:outline-none" value={qualityFilter} onChange={(e) => setQualityFilter(e.target.value)}>
                        {LEAD_QUALITIES.map((q) => <option key={q} value={q}>{q || "כל האיכויות"}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-black text-mort-muted">עדיפות</label>
                      <select className="min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-mort-ink focus:border-finzo-cobalt focus:outline-none" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                        {LEAD_PRIORITIES.map((p) => <option key={p} value={p}>{p || "כל העדיפויות"}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-black text-mort-muted">יועץ</label>
                      <select className="min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-mort-ink focus:border-finzo-cobalt focus:outline-none" value={advisorFilter} onChange={(e) => setAdvisorFilter(e.target.value)}>
                        <option value="">כל היועצים</option>
                        {advisors.map((a) => <option key={advisorId(a)} value={advisorId(a)}>{advisorName(a)}</option>)}
                      </select>
                    </div>
                    {hasFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="min-h-11 self-end rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700 transition-colors hover:bg-red-100"
                      >
                        נקה סינון
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Bulk actions toolbar */}
              <div className="rounded-2xl border border-finzo-line bg-white p-4 shadow-e-1">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm font-black text-mort-ink">
                    <input type="checkbox" checked={filteredLeads.length > 0 && selectedIds.length === filteredLeads.length} onChange={toggleSelectAll} />
                    <span>בחר הכל <span className="font-bold text-mort-muted">({filteredLeads.length})</span></span>
                  </label>
                  {selectedIds.length > 0 && (
                    <span className="rounded-full bg-finzo-cobalt-l px-2.5 py-0.5 text-xs font-black text-finzo-cobalt">
                      {selectedIds.length} נבחרו
                    </span>
                  )}
                  <div className="mr-auto flex flex-wrap gap-2">
                    <button type="button" onClick={() => bulkPatch({ leadQuality: "חם", leadPriority: "גבוה" })} disabled={!selectedIds.length} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800 disabled:opacity-40 hover:bg-emerald-100">
                      סמן חם
                    </button>
                    <button type="button" onClick={() => bulkPatch({ followUpStage: "ניסיון 1" })} disabled={!selectedIds.length} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-800 disabled:opacity-40 hover:bg-amber-100">
                      מעקב ניסיון 1
                    </button>
                    <button type="button" onClick={() => bulkPatch({ leadStatus: "לא רלוונטי", status: "לא רלוונטי" })} disabled={!selectedIds.length} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700 disabled:opacity-40 hover:bg-slate-100">
                      לא רלוונטי
                    </button>
                    <div className="flex items-center gap-1.5">
                      <select className="min-h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-mort-ink" value={bulkAdvisorId} onChange={(e) => setBulkAdvisorId(e.target.value)}>
                        <option value="">שיוך ליועץ...</option>
                        {advisors.map((a) => <option key={advisorId(a)} value={advisorId(a)}>{advisorName(a)}</option>)}
                      </select>
                      <button type="button" onClick={bulkAssignAdvisor} disabled={loading || !selectedIds.length || !bulkAdvisorId} className="min-h-9 rounded-xl bg-finzo-ink px-3 py-1.5 text-xs font-black text-white disabled:opacity-40">
                        שייך
                      </button>
                    </div>
                    <button type="button" onClick={bulkDeleteLeads} disabled={!selectedIds.length || loading} className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-700 disabled:opacity-40 hover:bg-red-100">
                      מחק נבחרים
                    </button>
                  </div>
                </div>
              </div>

              {/* Loading state */}
              {loading && leads.length === 0 && (
                <div className="rounded-2xl border border-finzo-line bg-white p-12 text-center shadow-e-1">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-finzo-cobalt border-t-transparent" />
                  <p className="text-sm font-bold text-mort-muted">טוען לידים...</p>
                </div>
              )}

              {/* Empty state */}
              {!loading && filteredLeads.length === 0 && (
                <div className="rounded-2xl border border-finzo-line bg-white p-12 text-center shadow-e-1">
                  <p className="text-4xl">○</p>
                  <h3 className="mt-3 text-lg font-black text-mort-ink">אין לידים להצגה</h3>
                  <p className="mt-1 text-sm font-bold text-mort-muted">שנה את הסינון, או בדוק שהלידים נשמרים ב־Supabase.</p>
                  {hasFilters && (
                    <button type="button" onClick={clearFilters} className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-mort-ink hover:bg-slate-100">
                      נקה סינון
                    </button>
                  )}
                </div>
              )}

              {/* Desktop table */}
              {filteredLeads.length > 0 && (
                <div className="hidden overflow-hidden rounded-2xl border border-finzo-line bg-white shadow-e-1 lg:block">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-finzo-line bg-finzo-paper">
                        <th className="py-3 pr-4 text-right">
                          <input type="checkbox" checked={filteredLeads.length > 0 && selectedIds.length === filteredLeads.length} onChange={toggleSelectAll} />
                        </th>
                        <th className="py-3 pr-1 text-right text-xs font-black uppercase tracking-wide text-mort-muted">שם</th>
                        <th className="py-3 text-right text-xs font-black uppercase tracking-wide text-mort-muted">טלפון</th>
                        <th className="py-3 text-right text-xs font-black uppercase tracking-wide text-mort-muted">עיר</th>
                        <th className="py-3 text-right text-xs font-black uppercase tracking-wide text-mort-muted">משכנתא</th>
                        <th className="py-3 text-right text-xs font-black uppercase tracking-wide text-mort-muted">איכות</th>
                        <th className="py-3 text-right text-xs font-black uppercase tracking-wide text-mort-muted">סטטוס</th>
                        <th className="py-3 text-right text-xs font-black uppercase tracking-wide text-mort-muted">יועץ</th>
                        <th className="py-3 text-right text-xs font-black uppercase tracking-wide text-mort-muted">תאריך</th>
                        <th className="py-3 pl-4 text-right text-xs font-black uppercase tracking-wide text-mort-muted">פעולות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map((lead) => {
                        const leadStatus = lead.leadStatus || lead.status || "חדש";
                        const quality = lead.leadQuality || "לא סווג";
                        const isSaving = savingId === lead.id;
                        const isExpanded = expandedLeadId === lead.id;
                        return (
                          <>
                            <tr
                              key={lead.id}
                              className={`border-b border-finzo-line transition-colors hover:bg-finzo-paper/60 ${selectedIds.includes(lead.id) ? "bg-finzo-cobalt-l/30" : ""}`}
                            >
                              <td className="py-3 pr-4">
                                <input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => toggleSelected(lead.id)} />
                              </td>
                              <td className="py-3 pr-1">
                                <span className="block font-black text-mort-ink">{lead.name || "—"}</span>
                                {isSaving && <span className="text-xs font-bold text-amber-600">שומר...</span>}
                              </td>
                              <td className="py-3">
                                <a href={lead.phone ? `tel:${lead.phone}` : undefined} className="font-bold text-finzo-cobalt hover:underline">{lead.phone || "—"}</a>
                              </td>
                              <td className="py-3 text-sm font-bold text-mort-muted">{lead.city || lead.propertyCity || "—"}</td>
                              <td className="py-3 text-sm font-black text-mort-ink">{lead.mortgageAmount ? formatILS(toNumber(lead.mortgageAmount)) : "—"}</td>
                              <td className="py-3">
                                <span className="flex items-center gap-1.5">
                                  <span className={`h-2 w-2 rounded-full ${qualityDot(quality)}`} />
                                  <span className="text-xs font-black text-mort-text">{quality}</span>
                                </span>
                              </td>
                              <td className="py-3">
                                <span className={`rounded-full border px-2 py-0.5 text-xs font-black ${statusClasses(leadStatus)}`}>{leadStatus}</span>
                              </td>
                              <td className="py-3 text-sm font-bold text-mort-muted">{lead.assignedAdvisor || <span className="text-slate-400">—</span>}</td>
                              <td className="py-3 text-xs font-bold text-mort-muted">{formatDateShort(lead.createdAt)}</td>
                              <td className="py-3 pl-4">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedLeadId(isExpanded ? null : lead.id)}
                                    className="rounded-lg border border-finzo-line bg-finzo-paper px-2.5 py-1 text-xs font-black text-mort-ink hover:bg-finzo-cream"
                                  >
                                    {isExpanded ? "סגור" : "עריכה"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteSingleLead(lead.id)}
                                    className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-black text-red-700 hover:bg-red-100"
                                  >
                                    מחק
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr key={`${lead.id}-expanded`} className="border-b border-finzo-line bg-finzo-paper/40">
                                <td colSpan={10} className="px-6 py-5">
                                  <div className="grid gap-4">
                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                      <Detail label="טלפון" value={lead.phone} />
                                      <Detail label="עיר" value={lead.city} />
                                      <Detail label="משכנתא" value={formatILS(toNumber(lead.mortgageAmount))} />
                                      <Detail label="סיכוי אישור" value={lead.approvalScore || lead.estimatedApprovalResult ? `${lead.approvalScore || lead.estimatedApprovalResult}%` : "-"} />
                                      <Detail label="הכנסה" value={lead.monthlyIncome ? formatILS(toNumber(lead.monthlyIncome)) : "-"} />
                                      <Detail label="הון עצמי" value={lead.equityAmount ? formatILS(toNumber(lead.equityAmount)) : "-"} />
                                      <Detail label="סטטוס חוזה" value={lead.contractStatus || lead.purchaseStatus} />
                                      <Detail label="מועד חזרה" value={lead.requestedContactTime} />
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                      <Select label="סטטוס" value={leadStatus} options={statuses} onChange={(value) => patchLead(lead.id, { leadStatus: value, status: value })} />
                                      <Select label="איכות" value={quality} options={LEAD_QUALITIES.filter(Boolean)} onChange={(value) => patchLead(lead.id, { leadQuality: value })} />
                                      <Select label="שלב מעקב" value={lead.followUpStage || "לא טופל"} options={FOLLOW_UP_STAGES} onChange={(value) => patchLead(lead.id, { followUpStage: value })} />
                                      <Input label="תאריך מעקב" type="date" value={lead.followUpDate} onChange={(value) => patchLead(lead.id, { followUpDate: value })} />
                                      <Input label="שם יועץ" value={lead.assignedAdvisor} onChange={(value) => patchLead(lead.id, { assignedAdvisor: value })} />
                                      <Input label="טלפון יועץ" value={lead.advisorPhone} onChange={(value) => patchLead(lead.id, { advisorPhone: value })} />
                                      <Input label="עמלה" value={lead.expectedCommission || lead.commissionAmount} onChange={(value) => patchLead(lead.id, { expectedCommission: value, commissionAmount: value })} />
                                      <Select label="סטטוס עמלה" value={lead.commissionStatus || "pending"} options={commissionStatuses} onChange={(value) => patchLead(lead.id, { commissionStatus: value })} />
                                    </div>
                                    <textarea
                                      className="min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-mort-ink focus:border-finzo-cobalt focus:outline-none"
                                      defaultValue={lead.internalNotes || ""}
                                      onBlur={(event) => { if (event.target.value !== (lead.internalNotes || "")) patchLead(lead.id, { internalNotes: event.target.value }); }}
                                      placeholder="הערות פנימיות לצוות"
                                    />
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Mobile cards */}
              {filteredLeads.length > 0 && (
                <div className="grid gap-3 lg:hidden">
                  {filteredLeads.map((lead) => {
                    const leadStatus = lead.leadStatus || lead.status || "חדש";
                    const quality = lead.leadQuality || "לא סווג";
                    const isSaving = savingId === lead.id;
                    const isExpanded = expandedLeadId === lead.id;
                    return (
                      <article key={lead.id} className="overflow-hidden rounded-2xl border border-finzo-line bg-white shadow-e-1">
                        <div className="flex items-start gap-3 border-b border-finzo-line p-4">
                          <input className="mt-1" type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => toggleSelected(lead.id)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-black text-mort-ink">{lead.name || "ליד ללא שם"}</h3>
                              <span className={`rounded-full border px-2 py-0.5 text-xs font-black ${statusClasses(leadStatus)}`}>{leadStatus}</span>
                              <span className="flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${qualityDot(quality)}`} /><span className="text-xs font-black text-mort-muted">{quality}</span></span>
                              {isSaving && <span className="text-xs font-bold text-amber-600">שומר...</span>}
                            </div>
                            <p className="mt-0.5 text-xs font-bold text-mort-muted">
                              {formatDateShort(lead.createdAt)} · {lead.assignedAdvisor || "לא שויך"} · {lead.phone || "—"}
                            </p>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            {lead.phone && <a href={`tel:${lead.phone}`} className="rounded-xl border border-finzo-line bg-finzo-paper px-2.5 py-1.5 text-xs font-black text-mort-ink">חיוג</a>}
                            <button type="button" onClick={() => setExpandedLeadId(isExpanded ? null : lead.id)} className="rounded-xl border border-finzo-line bg-finzo-paper px-2.5 py-1.5 text-xs font-black text-mort-ink">{isExpanded ? "סגור" : "עריכה"}</button>
                            <button type="button" onClick={() => deleteSingleLead(lead.id)} className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-black text-red-700">מחק</button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="p-4 grid gap-3">
                            <div className="grid grid-cols-2 gap-2">
                              <Detail label="עיר" value={lead.city} />
                              <Detail label="משכנתא" value={formatILS(toNumber(lead.mortgageAmount))} />
                              <Detail label="הכנסה" value={lead.monthlyIncome ? formatILS(toNumber(lead.monthlyIncome)) : "-"} />
                              <Detail label="הון עצמי" value={lead.equityAmount ? formatILS(toNumber(lead.equityAmount)) : "-"} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Select label="סטטוס" value={leadStatus} options={statuses} onChange={(value) => patchLead(lead.id, { leadStatus: value, status: value })} />
                              <Select label="איכות" value={quality} options={LEAD_QUALITIES.filter(Boolean)} onChange={(value) => patchLead(lead.id, { leadQuality: value })} />
                              <Select label="שלב מעקב" value={lead.followUpStage || "לא טופל"} options={FOLLOW_UP_STAGES} onChange={(value) => patchLead(lead.id, { followUpStage: value })} />
                              <Input label="תאריך מעקב" type="date" value={lead.followUpDate} onChange={(value) => patchLead(lead.id, { followUpDate: value })} />
                              <Input label="שם יועץ" value={lead.assignedAdvisor} onChange={(value) => patchLead(lead.id, { assignedAdvisor: value })} />
                              <Input label="טלפון יועץ" value={lead.advisorPhone} onChange={(value) => patchLead(lead.id, { advisorPhone: value })} />
                              <Input label="עמלה" value={lead.expectedCommission || lead.commissionAmount} onChange={(value) => patchLead(lead.id, { expectedCommission: value, commissionAmount: value })} />
                              <Select label="סטטוס עמלה" value={lead.commissionStatus || "pending"} options={commissionStatuses} onChange={(value) => patchLead(lead.id, { commissionStatus: value })} />
                            </div>
                            <textarea
                              className="min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-mort-ink"
                              defaultValue={lead.internalNotes || ""}
                              onBlur={(event) => { if (event.target.value !== (lead.internalNotes || "")) patchLead(lead.id, { internalNotes: event.target.value }); }}
                              placeholder="הערות פנימיות"
                            />
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
