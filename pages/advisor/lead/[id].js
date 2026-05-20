import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { formatILS } from "../../../lib/format";
import AdvisorHeader from "../../../components/AdvisorHeader";

const PIPELINE_STAGES = [
  "ליד חדש", "נוצר קשר", "נשלחה רשימת מסמכים", "מחכה למסמכים",
  "מסמכים התקבלו", "בדיקת זכאות", "הוגש לבנק", "אישור עקרוני",
  "משא ומתן מול בנקים", "נבחר תמהיל", "נקבעו חתימות", "נסגר בהצלחה",
];
const EXIT_STATUSES = ["לא עונה", "לא רלוונטי", "נדחה בבנק", "עבר ליועץ אחר", "בוטל"];

const STAGE_COLORS = [
  "bg-violet-500", "bg-violet-400", "bg-indigo-400", "bg-amber-400",
  "bg-amber-500", "bg-sky-400", "bg-sky-500", "bg-blue-500",
  "bg-blue-400", "bg-emerald-400", "bg-emerald-500", "bg-green-500",
];
const STAGE_RING = [
  "ring-violet-400", "ring-violet-400", "ring-indigo-400", "ring-amber-400",
  "ring-amber-400", "ring-sky-400", "ring-sky-400", "ring-blue-400",
  "ring-blue-400", "ring-emerald-400", "ring-emerald-400", "ring-green-400",
];

const BANKS = ["בנק לאומי", "בנק הפועלים", "בנק דיסקונט", "מזרחי-טפחות", "הבינלאומי", "One Zero", "יורוקום", "אחר"];
const MORTGAGE_TYPES = ["משכנתא ראשונה", "מחזור משכנתא", "הלוואת גישור", "שיפור תנאים", "הגדלת משכנתא", "משכנתא לצרכים חופשיים"];

const DOC_TYPES = ["תעודת_זהות", "תלושי_שכר_3_אחרונים", "דפי_עו_ש_3_חודשים", "אישור_עבודה_ומשכורת", "חוזה_רכישה", "נסח_טאבו", "שומת_מס_אחרונה", "דוח_פנסיה", "אחר"];
const DOC_LABELS = {
  "תעודת_זהות": "תעודת זהות", "תלושי_שכר_3_אחרונים": "3 תלושי שכר", "דפי_עו_ש_3_חודשים": 'דפי עו"ש 3 חודשים',
  "אישור_עבודה_ומשכורת": "אישור עבודה", "חוזה_רכישה": "חוזה רכישה", "נסח_טאבו": "נסח טאבו",
  "שומת_מס_אחרונה": "שומת מס", "דוח_פנסיה": 'דו"ח פנסיה', "אחר": "מסמך אחר",
};
const WA_TEMPLATES = [
  { key: "initial", label: "פתיחת קשר", body: (n) => `שלום ${n || ""},\nכאן מ-FINZO, קיבלתי את הפנייה שלך למשכנתא.\nאפשר לשאול כמה שאלות קצרות כדי להבין התאמה?` },
  { key: "docs", label: "בקשת מסמכים", body: (n) => `היי ${n || ""},\nכדי להתקדם עם בדיקת המשכנתא חסרים לי:\n• תעודת זהות\n• 3 תלושי שכר אחרונים\n• דפי עו"ש 3 חודשים\n\nאפשר לשלוח כאן.` },
  { key: "reminder", label: "תזכורת מסמכים", body: (n) => `תזכורת קטנה 🙂\nעדיין חסרים מסמכים בתיק ${n || ""} כדי להתקדם.\nנוח לשלוח הכל בהודעה אחת?` },
  { key: "call", label: "קביעת שיחה", body: (n) => `היי ${n || ""},\nאשמח לשיחה של 10 דקות לסגור נתונים ולראות כיוון מתאים. מתי נוח?` },
  { key: "approval", label: "עדכון אישור", body: (n, s) => `עדכון לתיק ${n || ""}: עברנו לשלב "${s || ""}". אעדכן אתכם בכל התקדמות.` },
];
const ACTIVITY_ICONS = {
  lead_created: "⭐", status_changed: "🔄", call_logged: "📞",
  whatsapp_opened: "💬", whatsapp_sent: "💬", email_opened: "✉️", email_sent: "✉️",
  document_requested: "📄", document_received: "✅", note_added: "📝", reminder_set: "⏰",
};

