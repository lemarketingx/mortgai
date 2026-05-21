import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatILS } from "../../lib/format";
import { KpiTile, Tag, Skeleton } from "../../components/ui";
import AdvisorHeader from "../../components/AdvisorHeader";
import { PIPELINE_STAGES, getPipelineStageLabel, isClosedPipelineStage, normalizePipelineStage } from "../../lib/pipeline";
import { isThisWeek } from "../../lib/mortgageCase";

const FUNNEL_STAGES = PIPELINE_STAGES.filter((stage) => stage !== "closed_lost");

const STAGE_COLORS = [
  "bg-violet-500", "bg-violet-400", "bg-indigo-400", "bg-amber-400",
  "bg-amber-500", "bg-sky-400", "bg-sky-500", "bg-blue-500",
  "bg-blue-400", "bg-emerald-400", "bg-emerald-500", "bg-green-500",
];
const STAGE_BG = [
  "bg-violet-50 text-violet-700 border-violet-200",
  "bg-violet-50 text-violet-700 border-violet-200",
  "bg-indigo-50 text-indigo-700 border-indigo-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-sky-50 text-sky-700 border-sky-200",
  "bg-sky-50 text-sky-700 border-sky-200",
  "bg-blue-50 text-blue-700 border-blue-200",
  "bg-blue-50 text-blue-700 border-blue-200",
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-green-50 text-green-800 border-green-200",
];

const TODAY_DATE = () => new Date(new Date().toDateString());
const DAY_MS = 864e5;

function diffDays(dateStr) {
  if (!dateStr) return null;
  const t = new Date(new Date(dateStr).toDateString());
  return Math.max(0, Math.floor((TODAY_DATE().getTime() - t.getTime()) / DAY_MS));
}
function isToday(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr).toDateString() === new Date().toDateString();
}
function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < TODAY_DATE();
}
function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

function stageIndex(lead) {
  const s = normalizePipelineStage(lead.pipelineStage || lead.leadStatus);
  const i = FUNNEL_STAGES.indexOf(s);
  return i >= 0 ? i : 0;
}
function isActive(lead) {
  return !isClosedPipelineStage(lead.pipelineStage || lead.leadStatus);
}
function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function buildAlerts(leads) {
  const alerts = [];
  const active = leads.filter(isActive);

  const noAction = active.filter((l) => !l.nextAction && !l.nextActionAt && !l.followUpDate && diffDays(l.lastActivityAt || l.createdAt) >= 2);
  if (noAction.length) alerts.push({ type: "warning", text: `${noAction.length} עסקאות ללא פעולה מוגדרת`, sub: "הגדר פעולה הבאה", leads: noAction });

  const overdueActions = active.filter((l) => (l.nextActionAt && isOverdue(l.nextActionAt)) || (l.followUpDate && isOverdue(l.followUpDate)));
  if (overdueActions.length) alerts.push({ type: "danger", text: `${overdueActions.length} פעולות באיחור`, sub: "טיפול דחוף", leads: overdueActions });

  const waitDocs = active.filter((l) => normalizePipelineStage(l.pipelineStage || l.leadStatus) === "waiting_documents");
  if (waitDocs.length) alerts.push({ type: "info", text: `${waitDocs.length} לקוחות מחכים למסמכים`, sub: "שלח תזכורת", leads: waitDocs });

  const todayActions = active.filter((l) => isToday(l.nextActionAt) || isToday(l.followUpDate));
  if (todayActions.length) alerts.push({ type: "success", text: `${todayActions.length} פעולות להיום`, sub: "לו״ז היום", leads: todayActions });

  return alerts;
}

