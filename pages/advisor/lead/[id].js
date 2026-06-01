import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatILS } from "../../../lib/format";
import AdvisorHeader from "../../../components/AdvisorHeader";
import {
  PIPELINE_STAGES,
  getPipelineProgress,
  getPipelineStageLabel,
  normalizePipelineStage,
} from "../../../lib/pipeline";
import {
  APPRAISAL_PROGRESS,
  APPRAISAL_STATUS_LABELS,
  APPRAISAL_STATUSES,
  CASE_TYPE_ICONS,
  CASE_TYPES,
  COLLATERAL_CHECKLIST,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_MARKS,
  DOCUMENT_STATUSES,
  FUNDS_RELEASE_STATUS_LABELS,
  FUNDS_RELEASE_STATUSES,
  LEGAL_CHECKLIST,
  buildDocumentChecklist,
  calculateCollateralProgress,
  calculateOverallMortgageProgress,
  getDocumentLabel,
  isRefinanceCase,
  normalizeCaseType,
} from "../../../lib/mortgageCase";
import { BANK_GUIDES } from "../../../lib/bankGuides";
import { BANK_SUBMISSION_STATUSES, BANK_SUBMISSION_STATUS_MAP } from "../../../lib/bankerDirectory";

const ACTIVE_PIPELINE_STAGES = PIPELINE_STAGES.filter((s) => s !== "closed_lost");

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

const STAGE_COLORS = [
  "bg-violet-500", "bg-violet-400", "bg-indigo-400", "bg-amber-400",
  "bg-amber-500", "bg-sky-400", "bg-sky-500", "bg-blue-500",
  "bg-blue-400", "bg-emerald-400", "bg-emerald-500", "bg-green-500",
  "bg-blue-400", "bg-emerald-400", "bg-emerald-500", "bg-green-500",
  "bg-lime-500", "bg-green-600", "bg-green-700",
];
const STAGE_RING = [
  "ring-violet-400", "ring-violet-400", "ring-indigo-400", "ring-amber-400",
  "ring-amber-400",  "ring-sky-400",    "ring-sky-400",    "ring-blue-400",
  "ring-blue-400",   "ring-emerald-400","ring-emerald-400","ring-green-400",
  "ring-blue-400",   "ring-emerald-400","ring-emerald-400","ring-green-400",
  "ring-lime-400",   "ring-green-500",  "ring-green-600",
];

const BANKS = ["בנק לאומי", "בנק הפועלים", "בנק דיסקונט", "מזרחי-טפחות", "הבינלאומי", "One Zero", "יורוקום", "אחר"];

const ACTIVITY_ICONS = {
  lead_created: "⭐", status_changed: "🔄", call_logged: "📞",
  whatsapp_opened: "💬", whatsapp_sent: "💬", email_opened: "✉️",
  document_requested: "📄", document_received: "✅", note_added: "📝", reminder_set: "⏰",
};

const DETAIL_TABS = [
  { key: "docs",      label: "מסמכים" },
  { key: "bank",      label: "בנק" },
  { key: "activity",  label: "פעילות" },
  { key: "notes",     label: "הערות" },
  { key: "appraisal", label: "שמאות" },
  { key: "legal",     label: 'עו"ד' },
  { key: "signing",   label: "חתימות" },
  { key: "collateral",label: "בטחונות" },
];

// Bank tab: status display maps (module-level — never recreated)
const CASE_BANK_STATUS_LABEL = {
  selected:             "נבחר",
  ready_to_send:        "מוכן לשליחה",
  sent:                 "נשלח",
  waiting_for_response: "ממתין לתשובה",
  approved:             "אושר",
  rejected:             "נדחה",
};
const CASE_BANK_STATUS_STYLE = {
  selected:             "bg-slate-100 text-slate-600",
  ready_to_send:        "bg-amber-50 text-amber-700",
  sent:                 "bg-sky-50 text-sky-700",
  waiting_for_response: "bg-violet-50 text-violet-700",
  approved:             "bg-emerald-50 text-emerald-700",
  rejected:             "bg-rose-50 text-rose-700",
};

const DEFAULT_WA_TEMPLATES = [
  {
    key: "missing_docs",
    label: "מסמכים חסרים",
    body: "שלום {{name}}\n\nחסרים לנו המסמכים הבאים:\n\n{{missing_documents}}\n\nתודה.",
  },
  {
    key: "reminder",
    label: "תזכורת",
    body: "שלום {{name}}\n\nתזכורת לגבי המסמכים החסרים:\n\n{{missing_documents}}",
  },
  {
    key: "approval",
    label: "אישור עקרוני",
    body: "בשעה טובה,\nהתקבל אישור עקרוני.",
  },
];

const WA_TEMPLATES_STORAGE_KEY = "finzo_wa_templates_v1";

