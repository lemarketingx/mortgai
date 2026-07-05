import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdvisorHeader from "../../components/AdvisorHeader";
import { formatILS } from "../../lib/format";
import {
  ClipboardIcon,
  StoreIcon,
  CalendarIcon,
  CalculatorIcon,
  RefreshIcon,
  SettingsIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
} from "../../components/icons";
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
    color: "bg-brand-400",
    linkStage: "new_lead",
  },
  {
    key: "docs",
    label: "מסמכים",
    stages: new Set(["documents_requested", "waiting_documents", "documents_received"]),
    color: "bg-brand-600",
    linkStage: "waiting_documents",
  },
  {
    key: "eligibility",
    label: "בדיקת זכאות",
    stages: new Set(["eligibility_review"]),
    color: "bg-warning-400",
    linkStage: "eligibility_review",
  },
  {
    key: "appraisal",
    label: 'שמאות / עו"ד',
    stages: new Set(["appraisal_ordered", "appraisal_completed", "lawyer_review"]),
    color: "bg-warning-600",
    linkStage: "appraisal_ordered",
  },
  {
    key: "bank",
    label: "הגשה לבנק",
    stages: new Set(["submitted_to_bank", "principle_approval", "bank_negotiation", "selected_track"]),
    color: "bg-accent-500",
    linkStage: "submitted_to_bank",
  },
  {
    key: "signing",
    label: "חתימות",
    stages: new Set(["signing_scheduled", "signed"]),
    color: "bg-success-400",
    linkStage: "signing_scheduled",
  },
  {
    key: "funds",
    label: "שחרור כספים",
    stages: new Set(["collateral_completion", "funds_released"]),
    color: "bg-success-500",
    linkStage: "collateral_completion",
  },
  {
    key: "done",
    label: "הושלם",
    stages: new Set(["closed_won"]),
    color: "bg-success-700",
    linkStage: "closed_won",
  },
];

// O(1) stage → group key lookup — built once at module level
const STAGE_TO_GROUP = new Map(
  PIPELINE_GROUPS.flatMap((g) => [...g.stages].map((s) => [s, g.key]))
);

