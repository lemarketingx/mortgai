import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdvisorHeader from "../../components/AdvisorHeader";
import { formatILS } from "../../lib/format";
import {
  getPipelineStageLabel,
  isClosedPipelineStage,
  normalizePipelineStage,
} from "../../lib/pipeline";

// ─── Pipeline groups (8 conceptual mortgage stages) ───────────────────────────
// Each group aggregates multiple internal pipeline stages so the dashboard
// shows a readable mortgage process, not the full 19-stage internal list.
const PIPELINE_GROUPS = [
  {
    key: "new",
    label: "ליד חדש",
    stages: new Set(["new_lead", "contacted"]),
    color: "bg-violet-500",
    linkStage: "new_lead",
  },
  {
    key: "docs",
    label: "מסמכים",
    stages: new Set(["documents_requested", "waiting_documents", "documents_received"]),
    color: "bg-amber-500",
    linkStage: "waiting_documents",
  },
  {
    key: "eligibility",
    label: "בדיקת זכאות",
    stages: new Set(["eligibility_review"]),
    color: "bg-sky-500",
    linkStage: "eligibility_review",
  },
  {
    key: "appraisal",
    label: 'שמאות / עו"ד',
    stages: new Set(["appraisal_ordered", "appraisal_completed", "lawyer_review"]),
    color: "bg-cyan-500",
    linkStage: "appraisal_ordered",
  },
  {
    key: "bank",
    label: "הגשה לבנק",
    stages: new Set(["submitted_to_bank", "principle_approval", "bank_negotiation", "selected_track"]),
    color: "bg-blue-500",
    linkStage: "submitted_to_bank",
  },
  {
    key: "signing",
    label: "חתימות",
    stages: new Set(["signing_scheduled", "signed"]),
    color: "bg-emerald-500",
    linkStage: "signing_scheduled",
  },
  {
    key: "funds",
    label: "שחרור כספים",
    stages: new Set(["collateral_completion", "funds_released"]),
    color: "bg-green-500",
    linkStage: "collateral_completion",
  },
  {
    key: "done",
    label: "הושלם",
    stages: new Set(["closed_won"]),
    color: "bg-green-600",
    linkStage: "closed_won",
  },
];

// O(1) stage → group key lookup — built once at module level
const STAGE_TO_GROUP = new Map(
  PIPELINE_GROUPS.flatMap((g) => [...g.stages].map((s) => [s, g.key]))
);