function loadStoredTemplates() {
  if (typeof window === "undefined") return DEFAULT_WA_TEMPLATES;
  try {
    const raw = localStorage.getItem(WA_TEMPLATES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_WA_TEMPLATES;
  } catch {
    return DEFAULT_WA_TEMPLATES;
  }
}

function saveStoredTemplates(templates) {
  try { localStorage.setItem(WA_TEMPLATES_STORAGE_KEY, JSON.stringify(templates)); } catch {}
}

function formatDT(d) { if (!d) return ""; return new Date(d).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
function formatDate(d) { if (!d) return ""; return new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" }); }
function isOverdue(d) { return d && new Date(d) < new Date(new Date().toDateString()); }

function getStage(lead) { return normalizePipelineStage(lead?.pipelineStage || lead?.leadStatus); }
function getStageIndex(lead) { return ACTIVE_PIPELINE_STAGES.indexOf(getStage(lead)); }

// ─── Stage Stepper ────────────────────────────────────────────────────────────
const StageStepper = memo(function StageStepper({ lead, onAdvance, onSetStage }) {
  const si = getStageIndex(lead);
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current && si >= 0) {
      const el = scrollRef.current.children[si];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [si]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-black text-slate-800">מהלך הטיפול במשכנתא</h3>
        <span className="text-xs font-black text-slate-400">{si >= 0 ? `${si + 1}/${ACTIVE_PIPELINE_STAGES.length}` : "—"}</span>
      </div>
      <div ref={scrollRef} className="flex gap-1.5 overflow-x-auto pb-2 mb-3" style={{ scrollbarWidth: "none" }}>
        {ACTIVE_PIPELINE_STAGES.map((stage, i) => {
          const done = i < si;
          const active = i === si;
          return (
            <button key={stage} type="button" onClick={() => onSetStage(stage)} title={getPipelineStageLabel(stage)}
              className={`flex-none flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all ${active ? "bg-slate-50 ring-2 " + STAGE_RING[i] : "hover:bg-slate-50"}`}>
              <div className={`h-3 w-3 rounded-full transition-all ${done ? STAGE_COLORS[i] + " opacity-60" : active ? STAGE_COLORS[i] : "bg-slate-200"}`} />
              <span className={`text-[10px] font-bold whitespace-nowrap ${active ? "text-slate-900" : done ? "text-slate-400" : "text-slate-300"}`} style={{ maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis" }}>
                {getPipelineStageLabel(stage)}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${si >= 0 ? STAGE_COLORS[si] : "bg-violet-400"}`} style={{ width: `${getPipelineProgress(getStage(lead))}%` }} />
        </div>
        {si >= 0 && si < ACTIVE_PIPELINE_STAGES.length - 1 && (
          <button type="button" onClick={onAdvance} className={`shrink-0 text-xs font-black px-3 py-1.5 rounded-xl text-white transition-colors ${STAGE_COLORS[si + 1] || "bg-violet-500"} hover:opacity-90`}>
            הבא: {getPipelineStageLabel(ACTIVE_PIPELINE_STAGES[si + 1])} ←
          </button>
        )}
        {getStage(lead) === "closed_won" && (
          <span className="shrink-0 text-xs font-black text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-xl">🎉 נסגר בהצלחה</span>
        )}
      </div>
    </div>
  );
});

// ─── Progress Widget ───────────────────────────────────────────────────────────
const ProgressWidget = memo(function ProgressWidget({ label, pct, color = "bg-emerald-500" }) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  return (
    <div className="bg-white rounded-xl border border-slate-100 px-4 py-3">
      <div className="flex justify-between text-xs font-black text-slate-500 mb-1.5">
        <span>{label}</span>
        <span className="tabular-nums">{p}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
});

// ─── WhatsApp Template Manager ────────────────────────────────────────────────
function WaTemplateManager({ lead, missingDocsList, onClose }) {
  const [templates, setTemplates] = useState(loadStoredTemplates);
  const [editing, setEditing] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editBody, setEditBody] = useState("");

  function applyVars(body) {
    const name = lead?.name || "";
    const missingStr = missingDocsList.length > 0
      ? missingDocsList.map((d) => `• ${d.label || getDocumentLabel(d.document_type)}`).join("\n")
      : "אין מסמכים חסרים";
    return body.replace(/\{\{name\}\}/g, name).replace(/\{\{missing_documents\}\}/g, missingStr);
  }

  function sendTemplate(tmpl) {
    if (!lead?.phone) return;
    const raw = String(lead.phone).replace(/[^\d]/g, "");
    const phone = raw.startsWith("0") ? `972${raw.slice(1)}` : raw;
    const text = applyVars(tmpl.body);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  function startEdit(tmpl) {
    setEditing(tmpl?.key || "new_" + Date.now());
    setEditLabel(tmpl?.label || "");
    setEditBody(tmpl?.body || "");
  }

  function saveEdit() {
    const updated = editing.startsWith("new_")
      ? [...templates, { key: editing, label: editLabel, body: editBody }]
      : templates.map((t) => t.key === editing ? { ...t, label: editLabel, body: editBody } : t);
    setTemplates(updated);
    saveStoredTemplates(updated);
    setEditing(null);
  }

  function deleteTemplate(key) {
    const updated = templates.filter((t) => t.key !== key);
    setTemplates(updated);
    saveStoredTemplates(updated);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} dir="rtl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-black text-slate-950">תבניות WhatsApp</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 font-black text-lg">×</button>
        </div>
        <div className="p-4 space-y-3">
          {templates.map((tmpl) => (
            <div key={tmpl.key} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              {editing === tmpl.key ? (
                <div className="space-y-2">
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder="שם התבנית" />
                  <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[100px] resize-y outline-none" value={editBody} onChange={(e) => setEditBody(e.target.value)} placeholder="תוכן התבנית..." />
                  <p className="text-[11px] text-slate-400">משתנים: <code>{"{{name}}"}</code> <code>{"{{missing_documents}}"}</code></p>
                  <div className="flex gap-2">
                    <button type="button" onClick={saveEdit} className="rounded-lg bg-violet-700 text-white px-3 py-1.5 text-xs font-black">שמור</button>
                    <button type="button" onClick={() => setEditing(null)} className="rounded-lg bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-black">ביטול</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs font-black text-slate-800 mb-1">{tmpl.label}</p>
                  <p className="text-[11px] text-slate-500 whitespace-pre-line mb-2 line-clamp-3">{tmpl.body}</p>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => sendTemplate(tmpl)} className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-[11px] font-black">שלח</button>
                    <button type="button" onClick={() => startEdit(tmpl)} className="rounded-lg bg-slate-200 text-slate-700 px-3 py-1.5 text-[11px] font-black">ערוך</button>
                    <button type="button" onClick={() => deleteTemplate(tmpl.key)} className="rounded-lg bg-rose-50 text-rose-700 px-3 py-1.5 text-[11px] font-black">מחק</button>
                  </div>
                </>
              )}
            </div>
          ))}
          {editing && editing.startsWith("new_") && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-2">
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder="שם התבנית" autoFocus />
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[100px] resize-y outline-none" value={editBody} onChange={(e) => setEditBody(e.target.value)} placeholder="תוכן התבנית..." />
              <p className="text-[11px] text-slate-400">משתנים: <code>{"{{name}}"}</code> <code>{"{{missing_documents}}"}</code></p>
              <div className="flex gap-2">
                <button type="button" onClick={saveEdit} className="rounded-lg bg-violet-700 text-white px-3 py-1.5 text-xs font-black">שמור</button>
                <button type="button" onClick={() => setEditing(null)} className="rounded-lg bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-black">ביטול</button>
              </div>
            </div>
          )}
          {!editing && (
            <button type="button" onClick={() => startEdit(null)} className="w-full rounded-xl border-2 border-dashed border-slate-200 py-3 text-xs font-black text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors">
              + תבנית חדשה
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Attention Flags (Phase 6) ────────────────────────────────────────────────
// Derives warning indicators from real lead data. No fake urgency.
const FLAG_STYLES = {
  danger:  { bar: "bg-rose-50 border-rose-200",  dot: "bg-rose-500",   text: "text-rose-700" },
  warning: { bar: "bg-amber-50 border-amber-200", dot: "bg-amber-400",  text: "text-amber-700" },
  info:    { bar: "bg-sky-50 border-sky-200",     dot: "bg-sky-400",    text: "text-sky-700" },
  stale:   { bar: "bg-slate-50 border-slate-200", dot: "bg-slate-400",  text: "text-slate-600" },
};

function buildAttentionFlags(lead) {
  if (!lead) return [];
  const flags = [];
  const today = new Date(new Date().toDateString());
  const DAY_MS = 864e5;
  const stage = normalizePipelineStage(lead.pipelineStage || lead.leadStatus);

  function daysSince(d) {
    if (!d) return null;
    return Math.max(0, Math.floor((today - new Date(new Date(d).toDateString())) / DAY_MS));
  }
  function isOverdueDate(d) { return d && new Date(d) < today; }

  // Overdue follow-up or next action
  if (isOverdueDate(lead.nextActionAt) || isOverdueDate(lead.followUpDate)) {
    flags.push({ type: "danger", icon: "⚠️", text: "מעקב באיחור — פנה ללקוח עכשיו" });
  }

  // Missing documents in docs stage
  const missingCount = Number(lead.missingDocumentsCount || 0);
  if (missingCount > 0 && ["documents_requested", "waiting_documents", "documents_received"].includes(stage)) {
    flags.push({ type: "warning", icon: "📄", text: `${missingCount} מסמכים חסרים לקידום התיק` });
  }

  // No contact for 7+ days
  const daysSinceContact = daysSince(lead.lastContactedAt || lead.createdAt);
  if (daysSinceContact !== null && daysSinceContact >= 7 &&
      !["closed_won", "closed_lost", "funds_released"].includes(stage)) {
    flags.push({ type: "warning", icon: "📞", text: `ללא קשר ${daysSinceContact} ימים` });
  }

  // Waiting for bank 14+ days
  if (["submitted_to_bank", "principle_approval", "bank_negotiation"].includes(stage)) {
    const daysInStage = daysSince(lead.stageUpdatedAt);
    if (daysInStage !== null && daysInStage >= 14) {
      flags.push({ type: "info", icon: "🏦", text: `ממתין לתשובת בנק ${daysInStage} ימים` });
    }
  }

  // Case stalled (no activity 10+ days)
  const daysNoActivity = daysSince(lead.lastActivityAt);
  if (daysNoActivity !== null && daysNoActivity >= 10 &&
      !["closed_won", "closed_lost", "funds_released"].includes(stage)) {
    flags.push({ type: "stale", icon: "⏱", text: `תיק ללא פעילות ${daysNoActivity} ימים` });
  }

  return flags;
}

// ─── Bank Guide Section (Phase 8) ─────────────────────────────────────────────
// Expandable per-bank instructions for generating payoff reports.
// Shown only on refinance cases. Data lives in lib/bankGuides.js.
function BankGuideSection() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-right hover:bg-slate-50/60 transition-colors"
      >
        <div>
          <h2 className="text-sm font-black text-slate-950">הפקת דוח יתרות לסילוק</h2>
          <p className="text-[11px] font-bold text-slate-400 mt-0.5">מדריכים לפי בנק — לחץ כדי להרחיב</p>
        </div>
        <span className="text-slate-400 font-black text-lg shrink-0 mr-2">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100 divide-y divide-slate-50">
          {BANK_GUIDES.map((bank) => (
            <div key={bank.key}>
              <button
                type="button"
                onClick={() => setExpanded((v) => v === bank.key ? null : bank.key)}
                className="w-full flex items-center justify-between px-5 py-3 text-right hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-slate-800">{bank.name}</span>
                  {bank.phone && <span className="text-xs font-bold text-violet-600">{bank.phone}</span>}
                </div>
                <span className="text-slate-400 text-sm shrink-0 mr-2">{expanded === bank.key ? "▲" : "▼"}</span>
              </button>
              {expanded === bank.key && (
                <div className="px-5 pb-4 space-y-2">
                  <ol className="space-y-1.5">
                    {bank.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                        <span className="font-black text-violet-600 shrink-0 tabular-nums">{i + 1}.</span>
                        <span className="font-bold">{step}</span>
                      </li>
                    ))}
                  </ol>
                  {bank.note && (
                    <p className="text-[11px] font-bold text-slate-400 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                      💡 {bank.note}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LeadDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const isNewPurchase = router.query.newPurchase === "1";

  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [notes, setNotes] = useState("");
  const [nextActionText, setNextActionText] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  // Support ?tab= deep-link from dashboard attention items
  const initialTab = (() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("tab");
      const valid = ["docs", "bank", "activity", "notes", "appraisal", "legal", "signing", "collateral"];
      if (p && valid.includes(p)) return p;
    }
    return "docs";
  })();
  const [tab, setTab] = useState(initialTab);
  const [showWaTemplates, setShowWaTemplates] = useState(false);
  const [msg, setMsg] = useState({ text: "", ok: true });

  // Upload-link & reminder state
  const [uploadToken,      setUploadToken]      = useState(null);   // {token: record, uploadUrl: string}
  const [tokenLoading,     setTokenLoading]     = useState(false);
  const [linkCopied,       setLinkCopied]       = useState(false);
  const [reminder,         setReminder]         = useState(null);
  const [reminderDeadline, setReminderDeadline] = useState("");     // datetime-local value
  const [reviewNotes,      setReviewNotes]      = useState({});     // docId → string

  // Bank tab state
  const [bankSubmissionStatus, setBankSubmissionStatus] = useState("not_submitted");
  const [advisorBankers,       setAdvisorBankers]       = useState([]);   // advisor's full directory
  const [caseBankers,          setCaseBankers]          = useState([]);   // bankers selected for this case
  const [selectedBankerId,     setSelectedBankerId]     = useState("");   // dropdown selection
  const [addingBanker,         setAddingBanker]         = useState(false);
  const [caseBankerNotes,      setCaseBankerNotes]      = useState({});   // caseBankerId → note string

  const debounceRef = useRef({});

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/advisor/my-leads?leadId=${id}`).then((r) => r.ok ? r.json() : { lead: null }),
      fetch(`/api/advisor/activities?leadId=${id}`).then((r) => r.ok ? r.json() : { activities: [] }),
      fetch(`/api/advisor/documents?leadId=${id}`).then((r) => r.ok ? r.json() : { documents: [] }),
      fetch(`/api/advisor/document-upload-token?leadId=${id}`).then((r) => r.ok ? r.json() : { token: null, uploadUrl: null }),
      fetch(`/api/advisor/document-reminders?leadId=${id}`).then((r) => r.ok ? r.json() : { reminder: null }),
      fetch("/api/advisor/bankers").then((r) => r.ok ? r.json() : { bankers: [] }),
      fetch(`/api/advisor/case-bankers?leadId=${id}`).then((r) => r.ok ? r.json() : { caseBankers: [] }),
    ]).then(([leadsData, actData, docsData, tokenData, reminderData, bankersData, caseBankersData]) => {
      const found = leadsData.lead || (leadsData.leads || []).find((l) => l.id === id);
      if (!found) { router.push("/advisor/my-leads"); return; }
      setLead(found);
      setNotes(found.internalNotes || "");
      setNextActionText(found.nextAction || "");
      setNextActionDate(found.nextActionAt?.slice(0, 10) || "");
      setBankSubmissionStatus(found.bankSubmissionStatus || "not_submitted");
      const acts = Array.isArray(actData.activities) ? actData.activities : [];
      setActivities(acts.length > 0 ? acts : [{ title: "הליד נוצר", created_at: found.createdAt, activity_type: "lead_created" }]);
      const docs = Array.isArray(docsData.documents) ? docsData.documents : [];
      setDocuments(docs);
      if (tokenData.token) setUploadToken({ record: tokenData.token, url: tokenData.uploadUrl });
      if (reminderData.reminder) {
        setReminder(reminderData.reminder);
        if (reminderData.reminder.deadline_at) {
          setReminderDeadline(reminderData.reminder.deadline_at.slice(0, 16));
        }
      }
      setAdvisorBankers(Array.isArray(bankersData.bankers) ? bankersData.bankers : []);
      setCaseBankers(Array.isArray(caseBankersData.caseBankers) ? caseBankersData.caseBankers : []);
      setLoading(false);
    }).catch(() => { setLoading(false); router.push("/advisor/my-leads"); });
  }, [id]);

  function showSaved() {
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 2500);
  }

  function pushActivity(title, activityType = "note_added") {
    setActivities((prev) => [{ title, created_at: new Date().toISOString(), activity_type: activityType }, ...prev]);
    fetch("/api/advisor/activities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: id, activityType, title }) }).catch(() => {});
  }

  function touchLead(changes) {
    fetch("/api/advisor/my-leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, changes }),
    }).catch(() => {});
  }

  async function patchLead(changes, activityTitle, activityType = "note_added") {
    setSaving(true);
    const r = await fetch("/api/advisor/my-leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, changes }),
    });
    if (r.ok) {
      const j = await r.json();
      setLead((prev) => ({ ...prev, ...j.lead }));
      if (activityTitle) pushActivity(activityTitle, activityType);
      showSaved();
    } else {
      setMsg({ text: "שמירה נכשלה", ok: false });
      setTimeout(() => setMsg({ text: "", ok: true }), 3000);
    }
    setSaving(false);
  }

  function debouncedPatch(key, changes, activityTitle, activityType, delay = 400) {
    setLead((prev) => ({ ...prev, ...changes }));
    clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(() => patchLead(changes, activityTitle, activityType), delay);
  }

  const advanceStage = useCallback(async () => {
    const si = getStageIndex(lead);
    if (si < 0 || si >= ACTIVE_PIPELINE_STAGES.length - 1) return;
    const next = ACTIVE_PIPELINE_STAGES[si + 1];
    await patchLead({ pipelineStage: next, lastContactedAt: new Date().toISOString() }, `שלב עודכן: "${getPipelineStageLabel(next)}"`, "status_changed");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead]);

  const setStage = useCallback(async (stage) => {
    const nextStage = normalizePipelineStage(stage);
    if (nextStage === getStage(lead)) return;
    await patchLead({ pipelineStage: nextStage, lastContactedAt: new Date().toISOString() }, `שלב עודכן: "${getPipelineStageLabel(nextStage)}"`, "status_changed");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead]);

  function openWa(templateKey = "") {
    if (!lead?.phone) return;
    const raw = String(lead.phone).replace(/[^\d]/g, "");
    const phone = raw.startsWith("0") ? `972${raw.slice(1)}` : raw;
    let text = "";
    if (templateKey) {
      const templates = loadStoredTemplates();
      const tmpl = templates.find((t) => t.key === templateKey);
      if (tmpl) {
        const missingStr = computedDocumentSummary.missingDocuments.map((d) => `• ${d.label || getDocumentLabel(d.document_type)}`).join("\n");
        text = tmpl.body.replace(/\{\{name\}\}/g, lead.name || "").replace(/\{\{missing_documents\}\}/g, missingStr);
      }
    }
    window.open(text ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/${phone}`, "_blank", "noopener,noreferrer");
    pushActivity("WhatsApp נשלח", "whatsapp_opened");
    touchLead({ lastContactedAt: new Date().toISOString() });
  }

  async function updateDocStatus(doc, status, docNotes = doc.notes) {
    let target = doc;
    if (!target.id) {
      const created = await fetch("/api/advisor/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: id, documentTypes: [doc.document_type] }) });
      if (!created.ok) return;
      const payload = await created.json();
      target = (payload.documents || [])[0] || doc;
      setDocuments((prev) => [...prev, target]);
    }
    const r = await fetch("/api/advisor/documents", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: target.id, status, notes: docNotes, leadId: id, documentType: target.document_type || doc.document_type }) });
    if (!r.ok) return;
    const j = await r.json();
    const updated = j.document || { ...target, status, notes: docNotes };
    setDocuments((prev) => prev.some((d) => d.id === updated.id) ? prev.map((d) => d.id === updated.id ? updated : d) : [...prev, updated]);
    showSaved();
  }

  function sendMissingDocsWa() {
    if (!lead?.phone || computedDocumentSummary.missingDocuments.length === 0) return;
    const raw = String(lead.phone).replace(/[^\d]/g, "");
    const phone = raw.startsWith("0") ? `972${raw.slice(1)}` : raw;
    const list = computedDocumentSummary.missingDocuments.map((d) => `• ${d.label || getDocumentLabel(d.document_type)}`).join("\n");
    const text = `היי ${lead.name || ""}, כדי להתקדם בתיק המשכנתא חסרים לי המסמכים הבאים:\n${list}\n\nאפשר לשלוח כאן בוואטסאפ.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    pushActivity("נשלחה בקשת מסמכים ב-WhatsApp", "whatsapp_sent");
  }

  // ── Upload token handlers ─────────────────────────────────────────────────
  async function generateUploadToken() {
    setTokenLoading(true);
    try {
      const r = await fetch("/api/advisor/document-upload-token", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: id }),
      });
      if (r.ok) {
        const j = await r.json();
        setUploadToken({ record: j.token, url: j.uploadUrl });
        pushActivity("קישור העלאת מסמכים נוצר", "note_added");
      }
    } finally { setTokenLoading(false); }
  }

  async function revokeUploadToken() {
    if (!uploadToken?.record?.id) return;
    await fetch("/api/advisor/document-upload-token", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenId: uploadToken.record.id, leadId: id }),
    });
    setUploadToken(null);
  }

  function copyUploadLink() {
    if (!uploadToken?.url) return;
    navigator.clipboard.writeText(uploadToken.url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    }).catch(() => {});
  }

  function openWaWithUploadLink() {
    if (!lead?.phone || !uploadToken?.url) return;
    const raw   = String(lead.phone).replace(/[^\d]/g, "");
    const phone = raw.startsWith("0") ? `972${raw.slice(1)}` : raw;
    const name  = lead.name || "לקוח";
    const text  = `שלום ${name},\nכדי להתקדם בתיק המשכנתא שלך, יש להעלות את המסמכים החסרים בקישור המאובטח הבא:\n${uploadToken.url}\n\nתודה,\n${lead.assignedAdvisor || ""}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    pushActivity("קישור העלאת מסמכים נשלח ב-WhatsApp", "whatsapp_sent");
    touchLead({ lastContactedAt: new Date().toISOString() });
  }

  // ── Reminder handlers ─────────────────────────────────────────────────────
  async function saveReminder(deadlineAt) {
    const missingTypes = computedDocumentSummary.missingDocuments.map((d) => ({
      type: d.document_type, label: d.label,
    }));
    const r = await fetch("/api/advisor/document-reminders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: id,
        uploadTokenId: uploadToken?.record?.id || null,
        deadlineAt,
        channel: "whatsapp",
        missingDocumentTypes: missingTypes,
      }),
    });
    if (r.ok) { const j = await r.json(); setReminder(j.reminder); }
  }

  function setReminderHours(h) {
    const dt = new Date(Date.now() + h * 3_600_000);
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    setReminderDeadline(local);
    saveReminder(dt.toISOString());
  }

  function copyReminderMessage() {
    if (!uploadToken?.url) return;
    const missingDocs = computedDocumentSummary.missingDocuments.map((d) => ({ label: d.label || d.document_type }));
    const text = [
      `שלום ${lead?.name || "לקוח יקר"},`,
      `תזכורת ידידותית מ-FINZO:`,
      `כדי שנוכל להתקדם בתיק המשכנתא שלך, עדיין חסרים המסמכים הבאים:`,
      "",
      ...missingDocs.map((d) => `• ${d.label}`),
      "",
      `ניתן להעלות אותם בקישור המאובטח:`,
      uploadToken.url,
      "",
      `תודה,`,
      lead?.assignedAdvisor || "",
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      if (reminder?.id) {
        fetch("/api/advisor/document-reminders", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reminderId: reminder.id, leadId: id }),
        }).then((r) => r.ok ? r.json() : null).then((j) => {
          if (j) setReminder((p) => ({ ...p, last_reminder_sent_at: new Date().toISOString(), status: "sent" }));
        }).catch(() => {});
      }
      setMsg({ text: "הודעת תזכורת הועתקה ✓", ok: true });
      setTimeout(() => setMsg({ text: "", ok: true }), 2500);
    }).catch(() => {});
  }

  function openWaReminder() {
    if (!lead?.phone || !uploadToken?.url) return;
    const raw  = String(lead.phone).replace(/[^\d]/g, "");
    const phone = raw.startsWith("0") ? `972${raw.slice(1)}` : raw;
    const missingDocs = computedDocumentSummary.missingDocuments.map((d) => `• ${d.label || d.document_type}`).join("\n");
    const text = `שלום ${lead.name || "לקוח יקר"},\nתזכורת ידידותית מ-FINZO:\nכדי שנוכל להתקדם בתיק המשכנתא שלך, עדיין חסרים המסמכים הבאים:\n\n${missingDocs}\n\nניתן להעלות אותם בקישור המאובטח:\n${uploadToken.url}\n\nתודה,\n${lead.assignedAdvisor || ""}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    if (reminder?.id) {
      fetch("/api/advisor/document-reminders", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderId: reminder.id, leadId: id }),
      }).then(() => setReminder((p) => ({ ...p, last_reminder_sent_at: new Date().toISOString(), status: "sent" }))).catch(() => {});
    }
    pushActivity("תזכורת נשלחה ב-WhatsApp", "whatsapp_sent");
    touchLead({ lastContactedAt: new Date().toISOString() });
  }

  // ── Document review handlers ───────────────────────────────────────────────
  async function openDocFile(doc) {
    try {
      const r = await fetch(`/api/advisor/document-review?docId=${doc.id}&leadId=${id}`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) {
        const errMsg = j.message || "לא הצלחנו לפתוח את הקובץ כרגע. נסה שוב בעוד רגע.";
        setMsg({ text: errMsg, ok: false });
        setTimeout(() => setMsg({ text: "", ok: true }), 4000);
        return;
      }
      window.open(j.url, "_blank", "noopener,noreferrer");
    } catch {
      setMsg({ text: "לא הצלחנו לפתוח את הקובץ כרגע. נסה שוב בעוד רגע.", ok: false });
      setTimeout(() => setMsg({ text: "", ok: true }), 4000);
    }
  }

  async function reviewDoc(doc, status, note) {
    const r = await fetch("/api/advisor/document-review", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId: doc.id, leadId: id, status, reviewNote: note || "" }),
    });
    if (!r.ok) return;
    const j = await r.json();
    const updated = j.document;
    if (updated) {
      setDocuments((prev) => prev.map((d) => d.id === updated.id ? { ...d, ...updated } : d));
      showSaved();
    }
  }

  const caseType = normalizeCaseType(lead?.mortgageType);
  const isRefinance = isRefinanceCase(caseType);

  const computedDocumentSummary = useMemo(
    () => buildDocumentChecklist(documents, lead?.employmentStatus, caseType),
    [documents, lead?.employmentStatus, caseType]
  );
  const missingDocs = computedDocumentSummary.missingCount;
  const attentionFlags = useMemo(() => buildAttentionFlags(lead), [lead]);
  const sortedActivities = useMemo(
    () => [...activities].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [activities]
  );
  const score = Math.round(Number(lead?.approvalScore || lead?.estimatedApprovalResult) || 0);
  const si = lead ? getStageIndex(lead) : -1;
  const overallProgress = lead ? Number(lead.overallProgressPercent ?? calculateOverallMortgageProgress(lead)) || 0 : 0;
  const collateralProgress = lead ? Number(lead.collateralCompletionPercent ?? calculateCollateralProgress(lead)) || 0 : 0;
  const appraisalPct = APPRAISAL_PROGRESS[lead?.appraisalStatus || "not_ordered"] || 0;
  const lawyerDone = lead ? LEGAL_CHECKLIST.filter((item) => Boolean(lead[item.key])).length : 0;
  const lawyerPct = lead ? Math.round((lawyerDone / LEGAL_CHECKLIST.length) * 100) : 0;
  const fundsReleased = lead?.fundsReleaseStatus === "fully_released";
  const fundsPct = fundsReleased ? 100 : lead?.fundsReleaseStatus === "partially_released" ? 50 : 0;

  // Bank-tab derived values
  const bankTabDerived = useMemo(() => {
    const isReady = missingDocs === 0;
    const readyReceivedDocs = computedDocumentSummary.checklist.filter(
      (d) => d.status === "approved" || d.status === "received"
    ).length;
    const assignedBankerIds = new Set(caseBankers.map((cb) => cb.banker_id));
    const availableBankers  = advisorBankers.filter((b) => !assignedBankerIds.has(b.id));
    return { isReady, readyReceivedDocs, availableBankers };
  }, [missingDocs, computedDocumentSummary, caseBankers, advisorBankers]);

  // ── Bank-tab helpers ──────────────────────────────────────────────────────
  // Defined after computedDocumentSummary so there is no temporal-dead-zone issue.

  const buildCaseSummaryText = useCallback((bankerNameSnap) => {
    const received = computedDocumentSummary.checklist
      .filter((d) => d.status === "approved" || d.status === "received")
      .map((d) => `✓ ${d.label || getDocumentLabel(d.document_type)}`);
    const missing = computedDocumentSummary.missingDocuments
      .map((d) => `✗ ${d.label || getDocumentLabel(d.document_type)}`);
    return [
      `שלום ${bankerNameSnap || ""},`,
      ``,
      `מצורף סיכום תיק המשכנתא של ${lead?.name || "הלקוח"}.`,
      ``,
      `סוג תיק: ${caseType || "—"}`,
      `שלב נוכחי: ${getPipelineStageLabel(getStage(lead))}`,
      lead?.mortgageAmount ? `גובה המשכנתא: ${formatILS(lead.mortgageAmount)}` : null,
      ``,
      received.length > 0 ? `מסמכים שהתקבלו/אושרו:\n${received.join("\n")}` : null,
      missing.length > 0  ? `\nמסמכים שעדיין חסרים:\n${missing.join("\n")}` : null,
      ``,
      `תודה,`,
      lead?.assignedAdvisor || "",
    ].filter((l) => l !== null).join("\n");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedDocumentSummary, lead, caseType]);

  const copyBankSummary = useCallback((bankerNameSnap) => {
    navigator.clipboard.writeText(buildCaseSummaryText(bankerNameSnap)).then(() => {
      setMsg({ text: "סיכום תיק הועתק ✓", ok: true });
      setTimeout(() => setMsg({ text: "", ok: true }), 2500);
    }).catch(() => {});
  }, [buildCaseSummaryText]);

  const addBankerToCase = useCallback(async () => {
    if (!selectedBankerId) return;
    setAddingBanker(true);
    try {
      const r = await fetch("/api/advisor/case-bankers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: id, bankerId: selectedBankerId }),
      });
      if (r.ok) {
        const j = await r.json();
        if (!j.alreadyExists) setCaseBankers((prev) => [...prev, j.caseBanker]);
        setSelectedBankerId("");
        pushActivity(`בנקאי נוסף לתיק`, "note_added");
      } else {
        setMsg({ text: "הוספה נכשלה", ok: false });
        setTimeout(() => setMsg({ text: "", ok: true }), 3000);
      }
    } finally {
      setAddingBanker(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBankerId, id]);

  const removeBankerFromCase = useCallback(async (caseBankerId) => {
    const r = await fetch("/api/advisor/case-bankers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: caseBankerId, leadId: id }),
    });
    if (r.ok) setCaseBankers((prev) => prev.filter((cb) => cb.id !== caseBankerId));
  }, [id]);

  const markSent = useCallback(async (cb) => {
    const now = new Date().toISOString();
    const r = await fetch("/api/advisor/case-bankers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cb.id, leadId: id, status: "sent", sent_at: now }),
    });
    if (r.ok) {
      const j = await r.json();
      setCaseBankers((prev) => prev.map((x) => x.id === cb.id ? j.caseBanker : x));
    }
  }, [id]);

  // Reminder status label for the advisor UI (computed from live state)
  const reminderStatusLabel = useMemo(() => {
    if (!reminder) return null;
    if (reminder.cancelled_at) return null;
    if (missingDocs === 0 || reminder.status === "completed") return "כל המסמכים התקבלו — אין צורך בתזכורת ✓";
    const now = Date.now();
    if (reminder.deadline_at) {
      const diff = new Date(reminder.deadline_at).getTime() - now;
      if (diff <= 0) return `התזכורת מוכנה לשליחה — חסרים ${missingDocs} מסמכים`;
      const h = Math.round(diff / 3_600_000);
      if (h < 24) return `תזכורת תישלח בעוד ${h} שעות`;
      return `תזכורת תישלח בעוד ${Math.round(diff / 86_400_000)} ימים`;
    }
    if (reminder.last_reminder_sent_at) {
      const ago = now - new Date(reminder.last_reminder_sent_at).getTime();
      const h = Math.round(ago / 3_600_000);
      if (h < 24) return `נשלח קישור מסמכים לפני ${h} שעות`;
      return `נשלח קישור מסמכים לפני ${Math.round(ago / 86_400_000)} ימים`;
    }
    return null;
  }, [reminder, missingDocs]);

  if (loading) {
    return (
      <main dir="rtl" className="min-h-screen bg-slate-50">
        <AdvisorHeader />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-4" />
          <div className="grid lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => <div key={i} className="bg-white rounded-2xl h-64 animate-pulse" />)}
          </div>
        </div>
      </main>
    );
  }
  if (!lead) return null;

  return (
    <>
      <Head><title>{lead.name || "ליד"} | FINZO PRO</title><meta name="robots" content="noindex,nofollow" /></Head>
      <main dir="rtl" className="min-h-screen bg-slate-50 pb-24 md:pb-0">
        <AdvisorHeader active="/advisor/my-leads" />

        {/* ── Sticky header ── */}
        <div className="sticky top-14 z-30 bg-white border-b border-slate-100 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
            <Link href="/advisor/my-leads" className="text-xs font-black text-slate-400 hover:text-slate-700 shrink-0">← חזרה</Link>
            <h1 className="text-lg font-black text-slate-950 truncate flex-1">{lead.name || "—"}</h1>
            {lead.phone && <a href={`tel:${lead.phone}`} className="text-sm font-black text-violet-600 shrink-0">{lead.phone}</a>}
            {/* Case Type badge — Phase 1 */}
            {caseType && (
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200 shrink-0">
                {CASE_TYPE_ICONS[caseType]} {caseType}
              </span>
            )}
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 shrink-0">{getPipelineStageLabel(getStage(lead))}</span>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">{overallProgress}%</span>
            {score > 0 && <span className={`text-sm font-black tabular-nums shrink-0 ${score >= 70 ? "text-emerald-600" : score >= 40 ? "text-amber-500" : "text-slate-400"}`}>{score}/100</span>}
            {missingDocs > 0 && <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">חסרים {missingDocs}</span>}
            {saving && <span className="text-xs text-slate-400 font-bold shrink-0">שומר...</span>}
            {savedIndicator && !saving && <span className="text-xs text-emerald-600 font-black shrink-0">נשמר ✓</span>}
          </div>

          {/* Action bar */}
          <div className="max-w-6xl mx-auto px-4 pb-3 flex gap-2 flex-wrap">
            {lead.phone && (
              <a href={`tel:${lead.phone}`}
                onClick={() => { pushActivity("בוצעה שיחה", "call_logged"); touchLead({ lastContactedAt: new Date().toISOString() }); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-xs font-black border border-violet-200">
                ☎ התקשר
              </a>
            )}
            {lead.phone && (
              <button type="button" onClick={() => openWa()} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200">
                💬 וואטסאפ
              </button>
            )}
            {lead.phone && (
              <button type="button" onClick={() => setShowWaTemplates(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200">
                תבניות WA ▾
              </button>
            )}
            {(lead.advisorEmail || lead.email) && (
              <a href={`mailto:${lead.advisorEmail || lead.email}`}
                onClick={() => { pushActivity("נשלח מייל", "email_opened"); touchLead({ lastContactedAt: new Date().toISOString() }); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 text-xs font-black border border-sky-200">
                ✉ שלח מייל
              </a>
            )}
            <button type="button" onClick={() => setTab("docs")}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-xs font-black border border-violet-200">
              📎 קישור מסמכים
            </button>
          </div>
        </div>

        {isNewPurchase && (
          <div className="max-w-6xl mx-auto mt-3 px-4">
            <div className="rounded-2xl bg-gradient-to-l from-emerald-50 to-white border border-emerald-300 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">✓</span>
                <div>
                  <p className="text-sm font-black text-emerald-800">זה הליד שרכשת עכשיו — אפשר להתחיל טיפול</p>
                  <p className="text-xs font-bold text-emerald-600 mt-0.5">פרטי הקשר גלויים, כל הכלים זמינים</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`}
                    onClick={() => { pushActivity("בוצעה שיחה", "call_logged"); touchLead({ lastContactedAt: new Date().toISOString() }); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-700 text-white text-xs font-black hover:bg-violet-800 transition-colors">
                    ☎ התקשר עכשיו
                  </a>
                )}
                {lead.phone && (
                  <button type="button" onClick={() => openWa()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 transition-colors">
                    💬 וואטסאפ
                  </button>
                )}
                <button type="button" onClick={() => setTab("docs")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-violet-200 bg-violet-50 text-violet-800 text-xs font-black hover:bg-violet-100 transition-colors">
                  📎 שלח קישור מסמכים
                </button>
              </div>
            </div>
          </div>
        )}

        {msg.text && (
          <div className={`max-w-6xl mx-auto mt-3 px-4 py-2 rounded-xl text-sm font-bold ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {msg.text}
          </div>
        )}

        {/* ── 3-column layout ── */}
        <div className="max-w-6xl mx-auto px-4 py-4 grid lg:grid-cols-[260px_1fr_220px] gap-4 items-start">

          {/* RIGHT: Sticky customer summary */}
          <div className="lg:sticky lg:top-36 space-y-3">
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h2 className="text-sm font-black text-slate-950 mb-3">פרטי לקוח</h2>
              <div className="space-y-2 text-sm">
                {[
                  ["שם",        lead.name],
                  ["טלפון",     lead.phone],
                  ["מייל",      lead.email || lead.advisorEmail],
                  ["עיר",       lead.city || lead.propertyCity],
                  ["משכנתא",   lead.mortgageAmount ? formatILS(lead.mortgageAmount) : null],
                  ["מחיר נכס", lead.propertyPrice ? formatILS(lead.propertyPrice) : null],
                  ["הון עצמי", lead.equityAmount ? formatILS(lead.equityAmount) : null],
                  ["סוג תיק", PURCHASE_STATUS_LABELS[lead.purchaseStatus] || lead.purchaseStatus || null],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-2">
                    <span className="text-slate-400 font-black text-xs shrink-0">{label}</span>
                    <span className="font-black text-slate-800 text-xs truncate text-left">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                <div className="rounded-lg bg-violet-50 border border-violet-200 px-3 py-2">
                  <p className="text-[11px] font-black text-violet-500 mb-0.5">שלב נוכחי</p>
                  <p className="text-sm font-black text-violet-900">{getPipelineStageLabel(getStage(lead))}</p>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-1">פעולה הבאה</label>
                  <input type="text" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300"
                    placeholder="מה הפעולה הבאה?"
                    value={nextActionText}
                    onChange={(e) => {
                      setNextActionText(e.target.value);
                      debouncedPatch("nextAction", { nextAction: e.target.value }, e.target.value ? `פעולה הבאה: ${e.target.value}` : undefined, "reminder_set");
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-1">תאריך מעקב</label>
                  <input type="date"
                    className={`w-full border rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300 ${isOverdue(nextActionDate) ? "border-rose-300 bg-rose-50/30" : "border-slate-200"}`}
                    value={nextActionDate}
                    onChange={(e) => {
                      setNextActionDate(e.target.value);
                      debouncedPatch("nextActionDate", { nextActionAt: e.target.value }, undefined, "reminder_set");
                    }}
                  />
                </div>
              </div>
              {/* Contact buttons */}
              <div className="mt-3 grid grid-cols-1 gap-1.5">
                {lead.phone && <a href={`tel:${lead.phone}`} className="text-center text-xs font-black rounded-lg py-2.5 bg-violet-700 text-white">☎ התקשר</a>}
                {lead.phone && <button type="button" onClick={() => openWa()} className="text-center text-xs font-black rounded-lg py-2.5 bg-emerald-600 text-white">💬 וואטסאפ</button>}
                {(lead.advisorEmail || lead.email) && <a href={`mailto:${lead.advisorEmail || lead.email}`} className="text-center text-xs font-black rounded-lg py-2.5 bg-sky-50 text-sky-700 border border-sky-200">✉ שלח מייל</a>}
              </div>
            </div>

            {/* Stage select */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <label className="block text-xs font-black text-slate-400 mb-1.5">שנה שלב</label>
              <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300" value={getStage(lead)} onChange={(e) => setStage(e.target.value)}>
                <optgroup label="Pipeline פעיל">
                  {ACTIVE_PIPELINE_STAGES.map((s) => <option key={s} value={s}>{getPipelineStageLabel(s)}</option>)}
                </optgroup>
                <optgroup label="יצא מהתהליך">
                  <option value="closed_lost">{getPipelineStageLabel("closed_lost")}</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* CENTER: Pipeline progress */}
          <div className="space-y-4 min-w-0">
            <StageStepper lead={lead} onAdvance={advanceStage} onSetStage={setStage} />

            {/* Attention Flags (Phase 6) */}
            {attentionFlags.length > 0 && (
              <div className="space-y-2">
                {attentionFlags.map((flag, i) => {
                  const s = FLAG_STYLES[flag.type] || FLAG_STYLES.stale;
                  return (
                    <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${s.bar}`}>
                      <span className={`h-2 w-2 rounded-full shrink-0 ${s.dot}`} />
                      <span className="text-sm shrink-0">{flag.icon}</span>
                      <span className={`text-xs font-black ${s.text}`}>{flag.text}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Deal details */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h2 className="text-sm font-black text-slate-950 mb-3">פרטי העסקה</h2>

              {/* Case Type — Phase 1: prominent selector */}
              <div className="mb-3">
                <label className="block text-xs font-black text-slate-400 mb-1.5">סוג תיק</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {CASE_TYPES.map((ct) => (
                    <button
                      key={ct}
                      type="button"
                      onClick={() => patchLead({ mortgageType: ct }, `סוג תיק: ${ct}`, "status_changed")}
                      className={`rounded-xl px-3 py-2 text-xs font-black text-right transition-all border ${
                        caseType === ct
                          ? "bg-violet-700 text-white border-violet-700 shadow-sm"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-700"
                      }`}
                    >
                      {CASE_TYPE_ICONS[ct]} {ct}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-1">בנק</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none" value={lead.bankName || ""} onChange={(e) => patchLead({ bankName: e.target.value }, e.target.value ? `בנק: ${e.target.value}` : "")}>
                    <option value="">בחר בנק...</option>
                    {BANKS.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                {[
                  ["נרכש",      lead.purchasedAt ? formatDate(lead.purchasedAt) : null],
                  ["שולם",      lead.purchasePrice > 0 ? formatILS(lead.purchasePrice) : null],
                  ["סוג קנייה", lead.isExclusive ? "בלעדי" : lead.purchaseType === "regular" ? "רגיל" : null],
                  ["קשר ראשון", lead.firstContactAt ? formatDate(lead.firstContactAt) : "טרם"],
                  ["הכנסה",     lead.monthlyIncome ? formatILS(lead.monthlyIncome) : null],
                  ["ציון",      score > 0 ? `${score}/100` : null],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-2.5">
                    <p className="text-slate-400 font-black mb-0.5">{label}</p>
                    <p className="font-black text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="flex overflow-x-auto border-b border-slate-100" style={{ scrollbarWidth: "none" }}>
                {DETAIL_TABS.map((t) => (
                  <button key={t.key} type="button" onClick={() => setTab(t.key)}
                    className={`flex-none px-4 py-3 text-xs font-black whitespace-nowrap transition-colors border-b-2 ${tab === t.key ? "border-violet-700 text-violet-700 bg-violet-50/50" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="p-4">

                {/* מסמכים */}
                {tab === "docs" && (
                  <div>

                    {/* ── Upload link & reminder ── */}
                    <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                      <h3 className="text-xs font-black text-slate-700 mb-0.5">קישור להעלאת מסמכים</h3>
                      <p className="text-[11px] font-bold text-slate-400 mb-3">שלח ללקוח קישור מאובטח להעלאה עצמאית</p>
                      {uploadToken ? (
                        <>
                          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 mb-3">
                            <span className="text-xs text-slate-500 truncate flex-1 font-mono" style={{ direction: "ltr" }}>
                              {uploadToken.url}
                            </span>
                            <button type="button" onClick={copyUploadLink}
                              className="shrink-0 text-[11px] font-black px-2.5 py-1 rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors">
                              {linkCopied ? "הועתק ✓" : "העתק"}
                            </button>
                          </div>
                          <div className="flex gap-2 flex-wrap mb-3">
                            {lead?.phone && (
                              <button type="button" onClick={openWaWithUploadLink}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black">
                                💬 שלח ב-WA
                              </button>
                            )}
                            <button type="button" onClick={generateUploadToken} disabled={tokenLoading}
                              className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-black disabled:opacity-50">
                              {tokenLoading ? "יוצר..." : "🔄 חדש קישור"}
                            </button>
                            <button type="button" onClick={revokeUploadToken}
                              className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 text-xs font-black border border-rose-200">
                              בטל קישור
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 mb-3">
                            תוקף: {uploadToken.record?.expires_at ? new Date(uploadToken.record.expires_at).toLocaleDateString("he-IL") : "—"}
                          </p>
                          {/* Reminder */}
                          <div className="border-t border-slate-200 pt-3">
                            <p className="text-xs font-black text-slate-600 mb-2">זמן יעד להעלאה</p>
                            <div className="flex gap-1.5 flex-wrap mb-2">
                              {[24, 48, 72].map((h) => (
                                <button key={h} type="button" onClick={() => setReminderHours(h)}
                                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-black bg-white border border-slate-200 text-slate-700 hover:bg-violet-100 hover:text-violet-700 transition-colors">
                                  {h} שעות
                                </button>
                              ))}
                              <input type="datetime-local"
                                className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-violet-300"
                                value={reminderDeadline}
                                onChange={(e) => { setReminderDeadline(e.target.value); if (e.target.value) saveReminder(new Date(e.target.value).toISOString()); }}
                              />
                            </div>
                            {reminderStatusLabel && (
                              <div className="rounded-lg bg-sky-50 border border-sky-200 px-3 py-2 mb-2">
                                <p className="text-xs font-black text-sky-700">{reminderStatusLabel}</p>
                              </div>
                            )}
                            {missingDocs > 0 && (
                              <div className="flex gap-2 flex-wrap">
                                <button type="button" onClick={copyReminderMessage}
                                  className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black">
                                  📋 העתק הודעת תזכורת
                                </button>
                                {lead?.phone && (
                                  <button type="button" onClick={openWaReminder}
                                    className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black">
                                    💬 שלח תזכורת ב-WA
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-3">
                          <p className="text-xs font-bold text-slate-400 mb-3">טרם נוצר קישור להעלאת מסמכים</p>
                          <button type="button" onClick={generateUploadToken} disabled={tokenLoading}
                            className="px-4 py-2.5 rounded-xl bg-violet-700 text-white text-xs font-black disabled:opacity-50">
                            {tokenLoading ? "יוצר קישור..." : "✨ צור קישור להעלאה"}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Document Center Card (Phase 7) — 4-way status breakdown */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {[
                        { label: "חסרים",    count: computedDocumentSummary.statusCounts.missing,   cls: "bg-rose-50 border-rose-200 text-rose-700" },
                        { label: "בבקשה",    count: computedDocumentSummary.statusCounts.requested, cls: "bg-amber-50 border-amber-200 text-amber-700" },
                        { label: "התקבלו",  count: computedDocumentSummary.statusCounts.received,  cls: "bg-sky-50 border-sky-200 text-sky-700" },
                        { label: "אושרו",   count: computedDocumentSummary.statusCounts.approved,  cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                      ].map(({ label, count, cls }) => (
                        <div key={label} className={`rounded-xl border p-2.5 text-center ${cls}`}>
                          <p className="text-2xl font-black tabular-nums leading-none">{count}</p>
                          <p className="text-[11px] font-black mt-1">{label}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs font-bold text-slate-400 mb-3 text-center">
                      {computedDocumentSummary.receivedCount} מתוך {computedDocumentSummary.totalCount} מסמכים הושלמו · {computedDocumentSummary.completionPercent}%
                    </p>

                    <div className="flex items-center justify-between gap-3 mb-3">
                      {missingDocs > 0 && (
                        <button type="button" onClick={sendMissingDocsWa} className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-black text-emerald-700">
                          שלח בקשת מסמכים ב-WA
                        </button>
                      )}
                    </div>

                    <div className="grid gap-2">
                      {computedDocumentSummary.checklist.map((doc) => {
                        const mark = DOCUMENT_STATUS_MARKS[doc.status] || "—";
                        const isGood = doc.status === "approved" || doc.status === "received";
                        return (
                          <div key={doc.id || doc.key} className={`rounded-lg border p-2.5 ${isGood ? "bg-emerald-50/40 border-emerald-100" : "bg-slate-50 border-slate-100"}`}>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-base shrink-0">{mark}</span>
                                <span className="text-xs font-black text-slate-800 truncate">{doc.label || getDocumentLabel(doc.document_type)}</span>
                              </div>
                              <select className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold bg-white shrink-0" value={doc.status} onChange={(e) => updateDocStatus(doc, e.target.value)}>
                                {DOCUMENT_STATUSES.map((s) => <option key={s} value={s}>{DOCUMENT_STATUS_LABELS[s]}</option>)}
                              </select>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              <button type="button" onClick={() => updateDocStatus(doc, "received")} className="rounded-md bg-emerald-50 text-emerald-700 px-2 py-1 text-[11px] font-black">📥 התקבל</button>
                              <button type="button" onClick={() => updateDocStatus(doc, "approved")} className="rounded-md bg-emerald-100 text-emerald-800 px-2 py-1 text-[11px] font-black">✓ אושר</button>
                              <button type="button" onClick={() => updateDocStatus(doc, "missing")} className="rounded-md bg-rose-50 text-rose-700 px-2 py-1 text-[11px] font-black">❌ חסר</button>
                              <button type="button" onClick={() => updateDocStatus(doc, "not_required")} className="rounded-md bg-slate-100 text-slate-600 px-2 py-1 text-[11px] font-black">— לא רלוונטי</button>
                            </div>
                            <input className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white" placeholder="הערה למסמך..."
                              defaultValue={doc.notes || ""}
                              onBlur={(e) => updateDocStatus(doc, doc.status, e.target.value)} />
                            {(doc.received_at || doc.requested_at || doc.created_at) && (
                              <p className="mt-1 text-[10px] font-bold text-slate-400">עודכן: {formatDT(doc.received_at || doc.requested_at || doc.created_at)}</p>
                            )}
                            {/* Advisor review section — shown when client has uploaded a file */}
                            {doc.storage_path && (
                              <div className="mt-2 pt-2 border-t border-slate-100 space-y-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {doc.file_name && (
                                    <span className="text-[10px] font-bold text-slate-400">📎 {doc.file_name}</span>
                                  )}
                                  <span className="text-[10px] font-bold text-violet-500 ml-auto">הועלה ע"י לקוח</span>
                                </div>
                                <div className="flex gap-1.5 flex-wrap">
                                  <button type="button" onClick={() => openDocFile(doc)}
                                    className="rounded-md bg-sky-50 text-sky-700 border border-sky-200 px-2 py-1 text-[11px] font-black">
                                    🔍 פתח קובץ
                                  </button>
                                  <button type="button" onClick={() => reviewDoc(doc, "approved", "")}
                                    className="rounded-md bg-emerald-100 text-emerald-800 px-2 py-1 text-[11px] font-black">
                                    ✓ אשר
                                  </button>
                                  <button type="button" onClick={() => reviewDoc(doc, "rejected", reviewNotes[doc.id] || "")}
                                    className="rounded-md bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1 text-[11px] font-black">
                                    ✗ דחה
                                  </button>
                                </div>
                                <input
                                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white"
                                  placeholder="הערה לדחייה (אופציונלי)..."
                                  value={reviewNotes[doc.id] || ""}
                                  onChange={(e) => setReviewNotes((p) => ({ ...p, [doc.id]: e.target.value }))}
                                />
                                {doc.review_note && (
                                  <p className="text-[10px] text-rose-600">הערה קיימת: {doc.review_note}</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* בנק */}
                {tab === "bank" && (
                  <div className="space-y-4">

                    {/* ── Readiness indicator ── */}
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${bankTabDerived.isReady ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                      <span className="text-base shrink-0">{bankTabDerived.isReady ? "✅" : "⚠️"}</span>
                      <div className="flex-1 min-w-0">
                        {bankTabDerived.isReady ? (
                          <p className="text-xs font-black text-emerald-700">מוכן לשליחה לבנק — כל {bankTabDerived.readyReceivedDocs} מסמכים התקבלו</p>
                        ) : (
                          <p className="text-xs font-black text-amber-700">חסרים {missingDocs} מסמכים לפני שליחה לבנק ({bankTabDerived.readyReceivedDocs} מתוך {computedDocumentSummary.totalCount} התקבלו)</p>
                        )}
                      </div>
                      {!bankTabDerived.isReady && (
                        <button type="button" onClick={() => setTab("docs")} className="shrink-0 text-[11px] font-black px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors">
                          📄 מסמכים
                        </button>
                      )}
                    </div>

                    {/* ── Overall bank submission status ── */}
                    <div>
                      <label className="block text-xs font-black text-slate-400 mb-1">סטטוס הגשה כללי לבנק</label>
                      <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300"
                        value={bankSubmissionStatus}
                        onChange={(e) => {
                          setBankSubmissionStatus(e.target.value);
                          patchLead({ bankSubmissionStatus: e.target.value }, `סטטוס הגשה: ${BANK_SUBMISSION_STATUS_MAP[e.target.value] || e.target.value}`, "status_changed");
                        }}>
                        {BANK_SUBMISSION_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </div>

                    {/* ── Selected bankers ── */}
                    <div>
                      <p className="text-xs font-black text-slate-700 mb-2">בנקאים שנבחרו לתיק</p>
                      {caseBankers.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-5 text-center">
                          <p className="text-xs font-bold text-slate-400">עדיין לא נבחרו בנקאים לתיק זה</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {caseBankers.map((cb) => (
                            <div key={cb.id} className="rounded-xl border border-slate-100 bg-white p-3">
                              {/* Banker header */}
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-black text-slate-950">{cb.banker_name_snapshot}</span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${CASE_BANK_STATUS_STYLE[cb.status] || "bg-slate-100 text-slate-600"}`}>
                                      {CASE_BANK_STATUS_LABEL[cb.status] || cb.status}
                                    </span>
                                  </div>
                                  <p className="text-xs font-bold text-violet-600 mt-0.5">{cb.bank_name_snapshot}</p>
                                  {cb.sent_at && (
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">נשלח: {new Date(cb.sent_at).toLocaleDateString("he-IL")}</p>
                                  )}
                                </div>
                                <button type="button" onClick={() => removeBankerFromCase(cb.id)}
                                  className="shrink-0 text-[10px] font-black text-slate-400 hover:text-rose-600 transition-colors px-1.5 py-1 rounded-md hover:bg-rose-50">
                                  ✕ הסר
                                </button>
                              </div>

                              {/* Contact */}
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {cb.phone_snapshot && (
                                  <>
                                    <a href={`tel:${cb.phone_snapshot}`}
                                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-50 text-violet-700 text-[11px] font-black border border-violet-200">
                                      ☎ {cb.phone_snapshot}
                                    </a>
                                    <a href={`https://wa.me/${cb.phone_snapshot.replace(/[^\d]/g,"").replace(/^0/,"972")}`}
                                      target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-black border border-emerald-200">
                                      💬 WA
                                    </a>
                                  </>
                                )}
                                {cb.email_snapshot && (
                                  <a href={`mailto:${cb.email_snapshot}`}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 text-sky-700 text-[11px] font-black border border-sky-200">
                                    ✉ מייל
                                  </a>
                                )}
                              </div>

                              {/* Send actions */}
                              <div className="flex flex-wrap gap-1.5">
                                <button type="button" onClick={() => copyBankSummary(cb.banker_name_snapshot)}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-black hover:bg-slate-200 transition-colors">
                                  📋 העתק סיכום תיק
                                </button>
                                {cb.phone_snapshot && (
                                  <a href={`https://wa.me/${cb.phone_snapshot.replace(/[^\d]/g,"").replace(/^0/,"972")}?text=${encodeURIComponent(buildCaseSummaryText(cb.banker_name_snapshot))}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-black border border-emerald-200 hover:bg-emerald-100 transition-colors">
                                    💬 שלח ב-WA
                                  </a>
                                )}
                                {cb.email_snapshot && (
                                  <a href={`mailto:${cb.email_snapshot}?subject=${encodeURIComponent(`מסמכים לתיק משכנתא - ${lead.name || ""}`)}&body=${encodeURIComponent(buildCaseSummaryText(cb.banker_name_snapshot))}`}
                                    className="px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 text-[11px] font-black border border-sky-200 hover:bg-sky-100 transition-colors">
                                    ✉ שלח מייל
                                  </a>
                                )}
                                {cb.status !== "sent" && cb.status !== "approved" && (
                                  <button type="button" onClick={() => markSent(cb)}
                                    className="px-2.5 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-[11px] font-black border border-violet-200 hover:bg-violet-100 transition-colors">
                                    ✓ סמן כנשלח
                                  </button>
                                )}
                              </div>

                              {/* Per-banker note */}
                              <input
                                className="mt-2 w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-slate-50 outline-none focus:ring-1 focus:ring-violet-300"
                                placeholder="הערה לבנקאי זה (אופציונלי)..."
                                value={caseBankerNotes[cb.id] || cb.notes || ""}
                                onChange={(e) => setCaseBankerNotes((p) => ({ ...p, [cb.id]: e.target.value }))}
                                onBlur={(e) => {
                                  const val = e.target.value;
                                  fetch("/api/advisor/case-bankers", {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ id: cb.id, leadId: id, notes: val }),
                                  }).then((r) => r.ok ? r.json() : null).then((j) => {
                                    if (j?.caseBanker) setCaseBankers((prev) => prev.map((x) => x.id === cb.id ? j.caseBanker : x));
                                  }).catch(() => {});
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ── Add banker from directory ── */}
                    <div className="border-t border-slate-100 pt-3">
                      <p className="text-xs font-black text-slate-500 mb-2">הוסף בנקאי מהספר שלי</p>
                      {advisorBankers.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-4 text-center">
                          <p className="text-xs font-bold text-violet-600 mb-2">עדיין לא הוספת בנקאים לספר הבנקאים שלך</p>
                          <Link href="/advisor/bankers"
                            className="inline-block px-3 py-1.5 rounded-lg bg-violet-700 text-white text-xs font-black hover:bg-violet-800 transition-colors">
                            עבור לספר בנקאים ←
                          </Link>
                        </div>
                      ) : bankTabDerived.availableBankers.length === 0 ? (
                        <p className="text-xs font-bold text-slate-400">כל הבנקאים מספר הבנקאים שלך כבר נוספו לתיק זה.</p>
                      ) : (
                        <div className="flex gap-2">
                          <select
                            className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300"
                            value={selectedBankerId}
                            onChange={(e) => setSelectedBankerId(e.target.value)}
                          >
                            <option value="">בחר בנקאי מהספר...</option>
                            {bankTabDerived.availableBankers.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.banker_name} · {b.bank_name}{b.branch_name ? ` (${b.branch_name})` : ""}
                              </option>
                            ))}
                          </select>
                          <button type="button"
                            disabled={!selectedBankerId || addingBanker}
                            onClick={addBankerToCase}
                            className="shrink-0 px-4 py-2 rounded-xl bg-violet-700 text-white text-xs font-black disabled:opacity-50 hover:bg-violet-800 transition-colors">
                            {addingBanker ? "מוסיף..." : "+ הוסף"}
                          </button>
                        </div>
                      )}
                      <div className="mt-2">
                        <Link href="/advisor/bankers" className="text-[11px] font-black text-violet-600 hover:text-violet-800 transition-colors">
                          ← ניהול ספר הבנקאים
                        </Link>
                      </div>
                    </div>

                  </div>
                )}

                {/* פעילות — ציר זמן (Phase 5) */}
                {tab === "activity" && (
                  <div>
                    <p className="text-sm font-black text-slate-950 mb-4">ציר זמן — היסטוריית תיק</p>
                    {activities.length === 0 ? (
                      <div className="text-center py-10">
                        <p className="text-2xl mb-2">📅</p>
                        <p className="text-sm font-black text-slate-500">עדיין אין פעילות בתיק</p>
                        <p className="text-xs font-bold text-slate-400 mt-1">פעולות, עדכוני שלב ומסמכים יופיעו כאן</p>
                      </div>
                    ) : (
                      <div className="relative max-h-[520px] overflow-y-auto">
                        {/* Vertical timeline line */}
                        <div className="absolute right-5 top-0 bottom-0 w-px bg-slate-200" />
                        <div className="space-y-0">
                          {sortedActivities.map((act, idx) => (
                            <div key={`${act.created_at}-${idx}`} className="relative flex gap-4 pb-4">
                              {/* Timeline dot */}
                              <div className="relative z-10 shrink-0">
                                <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-base shadow-sm">
                                  {ACTIVITY_ICONS[act.activity_type] || "•"}
                                </div>
                              </div>
                              {/* Content */}
                              <div className="flex-1 bg-white rounded-xl border border-slate-100 px-3 py-2.5 min-w-0">
                                <p className="text-sm font-black text-slate-800">{act.title}</p>
                                {act.body && <p className="text-xs text-slate-500 mt-0.5">{act.body}</p>}
                                <p className="text-[11px] text-slate-400 mt-1">{formatDT(act.created_at)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* הערות */}
                {tab === "notes" && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-black text-slate-950">הערות פנימיות</p>
                      {savedIndicator && <span className="text-xs font-black text-emerald-600">נשמר ✓</span>}
                    </div>
                    <textarea
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white resize-y min-h-[160px] outline-none focus:ring-2 focus:ring-violet-300"
                      value={notes}
                      onChange={(e) => {
                        setNotes(e.target.value);
                        debouncedPatch("notes", { internalNotes: e.target.value, lastContactedAt: new Date().toISOString() }, "הערה עודכנה", "note_added", 500);
                      }}
                      placeholder="הערות, תיאום שיחה, עדכון סטטוס, חסרים..."
                    />
                  </div>
                )}

                {/* שמאות */}
                {tab === "appraisal" && (
                  <div>
                    <p className="text-sm font-black text-slate-950 mb-3">שמאות</p>
                    <div className="grid gap-2">
                      <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold" value={lead.appraisalStatus || "not_ordered"} onChange={(e) => patchLead({ appraisalStatus: e.target.value }, `שמאות: ${APPRAISAL_STATUS_LABELS[e.target.value]}`)}>
                        {APPRAISAL_STATUSES.map((s) => <option key={s} value={s}>{APPRAISAL_STATUS_LABELS[s]}</option>)}
                      </select>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-sky-500" style={{ width: `${appraisalPct}%` }} />
                      </div>
                      <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold" placeholder="שם שמאי" value={lead.appraiserName || ""} onChange={(e) => setLead((p) => ({ ...p, appraiserName: e.target.value }))} onBlur={(e) => patchLead({ appraiserName: e.target.value })} />
                      <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold" placeholder="טלפון שמאי" value={lead.appraiserPhone || ""} onChange={(e) => setLead((p) => ({ ...p, appraiserPhone: e.target.value }))} onBlur={(e) => patchLead({ appraiserPhone: e.target.value })} />
                      <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold" value={lead.appraisalDate?.slice(0, 10) || ""} onChange={(e) => setLead((p) => ({ ...p, appraisalDate: e.target.value }))} onBlur={(e) => patchLead({ appraisalDate: e.target.value })} />
                      <input type="number" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold" placeholder="עלות שמאות" value={lead.appraisalCost || ""} onChange={(e) => setLead((p) => ({ ...p, appraisalCost: e.target.value }))} onBlur={(e) => patchLead({ appraisalCost: e.target.value })} />
                    </div>
                  </div>
                )}

                {/* עו"ד */}
                {tab === "legal" && (
                  <div>
                    <p className="text-sm font-black text-slate-950 mb-3">עורכי דין</p>
                    <div className="grid gap-2">
                      <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold" placeholder='עו"ד קונה - שם' value={lead.buyerLawyerName || ""} onChange={(e) => setLead((p) => ({ ...p, buyerLawyerName: e.target.value }))} onBlur={(e) => patchLead({ buyerLawyerName: e.target.value })} />
                      <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold" placeholder='עו"ד קונה - טלפון' value={lead.buyerLawyerPhone || ""} onChange={(e) => setLead((p) => ({ ...p, buyerLawyerPhone: e.target.value }))} onBlur={(e) => patchLead({ buyerLawyerPhone: e.target.value })} />
                      <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold" placeholder='עו"ד מוכר - שם' value={lead.sellerLawyerName || ""} onChange={(e) => setLead((p) => ({ ...p, sellerLawyerName: e.target.value }))} onBlur={(e) => patchLead({ sellerLawyerName: e.target.value })} />
                      <div className="grid gap-1.5 mt-1">
                        {LEGAL_CHECKLIST.map((item) => (
                          <label key={item.key} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                            <input type="checkbox" checked={Boolean(lead[item.key])} onChange={(e) => { setLead((p) => ({ ...p, [item.key]: e.target.checked })); patchLead({ [item.key]: e.target.checked }); }} />
                            {item.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* חתימות */}
                {tab === "signing" && (
                  <div>
                    <p className="text-sm font-black text-slate-950 mb-3">חתימות</p>
                    <div className="grid gap-2">
                      <div>
                        <label className="block text-xs font-black text-slate-400 mb-1">תאריך חתימה</label>
                        <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold" value={lead.signingDate?.slice(0, 10) || ""} onChange={(e) => setLead((p) => ({ ...p, signingDate: e.target.value }))} onBlur={(e) => patchLead({ signingDate: e.target.value })} />
                      </div>
                      {lead.signingDate && (
                        <p className="text-xs font-black text-emerald-700">עוד {Math.max(0, Math.ceil((new Date(lead.signingDate) - new Date()) / 86400000))} ימים לחתימה</p>
                      )}
                      <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold" placeholder="מיקום חתימה" value={lead.signingLocation || ""} onChange={(e) => setLead((p) => ({ ...p, signingLocation: e.target.value }))} onBlur={(e) => patchLead({ signingLocation: e.target.value })} />
                      <textarea className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold min-h-[80px]" placeholder="הערות חתימה" value={lead.signingNotes || ""} onChange={(e) => setLead((p) => ({ ...p, signingNotes: e.target.value }))} onBlur={(e) => patchLead({ signingNotes: e.target.value })} />
                    </div>
                  </div>
                )}

                {/* בטחונות */}
                {tab === "collateral" && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-black text-slate-950">בטחונות</p>
                      <span className="text-xs font-black text-slate-500 tabular-nums">{collateralProgress}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${collateralProgress}%` }} />
                    </div>
                    <div className="grid gap-1.5 mb-4">
                      {COLLATERAL_CHECKLIST.map((item) => (
                        <label key={item.key} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                          <input type="checkbox" checked={Boolean(lead[item.key])} onChange={(e) => { setLead((p) => ({ ...p, [item.key]: e.target.checked })); patchLead({ [item.key]: e.target.checked }); }} />
                          {item.label}
                        </label>
                      ))}
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 mb-1.5">שחרור כספים</label>
                      <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold" value={lead.fundsReleaseStatus || "not_released"} onChange={(e) => patchLead({ fundsReleaseStatus: e.target.value }, `שחרור כספים: ${FUNDS_RELEASE_STATUS_LABELS[e.target.value]}`)}>
                        {FUNDS_RELEASE_STATUSES.map((s) => <option key={s} value={s}>{FUNDS_RELEASE_STATUS_LABELS[s]}</option>)}
                      </select>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Bank Guide Section (Phase 8) — refinance cases only */}
            {isRefinance && <BankGuideSection />}
          </div>

          {/* LEFT: Progress widgets */}
          <div className="space-y-2">
            <ProgressWidget label="מסמכים" pct={computedDocumentSummary.completionPercent} color="bg-violet-500" />
            <ProgressWidget label="שמאות" pct={appraisalPct} color="bg-sky-500" />
            <ProgressWidget label='עו"ד' pct={lawyerPct} color="bg-teal-500" />
            <ProgressWidget label="בטחונות" pct={collateralProgress} color="bg-amber-500" />
            <ProgressWidget label="שחרור כספים" pct={fundsPct} color="bg-green-500" />
            <ProgressWidget label="התקדמות כוללת" pct={overallProgress} color="bg-emerald-600" />
          </div>

        </div>

        {/* Mobile bottom bar */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 px-4 py-3 flex gap-2">
          {lead.phone && <a href={`tel:${lead.phone}`} className="flex-1 text-center text-xs font-black text-violet-700 bg-violet-50 rounded-xl py-2.5">☎ התקשר</a>}
          {lead.phone && <button type="button" onClick={() => openWa()} className="flex-1 text-center text-xs font-black text-emerald-700 bg-emerald-50 rounded-xl py-2.5">💬 WA</button>}
          {si >= 0 && si < ACTIVE_PIPELINE_STAGES.length - 1 && <button type="button" onClick={advanceStage} className="flex-1 text-center text-xs font-black text-white bg-violet-700 rounded-xl py-2.5">הבא ←</button>}
          <Link href="/advisor/my-leads" className="flex-1 text-center text-xs font-black text-slate-600 bg-slate-100 rounded-xl py-2.5">← חזרה</Link>
        </div>
      </main>

      {/* WhatsApp Template Manager modal */}
      {showWaTemplates && (
        <WaTemplateManager
          lead={lead}
          missingDocsList={computedDocumentSummary.missingDocuments}
          onClose={() => setShowWaTemplates(false)}
        />
      )}
    </>
  );
}