// ─── Attention item tag styles ────────────────────────────────────────────────
const TAG_META = {
  danger:  { tag: "bg-danger-100 text-danger-700 border-danger-200 dark:bg-danger-900/40 dark:text-danger-300 dark:border-danger-800",   dot: "bg-danger-500" },
  warning: { tag: "bg-warning-100 text-warning-800 border-warning-200 dark:bg-warning-900/40 dark:text-warning-300 dark:border-warning-800", dot: "bg-warning-500" },
  docs:    { tag: "bg-warning-50 text-warning-600 border-warning-100 dark:bg-warning-900/30 dark:text-warning-400 dark:border-warning-800",  dot: "bg-warning-400" },
  stale:   { tag: "bg-accent-50 text-accent-700 border-accent-200 dark:bg-accent-900/30 dark:text-accent-400 dark:border-accent-800",        dot: "bg-accent-400" },
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
function resolveBank(l) { return l.selectedBank || l.assignedBank || l.bankName || (l.banker && l.banker.bank) || "לא הוגדר"; }

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
          ? "border-danger-200 dark:border-danger-800 bg-danger-50/30 dark:bg-danger-900/20"
          : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/60"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">{item.lead.name || "—"}</p>
        <p className="text-xs font-bold text-brand-600 dark:text-brand-400 truncate">{item.task}</p>
      </div>
      <div className="shrink-0 text-left flex flex-col items-end gap-0.5">
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full">
          {getPipelineStageLabel(getStage(item.lead))}
        </span>
        <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${item.overdue ? "text-danger-600 dark:text-danger-400" : "text-slate-400 dark:text-slate-500"}`}>
          {item.overdue ? <><AlertTriangleIcon size={11} /> באיחור</> : "פתח תיק →"}
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

function EmptySection({ icon: Icon, title, sub }) {
  return (
    <div className="px-5 py-8 text-center">
      {Icon && (
        <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
          <Icon size={18} strokeWidth={1.8} />
        </div>
      )}
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

// ─── Date range presets ──────────────────────────────────────────────────────
const DATE_PRESETS = [
  { key: "all", label: "הכל" },
  { key: "7d", label: "7 ימים", days: 7 },
  { key: "30d", label: "חודש", days: 30 },
  { key: "90d", label: "רבעון", days: 90 },
  { key: "ytd", label: "מתחילת השנה" },
];

function filterByDateRange(items, key, dateField = "createdAt") {
  if (key === "all") return items;
  const now = Date.now();
  if (key === "ytd") {
    const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
    return items.filter(l => new Date(l[dateField] || l.created_at || 0).getTime() >= yearStart);
  }
  const preset = DATE_PRESETS.find(p => p.key === key);
  if (!preset?.days) return items;
  const cutoff = now - preset.days * DAY_MS;
  return items.filter(l => new Date(l[dateField] || l.created_at || 0).getTime() >= cutoff);
}

// ─── Commission calculation (mirrors server-side logic) ──────────────────────
function calcCommission(profile, lead) {
  if (!profile || !profile.pricingModel) return null;
  const loanAmount = Number(lead.mortgageAmount || 0);
  const leadType = lead.mortgageType || lead.purchaseStatus || "default";
  switch (profile.pricingModel) {
    case "fixed":   return profile.fixedFee || 0;
    case "percent": return loanAmount * ((profile.percentFee || 0) / 100);
    case "hybrid":  return (profile.hybridBaseFee || 0) + loanAmount * ((profile.hybridPercentFee || 0) / 100);
    case "by_lead_type": {
      const rules = profile.leadTypeRules || {};
      const rule = rules[leadType] || rules["default"];
      return rule !== undefined && rule !== null ? Number(rule) || 0 : null;
    }
    default: return null;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdvisorDashboard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [advisorName, setAdvisorName] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [bankFilter, setBankFilter] = useState("all");
  const [commissionStats, setCommissionStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pricingProfile, setPricingProfile] = useState(null);
  const [pricingLoaded, setPricingLoaded] = useState(false);

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
    fetch("/api/advisor/commissions?stats=true").then(r => r.ok ? r.json() : null).then(d => { if (d?.stats) setCommissionStats(d.stats); }).catch(() => {});
    fetch("/api/advisor/notifications?limit=5").then(r => r.ok ? r.json() : null).then(d => { if (d) { setNotifications(d.notifications || []); setUnreadCount(d.unreadCount || 0); } }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/advisor/pricing")
      .then((r) => {
        if (!r.ok) {
          if (isDebugEnabled) console.log("[dashboard] pricing fetch failed:", r.status);
          return { profile: null };
        }
        return r.json();
      })
      .then((j) => {
        if (isDebugEnabled) console.log("[dashboard] pricingProfile:", j.profile ? j.profile.pricingModel : "null");
        setPricingProfile(j.profile);
        setPricingLoaded(true);
      })
      .catch((err) => {
        if (isDebugEnabled) console.log("[dashboard] pricing fetch error:", err);
        setPricingLoaded(true);
      });
  }, []);

  // ── Derived data — all useMemos, no calculations in render ──────────────────
  const allBanks = useMemo(() => {
    const set = new Set(leads.map(resolveBank).filter(b => b !== "לא הוגדר"));
    return ["all", ...Array.from(set).sort()];
  }, [leads]);

  const filteredLeads = useMemo(() => {
    let result = filterByDateRange(leads, dateRange);
    if (bankFilter !== "all") result = result.filter(l => resolveBank(l) === bankFilter);
    return result;
  }, [leads, dateRange, bankFilter]);

  const active    = useMemo(() => filteredLeads.filter(isActive), [filteredLeads]);
  const newLeads  = useMemo(() => active.filter((l) => ["new_lead", "contacted"].includes(getStage(l))), [active]);
  const inProgress = useMemo(() => active.filter((l) => !["new_lead", "contacted"].includes(getStage(l))), [active]);
  const waitingDocs = useMemo(() =>
    active.filter((l) => ["documents_requested", "waiting_documents"].includes(getStage(l))),
  [active]);
  const completed = useMemo(() => filteredLeads.filter((l) => getStage(l) === "closed_won"), [filteredLeads]);

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
    for (const l of completed) {
      const bank = resolveBank(l);
      counts[bank] = (counts[bank] || 0) + 1;
    }
    const entries = Object.entries(counts).filter(([b]) => b !== "לא הוגדר");
    if (entries.length === 0) return { name: null, count: 0 };
    entries.sort((a, b) => b[1] - a[1]);
    return { name: entries[0][0], count: entries[0][1] };
  }, [completed]);
  const bankClosings = useMemo(() => {
    const map = {};
    for (const l of completed) {
      const bank = resolveBank(l);
      if (!map[bank]) map[bank] = { count: 0, totalMortgage: 0 };
      map[bank].count++;
      map[bank].totalMortgage += Number(l.mortgageAmount) || 0;
    }
    const total = completed.length || 1;
    return Object.entries(map)
      .map(([bank, d]) => ({ bank, count: d.count, totalMortgage: d.totalMortgage, pct: Math.round((d.count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [completed]);
  const caseTypeAnalytics = useMemo(() => {
    const CASE_TYPE_MAP = {
      "רכישת דירה יד 2": "דירה ראשונה",
      "רכישת דירה מקבלן": "מחיר למשתכן",
      "מחזור משכנתא": "מחזור",
      "בנייה עצמית": "בניה עצמית",
      "רכישת מגרש": "השקעה",
      "שיעבוד נכס קיים": "השקעה",
      "דירה ראשונה": "דירה ראשונה",
      "משפרי דיור": "משפרי דיור",
      "מחזור": "מחזור",
      "השקעה": "השקעה",
      "מחיר למשתכן": "מחיר למשתכן",
      "בניה עצמית": "בניה עצמית",
    };
    const map = {};
    for (const l of filteredLeads) {
      const raw = l.mortgageType || "";
      const group = CASE_TYPE_MAP[raw] || (raw ? raw : "לא צוין");
      if (!map[group]) map[group] = { total: 0, closed: 0 };
      map[group].total++;
      if (getStage(l) === "closed_won") map[group].closed++;
    }
    return Object.entries(map)
      .map(([type, d]) => ({ type, total: d.total, closed: d.closed, conversionRate: d.total > 0 ? Math.round((d.closed / d.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [filteredLeads]);

  const heatLevelAnalytics = useMemo(() => {
    const groups = { hot: { label: "Hot", count: 0 }, warm: { label: "Warm", count: 0 }, cold: { label: "Cold", count: 0 } };
    for (const l of filteredLeads) {
      const score = Number(l.heatScore) || 0;
      if (score >= 70) groups.hot.count++;
      else if (score >= 40) groups.warm.count++;
      else groups.cold.count++;
    }
    return [groups.hot, groups.warm, groups.cold];
  }, [filteredLeads]);

  const bankPerformance = useMemo(() => {
    const APPROVED_STAGES = new Set(["principle_approval", "bank_negotiation", "selected_track", "signing_scheduled", "signed", "collateral_completion", "funds_released", "closed_won"]);
    const CLOSED_STAGES = new Set(["closed_won"]);
    const map = {};
    for (const l of filteredLeads) {
      const bank = resolveBank(l);
      const stage = getStage(l);
      if (!map[bank]) map[bank] = { total: 0, approved: 0, closed: 0 };
      map[bank].total++;
      if (APPROVED_STAGES.has(stage)) map[bank].approved++;
      if (CLOSED_STAGES.has(stage)) map[bank].closed++;
    }
    return Object.entries(map)
      .map(([bank, d]) => ({ bank, ...d, conversionRate: d.total > 0 ? Math.round((d.closed / d.total) * 100) : 0 }))
      .sort((a, b) => b.closed - a.closed);
  }, [filteredLeads]);

  const funnelData = useMemo(() => {
    const stages = ["new_lead", "documents_requested", "eligibility_review", "submitted_to_bank", "principle_approval", "signed", "closed_won"];
    const labels = ["ליד חדש", "מסמכים", "בדיקת זכאות", "הגשה לבנק", "אישור עקרוני", "חתימה", "הושלם"];
    return stages.map((stage, i) => {
      const count = filteredLeads.filter(l => {
        const idx = stages.indexOf(getStage(l));
        return idx >= i;
      }).length;
      return { stage, label: labels[i], count };
    });
  }, [filteredLeads]);

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

  const hasPricingProfile = Boolean(pricingProfile && pricingProfile.pricingModel);

  const commissionData = useMemo(() => {
    if (!hasPricingProfile) return null;
    let forecast = 0;
    let actual = 0;
    let forecastCount = 0;
    let actualCount = 0;
    for (const lead of leads) {
      const actualVal = Number(lead.actualCommission || lead.commissionAmount || 0);
      const stage = getStage(lead);

      if (stage === "closed_won" && actualVal > 0) {
        actual += actualVal;
        actualCount++;
        continue;
      }

      if (isActive(lead)) {
        const est = calcCommission(pricingProfile, lead);
        if (est !== null && est > 0) {
          forecast += est;
          forecastCount++;
        }
      }
    }
    return { forecast, actual, forecastCount, actualCount };
  }, [leads, pricingProfile, hasPricingProfile]);

  const isDebugEnabled = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_DEBUG === "true";

  const debugLeadRows = useMemo(() => {
    if (!isDebugEnabled) return [];
    const STAGE_PROBABILITY = {
      new_lead: 0.05, contacted: 0.1,
      documents_requested: 0.35, waiting_documents: 0.35, documents_received: 0.35,
      eligibility_review: 0.2,
      appraisal_ordered: 0.45, appraisal_completed: 0.5, lawyer_review: 0.55,
      submitted_to_bank: 0.6,
      principle_approval: 0.8, bank_negotiation: 0.8, selected_track: 0.8,
      signing_scheduled: 0.95, signed: 0.95,
      collateral_completion: 0.97, funds_released: 0.99,
    };
    const ADVANCED = new Set(["principle_approval", "bank_negotiation", "selected_track", "signing_scheduled", "signed", "collateral_completion", "funds_released"]);
    return leads.map(l => {
      const stage = getStage(l);
      const w = STAGE_PROBABILITY[stage] || 0.1;
      const amount = Number(l.mortgageAmount) || 0;
      return {
        id: l.id, name: l.name || "—", type: l.mortgageType || "—",
        stage, rawStage: l.pipelineStage || l.leadStatus || "—",
        loanAmount: amount,
        selectedBank: l.selectedBank || "", assignedBank: l.assignedBank || "",
        bankName: l.bankName || "", bankerBank: (l.banker && l.banker.bank) || "",
        resolvedBank: resolveBank(l),
        heatScore: l.heatScore ?? "—", heatLevel: l.heatLevel || "—",
        probability: w, weightedContribution: Math.round(amount * w),
        expectedCloseIncluded: ADVANCED.has(stage),
      };
    });
  }, [leads]);

  // ── Empty state — advisor has no leads yet ───────────────────────────────────
  if (!loading && leads.length === 0) {
    return (
      <>
        <Head><title>לוח בקרה | FINZO PRO</title><meta name="robots" content="noindex,nofollow" /></Head>
        <main dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-950">
          <AdvisorHeader active="/advisor" urgentItems={[]} />
          <div className="max-w-6xl mx-auto px-4 py-16 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <ClipboardIcon size={28} strokeWidth={1.8} />
            </div>
            <h2 className="text-xl font-black text-slate-950 dark:text-slate-50">עדיין אין לך לידים פעילים</h2>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
              כאן יוצגו הלידים שנרכשו מ-FINZO ושויכו אליך. עבור לשוק הלידים כדי לרכוש את הליד הראשון שלך.
            </p>
            <Link
              href="/advisor/leads"
              className="mt-2 inline-block rounded-2xl bg-brand-700 dark:bg-brand-600 text-white font-black py-3 px-8 text-sm hover:bg-brand-800 dark:hover:bg-brand-700 transition-colors"
            >
              עבור לשוק הלידים ←
            </Link>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500">
              לא ניתן ליצור לידים ידנית. כל הלידים מגיעים דרך FINZO.
            </p>
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
      <main dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <AdvisorHeader active="/advisor" urgentItems={attentionItems} notificationCount={unreadCount} notifications={notifications} onMarkAllRead={() => {
          fetch("/api/advisor/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "readAll" }) }).then(() => { setUnreadCount(0); setNotifications(n => n.map(x => ({ ...x, readAt: new Date().toISOString() }))); }).catch(() => {});
        }} />

        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-5 space-y-5">

          {/* ── Welcome / context banner ──────────────────────────────────── */}
          <div className="flex items-start justify-between gap-3 rounded-2xl bg-gradient-to-l from-brand-50 dark:from-brand-950/40 to-white dark:to-slate-900 border border-brand-100 dark:border-brand-900/50 px-5 py-4">
            <div className="min-w-0">
              <h1 className="text-base font-black text-slate-950 dark:text-slate-50 mb-0.5">
                {advisorName ? `שלום, ${advisorName}` : "שלום, ברוך הבא למרכז העבודה"}
              </h1>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                {!loading && attentionItems.length > 0
                  ? <span className="text-danger-600 dark:text-danger-400">{attentionItems.length} לידים דורשים טיפול — בדקו את רשימת הדחוף למטה.</span>
                  : "כל התיקים תקינים. עברו לשוק הלידים לרכוש לידים חדשים."}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/advisor/leads"
                className="text-xs font-bold text-brand-700 dark:text-brand-400 hover:text-brand-900 dark:hover:text-brand-300 px-3 py-1.5 bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 rounded-lg transition-colors hidden sm:block">
                שוק לידים →
              </Link>
              <Link href="/advisor/settings"
                className="flex items-center text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors hidden sm:block">
                <SettingsIcon size={14} />
              </Link>
            </div>
          </div>

          {/* ── Pricing profile warning ────────────────────────────────── */}
          {pricingLoaded && !hasPricingProfile && !loading && leads.length > 0 && (
            <div className="flex items-center gap-3 rounded-2xl bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 px-5 py-3.5">
              <span className="shrink-0 text-warning-600 dark:text-warning-400"><AlertTriangleIcon size={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-warning-800 dark:text-warning-200">הגדר מודל עמלות כדי להפעיל תחזיות הכנסה</p>
                <p className="text-xs font-bold text-warning-600 dark:text-warning-400 mt-0.5">תחזיות הכנסה, ROI ועמלות צפויות מושבתים ללא מודל עמלה מוגדר.</p>
              </div>
              <Link href="/advisor/settings" className="shrink-0 text-xs font-black text-warning-800 dark:text-warning-200 bg-warning-100 dark:bg-warning-800/50 border border-warning-300 dark:border-warning-700 px-3 py-1.5 rounded-lg hover:bg-warning-200 dark:hover:bg-warning-800 transition-colors">
                הגדרות →
              </Link>
            </div>
          )}

          {/* ── Date & Bank Filters ─────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2">
            {DATE_PRESETS.map(p => (
              <button key={p.key} onClick={() => setDateRange(p.key)}
                className={`text-xs font-black px-3 py-1.5 rounded-lg border transition-colors ${dateRange === p.key ? "bg-brand-100 dark:bg-brand-900/30 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                {p.label}
              </button>
            ))}
            {allBanks.length > 1 && (
              <select value={bankFilter} onChange={e => setBankFilter(e.target.value)}
                className="text-xs font-bold border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-brand-400 mr-auto">
                <option value="all">כל הבנקים</option>
                {allBanks.filter(b => b !== "all").map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            )}
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
              <div className="bg-white dark:bg-slate-900 border border-brand-200 dark:border-brand-800 rounded-xl p-4">
                <p className="text-[11px] font-bold text-brand-600 dark:text-brand-400 mb-1">הבנק המוביל בסגירות</p>
                {topBank.name ? (
                  <>
                    <p className="text-2xl font-black tabular-nums text-slate-900 dark:text-slate-100">{topBank.name}</p>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">{topBank.count} עסקאות שנסגרו</p>
                  </>
                ) : (
                  <p className="text-sm font-bold text-slate-400 dark:text-slate-500 mt-1">אין מספיק נתונים</p>
                )}
              </div>
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
                            className="h-full rounded-full bg-brand-500 dark:bg-brand-600 transition-all duration-500"
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
                                <Link href={`/advisor/lead/${lead.id}`} className="font-black text-slate-900 dark:text-slate-100 hover:text-brand-700 dark:hover:text-brand-400 transition-colors">
                                  {lead.name || "—"}
                                </Link>
                              </td>
                              <td className="px-4 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                                {getPipelineStageLabel(getStage(lead))}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`text-xs font-black tabular-nums ${daysSince !== null && daysSince >= 7 ? "text-danger-600 dark:text-danger-400" : "text-slate-600 dark:text-slate-400"}`}>
                                  {daysSince !== null ? daysSince : "—"}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`text-xs font-black tabular-nums ${missingDocs > 0 ? "text-warning-600 dark:text-warning-400" : "text-slate-400 dark:text-slate-500"}`}>
                                  {missingDocs}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                {overdue ? (
                                  <span className="text-[11px] font-black text-danger-600 dark:text-danger-400">באיחור</span>
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
              {/* Funnel Analytics */}
              {!loading && funnelData.length > 0 && (
                <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                  <div className="mb-4">
                    <h2 className="text-sm font-black text-slate-950 dark:text-slate-50">משפך המרה</h2>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">כמה לידים עברו כל שלב</p>
                  </div>
                  <div className="space-y-2">
                    {funnelData.map((item, i) => {
                      const maxCount = funnelData[0]?.count || 1;
                      const pct = Math.max(6, (item.count / maxCount) * 100);
                      return (
                        <div key={item.stage} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-24 shrink-0 text-right truncate">{item.label}</span>
                          <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-brand-500 dark:bg-brand-600 transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-black tabular-nums text-slate-700 dark:text-slate-300 w-6 text-left shrink-0">{item.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* רכישות לפי סוג תיק */}
              {!loading && caseTypeAnalytics.length > 0 && (
                <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-sm font-black text-slate-950 dark:text-slate-50">רכישות לפי סוג תיק</h2>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">התפלגות לידים לפי סוג משכנתא</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                          <th className="text-right text-[11px] font-bold text-slate-400 dark:text-slate-500 px-4 py-2.5">סוג תיק</th>
                          <th className="text-right text-[11px] font-bold text-slate-400 dark:text-slate-500 px-4 py-2.5">לידים</th>
                          <th className="text-right text-[11px] font-bold text-slate-400 dark:text-slate-500 px-4 py-2.5">סגירות</th>
                          <th className="text-right text-[11px] font-bold text-slate-400 dark:text-slate-500 px-4 py-2.5">% המרה</th>
                        </tr>
                      </thead>
                      <tbody>
                        {caseTypeAnalytics.map(row => (
                          <tr key={row.type} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-2.5 font-black text-slate-900 dark:text-slate-100">{row.type}</td>
                            <td className="px-4 py-2.5 text-xs font-black tabular-nums text-slate-700 dark:text-slate-300">{row.total}</td>
                            <td className="px-4 py-2.5 text-xs font-black tabular-nums text-slate-700 dark:text-slate-300">{row.closed}</td>
                            <td className="px-4 py-2.5 text-xs font-black tabular-nums text-slate-600 dark:text-slate-400">{row.conversionRate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* לידים לפי רמת חום */}
              {!loading && filteredLeads.length > 0 && (
                <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                  <div className="mb-4">
                    <h2 className="text-sm font-black text-slate-950 dark:text-slate-50">לידים לפי רמת חום</h2>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">התפלגות לפי heat score</p>
                  </div>
                  <div className="space-y-3">
                    {heatLevelAnalytics.map(({ label, count }) => {
                      const total = filteredLeads.length || 1;
                      const pct = Math.round((count / total) * 100);
                      const color = label === "Hot" ? "bg-danger-500" : label === "Warm" ? "bg-warning-500" : "bg-accent-500";
                      const textColor = label === "Hot" ? "text-danger-600 dark:text-danger-400" : label === "Warm" ? "text-warning-600 dark:text-warning-400" : "text-accent-600 dark:text-accent-400";
                      return (
                        <div key={label} className="flex items-center gap-3">
                          <span className={`text-xs font-black w-12 shrink-0 text-right ${textColor}`}>{label}</span>
                          <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.max(4, pct)}%` }} />
                          </div>
                          <span className="text-xs font-black tabular-nums text-slate-700 dark:text-slate-300 w-14 text-left shrink-0">{count} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ביצועים לפי בנק */}
              {!loading && bankPerformance.length > 0 && (
                <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-sm font-black text-slate-950 dark:text-slate-50">ביצועים לפי בנק</h2>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">הגשות, אישורים, סגירות ואחוז המרה</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                          <th className="text-right text-[11px] font-bold text-slate-400 dark:text-slate-500 px-4 py-2.5">בנק</th>
                          <th className="text-right text-[11px] font-bold text-slate-400 dark:text-slate-500 px-4 py-2.5">לידים</th>
                          <th className="text-right text-[11px] font-bold text-slate-400 dark:text-slate-500 px-4 py-2.5">אישורים</th>
                          <th className="text-right text-[11px] font-bold text-slate-400 dark:text-slate-500 px-4 py-2.5">סגירות</th>
                          <th className="text-right text-[11px] font-bold text-slate-400 dark:text-slate-500 px-4 py-2.5">% המרה</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bankPerformance.map(row => (
                          <tr key={row.bank} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-2.5 font-black text-slate-900 dark:text-slate-100">{row.bank}</td>
                            <td className="px-4 py-2.5 text-xs font-black tabular-nums text-slate-700 dark:text-slate-300">{row.total}</td>
                            <td className="px-4 py-2.5 text-xs font-black tabular-nums text-slate-700 dark:text-slate-300">{row.approved}</td>
                            <td className="px-4 py-2.5 text-xs font-black tabular-nums text-success-600 dark:text-success-400">{row.closed}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${row.conversionRate}%` }} />
                                </div>
                                <span className="text-xs font-black tabular-nums text-slate-600 dark:text-slate-400">{row.conversionRate}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* ROI Dashboard — only when pricing profile is configured */}
              {!loading && leads.length > 0 && hasPricingProfile && commissionData && (
                <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                  <div className="mb-4">
                    <h2 className="text-sm font-black text-slate-950 dark:text-slate-50">ROI — החזר על השקעה</h2>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">ביצועים כלליים של רכישת לידים</p>
                  </div>
                  {(() => {
                    const totalLeads = filteredLeads.length;
                    const closedWon = completed.length;
                    const totalRevenue = commissionData.actual;
                    const avgDealSize = closedWon > 0 ? Math.round(completed.reduce((s, l) => s + (Number(l.mortgageAmount) || 0), 0) / closedWon) : 0;
                    const avgCommission = closedWon > 0 ? Math.round(totalRevenue / closedWon) : 0;
                    const cac = closedWon > 0 ? Math.round((totalLeads * 150) / closedWon) : 0;
                    const revenuePerLead = totalLeads > 0 ? Math.round(totalRevenue / totalLeads) : 0;
                    const roi = cac > 0 ? Math.round(((revenuePerLead - cac) / cac) * 100) : 0;
                    const bankConversion = (() => {
                      const submitted = filteredLeads.filter(l => {
                        const s = getStage(l);
                        return ["submitted_to_bank", "principle_approval", "bank_negotiation", "selected_track", "signing_scheduled", "signed", "collateral_completion", "funds_released", "closed_won"].includes(s);
                      }).length;
                      const approved = filteredLeads.filter(l => {
                        const s = getStage(l);
                        return ["principle_approval", "bank_negotiation", "selected_track", "signing_scheduled", "signed", "collateral_completion", "funds_released", "closed_won"].includes(s);
                      }).length;
                      return submitted > 0 ? Math.round((approved / submitted) * 100) : 0;
                    })();
                    return (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">ROI%</p>
                          <p className={`text-xl font-black tabular-nums ${roi >= 0 ? "text-success-600 dark:text-success-400" : "text-danger-600 dark:text-danger-400"}`}>{roi}%</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">CAC (עלות רכישת לקוח)</p>
                          <p className="text-xl font-black tabular-nums text-slate-900 dark:text-slate-100">{formatILS(cac)}</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">הכנסה לליד</p>
                          <p className="text-xl font-black tabular-nums text-slate-900 dark:text-slate-100">{formatILS(revenuePerLead)}</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">ממוצע עסקה</p>
                          <p className="text-xl font-black tabular-nums text-slate-900 dark:text-slate-100">{formatILS(avgDealSize)}</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">ממוצע עמלה</p>
                          <p className="text-xl font-black tabular-nums text-slate-900 dark:text-slate-100">{formatILS(avgCommission)}</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">אחוז אישור בנק</p>
                          <p className="text-xl font-black tabular-nums text-brand-600 dark:text-brand-400">{bankConversion}%</p>
                        </div>
                      </div>
                    );
                  })()}
                </section>
              )}

              {/* Pipeline Forecasting */}
              {!loading && active.length > 0 && (
                <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                  <div className="mb-4">
                    <h2 className="text-sm font-black text-slate-950 dark:text-slate-50">תחזית Pipeline</h2>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">הערכות סגירה על בסיס שלב נוכחי</p>
                  </div>
                  {(() => {
                    const STAGE_PROBABILITY = {
                      new_lead: 0.05, contacted: 0.1,
                      documents_requested: 0.35, waiting_documents: 0.35, documents_received: 0.35,
                      eligibility_review: 0.2,
                      appraisal_ordered: 0.45, appraisal_completed: 0.5, lawyer_review: 0.55,
                      submitted_to_bank: 0.6,
                      principle_approval: 0.8, bank_negotiation: 0.8, selected_track: 0.8,
                      signing_scheduled: 0.95, signed: 0.95,
                      collateral_completion: 0.97, funds_released: 0.99,
                    };
                    const ADVANCED_STAGES = new Set(["principle_approval", "bank_negotiation", "selected_track", "signing_scheduled", "signed", "collateral_completion", "funds_released"]);
                    const now = new Date();
                    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    const expectedClose = active.filter(l => {
                      const stage = getStage(l);
                      if (!ADVANCED_STAGES.has(stage)) return false;
                      const nextDate = l.nextActionAt || l.followUpDate;
                      return !nextDate || new Date(nextDate) <= monthEnd;
                    });
                    let weightedPipeline = 0;
                    let estimatedRevenue = 0;
                    const debugRows = [];
                    for (const l of active) {
                      const stage = getStage(l);
                      const w = STAGE_PROBABILITY[stage] || 0.1;
                      const amount = Number(l.mortgageAmount) || 0;
                      const contribution = amount * w;
                      weightedPipeline += contribution;
                      if (hasPricingProfile) {
                        const est = calcCommission(pricingProfile, l);
                        if (est !== null && est > 0) estimatedRevenue += est * w;
                      }
                      debugRows.push({
                        id: l.id,
                        name: l.name || "—",
                        type: l.mortgageType || "—",
                        stage,
                        rawStage: l.pipelineStage || l.leadStatus || "—",
                        loanAmount: amount,
                        selectedBank: l.selectedBank || "",
                        assignedBank: l.assignedBank || "",
                        bankName: l.bankName || "",
                        bankerBank: (l.banker && l.banker.bank) || "",
                        resolvedBank: resolveBank(l),
                        heatScore: l.heatScore ?? "—",
                        heatLevel: l.heatLevel || "—",
                        probability: w,
                        weightedContribution: Math.round(contribution),
                        expectedCloseIncluded: ADVANCED_STAGES.has(stage),
                      });
                    }
                    if (isDebugEnabled) {
                      console.log("[DEBUG] Pipeline Forecast — weighted:", weightedPipeline, "revenue:", estimatedRevenue, "expectedClose:", expectedClose.length);
                      console.table(debugRows);
                    }
                    return (
                      <div className="space-y-4">
                        <div className={`grid ${hasPricingProfile ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"} gap-3`}>
                          <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-100 dark:border-brand-800">
                            <p className="text-[10px] font-bold text-brand-600 dark:text-brand-400">צפי סגירה החודש</p>
                            <p className="text-2xl font-black tabular-nums text-brand-700 dark:text-brand-300">{expectedClose.length}</p>
                          </div>
                          <div className="p-3 bg-success-50 dark:bg-success-900/20 rounded-xl border border-success-100 dark:border-success-800">
                            <p className="text-[10px] font-bold text-success-600 dark:text-success-400">Pipeline משוקלל</p>
                            <p className="text-2xl font-black tabular-nums text-success-700 dark:text-success-300">{formatILS(Math.round(weightedPipeline))}</p>
                          </div>
                          {hasPricingProfile && (
                            <>
                              <div className="p-3 bg-accent-50 dark:bg-accent-900/20 rounded-xl border border-accent-100 dark:border-accent-800">
                                <p className="text-[10px] font-bold text-accent-600 dark:text-accent-400">הכנסה צפויה</p>
                                <p className="text-2xl font-black tabular-nums text-accent-700 dark:text-accent-300">{formatILS(Math.round(estimatedRevenue))}</p>
                              </div>
                              <div className="p-3 bg-warning-50 dark:bg-warning-900/20 rounded-xl border border-warning-100 dark:border-warning-800">
                                <p className="text-[10px] font-bold text-warning-600 dark:text-warning-400">עמלות צפויות</p>
                                <p className="text-2xl font-black tabular-nums text-warning-700 dark:text-warning-300">{formatILS(Math.round(estimatedRevenue))}</p>
                              </div>
                            </>
                          )}
                        </div>
                        {expectedClose.length > 0 && (
                          <div>
                            <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 mb-2">צפי סגירה החודש:</p>
                            <div className="space-y-1.5">
                              {expectedClose.slice(0, 5).map(l => (
                                <Link key={l.id} href={`/advisor/lead/${l.id}`} className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                  <span className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">{l.name || "—"}</span>
                                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tabular-nums shrink-0 mr-2">{formatILS(Number(l.mortgageAmount) || 0)}</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </section>
              )}

              {/* Commission Dashboard */}
              {!loading && hasPricingProfile && commissionData && (
                <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-black text-slate-950 dark:text-slate-50">עמלות — דשבורד</h2>
                      <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">מעקב הכנסות ועמלות</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-success-50 dark:bg-success-900/20 rounded-xl border border-success-100 dark:border-success-800">
                      <p className="text-[10px] font-bold text-success-600 dark:text-success-400">עמלות בפועל</p>
                      <p className="text-xl font-black tabular-nums text-success-700 dark:text-success-300">{formatILS(commissionData.actual || 0)}</p>
                    </div>
                    <div className="p-3 bg-warning-50 dark:bg-warning-900/20 rounded-xl border border-warning-100 dark:border-warning-800">
                      <p className="text-[10px] font-bold text-warning-600 dark:text-warning-400">עמלות צפויות</p>
                      <p className="text-xl font-black tabular-nums text-warning-700 dark:text-warning-300">{formatILS(commissionData.forecast || 0)}</p>
                    </div>
                    <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-100 dark:border-brand-800">
                      <p className="text-[10px] font-bold text-brand-600 dark:text-brand-400">תיקים פעילים</p>
                      <p className="text-xl font-black tabular-nums text-brand-700 dark:text-brand-300">{commissionData.forecastCount || 0}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">עסקאות שולמו</p>
                      <p className="text-xl font-black tabular-nums text-slate-900 dark:text-slate-100">{commissionData.actualCount || 0}</p>
                    </div>
                  </div>
                </section>
              )}

              {/* סגירות לפי בנק */}
              {!loading && bankClosings.length > 0 && (
                <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-sm font-black text-slate-950 dark:text-slate-50">סגירות לפי בנק</h2>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                      התפלגות עסקאות שנסגרו בהצלחה לפי בנק
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                          <th className="text-right text-[11px] font-bold text-slate-400 dark:text-slate-500 px-4 py-2.5">בנק</th>
                          <th className="text-right text-[11px] font-bold text-slate-400 dark:text-slate-500 px-4 py-2.5">תיקים שנסגרו</th>
                          <th className="text-right text-[11px] font-bold text-slate-400 dark:text-slate-500 px-4 py-2.5">סך משכנתאות</th>
                          <th className="text-right text-[11px] font-bold text-slate-400 dark:text-slate-500 px-4 py-2.5">% מכלל הסגירות</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bankClosings.map((row) => (
                          <tr key={row.bank} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-2.5 font-black text-slate-900 dark:text-slate-100">{row.bank}</td>
                            <td className="px-4 py-2.5 text-xs font-black tabular-nums text-slate-700 dark:text-slate-300">{row.count}</td>
                            <td className="px-4 py-2.5 text-xs font-black tabular-nums text-slate-700 dark:text-slate-300">{formatILS(row.totalMortgage)}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${row.pct}%` }} />
                                </div>
                                <span className="text-xs font-black tabular-nums text-slate-600 dark:text-slate-400">{row.pct}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
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
                        <span className="mr-2 text-[11px] font-black text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/30 rounded-full px-2 py-0.5 align-middle">{attentionItems.length}</span>
                      )}
                    </h2>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                      לידים עם פעולות באיחור, מסמכים חסרים או ללא מעקב
                    </p>
                  </div>
                  <Link href="/advisor/my-leads" className="text-xs font-black text-brand-600 dark:text-brand-400 hover:underline shrink-0">
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
                          icon={CheckCircleIcon}
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
                          icon={CalendarIcon}
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
                      { label: "בנק מוביל", value: topBank.name || "—" },
                      { label: "ללא קשר 7+ ימים", value: noContactLeads.length },
                      { label: "ממתין מסמכים", value: waitingDocs.length },
                      { label: "לידים חמים", value: heatLevelAnalytics[0].count },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</span>
                        <span className="text-sm font-black text-slate-900 dark:text-slate-100 tabular-nums">{value}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* עמלות */}
              {pricingLoaded && (
                <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                  <h2 className="text-sm font-black text-slate-950 dark:text-slate-50 mb-3">עמלות</h2>
                  {commissionData ? (
                    <div className="space-y-2">
                      <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl px-3 py-3">
                        <p className="text-[11px] font-black text-brand-500 dark:text-brand-400 mb-0.5">עמלות צפויות (forecast)</p>
                        <p className="text-2xl font-black text-brand-700 dark:text-brand-300 tabular-nums">
                          ₪{commissionData.forecast.toLocaleString("he-IL", { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-[10px] font-bold text-brand-400 dark:text-brand-500 mt-0.5">{commissionData.forecastCount} תיקים פעילים</p>
                      </div>
                      <div className="bg-success-50 dark:bg-success-900/20 rounded-xl px-3 py-3">
                        <p className="text-[11px] font-black text-success-500 dark:text-success-400 mb-0.5">עמלות בפועל (שולמו)</p>
                        <p className="text-2xl font-black text-success-700 dark:text-success-300 tabular-nums">
                          ₪{commissionData.actual.toLocaleString("he-IL", { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-[10px] font-bold text-success-400 dark:text-success-500 mt-0.5">{commissionData.actualCount} תיקים שולמו</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-warning-50 dark:bg-warning-900/20 rounded-xl px-3 py-4 text-center">
                      <p className="text-sm font-black text-warning-700 dark:text-warning-200 mb-1">לא הוגדר מודל עמלה</p>
                      <p className="text-xs font-bold text-warning-500 dark:text-warning-400 mb-3">הגדר מודל עמלה בהגדרות כדי לראות תחזית</p>
                      <Link href="/advisor/settings" className="text-xs font-black text-brand-700 dark:text-brand-400 hover:underline">
                        הגדר עכשיו →
                      </Link>
                    </div>
                  )}
                </section>
              )}

              {/* פעולות מהירות */}
              <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                <h2 className="text-sm font-black text-slate-950 dark:text-slate-50 mb-3">פעולות מהירות</h2>
                <div className="space-y-2">
                  <Link href="/advisor/leads"
                    className="flex items-center gap-3 rounded-xl bg-brand-700 dark:bg-brand-600 text-white px-4 py-3 text-sm font-black hover:bg-brand-800 dark:hover:bg-brand-700 transition-colors">
                    <span className="shrink-0"><StoreIcon size={16} /></span>
                    <span>שוק הלידים של FINZO</span>
                  </Link>
                  <Link href="/advisor/my-leads"
                    className="flex items-center gap-3 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 text-brand-800 dark:text-brand-300 px-4 py-3 text-sm font-black hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors">
                    <span className="shrink-0"><ClipboardIcon size={16} /></span>
                    <span>כל הלידים שלי</span>
                  </Link>
                  <Link href="/advisor/calendar"
                    className="flex items-center gap-3 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 text-brand-800 dark:text-brand-300 px-4 py-3 text-sm font-black hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors">
                    <span className="shrink-0"><CalendarIcon size={16} /></span>
                    <span>יומן ולוח שנה</span>
                  </Link>
                  <Link href="/"
                    className="flex items-center gap-3 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 text-brand-800 dark:text-brand-300 px-4 py-3 text-sm font-black hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors">
                    <span className="shrink-0"><CalculatorIcon size={16} /></span>
                    <span>מחשבון זכאות</span>
                  </Link>
                  <Link href="/refinance-check"
                    className="flex items-center gap-3 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 text-brand-800 dark:text-brand-300 px-4 py-3 text-sm font-black hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors">
                    <span className="shrink-0"><RefreshIcon size={16} /></span>
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

        {/* Dev-only debug panel */}
        {isDebugEnabled && !loading && debugLeadRows.length > 0 && (
          <details className="max-w-6xl mx-auto px-4 lg:px-6 my-4">
            <summary className="cursor-pointer text-xs font-black text-danger-500 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg px-4 py-2 select-none">
              Dashboard Debug ({debugLeadRows.length} leads)
            </summary>
            <div className="mt-2 bg-slate-950 text-success-400 rounded-xl p-4 overflow-x-auto text-[11px] font-mono leading-relaxed">
              <p className="text-warning-400 mb-2 font-bold">Pipeline Summary:</p>
              <p>Weighted Pipeline: {formatILS(debugLeadRows.reduce((s, r) => s + r.weightedContribution, 0))}</p>
              <p>Expected Close (advanced stages): {debugLeadRows.filter(r => r.expectedCloseIncluded).length}</p>
              <p>Unique Resolved Banks: {[...new Set(debugLeadRows.map(r => r.resolvedBank))].join(", ")}</p>
              <p>Has Pricing Profile: {String(hasPricingProfile)}</p>
              <p className="text-warning-400 mt-3 mb-2 font-bold">Per-Lead Breakdown:</p>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-slate-400 text-left border-b border-slate-700">
                    <th className="px-1 py-1">id</th>
                    <th className="px-1 py-1">name</th>
                    <th className="px-1 py-1">type</th>
                    <th className="px-1 py-1">stage</th>
                    <th className="px-1 py-1">rawStage</th>
                    <th className="px-1 py-1">loan</th>
                    <th className="px-1 py-1">selectedBank</th>
                    <th className="px-1 py-1">assignedBank</th>
                    <th className="px-1 py-1">bankName</th>
                    <th className="px-1 py-1">banker.bank</th>
                    <th className="px-1 py-1">resolved</th>
                    <th className="px-1 py-1">heat</th>
                    <th className="px-1 py-1">prob</th>
                    <th className="px-1 py-1">weighted</th>
                    <th className="px-1 py-1">expClose</th>
                  </tr>
                </thead>
                <tbody>
                  {debugLeadRows.map(r => (
                    <tr key={r.id} className="border-b border-slate-800 hover:bg-slate-900">
                      <td className="px-1 py-0.5 text-slate-500 max-w-[60px] truncate">{r.id.slice(-6)}</td>
                      <td className="px-1 py-0.5 max-w-[80px] truncate">{r.name}</td>
                      <td className="px-1 py-0.5 max-w-[70px] truncate">{r.type}</td>
                      <td className="px-1 py-0.5 text-cyan-400">{r.stage}</td>
                      <td className="px-1 py-0.5 text-slate-500">{r.rawStage}</td>
                      <td className="px-1 py-0.5 tabular-nums">{r.loanAmount.toLocaleString()}</td>
                      <td className="px-1 py-0.5">{r.selectedBank || <span className="text-slate-600">—</span>}</td>
                      <td className="px-1 py-0.5">{r.assignedBank || <span className="text-slate-600">—</span>}</td>
                      <td className="px-1 py-0.5">{r.bankName || <span className="text-slate-600">—</span>}</td>
                      <td className="px-1 py-0.5">{r.bankerBank || <span className="text-slate-600">—</span>}</td>
                      <td className="px-1 py-0.5 text-warning-400">{r.resolvedBank}</td>
                      <td className="px-1 py-0.5 tabular-nums">{r.heatScore}</td>
                      <td className="px-1 py-0.5 tabular-nums">{r.probability}</td>
                      <td className="px-1 py-0.5 tabular-nums text-success-400">{r.weightedContribution.toLocaleString()}</td>
                      <td className="px-1 py-0.5">{r.expectedCloseIncluded ? <span className="text-success-400">yes</span> : <span className="text-slate-600">no</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </main>
    </>
  );
}
