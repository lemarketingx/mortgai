import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
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
  COLLATERAL_CHECKLIST,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUSES,
  FUNDS_RELEASE_STATUS_LABELS,
  FUNDS_RELEASE_STATUSES,
  LEGAL_CHECKLIST,
  buildDocumentChecklist,
  calculateCollateralProgress,
  calculateOverallMortgageProgress,
  getDocumentLabel,
} from "../../../lib/mortgageCase";

const ACTIVE_PIPELINE_STAGES = PIPELINE_STAGES.filter((s) => s !== "closed_lost");

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
const MORTGAGE_TYPES = ["משכנתא ראשונה", "מחזור משכנתא", "הלוואת גישור", "שיפור תנאים", "הגדלת משכנתא", "משכנתא לצרכים חופשיים"];

const ACTIVITY_ICONS = {
  lead_created: "⭐", status_changed: "🔄", call_logged: "📞",
  whatsapp_opened: "💬", whatsapp_sent: "💬", email_opened: "✉️",
  document_requested: "📄", document_received: "✅", note_added: "📝", reminder_set: "⏰",
};

const DETAIL_TABS = [
  { key: "docs",      label: "מסמכים" },
  { key: "activity",  label: "פעילות" },
  { key: "notes",     label: "הערות" },
  { key: "appraisal", label: "שמאות" },
  { key: "legal",     label: 'עו"ד' },
  { key: "signing",   label: "חתימות" },
  { key: "collateral",label: "בטחונות" },
];

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
function StageStepper({ lead, onAdvance, onSetStage }) {
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
}

