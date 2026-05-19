import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatILS } from "../../lib/format";

const STATUS_OPTIONS = ["חדש", "בטיפול", "נקבעה שיחה", "אושר עקרונית", "נסגר", "לא רלוונטי"];

const QUALITY_CONFIG = {
  חם:     { cls: "bg-emerald-100 text-emerald-700 border-emerald-300", icon: "🔥" },
  בינוני: { cls: "bg-amber-100 text-amber-700 border-amber-300",       icon: "☀️" },
  חלש:    { cls: "bg-slate-100 text-slate-500 border-slate-200",       icon: "❄️" },
};

function AdvisorNav({ active }) {
  const links = [
    { href: "/advisor", label: "סקירה כללית" },
    { href: "/advisor/leads", label: "חנות לידים" },
    { href: "/advisor/my-leads", label: "הלידים שלי" },
  ];
  return (
    <nav className="flex gap-1 mt-3 border-b border-slate-800 px-4">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`px-4 py-2.5 text-sm font-bold rounded-t-lg transition-colors ${active === href ? "bg-white text-slate-950" : "text-slate-400 hover:text-white"}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

function QualityBadge({ quality }) {
  const cfg = QUALITY_CONFIG[quality] || QUALITY_CONFIG["בינוני"];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full border ${cfg.cls}`}>
      {cfg.icon} {quality || "בינוני"}
    </span>
  );
}

function ScoreBar({ score }) {
  const pct = Math.min(100, Math.max(0, Number(score) || 0));
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-slate-300";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-black text-slate-500 w-8 text-left">{pct}%</span>
    </div>
  );
}

