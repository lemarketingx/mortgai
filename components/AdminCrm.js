import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { formatILS } from "../lib/format";

const DEFAULT_STATUSES = ["חדש", "נשלח ליועץ", "בטיפול", "אושר עקרונית", "נסגר", "לא רלוונטי"];
const DEFAULT_COMMISSION_STATUSES = ["pending", "invoiced", "paid"];

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
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeSearchText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
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

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-mort-muted">{label}</span>
      <input
        type={type}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder || label}
        className="focus-field min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-mort-ink"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-mort-muted">{label}</span>
      <select
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className="focus-field min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-mort-ink"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Metric({ label, value }) {
  return (
    <div className="surface-card p-4">
      <span className="block text-xs font-black text-mort-muted">{label}</span>
      <strong className="number-display mt-1 block text-lg font-black text-mort-ink">{value}</strong>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3">
      <span className="block text-xs font-black text-mort-muted">{label}</span>
      <strong className="mt-1 block break-words text-sm font-black text-mort-ink">{value || "-"}</strong>
    </div>
  );
}

export default function AdminCrm() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [leads, setLeads] = useState([]);
  const [statuses, setStatuses] = useState(DEFAULT_STATUSES);
  const [commissionStatuses, setCommissionStatuses] = useState(DEFAULT_COMMISSION_STATUSES);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");

  const filteredLeads = useMemo(() => {
    const term = normalizeSearchText(query);
    return leads.filter((lead) => {
      const leadStatus = lead.leadStatus || lead.status || "חדש";
      const searchable = normalizeSearchText([
        lead.name,
        lead.phone,
        lead.city,
        lead.source,
        lead.utmSource,
        lead.utmCampaign,
        lead.assignedAdvisor,
      ].join(" "));
      return (!statusFilter || leadStatus === statusFilter) && (!term || searchable.includes(term));
    });
  }, [leads, query, statusFilter]);

  const stats = useMemo(() => {
    const total = leads.length;
    const open = leads.filter((lead) => !["נסגר", "לא רלוונטי"].includes(lead.leadStatus || lead.status || "חדש")).length;
    const closed = leads.filter((lead) => (lead.leadStatus || lead.status) === "נסגר").length;
    const today = new Date().toDateString();
    const todayCount = leads.filter((lead) => lead.createdAt && new Date(lead.createdAt).toDateString() === today).length;
    return { total, open, closed, todayCount };
  }, [leads]);

  useEffect(() => {
    loadLeads({ silent: true });
  }, []);

  function showMessage(text, type = "info") {
    setMessage(text || "");
    setMessageType(type);
  }

  async function loadLeads({ silent = false } = {}) {
    if (!silent) showMessage("", "info");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/leads", { method: "GET" });
      const json = await response.json().catch(() => ({}));

      if (response.status === 401) {
        setIsAuthenticated(false);
        if (!silent) showMessage("יש להתחבר מחדש.", "error");
        return;
      }

      if (!response.ok) {
        throw new Error(getAdminErrorMessage(json.error, json.message));
      }

      setLeads(Array.isArray(json.leads) ? json.leads : []);
      setStatuses(Array.isArray(json.statuses) && json.statuses.length ? json.statuses : DEFAULT_STATUSES);
      setCommissionStatuses(Array.isArray(json.commissionStatuses) && json.commissionStatuses.length ? json.commissionStatuses : DEFAULT_COMMISSION_STATUSES);
      setIsAuthenticated(true);
      if (!silent) showMessage("הלידים נטענו בהצלחה.", "success");
    } catch (error) {
      showMessage(error.message || "לא ניתן לטעון את ה־CRM.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function login(event) {
    event.preventDefault();
    showMessage("", "info");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(getAdminErrorMessage(json.error, json.message || "סיסמה שגויה או שגיאת התחברות."));
      setPassword("");
      await loadLeads();
    } catch (error) {
      setIsAuthenticated(false);
      showMessage(error.message || "שגיאת התחברות", "error");
    } finally {
      setLoading(false);
    }
  }

  async function patchLead(id, changes) {
    setSavingId(id);
    showMessage("", "info");
    try {
      const response = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, changes }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(getAdminErrorMessage(json.error, json.message));
      if (json.lead) {
        setLeads((current) => current.map((lead) => (lead.id === id ? json.lead : lead)));
      }
      showMessage("הליד עודכן.", "success");
    } catch (error) {
      showMessage(error.message || "העדכון נכשל.", "error");
    } finally {
      setSavingId("");
    }
  }

  const messageClass = messageType === "error"
    ? "border-red-200 bg-red-50 text-red-800"
    : messageType === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-blue-200 bg-blue-50 text-blue-800";

  if (!isAuthenticated) {
    return (
      <main dir="rtl" className="min-h-screen px-4 py-8 text-mort-text sm:px-6 lg:px-8">
        <Head>
          <title>Admin CRM | MortgAI</title>
          <meta name="robots" content="noindex,nofollow" />
        </Head>
        <section className="mx-auto max-w-xl glass-card p-6 sm:p-8">
          <span className="pill border-emerald-200 bg-emerald-50 text-emerald-800">CRM פרטי</span>
          <h1 className="mt-4 text-3xl font-black text-mort-ink">כניסת אדמין</h1>
          <p className="mt-2 text-sm font-bold text-mort-muted">התחברות לניהול לידים, סטטוסים, יועצים ועמלות.</p>

          <form className="mt-6 grid gap-3" onSubmit={login}>
            <input
              className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="סיסמת אדמין"
              autoComplete="current-password"
            />
            <button disabled={loading} className="rounded-2xl bg-mort-ink px-5 py-3 font-black text-white disabled:opacity-60" type="submit">
              {loading ? "מתחבר..." : "כניסה ל־CRM"}
            </button>
          </form>

          {message && <div className={`mt-4 rounded-2xl border p-3 text-sm font-black ${messageClass}`}>{message}</div>}
        </section>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen px-4 py-6 text-mort-text sm:px-6 lg:px-8">
      <Head>
        <title>Admin CRM | MortgAI</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div className="mx-auto w-full max-w-[1520px]">
        <section className="glass-card p-5 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="pill border-slate-200 bg-white text-mort-muted">Admin CRM</span>
              <h1 className="mt-3 text-3xl font-black text-mort-ink sm:text-4xl">ניהול לידים</h1>
              <p className="mt-2 max-w-2xl text-sm font-bold text-mort-muted">מסך נקי לניהול פניות, שיוך יועצים, סטטוס טיפול, הערות ועמלות.</p>
            </div>
            <button disabled={loading} onClick={() => loadLeads()} className="rounded-2xl bg-mort-ink px-5 py-3 font-black text-white disabled:opacity-60" type="button">
              {loading ? "טוען..." : "רענון לידים"}
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="סה״כ לידים" value={stats.total} />
            <Metric label="פתוחים לטיפול" value={stats.open} />
            <Metric label="נסגרו" value={stats.closed} />
            <Metric label="נוצרו היום" value={stats.todayCount} />
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_240px]">
            <input
              className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="חיפוש לפי שם, טלפון, עיר, מקור או יועץ"
            />
            <select
              className="focus-field min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-mort-ink"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">כל הסטטוסים</option>
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>

          {message && <div className={`mt-4 rounded-2xl border p-3 text-sm font-black ${messageClass}`}>{message}</div>}
        </section>

        <section className="mt-5 grid gap-4">
          {!loading && filteredLeads.length === 0 && (
            <div className="fintech-card p-8 text-center">
              <h2 className="text-2xl font-black text-mort-ink">אין לידים להצגה</h2>
              <p className="mt-2 font-bold text-mort-muted">אם שלחת ליד מהאתר והוא לא מופיע כאן — הבעיה כנראה בשמירה ל־Supabase או בעמודות הטבלה.</p>
            </div>
          )}

          {filteredLeads.map((lead) => {
            const leadStatus = lead.leadStatus || lead.status || "חדש";
            const isSaving = savingId === lead.id;
            return (
              <article key={lead.id} className="fintech-card overflow-hidden p-5 sm:p-6">
                <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-black text-mort-ink">{lead.name || "ליד ללא שם"}</h2>
                      <span className={`pill ${statusClasses(leadStatus)}`}>{leadStatus}</span>
                      {isSaving && <span className="pill border-amber-200 bg-amber-50 text-amber-800">שומר...</span>}
                    </div>
                    <p className="mt-1 text-sm font-bold text-mort-muted">נוצר: {formatDate(lead.createdAt)} · עודכן: {formatDate(lead.lastUpdated)}</p>
                  </div>
                  <a className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-center font-black text-mort-ink" href={lead.phone ? `tel:${lead.phone}` : undefined}>חיוג לליד</a>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Detail label="טלפון" value={lead.phone} />
                  <Detail label="עיר" value={lead.city} />
                  <Detail label="סכום משכנתא" value={formatILS(toNumber(lead.mortgageAmount))} />
                  <Detail label="סיכוי אישור" value={lead.approvalScore || lead.estimatedApprovalResult ? `${lead.approvalScore || lead.estimatedApprovalResult}%` : "-"} />
                  <Detail label="בעיה מרכזית" value={lead.mainIssue} />
                  <Detail label="מקור" value={lead.source || lead.utmSource} />
                  <Detail label="קמפיין" value={lead.utmCampaign} />
                  <Detail label="דף נחיתה" value={lead.landingPage} />
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <Select label="סטטוס ליד" value={leadStatus} options={statuses} onChange={(value) => patchLead(lead.id, { leadStatus: value, status: value })} />
                  <Input label="שם יועץ" value={lead.assignedAdvisor} onChange={(value) => patchLead(lead.id, { assignedAdvisor: value })} />
                  <Input label="טלפון יועץ" value={lead.advisorPhone} onChange={(value) => patchLead(lead.id, { advisorPhone: value })} />
                  <Input label="אימייל יועץ" value={lead.advisorEmail} onChange={(value) => patchLead(lead.id, { advisorEmail: value })} />
                  <Input label="עמלה צפויה" value={lead.expectedCommission || lead.commissionAmount} onChange={(value) => patchLead(lead.id, { expectedCommission: value, commissionAmount: value })} />
                  <Select label="סטטוס עמלה" value={lead.commissionStatus || "pending"} options={commissionStatuses} onChange={(value) => patchLead(lead.id, { commissionStatus: value })} />
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-black text-mort-muted">הערות טיפול</span>
                    <textarea
                      className="focus-field min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-mort-ink"
                      value={lead.internalNotes || lead.notes || ""}
                      onChange={(event) => patchLead(lead.id, { internalNotes: event.target.value, notes: event.target.value })}
                      placeholder="הערות פנימיות על הליד"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-black text-mort-muted">הסכם / הערת עמלה</span>
                    <textarea
                      className="focus-field min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-mort-ink"
                      value={lead.commissionAgreement || ""}
                      onChange={(event) => patchLead(lead.id, { commissionAgreement: event.target.value })}
                      placeholder="פרטי הסכם עמלה"
                    />
                  </label>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