// ─── Attention item tag styles ────────────────────────────────────────────────
const TAG_META = {
  danger:  { tag: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800",   dot: "bg-rose-500" },
  warning: { tag: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800", dot: "bg-amber-500" },
  docs:    { tag: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",  dot: "bg-amber-400" },
  stale:   { tag: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800",        dot: "bg-sky-400" },
  low:     { tag: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700", dot: "bg-slate-400" },
};

// ─── Utilities ────────────────────────────────────────────────────────────────
const DAY_MS = 864e5;

function getToday() { return new Date(new Date().toDateString()); }

function diffDays(d) {
  if (!d) return null;
  const t = new Date(new Date(d).toDateString());
  return Math.max(0, Math.floor((getToday().getTime() - t.getTime()) / DAY_MS));
}

function isOverdue(d) {
  return Boolean(d) && new Date(d) < getToday();
}

function isToday(d) {
  return Boolean(d) && new Date(d).toDateString() === new Date().toDateString();
}

function formatShort(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

function formatRelative(d) {
  if (!d) return "";
  const days = diffDays(d);
  if (days === 0) return "היום";
  if (days === 1) return "אתמול";
  if (days !== null && days < 7) return `לפני ${days} ימים`;
  return formatShort(d);
}

function getStage(l) { return normalizePipelineStage(l.pipelineStage || l.leadStatus); }
function isActive(l) { return !isClosedPipelineStage(l.pipelineStage || l.leadStatus); }

// ─── Derives a list of leads that need immediate attention ────────────────────
// All signals come from existing lead data fields — no invented data.
function buildAttentionItems(active) {
  const today = getToday(); // computed once for the whole loop
  const items = [];
  const seen = new Set();

  for (const lead of active) {
    if (seen.has(lead.id)) continue;
    const stage = getStage(lead);

    if ((lead.nextActionAt && isOverdue(lead.nextActionAt, today)) ||
        (lead.followUpDate  && isOverdue(lead.followUpDate,  today))) {
      items.push({ lead, priority: 10, reason: "פעולה באיחור", detail: formatShort(lead.nextActionAt || lead.followUpDate), tag: "danger" });
      seen.add(lead.id); continue;
    }

    const daysSinceContact = diffDays(lead.lastContactedAt || lead.createdAt, today);
    if (stage === "new_lead" && daysSinceContact !== null && daysSinceContact >= 2) {
      items.push({ lead, priority: 9, reason: "ליד חדש ללא קשר", detail: `${daysSinceContact} ימים`, tag: "warning" });
      seen.add(lead.id); continue;
    }

    const missingDocs = Number(lead.missingDocumentsCount || 0);
    if (missingDocs > 0 && ["documents_requested", "waiting_documents"].includes(stage)) {
      items.push({ lead, priority: 8, reason: "מסמכים חסרים", detail: `${missingDocs} חסרים`, tag: "docs" });
      seen.add(lead.id); continue;
    }

    const daysSinceActivity = diffDays(lead.lastActivityAt || lead.createdAt, today);
    if (daysSinceActivity !== null && daysSinceActivity >= 7 && stage !== "funds_released") {
      items.push({ lead, priority: 7, reason: "ללא פעילות", detail: `${daysSinceActivity} ימים`, tag: "stale" });
      seen.add(lead.id); continue;
    }

    const progress = Number(lead.overallProgressPercent || 0);
    if (progress < 20 && !["new_lead", "contacted"].includes(stage)) {
      items.push({ lead, priority: 6, reason: "התקדמות נמוכה", detail: `${progress}%`, tag: "low" });
      seen.add(lead.id);
    }
  }

  return items.sort((a, b) => b.priority - a.priority).slice(0, 8);
}

// Maps attention reason to the most relevant lead detail tab
function attentionHref(item) {
  const base = `/advisor/lead/${item.lead.id}`;
  if (item.tag === "docs") return `${base}?tab=docs`;
  if (item.tag === "danger" || item.tag === "warning") return `${base}?tab=activity`;
  if (item.reason === "מסמכים חסרים") return `${base}?tab=docs`;
  return base;
}

const STAGE_TASK_LABEL = {
  waiting_documents:   "בקשת מסמכים",
  documents_requested: "בקשת מסמכים",
  new_lead:            "חזרה ראשונה לליד",
};

// ─── Derives today's task list from existing lead data ────────────────────────
// Shows leads with scheduled actions today/overdue, and new uncontacted leads.
function buildTodayTasks(active) {
  const today = getToday();
  const tasks = [];
  const usedIds = new Set();

  for (const lead of active) {
    const hasTodayAction = isToday(lead.nextActionAt) || isToday(lead.followUpDate);
    const overdueAction  = (lead.nextActionAt && isOverdue(lead.nextActionAt, today)) ||
                           (lead.followUpDate  && isOverdue(lead.followUpDate,  today));

    if (hasTodayAction || overdueAction) {
      const stage = getStage(lead);
      const task = lead.nextAction || STAGE_TASK_LABEL[stage] || "מעקב";
      tasks.push({ lead, task, overdue: overdueAction && !hasTodayAction });
      usedIds.add(lead.id);
    }
  }

  // Supplement with new uncontacted leads when fewer than 3 explicit tasks
  if (tasks.length < 3) {
    active
      .filter((l) => {
        if (usedIds.has(l.id)) return false;
        const days = diffDays(l.lastContactedAt || l.createdAt, today);
        return getStage(l) === "new_lead" && days !== null && days >= 1;
      })
      .slice(0, 3 - tasks.length)
      .forEach((lead) => tasks.push({ lead, task: "חזרה ראשונה לליד", overdue: false }));
  }

  return tasks.slice(0, 8);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AttentionItem({ item }) {
  const meta = TAG_META[item.tag];
  const nextAction = item.lead.nextAction;
  return (
    <Link
      href={attentionHref(item)}
      className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-800 transition-colors rounded-xl border border-slate-100 dark:border-slate-700"
    >
      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${meta.dot}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">{item.lead.name || "—"}</p>
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 truncate">
          {nextAction ? nextAction : getPipelineStageLabel(getStage(item.lead))}
        </p>
      </div>
      <div className="shrink-0 text-left">
        <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${meta.tag}`}>
          {item.reason}
        </span>
        {item.detail && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 text-left">{item.detail}</p>
        )}
      </div>
    </Link>
  );
}

function TodayTaskItem({ item }) {
  return (
    <Link
      href={item.overdue ? `/advisor/lead/${item.lead.id}?tab=activity` : `/advisor/lead/${item.lead.id}`}
      className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors rounded-xl border ${
        item.overdue
          ? "border-rose-200 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-900/20"
          : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/60"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">{item.lead.name || "—"}</p>
        <p className="text-xs font-bold text-violet-600 dark:text-violet-400 truncate">{item.task}</p>
      </div>
      <div className="shrink-0 text-left flex flex-col items-end gap-0.5">
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full">
          {getPipelineStageLabel(getStage(item.lead))}
        </span>
        <span className={`text-[11px] font-bold ${item.overdue ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-500"}`}>
          {item.overdue ? "⚠ באיחור" : "פתח תיק →"}
        </span>
      </div>
    </Link>
  );
}

function PipelineGroupRow({ group, count, max }) {
  return (
    <Link
      href={`/advisor/my-leads?stage=${encodeURIComponent(group.linkStage)}`}
      className="flex items-center gap-3 group"
    >
      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-28 shrink-0 truncate text-right">{group.label}</span>
      <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${group.color} opacity-80 group-hover:opacity-100`}
          style={{ width: count > 0 ? `${Math.max(8, (count / max) * 100)}%` : "0%" }}
        />
      </div>
      <span className="text-xs font-black tabular-nums text-slate-700 dark:text-slate-300 w-5 text-left shrink-0">{count}</span>
    </Link>
  );
}

function SectionSkeleton({ rows = 3 }) {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

function EmptySection({ icon, title, sub }) {
  return (
    <div className="px-5 py-8 text-center">
      <p className="text-2xl mb-2">{icon}</p>
      <p className="text-sm font-black text-slate-700 dark:text-slate-300">{title}</p>
      {sub && <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function KpiCard({ label, value }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
      <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-black tabular-nums text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdvisorDashboard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [advisorName, setAdvisorName] = useState("");

  // Read display name from localStorage — safe, runs only after hydration
  useEffect(() => {
    try {
      const raw = localStorage.getItem("finzo_advisor_profile_v1");
      if (raw) {
        const p = JSON.parse(raw);
        if (p.name) setAdvisorName(p.name);
      }
    } catch {}
  }, []);

  // Fetch all advisor leads from /api/advisor/my-leads
  // This endpoint only returns leads that were purchased/assigned from FINZO.
  useEffect(() => {
    fetch("/api/advisor/my-leads")
      .then((r) => {
        if (r.status === 401) { window.location.href = "/advisor/login"; return null; }
        return r.ok ? r.json() : { leads: [] };
      })
      .then((j) => { if (j) { setLeads(j.leads || []); setLoading(false); } })
      .catch(() => setLoading(false));
  }, []);

  // ── Derived data — all useMemos, no calculations in render ──────────────────
  const active    = useMemo(() => leads.filter(isActive), [leads]);
  const newLeads  = useMemo(() => active.filter((l) => ["new_lead", "contacted"].includes(getStage(l))), [active]);
  const inProgress = useMemo(() => active.filter((l) => !["new_lead", "contacted"].includes(getStage(l))), [active]);
  const waitingDocs = useMemo(() =>
    active.filter((l) => ["documents_requested", "waiting_documents"].includes(getStage(l))),
  [active]);
  const completed = useMemo(() => leads.filter((l) => getStage(l) === "closed_won"), [leads]);

  const pipelineGroups = useMemo(() => {
    const counts = Object.fromEntries(PIPELINE_GROUPS.map((g) => [g.key, 0]));
    for (const l of leads) {
      const key = STAGE_TO_GROUP.get(getStage(l));
      if (key) counts[key]++;
    }
    return PIPELINE_GROUPS.map((g) => ({ ...g, count: counts[g.key] }));
  }, [leads]);

  const pipelineMax = useMemo(
    () => Math.max(...pipelineGroups.map((g) => g.count), 1),
    [pipelineGroups]
  );

  const attentionItems = useMemo(() => buildAttentionItems(active), [active]);
  const todayTasks     = useMemo(() => buildTodayTasks(active),     [active]);

  const recentUpdates  = useMemo(() =>
    [...leads]
      .filter((l) => l.lastActivityAt || l.stageUpdatedAt || l.lastContactedAt)
      .sort((a, b) => {
        const da = a.lastActivityAt || a.stageUpdatedAt || a.lastContactedAt || a.createdAt || "";
        const db = b.lastActivityAt || b.stageUpdatedAt || b.lastContactedAt || b.createdAt || "";
        return new Date(db) - new Date(da);
      })
      .slice(0, 6),
  [leads]);

  // ── New derived data for enhanced dashboard ─────────────────────────────────
  const closedLost = useMemo(() => leads.filter(l => getStage(l) === "closed_lost"), [leads]);
  const conversionRate = useMemo(() => {
    const total = completed.length + closedLost.length;
    return total > 0 ? Math.round((completed.length / total) * 100) : 0;
  }, [completed, closedLost]);
  const totalMortgageAmount = useMemo(() => leads.reduce((sum, l) => sum + (Number(l.mortgageAmount) || 0), 0), [leads]);
  const avgPropertyValue = useMemo(() => {
    const vals = leads.filter(l => l.propertyValue > 0).map(l => Number(l.propertyValue));
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }, [leads]);
  const avgEquity = useMemo(() => {
    const vals = leads.filter(l => l.equity > 0).map(l => Number(l.equity));
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }, [leads]);
  const topBank = useMemo(() => {
    const counts = {};
    for (const l of completed) { if (l.bankName) counts[l.bankName] = (counts[l.bankName] || 0) + 1; }
    const entries = Object.entries(counts);
    return entries.length > 0 ? entries.sort((a, b) => b[1] - a[1])[0][0] : "—";
  }, [completed]);
  const topSource = useMemo(() => {
    const counts = {};
    for (const l of leads) { const s = l.source || l.leadSource || "אחר"; counts[s] = (counts[s] || 0) + 1; }
    const entries = Object.entries(counts);
    return entries.length > 0 ? entries.sort((a, b) => b[1] - a[1])[0][0] : "—";
  }, [leads]);
  const noContactLeads = useMemo(() => active.filter(l => {
    const days = diffDays(l.lastContactedAt || l.createdAt);
    return days !== null && days >= 7;
  }), [active]);
  const urgentCases = useMemo(() => {
    return [...active].sort((a, b) => {
      const scoreA = (a.nextActionAt && isOverdue(a.nextActionAt) ? 100 : 0) + (Number(a.missingDocumentsCount) || 0) * 10 + (diffDays(a.lastContactedAt || a.createdAt) || 0);
      const scoreB = (b.nextActionAt && isOverdue(b.nextActionAt) ? 100 : 0) + (Number(b.missingDocumentsCount) || 0) * 10 + (diffDays(b.lastContactedAt || b.createdAt) || 0);
      return scoreB - scoreA;
    }).slice(0, 10);
  }, [active]);
  const monthlyLeadCounts = useMemo(() => {
    const months = {};
    for (const l of leads) {
      const d = new Date(l.createdAt || l.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = (months[key] || 0) + 1;
    }
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
  }, [leads]);

  // ── Empty state — advisor has no leads yet ───────────────────────────────────
  if (!loading && leads.length === 0) {
    return (
      <>
        <Head><title>לוח בקרה | FINZO PRO</title><meta name="robots" content="noindex,nofollow" /></Head>
        <main dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 md:pb-0">
          <AdvisorHeader active="/advisor" urgentItems={[]} />
          <div className="max-w-6xl mx-auto px-4 py-16 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-3xl">📋</div>
            <h2 className="text-xl font-black text-slate-950 dark:text-slate-50">עדיין אין לך לידים פעילים</h2>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
              כאן יוצגו הלידים שנרכשו מ-FINZO ושויכו אליך. עבור לשוק הלידים כדי לרכוש את הליד הראשון שלך.
            </p>
            <Link
              href="/advisor/leads"
              className="mt-2 inline-block rounded-2xl bg-violet-700 dark:bg-violet-600 text-white font-black py-3 px-8 text-sm hover:bg-violet-800 dark:hover:bg-violet-700 transition-colors"
            >
              עבור לשוק הלידים ←
            </Link>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500">
              לא ניתן ליצור לידים ידנית. כל הלידים מגיעים דרך FINZO.
            </p>
          </div>

          {/* Mobile bottom nav */}
          <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-3 flex gap-2">
            <Link href="/advisor"          className="flex-1 text-center text-xs font-black text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 rounded-xl py-2.5">ראשי</Link>
            <Link href="/advisor/my-leads" className="flex-1 text-center text-xs font-black text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl py-2.5">הלידים שלי</Link>
            <Link href="/advisor/leads"    className="flex-1 text-center text-xs font-black text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl py-2.5">שוק</Link>
          </div>
        </main>
      </>
    );
  }

  const monthlyMax = Math.max(...monthlyLeadCounts.map(([, c]) => c), 1);

  // ── Full dashboard ────────────────────────────────────────────────────────────
  return (
    <>
      <Head><title>לוח בקרה | FINZO PRO</title><meta name="robots" content="noindex,nofollow" /></Head>
      <main dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 md:pb-0">
        <AdvisorHeader active="/advisor" urgentItems={attentionItems} />

        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-5 space-y-5">

          {/* ── Welcome / context banner ──────────────────────────────────── */}
          <div className="flex items-start justify-between gap-3 rounded-2xl bg-gradient-to-l from-violet-50 dark:from-violet-950/40 to-white dark:to-slate-900 border border-violet-100 dark:border-violet-900/50 px-5 py-4">
            <div className="min-w-0">
              <h1 className="text-base font-black text-slate-950 dark:text-slate-50 mb-0.5">
                {advisorName ? `שלום, ${advisorName}` : "שלום, ברוך הבא למרכז העבודה"}
              </h1>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                {!loading && attentionItems.length > 0
                  ? <span className="text-rose-600 dark:text-rose-400">{attentionItems.length} לידים דורשים טיפול — בדקו את רשימת הדחוף למטה.</span>
                  : "כל התיקים תקינים. עברו לשוק הלידים לרכוש לידים חדשים."}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/advisor/leads"
                className="text-xs font-bold text-violet-700 dark:text-violet-400 hover:text-violet-900 dark:hover:text-violet-300 px-3 py-1.5 bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800 rounded-lg transition-colors hidden sm:block">
                שוק לידים →
              </Link>
              <Link href="/advisor/settings"
                className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors hidden sm:block">
                ⚙
              </Link>
            </div>
          </div>

          {/* ── KPI Cards — 2 rows of 4 ──────────────────────────────────── */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 animate-pulse">
                  <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-8 w-10 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard label="לידים פעילים" value={active.length} />
              <KpiCard label="לידים חדשים" value={newLeads.length} />
              <KpiCard label="בטיפול" value={inProgress.length} />
              <KpiCard label="הושלמו" value={completed.length} />
              <KpiCard label="אחוז המרה" value={`${conversionRate}%`} />
              <KpiCard label='סה"כ משכנתאות' value={formatILS(totalMortgageAmount)} />
              <KpiCard label="ממוצע שווי נכס" value={formatILS(avgPropertyValue)} />
              <KpiCard label="ממוצע הון עצמי" value={formatILS(avgEquity)} />
            </div>
          )}

          {/* ── Main 2-column grid ────────────────────────────────────────── */}
          <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">

            {/* ─ Left column (main) ─────────────────────────────────────── */}
            <div className="space-y-4">

              {/* מהלך הטיפול — Pipeline */}
              <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                <div className="mb-4">
                  <h2 className="text-sm font-black text-slate-950 dark:text-slate-50">מהלך הטיפול — Pipeline</h2>
                  <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                    לחץ על שלב כדי לסנן את הרשימה
                  </p>
                </div>
                {loading
                  ? (
                      <div className="space-y-2.5">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                        ))}
                      </div>
                    )
                  : (
                      <div className="space-y-2.5">
                        {pipelineGroups.map((g) => (
                          <PipelineGroupRow key={g.key} group={g} count={g.count} max={pipelineMax} />
                        ))}
                      </div>
                    )
                }
              </section>

              {/* לידים לפי חודש — Monthly bar chart */}
              {!loading && monthlyLeadCounts.length > 0 && (
                <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                  <div className="mb-4">
                    <h2 className="text-sm font-black text-slate-950 dark:text-slate-50">לידים לפי חודש</h2>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                      6 חודשים אחרונים
                    </p>
                  </div>
                  <div className="space-y-2">
                    {monthlyLeadCounts.map(([month, count]) => (
                      <div key={month} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-16 shrink-0 text-right tabular-nums">{month}</span>
                        <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-violet-500 dark:bg-violet-600 transition-all duration-500"
                            style={{ width: `${Math.max(6, (count / monthlyMax) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-black tabular-nums text-slate-700 dark:text-slate-300 w-5 text-left shrink-0">{count}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 10 התיקים הדחופים ביותר */}
              {!loading && urgentCases.length > 0 && (
                <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-sm font-black text-slate-950 dark:text-slate-50">10 התיקים הדחופים ביותר</h2>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                      מדורגים לפי דחיפות: איחור, מסמכים חסרים, זמן ללא קשר
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                          <th className="text-right text-[11px] font-bold text-slate-400 dark:text-slate-500 px-4 py-2.5">שם</th>
                          <th className="text-right text-[11px] font-bold text-slate-400 dark:text-slate-500 px-4 py-2.5">שלב</th>
                          <th className="text-right text-[11px] font-bold text-slate-400 dark:text-slate-500 px-4 py-2.5">ימים ללא קשר</th>
                          <th className="text-right text-[11px] font-bold text-slate-400 dark:text-slate-500 px-4 py-2.5">מסמכים חסרים</th>
                          <th className="text-right text-[11px] font-bold text-slate-400 dark:text-slate-500 px-4 py-2.5">פעולה הבאה</th>
                        </tr>
                      </thead>
                      <tbody>
                        {urgentCases.map((lead) => {
                          const daysSince = diffDays(lead.lastContactedAt || lead.createdAt);
                          const missingDocs = Number(lead.missingDocumentsCount) || 0;
                          const overdue = lead.nextActionAt && isOverdue(lead.nextActionAt);
                          return (
                            <tr key={lead.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="px-4 py-2.5">
                                <Link href={`/advisor/lead/${lead.id}`} className="font-black text-slate-900 dark:text-slate-100 hover:text-violet-700 dark:hover:text-violet-400 transition-colors">
                                  {lead.name || "—"}
                                </Link>
                              </td>
                              <td className="px-4 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                                {getPipelineStageLabel(getStage(lead))}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`text-xs font-black tabular-nums ${daysSince !== null && daysSince >= 7 ? "text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-400"}`}>
                                  {daysSince !== null ? daysSince : "—"}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`text-xs font-black tabular-nums ${missingDocs > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400 dark:text-slate-500"}`}>
                                  {missingDocs}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                {overdue ? (
                                  <span className="text-[11px] font-black text-rose-600 dark:text-rose-400">באיחור</span>
                                ) : lead.nextAction ? (
                                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[120px] inline-block">{lead.nextAction}</span>
                                ) : (
                                  <span className="text-[11px] text-slate-300 dark:text-slate-600">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>

            {/* ─ Right column (sidebar) ─────────────────────────────────── */}
            <div className="space-y-4">

              {/* דורש טיפול */}
              <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black text-slate-950 dark:text-slate-50">
                      דורש טיפול
                      {!loading && attentionItems.length > 0 && (
                        <span className="mr-2 text-[11px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 rounded-full px-2 py-0.5 align-middle">{attentionItems.length}</span>
                      )}
                    </h2>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                      לידים עם פעולות באיחור, מסמכים חסרים או ללא מעקב
                    </p>
                  </div>
                  <Link href="/advisor/my-leads" className="text-xs font-black text-violet-600 dark:text-violet-400 hover:underline shrink-0">
                    כל הלידים →
                  </Link>
                </div>
                {loading
                  ? <SectionSkeleton rows={3} />
                  : attentionItems.length > 0
                    ? (
                        <div className="p-3 space-y-2">
                          {attentionItems.map((item) => (
                            <AttentionItem key={item.lead.id} item={item} />
                          ))}
                        </div>
                      )
                    : (
                        <EmptySection
                          icon="✅"
                          title="כל התיקים תקינים"
                          sub="לא נמצאו פעולות באיחור או מסמכים חסרים"
                        />
                      )
                }
              </section>

              {/* המשימות שלי להיום */}
              <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black text-slate-950 dark:text-slate-50">המשימות שלי להיום</h2>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                      פעולות מוגדרות להיום ולידים חדשים הממתינים לקשר ראשון
                    </p>
                  </div>
                  {!loading && (
                    <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5 tabular-nums shrink-0">
                      {todayTasks.length}
                    </span>
                  )}
                </div>
                {loading
                  ? <SectionSkeleton rows={3} />
                  : todayTasks.length > 0
                    ? (
                        <div className="p-3 space-y-2">
                          {todayTasks.map((task) => (
                            <TodayTaskItem key={task.lead.id} item={task} />
                          ))}
                        </div>
                      )
                    : (
                        <EmptySection
                          icon="🗓"
                          title="אין משימות מוגדרות להיום"
                          sub={<>פתחו תיק ליד והגדירו <strong>פעולה הבאה</strong> עם תאריך מעקב</>}
                        />
                      )
                }
              </section>

              {/* סטטוס מהיר */}
              {!loading && (
                <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                  <h2 className="text-sm font-black text-slate-950 dark:text-slate-50 mb-3">סטטוס מהיר</h2>
                  <div className="space-y-3">
                    {[
                      { label: "בנק מוביל", value: topBank },
                      { label: "מקור מוביל", value: topSource },
                      { label: "ללא קשר 7+ ימים", value: noContactLeads.length },
                      { label: "ממתין מסמכים", value: waitingDocs.length },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</span>
                        <span className="text-sm font-black text-slate-900 dark:text-slate-100 tabular-nums">{value}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* פעולות מהירות */}
              <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                <h2 className="text-sm font-black text-slate-950 dark:text-slate-50 mb-3">פעולות מהירות</h2>
                <div className="space-y-2">
                  <Link href="/advisor/leads"
                    className="flex items-center gap-3 rounded-xl bg-violet-700 dark:bg-violet-600 text-white px-4 py-3 text-sm font-black hover:bg-violet-800 dark:hover:bg-violet-700 transition-colors">
                    <span className="shrink-0">🏪</span>
                    <span>שוק הלידים של FINZO</span>
                  </Link>
                  <Link href="/advisor/my-leads"
                    className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-4 py-3 text-sm font-black hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <span className="shrink-0">📋</span>
                    <span>כל הלידים שלי</span>
                  </Link>
                  <Link href="/"
                    className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-4 py-3 text-sm font-black hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <span className="shrink-0">🧮</span>
                    <span>מחשבון זכאות</span>
                  </Link>
                  <Link href="/refinance-check"
                    className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-4 py-3 text-sm font-black hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <span className="shrink-0">🔄</span>
                    <span>מחשבון מחזור</span>
                  </Link>
                </div>
                <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 mt-3 text-center">
                  * לא ניתן ליצור לידים ידנית — כל הלידים מגיעים דרך FINZO
                </p>
              </section>

            </div>
          </div>
        </div>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-3 flex gap-2">
          <Link href="/advisor"          className="flex-1 text-center text-xs font-black text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 rounded-xl py-2.5">ראשי</Link>
          <Link href="/advisor/my-leads" className="flex-1 text-center text-xs font-black text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl py-2.5">הלידים שלי</Link>
          <Link href="/advisor/leads"    className="flex-1 text-center text-xs font-black text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl py-2.5">שוק</Link>
        </div>
      </main>
    </>
  );
}