function MyLeadCard({ lead, onUpdate }) {
  const [notes, setNotes] = useState(lead.internalNotes || "");
  const [saving, setSaving] = useState(false);

  const score = Math.round(Number(lead.approvalScore || lead.estimatedApprovalResult) || 0);
  const quality = lead.leadQuality || (score >= 70 ? "חם" : score >= 40 ? "בינוני" : "חלש");
  const created = new Date(lead.createdAt).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });
  const purchasedAt = lead.purchasedAt ? new Date(lead.purchasedAt).toLocaleDateString("he-IL", { day: "numeric", month: "short" }) : "";

  async function saveNotes() {
    setSaving(true);
    await onUpdate(lead.id, { internalNotes: notes, lastContactedAt: new Date().toISOString() });
    setSaving(false);
  }

  return (
    <article className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-violet-200 transition-colors">

      {/* Header — full contact info visible */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <QualityBadge quality={quality} />
            {lead.isExclusive && (
              <span className="text-xs font-black text-violet-700 bg-violet-100 border border-violet-200 px-2 py-0.5 rounded-full">בלעדי</span>
            )}
            {lead.city && <span className="text-xs font-bold text-slate-500">📍 {lead.city}</span>}
          </div>
          <h2 className="text-lg font-black text-slate-950">{lead.name || "—"}</h2>
          {lead.phone ? (
            <a href={`tel:${lead.phone}`} className="text-sm font-bold text-violet-600 hover:underline">{lead.phone}</a>
          ) : (
            <span className="text-sm text-slate-400">אין טלפון</span>
          )}
        </div>
        <div className="text-left shrink-0">
          <p className="text-xl font-black text-slate-950">{formatILS(lead.mortgageAmount || 0)}</p>
          <p className="text-xs text-slate-400 mt-0.5">ליד נוצר {created}</p>
          {purchasedAt && <p className="text-xs text-violet-500 mt-0.5">נרכש {purchasedAt}</p>}
        </div>
      </div>

      {/* Approval score */}
      <div className="mb-4">
        <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
          <span>סיכוי אישור (אומדן)</span>
          <span>{score}%</span>
        </div>
        <ScoreBar score={score} />
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        {lead.monthlyIncome > 0 && (
          <span className="bg-slate-50 border border-slate-200 px-3 py-1 rounded-full font-bold text-slate-700">
            הכנסה: {formatILS(lead.monthlyIncome)}
          </span>
        )}
        {lead.contractStatus && (
          <span className="bg-slate-50 border border-slate-200 px-3 py-1 rounded-full font-bold text-slate-700">{lead.contractStatus}</span>
        )}
        {lead.employmentStatus && (
          <span className="bg-slate-50 border border-slate-200 px-3 py-1 rounded-full font-bold text-slate-700">{lead.employmentStatus}</span>
        )}
        {lead.mainIssue && (
          <span className="bg-violet-50 border border-violet-100 px-3 py-1 rounded-full font-bold text-violet-700">{lead.mainIssue}</span>
        )}
      </div>

      {/* Status + follow-up */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-black text-slate-500 mb-1">סטטוס</label>
          <select
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-violet-400"
            value={lead.leadStatus || lead.status || "חדש"}
            onChange={(e) => onUpdate(lead.id, { leadStatus: e.target.value, lastContactedAt: new Date().toISOString() })}
          >
            {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-black text-slate-500 mb-1">מועד מעקב</label>
          <input
            type="date"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-violet-400"
            defaultValue={lead.followUpDate?.slice(0, 10) || ""}
            onBlur={(e) => onUpdate(lead.id, { followUpDate: e.target.value })}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-black text-slate-500 mb-1">הערות פנימיות</label>
        <textarea
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-violet-400 resize-none"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          placeholder="הוסיפו הערות, תיאום שיחה, עדכון סטטוס..."
        />
        {saving && <p className="text-xs text-slate-400 mt-1">שומר...</p>}
      </div>
    </article>
  );
}

export default function AdvisorMyLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("הכל");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/advisor/my-leads");
    if (r.status === 401) { window.location.href = "/advisor/login"; return; }
    if (!r.ok) { setError("שגיאה בטעינת הלידים."); setLoading(false); return; }
    const j = await r.json();
    setLeads(j.leads || []);
    setLoading(false);
  }

  async function update(id, changes) {
    const r = await fetch("/api/advisor/my-leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, changes }),
    });
    if (!r.ok) { setError("שמירה נכשלה"); return; }
    const j = await r.json();
    setLeads((arr) => arr.map((l) => l.id === id ? { ...l, ...j.lead } : l));
    setError("");
  }

  const hot    = leads.filter((l) => l.leadQuality === "חם");
  const warm   = leads.filter((l) => l.leadQuality === "בינוני");
  const filtered = filter === "חם" ? hot : filter === "בינוני" ? warm : leads;

  return (
    <>
      <Head>
        <title>הלידים שלי | FINZO</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main dir="rtl" className="min-h-screen bg-slate-50">

        <header className="bg-slate-950 text-white px-4 pb-0 pt-4 sticky top-0 z-40">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-3">
                <span className="text-lg font-black">FINZO</span>
                <span className="text-xs text-violet-400 font-bold">פורטל יועצים</span>
              </div>
              <button
                onClick={() => { fetch("/api/advisor/login", { method: "DELETE" }).finally(() => { window.location.href = "/advisor/login"; }); }}
                className="text-xs text-slate-400 hover:text-white font-bold transition-colors"
              >
                יציאה
              </button>
            </div>
            <AdvisorNav active="/advisor/my-leads" />
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-4 py-8">

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "סה״כ לידים", value: leads.length, color: "text-slate-950" },
              { label: "🔥 חמים", value: hot.length, color: "text-emerald-600" },
              { label: "☀️ בינוניים", value: warm.length, color: "text-amber-600" },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs font-bold text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div className="flex gap-2 flex-wrap mb-6">
            {[
              { key: "הכל", label: `הכל (${leads.length})` },
              { key: "חם", label: `🔥 חמים (${hot.length})` },
              { key: "בינוני", label: `☀️ בינוניים (${warm.length})` },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`text-sm font-bold px-4 py-2 rounded-full border transition-colors ${filter === key ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-500 border-slate-200 hover:border-violet-300"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-bold">{error}</div>}

          {loading && <div className="text-center py-16 text-slate-500 font-bold">טוען לידים...</div>}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-black text-slate-950 text-lg">עדיין לא רכשתם לידים</p>
              <p className="text-slate-500 mt-2 text-sm">עברו לחנות הלידים כדי לגלוש בלידים הזמינים.</p>
              <Link href="/advisor/leads" className="mt-4 inline-block rounded-full bg-violet-700 text-white px-6 py-3 text-sm font-black hover:bg-violet-800 transition-colors">
                לחנות הלידים ←
              </Link>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((lead) => (
              <MyLeadCard key={lead.id} lead={lead} onUpdate={update} />
            ))}
          </div>

        </div>
      </main>
    </>
  );
}
