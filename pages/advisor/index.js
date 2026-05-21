import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdvisorHeader from "../../components/AdvisorHeader";
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

// ─── Attention item tag styles ────────────────────────────────────────────────
const TAG_CLS = {
  danger:  "bg-rose-100 text-rose-700 border-rose-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  docs:    "bg-amber-50 text-amber-600 border-amber-100",
  stale:   "bg-sky-50 text-sky-700 border-sky-200",
  low:     "bg-slate-100 text-slate-600 border-slate-200",
};
const DOT_CLS = {
  danger:  "bg-rose-500",
  warning: "bg-amber-500",
  docs:    "bg-amber-400",
  stale:   "bg-sky-400",
  low:     "bg-slate-400",
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
  const items = [];
  const seen = new Set();

  active.forEach((lead) => {
    if (seen.has(lead.id)) return;
    const stage = getStage(lead);
    const overdueNextAction = lead.nextActionAt && isOverdue(lead.nextActionAt);
    const overdueFollowUp   = lead.followUpDate  && isOverdue(lead.followUpDate);

    if (overdueNextAction || overdueFollowUp) {
      const due = lead.nextActionAt || lead.followUpDate;
      items.push({ lead, priority: 10, reason: "פעולה באיחור", detail: formatShort(due), tag: "danger" });
      seen.add(lead.id); return;
    }

    const daysSinceContact = diffDays(lead.lastContactedAt || lead.createdAt);
    if (stage === "new_lead" && daysSinceContact !== null && daysSinceContact >= 2) {
      items.push({ lead, priority: 9, reason: "ליד חדש ללא קשר", detail: `${daysSinceContact} ימים`, tag: "warning" });
      seen.add(lead.id); return;
    }

    const missingDocs = Number(lead.missingDocumentsCount || 0);
    if (missingDocs > 0 && ["documents_requested", "waiting_documents"].includes(stage)) {
      items.push({ lead, priority: 8, reason: "מסמכים חסרים", detail: `${missingDocs} חסרים`, tag: "docs" });
      seen.add(lead.id); return;
    }

    const daysSinceActivity = diffDays(lead.lastActivityAt || lead.createdAt);
    if (daysSinceActivity !== null && daysSinceActivity >= 7 && !["funds_released"].includes(stage)) {
      items.push({ lead, priority: 7, reason: "ללא פעילות", detail: `${daysSinceActivity} ימים`, tag: "stale" });
      seen.add(lead.id); return;
    }

    const progress = Number(lead.overallProgressPercent || 0);
    if (progress < 20 && !["new_lead", "contacted"].includes(stage)) {
      items.push({ lead, priority: 6, reason: "התקדמות נמוכה", detail: `${progress}%`, tag: "low" });
      seen.add(lead.id);
    }
  });

  return items.sort((a, b) => b.priority - a.priority).slice(0, 8);
}

