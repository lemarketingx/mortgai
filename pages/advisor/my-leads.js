import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatILS } from "../../lib/format";
import { KpiTile, Tag, Skeleton, EmptyState } from "../../components/ui";
import AdvisorHeader from "../../components/AdvisorHeader";
import { PIPELINE_STAGES, getPipelineProgress, getPipelineStageLabel, isClosedPipelineStage, normalizePipelineStage } from "../../lib/pipeline";
import {
  APPRAISAL_STATUS_LABELS,
  FUNDS_RELEASE_STATUS_LABELS,
  LEGAL_CHECKLIST,
  buildDocumentChecklist,
  calculateCollateralProgress,
  calculateOverallMortgageProgress,
  getDocumentLabel,
} from "../../lib/mortgageCase";

const STAGE_BADGE = {
  new_lead: "bg-violet-50 text-violet-700 border-violet-200",
  contacted: "bg-violet-50 text-violet-700 border-violet-200",
  documents_requested: "bg-indigo-50 text-indigo-700 border-indigo-200",
  waiting_documents: "bg-amber-50 text-amber-700 border-amber-200",
  documents_received: "bg-amber-50 text-amber-700 border-amber-200",
  eligibility_review: "bg-sky-50 text-sky-700 border-sky-200",
  appraisal_ordered: "bg-cyan-50 text-cyan-700 border-cyan-200",
  appraisal_completed: "bg-cyan-50 text-cyan-700 border-cyan-200",
  lawyer_review: "bg-teal-50 text-teal-700 border-teal-200",
  submitted_to_bank: "bg-sky-50 text-sky-700 border-sky-200",
  principle_approval: "bg-blue-50 text-blue-700 border-blue-200",
  bank_negotiation: "bg-blue-50 text-blue-700 border-blue-200",
  selected_track: "bg-emerald-50 text-emerald-700 border-emerald-200",
  signing_scheduled: "bg-emerald-50 text-emerald-700 border-emerald-200",
  signed: "bg-green-50 text-green-800 border-green-200",
  collateral_completion: "bg-lime-50 text-lime-800 border-lime-200",
  funds_released: "bg-green-50 text-green-800 border-green-200",
  closed_won: "bg-green-50 text-green-800 border-green-200",
  closed_lost: "bg-rose-50 text-rose-700 border-rose-200",
};
const STAGE_PROGRESS_COLOR = [
  "bg-violet-500", "bg-violet-400", "bg-indigo-400", "bg-amber-400",
  "bg-amber-500", "bg-sky-400", "bg-sky-500", "bg-blue-500",
  "bg-cyan-500", "bg-teal-500", "bg-blue-400", "bg-blue-500",
  "bg-blue-400", "bg-emerald-400", "bg-emerald-500", "bg-green-500",
  "bg-lime-500", "bg-green-600", "bg-green-700",
];
const ACTIVE_PIPELINE_STAGES = PIPELINE_STAGES.filter((stage) => stage !== "closed_lost");

const DOC_TYPES = ["תעודת_זהות", "תלושי_שכר_3_אחרונים", "דפי_עו_ש_3_חודשים", "אישור_עבודה_ומשכורת", "חוזה_רכישה", "נסח_טאבו", "שומת_מס_אחרונה", "דוח_פנסיה", "אחר"];
const DOC_LABELS = {
  "תעודת_זהות": "תעודת זהות", "תלושי_שכר_3_אחרונים": "3 תלושי שכר", "דפי_עו_ש_3_חודשים": 'דפי עו"ש 3 חודשים',
  "אישור_עבודה_ומשכורת": "אישור עבודה", "חוזה_רכישה": "חוזה רכישה", "נסח_טאבו": "נסח טאבו",
  "שומת_מס_אחרונה": "שומת מס", "דוח_פנסיה": 'דו"ח פנסיה', "אחר": "מסמך אחר",
};
const WA_TEMPLATES = {
  "בקשת מסמכים": "היי, אשמח שתשלחו לי את המסמכים הנדרשים כדי לקדם את התיק.",
  "תיאום שיחה": "היי, מתי נוח לכם לשיחה קצרה היום/מחר?",
  "תזכורת": "רק תזכורת קצרה ממני לגבי המשך התהליך במשכנתא.",
  "עדכון שלב": "עדכון: התיק התקדם לשלב הבא. אעדכן אתכם בכל התקדמות נוספת.",
};

const TODAY_D = () => new Date(new Date().toDateString());
const DAY_MS = 864e5;

