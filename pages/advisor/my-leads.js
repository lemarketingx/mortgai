import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatILS } from "../../lib/format";
import { KpiTile, Tag, Skeleton, EmptyState } from "../../components/ui";
import AdvisorHeader from "../../components/AdvisorHeader";

const QUALITY_TAG = { "חם": "upgrade", "בינוני": "refi", "חלש": "danger" };
const STATUS_OPTIONS = ["חדש", "נוצר קשר", "מחכים למסמכים", "פגישה נקבעה", "הוגש לבנק", "אישור עקרוני", "נסגר", "אבוד"];
const TEMPLATE_MESSAGES = {
  "בקשת מסמכים": "היי, אשמח שתשלחו לי את המסמכים הנדרשים כדי לקדם את התיק.",
  "תיאום שיחה": "היי, מתי נוח לכם לשיחה קצרה היום/מחר לתיאום המשך הטיפול?",
  "תזכורת": "רק תזכורת קצרה ממני לגבי המשך התהליך במשכנתא.",
  "חסר מסמכים": "שימו לב שחסרים עדיין מסמכים בתיק. ברגע שישלחו נוכל להתקדם מיד.",
  "עדכון סטטוס": "עדכון סטטוס: התיק התקדם, ואעדכן אתכם בכל שלב נוסף.",
};

const STATUS_BADGE = {
  "חדש": "bg-violet-50 text-violet-700",
  "נוצר קשר": "bg-sky-50 text-sky-700",
  "מחכים למסמכים": "bg-amber-50 text-amber-700",
  "פגישה נקבעה": "bg-indigo-50 text-indigo-700",
  "הוגש לבנק": "bg-blue-50 text-blue-700",
  "אישור עקרוני": "bg-emerald-50 text-emerald-700",
  "נסגר": "bg-slate-100 text-slate-700",
  "אבוד": "bg-rose-50 text-rose-700",
};

const TODAY = () => new Date(new Date().toDateString());
const DAY_MS = 1000 * 60 * 60 * 24;


const isBrowser = typeof window !== "undefined";

