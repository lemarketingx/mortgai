import Head from "next/head";
import Link from "next/link";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { formatILS } from "../../lib/format";
import { KpiTile, Skeleton, EmptyState } from "../../components/ui";
import AdvisorHeader from "../../components/AdvisorHeader";
import {
  PIPELINE_STAGES,
  getPipelineStageLabel,
  isClosedPipelineStage,
  normalizePipelineStage,
} from "../../lib/pipeline";
import { calculateOverallMortgageProgress } from "../../lib/mortgageCase";

const PURCHASE_STATUS_LABELS = {
  new_purchase:       "רכישת דירה",
  first_apartment:    "דירה ראשונה",
  upgrader:           "משפר דיור",
  investment:         "דירה להשקעה",
  refinance:          "מחזור משכנתא",
  bank_declined:      "סורב בבנק",
  bdi_credit_issue:   "מורכבות אשראית",
  senior_60plus:      "גיל 60+",
  debt_consolidation: "איחוד הלוואות",
  general:            "בדיקה כללית",
};

// ─── Static lookup maps ───────────────────────────────────────────────────────
const STAGE_BADGE = {
  new_lead:            "bg-violet-50 text-violet-700 border-violet-200",
  contacted:           "bg-violet-50 text-violet-700 border-violet-200",
  documents_requested: "bg-indigo-50 text-indigo-700 border-indigo-200",
  waiting_documents:   "bg-amber-50 text-amber-700 border-amber-200",
  documents_received:  "bg-amber-50 text-amber-700 border-amber-200",
  eligibility_review:  "bg-sky-50 text-sky-700 border-sky-200",
  appraisal_ordered:   "bg-cyan-50 text-cyan-700 border-cyan-200",
  appraisal_completed: "bg-cyan-50 text-cyan-700 border-cyan-200",
  lawyer_review:       "bg-teal-50 text-teal-700 border-teal-200",
  submitted_to_bank:   "bg-sky-50 text-sky-700 border-sky-200",
  principle_approval:  "bg-blue-50 text-blue-700 border-blue-200",
  bank_negotiation:    "bg-blue-50 text-blue-700 border-blue-200",
  selected_track:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  signing_scheduled:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  signed:              "bg-green-50 text-green-800 border-green-200",
  collateral_completion:"bg-lime-50 text-lime-800 border-lime-200",
  funds_released:      "bg-green-50 text-green-800 border-green-200",
  closed_won:          "bg-green-50 text-green-800 border-green-200",
  closed_lost:         "bg-rose-50 text-rose-700 border-rose-200",
};

const STAGE_PROGRESS_COLOR = [
  "bg-violet-500","bg-violet-400","bg-indigo-400","bg-amber-400",
  "bg-amber-500","bg-sky-400","bg-sky-500","bg-blue-500",
  "bg-cyan-500","bg-teal-500","bg-blue-400","bg-blue-500",
  "bg-blue-400","bg-emerald-400","bg-emerald-500","bg-green-500",
  "bg-lime-500","bg-green-600","bg-green-700",
];

const ACTIVE_PIPELINE_STAGES = PIPELINE_STAGES.filter((s) => s !== "closed_lost");

const PREFS_KEY = "finzo_prefs_v1";
const PAGE_SIZE = 20;

// Pre-build Sets for O(1) stage membership lookup in kanban grouping
const KANBAN_GROUPS = [
  { key: "new_lead",    label: "ליד חדש",     color: "bg-violet-500",  stageSet: new Set(["new_lead"]) },
  { key: "contacted",  label: "נוצר קשר",     color: "bg-violet-400",  stageSet: new Set(["contacted"]) },
  { key: "documents",  label: "מסמכים",        color: "bg-amber-500",   stageSet: new Set(["documents_requested","waiting_documents","documents_received"]) },
  { key: "eligibility",label: "בדיקת זכאות",  color: "bg-sky-500",     stageSet: new Set(["eligibility_review","appraisal_ordered","appraisal_completed"]) },
  { key: "bank",       label: "בנק",           color: "bg-blue-500",    stageSet: new Set(["lawyer_review","submitted_to_bank","principle_approval","bank_negotiation","selected_track"]) },
  { key: "signing",    label: "חתימות",        color: "bg-emerald-500", stageSet: new Set(["signing_scheduled","signed","collateral_completion","funds_released"]) },
  { key: "closed",     label: "נסגר",          color: "bg-green-600",   stageSet: new Set(["closed_won"]) },
];

