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
    SUPABASE_READ_FAILED: "שגיאת קריאה מ-Supabase.",
    SUPABASE_UPDATE_FAILED: "שגיאת עדכון ב-Supabase.",
    LEADS_READ_FAILED: "לא ניתן לטעון את הלידים כרגע בגלל שגיאת שרת.",
    LEAD_UPDATE_FAILED: "לא ניתן היה לעדכן את הליד בגלל שגיאת שרת.",
    LEAD_NOT_FOUND: "הליד לא נמצא במסד הנתונים.",
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

export default function PrivateAdmin() {
  const [leads, setLeads] = useState([]);
  const [statuses, setStatuses] = useState(fallbackStatuses);
  const [commissionStatuses, setCommissionStatuses] = useState(fallbackCommissionStatuses);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [message, setMessage] = useState("");
  const [advisors, setAdvisors] = useState([]);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const filteredLeads = useMemo(() => {
    const term = query.trim();
    return leads.filter((lead) => {
      const matchesStatus = !statusFilter || (lead.leadStatus || lead.status) === statusFilter;
      const matchesQuery = !term || `${lead.name} ${lead.phone} ${lead.city}`.includes(term);
      return matchesStatus && matchesQuery;
    });
  }, [leads, query, statusFilter]);

  useEffect(() => { loadLeads(); }, []);

  async function loadLeads() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/leads");
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthenticated(false);
          return;
        }
        throw new Error(adminApiMessage(json.error));
      }
      setLeads(json.leads || []);
      setStatuses(json.statuses || fallbackStatuses);
      setCommissionStatuses(json.commissionStatuses || fallbackCommissionStatuses);
      setAdvisors(json.advisors || []);
      setIsAuthenticated(true);
    } catch (error) {
      setMessage(error.message || "לא ניתן לטעון את הלידים כרגע.");
    } finally {
      setLoading(false);
    }
  }

  async function login(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(adminApiMessage(json.error));
      setPassword("");
      await loadLeads();
    } catch (error) {
      setMessage(error.message || "שגיאת התחברות");
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }

  async function updateLead(id, changes) {
    const response = await fetch("/api/admin/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, changes }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(adminApiMessage(json.error));
      return;
    }
    setLeads((current) => current.map((lead) => (lead.id === id ? json.lead : lead)));
  }

  if (!isAuthenticated) {
    return (
      <main dir="rtl" className="min-h-screen px-4 py-6 text-mort-text sm:px-6 lg:px-8">
        <Head><title>Admin CRM | MortgAI2</title><meta name="robots" content="noindex,nofollow" /></Head>
        <div className="mx-auto w-full max-w-lg">
          <section className="glass-card p-6 sm:p-8">
            <span className="pill border-emerald-200 bg-emerald-50 text-emerald-800">CRM פרטי</span>
            <h1 className="mt-3 text-3xl font-black text-mort-ink">כניסת אדמין</h1>
            <form className="mt-5 grid gap-3" onSubmit={login}>
              <input className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="סיסמת אדמין" />
              <button disabled={loading} className="rounded-2xl bg-mort-ink px-5 py-3 font-black text-white" type="submit">{loading ? "מתחבר..." : "כניסה"}</button>
            </form>
            {message && <strong className="mt-4 block rounded-2xl bg-red-100 p-3 text-red-700">{message}</strong>}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen px-4 py-6 text-mort-text sm:px-6 lg:px-8">
      <Head><title>Admin CRM | MortgAI2</title><meta name="robots" content="noindex,nofollow" /></Head>
      <div className="mx-auto w-full max-w-[1500px] 2xl:max-w-[1680px]">
        <section className="glass-card p-6 sm:p-8">
          <h1 className="text-4xl font-black text-mort-ink">ניהול לידים ועמלות</h1>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_200px_auto]">
            <input className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חיפוש" />
            <select className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">כל הסטטוסים</option>{statuses.map((s) => <option key={s} value={s}>{s}</option>)}</select>
            <button disabled={loading} onClick={loadLeads} className="rounded-2xl bg-mort-ink px-5 py-3 font-black text-white" type="button">רענון</button>
          </div>
          {message && <strong className="mt-4 block rounded-2xl bg-red-100 p-3 text-red-700">{message}</strong>}
        </section>

        <section className="mt-5 grid gap-4">
          {filteredLeads.map((lead) => (
            <article key={lead.id} className="fintech-card p-5 sm:p-6">
              <div className="grid gap-3 md:grid-cols-2">
                <Info label="שם" value={lead.name || "-"} />
                <Info label="טלפון" value={lead.phone || "-"} />
                <Info label="עיר" value={lead.city || "-"} />
                <Info label="סכום משכנתא" value={formatILS(lead.mortgageAmount)} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <select className="focus-field min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 font-bold" value={lead.leadStatus || lead.status || "חדש"} onChange={(e) => updateLead(lead.id, { leadStatus: e.target.value, status: e.target.value })}>{statuses.map((s) => <option key={s} value={s}>{s}</option>)}</select>
                <input className="focus-field min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 font-bold" placeholder="שם יועץ" value={lead.assignedAdvisor || ""} onChange={(e) => updateLead(lead.id, { assignedAdvisor: e.target.value })} />
                <input className="focus-field min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 font-bold" placeholder="טלפון יועץ" value={lead.advisorPhone || ""} onChange={(e) => updateLead(lead.id, { advisorPhone: e.target.value })} />
                <input className="focus-field min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 font-bold" placeholder="עמלה" value={lead.commissionAmount || lead.expectedCommission || ""} onChange={(e) => updateLead(lead.id, { commissionAmount: e.target.value })} />
                <select className="focus-field min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 font-bold" value={lead.commissionStatus || "pending"} onChange={(e) => updateLead(lead.id, { commissionStatus: e.target.value })}>{commissionStatuses.map((s) => <option key={s} value={s}>{s}</option>)}</select>
                <input className="focus-field min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 font-bold" placeholder="הסכם עמלה" value={lead.commissionAgreement || ""} onChange={(e) => updateLead(lead.id, { commissionAgreement: e.target.value })} />
              </div>
              <textarea className="focus-field mt-3 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold" placeholder="הערות" value={lead.internalNotes || lead.notes || ""} onChange={(e) => updateLead(lead.id, { internalNotes: e.target.value, notes: e.target.value })} />
              <div className="mt-2"><span className={`pill ${statusBadgeClass(lead.leadStatus || lead.status || "חדש")}`}>{lead.leadStatus || lead.status || "חדש"}</span></div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function Info({ label, value }) {
  return <div className="surface-card p-3"><span className="block text-xs font-black text-mort-muted">{label}</span><strong className="mt-1 block font-black text-mort-ink">{value}</strong></div>;
}
