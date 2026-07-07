import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatILS } from "../../../lib/format";
import { generateLeadPdf } from "../../../lib/generateLeadPdf";
import AdvisorHeader from "../../../components/AdvisorHeader";
import { useTheme } from "../../_app";
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

// Stage colors progress along the brand gradient as a deal advances:
// violet (new) → amber (bank review) → magenta (closing) → green (won),
// with the terminal "closed_lost" stage marked in danger red.
const STAGE_COLORS = [
  "bg-brand-300", "bg-brand-400", "bg-brand-500", "bg-brand-500",
  "bg-brand-600", "bg-brand-600", "bg-warning-300", "bg-warning-400",
  "bg-warning-400", "bg-warning-500", "bg-warning-500", "bg-warning-600",
  "bg-accent-400", "bg-accent-500", "bg-success-400", "bg-success-500",
  "bg-success-600", "bg-success-700", "bg-danger-500",
];
const STAGE_RING = [
  "ring-brand-300", "ring-brand-400", "ring-brand-500", "ring-brand-500",
  "ring-brand-600", "ring-brand-600", "ring-warning-300", "ring-warning-400",
  "ring-warning-400", "ring-warning-500", "ring-warning-500", "ring-warning-600",
  "ring-accent-400", "ring-accent-500", "ring-success-400", "ring-success-500",
  "ring-success-600", "ring-success-700", "ring-danger-500",
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
  { key: "audit",     label: "היסטוריה" },
  { key: "tasks",     label: "משימות" },
];

const ACTION_PANEL_ITEMS = [
  { key: "call",       label: "התקשר" },
  { key: "whatsapp",   label: "WhatsApp" },
  { key: "reminder",   label: "תזכורת" },
  { key: "stage",      label: "שינוי שלב" },
  { key: "docs",       label: "מסמכים" },
  { key: "banker",     label: "בנקאי" },
  { key: "pdf",        label: "יצוא PDF" },
  { key: "notes",      label: "הערה" },
  { key: "task",       label: "משימה" },
  { key: "email",      label: "מייל" },
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
  ready_to_send:        "bg-warning-50 text-warning-700",
  sent:                 "bg-accent-50 text-accent-700",
  waiting_for_response: "bg-brand-50 text-brand-700",
  approved:             "bg-success-50 text-success-700",
  rejected:             "bg-danger-50 text-danger-700",
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
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">מהלך הטיפול במשכנתא</h3>
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
          <div className={`h-full rounded-full transition-all duration-500 ${si >= 0 ? STAGE_COLORS[si] : "bg-brand-400"}`} style={{ width: `${getPipelineProgress(getStage(lead))}%` }} />
        </div>
        {si >= 0 && si < ACTIVE_PIPELINE_STAGES.length - 1 && (
          <button type="button" onClick={onAdvance} className={`shrink-0 text-xs font-black px-3 py-1.5 rounded-xl text-white transition-colors ${STAGE_COLORS[si + 1] || "bg-brand-500"} hover:opacity-90`}>
            הבא: {getPipelineStageLabel(ACTIVE_PIPELINE_STAGES[si + 1])} ←
          </button>
        )}
        {getStage(lead) === "closed_won" && (
          <span className="shrink-0 text-xs font-black text-success-700 bg-success-50 border border-success-200 px-3 py-1.5 rounded-xl">🎉 נסגר בהצלחה</span>
        )}
      </div>
    </div>
  );
});

