import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatILS } from "../../lib/format";
import { KpiTile, Tag, Skeleton, EmptyState } from "../../components/ui";
import AdvisorHeader from "../../components/AdvisorHeader";

const QUALITY_TAG = { "חם": "upgrade", "בינוני": "refi", "חלש": "danger" };
const STATUS_OPTIONS = ["חדש", "בטיפול", "נקבעה שיחה", "אושר עקרונית", "נסגר", "לא רלוונטי"];

const STATUS_BADGE = {
  "חדש":           "bg-violet-50 text-violet-700",
  "בטיפול":        "bg-amber-50 text-amber-700",
  "נקבעה שיחה":    "bg-amber-50 text-amber-700",
  "אושר עקרונית":  "bg-emerald-50 text-emerald-700",
  "נסגר":          "bg-slate-100 text-slate-600",
  "לא רלוונטי":    "bg-slate-100 text-slate-400",
};

function ScoreBar({ score }) {
  const pct = Math.min(100, Math.max(0, Number(score) || 0));
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-slate-300";
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Skeleton variant="line" className="w-16 h-5 rounded-full" />
            <Skeleton variant="line" className="w-14 h-5 rounded-full" />
          </div>
          <Skeleton variant="title" />
          <Skeleton variant="line" className="w-28" />
        </div>
        <div className="space-y-2 shrink-0">
          <Skeleton variant="line" className="w-24 h-6" />
          <Skeleton variant="line" className="w-20" />
        </div>
      </div>
      <Skeleton variant="line" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton variant="block" className="h-9" />
        <Skeleton variant="block" className="h-9" />
      </div>
      <Skeleton variant="block" className="h-14" />
    </div>
  );
}

