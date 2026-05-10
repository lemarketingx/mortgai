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
  };
  return messages[errorCode] || "לא ניתן להשלים את הפעולה כרגע.";
}

export default function PrivateAdmin() {
  const [leads, setLeads] = useState([]);
  const [statuses, setStatuses] = useState(fallbackStatuses);
  const [commissionStatuses, setCommissionStatuses] = useState(fallbackCommissionStatuses);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [advisorFilter, setAdvisorFilter] = useState("");
  const [message, setMessage] = useState("");
  const [advisors, setAdvisors] = useState([]);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const filteredLeads = useMemo(() => {
    const term = query.trim();
    return leads.filter((lead) => {
      const matchesStatus = !statusFilter || (lead.leadStatus || lead.status) === statusFilter;
      const matchesAdvisor = !advisorFilter || lead.assignedAdvisorId === advisorFilter;
      const matchesQuery = !term || `${lead.name} ${lead.phone} ${lead.city}`.includes(term);
      return matchesStatus && matchesAdvisor && matchesQuery;
    });
  }, [leads, query, statusFilter, advisorFilter]);
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
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthenticated(false);
          setMessage(adminApiMessage(json.error || "ADMIN_AUTH_REQUIRED"));
          return;
        }
        throw new Error(adminApiMessage(json.error) || json.message || "Lead load failed");
      }

      setLeads(json.leads || []);
      setStatuses(json.statuses || fallbackStatuses);
      setCommissionStatuses(json.commissionStatuses || fallbackCommissionStatuses);
      setAdvisors(json.advisors || []);
      setIsAuthenticated(true);
      if (!json.leads?.length) {
        setMessage("אין לידים להצגה כרגע. אם שלחת ליד לבדיקה, ודא שהשמירה ל-Supabase הצליחה.");
      }
    } catch (error) {
      setMessage(error.message || "לא ניתן לטעון את הלידים כרגע.");
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
        <meta name="robots" content="noindex,nofollow" key="robots" />
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
          <div className="grid gap-3 md:grid-cols-[1fr_220px_220px_auto_auto]">
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
            <input className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink" value={advisorFilter} onChange={(event)=>setAdvisorFilter(event.target.value)} placeholder="סינון לפי advisorId" />
            <button disabled={loading} onClick={loadLeads} className="rounded-2xl bg-mort-ink px-5 py-3 font-black text-white shadow-soft disabled:opacity-60" type="button">
              {loading ? "טוען..." : "רענון"}
            </button>
            <a className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center font-black text-mort-ink shadow-soft" href="/api/admin/export">
              ייצוא CSV
            </a>
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
              advisors={advisors}
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

function LeadCard({ lead, statuses, commissionStatuses, advisors, updateLead }) {
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

  const advisorExists = !draft.assignedAdvisorId || advisors.some((advisor) => String(advisor.advisor_id) === String(draft.assignedAdvisorId));

  async function saveLead() {
    setIsSaving(true);
    setSaveMessage("");
    const result = await updateLead(lead.id, { ...draft, status: draft.leadStatus });
    if (result?.ok) setSaveMessage("הליד עודכן בהצלחה.");
    else setSaveMessage(result?.error || "שמירת הליד נכשלה.");
    setIsSaving(false);
  }

  async function markCommissionPaid() {
    setIsSaving(true);
    setSaveMessage("");
    const result = await updateLead(lead.id, { commissionStatus: "paid" });
    if (result?.ok) {
      setDraft((current) => ({ ...current, commissionStatus: "paid" }));
      setSaveMessage("העמלה סומנה כשולמה.");
    } else {
      setSaveMessage(result?.error || "עדכון סטטוס העמלה נכשל.");
    }
    setIsSaving(false);
  }

  return (
    <article className="fintech-card p-5 sm:p-6">
      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-mort-ink">{lead.name || "ללא שם"}</h2>
              <p className="font-bold text-mort-muted">{lead.phone} · {lead.city || "עיר לא צוינה"}</p>
            </div>
            <span className="pill border-emerald-200 bg-emerald-50 text-emerald-800">{draft.leadStatus}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info label="סכום משכנתא" value={formatILS(lead.mortgageAmount)} />
            <Info label="סטטוס רכישה" value={lead.purchaseStatus || "לא צוין"} />
            <Info label="סיכוי אישור" value={`${Math.round(Number(lead.approvalScore) || 0)}%`} />
            <Info label="מקור" value={lead.source || "mortgai2"} />
            <Info label="נוצר" value={new Date(lead.createdAt).toLocaleString("he-IL")} />
          </div>
        </div>

        <div className="grid gap-3">
          <select className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink" value={draft.leadStatus} onChange={(event) => setDraft((c) => ({ ...c, leadStatus: event.target.value }))}>
            {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <div className="grid gap-3 md:grid-cols-2">
            <AdminInput label="Advisor ID" value={draft.assignedAdvisorId} onChange={(value) => setDraft((c) => ({ ...c, assignedAdvisorId: value }))} />
            <AdminInput label="שם יועץ" value={draft.assignedAdvisor} onChange={(value) => setDraft((c) => ({ ...c, assignedAdvisor: value }))} />
            <AdminInput label="טלפון יועץ" value={draft.advisorPhone} onChange={(value) => setDraft((c) => ({ ...c, advisorPhone: value }))} />
            <AdminInput label='אימייל יועץ' value={draft.advisorEmail} onChange={(value) => setDraft((c) => ({ ...c, advisorEmail: value }))} />
            <AdminInput label="סכום עמלה" value={draft.commissionAmount} onChange={(value) => setDraft((c) => ({ ...c, commissionAmount: value }))} />
            <AdminInput label="תאריך מעקב" type="date" value={draft.followUpDate?.slice(0,10)} onChange={(value) => setDraft((c) => ({ ...c, followUpDate: value }))} />
          </div>
          {!advisorExists && <p className="rounded-2xl bg-amber-100 p-2 text-sm font-bold text-amber-800">לא נמצא Advisor ID כזה בטבלת היועצים.</p>}
          <AdminInput label="יצירת קשר אחרון" value={draft.lastContactedAt} onChange={(value) => setDraft((c) => ({ ...c, lastContactedAt: value }))} />
          <select className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink" value={draft.commissionStatus} onChange={(event) => setDraft((c) => ({ ...c, commissionStatus: event.target.value }))}>
            {commissionStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <textarea className="focus-field min-h-24 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink" value={draft.internalNotes} onChange={(event) => setDraft((c) => ({ ...c, internalNotes: event.target.value }))} placeholder="הערות" />
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
      <input
        className="focus-field min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 font-bold text-mort-ink"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