function diffDays(d) { if (!d) return null; return Math.max(0, Math.floor((TODAY_D() - new Date(new Date(d).toDateString())) / DAY_MS)); }
function isOverdue(d) { return d && new Date(d) < TODAY_D(); }
function isToday(d) { return d && new Date(d).toDateString() === new Date().toDateString(); }
function formatShort(d) { if (!d) return ""; return new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short" }); }
function formatDateTime(d) { if (!d) return ""; return new Date(d).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }

function getStage(lead) { return normalizePipelineStage(lead.pipelineStage || lead.leadStatus); }
function getStageIndex(lead) { return ACTIVE_PIPELINE_STAGES.indexOf(getStage(lead)); }
function isExited(lead) { return isClosedPipelineStage(getStage(lead)); }

function CardSkeleton() { return <div className="bg-white border border-slate-100 rounded-2xl p-4"><Skeleton variant="block" className="h-40" /></div>; }

function StageProgress({ lead }) {
  const si = getStageIndex(lead);
  if (si < 0) return null;
  const pct = getPipelineProgress(lead.pipelineStage || lead.leadStatus);
  const color = STAGE_PROGRESS_COLOR[si] || "bg-violet-400";
  return (
    <div className="mb-3">
      <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
        <span>שלב {si + 1} מתוך {ACTIVE_PIPELINE_STAGES.length}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function OverallProgress({ lead }) {
  const pct = Number(lead.overallProgressPercent ?? calculateOverallMortgageProgress(lead)) || 0;
  return (
    <div className="mb-3 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
      <div className="flex justify-between text-[11px] font-black text-slate-500 mb-1">
        <span>התקדמות תיק משכנתא</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 bg-white rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
    </div>
  );
}

function formatOptionalDate(dateValue) {
  return dateValue ? new Date(dateValue).toLocaleDateString("he-IL", { day: "numeric", month: "short" }) : "";
}

function getLawyerStatus(lead) {
  const done = LEGAL_CHECKLIST.filter((item) => Boolean(lead[item.key])).length;
  return `${done}/${LEGAL_CHECKLIST.length}`;
}

function MortgageCaseSummary({ lead, documentSummary }) {
  const stage = getStage(lead);
  const docsPercent = Number(documentSummary?.completionPercent ?? lead.documentsCompletionPercent ?? 0) || 0;
  const missingCount = Number(documentSummary?.missingCount ?? lead.missingDocumentsCount ?? 0) || 0;
  const collateralPercent = Number(lead.collateralCompletionPercent ?? calculateCollateralProgress(lead)) || 0;
  const appraisalLabel = APPRAISAL_STATUS_LABELS[lead.appraisalStatus || "not_ordered"] || APPRAISAL_STATUS_LABELS.not_ordered;
  const fundsLabel = FUNDS_RELEASE_STATUS_LABELS[lead.fundsReleaseStatus || "not_released"] || FUNDS_RELEASE_STATUS_LABELS.not_released;
  const overall = Number(lead.overallProgressPercent ?? calculateOverallMortgageProgress(lead)) || 0;

  return (
    <div className="grid grid-cols-2 gap-2 text-[11px]">
      {[
        ["שלב", getPipelineStageLabel(stage)],
        ["התקדמות", `${overall}%`],
        ["מסמכים", `${docsPercent}%`],
        ["חסרים", `${missingCount}`],
        ["שמאות", appraisalLabel],
        ["עו״ד", getLawyerStatus(lead)],
        ["בטחונות", `${collateralPercent}%`],
        ["כספים", fundsLabel],
      ].map(([label, value]) => (
        <div key={label} className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2">
          <p className="font-black text-slate-400 mb-0.5">{label}</p>
          <p className="font-black text-slate-800 truncate">{value}</p>
        </div>
      ))}
      {lead.signingDate && (
        <div className="col-span-2 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-2">
          <p className="font-black text-emerald-700">חתימה: {formatOptionalDate(lead.signingDate)}</p>
        </div>
      )}
    </div>
  );
}

function getLeadPriority(lead) {
  const stage = getStage(lead);
  const closed = isClosedPipelineStage(stage);
  const daysStuck = diffDays(lead.lastActivityAt || lead.stageUpdatedAt || lead.createdAt) || 0;
  const score = Math.round(Number(lead.approvalScore || lead.estimatedApprovalResult) || 0);
  const missing = Number(lead.missingDocumentsCount || 0);
  const docsPercent = Number(lead.documentsCompletionPercent || 0);
  const docsPartial = docsPercent > 0 && docsPercent < 100;
  const signingSoon = lead.signingDate && Math.ceil((new Date(lead.signingDate) - new Date()) / DAY_MS) <= 7 && new Date(lead.signingDate) >= TODAY_D();
  const waitingAppraisal = ["appraisal_ordered", "appraisal_completed"].includes(stage) && lead.appraisalStatus !== "report_received";
  const waitingLawyer = stage === "lawyer_review" || (lead.buyerLawyerName && !(lead.legalContractReceived && lead.legalRightsReceived && lead.legalRegistrationReceived));
  const waitingBank = ["submitted_to_bank", "principle_approval", "bank_negotiation"].includes(stage);
  const badges = [];
  let priority = 20;

  if (closed) return { priority: 0, badges: [], daysStuck };
  if (isOverdue(lead.nextActionAt) || isOverdue(lead.followUpDate)) { priority = 100; badges.push("דחוף"); }
  if (isToday(lead.nextActionAt) || isToday(lead.followUpDate)) { priority = Math.max(priority, 90); badges.push("היום"); }
  if (score >= 70 && !lead.firstContactAt) { priority = Math.max(priority, 85); badges.push("דחוף"); }
  if (missing > 0 && ["documents_requested", "waiting_documents", "documents_received"].includes(stage)) { priority = Math.max(priority, 78); badges.push("חסר מסמכים"); }
  if (signingSoon) { priority = Math.max(priority, 82); badges.push("חתימות השבוע"); }
  if (waitingAppraisal) { priority = Math.max(priority, 72); badges.push("ממתין לשמאי"); }
  if (daysStuck >= 3) { priority = Math.max(priority, 68); badges.push(`תקוע ${daysStuck} ימים`); }
  if (waitingLawyer) priority = Math.max(priority, 55);
  if (waitingBank) priority = Math.max(priority, 50);
  if (docsPartial) priority = Math.max(priority, 45);
  if (badges.length === 0 && missing > 0) badges.push("חסר מסמכים");
  return { priority, badges: [...new Set(badges)], daysStuck };
}

function MyLeadCard({ lead }) {
  const stage = getStage(lead);
  const stageBadge = STAGE_BADGE[stage] || "bg-slate-50 text-slate-600 border-slate-200";
  const score = Math.round(Number(lead.approvalScore || lead.estimatedApprovalResult) || 0);
  const quality = lead.leadQuality || (score >= 70 ? "חם" : score >= 40 ? "בינוני" : "חלש");
  const qualityColor = String(quality).includes("חם") || score >= 70 ? "text-emerald-600" : String(quality).includes("בינוני") || score >= 40 ? "text-amber-600" : "text-slate-400";
  const priority = getLeadPriority(lead);
  const missing = Number(lead.missingDocumentsCount || 0);
  const docsPercent = Number(lead.documentsCompletionPercent || 0);
  const overall = Number(lead.overallProgressPercent ?? calculateOverallMortgageProgress(lead)) || 0;
  const dueDate = lead.nextActionAt || lead.followUpDate;

  function openWa() {
    if (!lead.phone) return;
    const raw = String(lead.phone).replace(/[^\d]/g, "");
    const phone = raw.startsWith("0") ? `972${raw.slice(1)}` : raw;
    window.open(`https://wa.me/${phone}`, "_blank", "noopener,noreferrer");
  }

  return (
    <article className={`bg-white rounded-xl border shadow-sm p-4 ${priority.priority >= 90 ? "border-rose-300 bg-rose-50/20" : "border-slate-100"}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${stageBadge}`}>{getPipelineStageLabel(stage)}</span>
            <span className={`text-[11px] font-black ${qualityColor}`}>{quality}</span>
            {priority.badges.slice(0, 3).map((badge) => (
              <span key={badge} className={`text-[11px] font-black px-2 py-0.5 rounded-full ${badge === "דחוף" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{badge}</span>
            ))}
          </div>
          <Link href={`/advisor/lead/${lead.id}`} className="block text-base font-black text-slate-950 hover:text-violet-700 truncate">{lead.name || "—"}</Link>
          {lead.phone && <a href={`tel:${lead.phone}`} className="text-sm font-black text-violet-600 hover:underline">{lead.phone}</a>}
        </div>
        <div className="shrink-0 text-left">
          <p className="text-2xl font-black text-slate-900 tabular-nums">{overall}%</p>
          <p className="text-[11px] font-black text-slate-400">התקדמות</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="font-black text-slate-400 mb-0.5">פעולה הבאה</p>
          <p className="font-black text-slate-800 truncate">{lead.nextAction || "לא נקבעה"}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="font-black text-slate-400 mb-0.5">תאריך מעקב</p>
          <p className={`font-black truncate ${isOverdue(dueDate) ? "text-rose-700" : "text-slate-800"}`}>{formatShort(dueDate) || "—"}</p>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
        <span className="text-xs font-black text-amber-800">חסרים {missing} מסמכים</span>
        <span className="text-xs font-black text-slate-500">מסמכים {docsPercent}%</span>
      </div>

      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, overall))}%` }} />
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {lead.phone
          ? <a href={`tel:${lead.phone}`} className="text-center text-xs font-black rounded-lg py-2 bg-violet-50 text-violet-700">Call</a>
          : <button disabled className="text-center text-xs font-black rounded-lg py-2 bg-slate-100 text-slate-400">Call</button>}
        {lead.phone
          ? <button type="button" onClick={openWa} className="text-center text-xs font-black rounded-lg py-2 bg-emerald-50 text-emerald-700">WhatsApp</button>
          : <button disabled className="text-center text-xs font-black rounded-lg py-2 bg-slate-100 text-slate-400">WA</button>}
        <Link href={`/advisor/lead/${lead.id}`} className="text-center text-xs font-black rounded-lg py-2 bg-slate-100 text-slate-700">Details</Link>
        <Link href={`/advisor/lead/${lead.id}`} className="text-center text-xs font-black rounded-lg py-2 bg-violet-700 text-white">פתח תיק</Link>
      </div>
    </article>
  );
}
export default function AdvisorMyLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("pipeline");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const s = params.get("stage");
    if (s && PIPELINE_STAGES.includes(normalizePipelineStage(s))) setStageFilter(normalizePipelineStage(s));
  }, []);

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

  function update(id, updatedLead) {
    setLeads((arr) => arr.map((l) => l.id === id ? { ...l, ...updatedLead } : l));
  }

  const q = search.trim().toLowerCase();
  const active = useMemo(() => leads.filter((l) => !isClosedPipelineStage(l.pipelineStage || l.leadStatus)), [leads]);
  const closed = useMemo(() => leads.filter((l) => normalizePipelineStage(l.pipelineStage || l.leadStatus) === "closed_won"), [leads]);
  const exited = useMemo(() => leads.filter((l) => normalizePipelineStage(l.pipelineStage || l.leadStatus) === "closed_lost"), [leads]);
  const totalSpent = useMemo(() => leads.reduce((s, l) => s + (Number(l.purchasePrice) || 0), 0), [leads]);
  const conversionRate = leads.length > 0 ? Math.round((closed.length / leads.length) * 100) : 0;

  const filtered = useMemo(() => {
    let base = stageFilter === "all" ? leads : stageFilter === "active" ? active : stageFilter === "closed" ? closed : stageFilter === "lost" ? exited : leads.filter((l) => normalizePipelineStage(l.pipelineStage || l.leadStatus) === stageFilter);
    if (q) base = base.filter((l) => (l.name || "").toLowerCase().includes(q) || (l.phone || "").replace(/\D/g, "").includes(q.replace(/\D/g, "")));
    return [...base].sort((a, b) => {
      const priorityDiff = getLeadPriority(b).priority - getLeadPriority(a).priority;
      if (priorityDiff !== 0) return priorityDiff;
      const aDate = a.nextActionAt || a.followUpDate || a.createdAt || "";
      const bDate = b.nextActionAt || b.followUpDate || b.createdAt || "";
      return new Date(aDate) - new Date(bDate);
    });
  }, [leads, stageFilter, q, active, closed, exited]);

  // Pipeline grouped view
  const pipelineGroups = useMemo(() => {
    if (view !== "pipeline") return [];
    return ACTIVE_PIPELINE_STAGES
      .map((stage, si) => ({
        stage, si,
        leads: filtered.filter((l) => normalizePipelineStage(l.pipelineStage || l.leadStatus) === stage),
      }))
      .filter((g) => g.leads.length > 0);
  }, [filtered, view]);

  const exitGroup = useMemo(() => view === "pipeline" ? filtered.filter((l) => normalizePipelineStage(l.pipelineStage || l.leadStatus) === "closed_lost") : [], [filtered, view]);

  const tabs = [
    { key: "all", label: "הכל", count: leads.length },
    { key: "active", label: "פעיל", count: active.length },
    { key: "closed", label: "נסגר בהצלחה", count: closed.length },
    { key: "lost", label: "יצא מהתהליך", count: exited.length },
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
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2"><Skeleton variant="line" className="w-20" /><Skeleton variant="line" className="w-10 h-8" /></div>)
              : <>
                  <KpiTile label="סה״כ נרכשו" value={leads.length} />
                  <KpiTile label="הוצאה כוללת" value={formatILS(totalSpent)} />
                  <KpiTile label="נסגרו" value={closed.length} />
                  <KpiTile label="אחוז המרה" value={`${conversionRate}%`} />
                </>}
          </div>

          {/* Search + view toggle */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש שם / טלפון..." autoComplete="off" autoCorrect="off" spellCheck="false" dir="rtl"
              className="flex-1 min-w-[180px] max-w-sm border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300 bg-white" />
            <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white shrink-0">
              {[{ k: "pipeline", l: "Pipeline" }, { k: "list", l: "רשימה" }].map(({ k, l }) => (
                <button key={k} onClick={() => setView(k)} className={`px-4 py-2 text-xs font-black transition-colors ${view === k ? "bg-violet-700 text-white" : "text-slate-500 hover:text-slate-800"}`}>{l}</button>
              ))}
            </div>
          </div>

          {/* Status tabs */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            {tabs.map(({ key, label, count }) => (
              <button key={key} onClick={() => setStageFilter(key)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold whitespace-nowrap rounded-full transition-colors ${stageFilter === key ? "bg-violet-700 text-white" : "bg-white border border-slate-200 text-slate-500 hover:text-slate-800"}`}>
                {label}<span className={`tabular-nums text-[11px] px-1.5 py-0.5 rounded-full font-black ${stageFilter === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{count}</span>
              </button>
            ))}
          </div>

          {error && <div className="mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-bold flex justify-between"><span>{error}</span><button onClick={() => setError("")} className="text-red-400 font-black">×</button></div>}

          {loading && <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>}

          {!loading && filtered.length === 0 && stageFilter === "all" && !q && (
            <EmptyState glyph="📋" title="עדיין לא רכשתם לידים" description="עברו לחנות הלידים כדי לקנות."
              action={<Link href="/advisor/leads" className="inline-block rounded-full bg-violet-700 text-white px-6 py-3 text-sm font-black">לחנות הלידים ←</Link>} />
          )}
          {!loading && filtered.length === 0 && (stageFilter !== "all" || q) && (
            <EmptyState glyph="🔍" title="אין תוצאות" description="נסו לשנות את החיפוש או הסינון." />
          )}

          {/* Pipeline grouped view */}
          {!loading && view === "pipeline" && (
            <div className="space-y-6">
              {pipelineGroups.map(({ stage, si, leads: groupLeads }) => (
                <div key={stage}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`h-3 w-3 rounded-full shrink-0 ${STAGE_PROGRESS_COLOR[si]}`} />
                    <h3 className="text-sm font-black text-slate-800">{getPipelineStageLabel(stage)}</h3>
                    <span className="text-xs font-black text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{groupLeads.length}</span>
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-[11px] font-bold text-slate-400">שלב {si + 1}/{ACTIVE_PIPELINE_STAGES.length}</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {groupLeads.map((lead) => <MyLeadCard key={lead.id} lead={lead} onUpdate={update} />)}
                  </div>
                </div>
              ))}
              {exitGroup.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-3 w-3 rounded-full shrink-0 bg-slate-300" />
                    <h3 className="text-sm font-black text-slate-500">יצאו מהתהליך</h3>
                    <span className="text-xs font-black text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{exitGroup.length}</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {exitGroup.map((lead) => <MyLeadCard key={lead.id} lead={lead} onUpdate={update} />)}
                  </div>
                </div>
              )}
              {pipelineGroups.length === 0 && exitGroup.length === 0 && filtered.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-3 w-3 rounded-full shrink-0 bg-violet-500" />
                    <h3 className="text-sm font-black text-slate-800">כל תיקי המשכנתא</h3>
                    <span className="text-xs font-black text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{filtered.length}</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((lead) => <MyLeadCard key={lead.id} lead={lead} onUpdate={update} />)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Flat list view */}
          {!loading && view === "list" && (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((lead) => <MyLeadCard key={lead.id} lead={lead} onUpdate={update} />)}
            </div>
          )}

        </div>
      </main>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 px-4 py-3 flex gap-2">
        <Link href="/advisor" className="flex-1 text-center text-xs font-black text-slate-600 bg-slate-100 rounded-xl py-2.5">ראשי</Link>
        <Link href="/advisor/my-leads" className="flex-1 text-center text-xs font-black text-violet-700 bg-violet-50 rounded-xl py-2.5">הלידים שלי</Link>
        <Link href="/advisor/leads" className="flex-1 text-center text-xs font-black text-slate-600 bg-slate-100 rounded-xl py-2.5">שוק</Link>
      </div>
    </>
  );
}