const DAY_MS = 864e5;

// ─── Utility helpers ──────────────────────────────────────────────────────────
function getToday() { return new Date(new Date().toDateString()); }
function isOverdue(d, today) { return d && new Date(d) < (today || getToday()); }
function isToday(d) { return d && new Date(d).toDateString() === new Date().toDateString(); }
function diffDays(d, today) {
  if (!d) return null;
  const t = today || getToday();
  return Math.max(0, Math.floor((t - new Date(new Date(d).toDateString())) / DAY_MS));
}
function formatShort(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

function getStage(lead) { return normalizePipelineStage(lead.pipelineStage || lead.leadStatus); }
function getStageIndex(lead) { return ACTIVE_PIPELINE_STAGES.indexOf(getStage(lead)); }

/** Pre-compute priority for a lead. Call once, not in sort comparator. */
function computePriority(lead) {
  const today = getToday();
  const stage = getStage(lead);
  const closed = isClosedPipelineStage(stage);
  if (closed) return { priority: 0, badges: [] };
  const daysStuck = diffDays(lead.lastActivityAt || lead.stageUpdatedAt || lead.createdAt, today) || 0;
  const score = Math.round(Number(lead.approvalScore || lead.estimatedApprovalResult) || 0);
  const missing = Number(lead.missingDocumentsCount || 0);
  const docsPercent = Number(lead.documentsCompletionPercent || 0);
  const signingSoon = lead.signingDate
    && Math.ceil((new Date(lead.signingDate) - Date.now()) / DAY_MS) <= 7
    && new Date(lead.signingDate) >= today;
  const waitingAppraisal = ["appraisal_ordered","appraisal_completed"].includes(stage) && lead.appraisalStatus !== "report_received";
  const waitingLawyer = stage === "lawyer_review" || (lead.buyerLawyerName && !(lead.legalContractReceived && lead.legalRightsReceived && lead.legalRegistrationReceived));
  const waitingBank = ["submitted_to_bank","principle_approval","bank_negotiation"].includes(stage);
  const badges = [];
  let priority = 20;
  if (isOverdue(lead.nextActionAt, today) || isOverdue(lead.followUpDate, today)) { priority = 100; badges.push("דחוף"); }
  if (isToday(lead.nextActionAt) || isToday(lead.followUpDate)) { priority = Math.max(priority, 90); badges.push("היום"); }
  if (score >= 70 && !lead.firstContactAt) { priority = Math.max(priority, 85); badges.push("דחוף"); }
  if (missing > 0 && ["documents_requested","waiting_documents","documents_received"].includes(stage)) { priority = Math.max(priority, 78); badges.push("חסר מסמכים"); }
  if (signingSoon) { priority = Math.max(priority, 82); badges.push("חתימות השבוע"); }
  if (waitingAppraisal) { priority = Math.max(priority, 72); badges.push("ממתין לשמאי"); }
  if (daysStuck >= 3) { priority = Math.max(priority, 68); badges.push(`תקוע ${daysStuck} ימים`); }
  if (waitingLawyer) priority = Math.max(priority, 55);
  if (waitingBank) priority = Math.max(priority, 50);
  if (docsPercent > 0 && docsPercent < 100) priority = Math.max(priority, 45);
  if (badges.length === 0 && missing > 0) badges.push("חסר מסמכים");
  return { priority, badges: [...new Set(badges)] };
}

function openWaPhone(phone) {
  const raw = String(phone).replace(/[^\d]/g, "");
  const intl = raw.startsWith("0") ? `972${raw.slice(1)}` : raw;
  window.open(`https://wa.me/${intl}`, "_blank", "noopener,noreferrer");
}

// ─── Lead Card — memoized so it only re-renders when lead data changes ────────
const MyLeadCard = memo(function MyLeadCard({ lead }) {
  const stage = getStage(lead);
  const stageBadge = STAGE_BADGE[stage] || "bg-slate-50 text-slate-600 border-slate-200";
  const score = Math.round(Number(lead.approvalScore || lead.estimatedApprovalResult) || 0);
  const quality = lead.leadQuality || (score >= 70 ? "חם" : score >= 40 ? "בינוני" : "חלש");
  const qualityColor = String(quality).includes("חם") || score >= 70 ? "text-emerald-600"
    : String(quality).includes("בינוני") || score >= 40 ? "text-amber-600" : "text-slate-400";
  // computePriority is O(1) per card — computed once, not inside sort
  const { priority, badges } = computePriority(lead);
  const missing = Number(lead.missingDocumentsCount || 0);
  // Prefer server-computed value; only fallback to local calculation if absent
  const overall = Number(lead.overallProgressPercent ?? calculateOverallMortgageProgress(lead)) || 0;
  const dueDate = lead.nextActionAt || lead.followUpDate;
  const overdue = isOverdue(dueDate);
  const isRecentlyPurchased = lead.purchasedAt && (Date.now() - new Date(lead.purchasedAt).getTime()) < 864e5;

  return (
    <article className={`bg-white rounded-xl border shadow-sm p-4 ${priority >= 90 ? "border-rose-300 bg-rose-50/20" : isRecentlyPurchased ? "border-emerald-200" : "border-slate-100"}`}>
      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${stageBadge}`}>{getPipelineStageLabel(stage)}</span>
        <span className={`text-[11px] font-black ${qualityColor}`}>{quality}</span>
        {lead.purchaseStatus && PURCHASE_STATUS_LABELS[lead.purchaseStatus] && (
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 whitespace-nowrap">
            {PURCHASE_STATUS_LABELS[lead.purchaseStatus]}
          </span>
        )}
        {isRecentlyPurchased && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 whitespace-nowrap">נרכש לאחרונה ✓</span>
        )}
        {badges.slice(0, 2).map((badge) => (
          <span key={badge} className={`text-[11px] font-black px-2 py-0.5 rounded-full ${badge === "דחוף" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{badge}</span>
        ))}
      </div>
      {/* Name + phone */}
      <Link href={`/advisor/lead/${lead.id}`} className="block text-base font-black text-slate-950 hover:text-violet-700 truncate mb-0.5">{lead.name || "—"}</Link>
      {lead.phone && <a href={`tel:${lead.phone}`} className="text-sm font-black text-violet-600 hover:underline block mb-3">{lead.phone}</a>}
      {/* Next action + follow-up */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="font-black text-slate-400 mb-0.5">פעולה הבאה</p>
          <p className="font-black text-slate-800 truncate">{lead.nextAction || "לא נקבעה"}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="font-black text-slate-400 mb-0.5">מעקב</p>
          <p className={`font-black truncate ${overdue ? "text-rose-700" : "text-slate-800"}`}>{formatShort(dueDate) || "—"}</p>
        </div>
      </div>
      {/* Missing docs */}
      {missing > 0 && (
        <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5">
          <span className="text-xs font-black text-amber-800">חסרים {missing} מסמכים</span>
        </div>
      )}
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, overall))}%` }} />
        </div>
        <span className="text-xs font-black text-slate-500 tabular-nums">{overall}%</span>
      </div>
      {/* Hebrew action buttons */}
      <div className="grid grid-cols-3 gap-1.5">
        {lead.phone
          ? <a href={`tel:${lead.phone}`} className="text-center text-xs font-black rounded-lg py-2 bg-violet-50 text-violet-700 active:bg-violet-100">התקשר</a>
          : <button disabled className="text-center text-xs font-black rounded-lg py-2 bg-slate-100 text-slate-400">התקשר</button>}
        {lead.phone
          ? <button type="button" onClick={() => openWaPhone(lead.phone)} className="text-center text-xs font-black rounded-lg py-2 bg-emerald-50 text-emerald-700 active:bg-emerald-100">וואטסאפ</button>
          : <button disabled className="text-center text-xs font-black rounded-lg py-2 bg-slate-100 text-slate-400">וואטסאפ</button>}
        <Link href={`/advisor/lead/${lead.id}`} className="text-center text-xs font-black rounded-lg py-2 bg-violet-700 text-white active:bg-violet-900">פתח תיק</Link>
      </div>
    </article>
  );
});

// ─── List View row — memoized ─────────────────────────────────────────────────
const LeadListRow = memo(function LeadListRow({ lead }) {
  const stage = getStage(lead);
  const si = getStageIndex(lead);
  const overall = Number(lead.overallProgressPercent ?? calculateOverallMortgageProgress(lead)) || 0;
  const dueDate = lead.nextActionAt || lead.followUpDate;
  const stageBadge = STAGE_BADGE[stage] || "bg-slate-50 text-slate-600 border-slate-200";
  const color = STAGE_PROGRESS_COLOR[si] || "bg-violet-400";
  const overdue = isOverdue(dueDate);
  return (
    <tr className={`border-b border-slate-100 hover:bg-slate-50/60 transition-colors ${overdue ? "bg-rose-50/30" : ""}`}>
      <td className="px-4 py-3">
        <Link href={`/advisor/lead/${lead.id}`} className="font-black text-slate-900 hover:text-violet-700 block truncate max-w-[160px]">{lead.name || "—"}</Link>
      </td>
      <td className="px-4 py-3">
        {lead.phone ? <a href={`tel:${lead.phone}`} className="text-sm font-bold text-violet-600 hover:underline whitespace-nowrap">{lead.phone}</a> : <span className="text-slate-400">—</span>}
      </td>
      <td className="px-4 py-3">
        <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border whitespace-nowrap ${stageBadge}`}>{getPipelineStageLabel(stage)}</span>
      </td>
      <td className="px-4 py-3 max-w-[180px]">
        <span className="text-xs font-bold text-slate-700 truncate block">{lead.nextAction || "—"}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-bold whitespace-nowrap ${overdue ? "text-rose-700 font-black" : "text-slate-600"}`}>{formatShort(dueDate) || "—"}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, overall))}%` }} />
          </div>
          <span className="text-xs font-black tabular-nums text-slate-600 shrink-0">{overall}%</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          {lead.phone && <a href={`tel:${lead.phone}`} className="text-[11px] font-black px-2 py-1 rounded-lg bg-violet-50 text-violet-700 active:bg-violet-100 whitespace-nowrap">התקשר</a>}
          {lead.phone && <button type="button" onClick={() => openWaPhone(lead.phone)} className="text-[11px] font-black px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 active:bg-emerald-100 whitespace-nowrap">וואטסאפ</button>}
          <Link href={`/advisor/lead/${lead.id}`} className="text-[11px] font-black px-2 py-1 rounded-lg bg-violet-700 text-white active:bg-violet-900 whitespace-nowrap">פתח תיק</Link>
        </div>
      </td>
    </tr>
  );
});