// ─── Derives today's task list from existing lead data ────────────────────────
// Shows leads with scheduled actions today/overdue, and new uncontacted leads.
function buildTodayTasks(active) {
  const tasks = [];
  const usedIds = new Set();

  active.forEach((lead) => {
    const hasTodayAction = isToday(lead.nextActionAt) || isToday(lead.followUpDate);
    const overdueAction  = (lead.nextActionAt && isOverdue(lead.nextActionAt)) ||
                           (lead.followUpDate  && isOverdue(lead.followUpDate));

    if (hasTodayAction || overdueAction) {
      const stage = getStage(lead);
      const taskLabel = lead.nextAction
        ? lead.nextAction
        : stage === "waiting_documents" || stage === "documents_requested"
          ? "בקשת מסמכים"
          : stage === "new_lead" ? "חזרה ראשונה לליד"
          : "מעקב";
      tasks.push({ lead, task: taskLabel, overdue: overdueAction && !hasTodayAction });
      usedIds.add(lead.id);
    }
  });

  // Supplement with new uncontacted leads when fewer than 3 explicit tasks
  if (tasks.length < 3) {
    active
      .filter((l) => {
        if (usedIds.has(l.id)) return false;
        const s = getStage(l);
        const days = diffDays(l.lastContactedAt || l.createdAt);
        return s === "new_lead" && days !== null && days >= 1;
      })
      .slice(0, 3 - tasks.length)
      .forEach((lead) => tasks.push({ lead, task: "חזרה ראשונה לליד", overdue: false }));
  }

  return tasks.slice(0, 8);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AttentionItem({ item }) {
  return (
    <Link
      href={`/advisor/lead/${item.lead.id}`}
      className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50/80 transition-colors rounded-xl border border-slate-100"
    >
      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${DOT_CLS[item.tag]}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-slate-900 truncate">{item.lead.name || "—"}</p>
        <p className="text-xs font-bold text-slate-400 truncate">{getPipelineStageLabel(getStage(item.lead))}</p>
      </div>
      <div className="shrink-0 text-left">
        <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${TAG_CLS[item.tag]}`}>
          {item.reason}
        </span>
        {item.detail && (
          <p className="text-[11px] text-slate-400 mt-0.5 text-left">{item.detail}</p>
        )}
      </div>
    </Link>
  );
}

function TodayTaskItem({ item }) {
  return (
    <Link
      href={`/advisor/lead/${item.lead.id}`}
      className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors rounded-xl border ${
        item.overdue ? "border-rose-200 bg-rose-50/30" : "border-slate-100 bg-white"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-slate-900 truncate">{item.lead.name || "—"}</p>
        <p className="text-xs font-bold text-violet-600 truncate">{item.task}</p>
      </div>
      <div className="shrink-0 text-left flex flex-col items-end gap-0.5">
        <span className="text-[11px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
          {getPipelineStageLabel(getStage(item.lead))}
        </span>
        <span className={`text-[11px] font-bold ${item.overdue ? "text-rose-600" : "text-slate-400"}`}>
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
      <span className="text-xs font-bold text-slate-500 w-28 shrink-0 truncate text-right">{group.label}</span>
      <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${group.color} opacity-80 group-hover:opacity-100`}
          style={{ width: count > 0 ? `${Math.max(8, (count / max) * 100)}%` : "0%" }}
        />
      </div>
      <span className="text-xs font-black tabular-nums text-slate-700 w-5 text-left shrink-0">{count}</span>
    </Link>
  );
}

function RecentUpdateRow({ lead }) {
  const date = lead.lastActivityAt || lead.stageUpdatedAt || lead.lastContactedAt || lead.createdAt;
  return (
    <Link
      href={`/advisor/lead/${lead.id}`}
      className="flex items-center gap-3 py-2.5 px-2 hover:bg-slate-50 transition-colors rounded-lg"
    >
      <span className="h-2 w-2 rounded-full shrink-0 bg-violet-400" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-slate-800 truncate">{lead.name || "—"}</p>
        <p className="text-xs font-bold text-slate-400 truncate">{getPipelineStageLabel(getStage(lead))}</p>
      </div>
      <span className="text-[11px] font-bold text-slate-400 shrink-0">{formatRelative(date)}</span>
    </Link>
  );
}

