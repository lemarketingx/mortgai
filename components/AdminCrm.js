import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { formatILS } from "../lib/format";
import { computePricing } from "../lib/leadScoring";
import BrandLogo from "./BrandLogo";

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_STATUSES = ["חדש", "נשלח ליועץ", "בטיפול", "אושר עקרונית", "נסגר", "לא רלוונטי"];
const DEFAULT_COMMISSION_STATUSES = ["pending", "invoiced", "paid"];
const LEAD_QUALITIES = ["", "חם", "בינוני", "חלש", "לא סווג"];
const LEAD_PRIORITIES = ["", "גבוה", "רגיל", "נמוך"];
const FOLLOW_UP_STAGES = ["לא טופל", "ניסיון 1", "ניסיון 2", "נקבעה שיחה", "נשלחו מסמכים", "ממתין ללקוח", "נסגר"];

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

const PURCHASE_STATUS_COLORS = {
  new_purchase:       "bg-sky-50 text-sky-700 border-sky-200",
  first_apartment:    "bg-violet-50 text-violet-700 border-violet-200",
  upgrader:           "bg-indigo-50 text-indigo-700 border-indigo-200",
  investment:         "bg-amber-50 text-amber-700 border-amber-200",
  refinance:          "bg-blue-50 text-blue-700 border-blue-200",
  bank_declined:      "bg-rose-50 text-rose-700 border-rose-200",
  bdi_credit_issue:   "bg-orange-50 text-orange-700 border-orange-200",
  senior_60plus:      "bg-teal-50 text-teal-700 border-teal-200",
  debt_consolidation: "bg-purple-50 text-purple-700 border-purple-200",
  general:            "bg-slate-50 text-slate-600 border-slate-200",
};

function FinzoScorePanel({ lead }) {
  const pricing = computePricing({
    hasName:              Boolean(lead.name),
    hasPhone:             Boolean(lead.phone),
    city:                 lead.city,
    mortgageAmount:       lead.mortgageAmount || lead.mortgage_amount,
    monthlyIncome:        lead.monthlyIncome  || lead.monthly_income,
    equityAmount:         lead.equityAmount   || lead.equity_amount,
    debtLevel:            lead.debtLevel      || lead.debt_level,
    purchaseStatus:       lead.purchaseStatus || lead.purchase_status,
    requestedContactTime: lead.requestedContactTime || lead.requested_contact_time,
    hasExistingMortgage:  lead.hasExistingMortgage  || lead.has_existing_mortgage,
    createdAt:            lead.createdAt || lead.created_at,
    purchaseCount:        0,
  });
  const scoreColor = pricing.finzoScore >= 70 ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : pricing.finzoScore >= 50 ? "text-amber-700 bg-amber-50 border-amber-200"
    : "text-slate-600 bg-slate-50 border-slate-200";
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${scoreColor}`}>
          FINZO {pricing.finzoScore}/100 · {pricing.quality}
        </span>
        <span className="text-[10px] font-bold text-slate-500">
          מחיר רגיל: <strong className="text-slate-800">{formatILS(pricing.regularPrice)}</strong>
          {" · "}
          בלעדי: <strong className="text-slate-800">{formatILS(pricing.exclusivePrice)}</strong>
        </span>
      </div>
    </div>
  );
}

function PurchaseStatusBadge({ value }) {
  if (!value) return null;
  const label = PURCHASE_STATUS_LABELS[value] || value;
  const color = PURCHASE_STATUS_COLORS[value] || "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex text-[10px] font-black px-1.5 py-0.5 rounded-full border whitespace-nowrap ${color}`}>
      {label}
    </span>
  );
}

const PIPELINE_STAGE_LABELS = {
  new_lead: "ליד חדש", contacted: "נוצר קשר", documents_requested: "נשלחה רשימת מסמכים",
  waiting_documents: "מחכה למסמכים", documents_received: "מסמכים התקבלו",
  eligibility_review: "בדיקת זכאות", appraisal_ordered: "הוזמנה שמאות",
  appraisal_completed: "שמאות התקבלה", lawyer_review: "בדיקת עו״ד",
  submitted_to_bank: "הוגש לבנק", principle_approval: "אישור עקרוני",
  bank_negotiation: 'מו"מ מול בנקים', selected_track: "נבחר תמהיל",
  signing_scheduled: "נקבעו חתימות", signed: "נחתם",
  collateral_completion: "השלמת בטחונות", funds_released: "כספים שוחררו",
  closed_won: "נסגר בהצלחה", closed_lost: "נסגר כהפסד",
};

const PIPELINE_PROGRESS = {
  new_lead: 5, contacted: 10, documents_requested: 16, waiting_documents: 22,
  documents_received: 29, eligibility_review: 35, appraisal_ordered: 42,
  appraisal_completed: 48, lawyer_review: 54, submitted_to_bank: 60,
  principle_approval: 66, bank_negotiation: 72, selected_track: 78,
  signing_scheduled: 84, signed: 90, collateral_completion: 93,
  funds_released: 96, closed_won: 100, closed_lost: 0,
};

const COMMISSION_STATUS_LABELS = { pending: "ממתין", invoiced: "חויב", paid: "שולם" };

const NAV_SECTIONS = [
  { id: "dashboard", label: "דשבורד", icon: "⬡" },
  { id: "new_leads", label: "לידים חדשים", icon: "⊕" },
  { id: "all_leads", label: "כל הלידים", icon: "≡" },
  { id: "marketplace", label: "חנות לידים", icon: "◈" },
  { id: "cases", label: "תיקי משכנתא", icon: "◇" },
  { id: "advisors", label: "יועצים", icon: "○" },
  { id: "revenue", label: "הכנסות ועמלות", icon: "₪" },
];

// ── Error messages ────────────────────────────────────────────────────────────

function getAdminErrorMessage(code, fallback = "") {
  const messages = {
    ADMIN_AUTH_REQUIRED: "החיבור לאדמין פג או לא קיים. יש להתחבר מחדש.",
    ADMIN_AUTH_NOT_CONFIGURED: "חסר ADMIN_SESSION_SECRET ב־Vercel.",
    SUPABASE_ENV_MISSING: "חסרים משתני Supabase ב־Vercel: SUPABASE_URL או SUPABASE_SERVICE_KEY.",
    SUPABASE_URL_INVALID: "כתובת Supabase לא תקינה.",
    SUPABASE_READ_FAILED: "שגיאת קריאה מ־Supabase. בדוק שהטבלה leads קיימת.",
    SUPABASE_UPDATE_FAILED: "שגיאת עדכון ב־Supabase.",
    LEADS_READ_FAILED: "לא ניתן לטעון את הלידים כרגע.",
    LEAD_UPDATE_FAILED: "לא ניתן לעדכן את הליד כרגע.",
    LEAD_NOT_FOUND: "הליד לא נמצא במסד הנתונים.",
    LEAD_DELETE_FAILED: "לא ניתן למחוק את הליד כרגע.",
    ADVISOR_CREATE_FAILED: "לא ניתן ליצור יועץ כרגע.",
    ADVISOR_ID_EXISTS: "מזהה היועץ כבר קיים.",
    METHOD_NOT_ALLOWED: "פעולה לא נתמכת.",
  };
  return messages[code] || fallback || "אירעה שגיאה לא צפויה.";
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

function formatDateShort(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(d);
}

function normalizeSearch(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function advisorName(a) { return a?.name || a?.advisor_name || a?.advisorId || a?.advisor_id || ""; }
function advisorId(a)   { return a?.advisor_id || a?.advisorId || advisorName(a); }
function advisorPhone(a){ return a?.phone || a?.advisor_phone || ""; }
function advisorEmail(a){ return a?.email || a?.advisor_email || ""; }

function pipelineLabel(stage) { return PIPELINE_STAGE_LABELS[stage] || stage || "—"; }
function pipelineProgress(stage) { return PIPELINE_PROGRESS[stage] ?? 5; }

function qualityColor(q) {
  if (q === "חם") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (q === "בינוני") return "text-amber-700 bg-amber-50 border-amber-200";
  if (q === "חלש") return "text-red-700 bg-red-50 border-red-200";
  return "text-slate-600 bg-slate-50 border-slate-200";
}

function qualityDot(q) {
  if (q === "חם") return "bg-emerald-500";
  if (q === "בינוני") return "bg-amber-400";
  if (q === "חלש") return "bg-red-400";
  return "bg-slate-300";
}

function statusColor(s) {
  const st = s || "חדש";
  if (st === "חדש") return "text-blue-700 bg-blue-50 border-blue-200";
  if (st === "נשלח ליועץ") return "text-violet-700 bg-violet-50 border-violet-200";
  if (st === "בטיפול") return "text-amber-700 bg-amber-50 border-amber-200";
  if (st === "אושר עקרונית") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (st === "נסגר") return "text-green-900 bg-green-100 border-green-300";
  if (st === "לא רלוונטי") return "text-slate-500 bg-slate-100 border-slate-200";
  return "text-slate-600 bg-slate-50 border-slate-200";
}

// ── Small UI primitives ───────────────────────────────────────────────────────

function Pill({ children, color = "" }) {
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-black ${color}`}>{children}</span>;
}

function Field({ label, children }) {
  return <label className="block"><span className="mb-1 block text-xs font-black text-mort-muted">{label}</span>{children}</label>;
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <Field label={label}>
      <input
        type={type} value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || label}
        className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-mort-ink focus:border-finzo-cobalt focus:outline-none focus:ring-1 focus:ring-finzo-cobalt/30"
      />
    </Field>
  );
}

function Select({ label, value, onChange, options, allowEmpty = false }) {
  return (
    <Field label={label}>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-mort-ink focus:border-finzo-cobalt focus:outline-none"
      >
        {allowEmpty && <option value="">הכל</option>}
        {options.map((o) => <option key={o} value={o}>{o || "הכל"}</option>)}
      </select>
    </Field>
  );
}

function KpiCard({ label, value, sub, color = "default" }) {
  const colors = {
    default: "bg-white border-finzo-line",
    blue:    "bg-finzo-cobalt-l/50 border-finzo-cobalt/30",
    green:   "bg-emerald-50 border-emerald-200",
    amber:   "bg-amber-50 border-amber-200",
    red:     "bg-red-50 border-red-200",
  };
  return (
    <div className={`rounded-2xl border p-4 shadow-e-1 ${colors[color] || colors.default}`}>
      <span className="block text-xs font-bold text-mort-muted">{label}</span>
      <strong className="mt-1 block font-number text-2xl font-black text-mort-ink leading-none">{value}</strong>
      {sub && <span className="mt-1 block text-xs font-bold text-mort-muted">{sub}</span>}
    </div>
  );
}

function ProgressBar({ pct, color = "bg-finzo-cobalt" }) {
  const safe = Math.max(0, Math.min(100, pct || 0));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${safe}%` }} />
    </div>
  );
}