function LeadListView({ leads }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" dir="rtl">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              {["שם","טלפון","שלב","פעולה הבאה","מעקב","התקדמות","פעולות"].map((col) => (
                <th key={col} className="px-4 py-3 text-right text-xs font-black text-slate-500 whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => <LeadListRow key={lead.id} lead={lead} />)}
          </tbody>
        </table>
        {leads.length === 0 && <div className="text-center py-12 text-slate-400 text-sm font-bold">אין לידים</div>}
      </div>
    </div>
  );
}

// ─── Kanban View — memoized, O(1) stage lookup via Set ────────────────────────
const KanbanView = memo(function KanbanView({ leads }) {
  const groups = useMemo(() =>
    KANBAN_GROUPS.map((g) => ({
      ...g,
      leads: leads.filter((l) => g.stageSet.has(normalizePipelineStage(l.pipelineStage || l.leadStatus))),
    })).filter((g) => g.leads.length > 0),
  [leads]);

  const closedLost = useMemo(() =>
    leads.filter((l) => normalizePipelineStage(l.pipelineStage || l.leadStatus) === "closed_lost"),
  [leads]);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.key}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`h-3 w-3 rounded-full shrink-0 ${group.color}`} />
            <h3 className="text-sm font-black text-slate-800">{group.label}</h3>
            <span className="text-xs font-black text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{group.leads.length}</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {group.leads.map((lead) => <MyLeadCard key={lead.id} lead={lead} />)}
          </div>
        </div>
      ))}
      {closedLost.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-3 w-3 rounded-full shrink-0 bg-slate-300" />
            <h3 className="text-sm font-black text-slate-500">יצאו מהתהליך</h3>
            <span className="text-xs font-black text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{closedLost.length}</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {closedLost.map((lead) => <MyLeadCard key={lead.id} lead={lead} />)}
          </div>
        </div>
      )}
    </div>
  );
});

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdvisorMyLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("kanban"); // hydrated from localStorage in useEffect
  const [sortBy, setSortBy] = useState("purchased"); // hydrated from localStorage in useEffect
  // Separate controlled input state from the debounced value that drives filtering.
  // This lets the input feel instant while the expensive filter runs after 200ms.
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useRef(null);
  const [stageFilter, setStageFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    // Restore URL stage filter
    const params = new URLSearchParams(window.location.search);
    const s = params.get("stage");
    if (s && PIPELINE_STAGES.includes(normalizePipelineStage(s))) setStageFilter(normalizePipelineStage(s));
    // Restore saved view / sort preferences (runs client-side only — safe from hydration)
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.defaultView && ["kanban", "cards", "list"].includes(p.defaultView)) setView(p.defaultView);
        if (p.defaultSort && ["priority", "newest", "amount", "status"].includes(p.defaultSort)) setSortBy(p.defaultSort);
      }
    } catch {}
  }, []);

  useEffect(() => { load(); }, []);

  // Cleanup search debounce on unmount
  useEffect(() => () => clearTimeout(searchTimerRef.current), []);

  // Reset visible window whenever filter, search, or sort changes
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [stageFilter, debouncedSearch, sortBy]);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/advisor/my-leads");
    if (r.status === 401) { window.location.href = "/advisor/login"; return; }
    if (!r.ok) { setError("שגיאה בטעינת הלידים."); setLoading(false); return; }
    const j = await r.json();
    setLeads(j.leads || []);
    setLoading(false);
  }

  function handleSearchChange(e) {
    const val = e.target.value;
    setSearchInput(val); // immediate — keeps input responsive
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(val.trim().toLowerCase()); // delayed — triggers filter
    }, 200);
  }

  function savePref(key, value) {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      localStorage.setItem(PREFS_KEY, JSON.stringify({ ...p, [key]: value }));
    } catch {}
  }

  function setViewAndSave(v) { setView(v);   savePref("defaultView", v); }
  function setSortAndSave(v) { setSortBy(v); savePref("defaultSort", v); }

  // ── Derived counts (cheap) ───────────────────────────────────────────────
  const active = useMemo(() => leads.filter((l) => !isClosedPipelineStage(l.pipelineStage || l.leadStatus)), [leads]);
  const closed = useMemo(() => leads.filter((l) => normalizePipelineStage(l.pipelineStage || l.leadStatus) === "closed_won"), [leads]);
  const exited = useMemo(() => leads.filter((l) => normalizePipelineStage(l.pipelineStage || l.leadStatus) === "closed_lost"), [leads]);
  const totalSpent = useMemo(() => leads.reduce((s, l) => s + (Number(l.purchasePrice) || 0), 0), [leads]);
  const conversionRate = leads.length > 0 ? Math.round((closed.length / leads.length) * 100) : 0;

  // ── Filtered + sorted leads ─────────────────────────────────────────────
  // Uses debouncedSearch (not searchInput) so filter only runs after 200ms idle.
  // Priorities are pre-computed in a map pass to avoid O(N log N) calls in the sort.
  const filtered = useMemo(() => {
    let base =
      stageFilter === "all"    ? leads :
      stageFilter === "active" ? active :
      stageFilter === "closed" ? closed :
      stageFilter === "lost"   ? exited :
      leads.filter((l) => normalizePipelineStage(l.pipelineStage || l.leadStatus) === stageFilter);

    if (debouncedSearch) {
      const qDigits = debouncedSearch.replace(/\D/g, "");
      base = base.filter((l) =>
        (l.name || "").toLowerCase().includes(debouncedSearch) ||
        (qDigits && (l.phone || "").replace(/\D/g, "").includes(qDigits)) ||
        (l.city || l.propertyCity || "").toLowerCase().includes(debouncedSearch) ||
        getPipelineStageLabel(normalizePipelineStage(l.pipelineStage || l.leadStatus)).includes(debouncedSearch)
      );
    }

    // Sort by advisor preference
    if (sortBy === "purchased") {
      return [...base].sort((a, b) => new Date(b.purchasedAt || b.createdAt || 0) - new Date(a.purchasedAt || a.createdAt || 0));
    }
    if (sortBy === "newest") {
      return [...base].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    if (sortBy === "amount") {
      return [...base].sort((a, b) => (Number(b.mortgageAmount) || 0) - (Number(a.mortgageAmount) || 0));
    }
    if (sortBy === "status") {
      return [...base].sort((a, b) => getStageIndex(b) - getStageIndex(a));
    }

    // Default "priority" — pre-compute O(N), then sort O(N log N)
    const withMeta = base.map((l) => ({
      l,
      p: computePriority(l).priority,
      d: l.nextActionAt || l.followUpDate || l.createdAt || "",
    }));
    withMeta.sort((a, b) => {
      const diff = b.p - a.p;
      if (diff !== 0) return diff;
      return new Date(a.d) - new Date(b.d);
    });
    return withMeta.map((x) => x.l);
  }, [leads, stageFilter, debouncedSearch, active, closed, exited, sortBy]);

  const statusTabs = [
    { key: "all",    label: "הכל",          count: leads.length },
    { key: "active", label: "פעיל",          count: active.length },
    { key: "closed", label: "נסגר בהצלחה",  count: closed.length },
    { key: "lost",   label: "יצא מהתהליך",  count: exited.length },
  ];

  return (
    <>
      <Head><title>הלידים שלי | FINZO PRO</title><meta name="robots" content="noindex,nofollow" /></Head>
      <main dir="rtl" className="min-h-screen bg-slate-50 pb-24 md:pb-0">
        <AdvisorHeader active="/advisor/my-leads" />
        <div className="max-w-[92rem] mx-auto px-4 lg:px-6 py-4">

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2">
                    <Skeleton variant="line" className="w-20" /><Skeleton variant="line" className="w-10 h-8" />
                  </div>
                ))
              : <>
                  <KpiTile label="סה״כ נרכשו"  value={leads.length} />
                  <KpiTile label="הוצאה כוללת" value={formatILS(totalSpent)} />
                  <KpiTile label="נסגרו"        value={closed.length} />
                  <KpiTile label="אחוז המרה"    value={`${conversionRate}%`} />
                </>}
          </div>

          {/* Search + view toggle */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <input
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="חיפוש שם / טלפון / עיר / שלב..."
              autoComplete="off" autoCorrect="off" spellCheck="false" dir="rtl"
              className="flex-1 min-w-[200px] max-w-sm border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300 bg-white"
            />
            <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white shrink-0">
              {[{ k: "kanban", l: "קנבן" }, { k: "cards", l: "כרטיסים" }, { k: "list", l: "רשימה" }].map(({ k, l }) => (
                <button key={k} onClick={() => setViewAndSave(k)}
                  className={`px-4 py-2 text-xs font-black transition-colors ${view === k ? "bg-violet-700 text-white" : "text-slate-500 hover:text-slate-800"}`}>{l}</button>
              ))}
            </div>
            <select value={sortBy} onChange={(e) => setSortAndSave(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-black bg-white outline-none focus:ring-2 focus:ring-violet-300 shrink-0 text-slate-600">
              <option value="purchased">נרכש לאחרונה</option>
              <option value="priority">עדיפות</option>
              <option value="newest">חדש</option>
              <option value="amount">סכום</option>
              <option value="status">שלב</option>
            </select>
          </div>

          {/* Status tabs */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            {statusTabs.map(({ key, label, count }) => (
              <button key={key} onClick={() => setStageFilter(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold whitespace-nowrap rounded-full transition-colors ${stageFilter === key ? "bg-violet-700 text-white" : "bg-white border border-slate-200 text-slate-500 hover:text-slate-800"}`}>
                {label}
                <span className={`tabular-nums text-[11px] px-1.5 py-0.5 rounded-full font-black ${stageFilter === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{count}</span>
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-bold flex justify-between">
              <span>{error}</span>
              <button onClick={() => setError("")} className="text-red-400 font-black">×</button>
            </div>
          )}

          {loading && (
            <div className="space-y-6">
              {[5, 3].map((count, gi) => (
                <div key={gi}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-3 w-3 rounded-full bg-slate-200 animate-pulse shrink-0" />
                    <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 w-6 bg-slate-100 rounded-full animate-pulse" />
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: count }).map((_, i) => (
                      <div key={i} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-3">
                        <div className="flex gap-1.5">
                          <div className="h-5 w-16 bg-slate-200 rounded-full animate-pulse" />
                          <div className="h-5 w-10 bg-slate-100 rounded-full animate-pulse" />
                        </div>
                        <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
                        <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="h-10 bg-slate-50 rounded-lg animate-pulse" />
                          <div className="h-10 bg-slate-50 rounded-lg animate-pulse" />
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full animate-pulse" />
                        <div className="grid grid-cols-3 gap-1.5">
                          <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
                          <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
                          <div className="h-8 bg-violet-100 rounded-lg animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && stageFilter === "all" && !debouncedSearch && (
            <EmptyState glyph="📋" title="עדיין לא רכשתם לידים" description="עברו לחנות הלידים כדי לקנות."
              action={<Link href="/advisor/leads" className="inline-block rounded-full bg-violet-700 text-white px-6 py-3 text-sm font-black">לחנות הלידים ←</Link>} />
          )}
          {!loading && filtered.length === 0 && (stageFilter !== "all" || debouncedSearch) && (
            <EmptyState glyph="🔍" title="אין תוצאות" description="נסו לשנות את החיפוש או הסינון." />
          )}

          {!loading && filtered.length > 0 && (
            <p className="text-xs font-bold text-slate-400 mb-3 tabular-nums">
              {view === "kanban"
                ? `${filtered.length} לידים`
                : `מציג ${Math.min(visibleCount, filtered.length)} מתוך ${filtered.length} לידים`}
            </p>
          )}

          {!loading && filtered.length > 0 && view === "kanban" && <KanbanView leads={filtered} />}

          {!loading && filtered.length > 0 && view === "cards" && (
            <>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filtered.slice(0, visibleCount).map((lead) => <MyLeadCard key={lead.id} lead={lead} />)}
              </div>
              {visibleCount < filtered.length && (
                <div className="mt-5 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-slate-200 bg-white text-xs font-black text-slate-600 hover:text-violet-700 hover:border-violet-300 transition-colors shadow-sm"
                  >
                    טען עוד — {filtered.length - visibleCount} נותרים
                  </button>
                </div>
              )}
            </>
          )}

          {!loading && filtered.length > 0 && view === "list" && (
            <>
              <LeadListView leads={filtered.slice(0, visibleCount)} />
              {visibleCount < filtered.length && (
                <div className="mt-5 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-slate-200 bg-white text-xs font-black text-slate-600 hover:text-violet-700 hover:border-violet-300 transition-colors shadow-sm"
                  >
                    טען עוד — {filtered.length - visibleCount} נותרים
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      </main>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 px-4 py-3 flex gap-2">
        <Link href="/advisor"          className="flex-1 text-center text-xs font-black text-slate-600 bg-slate-100 rounded-xl py-2.5">ראשי</Link>
        <Link href="/advisor/my-leads" className="flex-1 text-center text-xs font-black text-violet-700 bg-violet-50  rounded-xl py-2.5">הלידים שלי</Link>
        <Link href="/advisor/leads"    className="flex-1 text-center text-xs font-black text-slate-600 bg-slate-100 rounded-xl py-2.5">שוק</Link>
      </div>
    </>
  );
}