function SectionSkeleton({ rows = 3 }) {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

function EmptySection({ icon, title, sub }) {
  return (
    <div className="px-5 py-8 text-center">
      <p className="text-2xl mb-2">{icon}</p>
      <p className="text-sm font-black text-slate-700">{title}</p>
      {sub && <p className="text-xs font-bold text-slate-400 mt-1">{sub}</p>}
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
    const counts = {};
    PIPELINE_GROUPS.forEach((g) => { counts[g.key] = 0; });
    leads.forEach((l) => {
      const s = getStage(l);
      const g = PIPELINE_GROUPS.find((pg) => pg.stages.has(s));
      if (g) counts[g.key]++;
    });
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

  // ── Empty state — advisor has no leads yet ───────────────────────────────────
  if (!loading && leads.length === 0) {
    return (
      <>
        <Head><title>לוח בקרה | FINZO PRO</title><meta name="robots" content="noindex,nofollow" /></Head>
        <main dir="rtl" className="min-h-screen bg-slate-50 pb-24 md:pb-0">
          <AdvisorHeader active="/advisor" />
          <div className="max-w-6xl mx-auto px-4 py-16 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center text-3xl">📋</div>
            <h2 className="text-xl font-black text-slate-950">עדיין אין לך לידים פעילים</h2>
            <p className="text-sm font-bold text-slate-500 max-w-sm leading-relaxed">
              כאן יוצגו הלידים שנרכשו מ-FINZO ושויכו אליך. עבור לשוק הלידים כדי לרכוש את הליד הראשון שלך.
            </p>
            <Link
              href="/advisor/leads"
              className="mt-2 inline-block rounded-2xl bg-violet-700 text-white font-black py-3 px-8 text-sm hover:bg-violet-800 transition-colors"
            >
              עבור לשוק הלידים ←
            </Link>
            <p className="text-xs font-bold text-slate-400">
              לא ניתן ליצור לידים ידנית. כל הלידים מגיעים דרך FINZO.
            </p>
          </div>

          {/* Mobile bottom nav */}
          <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 px-4 py-3 flex gap-2">
            <Link href="/advisor"          className="flex-1 text-center text-xs font-black text-violet-700 bg-violet-50 rounded-xl py-2.5">ראשי</Link>
            <Link href="/advisor/my-leads" className="flex-1 text-center text-xs font-black text-slate-600 bg-slate-100 rounded-xl py-2.5">הלידים שלי</Link>
            <Link href="/advisor/leads"    className="flex-1 text-center text-xs font-black text-slate-600 bg-slate-100 rounded-xl py-2.5">שוק</Link>
          </div>
        </main>
      </>
    );
  }

  // ── Full dashboard ────────────────────────────────────────────────────────────
  return (
    <>
      <Head><title>לוח בקרה | FINZO PRO</title><meta name="robots" content="noindex,nofollow" /></Head>
      <main dir="rtl" className="min-h-screen bg-slate-50 pb-24 md:pb-0">
        <AdvisorHeader active="/advisor" />

        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-5 space-y-5">

          {/* ── Welcome / context banner ──────────────────────────────────── */}
          <div className="flex items-start justify-between gap-3 rounded-2xl bg-gradient-to-l from-violet-50 to-white border border-violet-100 px-5 py-4">
            <div className="min-w-0">
              <h1 className="text-base font-black text-slate-950 mb-0.5">
                {advisorName ? `שלום, ${advisorName} 👋` : "ברוך הבא למרכז העבודה"}
              </h1>
              <p className="text-xs font-bold text-slate-500 leading-relaxed">
                ברוך הבא למרכז העבודה של FINZO. כאן מוצגים רק לידים שנכנסו דרך FINZO ושויכו אליך לאחר רכישה/הקצאה.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/advisor/settings"
                className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 bg-white border border-slate-200 rounded-lg transition-colors hidden sm:block">
                ⚙ הגדרות
              </Link>
              <Link href="/advisor/profile"
                className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 bg-white border border-slate-200 rounded-lg transition-colors hidden sm:block">
                פרופיל
              </Link>
            </div>
          </div>

          {/* ── Summary KPIs — only real counts from lead data ────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2 animate-pulse">
                    <div className="h-3 w-20 bg-slate-200 rounded" />
                    <div className="h-8 w-10 bg-slate-200 rounded" />
                  </div>
                ))
              : [
                  { label: "לידים חדשים",     value: newLeads.length,   color: "text-violet-700" },
                  { label: "לידים בטיפול",     value: inProgress.length, color: "text-sky-700" },
                  { label: "ממתינים למסמכים", value: waitingDocs.length, color: "text-amber-700" },
                  { label: "תיקים שהושלמו",   value: completed.length,  color: "text-emerald-700" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white border border-slate-100 rounded-2xl p-4">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-wide mb-1">{label}</p>
                    <p className={`text-3xl font-black tabular-nums leading-none ${color}`}>{value}</p>
                  </div>
                ))
            }
          </div>

          {/* ── Main 2-column grid ────────────────────────────────────────── */}
          <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">

            {/* ─ Left column ─────────────────────────────────────────────── */}
            <div className="space-y-4">

              {/* דורש טיפול */}
              <section className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black text-slate-950">דורש טיפול</h2>
                    <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                      לידים עם פעולות באיחור, מסמכים חסרים או ללא מעקב
                    </p>
                  </div>
                  <Link href="/advisor/my-leads" className="text-xs font-black text-violet-600 hover:underline shrink-0">
                    כל הלידים →
                  </Link>
                </div>
                {loading
                  ? <SectionSkeleton rows={3} />
                  : attentionItems.length > 0
                    ? (
                        <div className="p-3 space-y-2">
                          {attentionItems.map((item, i) => (
                            <AttentionItem key={`${item.lead.id}-${i}`} item={item} />
                          ))}
                        </div>
                      )
                    : (
                        <EmptySection
                          icon="✅"
                          title="אין כרגע תיקים שדורשים טיפול מיוחד"
                          sub="כל התיקים תקינים ומעודכנים — כל הכבוד!"
                        />
                      )
                }
              </section>

              {/* המשימות שלי להיום */}
              <section className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black text-slate-950">המשימות שלי להיום</h2>
                    <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                      פעולות מוגדרות להיום ולידים חדשים הממתינים לקשר ראשון
                    </p>
                  </div>
                  {!loading && (
                    <span className="text-[11px] font-black text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 tabular-nums shrink-0">
                      {todayTasks.length}
                    </span>
                  )}
                </div>
                {loading
                  ? <SectionSkeleton rows={3} />
                  : todayTasks.length > 0
                    ? (
                        <div className="p-3 space-y-2">
                          {todayTasks.map((task, i) => (
                            <TodayTaskItem key={`${task.lead.id}-${i}`} item={task} />
                          ))}
                        </div>
                      )
                    : (
                        <EmptySection
                          icon="🗓"
                          title="אין משימות מוגדרות להיום"
                          sub='הגדר "פעולה הבאה" בכל תיק כדי לראות כאן'
                        />
                      )
                }
              </section>

              {/* עדכוני תיקים אחרונים */}
              <section className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50">
                  <h2 className="text-sm font-black text-slate-950">עדכוני תיקים אחרונים</h2>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                    לידים שעודכנו לאחרונה — לפי תאריך פעילות
                  </p>
                </div>
                {loading
                  ? (
                      <div className="p-4 space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                        ))}
                      </div>
                    )
                  : recentUpdates.length > 0
                    ? (
                        <div className="px-3 py-2 divide-y divide-slate-50">
                          {recentUpdates.map((l) => (
                            <RecentUpdateRow key={l.id} lead={l} />
                          ))}
                        </div>
                      )
                    : (
                        <EmptySection
                          icon="📅"
                          title="פעילות אחרונה תופיע כאן לאחר עדכונים בתיקים"
                        />
                      )
                }
              </section>
            </div>

            {/* ─ Right column ────────────────────────────────────────────── */}
            <div className="space-y-4">

              {/* מהלך הטיפול — Pipeline grouped overview */}
              <section className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="mb-4">
                  <h2 className="text-sm font-black text-slate-950">מהלך הטיפול — Pipeline</h2>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                    לחץ על שלב כדי לסנן את הרשימה
                  </p>
                </div>
                {loading
                  ? (
                      <div className="space-y-2.5">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" />
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

              {/* סטטוס מהיר */}
              {!loading && (
                <section className="bg-white rounded-2xl border border-slate-100 p-5">
                  <h2 className="text-sm font-black text-slate-950 mb-3">סטטוס מהיר</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["סה״כ לידים",  leads.length],
                      ["פעיל",         active.length],
                      ["הושלמו",       completed.length],
                      ["ממתין מסמכים", waitingDocs.length],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-slate-50 rounded-xl px-3 py-3">
                        <p className="text-[11px] font-black text-slate-400 mb-0.5">{label}</p>
                        <p className="text-2xl font-black text-slate-900 tabular-nums">{value}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* פעולות מהירות */}
              <section className="bg-white rounded-2xl border border-slate-100 p-5">
                <h2 className="text-sm font-black text-slate-950 mb-3">פעולות מהירות</h2>
                <div className="space-y-2">
                  <Link href="/advisor/leads"
                    className="flex items-center gap-3 rounded-xl bg-violet-700 text-white px-4 py-3 text-sm font-black hover:bg-violet-800 transition-colors">
                    <span className="shrink-0">🏪</span>
                    <span>שוק הלידים של FINZO</span>
                  </Link>
                  <Link href="/advisor/my-leads"
                    className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 px-4 py-3 text-sm font-black hover:bg-slate-100 transition-colors">
                    <span className="shrink-0">📋</span>
                    <span>כל הלידים שלי</span>
                  </Link>
                  <Link href="/"
                    className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 px-4 py-3 text-sm font-black hover:bg-slate-100 transition-colors">
                    <span className="shrink-0">🧮</span>
                    <span>מחשבון זכאות</span>
                  </Link>
                  <Link href="/refinance-check"
                    className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 px-4 py-3 text-sm font-black hover:bg-slate-100 transition-colors">
                    <span className="shrink-0">🔄</span>
                    <span>מחשבון מחזור</span>
                  </Link>
                </div>
                <p className="text-[10px] font-bold text-slate-300 mt-3 text-center">
                  * לא ניתן ליצור לידים ידנית — כל הלידים מגיעים דרך FINZO
                </p>
              </section>

            </div>
          </div>
        </div>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 px-4 py-3 flex gap-2">
          <Link href="/advisor"          className="flex-1 text-center text-xs font-black text-violet-700 bg-violet-50 rounded-xl py-2.5">ראשי</Link>
          <Link href="/advisor/my-leads" className="flex-1 text-center text-xs font-black text-slate-600 bg-slate-100 rounded-xl py-2.5">הלידים שלי</Link>
          <Link href="/advisor/leads"    className="flex-1 text-center text-xs font-black text-slate-600 bg-slate-100 rounded-xl py-2.5">שוק</Link>
        </div>
      </main>
    </>
  );
}
