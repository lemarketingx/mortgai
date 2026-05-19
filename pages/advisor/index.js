import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatILS } from "../../lib/format";

const QUALITY_CONFIG = {
  חם:     { cls: "bg-emerald-100 text-emerald-700 border-emerald-300", dot: "bg-emerald-500", icon: "🔥" },
  בינוני: { cls: "bg-amber-100 text-amber-700 border-amber-300",   dot: "bg-amber-400",   icon: "☀️" },
  חלש:    { cls: "bg-slate-100 text-slate-500 border-slate-200",   dot: "bg-slate-400",   icon: "❄️" },
};

const STATUS_OPTIONS = ["חדש", "נשלח ליועץ", "בטיפול", "אושר עקרונית", "נסגר", "לא רלוונטי"];

function QualityBadge({ quality }) {
  const cfg = QUALITY_CONFIG[quality] || QUALITY_CONFIG["בינוני"];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full border ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
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
      <span className="text-xs font-black text-mort-muted w-8 text-left">{pct}%</span>
    </div>
  );
}

function LeadCard({ lead, onUpdate }) {
  const [notes, setNotes] = useState(lead.internalNotes || "");
  const [saving, setSaving] = useState(false);

  async function saveNotes() {
    setSaving(true);
    await onUpdate(lead.id, { internalNotes: notes, lastContactedAt: new Date().toISOString() });
    setSaving(false);
  }

  const score = Math.round(Number(lead.approvalScore) || 0);
  const quality = lead.leadQuality || (score >= 70 ? "חם" : score >= 40 ? "בינוני" : "חלש");
  const created = new Date(lead.createdAt).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });

  return (
    <article className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft hover:border-violet-200 transition-colors">

      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <QualityBadge quality={quality} />
            {lead.city && (
              <span className="text-xs text-mort-muted font-bold">📍 {lead.city}</span>
            )}
          </div>
          <h2 className="text-lg font-black text-mort-ink">{lead.name}</h2>
          <a href={`tel:${lead.phone}`} className="text-sm font-bold text-violet-600 hover:underline">{lead.phone}</a>
        </div>
        <div className="text-left shrink-0">
          <p className="text-xl font-black text-mort-ink font-number">{formatILS(lead.mortgageAmount || 0)}</p>
          <p className="text-xs text-mort-muted mt-0.5">{created}</p>
        </div>
      </div>

      {/* Score bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs font-bold text-mort-muted mb-1">
          <span>סיכוי אישור</span>
          <span>{score}%</span>
        </div>
        <ScoreBar score={score} />
      </div>

      {/* Meta pills */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        {lead.monthlyIncome && (
          <span className="bg-surface-low border border-surface-high px-3 py-1 rounded-full font-bold text-mort-text">
            הכנסה: {formatILS(lead.monthlyIncome)}
          </span>
        )}
        {lead.purchaseStatus && (
          <span className="bg-surface-low border border-surface-high px-3 py-1 rounded-full font-bold text-mort-text">
            {lead.purchaseStatus}
          </span>
        )}
        {lead.employmentStatus && (
          <span className="bg-surface-low border border-surface-high px-3 py-1 rounded-full font-bold text-mort-text">
            {lead.employmentStatus}
          </span>
        )}
      </div>

      {/* Status + follow-up */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-black text-mort-muted mb-1">סטטוס</label>
          <select
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
            value={lead.leadStatus || lead.status || "חדש"}
            onChange={(e) => onUpdate(lead.id, { leadStatus: e.target.value, lastContactedAt: new Date().toISOString() })}
          >
            {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-black text-mort-muted mb-1">מעקב</label>
          <input
            type="date"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
            defaultValue={lead.followUpDate?.slice(0, 10) || ""}
            onBlur={(e) => onUpdate(lead.id, { followUpDate: e.target.value })}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-black text-mort-muted mb-1">הערות פנימיות</label>
        <textarea
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white resize-none"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          placeholder="הוסיפו הערות, תיאום שיחה, עדכון סטטוס..."
        />
        {saving && <p className="text-xs text-mort-muted mt-1">שומר...</p>}
      </div>
    </article>
  );
}

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

export default function AdvisorDashboard() {
  const [leads, setLeads] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("הכל");

  async function load() {
    setLoading(true);
    const r = await fetch("/api/advisor/my-leads");
    if (!r.ok) { window.location.href = "/advisor/login"; return; }
    const j = await r.json();
    setLeads(j.leads || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function update(id, changes) {
    const r = await fetch("/api/advisor/my-leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, changes }),
    });
    if (!r.ok) { setMsg("שמירה נכשלה"); return; }
    const j = await r.json();
    setLeads((arr) => arr.map((l) => (l.id === id ? j.lead : l)));
    setMsg("");
  }

  const hot   = leads.filter((l) => (l.leadQuality === "חם")     || (!l.leadQuality && Number(l.approvalScore) >= 70));
  const warm  = leads.filter((l) => (l.leadQuality === "בינוני") || (!l.leadQuality && Number(l.approvalScore) >= 40 && Number(l.approvalScore) < 70));
  const cold  = leads.filter((l) => (l.leadQuality === "חלש")    || (!l.leadQuality && Number(l.approvalScore) < 40));

  const filtered = filter === "חם" ? hot : filter === "בינוני" ? warm : filter === "חלש" ? cold : leads;

  return (
    <>
      <Head>
        <title>פורטל יועצים | FINZO</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main dir="rtl" className="min-h-screen bg-surface-DEFAULT">

        {/* ── Top bar ── */}
        <header className="bg-mort-ink text-white px-4 pb-0 pt-4 sticky top-0 z-40">
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
            <AdvisorNav active="/advisor" />
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-4 py-8">

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "סה״כ לידים", value: leads.length, color: "text-mort-ink" },
              { label: "🔥 חמים", value: hot.length, color: "text-emerald-600" },
              { label: "☀️ בינוניים", value: warm.length, color: "text-amber-600" },
              { label: "❄️ חלשים", value: cold.length, color: "text-slate-400" },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-soft">
                <p className={`text-2xl font-black font-number ${s.color}`}>{s.value}</p>
                <p className="text-xs font-bold text-mort-muted mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 flex-wrap mb-6">
            {["הכל", "חם", "בינוני", "חלש"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-sm font-bold px-4 py-2 rounded-full border transition-colors ${
                  filter === f
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-mort-muted border-slate-200 hover:border-violet-300"
                }`}
              >
                {f === "הכל" ? `הכל (${leads.length})` : f === "חם" ? `🔥 חמים (${hot.length})` : f === "בינוני" ? `☀️ בינוניים (${warm.length})` : `❄️ חלשים (${cold.length})`}
              </button>
            ))}
          </div>

          {msg && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-bold">{msg}</div>
          )}

          {/* Leads */}
          {loading && (
            <div className="text-center py-16 text-mort-muted font-bold">טוען לידים...</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
              <p className="text-mort-muted font-bold">אין לידים בקטגוריה זו כרגע</p>
            </div>
          )}
          <div className="grid gap-4">
            {filtered.map((lead) => (
              <LeadCard key={lead.id} lead={lead} onUpdate={update} />
            ))}
          </div>

        </div>
      </main>
    </>
  );
}