function BarChart({ label, value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-bold text-mort-muted">
        <span>{label}</span><span>{value} · {pct}%</span>
      </div>
      <ProgressBar pct={pct} />
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
      <span className="block text-xs font-bold text-mort-muted">{label}</span>
      <strong className="mt-0.5 block break-words text-sm font-black text-mort-ink">{value || "—"}</strong>
    </div>
  );
}

function SectionHead({ title, count }) {
  return (
    <div className="flex items-baseline gap-2">
      <h2 className="text-sm font-black text-mort-ink">{title}</h2>
      {count != null && <span className="text-xs font-bold text-mort-muted">({count})</span>}
    </div>
  );
}

function Empty({ icon = "○", title, sub, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-finzo-line bg-white py-14 text-center shadow-e-1 px-6">
      <span className="text-4xl text-slate-300">{icon}</span>
      <h3 className="mt-3 text-base font-black text-mort-ink">{title}</h3>
      {sub && <p className="mt-1 max-w-sm text-sm font-bold text-mort-muted">{sub}</p>}
      {action}
    </div>
  );
}

function TableWrap({ children }) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-finzo-line bg-white shadow-e-1 lg:block">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

function Th({ children, right = true }) {
  return <th className={`border-b border-finzo-line bg-finzo-paper py-3 px-3 text-xs font-black uppercase tracking-wide text-mort-muted ${right ? "text-right" : "text-center"}`}>{children}</th>;
}

function Td({ children, className = "" }) {
  return <td className={`border-b border-finzo-line py-3 px-3 ${className}`}>{children}</td>;
}

// ── Lead editing panel (inline) ───────────────────────────────────────────────

