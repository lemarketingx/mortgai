import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatILS } from "../../lib/format";
import { KpiTile, Pill, Tag, Skeleton, EmptyState } from "../../components/ui";

const QUALITY_TAG = { "חם": "upgrade", "בינוני": "refi", "חלש": "danger" };
const STATUS_OPTIONS = ["חדש", "נשלח ליועץ", "בטיפול", "אושר עקרונית", "נסגר", "לא רלוונטי"];

function ScoreBar({ score }) {
  const pct = Math.min(100, Math.max(0, Number(score) || 0));
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-slate-300";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-black text-slate-500 w-8 text-start tabular-nums">{pct}%</span>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton variant="line" className="w-20 h-5 rounded-full" />
          <Skeleton variant="title" />
          <Skeleton variant="line" className="w-28" />
        </div>
        <div className="space-y-2 shrink-0">
          <Skeleton variant="line" className="w-24 h-6" />
          <Skeleton variant="line" className="w-16" />
        </div>
      </div>
      <Skeleton variant="line" />
      <div className="flex gap-2">
        <Skeleton variant="line" className="w-24 h-6 rounded-full" />
        <Skeleton variant="line" className="w-20 h-6 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton variant="block" className="h-9" />
        <Skeleton variant="block" className="h-9" />
      </div>
    </div>
  );
}

