import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { formatILS } from "../../lib/format";

const statusOptions = ["חדש", "נשלח ליועץ", "בטיפול", "אושר עקרונית", "נסגר", "לא רלוונטי"];

function getLeadScore(lead) {
  return Math.round(Number(lead.approvalScore || lead.approval || lead.leadScore) || 0);
}

function getLeadAmount(lead) {
  return Number(lead.mortgageAmount || lead.mortgage || 0);
}

function getStatusTone(status = "") {
  if (status.includes("אושר") || status.includes("נסגר")) return "bg-emerald-50 text-emerald-800 ring-emerald-100";
  if (status.includes("בטיפול") || status.includes("נשלח")) return "bg-violet-50 text-violet-800 ring-violet-100";
  if (status.includes("לא")) return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-amber-50 text-amber-800 ring-amber-100";
}

export default function AdvisorDashboard() {
  const [leads, setLeads] = useState([]);
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch("/api/advisor/leads");
    if (!r.ok) {
      window.location.href = "/advisor/login";
      return;
    }
    const j = await r.json();
    setLeads(j.leads || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function update(id, changes) {
    const r = await fetch("/api/advisor/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, changes }),
    });
    if (!r.ok) {
      setMsg("שמירה נכשלה");
      return;
    }
    const j = await r.json();
    setLeads((arr) => arr.map((l) => (l.id === id ? j.lead : l)));
    setMsg("העדכון נשמר בהצלחה");
  }

  const stats = useMemo(() => {
    const active = leads.filter((lead) => !["נסגר", "לא רלוונטי"].includes(lead.leadStatus || lead.status)).length;
    const followUps = leads.filter((lead) => lead.followUpDate).length;
    const avgScore = leads.length
      ? Math.round(leads.reduce((sum, lead) => sum + getLeadScore(lead), 0) / leads.length)
      : 0;
    return { active, followUps, avgScore };
  }, [leads]);

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6">
      <Head>
        <title>Advisor Portal</title>
      </Head>

      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_1fr] lg:p-8">
            <div>
              <span className="inline-flex rounded-full bg-violet-50 px-4 py-2 text-sm font-black text-violet-800">
                מרקטפלייס לידים ליועצים
              </span>
              <h1 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">פורטל יועץ</h1>
              <p className="mt-3 max-w-2xl text-base font-bold leading-7 text-slate-600">
                לידים משויכים בלבד, עם אומדן ראשוני, סטטוס טיפול ומועד מעקב. המטרה היא לעזור לכם לתעדף שיחות בלי לשנות את תהליך העבודה הקיים.
              </p>
              {msg && <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-black text-violet-800 ring-1 ring-violet-100">{msg}</p>}
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <Metric label="לידים פעילים" value={stats.active} />
              <Metric label="מעקבים מתוזמנים" value={stats.followUps} />
              <Metric label="ציון ממוצע" value={leads.length ? `${stats.avgScore}%` : "--"} />
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4">
          {!leads.length && (
            <article className="rounded-[26px] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <h2 className="text-xl font-black text-slate-900">אין לידים משויכים כרגע</h2>
              <p className="mt-2 font-bold text-slate-500">ברגע שיוקצו לידים ליועץ זה, הם יופיעו כאן עם פרטי קשר, אומדן ושדות טיפול.</p>
            </article>
          )}

          {leads.map((lead) => {
            const status = lead.leadStatus || lead.status || "חדש";
            const score = getLeadScore(lead);
            const amount = getLeadAmount(lead);
            return (
              <article key={lead.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-black text-slate-950">{lead.name}</h2>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${getStatusTone(status)}`}>{status}</span>
                      {score > 0 && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">אומדן {score}%</span>}
                    </div>
                    <p className="mt-2 text-sm font-bold text-slate-500">
                      נוצר: {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("he-IL") : "לא ידוע"} · מעקב: {lead.followUpDate || "לא הוגדר"}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm font-black sm:grid-cols-3 lg:min-w-[420px]">
                    <LeadFact label="טלפון" value={lead.phone || "--"} />
                    <LeadFact label="סכום מבוקש" value={amount ? formatILS(amount) : "--"} />
                    <LeadFact label="מקור" value={lead.source || lead.purchaseStatus || "--"} />
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_220px_180px]">
                  <label className="block">
                    <span className="text-sm font-black text-slate-700">הערות טיפול</span>
                    <textarea
                      className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 font-bold outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                      defaultValue={lead.internalNotes || ""}
                      onBlur={(e) => update(lead.id, { internalNotes: e.target.value, lastContactedAt: new Date().toISOString() })}
                      placeholder="סיכום שיחה, חסמים, מסמכים חסרים או הצעד הבא"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-black text-slate-700">סטטוס</span>
                    <select
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 font-black outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                      value={status}
                      onChange={(e) => update(lead.id, { leadStatus: e.target.value, lastContactedAt: new Date().toISOString() })}
                    >
                      {statusOptions.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-black text-slate-700">מעקב הבא</span>
                    <input
                      type="date"
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 font-black outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                      defaultValue={lead.followUpDate?.slice(0, 10) || ""}
                      onBlur={(e) => update(lead.id, { followUpDate: e.target.value })}
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

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="number-display mt-1 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function LeadFact({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 truncate text-slate-950">{value}</p>
    </div>
  );
}