// ─── Progress Widget ───────────────────────────────────────────────────────────
const ProgressWidget = memo(function ProgressWidget({ label, pct, color = "bg-success-500" }) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 px-4 py-3">
      <div className="flex justify-between text-xs font-black text-slate-500 dark:text-slate-400 mb-1.5">
        <span>{label}</span>
        <span className="tabular-nums">{p}%</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
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
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder="שם התבנית" />
                  <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[100px] resize-y outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" value={editBody} onChange={(e) => setEditBody(e.target.value)} placeholder="תוכן התבנית..." />
                  <p className="text-[11px] text-slate-400">משתנים: <code>{"{{name}}"}</code> <code>{"{{missing_documents}}"}</code></p>
                  <div className="flex gap-2">
                    <button type="button" onClick={saveEdit} className="rounded-lg bg-brand-700 text-white px-3 py-1.5 text-xs font-black">שמור</button>
                    <button type="button" onClick={() => setEditing(null)} className="rounded-lg bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-black">ביטול</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs font-black text-slate-800 mb-1">{tmpl.label}</p>
                  <p className="text-[11px] text-slate-500 whitespace-pre-line mb-2 line-clamp-3">{tmpl.body}</p>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => sendTemplate(tmpl)} className="rounded-lg bg-success-600 text-white px-3 py-1.5 text-[11px] font-black">שלח</button>
                    <button type="button" onClick={() => startEdit(tmpl)} className="rounded-lg bg-slate-200 text-slate-700 px-3 py-1.5 text-[11px] font-black">ערוך</button>
                    <button type="button" onClick={() => deleteTemplate(tmpl.key)} className="rounded-lg bg-danger-50 text-danger-700 px-3 py-1.5 text-[11px] font-black">מחק</button>
                  </div>
                </>
              )}
            </div>
          ))}
          {editing && editing.startsWith("new_") && (
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 space-y-2">
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder="שם התבנית" autoFocus />
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[100px] resize-y outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" value={editBody} onChange={(e) => setEditBody(e.target.value)} placeholder="תוכן התבנית..." />
              <p className="text-[11px] text-slate-400">משתנים: <code>{"{{name}}"}</code> <code>{"{{missing_documents}}"}</code></p>
              <div className="flex gap-2">
                <button type="button" onClick={saveEdit} className="rounded-lg bg-brand-700 text-white px-3 py-1.5 text-xs font-black">שמור</button>
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
  danger:  { bar: "bg-danger-50 border-danger-200",  dot: "bg-danger-500",   text: "text-danger-700" },
  warning: { bar: "bg-warning-50 border-warning-200", dot: "bg-warning-400",  text: "text-warning-700" },
  info:    { bar: "bg-accent-50 border-accent-200", dot: "bg-accent-400", text: "text-accent-700" },
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
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-right hover:bg-slate-50/60 dark:hover:bg-slate-700/60 transition-colors"
      >
        <div>
          <h2 className="text-sm font-black text-slate-950 dark:text-white">הפקת דוח יתרות לסילוק</h2>
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
                  {bank.phone && <span className="text-xs font-bold text-brand-600">{bank.phone}</span>}
                </div>
                <span className="text-slate-400 text-sm shrink-0 mr-2">{expanded === bank.key ? "▲" : "▼"}</span>
              </button>
              {expanded === bank.key && (
                <div className="px-5 pb-4 space-y-2">
                  <ol className="space-y-1.5">
                    {bank.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                        <span className="font-black text-brand-600 shrink-0 tabular-nums">{i + 1}.</span>
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

function ActionIcon({ type }) {
  const s = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (type) {
    case "call": return <svg {...s}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>;
    case "whatsapp": return <svg {...s}><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>;
    case "reminder": return <svg {...s}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    case "stage": return <svg {...s}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>;
    case "docs": return <svg {...s}><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>;
    case "banker": return <svg {...s}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
    case "pdf": return <svg {...s}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
    case "notes": return <svg {...s}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
    case "task": return <svg {...s}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
    case "email": return <svg {...s}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>;
    default: return null;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LeadDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const isNewPurchase = router.query.newPurchase === "1";

  const [lead, setLead] = useState(null);
  const [loadFailed, setLoadFailed] = useState("");
  const [activities, setActivities] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [notes, setNotes] = useState("");
  const [nextActionText, setNextActionText] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [tab, setTab] = useState("docs");
  // Support ?tab= deep-link from dashboard attention items.
  // Read in an effect so server and client render the same initial markup.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("tab");
    const valid = ["docs", "bank", "activity", "notes", "appraisal", "legal", "signing", "collateral", "audit", "tasks"];
    if (p && valid.includes(p)) setTab(p);
  }, []);
  const [showWaTemplates, setShowWaTemplates] = useState(false);
  const [msg, setMsg] = useState({ text: "", ok: true });
  const [activeAction, setActiveAction] = useState(null);
  const [taskText, setTaskText] = useState("");
  const [tasks, setTasks] = useState([]);
  const [waMessage, setWaMessage] = useState("");
  const [reminderPriority, setReminderPriority] = useState("normal");
  const [nextActionTime, setNextActionTime] = useState("");
  const [reminderNote, setReminderNote] = useState("");
  const { dark } = useTheme();

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
    // The lead itself is the only load-blocking call. Auxiliary data
    // (activities, documents, bankers, tasks...) degrades to empty on failure
    // instead of ejecting the advisor from a perfectly good case (QA AD-3).
    const aux = (url, fallback) =>
      fetch(url).then((r) => (r.ok ? r.json() : fallback)).catch(() => fallback);
    Promise.all([
      fetch(`/api/advisor/my-leads?leadId=${id}`)
        .then((r) => {
          if (r.status === 401) { window.location.href = "/advisor/login"; return null; }
          return r.ok ? r.json() : { lead: null };
        })
        .catch(() => ({ lead: null, _networkError: true })),
      aux(`/api/advisor/activities?leadId=${id}`, { activities: [] }),
      aux(`/api/advisor/documents?leadId=${id}`, { documents: [] }),
      aux(`/api/advisor/document-upload-token?leadId=${id}`, { token: null, uploadUrl: null }),
      aux(`/api/advisor/document-reminders?leadId=${id}`, { reminder: null }),
      aux("/api/advisor/bankers", { bankers: [] }),
      aux(`/api/advisor/case-bankers?leadId=${id}`, { caseBankers: [] }),
      aux(`/api/advisor/tasks?leadId=${id}`, { tasks: [] }),
    ]).then(([leadsData, actData, docsData, tokenData, reminderData, bankersData, caseBankersData, tasksData]) => {
      if (!leadsData) return; // redirected to login
      const found = leadsData.lead || (leadsData.leads || []).find((l) => l.id === id);
      if (!found) { setLoadFailed(leadsData._networkError ? "network" : "not_found"); setLoading(false); return; }
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
      const loadedTasks = Array.isArray(tasksData.tasks) ? tasksData.tasks : [];
      setTasks(loadedTasks.map(t => ({ id: t.id, text: t.title, done: t.completed || t.status === "completed", priority: t.priority, dueDate: t.dueDate })));
      setLoading(false);
    }).catch(() => { setLoadFailed("network"); setLoading(false); });
  }, [id]);

  function showSaved() {
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 2500);
  }

  function pushActivity(title, activityType = "note_added") {
    setActivities((prev) => [{ title, created_at: new Date().toISOString(), activity_type: activityType }, ...prev]);
    fetch("/api/advisor/activities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: id, activityType, title }) }).catch(() => {});
  }

  function loadTasks() {
    if (!id) return;
    fetch(`/api/advisor/tasks?leadId=${encodeURIComponent(id)}`).then(r => r.ok ? r.json() : null).then(data => {
      if (data?.tasks) setTasks(data.tasks.map(t => ({ id: t.id, text: t.title, done: t.completed || t.status === "completed", priority: t.priority, dueDate: t.dueDate })));
    }).catch(() => {});
  }

  function addTaskToApi(text) {
    const temp = { text, done: false, id: `temp_${Date.now()}` };
    setTasks(p => [...p, temp]);
    pushActivity(`משימה: ${text}`, "note_added");
    setTaskText("");
    fetch("/api/advisor/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: id, title: text }) })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.task) setTasks(p => p.map(t => t.id === temp.id ? { id: data.task.id, text: data.task.title, done: false, priority: data.task.priority, dueDate: data.task.dueDate } : t)); })
      .catch(() => {});
  }

  function toggleTaskDone(task) {
    setTasks(p => p.map(x => x.id === task.id ? { ...x, done: !x.done } : x));
    if (!task.done) {
      fetch("/api/advisor/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId: task.id, action: "complete" }) }).catch(() => {});
    } else {
      fetch("/api/advisor/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId: task.id, status: "pending" }) }).catch(() => {});
    }
  }

  function deleteTaskApi(taskId) {
    setTasks(p => p.filter(t => t.id !== taskId));
    fetch(`/api/advisor/tasks?taskId=${encodeURIComponent(taskId)}`, { method: "DELETE" }).catch(() => {});
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
      <main dir="rtl" className="min-h-screen bg-slate-50 dark:bg-[#0B1120]">
        <AdvisorHeader />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-4" />
          <div className="grid lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl h-64 animate-pulse" />)}
          </div>
        </div>
      </main>
    );
  }
  if (!lead) {
    return (
      <main dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <AdvisorHeader active="/advisor/my-leads" />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <p className="text-3xl mb-3">{loadFailed === "network" ? "⚠️" : "🔍"}</p>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-2">
            {loadFailed === "network" ? "שגיאה בטעינת התיק" : "התיק לא נמצא"}
          </h2>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6">
            {loadFailed === "network"
              ? "בעיית תקשורת זמנית — הנתונים שלך במקומם. נסו לרענן."
              : "ייתכן שהקישור שגוי או שהליד אינו משויך אליך."}
          </p>
          <div className="flex justify-center gap-2">
            {loadFailed === "network" && (
              <button type="button" onClick={() => window.location.reload()} className="rounded-full bg-brand-700 text-white px-6 py-2.5 text-sm font-black hover:bg-brand-800 transition-colors">רענון</button>
            )}
            <Link href="/advisor/my-leads" className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-2.5 text-sm font-black text-slate-700 dark:text-slate-300">← לכל הלידים</Link>
          </div>
        </div>
      </main>
    );
  }

  function handleActionClick(key) {
    if (key === "call") {
      if (lead.phone) {
        window.location.href = `tel:${lead.phone}`;
        pushActivity("בוצעה שיחה", "call_logged");
        touchLead({ lastContactedAt: new Date().toISOString() });
      }
      return;
    }
    if (key === "email") {
      const email = lead.email || lead.advisorEmail;
      if (email) {
        window.location.href = `mailto:${email}`;
        pushActivity("נשלח מייל", "email_opened");
        touchLead({ lastContactedAt: new Date().toISOString() });
      }
      return;
    }
    setActiveAction((prev) => prev === key ? null : key);
  }


  return (
    <>
      <Head><title>{lead.name || "ליד"} | FINZO PRO</title><meta name="robots" content="noindex,nofollow" /></Head>
      <main dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 lg:pb-0">
        <AdvisorHeader active="/advisor/my-leads" />

        {/* Sticky header */}
        <div className="sticky top-14 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-[1440px] mx-auto px-4 py-2.5 flex items-center gap-3 flex-wrap">
            <Link href="/advisor/my-leads" className="text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0">← חזרה</Link>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate flex-1">{lead.name || "—"}</h1>
            {lead.phone && <a href={`tel:${lead.phone}`} className="text-sm font-semibold text-brand-600 dark:text-brand-400 shrink-0 tabular-nums">{lead.phone}</a>}
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 shrink-0">{getPipelineStageLabel(getStage(lead))}</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-300 border border-success-200 dark:border-success-800 shrink-0 tabular-nums">{overallProgress}%</span>
            {missingDocs > 0 && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-warning-50 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300 border border-warning-200 dark:border-warning-800 shrink-0">חסרים {missingDocs}</span>}
            {saving && <span className="text-[11px] text-slate-400 font-medium shrink-0">שומר...</span>}
            {savedIndicator && !saving && <span className="text-[11px] text-success-600 dark:text-success-400 font-semibold shrink-0">נשמר</span>}
          </div>
        </div>

        {isNewPurchase && (
          <div className="max-w-[1440px] mx-auto mt-3 px-4">
            <div className="rounded-xl bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 px-4 py-3 flex items-center gap-3">
              <span className="text-success-600 dark:text-success-400 shrink-0 font-bold">✓</span>
              <p className="text-sm font-semibold text-success-800 dark:text-success-300 flex-1">הליד נרכש — אפשר להתחיל טיפול</p>
            </div>
          </div>
        )}

        {msg.text && (
          <div className={`max-w-[1440px] mx-auto mt-3 px-4`}>
            <div className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${msg.ok ? "bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300 border border-success-200 dark:border-success-800" : "bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-300 border border-danger-200 dark:border-danger-800"}`}>
              {msg.text}
            </div>
          </div>
        )}

        {/* Mobile action bar */}
        <div className="lg:hidden max-w-[1440px] mx-auto px-4 mt-3">
          <div className="flex gap-1.5 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {ACTION_PANEL_ITEMS.map((item) => (
              <button key={item.key} type="button" onClick={() => handleActionClick(item.key)}
                className={`flex-none flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                  activeAction === item.key
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600"
                }`}>
                <ActionIcon type={item.key} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mobile client summary (collapsed) */}
        <div className="lg:hidden max-w-[1440px] mx-auto px-4 mt-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {[
                ["שם", lead.name],
                ["טלפון", lead.phone],
                ["מייל", lead.email || lead.advisorEmail],
                ["משכנתא", lead.mortgageAmount ? formatILS(lead.mortgageAmount) : null],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-1">
                  <span className="text-slate-400 dark:text-slate-500 font-medium">{label}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate text-left">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main 3-column grid */}
        <div className="max-w-[1440px] mx-auto px-4 py-4 grid lg:grid-cols-[220px_1fr_260px] gap-5 items-start">

          {/* Column 1 — RIGHT in RTL: Action Panel */}
          <aside className="hidden lg:block lg:sticky lg:top-[7.5rem]">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-1.5 space-y-0.5">
              {ACTION_PANEL_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleActionClick(item.key)}
                  className={`w-full flex items-center gap-2.5 px-3 h-10 rounded-lg transition-all text-right ${
                    activeAction === item.key
                      ? "bg-brand-600 text-white"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <span className="shrink-0 opacity-80"><ActionIcon type={item.key} /></span>
                  <span className="text-xs font-semibold">{item.label}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Column 2 — CENTER: Workspace */}
          <div className="min-w-0">
            {activeAction ? (
              /* ── Active Action Workspace ── */
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 animate-slide-up">
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="text-slate-500 dark:text-slate-400"><ActionIcon type={activeAction} /></span>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{ACTION_PANEL_ITEMS.find((a) => a.key === activeAction)?.label}</h2>
                  </div>
                  <button type="button" onClick={() => setActiveAction(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

                {/* WhatsApp */}
                {activeAction === "whatsapp" && (
                  <div className="space-y-4">
                    {/* Template selector */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">תבניות מוכנות</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "intro", label: "פתיחת קשר ראשוני", text: `שלום ${lead.name || ""},\nשמי ${lead.assignedAdvisor || "יועץ"} מ-FINZO.\nפנית אלינו בנושא משכנתא ואשמח לעזור לך.\nמתי נוח לך לשיחה קצרה?` },
                          { id: "docs", label: "בקשת מסמכים", text: `שלום ${lead.name || ""},\nכדי להתקדם בתיק המשכנתא שלך, אשמח לקבל את המסמכים הבאים:\n- תלושי שכר 3 חודשים אחרונים\n- דפי חשבון בנק\n- צילום תעודת זהות\n\nאפשר לשלוח כאן בוואטסאפ.` },
                          { id: "reminder", label: "תזכורת ללקוח", text: `שלום ${lead.name || ""},\nתזכורת ידידותית — עדיין ממתינים למסמכים שביקשנו.\nיש משהו שאני יכול לעזור בו?` },
                          { id: "status", label: "עדכון סטטוס", text: `שלום ${lead.name || ""},\nרציתי לעדכן אותך לגבי התקדמות תיק המשכנתא שלך.\nהתיק נמצא בשלב: ${getPipelineStageLabel(getStage(lead))}.\nאשמח לענות על כל שאלה.` },
                        ].map((tpl) => (
                          <button key={tpl.id} type="button" onClick={() => setWaMessage(tpl.text)}
                            className={`text-right rounded-lg px-3 py-2.5 text-xs font-semibold transition-all border ${waMessage === tpl.text ? "bg-brand-600 text-white border-brand-600" : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600"}`}>
                            {tpl.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Message preview */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">תצוגה מקדימה</label>
                      <textarea className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-3 text-sm resize-y min-h-[120px] outline-none focus:ring-2 focus:ring-brand-500/30"
                        value={waMessage || ""} onChange={(e) => setWaMessage(e.target.value)}
                        placeholder="בחר תבנית או כתוב הודעה חופשית..." />
                    </div>
                    {/* Send buttons */}
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { const text = encodeURIComponent(waMessage || ""); window.open(`https://wa.me/${(lead.phone||"").replace(/\D/g,"")}?text=${text}`, "_blank"); pushActivity("נשלחה הודעת WhatsApp", "whatsapp_sent"); }}
                        className="flex-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white py-3 text-sm font-semibold transition-colors" disabled={!waMessage}>
                        שלח ב-WhatsApp
                      </button>
                      <button type="button" onClick={() => openWa()}
                        className="shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        פתח שיחה
                      </button>
                    </div>
                    {missingDocs > 0 && (
                      <button type="button" onClick={sendMissingDocsWa} className="w-full rounded-lg bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-300 border border-warning-200 dark:border-warning-800 py-2.5 text-xs font-semibold hover:bg-warning-100 dark:hover:bg-warning-900/30 transition-colors">
                        שלח בקשת מסמכים חסרים ({missingDocs})
                      </button>
                    )}
                  </div>
                )}

                {/* Reminder */}
                {activeAction === "reminder" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">פעולה הבאה</label>
                      <input type="text" className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                        placeholder="מה הפעולה הבאה?" value={nextActionText}
                        onChange={(e) => { setNextActionText(e.target.value); debouncedPatch("nextAction", { nextAction: e.target.value }, e.target.value ? `פעולה הבאה: ${e.target.value}` : undefined, "reminder_set"); }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">תאריך מעקב</label>
                        <input type="date"
                          className={`w-full border rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 ${isOverdue(nextActionDate) ? "border-danger-300 dark:border-danger-700" : "border-slate-200 dark:border-slate-700"}`}
                          value={nextActionDate}
                          onChange={(e) => { setNextActionDate(e.target.value); debouncedPatch("nextActionDate", { nextActionAt: nextActionTime && e.target.value ? `${e.target.value}T${nextActionTime}` : e.target.value }, undefined, "reminder_set"); }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">שעה</label>
                        <input type="time"
                          className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                          value={nextActionTime}
                          onChange={(e) => { setNextActionTime(e.target.value); if (nextActionDate) debouncedPatch("nextActionDate", { nextActionAt: e.target.value ? `${nextActionDate}T${e.target.value}` : nextActionDate }, undefined, "reminder_set"); }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">עדיפות</label>
                      <div className="flex gap-1.5">
                        {[{ key: "normal", label: "רגיל", color: "slate" }, { key: "high", label: "גבוה", color: "amber" }, { key: "urgent", label: "דחוף", color: "red" }].map((p) => (
                          <button key={p.key} type="button" onClick={() => setReminderPriority(p.key)}
                            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all border ${reminderPriority === p.key
                              ? p.key === "urgent" ? "bg-danger-600 text-white border-danger-600" : p.key === "high" ? "bg-warning-500 text-white border-warning-500" : "bg-brand-600 text-white border-brand-600"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600"
                            }`}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">הערה פנימית</label>
                      <textarea className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm resize-y min-h-[60px] outline-none focus:ring-2 focus:ring-brand-500/30"
                        value={reminderNote} onChange={(e) => setReminderNote(e.target.value)}
                        placeholder="הערה לתזכורת..." />
                    </div>
                    <button type="button" onClick={() => {
                      const at = nextActionTime && nextActionDate ? `${nextActionDate}T${nextActionTime}` : nextActionDate;
                      const priorityHe = reminderPriority === "normal" ? "רגיל" : "גבוה";
                      const title = [nextActionText ? `תזכורת: ${nextActionText}` : "תזכורת נשמרה", reminderNote ? `— ${reminderNote}` : ""].filter(Boolean).join(" ");
                      debouncedPatch("nextAction", { nextAction: nextActionText, nextActionAt: at, leadPriority: priorityHe }, title, "reminder_set");
                      setReminderNote("");
                    }}
                      className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 text-white py-3 text-sm font-semibold transition-colors">
                      שמור תזכורת
                    </button>
                    {uploadToken && (
                      <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">זמן יעד להעלאה</p>
                        <div className="flex gap-1.5 flex-wrap mb-3">
                          {[24, 48, 72].map((h) => (
                            <button key={h} type="button" onClick={() => setReminderHours(h)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-300 dark:hover:border-brand-600 hover:text-brand-600 transition-colors">
                              {h} שעות
                            </button>
                          ))}
                        </div>
                        {reminderStatusLabel && (
                          <div className="rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 px-3 py-2">
                            <p className="text-xs font-semibold text-brand-700 dark:text-brand-300">{reminderStatusLabel}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Stage change */}
                {activeAction === "stage" && (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 p-3 mb-4">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">שלב נוכחי</p>
                      <p className="text-sm font-bold text-brand-700 dark:text-brand-300">{getPipelineStageLabel(getStage(lead))}</p>
                    </div>
                    <StageStepper lead={lead} onAdvance={advanceStage} onSetStage={setStage} />
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">בחר שלב</label>
                      <select className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/30" value={getStage(lead)} onChange={(e) => setStage(e.target.value)}>
                        <optgroup label="Pipeline פעיל">
                          {ACTIVE_PIPELINE_STAGES.map((s) => <option key={s} value={s}>{getPipelineStageLabel(s)}</option>)}
                        </optgroup>
                        <optgroup label="יצא מהתהליך">
                          <option value="closed_lost">{getPipelineStageLabel("closed_lost")}</option>
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">סיבה/הערה לשינוי</label>
                      <input type="text" className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30"
                        placeholder="למה משנים שלב?" />
                    </div>
                    {si >= 0 && si < ACTIVE_PIPELINE_STAGES.length - 1 && (
                      <button type="button" onClick={advanceStage}
                        className="w-full text-sm font-semibold px-4 py-3 rounded-lg text-white bg-brand-600 hover:bg-brand-700 transition-colors">
                        הבא: {getPipelineStageLabel(ACTIVE_PIPELINE_STAGES[si + 1])}
                      </button>
                    )}
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">* שינוי שלב נרשם אוטומטית בפעילות התיק</p>
                  </div>
                )}

                {/* Documents link */}
                {activeAction === "docs" && (
                  <div className="space-y-4">
                    {uploadToken ? (
                      <>
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5">
                          <span className="text-xs text-slate-500 dark:text-slate-400 truncate flex-1 font-mono" style={{ direction: "ltr" }}>{uploadToken.url}</span>
                          <button type="button" onClick={copyUploadLink} className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-md bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 hover:bg-brand-200 dark:hover:bg-brand-900/50 transition-colors">{linkCopied ? "הועתק" : "העתק"}</button>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {lead?.phone && <button type="button" onClick={openWaWithUploadLink} className="flex-1 rounded-lg bg-brand-600 text-white py-2.5 text-xs font-semibold hover:bg-brand-700 transition-colors">שלח ב-WA</button>}
                          <button type="button" onClick={generateUploadToken} disabled={tokenLoading} className="flex-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-semibold disabled:opacity-50 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:hover:border-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300 transition-colors">{tokenLoading ? "יוצר..." : "חדש קישור"}</button>
                          <button type="button" onClick={revokeUploadToken} className="flex-1 rounded-lg bg-danger-50 dark:bg-danger-900/20 text-danger-600 dark:text-danger-400 border border-danger-200 dark:border-danger-800 py-2.5 text-xs font-semibold hover:bg-danger-100 dark:hover:bg-danger-900/30 transition-colors">בטל</button>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">תוקף: {uploadToken.record?.expires_at ? new Date(uploadToken.record.expires_at).toLocaleDateString("he-IL") : "—"}</p>
                      </>
                    ) : (
                      <button type="button" onClick={generateUploadToken} disabled={tokenLoading} className="w-full rounded-lg bg-brand-600 text-white py-3 text-sm font-semibold disabled:opacity-50 hover:bg-brand-700 transition-colors">
                        {tokenLoading ? "יוצר קישור..." : "צור קישור להעלאה"}
                      </button>
                    )}
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-500 dark:text-slate-400">השלמת מסמכים</span>
                        <span className="text-brand-600 dark:text-brand-400">{computedDocumentSummary.completionPercent}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-600 rounded-full transition-all" style={{ width: `${computedDocumentSummary.completionPercent}%` }} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 p-2.5 text-center">
                          <p className="text-lg font-bold text-danger-700 dark:text-danger-300 tabular-nums">{computedDocumentSummary.statusCounts.missing}</p>
                          <p className="text-[10px] font-semibold text-danger-600 dark:text-danger-400">חסרים</p>
                        </div>
                        <div className="rounded-lg bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 p-2.5 text-center">
                          <p className="text-lg font-bold text-success-700 dark:text-success-300 tabular-nums">{computedDocumentSummary.statusCounts.approved + computedDocumentSummary.statusCounts.received}</p>
                          <p className="text-[10px] font-semibold text-success-600 dark:text-success-400">התקבלו</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Banker assignment */}
                {activeAction === "banker" && (
                  <div className="space-y-4">
                    {advisorBankers.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-3">עדיין לא הוספת בנקאים</p>
                        <Link href="/advisor/bankers" className="inline-block px-4 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors">עבור לספר בנקאים</Link>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <select className="flex-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/30" value={selectedBankerId} onChange={(e) => setSelectedBankerId(e.target.value)}>
                            <option value="">בחר בנקאי...</option>
                            {bankTabDerived.availableBankers.map((b) => <option key={b.id} value={b.id}>{b.banker_name} · {b.bank_name}</option>)}
                          </select>
                          <button type="button" disabled={!selectedBankerId || addingBanker} onClick={addBankerToCase} className="shrink-0 px-4 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold disabled:opacity-50 hover:bg-brand-700 transition-colors">{addingBanker ? "..." : "הוסף"}</button>
                        </div>
                        {caseBankers.length > 0 && (
                          <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">בנקאים בתיק ({caseBankers.length})</p>
                            {caseBankers.map((cb) => (
                              <div key={cb.id} className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-2">
                                <div className="min-w-0">
                                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{cb.banker_name_snapshot}</span>
                                  <span className="text-[10px] text-brand-600 dark:text-brand-400 mr-2">{cb.bank_name_snapshot}</span>
                                </div>
                                <button type="button" onClick={() => removeBankerFromCase(cb.id)} className="text-[10px] font-semibold text-slate-400 hover:text-danger-500 dark:hover:text-danger-400 transition-colors">הסר</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-3">
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">סטטוס שליחה לבנק</label>
                      <select className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/30"
                        value={bankSubmissionStatus} onChange={(e) => { setBankSubmissionStatus(e.target.value); patchLead({ bankSubmissionStatus: e.target.value }, `סטטוס בנק: ${e.target.value}`, "status_changed"); }}>
                        <option value="not_submitted">טרם הוגש</option>
                        <option value="submitted">הוגש</option>
                        <option value="approved">אושר</option>
                        <option value="rejected">נדחה</option>
                        <option value="negotiation">במשא ומתן</option>
                      </select>
                    </div>
                    <div className="mt-2">
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">שליחה אחרונה: {lead.bankSubmittedAt ? new Date(lead.bankSubmittedAt).toLocaleDateString("he-IL") : "טרם"}</p>
                    </div>
                  </div>
                )}

                {/* PDF export */}
                {activeAction === "pdf" && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                      <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">סיכום תיק</h3>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          ["לקוח", lead.name || "—"],
                          ["שלב", getPipelineStageLabel(getStage(lead))],
                          ["סוג תיק", lead.mortgageType || "—"],
                          ["בנק", lead.bankName || "טרם נבחר"],
                          ["סכום משכנתא", lead.mortgageAmount ? formatILS(lead.mortgageAmount) : "—"],
                          ["הון עצמי", lead.equity ? formatILS(lead.equity) : "—"],
                          ["מסמכים", `${computedDocumentSummary.receivedCount}/${computedDocumentSummary.totalCount}`],
                          ["התקדמות", `${overallProgress}%`],
                        ].map(([label, value]) => (
                          <div key={label} className="flex justify-between gap-1">
                            <span className="text-slate-400 dark:text-slate-500 font-medium">{label}</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-left">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {caseBankers.length > 0 && (
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
                        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">בנקאים בתיק</h3>
                        {caseBankers.map(cb => (
                          <p key={cb.id} className="text-xs text-slate-600 dark:text-slate-400">{cb.banker_name_snapshot} · {cb.bank_name_snapshot}</p>
                        ))}
                      </div>
                    )}
                    <button type="button" onClick={() => generateLeadPdf(lead, documents, activities)}
                      className="w-full rounded-lg bg-brand-700 hover:bg-brand-800 text-white py-3 text-sm font-semibold transition-colors">
                      📄 הפק דוח PDF
                    </button>
                  </div>
                )}

                {/* Notes */}
                {activeAction === "notes" && (
                  <div>
                    <div className="mb-3">
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">סוג הערה</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {["כללי", "לקוח", "בנק", "מסמכים", "פנימי"].map(type => (
                          <button key={type} type="button"
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600 transition-colors">
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-3 text-sm resize-y min-h-[200px] outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                      value={notes}
                      onChange={(e) => {
                        setNotes(e.target.value);
                        debouncedPatch("notes", { internalNotes: e.target.value, lastContactedAt: new Date().toISOString() }, "הערה עודכנה", "note_added", 500);
                      }}
                      placeholder="הערות, תיאום שיחה, עדכון סטטוס..."
                    />
                    {activities.length > 0 && (
                      <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">פעילות אחרונה</p>
                        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                          {activities.slice(0, 5).map((act, i) => (
                            <div key={i} className="rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-2">
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{act.title}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(act.created_at).toLocaleDateString("he-IL")} · {new Date(act.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Task */}
                {activeAction === "task" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 p-2.5 text-center">
                        <p className="text-lg font-bold text-warning-700 dark:text-warning-300 tabular-nums">{tasks.filter(t => !t.done).length}</p>
                        <p className="text-[10px] font-semibold text-warning-600 dark:text-warning-400">פתוחות</p>
                      </div>
                      <div className="rounded-lg bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 p-2.5 text-center">
                        <p className="text-lg font-bold text-success-700 dark:text-success-300 tabular-nums">{tasks.filter(t => t.done).length}</p>
                        <p className="text-[10px] font-semibold text-success-600 dark:text-success-400">הושלמו</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" className="flex-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/30"
                        placeholder="תיאור המשימה..." value={taskText} onChange={(e) => setTaskText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && taskText.trim()) { addTaskToApi(taskText); } }}
                      />
                      <button type="button" onClick={() => { if (taskText.trim()) { addTaskToApi(taskText); } }}
                        className="shrink-0 px-4 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors">הוסף</button>
                    </div>
                    {tasks.length > 0 && (
                      <div className="space-y-1.5">
                        {tasks.map((t) => (
                          <label key={t.id} className="flex items-center gap-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                            <input type="checkbox" checked={t.done} onChange={() => toggleTaskDone(t)} className="accent-brand-600" />
                            <span className={t.done ? "line-through text-slate-400 dark:text-slate-500" : ""}>{t.text}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Call */}
                {activeAction === "call" && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto rounded-full bg-brand-50 dark:bg-brand-900/20 border-2 border-brand-200 dark:border-brand-800 flex items-center justify-center mb-3">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-600 dark:text-brand-400"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      </div>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">{lead.phone || "—"}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{lead.name}</p>
                    </div>
                    <a href={`tel:${lead.phone}`} className="block w-full rounded-lg bg-brand-600 hover:bg-brand-700 text-white py-3 text-sm font-semibold text-center transition-colors">
                      התקשר עכשיו
                    </a>
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">סיכום שיחה</label>
                      <textarea className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm resize-y min-h-[80px] outline-none focus:ring-2 focus:ring-brand-500/30"
                        placeholder="רשום תקציר השיחה..." />
                      <button type="button" onClick={() => { pushActivity("שיחה טלפונית", "call_made"); patchLead({ lastContactedAt: new Date().toISOString() }); }}
                        className="mt-2 w-full rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 py-2 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        שמור ורשום פעילות
                      </button>
                    </div>
                  </div>
                )}

                {/* Email */}
                {activeAction === "email" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">נמען</label>
                      <input type="email" className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30"
                        value={lead.email || lead.advisorEmail || ""} readOnly />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">נושא</label>
                      <input type="text" className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30"
                        placeholder="נושא ההודעה..." />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">תבנית</label>
                      <div className="flex gap-1.5 flex-wrap mb-2">
                        {["עדכון סטטוס", "בקשת מסמכים", "סיכום פגישה"].map(t => (
                          <button key={t} type="button" className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600 transition-colors">{t}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">תוכן</label>
                      <textarea className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-3 text-sm resize-y min-h-[150px] outline-none focus:ring-2 focus:ring-brand-500/30"
                        placeholder="כתוב את תוכן המייל..." />
                    </div>
                    <button type="button" onClick={() => { pushActivity("נשלח מייל", "email_sent"); }}
                      className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 text-white py-3 text-sm font-semibold transition-colors">
                      שלח מייל
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* ── Default Center Content ── */
              <div className="space-y-4">
                <StageStepper lead={lead} onAdvance={advanceStage} onSetStage={setStage} />

                {/* Attention Flags */}
                {attentionFlags.length > 0 && (
                  <div className="space-y-2">
                    {attentionFlags.map((flag, i) => {
                      const s = FLAG_STYLES[flag.type] || FLAG_STYLES.stale;
                      return (
                        <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${s.bar} dark:bg-slate-900 dark:border-slate-800`}>
                          <span className={`h-2 w-2 rounded-full shrink-0 ${s.dot}`} />
                          <span className={`text-xs font-semibold ${s.text} dark:text-slate-300`}>{flag.text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Deal details */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">פרטי העסקה</h2>
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">סוג תיק</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {CASE_TYPES.map((ct) => (
                        <button key={ct} type="button" onClick={() => patchLead({ mortgageType: ct }, `סוג תיק: ${ct}`, "status_changed")}
                          className={`rounded-lg px-3 py-2 text-xs font-semibold text-right transition-all border ${
                            caseType === ct
                              ? "bg-brand-600 text-white border-brand-600"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600"
                          }`}>
                          {ct}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">בנק</label>
                    <select className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/30" value={lead.bankName || ""} onChange={(e) => patchLead({ bankName: e.target.value }, e.target.value ? `בנק: ${e.target.value}` : "")}>
                      <option value="">בחר בנק...</option>
                      {BANKS.map((b) => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                    {[
                      ["נרכש", lead.purchasedAt ? formatDate(lead.purchasedAt) : null],
                      ["שולם", lead.purchasePrice > 0 ? formatILS(lead.purchasePrice) : null],
                      ["סוג", lead.isExclusive ? "בלעדי" : lead.purchaseType === "regular" ? "רגיל" : null],
                      ["קשר ראשון", lead.firstContactAt ? formatDate(lead.firstContactAt) : "טרם"],
                      ["הכנסה", lead.monthlyIncome ? formatILS(lead.monthlyIncome) : null],
                      ["ציון", score > 0 ? `${score}/100` : null],
                    ].filter(([, v]) => v).map(([label, value]) => (
                      <div key={label} className="rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-2.5">
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mb-0.5">{label}</p>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tabs */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800" style={{ scrollbarWidth: "none" }}>
                    {DETAIL_TABS.map((t) => (
                      <button key={t.key} type="button" onClick={() => setTab(t.key)}
                        className={`flex-none px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${tab === t.key ? "border-brand-600 text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-900/10" : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="p-5">
                    {/* Documents tab */}
                    {tab === "docs" && (
                      <div>
                        <div className="mb-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4">
                          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5">קישור להעלאת מסמכים</h3>
                          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-3">שלח ללקוח קישור מאובטח להעלאה עצמאית</p>
                          {uploadToken ? (
                            <>
                              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 mb-3">
                                <span className="text-xs text-slate-500 dark:text-slate-400 truncate flex-1 font-mono" style={{ direction: "ltr" }}>{uploadToken.url}</span>
                                <button type="button" onClick={copyUploadLink} className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 hover:bg-brand-200 dark:hover:bg-brand-900/50 transition-colors">{linkCopied ? "הועתק" : "העתק"}</button>
                              </div>
                              <div className="flex gap-2 flex-wrap mb-3">
                                {lead?.phone && (
                                  <button type="button" onClick={openWaWithUploadLink} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors">שלח ב-WA</button>
                                )}
                                <button type="button" onClick={generateUploadToken} disabled={tokenLoading} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold disabled:opacity-50 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:hover:border-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300 transition-colors">{tokenLoading ? "יוצר..." : "חדש קישור"}</button>
                                <button type="button" onClick={revokeUploadToken} className="px-3 py-2 rounded-lg bg-danger-50 dark:bg-danger-900/20 text-danger-600 dark:text-danger-400 border border-danger-200 dark:border-danger-800 text-xs font-semibold hover:bg-danger-100 dark:hover:bg-danger-900/30 transition-colors">בטל</button>
                              </div>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-3">תוקף: {uploadToken.record?.expires_at ? new Date(uploadToken.record.expires_at).toLocaleDateString("he-IL") : "—"}</p>
                              <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">זמן יעד להעלאה</p>
                                <div className="flex gap-1.5 flex-wrap mb-2">
                                  {[24, 48, 72].map((h) => (
                                    <button key={h} type="button" onClick={() => setReminderHours(h)} className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-300 dark:hover:border-brand-600 hover:text-brand-600 transition-colors">{h} שעות</button>
                                  ))}
                                  <input type="datetime-local" className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md px-2 py-1 text-xs font-medium outline-none focus:ring-2 focus:ring-brand-500/30"
                                    value={reminderDeadline}
                                    onChange={(e) => { setReminderDeadline(e.target.value); if (e.target.value) saveReminder(new Date(e.target.value).toISOString()); }}
                                  />
                                </div>
                                {reminderStatusLabel && (
                                  <div className="rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 px-3 py-2 mb-2">
                                    <p className="text-xs font-semibold text-brand-700 dark:text-brand-300">{reminderStatusLabel}</p>
                                  </div>
                                )}
                                {missingDocs > 0 && (
                                  <div className="flex gap-2 flex-wrap">
                                    <button type="button" onClick={copyReminderMessage} className="px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:hover:border-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300 transition-colors">העתק הודעת תזכורת</button>
                                    {lead?.phone && (
                                      <button type="button" onClick={openWaReminder} className="px-3 py-2 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-semibold hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors">שלח תזכורת ב-WA</button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-3">
                              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-3">טרם נוצר קישור</p>
                              <button type="button" onClick={generateUploadToken} disabled={tokenLoading} className="px-4 py-2.5 rounded-lg bg-brand-600 text-white text-xs font-semibold disabled:opacity-50 hover:bg-brand-700 transition-colors">{tokenLoading ? "יוצר..." : "צור קישור להעלאה"}</button>
                            </div>
                          )}
                        </div>

                        {/* Document status counts */}
                        <div className="grid grid-cols-4 gap-2 mb-4">
                          {[
                            { label: "חסרים", count: computedDocumentSummary.statusCounts.missing, cls: "bg-danger-50 dark:bg-danger-900/20 border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-300" },
                            { label: "בבקשה", count: computedDocumentSummary.statusCounts.requested, cls: "bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800 text-warning-700 dark:text-warning-300" },
                            { label: "התקבלו", count: computedDocumentSummary.statusCounts.received, cls: "bg-accent-50 dark:bg-accent-900/20 border-accent-200 dark:border-accent-800 text-accent-700 dark:text-accent-300" },
                            { label: "אושרו", count: computedDocumentSummary.statusCounts.approved, cls: "bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800 text-success-700 dark:text-success-300" },
                          ].map(({ label, count, cls }) => (
                            <div key={label} className={`rounded-lg border p-2.5 text-center ${cls}`}>
                              <p className="text-xl font-bold tabular-nums leading-none">{count}</p>
                              <p className="text-[11px] font-semibold mt-1">{label}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-3 text-center">
                          {computedDocumentSummary.receivedCount} מתוך {computedDocumentSummary.totalCount} הושלמו · {computedDocumentSummary.completionPercent}%
                        </p>

                        {missingDocs > 0 && (
                          <div className="mb-3">
                            <button type="button" onClick={sendMissingDocsWa} className="rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 px-3 py-2 text-xs font-semibold text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors">שלח בקשת מסמכים ב-WA</button>
                          </div>
                        )}

                        <div className="grid gap-2">
                          {computedDocumentSummary.checklist.map((doc) => {
                            const mark = DOCUMENT_STATUS_MARKS[doc.status] || "—";
                            const isGood = doc.status === "approved" || doc.status === "received";
                            return (
                              <div key={doc.id || doc.key} className={`rounded-lg border p-3 ${isGood ? "bg-success-50/40 dark:bg-success-900/10 border-success-100 dark:border-success-800" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700"}`}>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-sm shrink-0">{mark}</span>
                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{doc.label || getDocumentLabel(doc.document_type)}</span>
                                  </div>
                                  <select className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md px-2 py-1 text-xs font-medium shrink-0 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" value={doc.status} onChange={(e) => updateDocStatus(doc, e.target.value)}>
                                    {DOCUMENT_STATUSES.map((s) => <option key={s} value={s}>{DOCUMENT_STATUS_LABELS[s]}</option>)}
                                  </select>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  <button type="button" onClick={() => updateDocStatus(doc, "received")} className="rounded-md bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300 border border-success-200 dark:border-success-800 px-2 py-1 text-[11px] font-semibold">התקבל</button>
                                  <button type="button" onClick={() => updateDocStatus(doc, "approved")} className="rounded-md bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300 border border-success-200 dark:border-success-800 px-2 py-1 text-[11px] font-semibold">אושר</button>
                                  <button type="button" onClick={() => updateDocStatus(doc, "missing")} className="rounded-md bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-300 border border-danger-200 dark:border-danger-800 px-2 py-1 text-[11px] font-semibold">חסר</button>
                                  <button type="button" onClick={() => updateDocStatus(doc, "not_required")} className="rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-semibold">לא רלוונטי</button>
                                </div>
                                <input className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-brand-500/30" placeholder="הערה למסמך..."
                                  defaultValue={doc.notes || ""}
                                  onBlur={(e) => updateDocStatus(doc, doc.status, e.target.value)} />
                                {(doc.received_at || doc.requested_at || doc.created_at) && (
                                  <p className="mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">עודכן: {formatDT(doc.received_at || doc.requested_at || doc.created_at)}</p>
                                )}
                                {doc.storage_path && (
                                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {doc.file_name && <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{doc.file_name}</span>}
                                      <span className="text-[10px] font-medium text-brand-500 dark:text-brand-400 ml-auto">הועלה ע&quot;י לקוח</span>
                                    </div>
                                    <div className="flex gap-1.5 flex-wrap">
                                      <button type="button" onClick={() => openDocFile(doc)} className="rounded-md bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 px-2 py-1 text-[11px] font-semibold">פתח קובץ</button>
                                      <button type="button" onClick={() => reviewDoc(doc, "approved", "")} className="rounded-md bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300 border border-success-200 dark:border-success-800 px-2 py-1 text-[11px] font-semibold">אשר</button>
                                      <button type="button" onClick={() => reviewDoc(doc, "rejected", reviewNotes[doc.id] || "")} className="rounded-md bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-300 border border-danger-200 dark:border-danger-800 px-2 py-1 text-[11px] font-semibold">דחה</button>
                                    </div>
                                    <input className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-brand-500/30" placeholder="הערה לדחייה..."
                                      value={reviewNotes[doc.id] || ""}
                                      onChange={(e) => setReviewNotes((p) => ({ ...p, [doc.id]: e.target.value }))} />
                                    {doc.review_note && <p className="text-[10px] text-danger-600 dark:text-danger-400">הערה: {doc.review_note}</p>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* Bank tab */}
                    {tab === "bank" && (
                      <div className="space-y-4">
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${bankTabDerived.isReady ? "bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800" : "bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800"}`}>
                          <div className="flex-1 min-w-0">
                            {bankTabDerived.isReady ? (
                              <p className="text-xs font-semibold text-success-700 dark:text-success-300">מוכן לשליחה — כל {bankTabDerived.readyReceivedDocs} מסמכים התקבלו</p>
                            ) : (
                              <p className="text-xs font-semibold text-warning-700 dark:text-warning-300">חסרים {missingDocs} מסמכים ({bankTabDerived.readyReceivedDocs}/{computedDocumentSummary.totalCount})</p>
                            )}
                          </div>
                          {!bankTabDerived.isReady && (
                            <button type="button" onClick={() => setTab("docs")} className="shrink-0 text-[11px] font-semibold px-2.5 py-1.5 rounded-md bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300 hover:bg-warning-200 dark:hover:bg-warning-900/40 transition-colors">מסמכים</button>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">סטטוס הגשה</label>
                          <select className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/30"
                            value={bankSubmissionStatus}
                            onChange={(e) => { setBankSubmissionStatus(e.target.value); patchLead({ bankSubmissionStatus: e.target.value }, `סטטוס הגשה: ${BANK_SUBMISSION_STATUS_MAP[e.target.value] || e.target.value}`, "status_changed"); }}>
                            {BANK_SUBMISSION_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                          </select>
                        </div>

                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">בנקאים בתיק</p>
                          {caseBankers.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-5 text-center">
                              <p className="text-xs font-medium text-slate-400 dark:text-slate-500">עדיין לא נבחרו בנקאים</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {caseBankers.map((cb) => (
                                <div key={cb.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{cb.banker_name_snapshot}</span>
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CASE_BANK_STATUS_STYLE[cb.status] || "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
                                          {CASE_BANK_STATUS_LABEL[cb.status] || cb.status}
                                        </span>
                                      </div>
                                      <p className="text-xs font-medium text-brand-600 dark:text-brand-400 mt-0.5">{cb.bank_name_snapshot}</p>
                                      {cb.sent_at && <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">נשלח: {new Date(cb.sent_at).toLocaleDateString("he-IL")}</p>}
                                    </div>
                                    <button type="button" onClick={() => removeBankerFromCase(cb.id)} className="shrink-0 text-[10px] font-semibold text-slate-400 hover:text-danger-500 dark:hover:text-danger-400 transition-colors px-1.5 py-1 rounded-md hover:bg-danger-50 dark:hover:bg-danger-900/20">הסר</button>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 mb-3">
                                    {cb.phone_snapshot && (
                                      <>
                                        <a href={`tel:${cb.phone_snapshot}`} className="flex items-center gap-1 px-2 py-1 rounded-md bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 text-[11px] font-semibold border border-brand-200 dark:border-brand-800">{cb.phone_snapshot}</a>
                                        <a href={`https://wa.me/${cb.phone_snapshot.replace(/[^\d]/g,"").replace(/^0/,"972")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 rounded-md bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 text-[11px] font-semibold border border-brand-200 dark:border-brand-800">WA</a>
                                      </>
                                    )}
                                    {cb.email_snapshot && (
                                      <a href={`mailto:${cb.email_snapshot}`} className="flex items-center gap-1 px-2 py-1 rounded-md bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 text-[11px] font-semibold border border-brand-200 dark:border-brand-800">מייל</a>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    <button type="button" onClick={() => copyBankSummary(cb.banker_name_snapshot)} className="px-2.5 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">העתק סיכום</button>
                                    {cb.phone_snapshot && (
                                      <a href={`https://wa.me/${cb.phone_snapshot.replace(/[^\d]/g,"").replace(/^0/,"972")}?text=${encodeURIComponent(buildCaseSummaryText(cb.banker_name_snapshot))}`} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1.5 rounded-md bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 text-[11px] font-semibold border border-brand-200 dark:border-brand-800 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors">שלח ב-WA</a>
                                    )}
                                    {cb.email_snapshot && (
                                      <a href={`mailto:${cb.email_snapshot}?subject=${encodeURIComponent(`מסמכים לתיק - ${lead.name || ""}`)}&body=${encodeURIComponent(buildCaseSummaryText(cb.banker_name_snapshot))}`} className="px-2.5 py-1.5 rounded-md bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 text-[11px] font-semibold border border-brand-200 dark:border-brand-800 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors">שלח מייל</a>
                                    )}
                                    {cb.status !== "sent" && cb.status !== "approved" && (
                                      <button type="button" onClick={() => markSent(cb)} className="px-2.5 py-1.5 rounded-md bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 text-[11px] font-semibold border border-brand-200 dark:border-brand-800 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors">סמן כנשלח</button>
                                    )}
                                  </div>
                                  <input className="mt-2 w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md px-2.5 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-brand-500/30"
                                    placeholder="הערה לבנקאי..."
                                    value={caseBankerNotes[cb.id] || cb.notes || ""}
                                    onChange={(e) => setCaseBankerNotes((p) => ({ ...p, [cb.id]: e.target.value }))}
                                    onBlur={(e) => { fetch("/api/advisor/case-bankers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: cb.id, leadId: id, notes: e.target.value }) }).then((r) => r.ok ? r.json() : null).then((j) => { if (j?.caseBanker) setCaseBankers((prev) => prev.map((x) => x.id === cb.id ? j.caseBanker : x)); }).catch(() => {}); }}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">הוסף בנקאי</p>
                          {advisorBankers.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-brand-200 dark:border-brand-800 bg-brand-50/40 dark:bg-brand-900/10 p-4 text-center">
                              <p className="text-xs font-medium text-brand-600 dark:text-brand-400 mb-2">עדיין לא הוספת בנקאים</p>
                              <Link href="/advisor/bankers" className="inline-block px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors">ספר בנקאים</Link>
                            </div>
                          ) : bankTabDerived.availableBankers.length === 0 ? (
                            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">כל הבנקאים כבר נוספו לתיק.</p>
                          ) : (
                            <div className="flex gap-2">
                              <select className="flex-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/30" value={selectedBankerId} onChange={(e) => setSelectedBankerId(e.target.value)}>
                                <option value="">בחר בנקאי...</option>
                                {bankTabDerived.availableBankers.map((b) => <option key={b.id} value={b.id}>{b.banker_name} · {b.bank_name}{b.branch_name ? ` (${b.branch_name})` : ""}</option>)}
                              </select>
                              <button type="button" disabled={!selectedBankerId || addingBanker} onClick={addBankerToCase} className="shrink-0 px-4 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold disabled:opacity-50 hover:bg-brand-700 transition-colors">{addingBanker ? "..." : "הוסף"}</button>
                            </div>
                          )}
                          <div className="mt-2">
                            <Link href="/advisor/bankers" className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors">ניהול ספר בנקאים</Link>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Activity tab */}
                    {tab === "activity" && (
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">ציר זמן</p>
                        {activities.length === 0 ? (
                          <div className="text-center py-10">
                            <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">עדיין אין פעילות</p>
                            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-1">פעולות ועדכונים יופיעו כאן</p>
                          </div>
                        ) : (
                          <div className="relative max-h-[520px] overflow-y-auto">
                            <div className="absolute right-5 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
                            <div className="space-y-0">
                              {sortedActivities.map((act, idx) => (
                                <div key={`${act.created_at}-${idx}`} className="relative flex gap-4 pb-4">
                                  <div className="relative z-10 shrink-0">
                                    <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm shadow-sm text-slate-500 dark:text-slate-400">
                                      {ACTIVITY_ICONS[act.activity_type] || "·"}
                                    </div>
                                  </div>
                                  <div className="flex-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700 px-3 py-2.5 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{act.title}</p>
                                    {act.body && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{act.body}</p>}
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{formatDT(act.created_at)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes tab */}
                    {tab === "notes" && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">הערות פנימיות</p>
                          {savedIndicator && <span className="text-xs font-semibold text-success-600 dark:text-success-400">נשמר</span>}
                        </div>
                        <textarea
                          className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-3 text-sm resize-y min-h-[200px] outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                          value={notes}
                          onChange={(e) => { setNotes(e.target.value); debouncedPatch("notes", { internalNotes: e.target.value, lastContactedAt: new Date().toISOString() }, "הערה עודכנה", "note_added", 500); }}
                          placeholder="הערות, תיאום שיחה, עדכון סטטוס..."
                        />
                      </div>
                    )}

                    {/* Appraisal tab */}
                    {tab === "appraisal" && (
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">שמאות</p>
                        <div className="grid gap-3">
                          <select className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/30" value={lead.appraisalStatus || "not_ordered"} onChange={(e) => patchLead({ appraisalStatus: e.target.value }, `שמאות: ${APPRAISAL_STATUS_LABELS[e.target.value]}`)}>
                            {APPRAISAL_STATUSES.map((s) => <option key={s} value={s}>{APPRAISAL_STATUS_LABELS[s]}</option>)}
                          </select>
                          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-brand-500" style={{ width: `${appraisalPct}%` }} />
                          </div>
                          <input className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/30" placeholder="שם שמאי" value={lead.appraiserName || ""} onChange={(e) => setLead((p) => ({ ...p, appraiserName: e.target.value }))} onBlur={(e) => patchLead({ appraiserName: e.target.value })} />
                          <input className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/30" placeholder="טלפון שמאי" value={lead.appraiserPhone || ""} onChange={(e) => setLead((p) => ({ ...p, appraiserPhone: e.target.value }))} onBlur={(e) => patchLead({ appraiserPhone: e.target.value })} />
                          <input type="date" className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/30" value={lead.appraisalDate?.slice(0, 10) || ""} onChange={(e) => setLead((p) => ({ ...p, appraisalDate: e.target.value }))} onBlur={(e) => patchLead({ appraisalDate: e.target.value })} />
                          <input type="number" className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/30" placeholder="עלות שמאות" value={lead.appraisalCost || ""} onChange={(e) => setLead((p) => ({ ...p, appraisalCost: e.target.value }))} onBlur={(e) => patchLead({ appraisalCost: e.target.value })} />
                        </div>
                      </div>
                    )}

                    {/* Legal tab */}
                    {tab === "legal" && (
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">עורכי דין</p>
                        <div className="grid gap-3">
                          <input className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/30" placeholder='עו"ד קונה - שם' value={lead.buyerLawyerName || ""} onChange={(e) => setLead((p) => ({ ...p, buyerLawyerName: e.target.value }))} onBlur={(e) => patchLead({ buyerLawyerName: e.target.value })} />
                          <input className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/30" placeholder='עו"ד קונה - טלפון' value={lead.buyerLawyerPhone || ""} onChange={(e) => setLead((p) => ({ ...p, buyerLawyerPhone: e.target.value }))} onBlur={(e) => patchLead({ buyerLawyerPhone: e.target.value })} />
                          <input className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/30" placeholder='עו"ד מוכר - שם' value={lead.sellerLawyerName || ""} onChange={(e) => setLead((p) => ({ ...p, sellerLawyerName: e.target.value }))} onBlur={(e) => patchLead({ sellerLawyerName: e.target.value })} />
                          <div className="grid gap-1.5 mt-1">
                            {LEGAL_CHECKLIST.map((item) => (
                              <label key={item.key} className="flex items-center gap-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <input type="checkbox" checked={Boolean(lead[item.key])} onChange={(e) => { setLead((p) => ({ ...p, [item.key]: e.target.checked })); patchLead({ [item.key]: e.target.checked }); }} className="accent-brand-600" />
                                {item.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Signing tab */}
                    {tab === "signing" && (
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">חתימות</p>
                        <div className="grid gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">תאריך חתימה</label>
                            <input type="date" className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/30" value={lead.signingDate?.slice(0, 10) || ""} onChange={(e) => setLead((p) => ({ ...p, signingDate: e.target.value }))} onBlur={(e) => patchLead({ signingDate: e.target.value })} />
                          </div>
                          {lead.signingDate && (
                            <p className="text-xs font-semibold text-success-700 dark:text-success-300">עוד {Math.max(0, Math.ceil((new Date(lead.signingDate) - new Date()) / 86400000))} ימים</p>
                          )}
                          <input className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/30" placeholder="מיקום חתימה" value={lead.signingLocation || ""} onChange={(e) => setLead((p) => ({ ...p, signingLocation: e.target.value }))} onBlur={(e) => patchLead({ signingLocation: e.target.value })} />
                          <textarea className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium min-h-[80px] outline-none focus:ring-2 focus:ring-brand-500/30" placeholder="הערות חתימה" value={lead.signingNotes || ""} onChange={(e) => setLead((p) => ({ ...p, signingNotes: e.target.value }))} onBlur={(e) => patchLead({ signingNotes: e.target.value })} />
                        </div>
                      </div>
                    )}

                    {/* Collateral tab */}
                    {tab === "collateral" && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">בטחונות</p>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">{collateralProgress}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: `${collateralProgress}%` }} />
                        </div>
                        <div className="grid gap-1.5 mb-4">
                          {COLLATERAL_CHECKLIST.map((item) => (
                            <label key={item.key} className="flex items-center gap-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                              <input type="checkbox" checked={Boolean(lead[item.key])} onChange={(e) => { setLead((p) => ({ ...p, [item.key]: e.target.checked })); patchLead({ [item.key]: e.target.checked }); }} className="accent-brand-600" />
                              {item.label}
                            </label>
                          ))}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">שחרור כספים</label>
                          <select className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/30" value={lead.fundsReleaseStatus || "not_released"} onChange={(e) => patchLead({ fundsReleaseStatus: e.target.value }, `שחרור כספים: ${FUNDS_RELEASE_STATUS_LABELS[e.target.value]}`)}>
                            {FUNDS_RELEASE_STATUSES.map((s) => <option key={s} value={s}>{FUNDS_RELEASE_STATUS_LABELS[s]}</option>)}
                          </select>
                        </div>
                      </div>
                    )}

                    {tab === "audit" && (
                      <div>
                        <div className="mb-4">
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">היסטוריית שינויים</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">מי שינה מה ומתי — מעקב מלא על כל פעולה בתיק</p>
                        </div>
                        {activities.length > 0 ? (
                          <div className="space-y-2">
                            {activities.map((a, i) => (
                              <div key={a.id || i} className="flex items-start gap-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-2.5">
                                <span className="text-sm shrink-0 mt-0.5">{ACTIVITY_ICONS[a.type] || "📋"}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{a.description || a.type}</p>
                                  {a.metadata && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{typeof a.metadata === "string" ? a.metadata : JSON.stringify(a.metadata)}</p>}
                                </div>
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">
                                  {a.timestamp || a.createdAt ? new Date(a.timestamp || a.createdAt).toLocaleDateString("he-IL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">אין פעילות מתועדת עדיין</div>
                        )}
                      </div>
                    )}

                    {tab === "tasks" && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">משימות</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">ניהול משימות ומעקב לפי תאריכים</p>
                          </div>
                          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{tasks.filter(t => t.done).length}/{tasks.length} הושלמו</span>
                        </div>
                        <div className="flex gap-2 mb-4">
                          <input type="text" className="flex-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/30"
                            placeholder="הוסף משימה חדשה..." value={taskText} onChange={(e) => setTaskText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && taskText.trim()) addTaskToApi(taskText); }} />
                          <button type="button" onClick={() => { if (taskText.trim()) addTaskToApi(taskText); }}
                            className="shrink-0 px-4 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors">הוסף</button>
                        </div>
                        {tasks.length > 0 ? (
                          <div className="space-y-1.5">
                            {tasks.map(t => (
                              <div key={t.id} className="flex items-center gap-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-2.5 group">
                                <input type="checkbox" checked={t.done} onChange={() => toggleTaskDone(t)} className="accent-brand-600" />
                                <span className={`flex-1 text-xs font-medium ${t.done ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-300"}`}>{t.text}</span>
                                {t.priority && t.priority !== "medium" && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.priority === "high" ? "bg-danger-100 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}>
                                    {t.priority === "high" ? "דחוף" : "נמוך"}
                                  </span>
                                )}
                                <button type="button" onClick={() => deleteTaskApi(t.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-danger-500 transition-all text-xs" title="מחק">✕</button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">אין משימות עדיין</div>
                        )}
                      </div>
                    )}

                  </div>
                </div>

                {/* Bank Guide — refinance only */}
                {isRefinance && <BankGuideSection />}
              </div>
            )}
          </div>

          {/* Column 3 — LEFT in RTL: Client Summary */}
          <aside className="hidden lg:block lg:sticky lg:top-[7.5rem]">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-3">פרטי לקוח</h3>
                <div className="space-y-2 text-xs">
                  {[
                    ["שם", lead.name],
                    ["טלפון", lead.phone],
                    ["מייל", lead.email || lead.advisorEmail],
                    ["עיר", lead.city || lead.propertyCity],
                    ["משכנתא", lead.mortgageAmount ? formatILS(lead.mortgageAmount) : null],
                    ["מחיר נכס", lead.propertyPrice ? formatILS(lead.propertyPrice) : null],
                    ["הון עצמי", lead.equityAmount ? formatILS(lead.equityAmount) : null],
                    ["סוג", PURCHASE_STATUS_LABELS[lead.purchaseStatus] || lead.purchaseStatus || null],
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-2">
                      <span className="text-slate-400 dark:text-slate-500 font-medium shrink-0">{label}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate text-left">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 px-3 py-2 mb-3">
                  <p className="text-[11px] font-medium text-brand-500 dark:text-brand-400 mb-0.5">שלב נוכחי</p>
                  <p className="text-sm font-bold text-brand-900 dark:text-brand-200">{getPipelineStageLabel(getStage(lead))}</p>
                </div>
                <div className="mb-2">
                  <label className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-1">פעולה הבאה</label>
                  <input type="text" className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-brand-500/30"
                    placeholder="מה הפעולה הבאה?"
                    value={nextActionText}
                    onChange={(e) => { setNextActionText(e.target.value); debouncedPatch("nextAction", { nextAction: e.target.value }, e.target.value ? `פעולה הבאה: ${e.target.value}` : undefined, "reminder_set"); }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-1">תאריך מעקב</label>
                  <input type="date"
                    className={`w-full border rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-brand-500/30 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 ${isOverdue(nextActionDate) ? "border-danger-300 dark:border-danger-700" : "border-slate-200 dark:border-slate-700"}`}
                    value={nextActionDate}
                    onChange={(e) => { setNextActionDate(e.target.value); debouncedPatch("nextActionDate", { nextActionAt: e.target.value }, undefined, "reminder_set"); }}
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                <ProgressWidget label="מסמכים" pct={computedDocumentSummary.completionPercent} color="bg-brand-500" />
                <ProgressWidget label="שמאות" pct={appraisalPct} color="bg-brand-400" />
                <ProgressWidget label='עו"ד' pct={lawyerPct} color="bg-brand-400" />
                <ProgressWidget label="בטחונות" pct={collateralProgress} color="bg-brand-400" />
                <ProgressWidget label="שחרור כספים" pct={fundsPct} color="bg-brand-400" />
                <ProgressWidget label="כולל" pct={overallProgress} color="bg-brand-600" />
              </div>
            </div>
          </aside>

        </div>
      </main>

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