function LeadCard({ lead, onUpdate }) {
  const [notes, setNotes] = useState(lead.internalNotes || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function saveNotes() {
    if (notes === (lead.internalNotes || "")) return;
    setSaving(true);
    await onUpdate(lead.id, { internalNotes: notes, lastContactedAt: new Date().toISOString() });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const score = Math.round(Number(lead.approvalScore) || 0);
  const quality = lead.leadQuality || (score >= 70 ? "חם" : score >= 40 ? "בינוני" : "חלש");
  const tagVariant = QUALITY_TAG[quality] || "default";
  const isHot = quality === "חם";
  const created = new Date(lead.createdAt).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });
  const purchasedAt = lead.purchasedAt
    ? new Date(lead.purchasedAt).toLocaleDateString("he-IL", { day: "numeric", month: "short" })
    : "";

  return (
    <article className={`bg-white rounded-2xl p-5 shadow-sm transition-colors border ${
      isHot ? "border-emerald-200 hover:border-emerald-300" : "border-slate-200 hover:border-violet-200"
    }`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <Tag variant={tagVariant}>{quality}</Tag>
            {lead.isExclusive && <Tag variant="exclusive">בלעדי</Tag>}
            {lead.city && <span className="text-xs text-slate-500 font-bold">📍 {lead.city}</span>}
          </div>
          <h2 className="text-base font-black text-slate-950 truncate">{lead.name}</h2>
          <a href={`tel:${lead.phone}`} className="text-sm font-bold text-violet-600 hover:underline">
            {lead.phone}
          </a>
        </div>
        <div className="text-start shrink-0">
          <p className="text-lg font-black text-slate-950 tabular-nums">{formatILS(lead.mortgageAmount || 0)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{created}</p>
          {purchasedAt && <p className="text-xs text-violet-500 mt-0.5">נרכש {purchasedAt}</p>}
        </div>
      </div>

      {/* Score bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5">
          <span>סיכוי אישור</span>
          <span className="tabular-nums">{score}%</span>
        </div>
        <ScoreBar score={score} />
      </div>

      {/* Meta pills */}
      {(lead.monthlyIncome || lead.purchaseStatus || lead.employmentStatus) && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {lead.monthlyIncome && (
            <span className="text-xs bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full font-bold text-slate-700">
              הכנסה: {formatILS(lead.monthlyIncome)}
            </span>
          )}
          {lead.purchaseStatus && (
            <span className="text-xs bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full font-bold text-slate-700">
              {lead.purchaseStatus}
            </span>
          )}
          {lead.employmentStatus && (
            <span className="text-xs bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full font-bold text-slate-700">
              {lead.employmentStatus}
            </span>
          )}
        </div>
      )}

      {/* Status + follow-up */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-black text-slate-500 mb-1">סטטוס</label>
          <select
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
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
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
            defaultValue={lead.followUpDate?.slice(0, 10) || ""}
            onBlur={(e) => onUpdate(lead.id, { followUpDate: e.target.value })}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-black text-slate-500 mb-1">הערות פנימיות</label>
        <textarea
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white resize-none"
          rows={2}
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
          onBlur={saveNotes}
          placeholder="הוסיפו הערות, תיאום שיחה, עדכון סטטוס..."
        />
        <p className={`text-xs mt-1 font-bold h-4 transition-opacity ${saved || saving ? "opacity-100" : "opacity-0"} ${saved ? "text-emerald-600" : "text-slate-400"}`}>
          {saving ? "שומר..." : "נשמר ✓"}
        </p>
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
          className={`px-4 py-2.5 text-sm font-bold rounded-t-lg transition-colors ${
            active === href ? "bg-white text-slate-950" : "text-slate-400 hover:text-white"
          }`}
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

  const hot  = leads.filter((l) => (l.leadQuality === "חם")     || (!l.leadQuality && Number(l.approvalScore) >= 70));
  const warm = leads.filter((l) => (l.leadQuality === "בינוני") || (!l.leadQuality && Number(l.approvalScore) >= 40 && Number(l.approvalScore) < 70));
  const cold = leads.filter((l) => (l.leadQuality === "חלש")    || (!l.leadQuality && Number(l.approvalScore) < 40));
  const filtered = filter === "חם" ? hot : filter === "בינוני" ? warm : filter === "חלש" ? cold : leads;

  return (
    <>
      <Head>
        <title>פורטל יועצים | FINZO</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main dir="rtl" className="min-h-screen bg-slate-50">

        <header className="bg-slate-950 text-white px-4 pb-0 pt-4 sticky top-0 z-40">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-3">
                <span className="text-lg font-black">FINZO</span>
                <span className="text-xs font-black text-violet-400 bg-violet-400/10 border border-violet-400/20 px-2 py-0.5 rounded-full tracking-wide">PRO</span>
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

          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                  <Skeleton variant="line" className="w-20" />
                  <Skeleton variant="line" className="w-10 h-8" />
                </div>
              ))
            ) : (
              <>
                <KpiTile label="לידים שלי" value={leads.length} />
                <KpiTile label="חמים" value={hot.length} delta={hot.length > 0 ? "ממתינים לטיפול" : undefined} deltaDir="up" />
                <KpiTile label="בינוניים" value={warm.length} />
                <KpiTile label="חלשים" value={cold.length} />
              </>
            )}
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 flex-wrap mb-6">
            <Pill active={filter === "הכל"}    count={leads.length} onClick={() => setFilter("הכל")}>הכל</Pill>
            <Pill active={filter === "חם"}     count={hot.length}   onClick={() => setFilter("חם")}>חמים</Pill>
            <Pill active={filter === "בינוני"} count={warm.length}  onClick={() => setFilter("בינוני")}>בינוניים</Pill>
            <Pill active={filter === "חלש"}    count={cold.length}  onClick={() => setFilter("חלש")}>חלשים</Pill>
          </div>

          {msg && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-bold">{msg}</div>
          )}

          {/* Skeleton cards */}
          {loading && (
            <div className="grid gap-4">
              {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          )}

          {/* Empty states */}
          {!loading && filtered.length === 0 && filter === "הכל" && (
            <EmptyState
              glyph="📋"
              title="עדיין אין לידים"
              description="רכשו לידים מחנות הלידים כדי לנהל אותם כאן."
              action={
                <Link href="/advisor/leads" className="inline-block rounded-full bg-violet-700 text-white px-6 py-3 text-sm font-black hover:bg-violet-800 transition-colors">
                  לחנות הלידים ←
                </Link>
              }
            />
          )}
          {!loading && filtered.length === 0 && filter !== "הכל" && (
            <EmptyState
              glyph="🔍"
              title="אין לידים בקטגוריה זו"
              description="נסו לשנות את הסינון."
            />
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