// ─── Progress Widget ───────────────────────────────────────────────────────────
function ProgressWidget({ label, pct, color = "bg-emerald-500" }) {
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
}

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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LeadDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [documentSummary, setDocumentSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [notes, setNotes] = useState("");
  const [nextActionText, setNextActionText] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [tab, setTab] = useState("docs");
  const [showWaTemplates, setShowWaTemplates] = useState(false);
  const [msg, setMsg] = useState({ text: "", ok: true });

  const debounceRef = useRef({});

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch("/api/advisor/my-leads").then((r) => r.ok ? r.json() : { leads: [] }),
      fetch(`/api/advisor/activities?leadId=${id}`).then((r) => r.ok ? r.json() : { activities: [] }),
      fetch(`/api/advisor/documents?leadId=${id}`).then((r) => r.ok ? r.json() : { documents: [] }),
    ]).then(([leadsData, actData, docsData]) => {
      const found = (leadsData.leads || []).find((l) => l.id === id);
      if (!found) { router.push("/advisor/my-leads"); return; }
      setLead(found);
      setNotes(found.internalNotes || "");
      setNextActionText(found.nextAction || "");
      setNextActionDate(found.nextActionAt?.slice(0, 10) || "");
      const acts = Array.isArray(actData.activities) ? actData.activities : [];
      setActivities(acts.length > 0 ? acts : [{ title: "הליד נוצר", created_at: found.createdAt, activity_type: "lead_created" }]);
      const docs = Array.isArray(docsData.documents) ? docsData.documents : [];
      setDocuments(docs);
      setDocumentSummary(docsData.summary || buildDocumentChecklist(docs, found.employmentStatus));
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

  async function advanceStage() {
    const si = getStageIndex(lead);
    if (si < 0 || si >= ACTIVE_PIPELINE_STAGES.length - 1) return;
    const next = ACTIVE_PIPELINE_STAGES[si + 1];
    await patchLead({ pipelineStage: next, lastContactedAt: new Date().toISOString() }, `שלב עודכן: "${getPipelineStageLabel(next)}"`, "status_changed");
  }

  async function setStage(stage) {
    const nextStage = normalizePipelineStage(stage);
    if (nextStage === getStage(lead)) return;
    await patchLead({ pipelineStage: nextStage, lastContactedAt: new Date().toISOString() }, `שלב עודכן: "${getPipelineStageLabel(nextStage)}"`, "status_changed");
  }

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
    patchLead({ lastContactedAt: new Date().toISOString() });
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
    setDocumentSummary(j.summary || null);
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

  const computedDocumentSummary = documentSummary || buildDocumentChecklist(documents, lead?.employmentStatus);
  const missingDocs = computedDocumentSummary.missingCount;
  const score = Math.round(Number(lead?.approvalScore || lead?.estimatedApprovalResult) || 0);
  const si = lead ? getStageIndex(lead) : -1;
  const overallProgress = lead ? Number(lead.overallProgressPercent ?? calculateOverallMortgageProgress(lead)) || 0 : 0;
  const collateralProgress = lead ? Number(lead.collateralCompletionPercent ?? calculateCollateralProgress(lead)) || 0 : 0;
  const appraisalPct = APPRAISAL_PROGRESS[lead?.appraisalStatus || "not_ordered"] || 0;
  const lawyerDone = lead ? LEGAL_CHECKLIST.filter((item) => Boolean(lead[item.key])).length : 0;
  const lawyerPct = lead ? Math.round((lawyerDone / LEGAL_CHECKLIST.length) * 100) : 0;
  const fundsReleased = lead?.fundsReleaseStatus === "fully_released";
  const fundsPct = fundsReleased ? 100 : lead?.fundsReleaseStatus === "partial_release" ? 50 : 0;

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
                onClick={() => { pushActivity("בוצעה שיחה", "call_logged"); patchLead({ lastContactedAt: new Date().toISOString() }); }}
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
                onClick={() => { pushActivity("נשלח מייל", "email_opened"); patchLead({ lastContactedAt: new Date().toISOString() }); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 text-xs font-black border border-sky-200">
                ✉ שלח מייל
              </a>
            )}
          </div>
        </div>

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

            {/* Deal details */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h2 className="text-sm font-black text-slate-950 mb-3">פרטי העסקה</h2>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-1">בנק</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none" value={lead.bankName || ""} onChange={(e) => patchLead({ bankName: e.target.value }, e.target.value ? `בנק: ${e.target.value}` : "")}>
                    <option value="">בחר בנק...</option>
                    {BANKS.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-1">סוג משכנתא</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none" value={lead.mortgageType || ""} onChange={(e) => patchLead({ mortgageType: e.target.value }, e.target.value ? `סוג: ${e.target.value}` : "")}>
                    <option value="">בחר סוג...</option>
                    {MORTGAGE_TYPES.map((m) => <option key={m}>{m}</option>)}
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
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <p className="text-sm font-black text-slate-950">מסמכים</p>
                        <p className="text-xs font-black text-slate-400">{computedDocumentSummary.receivedCount}/{computedDocumentSummary.totalCount} אושרו · {computedDocumentSummary.completionPercent}%</p>
                      </div>
                      {missingDocs > 0 && (
                        <button type="button" onClick={sendMissingDocsWa} className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-black text-emerald-700">
                          שלח בקשת מסמכים ב-WA
                        </button>
                      )}
                    </div>
                    {missingDocs > 0 && (
                      <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                        <p className="text-xs font-black text-amber-800 mb-1">חסרים {missingDocs} מסמכים</p>
                        <div className="grid gap-0.5">
                          {computedDocumentSummary.missingDocuments.map((doc) => (
                            <p key={doc.key || doc.document_type} className="text-[11px] font-bold text-amber-700">• {doc.label || getDocumentLabel(doc.document_type)}</p>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="grid gap-2">
                      {computedDocumentSummary.checklist.map((doc) => (
                        <div key={doc.id || doc.key} className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-black text-slate-800">{doc.label || getDocumentLabel(doc.document_type)}</span>
                            <select className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold bg-white" value={doc.status} onChange={(e) => updateDocStatus(doc, e.target.value)}>
                              {DOCUMENT_STATUSES.map((s) => <option key={s} value={s}>{DOCUMENT_STATUS_LABELS[s]}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            <button type="button" onClick={() => updateDocStatus(doc, "received")} className="rounded-md bg-emerald-50 text-emerald-700 px-2 py-1 text-[11px] font-black">סמן כהתקבל</button>
                            <button type="button" onClick={() => updateDocStatus(doc, "missing")} className="rounded-md bg-rose-50 text-rose-700 px-2 py-1 text-[11px] font-black">סמן כחסר</button>
                            <button type="button" onClick={() => updateDocStatus(doc, "not_required")} className="rounded-md bg-slate-100 text-slate-600 px-2 py-1 text-[11px] font-black">לא רלוונטי</button>
                          </div>
                          <input className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white" placeholder="הערה למסמך..."
                            defaultValue={doc.notes || ""}
                            onBlur={(e) => updateDocStatus(doc, doc.status, e.target.value)} />
                          {(doc.received_at || doc.requested_at || doc.created_at) && (
                            <p className="mt-1 text-[10px] font-bold text-slate-400">עודכן: {formatDT(doc.received_at || doc.requested_at || doc.created_at)}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* פעילות */}
                {tab === "activity" && (
                  <div>
                    <p className="text-sm font-black text-slate-950 mb-3">היסטוריית פעילות</p>
                    <div className="divide-y divide-slate-50 max-h-[480px] overflow-y-auto">
                      {activities.map((act, idx) => (
                        <div key={`${act.created_at}-${idx}`} className="flex gap-3 py-3">
                          <span className="text-base shrink-0 mt-0.5">{ACTIVITY_ICONS[act.activity_type] || "•"}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-800">{act.title}</p>
                            {act.body && <p className="text-xs text-slate-500 mt-0.5">{act.body}</p>}
                            <p className="text-[11px] text-slate-400 mt-0.5">{formatDT(act.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
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