function MyLeadCard({ lead, onUpdate }) {
  const [notes, setNotes] = useState(lead.internalNotes || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const score = Math.round(Number(lead.approvalScore || lead.estimatedApprovalResult) || 0);
  const quality = lead.leadQuality || (score >= 70 ? "חם" : score >= 40 ? "בינוני" : "חלש");
  const tagVariant = QUALITY_TAG[quality] || "default";
  const isHot = quality === "חם";
  const created = new Date(lead.createdAt).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });
  const purchasedAt = lead.purchasedAt
    ? new Date(lead.purchasedAt).toLocaleDateString("he-IL", { day: "numeric", month: "short" })
    : "";

  const currentStatus = lead.leadStatus || lead.status || "חדש";
  const statusBadgeClass = STATUS_BADGE[currentStatus] || STATUS_BADGE["חדש"];

  const followUpVal = lead.followUpDate?.slice(0, 10) || "";
  const isOverdue = followUpVal && new Date(followUpVal) < new Date(new Date().toDateString());

  async function saveNotes() {
    if (notes === (lead.internalNotes || "")) return;
    setSaving(true);
    await onUpdate(lead.id, { internalNotes: notes, lastContactedAt: new Date().toISOString() });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <article className={`bg-white rounded-2xl p-3.5 shadow-sm border ${
      isHot ? "border-emerald-200" : "border-slate-100"
    }`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Tag variant={tagVariant}>{quality}</Tag>
            {lead.isExclusive && <Tag variant="exclusive">בלעדי</Tag>}
            <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${statusBadgeClass}`}>
              {currentStatus}
            </span>
          </div>
          <h2 className="text-base font-black text-slate-950 truncate mb-1">{lead.name || "—"}</h2>
          {lead.phone ? (
            <a href={`tel:${lead.phone}`} className="text-base font-black text-violet-600 hover:underline tracking-wide">
              {lead.phone}
            </a>
          ) : (
            <span className="text-sm text-slate-400">אין טלפון</span>
          )}
        </div>
        <div className="text-start shrink-0">
          <p className="text-lg font-black text-slate-950 tabular-nums">{formatILS(lead.mortgageAmount || 0)}</p>
          <p className="text-xs text-slate-400 mt-1">נוצר {created}</p>
          {purchasedAt && <p className="text-xs text-violet-500 mt-0.5">נרכש {purchasedAt}</p>}
        </div>
      </div>

      {/* Score */}
      <div className="mb-3">
        <div className="flex justify-between text-xs font-bold text-slate-400 mb-1.5">
          <span>ציון FINZO</span>
          <span className="tabular-nums font-black text-slate-600">{score}/100</span>
        </div>
        <ScoreBar score={score} />
      </div>

      {/* Meta — income + main issue only */}
      {(lead.monthlyIncome > 0 || lead.mainIssue) && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {lead.monthlyIncome > 0 && (
            <span className="text-xs bg-slate-50 px-2.5 py-1 rounded-full font-bold text-slate-700">
              הכנסה: {formatILS(lead.monthlyIncome)}
            </span>
          )}
          {lead.mainIssue && (
            <span className="text-xs bg-violet-50 px-2.5 py-1 rounded-full font-bold text-violet-700">
              {lead.mainIssue}
            </span>
          )}
        </div>
      )}

      {/* Status + follow-up */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-black text-slate-400 mb-1">סטטוס</label>
          <select
            className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-violet-400"
            value={currentStatus}
            onChange={(e) => onUpdate(lead.id, { leadStatus: e.target.value, lastContactedAt: new Date().toISOString() })}
          >
            {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-black text-slate-400 mb-1">מועד מעקב</label>
          <input
            type="date"
            className={`w-full border rounded-lg px-2.5 py-2 text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-violet-400 ${
              isOverdue ? "border-amber-300 bg-amber-50/40" : "border-slate-200"
            }`}
            defaultValue={followUpVal}
            onBlur={(e) => onUpdate(lead.id, { followUpDate: e.target.value })}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-black text-slate-400 mb-1">הערות</label>
        <textarea
          className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-violet-400 resize-none"
          rows={3}
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

export default function AdvisorMyLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusTab, setStatusTab] = useState("הכל");

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
  const excl   = leads.filter((l) => l.isExclusive);

  const newLeads    = leads.filter((l) => !l.leadStatus || l.leadStatus === "חדש");
  const activeLeads = leads.filter((l) => l.leadStatus === "בטיפול" || l.leadStatus === "נקבעה שיחה");
  const approvedLeads = leads.filter((l) => l.leadStatus === "אושר עקרונית");

  const statusTabs = [
    { key: "הכל",    label: "הכל",           count: leads.length },
    { key: "חדשים",  label: "חדשים",          count: newLeads.length },
    { key: "בטיפול", label: "בטיפול",         count: activeLeads.length },
    { key: "אושר",   label: "אושר עקרונית",  count: approvedLeads.length },
  ];

  const filtered =
    statusTab === "חדשים"  ? newLeads :
    statusTab === "בטיפול" ? activeLeads :
    statusTab === "אושר"   ? approvedLeads :
    leads;

  return (
    <>
      <Head>
        <title>הלידים שלי | FINZO PRO</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main dir="rtl" className="min-h-screen bg-slate-50">
        <AdvisorHeader active="/advisor/my-leads" />

        <div className="max-w-[92rem] mx-auto px-4 lg:px-6 py-4 lg:py-5">

          {/* KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2.5">
                  <Skeleton variant="line" className="w-20" />
                  <Skeleton variant="line" className="w-10 h-8" />
                </div>
              ))
            ) : (
              <>
                <KpiTile label="סה״כ לידים" value={leads.length} />
                <KpiTile label="חמים" value={hot.length} delta={hot.length > 0 ? "ממתינים לטיפול" : undefined} deltaDir="up" />
                <KpiTile label="בינוניים" value={warm.length} />
                <KpiTile label="בלעדיים" value={excl.length} />
              </>
            )}
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            {statusTabs.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setStatusTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold whitespace-nowrap rounded-full transition-colors ${
                  statusTab === key
                    ? "bg-violet-700 text-white"
                    : "bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                {label}
                <span className={`tabular-nums text-xs px-1.5 py-0.5 rounded-full font-black ${
                  statusTab === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-bold flex items-center justify-between gap-3">
              <span>{error}</span>
              <button onClick={() => setError("")} className="text-red-400 hover:text-red-600 font-black text-lg leading-none">×</button>
            </div>
          )}

          {loading && (
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          )}

          {!loading && filtered.length === 0 && statusTab === "הכל" && (
            <EmptyState
              glyph="📋"
              title="עדיין לא רכשתם לידים"
              description="עברו לחנות הלידים כדי לגלוש בלידים הזמינים ולרכוש."
              action={
                <Link href="/advisor/leads" className="inline-block rounded-full bg-violet-700 text-white px-6 py-3 text-sm font-black hover:bg-violet-800 transition-colors">
                  לחנות הלידים ←
                </Link>
              }
            />
          )}
          {!loading && filtered.length === 0 && statusTab !== "הכל" && (
            <EmptyState
              glyph="🔍"
              title="אין לידים בקטגוריה זו"
              description="נסו לשנות את הסינון."
            />
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((lead) => (
              <MyLeadCard key={lead.id} lead={lead} onUpdate={update} />
            ))}
          </div>

        </div>
      </main>
    </>
  );
}