function loadLocalTimeline(leadId) {
  if (!isBrowser || !leadId) return [];
  try {
    const raw = window.localStorage.getItem(`finzo.crm.timeline.${leadId}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalTimeline(leadId, timeline) {
  if (!isBrowser || !leadId) return;
  try {
    window.localStorage.setItem(`finzo.crm.timeline.${leadId}`, JSON.stringify(timeline.slice(0, 30)));
  } catch {
    // ignore storage errors
  }
}

function diffDays(dateStr) {
  if (!dateStr) return null;
  const target = new Date(new Date(dateStr).toDateString());
  const today = TODAY();
  return Math.max(0, Math.floor((today.getTime() - target.getTime()) / DAY_MS));
}

function formatDateTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function getStatusBadgeClass(status) {
  return STATUS_BADGE[status] || STATUS_BADGE["חדש"];
}

function buildSignals(lead) {
  const signals = [];
  const idleDays = diffDays(lead.lastContactedAt || lead.lastUpdated || lead.updatedAt || lead.createdAt);
  if (typeof idleDays === "number" && idleDays >= 3) signals.push({ text: `לא טופל ${idleDays} ימים`, variant: "danger" });
  if (lead.leadStatus === "מחכים למסמכים") {
    const waitingDays = diffDays(lead.lastUpdated || lead.updatedAt || lead.createdAt);
    if (typeof waitingDays === "number" && waitingDays >= 1) signals.push({ text: `מחכה למסמכים ${waitingDays} ימים`, variant: "refi" });
  }
  const { isToday, isOverdue } = getFollowUpState(lead.followUpDate?.slice(0, 10));
  if (isToday) signals.push({ text: "Follow-up היום", variant: "upgrade" });
  if (isOverdue) signals.push({ text: "באיחור", variant: "danger" });
  const score = Number(lead.approvalScore || lead.estimatedApprovalResult) || 0;
  if (score >= 70 && (!lead.lastContactedAt || diffDays(lead.lastContactedAt) >= 2)) signals.push({ text: "ליד חם ללא מענה", variant: "danger" });
  return signals.slice(0, 3);
}

function getFollowUpState(followUpDate) {
  if (!followUpDate) return { isToday: false, isOverdue: false };
  const target = new Date(new Date(followUpDate).toDateString());
  const today = TODAY();
  return {
    isToday: target.getTime() === today.getTime(),
    isOverdue: target.getTime() < today.getTime(),
  };
}

function ScoreBar({ score }) {
  const pct = Math.min(100, Math.max(0, Number(score) || 0));
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-slate-300";
  return <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} /></div>;
}

function CardSkeleton() { return <div className="bg-white border border-slate-100 rounded-2xl p-3.5"><Skeleton variant="block" className="h-36" /></div>; }

function MyLeadCard({ lead, onUpdate }) {
  const [notes, setNotes] = useState(lead.internalNotes || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [localTimeline, setLocalTimeline] = useState([]);

  const score = Math.round(Number(lead.approvalScore || lead.estimatedApprovalResult) || 0);
  const quality = lead.leadQuality || (score >= 70 ? "חם" : score >= 40 ? "בינוני" : "חלש");
  const tagVariant = QUALITY_TAG[quality] || "default";
  const isHot = quality === "חם";
  const created = new Date(lead.createdAt).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });
  const purchasedAt = lead.purchasedAt ? new Date(lead.purchasedAt).toLocaleDateString("he-IL", { day: "numeric", month: "short" }) : "";

  const currentStatus = STATUS_OPTIONS.includes(lead.leadStatus) ? lead.leadStatus : "חדש";
  const followUpVal = lead.followUpDate?.slice(0, 10) || "";
  const followUpTimeVal = lead.followUpDate?.slice(11, 16) || "";
  const { isToday, isOverdue } = getFollowUpState(followUpVal);

  useEffect(() => {
    setLocalTimeline(loadLocalTimeline(lead.id));
  }, [lead.id]);

  const timeline = useMemo(() => {
    const base = [...(Array.isArray(lead.crmActivityLog) ? lead.crmActivityLog : []), ...localTimeline];
    if (!base.length) {
      return [{ text: `הליד נוצר`, at: lead.createdAt || new Date().toISOString(), type: "create" }];
    }
    return [...base].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 6);
  }, [lead.crmActivityLog, lead.createdAt, localTimeline]);
  const signals = useMemo(() => buildSignals(lead), [lead]);

  async function logActivity(text, extraChanges = {}) {
    const event = { text, at: new Date().toISOString() };
    const current = [...(Array.isArray(lead.crmActivityLog) ? lead.crmActivityLog : []), ...localTimeline];
    const next = [event, ...current].slice(0, 30);
    setLocalTimeline(next);
    saveLocalTimeline(lead.id, next);
    await onUpdate(lead.id, { ...extraChanges });
  }

  async function saveNotes() {
    if (notes === (lead.internalNotes || "")) return;
    setSaving(true);
    await logActivity("נוספה הערה", { internalNotes: notes, lastContactedAt: new Date().toISOString() });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function openWhatsapp(message = "") {
    if (!lead.phone) return;
    const raw = String(lead.phone).replace(/[^\d]/g, "");
    const phone = raw.startsWith("0") ? `972${raw.slice(1)}` : raw;
    const text = message ? `&text=${encodeURIComponent(`${lead.name || ""} ${message}`.trim())}` : "";
    window.open(`https://wa.me/${phone}?${text.replace(/^&/, "")}`, "_blank", "noopener,noreferrer");
    logActivity("נשלח WhatsApp", { lastContactedAt: new Date().toISOString() });
  }

  function saveFollowUp(nextDate, nextTime) {
    if (!nextDate) return logActivity("בוטל follow-up", { followUpDate: "" });
    const normalized = `${nextDate}T${nextTime || "09:00"}:00.000Z`;
    return logActivity("נקבע follow-up", { followUpDate: normalized });
  }

  return (
    <article className={`bg-white rounded-2xl p-4 shadow-sm border ${isOverdue ? "border-amber-300 bg-amber-50/30" : isHot ? "border-emerald-200" : "border-slate-100"}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Tag variant={tagVariant}>{quality}</Tag>
            {lead.isExclusive && <Tag variant="exclusive">בלעדי</Tag>}
            {lead.purchaseType === "partner_claim" && <Tag variant="upgrade">שותף</Tag>}
            {isOverdue && <Tag variant="danger">באיחור</Tag>}
            {isToday && <Tag variant="refi">להיום</Tag>}
            <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(currentStatus)}`}>{currentStatus}</span>
            {signals.map((signal) => <Tag key={signal.text} variant={signal.variant}>{signal.text}</Tag>)}
          </div>
          <h2 className="text-base font-black text-slate-950 truncate mb-1">{lead.name || "—"}</h2>
          {lead.phone ? <a href={`tel:${lead.phone}`} className="text-base font-black text-violet-600 hover:underline tracking-wide">{lead.phone}</a> : <span className="text-sm text-slate-400">אין טלפון</span>}
        </div>
        <div className="text-start shrink-0">
          <p className="text-lg font-black text-slate-950 tabular-nums">{formatILS(lead.mortgageAmount || 0)}</p>
          <p className="text-xs text-slate-400 mt-1">נוצר {created}</p>
          {purchasedAt && <p className="text-xs text-violet-500 mt-0.5">נרכש {purchasedAt}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {lead.phone && <button type="button" onClick={() => openWhatsapp()} className="text-center text-sm font-black rounded-lg py-2 bg-emerald-50 text-emerald-700">WhatsApp</button>}
        {lead.email ? <a href={`mailto:${lead.email}`} onClick={() => logActivity("נשלח מייל", { lastContactedAt: new Date().toISOString() })} className="text-center text-sm font-black rounded-lg py-2 bg-sky-50 text-sky-700">Email</a> : <button disabled className="text-center text-sm font-black rounded-lg py-2 bg-slate-100 text-slate-400">Email</button>}
        {lead.phone ? <a href={`tel:${lead.phone}`} onClick={() => logActivity("בוצעה שיחה", { lastContactedAt: new Date().toISOString() })} className="text-center text-sm font-black rounded-lg py-2 bg-violet-50 text-violet-700">שיחה</a> : <button disabled className="text-center text-sm font-black rounded-lg py-2 bg-slate-100 text-slate-400">שיחה</button>}
      </div>

      <div className="mb-3">
        <label className="block text-xs font-black text-slate-400 mb-1">תבניות הודעה מהירות</label>
        <div className="flex gap-2">
          <select className="flex-1 border border-slate-200 rounded-lg px-2.5 py-2 text-sm font-bold" defaultValue="" onChange={(e) => { const m = TEMPLATE_MESSAGES[e.target.value]; if (m) { navigator.clipboard.writeText(m); logActivity(`הועתקה תבנית: ${e.target.value}`); } e.target.value = ""; }}>
            <option value="" disabled>בחרו תבנית להעתקה...</option>
            {Object.keys(TEMPLATE_MESSAGES).map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <button className="px-3 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-black" onClick={() => openWhatsapp(TEMPLATE_MESSAGES["עדכון סטטוס"])}>שליחה מהירה</button>
        </div>
      </div>

      <div className="mb-3"><div className="flex justify-between text-xs font-bold text-slate-400 mb-1.5"><span>ציון FINZO</span><span className="tabular-nums font-black text-slate-600">{score}/100</span></div><ScoreBar score={score} /></div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div><label className="block text-xs font-black text-slate-400 mb-1">סטטוס</label><select className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm font-bold" value={currentStatus} onChange={(e) => logActivity(`סטטוס עודכן ל"${e.target.value}"`, { leadStatus: e.target.value, lastContactedAt: new Date().toISOString() })}>{STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div><label className="block text-xs font-black text-slate-400 mb-1">תאריך מעקב</label><input type="date" className={`w-full border rounded-lg px-2.5 py-2 text-sm font-bold ${isOverdue ? "border-amber-300 bg-amber-50/40" : "border-slate-200"}`} defaultValue={followUpVal} onBlur={(e) => saveFollowUp(e.target.value, followUpTimeVal)} /></div>
        <div><label className="block text-xs font-black text-slate-400 mb-1">שעת מעקב</label><input type="time" className="w-full border rounded-lg px-2.5 py-2 text-sm font-bold border-slate-200" defaultValue={followUpTimeVal} onBlur={(e) => saveFollowUp(followUpVal, e.target.value)} /></div>
      </div>

      <div className="mb-3">
        <label className="block text-xs font-black text-slate-400 mb-1">ציר פעילות</label>
        <div className="border border-slate-100 rounded-xl p-2.5 bg-slate-50/70">
          {timeline.map((item, idx) => (
            <div key={`${item.at}-${idx}`} className={`flex gap-2.5 py-1.5 ${idx < timeline.length - 1 ? "border-b border-slate-200/70" : ""}`}>
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-700">{item.text}</p>
                <p className="text-[11px] text-slate-400">{formatDateTime(item.at)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-black text-slate-400 mb-1">הערות</label>
        <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white resize-y min-h-[88px]" value={notes} onChange={(e) => { setNotes(e.target.value); setSaved(false); }} onBlur={saveNotes} placeholder="הערות, חסרים, תיאום שיחה, עדכון סטטוס..." />
        <p className={`text-xs mt-1 font-bold h-4 transition-opacity ${saved || saving ? "opacity-100" : "opacity-0"} ${saved ? "text-emerald-600" : "text-slate-400"}`}>{saving ? "שומר..." : "נשמר ✓"}</p>
      </div>
    </article>
  );
}

export default function AdvisorMyLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusTab, setStatusTab] = useState("הכל");

  useEffect(() => { load(); }, []);
  async function load() { setLoading(true); const r = await fetch("/api/advisor/my-leads"); if (r.status === 401) { window.location.href = "/advisor/login"; return; } if (!r.ok) { setError("שגיאה בטעינת הלידים."); setLoading(false); return; } const j = await r.json(); setLeads(j.leads || []); setLoading(false); }
  async function update(id, changes) { const r = await fetch("/api/advisor/my-leads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, changes }) }); if (!r.ok) { setError("שמירה נכשלה"); return; } const j = await r.json(); setLeads((arr) => arr.map((l) => l.id === id ? { ...l, ...j.lead } : l)); setError(""); }

  const newLeads = leads.filter((l) => !l.leadStatus || l.leadStatus === "חדש");
  const inProgress = leads.filter((l) => ["נוצר קשר", "מחכים למסמכים", "פגישה נקבעה", "הוגש לבנק"].includes(l.leadStatus));
  const approved = leads.filter((l) => l.leadStatus === "אישור עקרוני");
  const closed = leads.filter((l) => l.leadStatus === "נסגר");

  const statusTabs = [
    { key: "הכל", label: "הכל", count: leads.length },
    { key: "חדש", label: "חדשים", count: newLeads.length },
    { key: "בתהליך", label: "בתהליך", count: inProgress.length },
    { key: "אישור", label: "אישור עקרוני", count: approved.length },
    { key: "נסגר", label: "נסגר", count: closed.length },
  ];

  const filteredBase = statusTab === "חדש" ? newLeads : statusTab === "בתהליך" ? inProgress : statusTab === "אישור" ? approved : statusTab === "נסגר" ? closed : leads;
  const filtered = [...filteredBase].sort((a, b) => {
    const af = a.followUpDate ? new Date(a.followUpDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bf = b.followUpDate ? new Date(b.followUpDate).getTime() : Number.MAX_SAFE_INTEGER;
    return af - bf;
  });

  return <><Head><title>הלידים שלי | FINZO PRO</title><meta name="robots" content="noindex,nofollow" /></Head><main dir="rtl" className="min-h-screen bg-slate-50"><AdvisorHeader active="/advisor/my-leads" /><div className="max-w-[92rem] mx-auto px-4 lg:px-6 py-4 lg:py-5"><div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">{loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2.5"><Skeleton variant="line" className="w-20" /><Skeleton variant="line" className="w-10 h-8" /></div>) : <><KpiTile label="סה״כ לידים" value={leads.length} /><KpiTile label="חדשים" value={newLeads.length} /><KpiTile label="בתהליך" value={inProgress.length} /><KpiTile label="נסגרו" value={closed.length} /></>}</div><div className="flex gap-1.5 flex-wrap mb-4">{statusTabs.map(({ key, label, count }) => <button key={key} onClick={() => setStatusTab(key)} className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold whitespace-nowrap rounded-full transition-colors ${statusTab === key ? "bg-violet-700 text-white" : "bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300"}`}>{label}<span className={`tabular-nums text-xs px-1.5 py-0.5 rounded-full font-black ${statusTab === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{count}</span></button>)}</div>{error && <div className="mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-bold flex items-center justify-between gap-3"><span>{error}</span><button onClick={() => setError("")} className="text-red-400 hover:text-red-600 font-black text-lg leading-none">×</button></div>}{loading && <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>}{!loading && filtered.length === 0 && statusTab === "הכל" && <EmptyState glyph="📋" title="עדיין לא רכשתם לידים" description="עברו לחנות הלידים כדי לגלוש בלידים הזמינים ולרכוש." action={<Link href="/advisor/leads" className="inline-block rounded-full bg-violet-700 text-white px-6 py-3 text-sm font-black hover:bg-violet-800 transition-colors">לחנות הלידים ←</Link>} />}{!loading && filtered.length === 0 && statusTab !== "הכל" && <EmptyState glyph="🔍" title="אין לידים בקטגוריה זו" description="נסו לשנות את הסינון." />}<div className="grid gap-3 md:grid-cols-2">{filtered.map((lead) => <MyLeadCard key={lead.id} lead={lead} onUpdate={update} />)}</div></div></main></>;
}
