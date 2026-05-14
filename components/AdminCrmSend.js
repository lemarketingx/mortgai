import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { formatILS } from "../lib/format";

const STATUSES = ["חדש", "נשלח ליועץ", "בטיפול", "אושר עקרונית", "נסגר", "לא רלוונטי"];
const QUALITIES = ["", "חם", "בינוני", "חלש", "לא סווג"];
const FOLLOW_UP = ["לא טופל", "ניסיון 1", "ניסיון 2", "נקבעה שיחה", "נשלחו מסמכים", "ממתין ללקוח", "נסגר"];
const COMMISSIONS = ["pending", "invoiced", "paid"];

function cleanPhone(value = "") {
  const digits = String(value).replace(/\D/g, "");
  if (digits.startsWith("0")) return `972${digits.slice(1)}`;
  return digits;
}

function advisorId(advisor) { return advisor?.advisor_id || advisor?.advisorId || advisor?.name || ""; }
function advisorName(advisor) { return advisor?.name || advisor?.advisor_id || ""; }
function advisorPhone(advisor) { return advisor?.phone || ""; }
function advisorEmail(advisor) { return advisor?.email || ""; }
function money(value) { const n = Number(value || 0); return n ? formatILS(n) : "-"; }
function text(value) { return String(value || "").trim(); }
function norm(value) { return text(value).toLowerCase(); }

function qualityClass(value) {
  if (value === "חם") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (value === "בינוני") return "border-amber-200 bg-amber-50 text-amber-800";
  if (value === "חלש") return "border-red-200 bg-red-50 text-red-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function statusClass(value) {
  if (value === "נסגר") return "border-green-200 bg-green-50 text-green-800";
  if (value === "נשלח ליועץ") return "border-violet-200 bg-violet-50 text-violet-800";
  if (value === "בטיפול") return "border-amber-200 bg-amber-50 text-amber-800";
  if (value === "לא רלוונטי") return "border-slate-200 bg-slate-100 text-slate-500";
  return "border-blue-200 bg-blue-50 text-blue-800";
}

function makeAdvisorMessage(leads, advisor) {
  const lines = leads.map((lead, index) => [
    `${index + 1}. ${lead.name || "ללא שם"}`,
    `טלפון: ${lead.phone || "-"}`,
    `עיר: ${lead.city || lead.propertyCity || "-"}`,
    `סכום משכנתא: ${money(lead.mortgageAmount)}`,
    `סיכוי אישור: ${lead.approvalScore || lead.estimatedApprovalResult || "-"}%`,
    `איכות ליד: ${lead.leadQuality || "לא סווג"}`,
    `סטטוס: ${lead.leadStatus || lead.status || "חדש"}`,
    `הערות: ${lead.internalNotes || lead.notes || "-"}`,
  ].join("\n")).join("\n\n");
  return `שלום ${advisorName(advisor) || ""},\nמצורפים לידים חדשים לטיפול:\n\n${lines}\n\nנא לעדכן אותי לאחר יצירת קשר עם הלקוח.`;
}

function Metric({ label, value }) {
  return <div className="surface-card p-4"><span className="block text-xs font-black text-mort-muted">{label}</span><strong className="number-display mt-1 block text-xl font-black text-mort-ink">{value}</strong></div>;
}

function Select({ value, onChange, children }) {
  return <select className="focus-field min-h-11 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-mort-ink" value={value || ""} onChange={(e) => onChange(e.target.value)}>{children}</select>;
}

function Input({ value, onChange, placeholder, type = "text" }) {
  return <input type={type} className="focus-field min-h-11 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-mort-ink" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}

function Detail({ label, value }) {
  return <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3"><span className="block text-xs font-black text-mort-muted">{label}</span><strong className="mt-1 block break-words text-sm font-black text-mort-ink">{value || "-"}</strong></div>;
}

