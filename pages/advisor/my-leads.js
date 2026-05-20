import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatILS } from "../../lib/format";
import { KpiTile, Tag, Skeleton, EmptyState } from "../../components/ui";
import AdvisorHeader from "../../components/AdvisorHeader";

const PIPELINE_STAGES = [
  "ליד חדש", "נוצר קשר", "נשלחה רשימת מסמכים", "מחכה למסמכים",
  "מסמכים התקבלו", "בדיקת זכאות", "הוגש לבנק", "אישור עקרוני",
  "משא ומתן מול בנקים", "נבחר תמהיל", "נקבעו חתימות", "נסגר בהצלחה",
];
const EXIT_STATUSES = ["לא עונה", "לא רלוונטי", "נדחה בבנק", "עבר ליועץ אחר", "בוטל"];
const ALL_STATUSES = [...PIPELINE_STAGES, ...EXIT_STATUSES];

const STAGE_BADGE = {
  "ליד חדש": "bg-violet-50 text-violet-700 border-violet-200",
  "נוצר קשר": "bg-violet-50 text-violet-700 border-violet-200",
  "נשלחה רשימת מסמכים": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "מחכה למסמכים": "bg-amber-50 text-amber-700 border-amber-200",
  "מסמכים התקבלו": "bg-amber-50 text-amber-700 border-amber-200",
  "בדיקת זכאות": "bg-sky-50 text-sky-700 border-sky-200",
  "הוגש לבנק": "bg-sky-50 text-sky-700 border-sky-200",
  "אישור עקרוני": "bg-blue-50 text-blue-700 border-blue-200",
  "משא ומתן מול בנקים": "bg-blue-50 text-blue-700 border-blue-200",
  "נבחר תמהיל": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "נקבעו חתימות": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "נסגר בהצלחה": "bg-green-50 text-green-800 border-green-200",
  "לא עונה": "bg-slate-50 text-slate-500 border-slate-200",
  "לא רלוונטי": "bg-slate-50 text-slate-500 border-slate-200",
  "נדחה בבנק": "bg-rose-50 text-rose-700 border-rose-200",
  "עבר ליועץ אחר": "bg-slate-50 text-slate-500 border-slate-200",
  "בוטל": "bg-rose-50 text-rose-600 border-rose-200",
};
const STAGE_PROGRESS_COLOR = [
  "bg-violet-500", "bg-violet-400", "bg-indigo-400", "bg-amber-400",
  "bg-amber-500", "bg-sky-400", "bg-sky-500", "bg-blue-500",
  "bg-blue-400", "bg-emerald-400", "bg-emerald-500", "bg-green-500",
];

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

function getStage(lead) { return lead.pipelineStage || lead.leadStatus || "ליד חדש"; }
function getStageIndex(lead) { return PIPELINE_STAGES.indexOf(getStage(lead)); }
function isExited(lead) { const s = getStage(lead); return EXIT_STATUSES.includes(s) || s === "נסגר בהצלחה"; }

function CardSkeleton() { return <div className="bg-white border border-slate-100 rounded-2xl p-4"><Skeleton variant="block" className="h-40" /></div>; }