function formatDT(d) { if (!d) return ""; return new Date(d).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
function formatDate(d) { if (!d) return ""; return new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" }); }
function isOverdue(d) { return d && new Date(d) < new Date(new Date().toDateString()); }

function getStage(lead) { return lead?.pipelineStage || lead?.leadStatus || "ליד חדש"; }
function getStageIndex(lead) { return PIPELINE_STAGES.indexOf(getStage(lead)); }

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
    <div className="bg-white border-b border-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-3">
        {/* Scrollable stage dots */}
        <div ref={scrollRef} className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
          {PIPELINE_STAGES.map((stage, i) => {
            const done = i < si;
            const active = i === si;
            const color = STAGE_COLORS[i];
            return (
              <button
                key={stage}
                type="button"
                onClick={() => onSetStage(stage)}
                title={stage}
                className={`flex-none flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all ${active ? "bg-slate-50 ring-2 " + STAGE_RING[i] : "hover:bg-slate-50"}`}
              >
                <div className={`h-3 w-3 rounded-full transition-all ${done ? color + " opacity-60" : active ? color : "bg-slate-200"}`} />
                <span className={`text-[10px] font-bold whitespace-nowrap ${active ? "text-slate-900" : done ? "text-slate-400" : "text-slate-300"}`} style={{ maxWidth: "72px", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {stage}
                </span>
              </button>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-1 flex items-center gap-3">
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${si >= 0 ? STAGE_COLORS[si] : "bg-violet-400"}`}
              style={{ width: si >= 0 ? `${Math.round(((si + 1) / PIPELINE_STAGES.length) * 100)}%` : "8%" }}
            />
          </div>
          <span className="text-xs font-black tabular-nums text-slate-500 shrink-0">
            {si >= 0 ? `${si + 1}/${PIPELINE_STAGES.length}` : "—"}
          </span>
          {si >= 0 && si < PIPELINE_STAGES.length - 1 && (
            <button
              type="button"
              onClick={onAdvance}
              className={`shrink-0 text-xs font-black px-3 py-1.5 rounded-xl text-white transition-colors ${STAGE_COLORS[si + 1]} hover:opacity-90`}
            >
              הבא: {PIPELINE_STAGES[si + 1]} ←
            </button>
          )}
          {getStage(lead) === "נסגר בהצלחה" && <span className="shrink-0 text-xs font-black text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-xl">🎉 נסגר בהצלחה</span>}
        </div>
      </div>
    </div>
  );
}

export default function LeadDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [waTemplate, setWaTemplate] = useState("");
  const [msg, setMsg] = useState({ text: "", ok: true });
  const [nextActionText, setNextActionText] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");

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
      setDocuments(Array.isArray(docsData.documents) ? docsData.documents : []);
      setLoading(false);
    }).catch(() => { setLoading(false); router.push("/advisor/my-leads"); });
  }, [id]);

  function pushActivity(title, activityType = "note_added") {
    setActivities((prev) => [{ title, created_at: new Date().toISOString(), activity_type: activityType }, ...prev]);
    fetch("/api/advisor/activities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: id, activityType, title }) }).catch(() => {});
  }

  async function patchLead(changes, activityTitle, activityType = "note_added") {
    setSaving(true);
    const r = await fetch("/api/advisor/my-leads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, changes }) });
    if (r.ok) {
      const j = await r.json();
      setLead((prev) => ({ ...prev, ...j.lead }));
      if (activityTitle) pushActivity(activityTitle, activityType);
    } else {
      setMsg({ text: "שמירה נכשלה", ok: false });
      setTimeout(() => setMsg({ text: "", ok: true }), 3000);
    }
    setSaving(false);
  }

  async function advanceStage() {
    const si = getStageIndex(lead);
    if (si < 0 || si >= PIPELINE_STAGES.length - 1) return;
    const next = PIPELINE_STAGES[si + 1];
    await patchLead({ pipelineStage: next, lastContactedAt: new Date().toISOString() }, `שלב עודכן: "${next}"`, "status_changed");
  }

  async function setStage(stage) {
    if (stage === getStage(lead)) return;
    await patchLead({ pipelineStage: stage, lastContactedAt: new Date().toISOString() }, `שלב עודכן: "${stage}"`, "status_changed");
  }

  async function saveNotes() {
    if (notes === (lead?.internalNotes || "")) return;
    await patchLead({ internalNotes: notes, lastContactedAt: new Date().toISOString() }, "הערה עודכנה", "note_added");
    setSavedNotes(true); setTimeout(() => setSavedNotes(false), 2000);
  }

  async function saveNextAction() {
    const changes = {};
    if (nextActionText !== (lead?.nextAction || "")) changes.nextAction = nextActionText;
    if (nextActionDate && nextActionDate !== (lead?.nextActionAt?.slice(0, 10) || "")) changes.nextActionAt = nextActionDate;
    if (!nextActionDate && lead?.nextActionAt) changes.nextActionAt = "";
    if (Object.keys(changes).length === 0) return;
    await patchLead(changes, nextActionText ? `פעולה הבאה: ${nextActionText}` : "פעולה הבאה בוטלה", "reminder_set");
  }

  function openWa(template = "") {
    if (!lead?.phone) return;
    const raw = String(lead.phone).replace(/[^\d]/g, "");
    const phone = raw.startsWith("0") ? `972${raw.slice(1)}` : raw;
    const tmpl = WA_TEMPLATES.find((t) => t.key === template);
    const text = tmpl ? tmpl.body(lead.name, getStage(lead)) : "";
    window.open(text ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/${phone}`, "_blank", "noopener,noreferrer");
    pushActivity(`WhatsApp${tmpl ? ` — ${tmpl.label}` : ""}`, "whatsapp_opened");
    patchLead({ lastContactedAt: new Date().toISOString() });
  }

  async function requestDocs() {
    if (!selectedDocs.length) return;
    const r = await fetch("/api/advisor/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: id, documentTypes: selectedDocs }) });
    if (r.ok) {
      const j = await r.json();
      setDocuments((prev) => [...prev, ...(j.documents || [])]);
      pushActivity(`בקשת מסמכים: ${selectedDocs.map((d) => DOC_LABELS[d]).join(", ")}`, "document_requested");
      setSelectedDocs([]);
    }
  }

  async function markDocReceived(doc) {
    const r = await fetch("/api/advisor/documents", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: doc.id, status: "received", leadId: id, documentType: doc.document_type }) });
    if (r.ok) {
      setDocuments((prev) => prev.map((d) => d.id === doc.id ? { ...d, status: "received" } : d));
      pushActivity(`מסמך התקבל: ${DOC_LABELS[doc.document_type] || doc.document_type}`, "document_received");
    }
  }

  const missingDocs = documents.filter((d) => d.status === "requested").length;
  const receivedDocs = documents.filter((d) => d.status === "received" || d.status === "approved").length;
  const score = Math.round(Number(lead?.approvalScore || lead?.estimatedApprovalResult) || 0);
  const si = lead ? getStageIndex(lead) : -1;

  if (loading) {
    return (
      <main dir="rtl" className="min-h-screen bg-slate-50">
        <AdvisorHeader />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-4" />
          <div className="h-20 bg-slate-200 rounded-2xl animate-pulse mb-4" />
          <div className="grid lg:grid-cols-[1fr_360px] gap-4">
            <div className="bg-white rounded-2xl h-96 animate-pulse" />
            <div className="bg-white rounded-2xl h-96 animate-pulse" />
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

        {/* Sticky header */}
        <div className="sticky top-14 z-30 bg-white border-b border-slate-100 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
            <Link href="/advisor/my-leads" className="text-xs font-black text-slate-400 hover:text-slate-700 shrink-0">← חזרה</Link>
            <h1 className="text-lg font-black text-slate-950 truncate flex-1">{lead.name || "—"}</h1>
            {lead.phone && <a href={`tel:${lead.phone}`} className="text-sm font-black text-violet-600 shrink-0">{lead.phone}</a>}
            {score > 0 && <span className={`text-sm font-black tabular-nums shrink-0 ${score >= 70 ? "text-emerald-600" : score >= 40 ? "text-amber-500" : "text-slate-400"}`}>{score}/100</span>}
            {missingDocs > 0 && <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">חסרים {missingDocs}</span>}
            {saving && <span className="text-xs text-slate-400 font-bold shrink-0">שומר...</span>}
          </div>

          {/* Action bar */}
          <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-2 flex-wrap">
            {lead.phone && <a href={`tel:${lead.phone}`} onClick={() => { pushActivity("בוצעה שיחה", "call_logged"); patchLead({ lastContactedAt: new Date().toISOString() }); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-xs font-black border border-violet-200">☎ שיחה</a>}
            {lead.phone && <button type="button" onClick={() => openWa()} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200">💬 WhatsApp</button>}
            {lead.phone && (
              <select className="text-xs font-bold border border-emerald-200 rounded-lg px-2 py-1.5 bg-white text-emerald-700" value={waTemplate} onChange={(e) => { setWaTemplate(e.target.value); if (e.target.value) { openWa(e.target.value); setWaTemplate(""); } }}>
                <option value="">תבנית WA...</option>
                {WA_TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            )}
            {(lead.advisorEmail || lead.email) && <a href={`mailto:${lead.advisorEmail || lead.email}`} onClick={() => { pushActivity("נשלח מייל", "email_opened"); patchLead({ lastContactedAt: new Date().toISOString() }); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 text-xs font-black border border-sky-200">✉ מייל</a>}
          </div>
        </div>

        {/* Stage stepper */}
        <StageStepper lead={lead} onAdvance={advanceStage} onSetStage={setStage} />

        {msg.text && <div className={`max-w-5xl mx-auto mt-3 px-4 py-2 rounded-xl text-sm font-bold ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{msg.text}</div>}

        <div className="max-w-5xl mx-auto px-4 py-4 grid lg:grid-cols-[1fr_360px] gap-4">

          {/* Left column: Timeline + Notes */}
          <div className="space-y-4">

            {/* Activity timeline */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-50">
                <h2 className="text-sm font-black text-slate-950">היסטוריית פעילות</h2>
              </div>
              <div className="divide-y divide-slate-50 max-h-[480px] overflow-y-auto">
                {activities.map((act, idx) => (
                  <div key={`${act.created_at}-${idx}`} className="flex gap-3 px-5 py-3">
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

            {/* Notes */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h2 className="text-sm font-black text-slate-950 mb-3">הערות פנימיות</h2>
              <textarea className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white resize-y min-h-[100px] outline-none focus:ring-2 focus:ring-violet-300" value={notes} onChange={(e) => { setNotes(e.target.value); setSavedNotes(false); }} onBlur={saveNotes} placeholder="הערות, תיאום שיחה, עדכון סטטוס, חסרים..." />
              <p className={`text-xs mt-1.5 font-bold transition-opacity ${savedNotes ? "opacity-100 text-emerald-600" : "opacity-0"}`}>נשמר ✓</p>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">

            {/* Next action */}
            <div className={`bg-white rounded-2xl border p-5 ${isOverdue(lead.nextActionAt) ? "border-rose-300 bg-rose-50/20" : "border-slate-100"}`}>
              <h2 className="text-sm font-black text-slate-950 mb-3">
                פעולה הבאה
                {isOverdue(lead.nextActionAt) && <span className="text-xs font-black text-rose-600 mr-2">— באיחור</span>}
              </h2>
              <div className="grid gap-2">
                <input type="text" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300" placeholder="מה הפעולה הבאה?" value={nextActionText} onChange={(e) => setNextActionText(e.target.value)} onBlur={saveNextAction} />
                <input type="date" className={`w-full border rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300 ${isOverdue(nextActionDate) ? "border-rose-300 bg-rose-50/30" : "border-slate-200"}`} value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} onBlur={saveNextAction} />
              </div>
            </div>

            {/* Stage + flow control */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h2 className="text-sm font-black text-slate-950 mb-3">ניהול שלב</h2>
              <div className="grid gap-2">
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-1">שלב נוכחי</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300" value={getStage(lead)} onChange={(e) => setStage(e.target.value)}>
                    <optgroup label="Pipeline פעיל">
                      {PIPELINE_STAGES.map((s) => <option key={s}>{s}</option>)}
                    </optgroup>
                    <optgroup label="יצא מהתהליך">
                      {EXIT_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-1">תאריך follow-up</label>
                  <input type="date" className={`w-full border rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300 ${isOverdue(lead.followUpDate) ? "border-amber-300 bg-amber-50/30" : "border-slate-200"}`} defaultValue={lead.followUpDate?.slice(0, 10) || ""} onBlur={(e) => { if (e.target.value) patchLead({ followUpDate: e.target.value }, `follow-up: ${e.target.value}`, "reminder_set"); }} />
                </div>
              </div>
            </div>

            {/* Deal details */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h2 className="text-sm font-black text-slate-950 mb-3">פרטי העסקה</h2>
              <div className="grid gap-2 mb-3">
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-1">בנק</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300" value={lead.bankName || ""} onChange={(e) => patchLead({ bankName: e.target.value }, e.target.value ? `בנק: ${e.target.value}` : "")}>
                    <option value="">בחר בנק...</option>
                    {BANKS.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-1">סוג משכנתא</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300" value={lead.mortgageType || ""} onChange={(e) => patchLead({ mortgageType: e.target.value }, e.target.value ? `סוג משכנתא: ${e.target.value}` : "")}>
                    <option value="">בחר סוג...</option>
                    {MORTGAGE_TYPES.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ["טלפון", lead.phone],
                  ["מייל", lead.email || lead.advisorEmail],
                  ["עיר", lead.city || lead.propertyCity],
                  ["משכנתא", lead.mortgageAmount ? formatILS(lead.mortgageAmount) : null],
                  ["מחיר נכס", lead.propertyPrice ? formatILS(lead.propertyPrice) : null],
                  ["הון עצמי", lead.equityAmount ? formatILS(lead.equityAmount) : null],
                  ["הכנסה", lead.monthlyIncome ? formatILS(lead.monthlyIncome) : null],
                  ["ציון", score > 0 ? `${score}/100` : null],
                  ["נרכש", lead.purchasedAt ? formatDate(lead.purchasedAt) : null],
                  ["שולם", lead.purchasePrice > 0 ? formatILS(lead.purchasePrice) : null],
                  ["סוג קנייה", lead.isExclusive ? "בלעדי" : lead.purchaseType === "regular" ? "רגיל" : null],
                  ["קשר ראשון", lead.firstContactAt ? formatDate(lead.firstContactAt) : "טרם"],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-2.5">
                    <p className="text-slate-400 font-black mb-0.5">{label}</p>
                    <p className="font-black text-slate-800 break-words">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black text-slate-950">מסמכים</h2>
                {documents.length > 0 && <span className="text-xs font-black text-slate-400">{receivedDocs}/{documents.length} התקבלו</span>}
              </div>
              {documents.length > 0 && (
                <div className="mb-3 grid gap-1.5">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                      <span className="text-xs font-bold text-slate-700">{DOC_LABELS[doc.document_type] || doc.document_type}</span>
                      {doc.status === "received" || doc.status === "approved"
                        ? <span className="text-xs font-black text-emerald-600 shrink-0">✓ התקבל</span>
                        : <button type="button" onClick={() => markDocReceived(doc)} className="text-[11px] font-black text-violet-600 hover:underline shrink-0">סמן כהתקבל</button>}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs font-black text-slate-400 mb-2">בקש מסמכים:</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {DOC_TYPES.filter((dt) => !documents.find((d) => d.document_type === dt)).map((dt) => (
                  <button key={dt} type="button" onClick={() => setSelectedDocs((p) => p.includes(dt) ? p.filter((d) => d !== dt) : [...p, dt])}
                    className={`text-[11px] px-2 py-1 rounded-full border font-bold transition-colors ${selectedDocs.includes(dt) ? "bg-violet-700 text-white border-violet-700" : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"}`}>
                    {DOC_LABELS[dt]}
                  </button>
                ))}
              </div>
              {selectedDocs.length > 0 && <button type="button" onClick={requestDocs} className="w-full rounded-xl bg-violet-700 text-white text-xs font-black py-2.5 hover:bg-violet-800 transition-colors">בקש {selectedDocs.length} מסמך{selectedDocs.length > 1 ? "ים" : ""}</button>}
            </div>

          </div>
        </div>

        {/* Mobile bottom bar */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 px-4 py-3 flex gap-2">
          {lead.phone && <a href={`tel:${lead.phone}`} className="flex-1 text-center text-xs font-black text-violet-700 bg-violet-50 rounded-xl py-2.5">☎ שיחה</a>}
          {lead.phone && <button type="button" onClick={() => openWa()} className="flex-1 text-center text-xs font-black text-emerald-700 bg-emerald-50 rounded-xl py-2.5">💬 WA</button>}
          {si >= 0 && si < PIPELINE_STAGES.length - 1 && <button type="button" onClick={advanceStage} className="flex-1 text-center text-xs font-black text-white bg-violet-700 rounded-xl py-2.5">הבא ←</button>}
          <Link href="/advisor/my-leads" className="flex-1 text-center text-xs font-black text-slate-600 bg-slate-100 rounded-xl py-2.5">← חזרה</Link>
        </div>
      </main>
    </>
  );
}
