import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { formatILS } from "../lib/format";

const fallbackStatuses = ["חדש", "נשלח ליועץ", "בטיפול", "אושר עקרונית", "נסגר", "לא רלוונטי"];
const fallbackCommissionStatuses = ["pending", "invoiced", "paid"];

export default function PrivateAdmin() {
  const [leads, setLeads] = useState([]);
  const [statuses, setStatuses] = useState(fallbackStatuses);
  const [commissionStatuses, setCommissionStatuses] = useState(fallbackCommissionStatuses);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const filteredLeads = useMemo(() => {
    const term = query.trim();
    return leads.filter((lead) => {
      const matchesStatus = !statusFilter || lead.status === statusFilter;
      const matchesQuery = !term || `${lead.name} ${lead.phone} ${lead.city}`.includes(term);
      return matchesStatus && matchesQuery;
    });
  }, [leads, query, statusFilter]);
  const dashboardStats = useMemo(() => {
    const money = (value) => Number(String(value || "").replace(/[^\d.-]/g, "")) || 0;
    return {
      newLeads: leads.filter((lead) => lead.status === "חדש").length,
      inProgress: leads.filter((lead) => lead.status === "בטיפול" || lead.status === "נשלח ליועץ").length,
      closed: leads.filter((lead) => lead.status === "נסגר").length,
      expectedCommission: leads.reduce((sum, lead) => sum + money(lead.expectedCommission), 0),
    };
  }, [leads]);

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/leads");
      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthenticated(false);
          setMessage("");
          return;
        }
        throw new Error("Lead load failed");
      }

      const json = await response.json();
      setLeads(json.leads || []);
      setStatuses(json.statuses || fallbackStatuses);
      setCommissionStatuses(json.commissionStatuses || fallbackCommissionStatuses);
      setIsAuthenticated(true);
    } catch {
      setMessage("לא ניתן לטעון את הלידים כרגע.");
    } finally {
      setLoading(false);
    }
  }

  async function login(event) {
    event.preventDefault();
    if (!password.trim()) {
      setMessage("יש להזין סיסמת אדמין.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        throw new Error("Invalid login");
      }
      setPassword("");
      await loadLeads();
    } catch {
      setMessage("סיסמה שגויה או בעיית התחברות.");
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    setMessage("");
    try {
      await fetch("/api/admin/login", { method: "DELETE" });
    } finally {
      setLeads([]);
      setIsAuthenticated(false);
      setLoading(false);
    }
  }

  async function updateLead(id, changes) {
    setMessage("");

    const response = await fetch("/api/admin/leads", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, changes }),
    });

    if (!response.ok) {
      setMessage("לא ניתן היה לעדכן את הליד.");
      return;
    }

    const json = await response.json();
    setLeads((current) => current.map((lead) => (lead.id === id ? json.lead : lead)));
  }

  if (!isAuthenticated) {
    return (
      <main dir="rtl" className="min-h-screen px-4 py-6 text-mort-text sm:px-6 lg:px-8">
        <Head>
          <title>Admin CRM | MortgAI2</title>
        </Head>
        <div className="mx-auto w-full max-w-lg">
          <section className="glass-card p-6 sm:p-8">
            <span className="pill border-emerald-200 bg-emerald-50 text-emerald-800">CRM פרטי</span>
            <h1 className="mt-3 text-3xl font-black text-mort-ink">כניסת אדמין</h1>
            <p className="mt-2 font-bold text-mort-muted">להמשך יש להזין סיסמת אדמין שהוגדרה בשרת.</p>
            <form className="mt-5 grid gap-3" onSubmit={login}>
              <input
                className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="סיסמת אדמין"
                autoComplete="current-password"
              />
              <button disabled={loading} className="rounded-2xl bg-mort-ink px-5 py-3 font-black text-white shadow-soft disabled:opacity-60" type="submit">
                {loading ? "מתחבר..." : "כניסה"}
              </button>
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
      </Head>

      <div className="mx-auto w-full max-w-[1500px] 2xl:max-w-[1680px]">
        <section className="glass-card relative overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-emerald-200/30 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="pill border-emerald-200 bg-emerald-50 text-emerald-800">CRM פרטי</span>
              <h1 className="mt-3 text-4xl font-black text-mort-ink">ניהול לידים ועמלות</h1>
              <p className="mt-2 font-bold text-mort-muted">
                הלידים נשמרים ב-Supabase דרך השרת. ניתן לעדכן סטטוס, הקצאת יועץ ומעקב עמלות.
              </p>
            </div>
            <a className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-3 text-center font-black text-mort-ink shadow-soft" href="/">
              חזרה למחשבון
            </a>
            <button className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-center font-black text-red-700 shadow-soft" type="button" onClick={logout}>
              התנתק
            </button>
          </div>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStat label="לידים חדשים" value={dashboardStats.newLeads} />
          <AdminStat label="בטיפול / נשלח ליועץ" value={dashboardStats.inProgress} />
          <AdminStat label="נסגרו" value={dashboardStats.closed} />
          <AdminStat label="עמלה צפויה" value={formatILS(dashboardStats.expectedCommission)} />
        </section>

        <section className="fintech-card mt-5 p-6 sm:p-8">
          <div className="grid gap-3 md:grid-cols-[1fr_240px_auto]">
            <input
              className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="חיפוש לפי שם, טלפון או עיר"
            />
            <select className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">כל הסטטוסים</option>
              {statuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <button disabled={loading} onClick={loadLeads} className="rounded-2xl bg-mort-ink px-5 py-3 font-black text-white shadow-soft disabled:opacity-60" type="button">
              {loading ? "טוען..." : "רענון"}
            </button>
          </div>
          {message && <strong className="mt-4 block rounded-2xl bg-red-100 p-3 text-red-700">{message}</strong>}
        </section>

        <section className="mt-5 grid gap-4">
          {filteredLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              statuses={statuses}
              commissionStatuses={commissionStatuses}
              updateLead={updateLead}
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

function LeadCard({ lead, statuses, commissionStatuses, updateLead }) {
  return (
    <article className="fintech-card p-5 sm:p-6">
      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-mort-ink">{lead.name || "ללא שם"}</h2>
              <p className="font-bold text-mort-muted">{lead.phone} · {lead.city || "עיר לא צוינה"}</p>
            </div>
            <span className="pill border-emerald-200 bg-emerald-50 text-emerald-800">{lead.status}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info label="סכום משכנתא" value={formatILS(lead.mortgageAmount)} />
            <Info label="סטטוס רכישה" value={lead.purchaseStatus || "לא צוין"} />
            <Info label="סיכוי אישור" value={`${Math.round(Number(lead.approvalScore) || 0)}%`} />
            <Info label="בעיה מרכזית" value={lead.mainIssue || "לא צוין"} />
            <Info label="מקור" value={lead.source || "mortgai2"} />
            <Info label="נוצר" value={new Date(lead.createdAt).toLocaleString("he-IL")} />
          </div>
        </div>

        <div className="grid gap-3">
          <select className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink" value={lead.status} onChange={(event) => updateLead(lead.id, { status: event.target.value })}>
            {statuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <div className="grid gap-3 md:grid-cols-2">
            <AdminInput label="יועץ משויך" value={lead.assignedAdvisor} onBlur={(value) => updateLead(lead.id, { assignedAdvisor: value })} />
            <AdminInput label="טלפון יועץ" value={lead.advisorPhone} onBlur={(value) => updateLead(lead.id, { advisorPhone: value })} />
            <AdminInput label="עמלה צפויה" value={lead.expectedCommission} onBlur={(value) => updateLead(lead.id, { expectedCommission: value })} />
            <AdminInput label="עמלה בפועל" value={lead.actualCommission} onBlur={(value) => updateLead(lead.id, { actualCommission: value })} />
          </div>

          <select className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink" value={lead.commissionStatus} onChange={(event) => updateLead(lead.id, { commissionStatus: event.target.value })}>
            {commissionStatuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <select className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink" value={lead.commissionAgreement} onChange={(event) => updateLead(lead.id, { commissionAgreement: event.target.value })}>
            <option value="">סוג הסכם עמלה</option>
            <option value="תשלום קבוע לליד">תשלום קבוע לליד</option>
            <option value="תשלום רק על עסקה שנסגרה">תשלום רק על עסקה שנסגרה</option>
            <option value="אחוז משכר טרחת יועץ">אחוז משכר טרחת יועץ</option>
            <option value="סכום קבוע לעסקה סגורה">סכום קבוע לעסקה סגורה</option>
          </select>

          <textarea
            className="focus-field min-h-24 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink"
            defaultValue={lead.notes}
            onBlur={(event) => updateLead(lead.id, { notes: event.target.value })}
            placeholder="הערות"
          />

          <div className="flex flex-wrap gap-2">
            <button className="rounded-2xl bg-mort-ink px-4 py-2 font-black text-white" onClick={() => updateLead(lead.id, { status: "נסגר" })} type="button">סמן כנסגר</button>
            <button className="rounded-2xl bg-emerald-600 px-4 py-2 font-black text-white" onClick={() => updateLead(lead.id, { commissionStatus: "paid" })} type="button">עמלה שולמה</button>
          </div>
        </div>
      </div>
    </article>
  );
}

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

function AdminInput({ label, value, onBlur }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-black text-mort-muted">{label}</span>
      <input
        className="focus-field min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 font-bold text-mort-ink"
        defaultValue={value}
        onBlur={(event) => onBlur(event.target.value)}
      />
    </label>
  );
}