export default function AdminCrmSend() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [leads, setLeads] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [qualityFilter, setQualityFilter] = useState("");
  const [advisorFilter, setAdvisorFilter] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newAdvisor, setNewAdvisor] = useState({ name: "", phone: "", email: "", commissionAmount: "" });

  const selectedLeads = useMemo(() => leads.filter((lead) => selectedIds.includes(lead.id)), [leads, selectedIds]);
  const selectedAdvisor = useMemo(() => advisors.find((advisor) => advisorId(advisor) === selectedAdvisorId), [advisors, selectedAdvisorId]);

  const filteredLeads = useMemo(() => {
    const q = norm(query);
    return leads.filter((lead) => {
      const haystack = norm([lead.name, lead.phone, lead.city, lead.assignedAdvisor, lead.leadQuality, lead.source].join(" "));
      const status = lead.leadStatus || lead.status || "חדש";
      const quality = lead.leadQuality || "לא סווג";
      const assigned = lead.assignedAdvisorId || lead.assignedAdvisor || "";
      return (!q || haystack.includes(q)) && (!statusFilter || status === statusFilter) && (!qualityFilter || quality === qualityFilter) && (!advisorFilter || assigned === advisorFilter || lead.assignedAdvisor === advisorFilter);
    });
  }, [leads, query, statusFilter, qualityFilter, advisorFilter]);

  const stats = useMemo(() => ({
    total: leads.length,
    hot: leads.filter((lead) => lead.leadQuality === "חם").length,
    sent: leads.filter((lead) => (lead.leadStatus || lead.status) === "נשלח ליועץ").length,
    closed: leads.filter((lead) => (lead.leadStatus || lead.status) === "נסגר").length,
    assigned: leads.filter((lead) => lead.assignedAdvisor || lead.assignedAdvisorId).length,
  }), [leads]);

  function show(value, isError = false) { setMessage(value); setError(isError); }

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/leads");
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) { setAuthenticated(false); return; }
      if (!response.ok) throw new Error(data.message || data.error || "שגיאת טעינה");
      setLeads(Array.isArray(data.leads) ? data.leads : []);
      setAdvisors(Array.isArray(data.advisors) ? data.advisors : []);
      setAuthenticated(true);
    } catch (err) { show(err.message || "לא ניתן לטעון CRM", true); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function login(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || "סיסמה שגויה");
      setPassword("");
      await load();
    } catch (err) { show(err.message || "שגיאת התחברות", true); }
    finally { setLoading(false); }
  }

  async function patchLead(id, changes) {
    const response = await fetch("/api/admin/leads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, changes }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { show(data.message || data.error || "שגיאת עדכון", true); return; }
    if (data.lead) setLeads((current) => current.map((lead) => lead.id === id ? data.lead : lead));
  }

  async function bulkPatch(changes, keepSelection = false) {
    if (!selectedIds.length) { show("בחר לפחות ליד אחד", true); return false; }
    const response = await fetch("/api/admin/leads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selectedIds, changes }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { show(data.message || data.error || "עדכון מרוכז נכשל", true); return false; }
    show(`עודכנו ${data.updated || selectedIds.length} לידים`);
    if (!keepSelection) setSelectedIds([]);
    await load();
    return true;
  }

  async function assignSelectedToAdvisor(keepSelection = true) {
    if (!selectedAdvisor) { show("בחר יועץ", true); return false; }
    return bulkPatch({
      assignedAdvisorId: advisorId(selectedAdvisor),
      assignedAdvisor: advisorName(selectedAdvisor),
      advisorPhone: advisorPhone(selectedAdvisor),
      advisorEmail: advisorEmail(selectedAdvisor),
      leadStatus: "נשלח ליועץ",
      status: "נשלח ליועץ",
      followUpStage: "ניסיון 1",
    }, keepSelection);
  }

  async function createAdvisor(event) {
    event.preventDefault();
    if (!newAdvisor.name || !newAdvisor.phone) { show("שם וטלפון יועץ חובה", true); return; }
    setLoading(true);
    try {
      const payload = { advisorId: newAdvisor.phone || newAdvisor.name, name: newAdvisor.name, phone: newAdvisor.phone, email: newAdvisor.email || "", commissionType: "lead", commissionAmount: newAdvisor.commissionAmount || "" };
      const response = await fetch("/api/admin/advisors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || "יצירת יועץ נכשלה");
      setNewAdvisor({ name: "", phone: "", email: "", commissionAmount: "" });
      show("יועץ נוסף בהצלחה");
      await load();
    } catch (err) { show(err.message || "יצירת יועץ נכשלה", true); }
    finally { setLoading(false); }
  }

  async function sendWhatsApp() {
    if (!selectedAdvisor || !selectedLeads.length) { show("בחר יועץ ולידים", true); return; }
    await assignSelectedToAdvisor(true);
    const url = `https://wa.me/${cleanPhone(advisorPhone(selectedAdvisor))}?text=${encodeURIComponent(makeAdvisorMessage(selectedLeads, selectedAdvisor))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function sendEmail() {
    if (!selectedAdvisor || !selectedLeads.length) { show("בחר יועץ ולידים", true); return; }
    await assignSelectedToAdvisor(true);
    const subject = encodeURIComponent(`לידים חדשים לטיפול (${selectedLeads.length})`);
    const body = encodeURIComponent(makeAdvisorMessage(selectedLeads, selectedAdvisor));
    window.location.href = `mailto:${advisorEmail(selectedAdvisor)}?subject=${subject}&body=${body}`;
  }

  function exportCsv() {
    window.open("/api/admin/export", "_blank");
  }

  function toggle(id) { setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  function toggleAll() { setSelectedIds((current) => current.length === filteredLeads.length ? [] : filteredLeads.map((lead) => lead.id)); }

  if (!authenticated) {
    return <main dir="rtl" className="min-h-screen px-4 py-8 text-mort-text sm:px-6 lg:px-8"><Head><title>Admin CRM | MortgAI</title><meta name="robots" content="noindex,nofollow" /></Head><section className="mx-auto max-w-xl glass-card p-6 sm:p-8"><h1 className="text-3xl font-black text-mort-ink">כניסת אדמין</h1><form className="mt-5 grid gap-3" onSubmit={login}><input className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="סיסמת אדמין" /><button className="rounded-2xl bg-mort-ink px-5 py-3 font-black text-white" disabled={loading}>{loading ? "מתחבר..." : "כניסה"}</button></form>{message && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 font-black text-red-800">{message}</div>}</section></main>;
  }

  return <main dir="rtl" className="min-h-screen px-4 py-6 text-mort-text sm:px-6 lg:px-8"><Head><title>Admin CRM | MortgAI</title><meta name="robots" content="noindex,nofollow" /></Head><div className="mx-auto max-w-[1560px]">
    <section className="glass-card p-5 sm:p-7"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><span className="pill border-slate-200 bg-white text-mort-muted">CRM</span><h1 className="mt-3 text-3xl font-black text-mort-ink">ניהול לידים ושליחה ליועצים</h1><p className="mt-2 text-sm font-bold text-mort-muted">בחר לידים, שייך ליועץ ושלח הודעת WhatsApp או מייל מוכנה.</p></div><button className="rounded-2xl bg-mort-ink px-5 py-3 font-black text-white" onClick={load}>{loading ? "טוען..." : "רענון"}</button></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric label="סה״כ" value={stats.total} /><Metric label="חמים" value={stats.hot} /><Metric label="נשלחו" value={stats.sent} /><Metric label="משויכים" value={stats.assigned} /><Metric label="נסגרו" value={stats.closed} /></div>
      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_180px_180px_220px]"><Input value={query} onChange={setQuery} placeholder="חיפוש שם / טלפון / עיר" /><Select value={statusFilter} onChange={setStatusFilter}><option value="">כל הסטטוסים</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</Select><Select value={qualityFilter} onChange={setQualityFilter}>{QUALITIES.map((q) => <option key={q} value={q}>{q || "כל האיכויות"}</option>)}</Select><Select value={advisorFilter} onChange={setAdvisorFilter}><option value="">כל היועצים</option>{advisors.map((a) => <option key={advisorId(a)} value={advisorId(a)}>{advisorName(a)}</option>)}</Select></div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_190px_170px_170px_170px]"><Select value={selectedAdvisorId} onChange={setSelectedAdvisorId}><option value="">בחר יועץ לשליחה</option>{advisors.map((a) => <option key={advisorId(a)} value={advisorId(a)}>{advisorName(a)}</option>)}</Select><button className="rounded-2xl bg-violet-700 px-4 py-3 font-black text-white disabled:opacity-50" disabled={!selectedIds.length || !selectedAdvisorId} onClick={() => assignSelectedToAdvisor(false)}>שייך ליועץ</button><button className="rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white disabled:opacity-50" disabled={!selectedIds.length || !selectedAdvisorId} onClick={sendWhatsApp}>שלח WhatsApp</button><button className="rounded-2xl bg-blue-700 px-4 py-3 font-black text-white disabled:opacity-50" disabled={!selectedIds.length || !selectedAdvisorId} onClick={sendEmail}>שלח מייל</button><button className="rounded-2xl bg-slate-700 px-4 py-3 font-black text-white" onClick={exportCsv}>Export CSV</button></div>
      {message && <div className={`mt-4 rounded-2xl border p-3 text-sm font-black ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{message}</div>}
    </section>

    <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_380px]"><div className="grid gap-4"><div className="fintech-card flex flex-wrap items-center justify-between gap-3 p-4"><label className="flex items-center gap-2 font-black"><input type="checkbox" checked={filteredLeads.length > 0 && selectedIds.length === filteredLeads.length} onChange={toggleAll} /> בחר הכל ({filteredLeads.length})</label><div className="flex flex-wrap gap-2"><button className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 font-black text-emerald-800 disabled:opacity-50" disabled={!selectedIds.length} onClick={() => bulkPatch({ leadQuality: "חם", leadPriority: "גבוה" })}>סמן חם</button><button className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 font-black text-amber-800 disabled:opacity-50" disabled={!selectedIds.length} onClick={() => bulkPatch({ followUpStage: "ניסיון 1" })}>מעקב ניסיון 1</button></div></div>
      {filteredLeads.map((lead) => <article key={lead.id} className="fintech-card p-5"><div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between"><div className="flex gap-3"><input className="mt-2" type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => toggle(lead.id)} /><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-black text-mort-ink">{lead.name || "ללא שם"}</h2><span className={`pill ${statusClass(lead.leadStatus || lead.status)}`}>{lead.leadStatus || lead.status || "חדש"}</span><span className={`pill ${qualityClass(lead.leadQuality)}`}>{lead.leadQuality || "לא סווג"}</span></div><p className="mt-1 text-sm font-bold text-mort-muted">יועץ: {lead.assignedAdvisor || "לא שויך"}</p></div></div><a href={lead.phone ? `tel:${lead.phone}` : undefined} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-center font-black">חיוג</a></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Detail label="טלפון" value={lead.phone} /><Detail label="עיר" value={lead.city || lead.propertyCity} /><Detail label="משכנתא" value={money(lead.mortgageAmount)} /><Detail label="סיכוי" value={lead.approvalScore || lead.estimatedApprovalResult ? `${lead.approvalScore || lead.estimatedApprovalResult}%` : "-"} /><Detail label="הכנסה" value={money(lead.monthlyIncome)} /><Detail label="הון עצמי" value={money(lead.equityAmount)} /><Detail label="חוזה" value={lead.contractStatus || lead.purchaseStatus} /><Detail label="חזרה" value={lead.requestedContactTime} /></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Select value={lead.leadStatus || lead.status || "חדש"} onChange={(v) => patchLead(lead.id, { leadStatus: v, status: v })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</Select><Select value={lead.leadQuality || "לא סווג"} onChange={(v) => patchLead(lead.id, { leadQuality: v })}>{QUALITIES.filter(Boolean).map((q) => <option key={q}>{q}</option>)}</Select><Select value={lead.followUpStage || "לא טופל"} onChange={(v) => patchLead(lead.id, { followUpStage: v })}>{FOLLOW_UP.map((s) => <option key={s}>{s}</option>)}</Select><Select value={lead.commissionStatus || "pending"} onChange={(v) => patchLead(lead.id, { commissionStatus: v })}>{COMMISSIONS.map((s) => <option key={s}>{s}</option>)}</Select></div><textarea className="focus-field mt-4 min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold" defaultValue={lead.internalNotes || ""} onBlur={(e) => { if (e.target.value !== (lead.internalNotes || "")) patchLead(lead.id, { internalNotes: e.target.value }); }} placeholder="הערות פנימיות לצוות" /></article>)}
    </div><aside className="grid content-start gap-4"><section className="fintech-card p-5"><h2 className="text-xl font-black text-mort-ink">הוספת יועץ</h2><form className="mt-4 grid gap-3" onSubmit={createAdvisor}><Input value={newAdvisor.name} onChange={(v) => setNewAdvisor((c) => ({ ...c, name: v }))} placeholder="שם יועץ" /><Input value={newAdvisor.phone} onChange={(v) => setNewAdvisor((c) => ({ ...c, phone: v }))} placeholder="טלפון" /><Input value={newAdvisor.email} onChange={(v) => setNewAdvisor((c) => ({ ...c, email: v }))} placeholder="אימייל אופציונלי" /><Input value={newAdvisor.commissionAmount} onChange={(v) => setNewAdvisor((c) => ({ ...c, commissionAmount: v }))} placeholder="עמלה אופציונלית" /><button className="rounded-2xl bg-mort-ink px-5 py-3 font-black text-white" disabled={loading}>הוסף יועץ</button></form></section><section className="fintech-card p-5"><h2 className="text-xl font-black text-mort-ink">יועצים</h2><div className="mt-4 grid gap-3">{advisors.map((a) => <div key={advisorId(a)} className="rounded-2xl border border-slate-200 bg-white p-3"><strong>{advisorName(a)}</strong><span className="block text-sm font-bold text-mort-muted">{advisorPhone(a)}</span><span className="block text-sm font-bold text-mort-muted">{advisorEmail(a)}</span></div>)}</div></section></aside></section>
  </div></main>;
}
