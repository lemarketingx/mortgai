import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { formatILS } from "../../../lib/format";
import AdvisorHeader from "../../../components/AdvisorHeader";

const STATUS_OPTIONS = ["חדש", "נוצר קשר", "מחכים למסמכים", "פגישה נקבעה", "הוגש לבנק", "אישור עקרוני", "נסגר", "אבוד", "לא רלוונטי"];
const FOLLOW_UP_STAGES = ["לא טופל", "ניסיון 1", "ניסיון 2", "נקבעה שיחה", "נשלחו מסמכים", "ממתין ללקוח", "נסגר"];

const DOC_TYPES = ["תעודת_זהות", "תלושי_שכר_3_אחרונים", "דפי_עו_ש_3_חודשים", "אישור_עבודה_ומשכורת", "חוזה_רכישה", "נסח_טאבו", "שומת_מס_אחרונה", "דוח_פנסיה", "אחר"];
const DOC_LABELS = {
  "תעודת_זהות": "תעודת זהות", "תלושי_שכר_3_אחרונים": "3 תלושי שכר", "דפי_עו_ש_3_חודשים": 'דפי עו"ש 3 חודשים',
  "אישור_עבודה_ומשכורת": "אישור עבודה", "חוזה_רכישה": "חוזה רכישה", "נסח_טאבו": "נסח טאבו",
  "שומת_מס_אחרונה": "שומת מס", "דוח_פנסיה": 'דו"ח פנסיה', "אחר": "מסמך אחר",
};

const WA_TEMPLATES = [
  { key: "initial", label: "פתיחת קשר", body: (name) => `שלום ${name || ""},\nכאן מ-FINZO, קיבלתי את הפנייה שלך בנושא משכנתא.\nאפשר לשלוח לך כמה שאלות קצרות כדי להבין התאמה ולהתקדם?` },
  { key: "docs", label: "בקשת מסמכים", body: (name) => `היי ${name || ""},\nכדי להתקדם עם בדיקת המשכנתא חסרים לי:\n• תעודת זהות\n• 3 תלושי שכר אחרונים\n• דפי עו"ש 3 חודשים\n\nאפשר לשלוח כאן. ברגע שיגיעו – אעדכן אותך.` },
  { key: "reminder", label: "תזכורת מסמכים", body: (name) => `תזכורת קטנה 🙂\nעדיין חסרים מסמכים בתיק ${name || ""} כדי שנוכל להתקדם.\nאם נוח לך – אפשר לשלוח בהודעה אחת מרוכזת.` },
  { key: "call", label: "קביעת שיחה", body: (name) => `היי ${name || ""},\nאשמח לשיחה קצרה של 10 דקות לסגור נתונים ולראות כיוון מתאים. מתי נוח לך?` },
  { key: "update", label: "עדכון שלב", body: (name, status) => `עדכון לתיק ${name || ""}: עברנו לשלב "${status || ""}". אעדכן אותך בכל התקדמות.` },
];

const ACTIVITY_ICONS = {
  lead_created: "⭐",
  status_changed: "🔄",
  call_logged: "📞",
  whatsapp_opened: "💬",
  whatsapp_sent: "💬",
  email_opened: "✉️",
  email_sent: "✉️",
  document_requested: "📄",
  document_received: "✅",
  note_added: "📝",
  reminder_set: "⏰",
};

function formatDateTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function ScoreRing({ score }) {
  const pct = Math.min(100, Math.max(0, Number(score) || 0));
  const color = pct >= 70 ? "text-emerald-600" : pct >= 40 ? "text-amber-500" : "text-slate-400";
  return (
    <div className={`text-2xl font-black tabular-nums ${color}`}>
      {pct}<span className="text-sm">/100</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    "חדש": "bg-violet-50 text-violet-700 border-violet-200",
    "נוצר קשר": "bg-sky-50 text-sky-700 border-sky-200",
    "מחכים למסמכים": "bg-amber-50 text-amber-700 border-amber-200",
    "פגישה נקבעה": "bg-indigo-50 text-indigo-700 border-indigo-200",
    "הוגש לבנק": "bg-blue-50 text-blue-700 border-blue-200",
    "אישור עקרוני": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "נסגר": "bg-green-50 text-green-800 border-green-200",
    "אבוד": "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${map[status] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
      {status}
    </span>
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
      const acts = Array.isArray(actData.activities) ? actData.activities : [];
      setActivities(acts.length > 0 ? acts : [{ title: "הליד נוצר", created_at: found.createdAt, activity_type: "lead_created" }]);
      setDocuments(Array.isArray(docsData.documents) ? docsData.documents : []);
      setLoading(false);
    }).catch(() => { setLoading(false); router.push("/advisor/my-leads"); });
  }, [id]);

  function pushActivity(title, activityType = "note_added") {
    setActivities((prev) => [{ title, created_at: new Date().toISOString(), activity_type: activityType }, ...prev]);
    fetch("/api/advisor/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: id, activityType, title }),
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
    } else {
      setMsg({ text: "שמירה נכשלה", ok: false });
    }
    setSaving(false);
  }

  async function saveNotes() {
    if (notes === (lead?.internalNotes || "")) return;
    await patchLead({ internalNotes: notes, lastContactedAt: new Date().toISOString() }, "הערה עודכנה", "note_added");
    setSavedNotes(true);
    setTimeout(() => setSavedNotes(false), 2000);
  }

  function openWa(template = "") {
    if (!lead?.phone) return;
    const raw = String(lead.phone).replace(/[^\d]/g, "");
    const phone = raw.startsWith("0") ? `972${raw.slice(1)}` : raw;
    const tmpl = WA_TEMPLATES.find((t) => t.key === template);
    const text = tmpl ? tmpl.body(lead.name, lead.leadStatus) : "";
    const url = text ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/${phone}`;
    window.open(url, "_blank", "noopener,noreferrer");
    pushActivity(`נפתח WhatsApp${tmpl ? ` (${tmpl.label})` : ""}`, "whatsapp_opened");
    patchLead({ lastContactedAt: new Date().toISOString() });
  }

  async function requestDocs() {
    if (!selectedDocs.length) return;
    const r = await fetch("/api/advisor/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: id, documentTypes: selectedDocs }),
    });
    if (r.ok) {
      const j = await r.json();
      setDocuments((prev) => [...prev, ...(j.documents || [])]);
      pushActivity(`בקשת מסמכים: ${selectedDocs.map((d) => DOC_LABELS[d]).join(", ")}`, "document_requested");
      setSelectedDocs([]);
    }
  }

  async function markDocReceived(doc) {
    const r = await fetch("/api/advisor/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: doc.id, status: "received", leadId: id, documentType: doc.document_type }),
    });
    if (r.ok) {
      setDocuments((prev) => prev.map((d) => d.id === doc.id ? { ...d, status: "received" } : d));
      pushActivity(`מסמך התקבל: ${DOC_LABELS[doc.document_type] || doc.document_type}`, "document_received");
    }
  }

  const missingDocs = documents.filter((d) => d.status === "requested").length;
  const receivedDocs = documents.filter((d) => d.status === "received" || d.status === "approved").length;
  const score = Math.round(Number(lead?.approvalScore || lead?.estimatedApprovalResult) || 0);

  if (loading) {
    return (
      <main dir="rtl" className="min-h-screen bg-slate-50">
        <AdvisorHeader />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-6" />
          <div className="grid lg:grid-cols-[1fr_360px] gap-4">
            <div className="bg-white rounded-2xl h-96 animate-pulse" />
            <div className="bg-white rounded-2xl h-96 animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  if (!lead) return null;

  const phone = lead.phone ? String(lead.phone).replace(/[^\d]/g, "") : "";

  return (
    <>
      <Head>
        <title>{lead.name || "ליד"} | FINZO PRO</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main dir="rtl" className="min-h-screen bg-slate-50 pb-24 md:pb-0">
        <AdvisorHeader active="/advisor/my-leads" />

        {/* Lead header */}
        <div className="bg-white border-b border-slate-100 sticky top-14 z-30">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
            <Link href="/advisor/my-leads" className="text-xs font-black text-slate-400 hover:text-slate-700">← חזרה</Link>
            <div className="flex-1 flex items-center gap-2 flex-wrap min-w-0">
              <h1 className="text-lg font-black text-slate-950">{lead.name || "—"}</h1>
              <StatusBadge status={lead.leadStatus || "חדש"} />
              <ScoreRing score={score} />
              {lead.leadQuality && (
                <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${lead.leadQuality === "חם" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : lead.leadQuality === "בינוני" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                  {lead.leadQuality}
                </span>
              )}
              {missingDocs > 0 && <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">חסרים {missingDocs} מסמכים</span>}
            </div>
            {saving && <span className="text-xs text-slate-400 font-bold">שומר...</span>}
          </div>

          {/* Quick action bar */}
          <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-2 flex-wrap">
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                onClick={() => { pushActivity("בוצעה שיחה", "call_logged"); patchLead({ lastContactedAt: new Date().toISOString() }); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-xs font-black hover:bg-violet-100 transition-colors border border-violet-200"
              >
                ☎ התקשר
              </a>
            )}
            {lead.phone && (
              <button
                type="button"
                onClick={() => openWa()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-black hover:bg-emerald-100 transition-colors border border-emerald-200"
              >
                💬 WhatsApp
              </button>
            )}
            {lead.phone && (
              <div className="flex items-center gap-1">
                <select
                  className="text-xs font-bold border border-emerald-200 rounded-lg px-2 py-1.5 bg-white text-emerald-700"
                  value={waTemplate}
                  onChange={(e) => { setWaTemplate(e.target.value); if (e.target.value) { openWa(e.target.value); setWaTemplate(""); } }}
                >
                  <option value="">תבנית WA...</option>
                  {WA_TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
            )}
            {lead.advisorEmail && (
              <a
                href={`mailto:${lead.advisorEmail}`}
                onClick={() => { pushActivity("נשלח מייל", "email_opened"); patchLead({ lastContactedAt: new Date().toISOString() }); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 text-xs font-black hover:bg-sky-100 transition-colors border border-sky-200"
              >
                ✉ מייל
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                const d = prompt("תזכורת ל (YYYY-MM-DD):");
                if (d) patchLead({ followUpDate: d }, `נקבע follow-up ל-${d}`, "reminder_set");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-black hover:bg-slate-200 transition-colors border border-slate-200"
            >
              ⏰ תזכורת
            </button>
          </div>
        </div>

        {msg.text && (
          <div className={`max-w-5xl mx-auto mt-3 px-4 py-2 rounded-xl text-sm font-bold ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {msg.text}
          </div>
        )}

        <div className="max-w-5xl mx-auto px-4 py-4 grid lg:grid-cols-[1fr_360px] gap-4">

          {/* ── Left: Timeline ── */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-50">
                <h2 className="text-sm font-black text-slate-950">היסטוריית פעילות</h2>
              </div>
              <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
                {activities.map((act, idx) => (
                  <div key={`${act.created_at}-${idx}`} className="flex gap-3 px-5 py-3.5">
                    <span className="text-base shrink-0 mt-0.5">{ACTIVITY_ICONS[act.activity_type] || "•"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800">{act.title}</p>
                      {act.body && <p className="text-xs text-slate-500 mt-0.5">{act.body}</p>}
                      <p className="text-[11px] text-slate-400 mt-0.5">{formatDateTime(act.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h2 className="text-sm font-black text-slate-950 mb-3">הערות פנימיות</h2>
              <textarea
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white resize-y min-h-[100px] outline-none focus:ring-2 focus:ring-violet-300"
                value={notes}
                onChange={(e) => { setNotes(e.target.value); setSavedNotes(false); }}
                onBlur={saveNotes}
                placeholder="הערות, תיאום שיחה, עדכון סטטוס, חסרים..."
              />
              <p className={`text-xs mt-1.5 font-bold transition-opacity ${savedNotes ? "opacity-100 text-emerald-600" : "opacity-0"}`}>נשמר ✓</p>
            </div>
          </div>

          {/* ── Right: Details + Docs + Next action ── */}
          <div className="space-y-4">

            {/* Status + next action */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h2 className="text-sm font-black text-slate-950 mb-3">סטטוס וטיפול</h2>
              <div className="grid gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-1">סטטוס</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300"
                    value={lead.leadStatus || "חדש"}
                    onChange={(e) => patchLead({ leadStatus: e.target.value, lastContactedAt: new Date().toISOString() }, `סטטוס שונה ל"${e.target.value}"`, "status_changed")}
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-1">שלב מעקב</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300"
                    value={lead.followUpStage || "לא טופל"}
                    onChange={(e) => patchLead({ followUpStage: e.target.value }, `שלב מעקב: ${e.target.value}`)}
                  >
                    {FOLLOW_UP_STAGES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-1">תאריך follow-up</label>
                  <input
                    type="date"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300"
                    defaultValue={lead.followUpDate?.slice(0, 10) || ""}
                    onBlur={(e) => { if (e.target.value) patchLead({ followUpDate: e.target.value }, `נקבע follow-up ל-${e.target.value}`, "reminder_set"); }}
                  />
                </div>
              </div>
            </div>

            {/* Lead details */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h2 className="text-sm font-black text-slate-950 mb-3">פרטי ליד</h2>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  ["טלפון", lead.phone],
                  ["עיר", lead.city || lead.propertyCity],
                  ["משכנתא", lead.mortgageAmount ? formatILS(lead.mortgageAmount) : null],
                  ["מחיר נכס", lead.propertyPrice ? formatILS(lead.propertyPrice) : null],
                  ["הון עצמי", lead.equityAmount ? formatILS(lead.equityAmount) : null],
                  ["הכנסה חודשית", lead.monthlyIncome ? formatILS(lead.monthlyIncome) : null],
                  ["סיכוי אישור", score > 0 ? `${score}%` : null],
                  ["סטטוס חוזה", lead.contractStatus || lead.purchaseStatus],
                  ["נוצר", lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("he-IL") : null],
                  ["קשר ראשון", lead.firstContactAt ? new Date(lead.firstContactAt).toLocaleDateString("he-IL") : "טרם נוצר"],
                  ["שולם על הליד", lead.purchasePrice > 0 ? formatILS(lead.purchasePrice) : null],
                  ["סוג רכישה", lead.isExclusive ? "בלעדי" : lead.purchaseType === "partner_claim" ? "שותף" : lead.purchaseType === "regular" ? "רגיל" : null],
                  ["תאריך רכישה", lead.purchasedAt ? new Date(lead.purchasedAt).toLocaleDateString("he-IL") : null],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-2.5">
                    <p className="text-slate-400 font-black mb-0.5">{label}</p>
                    <p className="font-black text-slate-800 break-words">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Document checklist */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black text-slate-950">מסמכים</h2>
                {documents.length > 0 && (
                  <span className="text-xs font-black text-slate-400">{receivedDocs}/{documents.length} התקבלו</span>
                )}
              </div>

              {/* Existing docs */}
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

              {/* Request new docs */}
              <div>
                <p className="text-xs font-black text-slate-400 mb-2">בקש מסמכים:</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {DOC_TYPES.filter((dt) => !documents.find((d) => d.document_type === dt)).map((dt) => (
                    <button
                      key={dt}
                      type="button"
                      onClick={() => setSelectedDocs((prev) => prev.includes(dt) ? prev.filter((d) => d !== dt) : [...prev, dt])}
                      className={`text-[11px] px-2 py-1 rounded-full border font-bold transition-colors ${selectedDocs.includes(dt) ? "bg-violet-700 text-white border-violet-700" : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"}`}
                    >
                      {DOC_LABELS[dt]}
                    </button>
                  ))}
                </div>
                {selectedDocs.length > 0 && (
                  <button
                    type="button"
                    onClick={requestDocs}
                    className="w-full rounded-xl bg-violet-700 text-white text-xs font-black py-2.5 hover:bg-violet-800 transition-colors"
                  >
                    בקש {selectedDocs.length} מסמך{selectedDocs.length > 1 ? "ים" : ""}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Mobile sticky bottom bar */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 px-4 py-3 flex gap-2">
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="flex-1 text-center text-xs font-black text-violet-700 bg-violet-50 rounded-xl py-2.5">
              ☎ שיחה
            </a>
          )}
          {lead.phone && (
            <button type="button" onClick={() => openWa()} className="flex-1 text-center text-xs font-black text-emerald-700 bg-emerald-50 rounded-xl py-2.5">
              💬 WhatsApp
            </button>
          )}
          <Link href="/advisor/my-leads" className="flex-1 text-center text-xs font-black text-slate-600 bg-slate-100 rounded-xl py-2.5">
            ← חזרה
          </Link>
        </div>
      </main>
    </>
  );
}