function StageProgress({ lead }) {
  const si = getStageIndex(lead);
  if (si < 0) return null;
  const pct = Math.round(((si + 1) / PIPELINE_STAGES.length) * 100);
  const color = STAGE_PROGRESS_COLOR[si] || "bg-violet-400";
  return (
    <div className="mb-3">
      <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
        <span>שלב {si + 1} מתוך {PIPELINE_STAGES.length}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MyLeadCard({ lead, onUpdate }) {
  const [notes, setNotes] = useState(lead.internalNotes || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [localActivities, setLocalActivities] = useState([]);
  const [docsOpen, setDocsOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [selectedDocTypes, setSelectedDocTypes] = useState([]);

  const stage = getStage(lead);
  const si = getStageIndex(lead);
  const stageBadge = STAGE_BADGE[stage] || "bg-slate-50 text-slate-600 border-slate-200";
  const nextStage = si >= 0 && si < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[si + 1] : null;
  const score = Math.round(Number(lead.approvalScore || lead.estimatedApprovalResult) || 0);
  const quality = lead.leadQuality || (score >= 70 ? "חם" : score >= 40 ? "בינוני" : "חלש");
  const qualityColor = quality === "חם" ? "text-emerald-600" : quality === "בינוני" ? "text-amber-600" : "text-slate-400";
  const hasOverdue = isOverdue(lead.nextActionAt) || isOverdue(lead.followUpDate);
  const isExcl = lead.isExclusive;
  const created = new Date(lead.createdAt).toLocaleDateString("he-IL", { day: "numeric", month: "short" });

  useEffect(() => {
    fetch(`/api/advisor/activities?leadId=${lead.id}`)
      .then((r) => r.ok ? r.json() : { activities: [] })
      .then((j) => {
        const acts = Array.isArray(j.activities) ? j.activities : [];
        setLocalActivities(acts.length > 0 ? acts : [{ title: "הליד נוצר", created_at: lead.createdAt, activity_type: "lead_created" }]);
      })
      .catch(() => setLocalActivities([{ title: "הליד נוצר", created_at: lead.createdAt, activity_type: "lead_created" }]));
  }, [lead.id, lead.createdAt]);

  const timeline = useMemo(() =>
    [...localActivities].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5),
    [localActivities]
  );

  function pushActivity(title, activityType = "note_added") {
    setLocalActivities((prev) => [{ title, created_at: new Date().toISOString(), activity_type: activityType }, ...prev]);
    fetch("/api/advisor/activities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: lead.id, activityType, title }) }).catch(() => {});
  }

  async function patch(changes, activityTitle, activityType) {
    const r = await fetch("/api/advisor/my-leads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: lead.id, changes }) });
    if (!r.ok) return;
    const j = await r.json();
    onUpdate(lead.id, j.lead);
    if (activityTitle) pushActivity(activityTitle, activityType || "note_added");
  }

  async function advanceStage() {
    if (!nextStage) return;
    await patch({ pipelineStage: nextStage, lastContactedAt: new Date().toISOString() }, `שלב: "${nextStage}"`, "status_changed");
  }

  async function saveNotes() {
    if (notes === (lead.internalNotes || "")) return;
    setSaving(true);
    await patch({ internalNotes: notes, lastContactedAt: new Date().toISOString() }, "הערה עודכנה", "note_added");
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  }

  function openWa(msg = "") {
    if (!lead.phone) return;
    const raw = String(lead.phone).replace(/[^\d]/g, "");
    const phone = raw.startsWith("0") ? `972${raw.slice(1)}` : raw;
    window.open(msg ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/${phone}`, "_blank", "noopener,noreferrer");
    patch({ lastContactedAt: new Date().toISOString() }, "נפתח WhatsApp", "whatsapp_opened");
  }

  async function loadDocuments() {
    setDocsLoading(true);
    const r = await fetch(`/api/advisor/documents?leadId=${lead.id}`);
    setDocuments(r.ok ? (await r.json()).documents || [] : []);
    setDocsLoading(false);
  }
  async function requestDocuments() {
    if (!selectedDocTypes.length) return;
    const r = await fetch("/api/advisor/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: lead.id, documentTypes: selectedDocTypes }) });
    if (r.ok) { const j = await r.json(); setDocuments((p) => [...p, ...(j.documents || [])]); pushActivity("נשלחה בקשת מסמכים", "document_requested"); setSelectedDocTypes([]); }
  }
  async function markDocReceived(doc) {
    const r = await fetch("/api/advisor/documents", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: doc.id, status: "received", leadId: lead.id, documentType: doc.document_type }) });
    if (r.ok) { setDocuments((p) => p.map((d) => d.id === doc.id ? { ...d, status: "received" } : d)); pushActivity(`מסמך התקבל: ${DOC_LABELS[doc.document_type] || doc.document_type}`, "document_received"); }
  }

  return (
    <article className={`bg-white rounded-2xl border shadow-sm ${hasOverdue ? "border-rose-300 bg-rose-50/20" : "border-slate-100"}`}>
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${stageBadge}`}>{stage}</span>
              {isExcl && <Tag variant="exclusive">בלעדי</Tag>}
              {hasOverdue && <span className="text-[11px] font-black text-rose-600">⚠ באיחור</span>}
              <span className={`text-[11px] font-black ${qualityColor}`}>{quality}</span>
            </div>
            <Link href={`/advisor/lead/${lead.id}`} className="block text-base font-black text-slate-950 hover:text-violet-700 truncate mb-0.5">{lead.name || "—"}</Link>
            {lead.phone && <a href={`tel:${lead.phone}`} onClick={() => patch({ lastContactedAt: new Date().toISOString() }, "בוצעה שיחה", "call_logged")} className="text-sm font-black text-violet-600 hover:underline">{lead.phone}</a>}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-base font-black text-slate-950 tabular-nums">{formatILS(lead.mortgageAmount || 0)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{created}</p>
            {lead.purchasePrice > 0 && <p className="text-[11px] text-slate-500 font-bold mt-0.5">שולם {formatILS(lead.purchasePrice)}</p>}
            {lead.bankName && <p className="text-[11px] text-slate-400 mt-0.5">{lead.bankName}</p>}
          </div>
        </div>

        {/* Pipeline progress */}
        <StageProgress lead={lead} />

        {/* Next action */}
        {(lead.nextAction || lead.nextActionAt) && (
          <div className={`rounded-lg px-3 py-2 mb-3 text-xs ${isOverdue(lead.nextActionAt) ? "bg-rose-50 border border-rose-200" : isToday(lead.nextActionAt) ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50 border border-slate-200"}`}>
            <p className="font-black text-slate-700">{lead.nextAction || "פעולה הבאה"}</p>
            {lead.nextActionAt && <p className="text-slate-500 mt-0.5">{formatShort(lead.nextActionAt)}{isOverdue(lead.nextActionAt) ? " — באיחור" : isToday(lead.nextActionAt) ? " — היום" : ""}</p>}
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {lead.phone
            ? <a href={`tel:${lead.phone}`} onClick={() => patch({ lastContactedAt: new Date().toISOString() }, "בוצעה שיחה", "call_logged")} className="text-center text-xs font-black rounded-lg py-2 bg-violet-50 text-violet-700">שיחה</a>
            : <button disabled className="text-center text-xs font-black rounded-lg py-2 bg-slate-100 text-slate-400">שיחה</button>}
          {lead.phone
            ? <button type="button" onClick={() => openWa()} className="text-center text-xs font-black rounded-lg py-2 bg-emerald-50 text-emerald-700">WhatsApp</button>
            : <button disabled className="text-center text-xs font-black rounded-lg py-2 bg-slate-100 text-slate-400">WA</button>}
          {lead.advisorEmail || lead.email
            ? <a href={`mailto:${lead.advisorEmail || lead.email}`} onClick={() => patch({ lastContactedAt: new Date().toISOString() }, "נשלח מייל", "email_opened")} className="text-center text-xs font-black rounded-lg py-2 bg-sky-50 text-sky-700">מייל</a>
            : <button disabled className="text-center text-xs font-black rounded-lg py-2 bg-slate-100 text-slate-400">מייל</button>}
          <Link href={`/advisor/lead/${lead.id}`} className="text-center text-xs font-black rounded-lg py-2 bg-slate-100 text-slate-700">פרטים</Link>
        </div>

        {/* WhatsApp template */}
        <div className="flex gap-1.5 mb-3">
          <select className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold" defaultValue="" onChange={(e) => { if (e.target.value) { openWa(WA_TEMPLATES[e.target.value]); } e.target.value = ""; }}>
            <option value="" disabled>תבנית WA...</option>
            {Object.keys(WA_TEMPLATES).map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          {nextStage && (
            <button type="button" onClick={advanceStage} className="whitespace-nowrap px-3 rounded-lg bg-violet-700 text-white text-xs font-black hover:bg-violet-800 transition-colors">
              הבא ←
            </button>
          )}
        </div>

        {/* Stage select (full) */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="block text-[11px] font-black text-slate-400 mb-1">שלב</label>
            <select className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold" value={stage} onChange={(e) => patch({ pipelineStage: e.target.value, lastContactedAt: new Date().toISOString() }, `שלב: "${e.target.value}"`, "status_changed")}>
              <optgroup label="Pipeline פעיל">
                {PIPELINE_STAGES.map((s) => <option key={s}>{s}</option>)}
              </optgroup>
              <optgroup label="יצא מהתהליך">
                {EXIT_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-black text-slate-400 mb-1">follow-up</label>
            <input type="date" className={`w-full border rounded-lg px-2 py-1.5 text-xs font-bold ${isOverdue(lead.followUpDate) ? "border-amber-300 bg-amber-50/40" : "border-slate-200"}`} defaultValue={lead.followUpDate?.slice(0, 10) || ""} onBlur={(e) => { if (e.target.value) patch({ followUpDate: e.target.value }, `נקבע follow-up`); }} />
          </div>
        </div>

        {/* Activity timeline */}
        <div className="mb-3">
          <p className="text-[11px] font-black text-slate-400 mb-1">פעילות אחרונה</p>
          <div className="border border-slate-100 rounded-xl divide-y divide-slate-100">
            {timeline.map((item, idx) => (
              <div key={`${item.created_at}-${idx}`} className="flex gap-2 px-2.5 py-1.5">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-violet-300 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-700">{item.title || item.text}</p>
                  <p className="text-[10px] text-slate-400">{formatDateTime(item.created_at || item.at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div className="mb-3 border border-slate-100 rounded-xl overflow-hidden">
          <button type="button" className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 text-[11px] font-black text-slate-600"
            onClick={() => { setDocsOpen((v) => !v); if (!docsOpen) loadDocuments(); }}>
            <span>מסמכים {lead.documentsCompletionPercent > 0 ? `(${lead.documentsCompletionPercent}%)` : ""}</span>
            <span>{docsOpen ? "▲" : "▼"}</span>
          </button>
          {docsOpen && (
            <div className="p-2.5">
              {docsLoading && <p className="text-xs text-slate-400">טוען...</p>}
              {!docsLoading && documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold text-slate-700">{DOC_LABELS[doc.document_type] || doc.document_type}</span>
                  {doc.status === "received" || doc.status === "approved"
                    ? <span className="text-xs font-black text-emerald-600">✓</span>
                    : <button type="button" onClick={() => markDocReceived(doc)} className="text-[10px] font-black text-violet-600">התקבל</button>}
                </div>
              ))}
              <div className="flex flex-wrap gap-1 mb-1.5">
                {DOC_TYPES.map((dt) => (
                  <button key={dt} type="button" onClick={() => setSelectedDocTypes((p) => p.includes(dt) ? p.filter((d) => d !== dt) : [...p, dt])}
                    className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold ${selectedDocTypes.includes(dt) ? "bg-violet-700 text-white border-violet-700" : "bg-white text-slate-600 border-slate-200"}`}>
                    {DOC_LABELS[dt]}
                  </button>
                ))}
              </div>
              {selectedDocTypes.length > 0 && <button type="button" onClick={requestDocuments} className="w-full rounded-lg bg-violet-700 text-white text-[11px] font-black py-1.5">בקש {selectedDocTypes.length} מסמכים</button>}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white resize-y min-h-[72px]" value={notes} onChange={(e) => { setNotes(e.target.value); setSaved(false); }} onBlur={saveNotes} placeholder="הערות פנימיות..." />
          <p className={`text-[11px] h-4 font-bold transition-opacity ${saved || saving ? "opacity-100" : "opacity-0"} ${saved ? "text-emerald-600" : "text-slate-400"}`}>{saving ? "שומר..." : "נשמר ✓"}</p>
        </div>
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
  const [stageFilter, setStageFilter] = useState("הכל");

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const s = params.get("stage");
    if (s && ALL_STATUSES.includes(s)) setStageFilter(s);
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
  const active = useMemo(() => leads.filter((l) => !["לא עונה", "לא רלוונטי", "נדחה בבנק", "עבר ליועץ אחר", "בוטל", "נסגר בהצלחה"].includes(l.pipelineStage || l.leadStatus || "")), [leads]);
  const closed = useMemo(() => leads.filter((l) => (l.pipelineStage || l.leadStatus) === "נסגר בהצלחה"), [leads]);
  const exited = useMemo(() => leads.filter((l) => ["לא עונה", "לא רלוונטי", "נדחה בבנק", "עבר ליועץ אחר", "בוטל"].includes(l.pipelineStage || l.leadStatus || "")), [leads]);
  const totalSpent = useMemo(() => leads.reduce((s, l) => s + (Number(l.purchasePrice) || 0), 0), [leads]);
  const conversionRate = leads.length > 0 ? Math.round((closed.length / leads.length) * 100) : 0;

  const filtered = useMemo(() => {
    let base = stageFilter === "הכל" ? leads : stageFilter === "פעיל" ? active : stageFilter === "נסגר" ? closed : stageFilter === "יצא" ? exited : leads.filter((l) => (l.pipelineStage || l.leadStatus) === stageFilter);
    if (q) base = base.filter((l) => (l.name || "").toLowerCase().includes(q) || (l.phone || "").replace(/\D/g, "").includes(q.replace(/\D/g, "")));
    return [...base].sort((a, b) => {
      const aOver = (a.nextActionAt && new Date(a.nextActionAt) < new Date()) || (a.followUpDate && new Date(a.followUpDate) < new Date());
      const bOver = (b.nextActionAt && new Date(b.nextActionAt) < new Date()) || (b.followUpDate && new Date(b.followUpDate) < new Date());
      if (aOver && !bOver) return -1;
      if (!aOver && bOver) return 1;
      const aDate = a.nextActionAt || a.followUpDate || a.createdAt || "";
      const bDate = b.nextActionAt || b.followUpDate || b.createdAt || "";
      return new Date(aDate) - new Date(bDate);
    });
  }, [leads, stageFilter, q, active, closed, exited]);

  // Pipeline grouped view
  const pipelineGroups = useMemo(() => {
    if (view !== "pipeline") return [];
    return PIPELINE_STAGES
      .map((stage, si) => ({
        stage, si,
        leads: filtered.filter((l) => (l.pipelineStage || l.leadStatus || "ליד חדש") === stage),
      }))
      .filter((g) => g.leads.length > 0);
  }, [filtered, view]);

  const exitGroup = useMemo(() => view === "pipeline" ? filtered.filter((l) => ["לא עונה", "לא רלוונטי", "נדחה בבנק", "עבר ליועץ אחר", "בוטל"].includes(l.pipelineStage || l.leadStatus || "")) : [], [filtered, view]);

  const tabs = [
    { key: "הכל", label: "הכל", count: leads.length },
    { key: "פעיל", label: "פעיל", count: active.length },
    { key: "נסגר", label: "נסגר בהצלחה", count: closed.length },
    { key: "יצא", label: "יצא מהתהליך", count: exited.length },
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

          {!loading && filtered.length === 0 && stageFilter === "הכל" && !q && (
            <EmptyState glyph="📋" title="עדיין לא רכשתם לידים" description="עברו לחנות הלידים כדי לקנות."
              action={<Link href="/advisor/leads" className="inline-block rounded-full bg-violet-700 text-white px-6 py-3 text-sm font-black">לחנות הלידים ←</Link>} />
          )}
          {!loading && filtered.length === 0 && (stageFilter !== "הכל" || q) && (
            <EmptyState glyph="🔍" title="אין תוצאות" description="נסו לשנות את החיפוש או הסינון." />
          )}

          {/* Pipeline grouped view */}
          {!loading && view === "pipeline" && (
            <div className="space-y-6">
              {pipelineGroups.map(({ stage, si, leads: groupLeads }) => (
                <div key={stage}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`h-3 w-3 rounded-full shrink-0 ${STAGE_PROGRESS_COLOR[si]}`} />
                    <h3 className="text-sm font-black text-slate-800">{stage}</h3>
                    <span className="text-xs font-black text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{groupLeads.length}</span>
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-[11px] font-bold text-slate-400">שלב {si + 1}/{PIPELINE_STAGES.length}</span>
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