function AlertCard({ alert }) {
  const [open, setOpen] = useState(false);
  const colors = {
    danger: "border-rose-300 bg-rose-50",
    warning: "border-amber-300 bg-amber-50",
    info: "border-sky-300 bg-sky-50",
    success: "border-emerald-300 bg-emerald-50",
  };
  const textColors = {
    danger: "text-rose-800",
    warning: "text-amber-800",
    info: "text-sky-800",
    success: "text-emerald-800",
  };
  const dots = {
    danger: "bg-rose-500",
    warning: "bg-amber-500",
    info: "bg-sky-500",
    success: "bg-emerald-500",
  };
  return (
    <div className={`border rounded-xl overflow-hidden ${colors[alert.type]}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-right"
      >
        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dots[alert.type]}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-black ${textColors[alert.type]}`}>{alert.text}</p>
          <p className={`text-xs font-bold opacity-70 ${textColors[alert.type]}`}>{alert.sub}</p>
        </div>
        <span className={`text-xs font-black ${textColors[alert.type]} opacity-50`}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-current border-opacity-10 divide-y divide-current divide-opacity-10">
          {alert.leads.slice(0, 5).map((l) => (
            <Link key={l.id} href={`/advisor/lead/${l.id}`} className={`flex items-center justify-between px-4 py-2 hover:bg-white/40 transition-colors ${textColors[alert.type]}`}>
              <span className="text-sm font-bold">{l.name || "—"}</span>
              <span className="text-xs opacity-70">{getPipelineStageLabel(l.pipelineStage || l.leadStatus)}</span>
            </Link>
          ))}
          {alert.leads.length > 5 && (
            <Link href="/advisor/my-leads" className={`block px-4 py-2 text-xs font-black text-center opacity-60 hover:opacity-100 ${textColors[alert.type]}`}>
              עוד {alert.leads.length - 5}...
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function PipelineFunnel({ leads }) {
  const counts = useMemo(() => {
    const map = {};
    FUNNEL_STAGES.forEach((s) => { map[s] = 0; });
    leads.forEach((l) => {
      const s = normalizePipelineStage(l.pipelineStage || l.leadStatus);
      if (map[s] !== undefined) map[s]++;
    });
    return FUNNEL_STAGES.map((s, i) => ({ stage: s, count: map[s], color: STAGE_COLORS[i], bg: STAGE_BG[i] }));
  }, [leads]);

  const max = Math.max(...counts.map((c) => c.count), 1);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <h2 className="text-sm font-black text-slate-950 mb-4">Pipeline — התפלגות עסקאות</h2>
      <div className="space-y-2">
        {counts.filter((c) => c.count > 0 || FUNNEL_STAGES.indexOf(c.stage) < 4).map(({ stage, count, color, bg }) => (
          <Link key={stage} href={`/advisor/my-leads?stage=${encodeURIComponent(stage)}`} className="flex items-center gap-3 group">
            <span className="text-xs font-bold text-slate-500 w-44 shrink-0 truncate text-right">{getPipelineStageLabel(stage)}</span>
            <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${color}`}
                style={{ width: count > 0 ? `${Math.max(6, (count / max) * 100)}%` : "0%" }}
              />
            </div>
            <span className="text-xs font-black tabular-nums text-slate-700 w-6 text-left shrink-0">{count}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function LeadRow({ lead }) {
  const si = stageIndex(lead);
  const stage = normalizePipelineStage(lead.pipelineStage || lead.leadStatus);
  const stageBg = STAGE_BG[si] || "bg-slate-50 text-slate-600 border-slate-200";
  const hasOverdue = (lead.nextActionAt && isOverdue(lead.nextActionAt)) || (lead.followUpDate && isOverdue(lead.followUpDate));
  const actionDue = lead.nextActionAt || lead.followUpDate;

  return (
    <Link href={`/advisor/lead/${lead.id}`} className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50/80 transition-colors rounded-xl border ${hasOverdue ? "border-rose-200 bg-rose-50/40" : "border-slate-100 bg-white"}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${stageBg}`}>{getPipelineStageLabel(stage)}</span>
          {hasOverdue && <span className="text-[11px] font-black text-rose-600">⚠ באיחור</span>}
        </div>
        <p className="text-sm font-black text-slate-900 truncate">{lead.name || "—"}</p>
        {lead.nextAction && <p className="text-xs text-slate-500 truncate mt-0.5">הבא: {lead.nextAction}</p>}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-black text-slate-700 tabular-nums">{formatILS(lead.mortgageAmount || 0)}</p>
        {actionDue && <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(actionDue)}</p>}
      </div>
    </Link>
  );
}

export default function AdvisorDashboard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [advisorName, setAdvisorName] = useState("");

  // Read advisor display name from localStorage (client-side only, safe from hydration)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("finzo_advisor_profile_v1");
      if (raw) {
        const p = JSON.parse(raw);
        if (p.name) setAdvisorName(p.name);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetch("/api/advisor/my-leads")
      .then((r) => {
        if (r.status === 401) { window.location.href = "/advisor/login"; return null; }
        return r.ok ? r.json() : { leads: [] };
      })
      .then((j) => { if (j) { setLeads(j.leads || []); setLoading(false); } })
      .catch(() => setLoading(false));
  }, []);

  const active = useMemo(() => leads.filter(isActive), [leads]);
  const closed = useMemo(() => leads.filter((l) => normalizePipelineStage(l.pipelineStage || l.leadStatus) === "closed_won"), [leads]);
  const closedThisMonth = useMemo(() => closed.filter((l) => isThisMonth(l.stageUpdatedAt || l.lastActivityAt)), [closed]);
  const overdueCount = useMemo(() => active.filter((l) =>
    (l.nextActionAt && isOverdue(l.nextActionAt)) || (l.followUpDate && isOverdue(l.followUpDate))
  ).length, [active]);
  const todayCount = useMemo(() => active.filter((l) => isToday(l.nextActionAt) || isToday(l.followUpDate)).length, [active]);
  const missingDocsCount = useMemo(() => active.filter((l) => Number(l.missingDocumentsCount || 0) > 0).length, [active]);
  const waitingAppraisalCount = useMemo(() => active.filter((l) => {
    const stage = normalizePipelineStage(l.pipelineStage || l.leadStatus);
    return (stage === "appraisal_ordered" || l.appraisalStatus === "ordered" || l.appraisalStatus === "visit_completed") && l.appraisalStatus !== "report_received";
  }).length, [active]);
  const waitingLawyerCount = useMemo(() => active.filter((l) => {
    const stage = normalizePipelineStage(l.pipelineStage || l.leadStatus);
    const hasLegalData = Boolean(l.buyerLawyerName || l.sellerLawyerName || l.legalContractReceived || l.legalRightsReceived || l.legalRegistrationReceived);
    const legalComplete = l.legalContractReceived && l.legalRightsReceived && l.legalRegistrationReceived;
    return stage === "lawyer_review" || (hasLegalData && !legalComplete);
  }).length, [active]);
  const signingsThisWeekCount = useMemo(() => active.filter((l) => isThisWeek(l.signingDate)).length, [active]);
  const fundsPendingCount = useMemo(() => active.filter((l) => l.fundsReleaseStatus !== "fully_released" && ["signed", "collateral_completion", "funds_released"].includes(normalizePipelineStage(l.pipelineStage || l.leadStatus))).length, [active]);
  const conversionRate = leads.length > 0 ? Math.round((closed.length / leads.length) * 100) : 0;
  const alerts = useMemo(() => buildAlerts(leads), [leads]);

  const urgentLeads = useMemo(() => active
    .filter((l) => (l.nextActionAt && isOverdue(l.nextActionAt)) || (l.followUpDate && isOverdue(l.followUpDate)) || isToday(l.nextActionAt) || isToday(l.followUpDate))
    .sort((a, b) => new Date(a.nextActionAt || a.followUpDate || 0) - new Date(b.nextActionAt || b.followUpDate || 0))
    .slice(0, 8),
  [active]);

  return (
    <>
      <Head><title>דשבורד | FINZO PRO</title><meta name="robots" content="noindex,nofollow" /></Head>
      <main dir="rtl" className="min-h-screen bg-slate-50 pb-24 md:pb-0">
        <AdvisorHeader active="/advisor" />
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-5">

          {/* Welcome bar */}
          <div className="flex items-center justify-between mb-4 gap-3">
            <p className="text-base font-black text-slate-800">
              {advisorName ? `שלום, ${advisorName} 👋` : "לוח בקרה"}
            </p>
            <div className="flex items-center gap-2">
              <Link href="/advisor/profile" className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors px-3 py-1.5 bg-white border border-slate-200 rounded-lg">
                פרופיל
              </Link>
              <Link href="/advisor/settings" className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors px-3 py-1.5 bg-white border border-slate-200 rounded-lg">
                ⚙ הגדרות
              </Link>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2">
                    <Skeleton variant="line" className="w-20" /><Skeleton variant="line" className="w-10 h-8" />
                  </div>
                ))
              : <>
                  <KpiTile label="עסקאות פעילות" value={active.length} />
                  <KpiTile label="נסגרו החודש" value={closedThisMonth.length} />
                  <KpiTile label="פעולות להיום" value={todayCount} />
                  <KpiTile label="המרה כוללת" value={`${conversionRate}%`} />
                </>}
          </div>

          {!loading && (
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 mb-6">
              {[
                ["מעקבים להיום", todayCount],
                ["מסמכים חסרים", missingDocsCount],
                ["מחכים לשמאות", waitingAppraisalCount],
                ["מחכים לעו״ד", waitingLawyerCount],
                ["חתימות השבוע", signingsThisWeekCount],
                ["כספים לשחרור", fundsPendingCount],
              ].map(([label, value]) => (
                <div key={label} className="bg-white border border-slate-100 rounded-xl px-3 py-3">
                  <p className="text-[11px] font-black text-slate-400 mb-1">{label}</p>
                  <p className="text-2xl font-black text-slate-900 tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Main grid */}
          <div className="grid lg:grid-cols-[1fr_380px] gap-4">

            {/* Left: Pipeline funnel */}
            <div className="space-y-4">
              {loading
                ? <div className="bg-white rounded-2xl border border-slate-100 h-64 animate-pulse" />
                : <PipelineFunnel leads={leads} />}

              {/* Urgent / today actions */}
              {!loading && urgentLeads.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                    <h2 className="text-sm font-black text-slate-950">פעולות דחופות ולהיום</h2>
                    <Link href="/advisor/my-leads" className="text-xs font-black text-violet-600 hover:underline">הכל →</Link>
                  </div>
                  <div className="divide-y divide-slate-50 p-2 space-y-1">
                    {urgentLeads.map((l) => <LeadRow key={l.id} lead={l} />)}
                  </div>
                </div>
              )}

              {!loading && urgentLeads.length === 0 && active.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-6 text-center">
                  <p className="text-2xl mb-2">✅</p>
                  <p className="text-sm font-black text-emerald-800">כל הפעולות מעודכנות — כל הכבוד!</p>
                </div>
              )}
            </div>

            {/* Right: Alerts + quick stats */}
            <div className="space-y-3">
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <h2 className="text-sm font-black text-slate-950 mb-3">סטטוס Pipeline</h2>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ["סה״כ נרכשו", leads.length],
                    ["פעילים", active.length],
                    ["נסגרו", closed.length],
                    ["באיחור", overdueCount],
                  ].map(([l, v]) => (
                    <div key={l} className="bg-slate-50 rounded-xl p-3">
                      <p className="text-slate-400 font-black mb-0.5">{l}</p>
                      <p className="text-2xl font-black text-slate-900 tabular-nums">{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {loading
                ? <div className="bg-white rounded-2xl border border-slate-100 h-48 animate-pulse" />
                : alerts.length > 0
                  ? <div className="space-y-2">
                      <p className="text-xs font-black text-slate-400 px-1">התראות</p>
                      {alerts.map((a, i) => <AlertCard key={i} alert={a} />)}
                    </div>
                  : <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-5 text-center">
                      <p className="text-sm font-black text-emerald-800">אין התראות פתוחות 🎉</p>
                    </div>}

              {/* Quick links */}
              <div className="grid grid-cols-2 gap-2">
                <Link href="/advisor/settings"
                  className="block text-center rounded-xl bg-slate-50 border border-slate-200 text-slate-600 font-black text-xs py-3 hover:bg-slate-100 transition-colors">
                  ⚙ הגדרות
                </Link>
                <Link href="/advisor/profile"
                  className="block text-center rounded-xl bg-slate-50 border border-slate-200 text-slate-600 font-black text-xs py-3 hover:bg-slate-100 transition-colors">
                  👤 פרופיל
                </Link>
              </div>

              <Link href="/advisor/leads" className="block w-full text-center rounded-2xl bg-violet-700 text-white font-black py-3.5 text-sm hover:bg-violet-800 transition-colors">
                לחנות הלידים ←
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 px-4 py-3 flex gap-2">
          <Link href="/advisor" className="flex-1 text-center text-xs font-black text-violet-700 bg-violet-50 rounded-xl py-2.5">ראשי</Link>
          <Link href="/advisor/my-leads" className="flex-1 text-center text-xs font-black text-slate-600 bg-slate-100 rounded-xl py-2.5">הלידים שלי</Link>
          <Link href="/advisor/leads" className="flex-1 text-center text-xs font-black text-slate-600 bg-slate-100 rounded-xl py-2.5">שוק</Link>
        </div>
      </main>
    </>
  );
}