function LeadEditPanel({ lead, statuses, commissionStatuses, onPatch }) {
  const leadStatus = lead.leadStatus || lead.status || "חדש";
  const quality = lead.leadQuality || "לא סווג";
  return (
    <div className="grid gap-4 p-4 lg:p-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Detail label="טלפון" value={lead.phone} />
        <Detail label="עיר" value={lead.city} />
        <Detail label="עיר הנכס" value={lead.propertyCity} />
        <Detail label="משכנתא" value={lead.mortgageAmount ? formatILS(toNumber(lead.mortgageAmount)) : null} />
        <Detail label="מחיר נכס" value={lead.propertyPrice ? formatILS(toNumber(lead.propertyPrice)) : null} />
        <Detail label="הון עצמי" value={lead.equityAmount ? formatILS(toNumber(lead.equityAmount)) : null} />
        <Detail label="הכנסה חודשית" value={lead.monthlyIncome ? formatILS(toNumber(lead.monthlyIncome)) : null} />
        <Detail label="סיכוי אישור" value={(lead.approvalScore || lead.estimatedApprovalResult) ? `${lead.approvalScore || lead.estimatedApprovalResult}%` : null} />
        <Detail label="סטטוס חוזה" value={lead.contractStatus} />
        {lead.purchaseStatus && (
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
            <span className="block text-xs font-bold text-mort-muted">סוג תיק</span>
            <div className="mt-1.5"><PurchaseStatusBadge value={lead.purchaseStatus} /></div>
            <FinzoScorePanel lead={lead} />
          </div>
        )}
        <Detail label="מועד חזרה" value={lead.requestedContactTime} />
        <Detail label="מקור" value={[lead.source, lead.utmSource, lead.utmCampaign].filter(Boolean).join(" · ") || null} />
        <Detail label="שלב ב-pipeline" value={pipelineLabel(lead.pipelineStage)} />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Select label="סטטוס" value={leadStatus} options={statuses} onChange={(v) => onPatch(lead.id, { leadStatus: v, status: v })} />
        <Select label="איכות ליד" value={quality} options={LEAD_QUALITIES.filter(Boolean)} onChange={(v) => onPatch(lead.id, { leadQuality: v })} />
        <Select label="עדיפות" value={lead.leadPriority || "רגיל"} options={LEAD_PRIORITIES.filter(Boolean)} onChange={(v) => onPatch(lead.id, { leadPriority: v })} />
        <Select label="שלב מעקב" value={lead.followUpStage || "לא טופל"} options={FOLLOW_UP_STAGES} onChange={(v) => onPatch(lead.id, { followUpStage: v })} />
        <Input label="תאריך מעקב" type="date" value={lead.followUpDate} onChange={(v) => onPatch(lead.id, { followUpDate: v })} />
        <Input label="שם יועץ" value={lead.assignedAdvisor} onChange={(v) => onPatch(lead.id, { assignedAdvisor: v })} />
        <Input label="טלפון יועץ" value={lead.advisorPhone} onChange={(v) => onPatch(lead.id, { advisorPhone: v })} />
        <Input label="עמלה" value={lead.expectedCommission || lead.commissionAmount} onChange={(v) => onPatch(lead.id, { expectedCommission: v, commissionAmount: v })} />
        <Select label="סטטוס עמלה" value={lead.commissionStatus || "pending"} options={commissionStatuses} onChange={(v) => onPatch(lead.id, { commissionStatus: v })} />
      </div>
      <textarea
        className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-mort-ink focus:border-finzo-cobalt focus:outline-none"
        defaultValue={lead.internalNotes || ""}
        onBlur={(e) => { if (e.target.value !== (lead.internalNotes || "")) onPatch(lead.id, { internalNotes: e.target.value }); }}
        placeholder="הערות פנימיות לצוות"
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminCrm() {
  // ── State (all original variables preserved) ─────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [leads, setLeads] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [statuses, setStatuses] = useState(DEFAULT_STATUSES);
  const [commissionStatuses, setCommissionStatuses] = useState(DEFAULT_COMMISSION_STATUSES);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [qualityFilter, setQualityFilter] = useState("");
  const [advisorFilter, setAdvisorFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAdvisorId, setBulkAdvisorId] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [newAdvisor, setNewAdvisor] = useState({ advisorId: "", name: "", phone: "", email: "", commissionType: "lead", commissionAmount: "" });

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState("dashboard");
  const [expandedLeadId, setExpandedLeadId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Create lead modal state ───────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");
  const EMPTY_CREATE_FORM = {
    name: "", phone: "", city: "", propertyCity: "",
    purchaseStatus: "", mortgageAmount: "", equityAmount: "",
    monthlyIncome: "", debtLevel: "", hasExistingMortgage: "",
    requestedContactTime: "", source: "phone", publishToStore: false,
  };
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);

  // ── Computed: stats ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = leads.length;
    const hot = leads.filter((l) => l.leadQuality === "חם").length;
    const medium = leads.filter((l) => l.leadQuality === "בינוני").length;
    const weak = leads.filter((l) => l.leadQuality === "חלש").length;
    const open = leads.filter((l) => !["נסגר", "לא רלוונטי", "closed_won", "closed_lost"].includes(l.leadStatus || l.status || "חדש")).length;
    const closed = leads.filter((l) => ["נסגר", "closed_won"].includes(l.leadStatus || l.status)).length;
    const assigned = leads.filter((l) => l.assignedAdvisor || l.assignedAdvisorId).length;
    const unassigned = total - assigned;
    const today = new Date().toDateString();
    const todayCount = leads.filter((l) => l.createdAt && new Date(l.createdAt).toDateString() === today).length;
    const closeRate = total > 0 ? Math.round((closed / total) * 100) : 0;
    const newLeadsCount = leads.filter((l) => ["חדש", "new_lead", "contacted"].includes(l.leadStatus || l.status || "חדש")).length;
    return { total, hot, medium, weak, open, closed, assigned, unassigned, todayCount, closeRate, newLeadsCount };
  }, [leads]);

  const advisorStats = useMemo(() => advisors.map((a) => {
    const id = advisorId(a);
    const name = advisorName(a);
    const assignedLeads = leads.filter((l) => l.assignedAdvisorId === id || l.assignedAdvisor === name);
    const count = assignedLeads.length;
    const closedCount = assignedLeads.filter((l) => ["נסגר", "closed_won"].includes(l.leadStatus || l.status)).length;
    const openCount = assignedLeads.filter((l) => !["נסגר", "closed_lost", "לא רלוונטי"].includes(l.leadStatus || l.status)).length;
    return { id, name, count, closedCount, openCount };
  }).filter((i) => i.name), [advisors, leads]);

  const revenueStats = useMemo(() => {
    const soldLeads = leads.filter((l) => l.soldAt || l.buyerAdvisorId);
    const potentialStore = leads.reduce((s, l) => s + toNumber(l.storePrice), 0);
    const potentialExclusive = leads.reduce((s, l) => s + toNumber(l.exclusivePrice), 0);
    const actualCommissions = leads.reduce((s, l) => s + toNumber(l.actualCommission || l.commissionAmount), 0);
    const expectedCommissions = leads.reduce((s, l) => s + toNumber(l.expectedCommission), 0);
    const paidCommissions = leads.filter((l) => l.commissionStatus === "paid").reduce((s, l) => s + toNumber(l.actualCommission || l.commissionAmount), 0);
    const pendingCommissions = leads.filter((l) => l.commissionStatus === "pending").length;
    const invoicedCommissions = leads.filter((l) => l.commissionStatus === "invoiced").length;
    const paidCount = leads.filter((l) => l.commissionStatus === "paid").length;
    return { soldCount: soldLeads.length, potentialStore, potentialExclusive, actualCommissions, expectedCommissions, paidCommissions, pendingCommissions, invoicedCommissions, paidCount };
  }, [leads]);

  // ── Computed: section-scoped leads ────────────────────────────────────────
  const newLeads = useMemo(() =>
    leads.filter((l) => {
      const st = l.leadStatus || l.status || "חדש";
      return !l.assignedAdvisor && !l.assignedAdvisorId || ["חדש", "new_lead"].includes(st);
    }), [leads]);

  const marketplaceLeads = useMemo(() =>
    leads.filter((l) => l.storeStatus && l.storeStatus !== "pending_review" || toNumber(l.storePrice) > 0 || toNumber(l.exclusivePrice) > 0 || l.soldAt || l.buyerAdvisorId),
    [leads]);

  const caseLeads = useMemo(() =>
    leads.filter((l) => l.pipelineStage && l.pipelineStage !== "new_lead" && l.pipelineStage !== "contacted"),
    [leads]);

  // ── Computed: filtered leads for search sections ──────────────────────────
  const sectionBase = useMemo(() => {
    if (activeSection === "new_leads") return newLeads;
    if (activeSection === "marketplace") return marketplaceLeads;
    if (activeSection === "cases") return caseLeads;
    return leads;
  }, [activeSection, leads, newLeads, marketplaceLeads, caseLeads]);

  const filteredLeads = useMemo(() => {
    const term = normalizeSearch(query);
    return sectionBase.filter((l) => {
      const leadStatus = l.leadStatus || l.status || "חדש";
      const quality = l.leadQuality || "לא סווג";
      const priority = l.leadPriority || "רגיל";
      const leadAdvisorId = l.assignedAdvisorId || l.assignedAdvisor || "";
      const searchable = normalizeSearch([l.name, l.phone, l.city, l.propertyCity, l.source, l.utmSource, l.utmCampaign, l.assignedAdvisor].join(" "));
      return (!statusFilter || leadStatus === statusFilter)
        && (!qualityFilter || quality === qualityFilter)
        && (!priorityFilter || priority === priorityFilter)
        && (!advisorFilter || leadAdvisorId === advisorFilter || l.assignedAdvisor === advisorFilter)
        && (!term || searchable.includes(term));
    });
  }, [sectionBase, query, statusFilter, qualityFilter, priorityFilter, advisorFilter]);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => { loadLeads({ silent: true }); }, []);

  // ── API actions (all original logic preserved) ────────────────────────────
  function showMessage(text, type = "info") { setMessage(text || ""); setMessageType(type); }

  async function loadLeads({ silent = false } = {}) {
    if (!silent) showMessage("", "info");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/leads", { method: "GET" });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) { setIsAuthenticated(false); if (!silent) showMessage("יש להתחבר מחדש.", "error"); return; }
      if (!res.ok) throw new Error(getAdminErrorMessage(json.error, json.message));
      setLeads(Array.isArray(json.leads) ? json.leads : []);
      setAdvisors(Array.isArray(json.advisors) ? json.advisors : []);
      setStatuses(Array.isArray(json.statuses) && json.statuses.length ? json.statuses : DEFAULT_STATUSES);
      setCommissionStatuses(Array.isArray(json.commissionStatuses) && json.commissionStatuses.length ? json.commissionStatuses : DEFAULT_COMMISSION_STATUSES);
      setIsAuthenticated(true);
      if (!silent) showMessage("הלידים נטענו בהצלחה.", "success");
    } catch (err) {
      showMessage(err.message || "לא ניתן לטעון את ה־CRM.", "error");
    } finally { setLoading(false); }
  }

  async function login(e) {
    e.preventDefault();
    showMessage("", "info");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(getAdminErrorMessage(json.error, json.message || "סיסמה שגויה."));
      setPassword("");
      await loadLeads();
    } catch (err) { setIsAuthenticated(false); showMessage(err.message || "שגיאת התחברות", "error"); }
    finally { setLoading(false); }
  }

  async function patchLead(id, changes) {
    setSavingId(id);
    showMessage("", "info");
    try {
      const res = await fetch("/api/admin/leads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, changes }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(getAdminErrorMessage(json.error, json.message));
      if (json.lead) setLeads((cur) => cur.map((l) => (l.id === id ? json.lead : l)));
      showMessage("הליד עודכן.", "success");
    } catch (err) { showMessage(err.message || "העדכון נכשל.", "error"); }
    finally { setSavingId(""); }
  }

  async function bulkPatch(changes) {
    if (!selectedIds.length) { showMessage("בחר לפחות ליד אחד.", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/leads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selectedIds, changes }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(getAdminErrorMessage(json.error, json.message));
      showMessage(`עודכנו ${json.updated || selectedIds.length} לידים.${json.failed ? ` נכשלו ${json.failed}.` : ""}`, "success");
      setSelectedIds([]);
      await loadLeads({ silent: true });
    } catch (err) { showMessage(err.message || "עדכון מרוכז נכשל.", "error"); }
    finally { setLoading(false); }
  }

  async function bulkAssignAdvisor() {
    const a = advisors.find((i) => advisorId(i) === bulkAdvisorId);
    if (!a) { showMessage("בחר יועץ לשיוך.", "error"); return; }
    await bulkPatch({ assignedAdvisorId: advisorId(a), assignedAdvisor: advisorName(a), advisorPhone: advisorPhone(a), advisorEmail: advisorEmail(a), leadStatus: "נשלח ליועץ", status: "נשלח ליועץ" });
    setBulkAdvisorId("");
  }

  async function deleteSingleLead(id) {
    if (!window.confirm("האם למחוק את הליד לצמיתות?")) return;
    setSavingId(id);
    showMessage("", "info");
    try {
      const res = await fetch("/api/admin/leads", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(getAdminErrorMessage(json.error, json.message));
      setLeads((cur) => cur.filter((l) => l.id !== id));
      setSelectedIds((cur) => cur.filter((i) => i !== id));
      showMessage("הליד נמחק.", "success");
    } catch (err) { showMessage(err.message || "מחיקה נכשלה.", "error"); }
    finally { setSavingId(""); }
  }

  async function bulkDeleteLeads() {
    if (!selectedIds.length) { showMessage("בחר לפחות ליד אחד.", "error"); return; }
    if (!window.confirm("האם למחוק את הלידים לצמיתות?")) return;
    setLoading(true);
    showMessage("", "info");
    try {
      const res = await fetch("/api/admin/leads", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selectedIds }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(getAdminErrorMessage(json.error, json.message));
      const set = new Set(selectedIds);
      setLeads((cur) => cur.filter((l) => !set.has(l.id)));
      setSelectedIds([]);
      showMessage(`נמחקו ${json.deleted || 0} לידים.${json.failed ? ` נכשלו ${json.failed}.` : ""}`, "success");
    } catch (err) { showMessage(err.message || "מחיקה מרוכזת נכשלה.", "error"); }
    finally { setLoading(false); }
  }

  async function createAdvisor(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...newAdvisor, advisorId: newAdvisor.advisorId || newAdvisor.phone || newAdvisor.name };
      const res = await fetch("/api/admin/advisors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(getAdminErrorMessage(json.error, json.message));
      setNewAdvisor({ advisorId: "", name: "", phone: "", email: "", commissionType: "lead", commissionAmount: "" });
      showMessage("יועץ נוסף בהצלחה.", "success");
      await loadLeads({ silent: true });
    } catch (err) { showMessage(err.message || "יצירת יועץ נכשלה.", "error"); }
    finally { setLoading(false); }
  }

  async function createLeadHandler(e) {
    e.preventDefault();
    setCreateError("");
    if (!createForm.name.trim()) { setCreateError("שם הלקוח הוא שדה חובה."); return; }
    if (!createForm.phone.trim()) { setCreateError("מספר טלפון הוא שדה חובה."); return; }
    if (!createForm.purchaseStatus) { setCreateError("יש לבחור סוג תיק."); return; }
    setCreateSaving(true);
    try {
      const res = await fetch("/api/admin/create-lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...createForm, publishToStore: createForm.publishToStore }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "יצירת הליד נכשלה.");
      setLeads((cur) => [json.lead, ...cur]);
      setShowCreateModal(false);
      setCreateForm(EMPTY_CREATE_FORM);
      showMessage("הליד נוצר בהצלחה.", "success");
    } catch (err) { setCreateError(err.message || "יצירת הליד נכשלה."); }
    finally { setCreateSaving(false); }
  }

  function toggleSelected(id) { setSelectedIds((cur) => cur.includes(id) ? cur.filter((i) => i !== id) : [...cur, id]); }
  function toggleSelectAll() { setSelectedIds((cur) => cur.length === filteredLeads.length ? [] : filteredLeads.map((l) => l.id)); }
  function clearFilters() { setQuery(""); setStatusFilter(""); setQualityFilter(""); setPriorityFilter(""); setAdvisorFilter(""); }
  const hasFilters = query || statusFilter || qualityFilter || priorityFilter || advisorFilter;

  const msgClass = messageType === "error"
    ? "border-red-200 bg-red-50 text-red-800"
    : messageType === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-blue-200 bg-blue-50 text-blue-800";

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-finzo-paper px-4 py-12">
        <Head><title>FINZO Back Office</title><meta name="robots" content="noindex,nofollow" /></Head>
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center"><BrandLogo size="sm" withTagline={false} /></div>
            <h1 className="mt-4 text-3xl font-black text-finzo-ink">Back Office</h1>
            <p className="mt-1.5 text-sm font-bold text-mort-muted">מערכת ניהול — גישה מורשית בלבד</p>
          </div>
          <div className="rounded-3xl border border-finzo-line bg-white p-7 shadow-e-3">
            <form className="grid gap-4" onSubmit={login}>
              <div>
                <label className="mb-1.5 block text-xs font-black text-mort-muted">סיסמת כניסה</label>
                <input
                  className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-mort-ink focus:border-finzo-cobalt focus:bg-white focus:outline-none focus:ring-2 focus:ring-finzo-cobalt/20"
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="הזן סיסמה" autoComplete="current-password"
                />
              </div>
              <button disabled={loading} className="min-h-12 rounded-2xl bg-finzo-ink px-5 py-3 font-black text-white disabled:opacity-60" type="submit">
                {loading ? "מתחבר..." : "כניסה למערכת"}
              </button>
            </form>
            {message && <div className={`mt-4 rounded-2xl border p-3 text-sm font-bold ${msgClass}`}>{message}</div>}
          </div>
        </div>
      </main>
    );
  }

  // ── Authenticated shell ───────────────────────────────────────────────────

  const navBadge = (id) => {
    if (id === "new_leads") return newLeads.length > 0 ? newLeads.length : null;
    if (id === "cases") return caseLeads.length > 0 ? caseLeads.length : null;
    return null;
  };

  return (
    <div dir="rtl" className="flex min-h-screen bg-finzo-paper text-mort-text">
      <Head><title>FINZO Back Office</title><meta name="robots" content="noindex,nofollow" /></Head>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 right-0 z-30 flex w-56 flex-col border-l border-finzo-line bg-white shadow-e-3 transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 lg:shadow-none ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}>
        <div className="border-b border-finzo-line px-5 py-4">
          <BrandLogo size="sm" withTagline={false} />
          <span className="mt-1.5 block text-sm font-black text-finzo-ink">Back Office</span>
          <span className="mt-0.5 block text-xs font-bold text-mort-muted">מערכת ניהול עסקי</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <p className="mb-2 px-3 text-xs font-black uppercase tracking-widest text-mort-muted">תפריט</p>
          <ul className="grid gap-0.5">
            {NAV_SECTIONS.map((s) => {
              const badge = navBadge(s.id);
              const active = activeSection === s.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => { setActiveSection(s.id); setSidebarOpen(false); setSelectedIds([]); }}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-black transition-colors ${active ? "bg-finzo-cobalt text-white" : "text-mort-text hover:bg-finzo-paper"}`}
                  >
                    <span className="w-4 shrink-0 text-center text-sm leading-none">{s.icon}</span>
                    <span className="flex-1 text-right">{s.label}</span>
                    {badge != null && (
                      <span className={`rounded-full px-1.5 py-0.5 text-xs font-black ${active ? "bg-white/30 text-white" : "bg-finzo-cobalt-l text-finzo-cobalt"}`}>{badge}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-finzo-line px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-bold text-mort-muted">מחובר · מערכת פעילה</span>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Top header */}
        <header className="sticky top-0 z-10 border-b border-finzo-line bg-white/95 backdrop-blur-sm">
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <button type="button" className="rounded-lg border border-finzo-line p-1.5 text-mort-muted lg:hidden" onClick={() => setSidebarOpen(true)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 3h14M1 8h14M1 13h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
              <div>
                <h1 className="text-sm font-black text-finzo-ink leading-tight">{NAV_SECTIONS.find((s) => s.id === activeSection)?.label || "Back Office"}</h1>
                <p className="text-xs font-bold text-mort-muted">FINZO · מערכת ניהול לידים, יועצים ומכירות</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-1.5 rounded-full border border-finzo-line bg-finzo-paper px-3 py-1 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs font-bold text-mort-muted">{leads.length} לידים</span>
              </div>
              <button onClick={() => { setShowCreateModal(true); setCreateError(""); }} className="rounded-xl bg-finzo-cobalt px-4 py-1.5 text-sm font-black text-white shadow-e-1 hover:bg-finzo-cobalt/90" type="button">
                ➕ הוסף ליד
              </button>
              <button disabled={loading} onClick={() => loadLeads()} className="rounded-xl border border-finzo-line bg-white px-4 py-1.5 text-sm font-black text-mort-ink shadow-e-1 hover:bg-finzo-paper disabled:opacity-60" type="button">
                {loading ? "טוען..." : "רענון"}
              </button>
            </div>
          </div>
        </header>

        {/* Message banner */}
        {message && (
          <div className={`mx-4 mt-3 rounded-xl border px-4 py-2.5 text-sm font-bold ${msgClass}`}>{message}</div>
        )}

        {/* ── Section content ── */}
        <main className="flex-1 p-4 lg:p-5">

          {/* ════════════════════════════════════════════════════
              DASHBOARD
          ════════════════════════════════════════════════════ */}
          {activeSection === "dashboard" && (
            <div className="grid gap-5">
              {/* KPI row */}
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-widest text-mort-muted">מדדים עסקיים</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <KpiCard label="סה״כ לידים" value={stats.total} />
                  <KpiCard label="לידים חדשים היום" value={stats.todayCount} color="blue" sub="24 שעות אחרונות" />
                  <KpiCard label="לידים לא משויכים" value={stats.unassigned} color={stats.unassigned > 0 ? "amber" : "default"} />
                  <KpiCard label="לידים חמים" value={stats.hot} color="green" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard label="בטיפול / פתוחים" value={stats.open} />
                <KpiCard label="נסגרו בהצלחה" value={stats.closed} color="green" />
                <KpiCard label="משויכים ליועץ" value={stats.assigned} color="blue" />
                <KpiCard label="יחס סגירה" value={`${stats.closeRate}%`} sub={`${stats.closed} מתוך ${stats.total}`} />
              </div>

              {/* Pipeline breakdown + advisor + quality */}
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-finzo-line bg-white p-5 shadow-e-1">
                  <SectionHead title="בקרת איכות לידים" />
                  <div className="mt-4 grid gap-3">
                    <BarChart label="חם" value={stats.hot} total={stats.total} />
                    <BarChart label="בינוני" value={stats.medium} total={stats.total} />
                    <BarChart label="חלש" value={stats.weak} total={stats.total} />
                  </div>
                </div>
                <div className="rounded-2xl border border-finzo-line bg-white p-5 shadow-e-1">
                  <SectionHead title="שיוך ליועצים" />
                  <div className="mt-4 grid gap-3">
                    {advisorStats.length
                      ? advisorStats.map((a) => <BarChart key={a.id} label={a.name} value={a.count} total={stats.total} />)
                      : <p className="text-sm font-bold text-mort-muted">עדיין אין יועצים.</p>}
                  </div>
                </div>
                <div className="rounded-2xl border border-finzo-line bg-white p-5 shadow-e-1">
                  <SectionHead title="מצב Pipeline" />
                  <div className="mt-4 grid gap-3">
                    <BarChart label="ניהול פעיל" value={stats.open} total={stats.total} />
                    <BarChart label="נסגרו" value={stats.closed} total={stats.total} />
                    <BarChart label="היום" value={stats.todayCount} total={stats.total} />
                  </div>
                </div>
              </div>

              {/* Revenue preview */}
              <div className="rounded-2xl border border-finzo-line bg-white p-5 shadow-e-1">
                <SectionHead title="תמצית הכנסות" />
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <KpiCard label="פוטנציאל חנות לידים" value={revenueStats.potentialStore > 0 ? formatILS(revenueStats.potentialStore) : "לא הוגדר"} />
                  <KpiCard label="עמלות צפויות" value={revenueStats.expectedCommissions > 0 ? formatILS(revenueStats.expectedCommissions) : "—"} />
                  <KpiCard label="עמלות ששולמו" value={revenueStats.paidCommissions > 0 ? formatILS(revenueStats.paidCommissions) : "—"} color={revenueStats.paidCommissions > 0 ? "green" : "default"} />
                  <KpiCard label="לידים שנמכרו" value={revenueStats.soldCount} />
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              NEW LEADS
          ════════════════════════════════════════════════════ */}
          {activeSection === "new_leads" && (
            <LeadsView
              leads={filteredLeads}
              allLeads={newLeads}
              loading={loading}
              statuses={statuses}
              commissionStatuses={commissionStatuses}
              advisors={advisors}
              query={query} setQuery={setQuery}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              qualityFilter={qualityFilter} setQualityFilter={setQualityFilter}
              priorityFilter={priorityFilter} setPriorityFilter={setPriorityFilter}
              advisorFilter={advisorFilter} setAdvisorFilter={setAdvisorFilter}
              hasFilters={hasFilters} clearFilters={clearFilters}
              selectedIds={selectedIds} toggleSelected={toggleSelected} toggleSelectAll={toggleSelectAll}
              bulkAdvisorId={bulkAdvisorId} setBulkAdvisorId={setBulkAdvisorId}
              savingId={savingId} expandedLeadId={expandedLeadId} setExpandedLeadId={setExpandedLeadId}
              patchLead={patchLead} bulkPatch={bulkPatch} bulkAssignAdvisor={bulkAssignAdvisor}
              bulkDeleteLeads={bulkDeleteLeads} deleteSingleLead={deleteSingleLead}
              emptyTitle="אין לידים חדשים"
              emptySub="לידים חדשים שטרם טופלו יופיעו כאן."
            />
          )}

          {/* ════════════════════════════════════════════════════
              ALL LEADS
          ════════════════════════════════════════════════════ */}
          {activeSection === "all_leads" && (
            <LeadsView
              leads={filteredLeads}
              allLeads={leads}
              loading={loading}
              statuses={statuses}
              commissionStatuses={commissionStatuses}
              advisors={advisors}
              query={query} setQuery={setQuery}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              qualityFilter={qualityFilter} setQualityFilter={setQualityFilter}
              priorityFilter={priorityFilter} setPriorityFilter={setPriorityFilter}
              advisorFilter={advisorFilter} setAdvisorFilter={setAdvisorFilter}
              hasFilters={hasFilters} clearFilters={clearFilters}
              selectedIds={selectedIds} toggleSelected={toggleSelected} toggleSelectAll={toggleSelectAll}
              bulkAdvisorId={bulkAdvisorId} setBulkAdvisorId={setBulkAdvisorId}
              savingId={savingId} expandedLeadId={expandedLeadId} setExpandedLeadId={setExpandedLeadId}
              patchLead={patchLead} bulkPatch={bulkPatch} bulkAssignAdvisor={bulkAssignAdvisor}
              bulkDeleteLeads={bulkDeleteLeads} deleteSingleLead={deleteSingleLead}
              emptyTitle="אין לידים"
              emptySub="הלידים שנכנסים מהפורמים יופיעו כאן."
            />
          )}

          {/* ════════════════════════════════════════════════════
              MARKETPLACE
          ════════════════════════════════════════════════════ */}
          {activeSection === "marketplace" && (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <KpiCard label="לידים בחנות" value={marketplaceLeads.length} />
                <KpiCard label="נמכרו" value={revenueStats.soldCount} color="green" />
                <KpiCard label="פוטנציאל הכנסה" value={revenueStats.potentialStore > 0 ? formatILS(revenueStats.potentialStore) : "לא הוגדר"} />
              </div>

              {marketplaceLeads.length === 0 ? (
                <Empty icon="◈" title="חנות הלידים ריקה" sub="לידים שיוגדר להם מחיר חנות (storePrice) יופיעו כאן." />
              ) : (
                <>
                  <TableWrap>
                    <thead>
                      <tr>
                        <Th>שם</Th>
                        <Th>עיר</Th>
                        <Th>משכנתא</Th>
                        <Th>איכות</Th>
                        <Th>FINZO Score</Th>
                        <Th>מחיר חנות</Th>
                        <Th>מחיר בלעדי</Th>
                        <Th>סטטוס חנות</Th>
                        <Th>קונה</Th>
                        <Th>תאריך מכירה</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketplaceLeads.map((l) => (
                        <tr key={l.id} className="hover:bg-finzo-paper/60">
                          <Td><span className="font-black text-mort-ink">{l.name || "—"}</span></Td>
                          <Td className="text-sm text-mort-muted">{l.city || "—"}</Td>
                          <Td className="font-black text-mort-ink">{l.mortgageAmount ? formatILS(toNumber(l.mortgageAmount)) : "—"}</Td>
                          <Td><Pill color={qualityColor(l.leadQuality || "לא סווג")}>{l.leadQuality || "לא סווג"}</Pill></Td>
                          <Td>{(() => { const p = computePricing({ hasName: Boolean(l.name), hasPhone: Boolean(l.phone), city: l.city, mortgageAmount: l.mortgageAmount, monthlyIncome: l.monthlyIncome, equityAmount: l.equityAmount, debtLevel: l.debtLevel, purchaseStatus: l.purchaseStatus, requestedContactTime: l.requestedContactTime, hasExistingMortgage: l.hasExistingMortgage, createdAt: l.createdAt, purchaseCount: 0 }); return <span className="text-xs font-black text-violet-700">{p.finzoScore}/100 · {p.quality}</span>; })()}</Td>
                          <Td className="font-black text-mort-ink">{toNumber(l.storePrice) > 0 ? formatILS(toNumber(l.storePrice)) : (() => { const p = computePricing({ hasName: Boolean(l.name), hasPhone: Boolean(l.phone), city: l.city, mortgageAmount: l.mortgageAmount, monthlyIncome: l.monthlyIncome, equityAmount: l.equityAmount, debtLevel: l.debtLevel, purchaseStatus: l.purchaseStatus, requestedContactTime: l.requestedContactTime, hasExistingMortgage: l.hasExistingMortgage, createdAt: l.createdAt, purchaseCount: 0 }); return <span className="text-emerald-700 font-black">{formatILS(p.regularPrice)}</span>; })()}</Td>
                          <Td className="font-bold text-mort-muted">{toNumber(l.exclusivePrice) > 0 ? formatILS(toNumber(l.exclusivePrice)) : (() => { const p = computePricing({ hasName: Boolean(l.name), hasPhone: Boolean(l.phone), city: l.city, mortgageAmount: l.mortgageAmount, monthlyIncome: l.monthlyIncome, equityAmount: l.equityAmount, debtLevel: l.debtLevel, purchaseStatus: l.purchaseStatus, requestedContactTime: l.requestedContactTime, hasExistingMortgage: l.hasExistingMortgage, createdAt: l.createdAt, purchaseCount: 0 }); return <span className="text-violet-600 font-black">{formatILS(p.exclusivePrice)}</span>; })()}</Td>
                          <Td><span className="text-xs font-bold text-mort-muted">{l.storeStatus || "—"}</span></Td>
                          <Td className="text-sm font-bold text-mort-muted">{l.buyerAdvisorId || "—"}</Td>
                          <Td className="text-xs text-mort-muted">{l.soldAt ? formatDateShort(l.soldAt) : "—"}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </TableWrap>
                  {/* Mobile cards */}
                  <div className="grid gap-3 lg:hidden">
                    {marketplaceLeads.map((l) => (
                      <div key={l.id} className="rounded-2xl border border-finzo-line bg-white p-4 shadow-e-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="font-black text-mort-ink">{l.name || "—"}</span>
                            <p className="mt-0.5 text-xs font-bold text-mort-muted">{l.city} · {l.mortgageAmount ? formatILS(toNumber(l.mortgageAmount)) : "—"}</p>
                          </div>
                          <Pill color={qualityColor(l.leadQuality || "לא סווג")}>{l.leadQuality || "לא סווג"}</Pill>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div><span className="font-bold text-mort-muted">מחיר חנות: </span><strong className="font-black text-mort-ink">{toNumber(l.storePrice) > 0 ? formatILS(toNumber(l.storePrice)) : "לא הוגדר"}</strong></div>
                          <div><span className="font-bold text-mort-muted">בלעדי: </span><strong className="font-black text-mort-ink">{toNumber(l.exclusivePrice) > 0 ? formatILS(toNumber(l.exclusivePrice)) : "—"}</strong></div>
                          <div><span className="font-bold text-mort-muted">קונה: </span><strong className="font-black text-mort-ink">{l.buyerAdvisorId || "—"}</strong></div>
                          <div><span className="font-bold text-mort-muted">נמכר: </span><strong className="font-black text-mort-ink">{l.soldAt ? formatDateShort(l.soldAt) : "—"}</strong></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              CASES
          ════════════════════════════════════════════════════ */}
          {activeSection === "cases" && (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <KpiCard label="תיקים פעילים" value={caseLeads.length} />
                <KpiCard label="נסגרו בהצלחה" value={caseLeads.filter((l) => l.pipelineStage === "closed_won").length} color="green" />
                <KpiCard label="ממתינים לחתימה" value={caseLeads.filter((l) => ["signing_scheduled", "signed"].includes(l.pipelineStage)).length} color="amber" />
              </div>

              {caseLeads.length === 0 ? (
                <Empty icon="◇" title="אין תיקי משכנתא פעילים" sub="לידים שהתקדמו בתהליך ייצגו כאן כתיקי משכנתא." />
              ) : (
                <>
                  <TableWrap>
                    <thead>
                      <tr>
                        <Th>לקוח</Th>
                        <Th>שלב</Th>
                        <Th>התקדמות</Th>
                        <Th>מסמכים</Th>
                        <Th>בטחונות</Th>
                        <Th>בנק</Th>
                        <Th>חתימה</Th>
                        <Th>פעולה הבאה</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {caseLeads.map((l) => {
                        const progress = l.overallProgressPercent ?? pipelineProgress(l.pipelineStage);
                        return (
                          <tr key={l.id} className="hover:bg-finzo-paper/60">
                            <Td>
                              <span className="block font-black text-mort-ink">{l.name || "—"}</span>
                              <span className="text-xs font-bold text-mort-muted">{l.mortgageType || l.mortgageAmount ? formatILS(toNumber(l.mortgageAmount)) : ""}</span>
                            </Td>
                            <Td>
                              <span className="block text-xs font-black text-mort-ink">{pipelineLabel(l.pipelineStage)}</span>
                            </Td>
                            <Td className="w-36">
                              <div className="flex items-center gap-2">
                                <ProgressBar pct={progress} color={progress >= 90 ? "bg-emerald-500" : progress >= 50 ? "bg-finzo-cobalt" : "bg-amber-400"} />
                                <span className="shrink-0 text-xs font-black text-mort-muted">{progress}%</span>
                              </div>
                            </Td>
                            <Td className="text-xs font-bold text-mort-muted">{l.documentsCompletionPercent != null ? `${l.documentsCompletionPercent}%` : "—"}</Td>
                            <Td className="text-xs font-bold text-mort-muted">{l.collateralCompletionPercent != null ? `${l.collateralCompletionPercent}%` : "—"}</Td>
                            <Td className="text-sm font-bold text-mort-muted">{l.bankName || "—"}</Td>
                            <Td className="text-xs font-bold text-mort-muted">{l.signingDate ? formatDateShort(l.signingDate) : "—"}</Td>
                            <Td>
                              {l.nextAction
                                ? <div><span className="block text-xs font-bold text-mort-ink">{l.nextAction}</span><span className="text-xs text-mort-muted">{l.nextActionAt ? formatDateShort(l.nextActionAt) : ""}</span></div>
                                : <span className="text-xs text-mort-muted">—</span>}
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </TableWrap>
                  {/* Mobile */}
                  <div className="grid gap-3 lg:hidden">
                    {caseLeads.map((l) => {
                      const progress = l.overallProgressPercent ?? pipelineProgress(l.pipelineStage);
                      return (
                        <div key={l.id} className="rounded-2xl border border-finzo-line bg-white p-4 shadow-e-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className="font-black text-mort-ink">{l.name || "—"}</span>
                              <p className="mt-0.5 text-xs font-bold text-mort-muted">{pipelineLabel(l.pipelineStage)}</p>
                            </div>
                            <span className="shrink-0 text-sm font-black text-mort-ink">{progress}%</span>
                          </div>
                          <div className="mt-3">
                            <ProgressBar pct={progress} color={progress >= 90 ? "bg-emerald-500" : progress >= 50 ? "bg-finzo-cobalt" : "bg-amber-400"} />
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div><span className="font-bold text-mort-muted">מסמכים: </span><strong>{l.documentsCompletionPercent != null ? `${l.documentsCompletionPercent}%` : "—"}</strong></div>
                            <div><span className="font-bold text-mort-muted">בנק: </span><strong>{l.bankName || "—"}</strong></div>
                            <div><span className="font-bold text-mort-muted">חתימה: </span><strong>{l.signingDate ? formatDateShort(l.signingDate) : "—"}</strong></div>
                            <div><span className="font-bold text-mort-muted">פעולה: </span><strong>{l.nextAction || "—"}</strong></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              ADVISORS
          ════════════════════════════════════════════════════ */}
          {activeSection === "advisors" && (
            <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
              {/* Create form */}
              <div>
                <div className="rounded-2xl border border-finzo-line bg-white p-5 shadow-e-1">
                  <SectionHead title="הוספת יועץ חדש" />
                  <form className="mt-4 grid gap-3" onSubmit={createAdvisor}>
                    <Input label="שם מלא" value={newAdvisor.name} onChange={(v) => setNewAdvisor((c) => ({ ...c, name: v, advisorId: c.advisorId || v }))} />
                    <Input label="טלפון" value={newAdvisor.phone} onChange={(v) => setNewAdvisor((c) => ({ ...c, phone: v }))} />
                    <Input label="אימייל" value={newAdvisor.email} onChange={(v) => setNewAdvisor((c) => ({ ...c, email: v }))} />
                    <Input label="עמלה" value={newAdvisor.commissionAmount} onChange={(v) => setNewAdvisor((c) => ({ ...c, commissionAmount: v }))} />
                    <button className="min-h-11 rounded-2xl bg-finzo-ink px-5 py-2.5 text-sm font-black text-white disabled:opacity-60" type="submit" disabled={loading}>
                      {loading ? "שומר..." : "הוסף יועץ"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Advisor list */}
              <div>
                <div className="rounded-2xl border border-finzo-line bg-white p-5 shadow-e-1">
                  <SectionHead title="יועצים פעילים" count={advisors.length} />
                  {advisors.length === 0 ? (
                    <p className="mt-4 text-sm font-bold text-mort-muted">אין יועצים עדיין. הוסף יועץ ראשון.</p>
                  ) : (
                    <>
                      <TableWrap>
                        <thead>
                          <tr>
                            <Th>שם</Th>
                            <Th>טלפון</Th>
                            <Th>אימייל</Th>
                            <Th>לידים</Th>
                            <Th>פתוחים</Th>
                            <Th>נסגרו</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {advisors.map((a) => {
                            const st = advisorStats.find((s) => s.id === advisorId(a));
                            return (
                              <tr key={advisorId(a)} className="hover:bg-finzo-paper/60">
                                <Td><span className="font-black text-mort-ink">{advisorName(a)}</span></Td>
                                <Td className="text-sm font-bold text-mort-muted">{advisorPhone(a) || "—"}</Td>
                                <Td className="text-sm font-bold text-mort-muted">{advisorEmail(a) || "—"}</Td>
                                <Td><span className="rounded-full bg-finzo-cobalt-l px-2 py-0.5 text-xs font-black text-finzo-cobalt">{st?.count ?? 0}</span></Td>
                                <Td className="text-xs font-bold text-mort-muted">{st?.openCount ?? 0}</Td>
                                <Td className="text-xs font-bold text-mort-muted">{st?.closedCount ?? 0}</Td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </TableWrap>
                      {/* Mobile */}
                      <div className="mt-3 grid gap-3 lg:hidden">
                        {advisors.map((a) => {
                          const st = advisorStats.find((s) => s.id === advisorId(a));
                          return (
                            <div key={advisorId(a)} className="rounded-xl border border-finzo-line bg-finzo-paper p-4">
                              <strong className="block font-black text-finzo-ink">{advisorName(a)}</strong>
                              <span className="block text-xs font-bold text-mort-muted">{advisorPhone(a)}</span>
                              <span className="block text-xs font-bold text-mort-muted">{advisorEmail(a)}</span>
                              <div className="mt-2 flex gap-3 text-xs">
                                <span className="rounded-full bg-finzo-cobalt-l px-2 py-0.5 font-black text-finzo-cobalt">{st?.count ?? 0} לידים</span>
                                <span className="font-bold text-mort-muted">{st?.openCount ?? 0} פתוחים</span>
                                <span className="font-bold text-mort-muted">{st?.closedCount ?? 0} נסגרו</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              REVENUE
          ════════════════════════════════════════════════════ */}
          {activeSection === "revenue" && (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard label="פוטנציאל חנות" value={revenueStats.potentialStore > 0 ? formatILS(revenueStats.potentialStore) : "לא הוגדר"} />
                <KpiCard label="עמלות צפויות" value={revenueStats.expectedCommissions > 0 ? formatILS(revenueStats.expectedCommissions) : "—"} />
                <KpiCard label="עמלות ששולמו" value={revenueStats.paidCommissions > 0 ? formatILS(revenueStats.paidCommissions) : "—"} color={revenueStats.paidCommissions > 0 ? "green" : "default"} />
                <KpiCard label="לידים שנמכרו" value={revenueStats.soldCount} color="blue" />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <KpiCard label="ממתין לחיוב" value={revenueStats.pendingCommissions} sub="עמלות pending" />
                <KpiCard label="חויב — ממתין לתשלום" value={revenueStats.invoicedCommissions} color="amber" />
                <KpiCard label="שולם" value={revenueStats.paidCount} color="green" />
              </div>

              {/* Commission table */}
              {leads.filter((l) => l.commissionStatus || l.expectedCommission || l.commissionAmount || l.actualCommission).length === 0 ? (
                <Empty icon="₪" title="אין נתוני עמלות" sub="עמלות יופיעו כאן לאחר שיוגדרו בלידים (expectedCommission, commissionStatus)." />
              ) : (
                <>
                  <TableWrap>
                    <thead>
                      <tr>
                        <Th>לקוח</Th>
                        <Th>יועץ</Th>
                        <Th>עמלה צפויה</Th>
                        <Th>עמלה בפועל</Th>
                        <Th>סטטוס</Th>
                        <Th>תאריך מכירה</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.filter((l) => l.commissionStatus || l.expectedCommission || l.commissionAmount || l.actualCommission).map((l) => (
                        <tr key={l.id} className="hover:bg-finzo-paper/60">
                          <Td><span className="font-black text-mort-ink">{l.name || "—"}</span></Td>
                          <Td className="text-sm font-bold text-mort-muted">{l.assignedAdvisor || l.buyerAdvisorId || "—"}</Td>
                          <Td className="font-black text-mort-ink">{toNumber(l.expectedCommission) > 0 ? formatILS(toNumber(l.expectedCommission)) : "—"}</Td>
                          <Td className="font-black text-mort-ink">{toNumber(l.actualCommission || l.commissionAmount) > 0 ? formatILS(toNumber(l.actualCommission || l.commissionAmount)) : "—"}</Td>
                          <Td>
                            {l.commissionStatus
                              ? <Pill color={l.commissionStatus === "paid" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : l.commissionStatus === "invoiced" ? "text-amber-700 bg-amber-50 border-amber-200" : "text-slate-600 bg-slate-50 border-slate-200"}>
                                  {COMMISSION_STATUS_LABELS[l.commissionStatus] || l.commissionStatus}
                                </Pill>
                              : <span className="text-xs text-mort-muted">—</span>}
                          </Td>
                          <Td className="text-xs text-mort-muted">{l.soldAt ? formatDateShort(l.soldAt) : "—"}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </TableWrap>
                  <div className="grid gap-3 lg:hidden">
                    {leads.filter((l) => l.commissionStatus || l.expectedCommission || l.commissionAmount || l.actualCommission).map((l) => (
                      <div key={l.id} className="rounded-2xl border border-finzo-line bg-white p-4 shadow-e-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="font-black text-mort-ink">{l.name || "—"}</span>
                            <p className="mt-0.5 text-xs font-bold text-mort-muted">{l.assignedAdvisor || l.buyerAdvisorId || "לא שויך"}</p>
                          </div>
                          {l.commissionStatus && (
                            <Pill color={l.commissionStatus === "paid" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-slate-600 bg-slate-50 border-slate-200"}>
                              {COMMISSION_STATUS_LABELS[l.commissionStatus] || l.commissionStatus}
                            </Pill>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div><span className="font-bold text-mort-muted">צפוי: </span><strong>{toNumber(l.expectedCommission) > 0 ? formatILS(toNumber(l.expectedCommission)) : "—"}</strong></div>
                          <div><span className="font-bold text-mort-muted">בפועל: </span><strong>{toNumber(l.actualCommission || l.commissionAmount) > 0 ? formatILS(toNumber(l.actualCommission || l.commissionAmount)) : "—"}</strong></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

        </main>
      </div>

      {/* ── Create Lead Modal ── */}
      {showCreateModal && (
        <CreateLeadModal
          form={createForm}
          setForm={setCreateForm}
          onSubmit={createLeadHandler}
          onClose={() => { setShowCreateModal(false); setCreateError(""); setCreateForm(EMPTY_CREATE_FORM); }}
          saving={createSaving}
          error={createError}
        />
      )}
    </div>
  );
}

// ── CreateLeadModal ───────────────────────────────────────────────────────────

const SOURCE_OPTIONS = [
  { value: "phone",    label: "שיחת טלפון" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "facebook", label: "פייסבוק" },
  { value: "google",   label: "גוגל" },
  { value: "referral", label: "הפנייה" },
  { value: "partner",  label: "שותף עסקי" },
  { value: "website",  label: "אתר" },
  { value: "manual",   label: "ידני / אחר" },
];

function CreateLeadModal({ form, setForm, onSubmit, onClose, saving, error }) {
  const f = (field) => (val) => setForm((c) => ({ ...c, [field]: val }));

  const liveInput = {
    hasName: Boolean(form.name),
    hasPhone: Boolean(form.phone),
    city: form.city,
    mortgageAmount: form.mortgageAmount,
    equityAmount: form.equityAmount,
    monthlyIncome: form.monthlyIncome,
    debtLevel: form.debtLevel,
    purchaseStatus: form.purchaseStatus,
    requestedContactTime: form.requestedContactTime,
    hasExistingMortgage: form.hasExistingMortgage,
    createdAt: new Date().toISOString(),
    purchaseCount: 0,
  };
  const pricing = computePricing(liveInput);
  const scoreColor = pricing.finzoScore >= 70 ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : pricing.finzoScore >= 50 ? "text-amber-700 bg-amber-50 border-amber-200"
    : "text-slate-600 bg-slate-50 border-slate-200";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div dir="rtl" className="w-full max-w-2xl rounded-3xl border border-finzo-line bg-white shadow-e-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-finzo-line px-6 py-4">
          <div>
            <h2 className="text-base font-black text-finzo-ink">➕ הוספת ליד ידנית</h2>
            <p className="text-xs font-bold text-mort-muted">מקור: טלפון / WhatsApp / פייסבוק / הפנייה / אופליין</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-finzo-line px-3 py-1.5 text-sm font-black text-mort-muted hover:bg-finzo-paper">✕</button>
        </div>

        {/* Live FINZO Score preview */}
        <div className="border-b border-finzo-line bg-finzo-paper/60 px-6 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-black ${scoreColor}`}>
              FINZO {pricing.finzoScore}/100 · {pricing.quality}
            </span>
            {pricing.finzoScore > 0 && (
              <span className="text-xs font-bold text-mort-muted">
                מחיר רגיל: <strong className="text-mort-ink">{formatILS(pricing.regularPrice)}</strong>
                {" · "}
                בלעדי: <strong className="text-mort-ink">{formatILS(pricing.exclusivePrice)}</strong>
              </span>
            )}
            <span className="text-xs font-bold text-mort-muted">
              {pricing.pricingBullets?.join(" · ")}
            </span>
          </div>
        </div>

        <form onSubmit={onSubmit} className="grid gap-5 px-6 py-5">
          {/* Required fields */}
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-mort-muted">פרטי לקוח — חובה</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-black text-mort-muted">שם מלא <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={(e) => f("name")(e.target.value)} placeholder="שם הלקוח"
                  className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-mort-ink focus:border-finzo-cobalt focus:outline-none focus:ring-1 focus:ring-finzo-cobalt/30" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-black text-mort-muted">טלפון <span className="text-red-500">*</span></label>
                <input value={form.phone} onChange={(e) => f("phone")(e.target.value)} placeholder="05X-XXXXXXX" type="tel"
                  className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-mort-ink focus:border-finzo-cobalt focus:outline-none focus:ring-1 focus:ring-finzo-cobalt/30" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-black text-mort-muted">סוג תיק <span className="text-red-500">*</span></label>
                <select value={form.purchaseStatus} onChange={(e) => f("purchaseStatus")(e.target.value)}
                  className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-mort-ink focus:border-finzo-cobalt focus:outline-none">
                  <option value="">בחר סוג תיק...</option>
                  {Object.entries(PURCHASE_STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Location & Mortgage */}
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-mort-muted">מיקום ומשכנתא</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-black text-mort-muted">עיר מגורים</label>
                <input value={form.city} onChange={(e) => f("city")(e.target.value)} placeholder="תל אביב"
                  className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-mort-ink focus:border-finzo-cobalt focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-black text-mort-muted">עיר הנכס</label>
                <input value={form.propertyCity} onChange={(e) => f("propertyCity")(e.target.value)} placeholder="כמו עיר מגורים"
                  className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-mort-ink focus:border-finzo-cobalt focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-black text-mort-muted">סכום משכנתא (₪)</label>
                <input value={form.mortgageAmount} onChange={(e) => f("mortgageAmount")(e.target.value)} placeholder="1,200,000" type="number"
                  className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-mort-ink focus:border-finzo-cobalt focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-black text-mort-muted">הון עצמי (₪)</label>
                <input value={form.equityAmount} onChange={(e) => f("equityAmount")(e.target.value)} placeholder="400,000" type="number"
                  className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-mort-ink focus:border-finzo-cobalt focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-black text-mort-muted">הכנסה חודשית (₪)</label>
                <input value={form.monthlyIncome} onChange={(e) => f("monthlyIncome")(e.target.value)} placeholder="15,000" type="number"
                  className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-mort-ink focus:border-finzo-cobalt focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-black text-mort-muted">רמת חוב חודשית (₪)</label>
                <input value={form.debtLevel} onChange={(e) => f("debtLevel")(e.target.value)} placeholder="3,000" type="number"
                  className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-mort-ink focus:border-finzo-cobalt focus:outline-none" />
              </div>
            </div>
          </div>

          {/* Extra fields */}
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-mort-muted">פרטים נוספים</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-black text-mort-muted">משכנתא קיימת?</label>
                <select value={form.hasExistingMortgage} onChange={(e) => f("hasExistingMortgage")(e.target.value)}
                  className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-mort-ink focus:border-finzo-cobalt focus:outline-none">
                  <option value="">לא ידוע</option>
                  <option value="yes">כן</option>
                  <option value="no">לא</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-black text-mort-muted">זמן חזרה מועדף</label>
                <input value={form.requestedContactTime} onChange={(e) => f("requestedContactTime")(e.target.value)} placeholder="בוקר / צהריים / ערב"
                  className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-mort-ink focus:border-finzo-cobalt focus:outline-none" />
              </div>
            </div>
          </div>

          {/* Source & Marketplace */}
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-mort-muted">מקור ופרסום</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-black text-mort-muted">מקור הליד <span className="text-red-500">*</span></label>
                <select value={form.source} onChange={(e) => f("source")(e.target.value)}
                  className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-mort-ink focus:border-finzo-cobalt focus:outline-none">
                  {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 w-full">
                  <input type="checkbox" checked={form.publishToStore} onChange={(e) => f("publishToStore")(e.target.checked)}
                    className="h-4 w-4 rounded accent-violet-600" />
                  <div>
                    <span className="block text-sm font-black text-mort-ink">פרסם לחנות הלידים</span>
                    <span className="block text-xs font-bold text-mort-muted">יועצים יוכלו לרכוש ליד זה</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-finzo-line pt-4">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-finzo-line px-5 py-2.5 text-sm font-black text-mort-ink hover:bg-finzo-paper disabled:opacity-50">
              ביטול
            </button>
            <button type="submit" disabled={saving} className="rounded-xl bg-finzo-ink px-6 py-2.5 text-sm font-black text-white hover:bg-finzo-ink/90 disabled:opacity-60">
              {saving ? "שומר..." : "צור ליד"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── LeadsView ─────────────────────────────────────────────────────────────────
// Shared component for "new_leads" and "all_leads" sections.

function LeadsView({
  leads, allLeads, loading, statuses, commissionStatuses, advisors,
  query, setQuery, statusFilter, setStatusFilter, qualityFilter, setQualityFilter,
  priorityFilter, setPriorityFilter, advisorFilter, setAdvisorFilter,
  hasFilters, clearFilters,
  selectedIds, toggleSelected, toggleSelectAll,
  bulkAdvisorId, setBulkAdvisorId,
  savingId, expandedLeadId, setExpandedLeadId,
  patchLead, bulkPatch, bulkAssignAdvisor, bulkDeleteLeads, deleteSingleLead,
  emptyTitle, emptySub,
}) {
  return (
    <div className="grid gap-4">
      {/* Filters */}
      <div className="rounded-2xl border border-finzo-line bg-white p-4 shadow-e-1">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-black text-mort-muted">חיפוש מרכז</label>
            <input
              className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-mort-ink focus:border-finzo-cobalt focus:bg-white focus:outline-none"
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="שם, טלפון, עיר, מקור, יועץ..."
            />
          </div>
          <div className="grid grid-cols-2 gap-2 lg:flex lg:items-end">
            <div>
              <label className="mb-1 block text-xs font-black text-mort-muted">סטטוס</label>
              <select className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-mort-ink focus:outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">הכל</option>
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-black text-mort-muted">איכות</label>
              <select className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-mort-ink focus:outline-none" value={qualityFilter} onChange={(e) => setQualityFilter(e.target.value)}>
                {LEAD_QUALITIES.map((q) => <option key={q} value={q}>{q || "כל האיכויות"}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-black text-mort-muted">עדיפות</label>
              <select className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-mort-ink focus:outline-none" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                {LEAD_PRIORITIES.map((p) => <option key={p} value={p}>{p || "כל העדיפויות"}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-black text-mort-muted">יועץ</label>
              <select className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-mort-ink focus:outline-none" value={advisorFilter} onChange={(e) => setAdvisorFilter(e.target.value)}>
                <option value="">כל היועצים</option>
                {advisors.map((a) => <option key={advisorId(a)} value={advisorId(a)}>{advisorName(a)}</option>)}
              </select>
            </div>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="min-h-10 self-end rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-black text-red-700 hover:bg-red-100">
                נקה
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      <div className="rounded-2xl border border-finzo-line bg-white p-3 shadow-e-1">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm font-black text-mort-ink">
            <input type="checkbox" checked={leads.length > 0 && selectedIds.length === leads.length} onChange={toggleSelectAll} />
            <span>הכל</span>
          </label>
          {selectedIds.length > 0 && <span className="rounded-full bg-finzo-cobalt-l px-2 py-0.5 text-xs font-black text-finzo-cobalt">{selectedIds.length} נבחרו</span>}
          <div className="mr-auto flex flex-wrap gap-1.5">
            <button type="button" onClick={() => bulkPatch({ leadQuality: "חם", leadPriority: "גבוה" })} disabled={!selectedIds.length} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-black text-emerald-800 disabled:opacity-40">סמן חם</button>
            <button type="button" onClick={() => bulkPatch({ followUpStage: "ניסיון 1" })} disabled={!selectedIds.length} className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-black text-amber-800 disabled:opacity-40">מעקב ניסיון 1</button>
            <button type="button" onClick={() => bulkPatch({ leadStatus: "לא רלוונטי", status: "לא רלוונטי" })} disabled={!selectedIds.length} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-black text-slate-700 disabled:opacity-40">לא רלוונטי</button>
            <div className="flex items-center gap-1">
              <select className="min-h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-mort-ink" value={bulkAdvisorId} onChange={(e) => setBulkAdvisorId(e.target.value)}>
                <option value="">שיוך ליועץ...</option>
                {advisors.map((a) => <option key={advisorId(a)} value={advisorId(a)}>{advisorName(a)}</option>)}
              </select>
              <button type="button" onClick={bulkAssignAdvisor} disabled={!selectedIds.length || !bulkAdvisorId} className="min-h-8 rounded-lg bg-finzo-ink px-2.5 py-1 text-xs font-black text-white disabled:opacity-40">שייך</button>
            </div>
            <button type="button" onClick={bulkDeleteLeads} disabled={!selectedIds.length} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-black text-red-700 disabled:opacity-40">מחק</button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && allLeads.length === 0 && (
        <div className="flex items-center justify-center rounded-2xl border border-finzo-line bg-white py-14">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-finzo-cobalt border-t-transparent" />
        </div>
      )}

      {/* Empty */}
      {!loading && leads.length === 0 && (
        <Empty title={emptyTitle} sub={emptySub}
          action={hasFilters && <button type="button" onClick={clearFilters} className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-mort-ink hover:bg-slate-100">נקה סינון</button>}
        />
      )}

      {/* Desktop table */}
      {leads.length > 0 && (
        <TableWrap>
          <thead>
            <tr>
              <Th><span className="sr-only">בחר</span></Th>
              <Th>שם</Th>
              <Th>טלפון</Th>
              <Th>עיר</Th>
              <Th>סוג תיק</Th>
              <Th>משכנתא</Th>
              <Th>איכות</Th>
              <Th>סטטוס</Th>
              <Th>יועץ</Th>
              <Th>תאריך</Th>
              <Th>פעולות</Th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const leadStatus = lead.leadStatus || lead.status || "חדש";
              const quality = lead.leadQuality || "לא סווג";
              const isSaving = savingId === lead.id;
              const isExpanded = expandedLeadId === lead.id;
              return (
                <>
                  <tr key={lead.id} className={`transition-colors hover:bg-finzo-paper/50 ${selectedIds.includes(lead.id) ? "bg-finzo-cobalt-l/30" : ""}`}>
                    <Td className="w-10 text-center">
                      <input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => toggleSelected(lead.id)} />
                    </Td>
                    <Td>
                      <span className="block font-black text-mort-ink">{lead.name || "—"}</span>
                      {isSaving && <span className="text-xs font-bold text-amber-600">שומר...</span>}
                    </Td>
                    <Td>
                      <a href={lead.phone ? `tel:${lead.phone}` : undefined} className="font-bold text-finzo-cobalt hover:underline">{lead.phone || "—"}</a>
                    </Td>
                    <Td className="text-sm font-bold text-mort-muted">{lead.city || lead.propertyCity || "—"}</Td>
                    <Td><PurchaseStatusBadge value={lead.purchaseStatus} /></Td>
                    <Td className="font-black text-mort-ink">{lead.mortgageAmount ? formatILS(toNumber(lead.mortgageAmount)) : "—"}</Td>
                    <Td>
                      <span className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${qualityDot(quality)}`} />
                        <span className="text-xs font-black">{quality}</span>
                      </span>
                    </Td>
                    <Td><Pill color={statusColor(leadStatus)}>{leadStatus}</Pill></Td>
                    <Td className="text-sm font-bold text-mort-muted">{lead.assignedAdvisor || <span className="text-slate-400">—</span>}</Td>
                    <Td className="text-xs font-bold text-mort-muted">{formatDateShort(lead.createdAt)}</Td>
                    <Td>
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => setExpandedLeadId(isExpanded ? null : lead.id)} className="rounded-lg border border-finzo-line bg-finzo-paper px-2.5 py-1 text-xs font-black text-mort-ink hover:bg-finzo-cream">{isExpanded ? "סגור" : "עריכה"}</button>
                        <button type="button" onClick={() => deleteSingleLead(lead.id)} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-black text-red-700 hover:bg-red-100">מחק</button>
                      </div>
                    </Td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${lead.id}-exp`} className="bg-finzo-paper/40">
                      <td colSpan={10} className="border-b border-finzo-line">
                        <LeadEditPanel lead={lead} statuses={statuses} commissionStatuses={commissionStatuses} onPatch={patchLead} />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </TableWrap>
      )}

      {/* Mobile cards */}
      {leads.length > 0 && (
        <div className="grid gap-3 lg:hidden">
          {leads.map((lead) => {
            const leadStatus = lead.leadStatus || lead.status || "חדש";
            const quality = lead.leadQuality || "לא סווג";
            const isSaving = savingId === lead.id;
            const isExpanded = expandedLeadId === lead.id;
            return (
              <article key={lead.id} className="overflow-hidden rounded-2xl border border-finzo-line bg-white shadow-e-1">
                <div className="flex items-start gap-2 p-4">
                  <input className="mt-1 shrink-0" type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => toggleSelected(lead.id)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-black text-mort-ink">{lead.name || "ליד"}</span>
                      <Pill color={statusColor(leadStatus)}>{leadStatus}</Pill>
                      <span className="flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${qualityDot(quality)}`} /><span className="text-xs font-black text-mort-muted">{quality}</span></span>
                      {isSaving && <span className="text-xs font-bold text-amber-600">שומר...</span>}
                    </div>
                    <p className="mt-0.5 text-xs font-bold text-mort-muted">{formatDateShort(lead.createdAt)} · {lead.phone || "—"} · {lead.city || "—"}</p>
                    {lead.purchaseStatus && <div className="mt-1"><PurchaseStatusBadge value={lead.purchaseStatus} /></div>}
                    <FinzoScorePanel lead={lead} />
                    {lead.assignedAdvisor && <p className="text-xs font-bold text-mort-muted">יועץ: {lead.assignedAdvisor}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {lead.phone && <a href={`tel:${lead.phone}`} className="rounded-lg border border-finzo-line bg-finzo-paper px-2 py-1 text-xs font-black text-mort-ink">חיוג</a>}
                    <button type="button" onClick={() => setExpandedLeadId(isExpanded ? null : lead.id)} className="rounded-lg border border-finzo-line bg-finzo-paper px-2 py-1 text-xs font-black text-mort-ink">{isExpanded ? "סגור" : "עריכה"}</button>
                    <button type="button" onClick={() => deleteSingleLead(lead.id)} className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-black text-red-700">מחק</button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-finzo-line">
                    <LeadEditPanel lead={lead} statuses={statuses} commissionStatuses={commissionStatuses} onPatch={patchLead} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
