import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { KpiTile, Pill, Tag, Skeleton, EmptyState } from "../../components/ui";
import AdvisorHeader from "../../components/AdvisorHeader";

const QUALITY_TAG = { "חם": "upgrade", "בינוני": "refi" };
const MAX_REGULAR_SLOTS = 3;

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

function PurchaseSuccessPanel({ lead, purchaseType, leadId, onClose }) {
  const label = lead?.purchaseStatus ? (PURCHASE_STATUS_LABELS[lead.purchaseStatus] || lead.purchaseStatus) : null;
  const quality = lead?.leadQuality;
  const city = lead?.city;
  const amount = lead?.mortgageAmount;
  const typeLabel = purchaseType === "exclusive" ? "ליד בלעדי" : purchaseType === "partner_claim" ? "לקיחת ליד" : "ליד רגיל";
  const now = new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="mb-6 rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 to-white shadow-md overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 bg-emerald-600 px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-black text-white">הליד נרכש בהצלחה ונוסף ל'הלקוחות שלי'</span>
        </div>
        <button onClick={onClose} className="text-emerald-200 hover:text-white font-black text-lg leading-none shrink-0">×</button>
      </div>
      {/* Details grid */}
      <div className="px-4 pt-4 pb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {label && (
          <div className="rounded-xl bg-white border border-slate-200 px-3 py-2.5">
            <p className="text-[10px] font-black text-slate-400 mb-0.5">סוג תיק</p>
            <p className="text-sm font-black text-slate-900">{label}</p>
          </div>
        )}
        {city && (
          <div className="rounded-xl bg-white border border-slate-200 px-3 py-2.5">
            <p className="text-[10px] font-black text-slate-400 mb-0.5">עיר</p>
            <p className="text-sm font-black text-slate-900">📍 {city}</p>
          </div>
        )}
        {amount > 0 && (
          <div className="rounded-xl bg-white border border-slate-200 px-3 py-2.5">
            <p className="text-[10px] font-black text-slate-400 mb-0.5">משכנתא</p>
            <p className="text-sm font-black text-slate-900 tabular-nums">{formatILS(amount)}</p>
          </div>
        )}
        <div className="rounded-xl bg-white border border-slate-200 px-3 py-2.5">
          <p className="text-[10px] font-black text-slate-400 mb-0.5">סוג רכישה · שעה</p>
          <p className="text-sm font-black text-slate-900">{typeLabel} · {now}</p>
        </div>
        {quality && (
          <div className="rounded-xl bg-white border border-slate-200 px-3 py-2.5">
            <p className="text-[10px] font-black text-slate-400 mb-0.5">איכות ליד</p>
            <p className="text-sm font-black text-slate-900">{quality}</p>
          </div>
        )}
      </div>
      {/* Actions */}
      <div className="px-4 pb-4 flex flex-wrap gap-2">
        <Link
          href={`/advisor/lead/${leadId}?newPurchase=1`}
          className="px-4 py-2.5 rounded-full bg-violet-700 text-white text-sm font-black hover:bg-violet-800 transition-colors"
        >
          פתח את הליד עכשיו ←
        </Link>
        <Link
          href="/advisor/my-leads"
          className="px-4 py-2.5 rounded-full border border-violet-200 bg-violet-50 text-violet-800 text-sm font-black hover:bg-violet-100 transition-colors"
        >
          עבור ללידים שלי
        </Link>
        <button
          onClick={onClose}
          className="px-4 py-2.5 rounded-full border border-slate-200 bg-white text-slate-700 text-sm font-black hover:bg-slate-50 transition-colors"
        >
          המשך לקנות לידים
        </button>
      </div>
    </div>
  );
}

function formatPrice(price) {
  if (!price || price === 0) return "פנו לתמחור";
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(price);
}

function formatILS(v) {
  if (!v || v === 0) return "—";
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(v);
}

function ScoreBar({ score }) {
  const pct = Math.min(100, Math.max(0, Number(score) || 0));
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-slate-300";
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function AgeBadge({ createdAt }) {
  const diffDays = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  const label = diffDays === 0 ? "היום" : `לפני ${diffDays} ימים`;
  if (diffDays <= 3)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
        {label}
      </span>
    );
  if (diffDays <= 14)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
        {label}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
      {label}
    </span>
  );
}

function MarketplaceTags({ lead }) {
  const diffDays = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86400000);
  const tags = [];
  if (diffDays <= 3) tags.push({ label: "חדש", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" });
  if (lead.purchaseCount >= 2) tags.push({ label: "כמעט נסגר 🔥", cls: "bg-red-100 text-red-700 border-red-200" });
  else if (lead.purchaseCount >= 1) tags.push({ label: "פופולרי", cls: "bg-amber-100 text-amber-800 border-amber-200" });
  if (lead.exclusivePrice > 0) tags.push({ label: "בלעדי זמין", cls: "bg-violet-100 text-violet-800 border-violet-200" });
  if (tags.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {tags.map((t) => (
        <span key={t.label} className={`text-[10px] font-black border rounded-full px-2 py-0.5 ${t.cls}`}>{t.label}</span>
      ))}
    </div>
  );
}

function SlotBar({ purchaseCount }) {
  const filled = Math.min(purchaseCount, MAX_REGULAR_SLOTS);
  const remaining = MAX_REGULAR_SLOTS - filled;
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {Array.from({ length: MAX_REGULAR_SLOTS }).map((_, i) => (
          <span
            key={i}
            className={`w-2.5 h-2.5 rounded-full border ${i < filled ? "bg-violet-500 border-violet-500" : "bg-slate-100 border-slate-300"}`}
          />
        ))}
      </div>
      <p className="text-[10px] font-bold text-slate-500 tabular-nums">
        {filled}/{MAX_REGULAR_SLOTS} נרכשו · {remaining} מקומות פנויים
      </p>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton variant="line" className="w-20 h-5 rounded-full" />
          <Skeleton variant="line" className="w-16" />
        </div>
        <Skeleton variant="line" className="w-20 h-7" />
      </div>
      <Skeleton variant="line" className="w-4/5" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton variant="block" className="h-14" />
        <Skeleton variant="block" className="h-14" />
      </div>
      <Skeleton variant="line" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton variant="block" className="h-12 rounded-2xl" />
        <Skeleton variant="block" className="h-12 rounded-2xl" />
      </div>
    </div>
  );
}

function LeadStoreCard({ lead, onPurchase, purchasing, isPartnerAdvisor }) {
  const [confirm, setConfirm] = useState(null);

  const isSold = lead.storeStatus === "sold";
  const tagVariant = QUALITY_TAG[lead.leadQuality] || "default";
  const isHot = lead.leadQuality === "חם";
  const diffDays = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86400000);
  const isNew = diffDays <= 3;
  const purchaseCount = lead.purchaseCount || 0;
  const regularSlotsFull = purchaseCount >= MAX_REGULAR_SLOTS;
  const exclusiveBlocked = purchaseCount > 0;
  const alreadyOwnedByMe = Boolean(lead._ownedByAdvisor);

  async function handleConfirm() {
    const result = await onPurchase(lead.id, confirm);
    if (result?.ok) setConfirm(null);
  }

  return (
    <article className={`bg-white rounded-2xl shadow-sm transition-all border ${
      lead._purchased
        ? "border-emerald-200 bg-emerald-50/30"
        : isSold
          ? "border-slate-100 opacity-60"
          : isNew
            ? "border-emerald-200 ring-1 ring-emerald-300/40 shadow-md hover:shadow-lg"
            : isHot
              ? "border-violet-200 ring-1 ring-violet-300/50 shadow-md hover:shadow-lg"
              : "border-slate-100 hover:border-violet-200 hover:shadow-sm"
    }`}>

      {/* Header row: quality tag + price */}
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="flex-1 min-w-0">
          {/* Quality + status tags */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {lead.leadQuality && <Tag variant={tagVariant}>{lead.leadQuality}</Tag>}
            {lead.purchaseStatus && PURCHASE_STATUS_LABELS[lead.purchaseStatus] && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200 whitespace-nowrap">
                {PURCHASE_STATUS_LABELS[lead.purchaseStatus]}
              </span>
            )}
            {isSold && <Tag variant="danger">נמכר</Tag>}
            {lead._purchased && <Tag variant="upgrade">נרכש ✓</Tag>}
          </div>
          {/* Marketplace status tags */}
          <MarketplaceTags lead={lead} />
        </div>
        <div className="text-start shrink-0">
          <p className="text-xl font-black text-slate-950 tabular-nums leading-none">{formatPrice(lead.storePrice)}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">לליד</p>
        </div>
      </div>

      {/* Location + age + classification */}
      <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
        {lead.city && (
          <span className="text-xs font-bold text-slate-500">📍 {lead.city}</span>
        )}
        {lead.createdAt && <AgeBadge createdAt={lead.createdAt} />}
        {lead.purchaseStatus && PURCHASE_STATUS_LABELS[lead.purchaseStatus] && (
          <span className="text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5">
            {PURCHASE_STATUS_LABELS[lead.purchaseStatus]}
          </span>
        )}
      </div>

      {/* Lead title from mainIssue */}
      {lead.mainIssue && (
        <div className="px-4 pb-3">
          <p className="text-sm font-black text-slate-900 leading-snug">{lead.mainIssue}</p>
        </div>
      )}

      <div className="px-4 pb-3 space-y-3">

        {/* Key numbers */}
        {(lead.mortgageAmount > 0 || lead.propertyPrice > 0) && (
          <div className="grid grid-cols-2 gap-3">
            {lead.mortgageAmount > 0 && (
              <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-slate-400 font-bold mb-0.5">סכום משכנתא</p>
                <p className="font-black text-slate-950 text-sm tabular-nums">{formatILS(lead.mortgageAmount)}</p>
              </div>
            )}
            {lead.propertyPrice > 0 && (
              <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-slate-400 font-bold mb-0.5">מחיר נכס</p>
                <p className="font-black text-slate-950 text-sm tabular-nums">{formatILS(lead.propertyPrice)}</p>
              </div>
            )}
          </div>
        )}

        {/* Score */}
        <div>
          <div className="flex justify-between text-xs font-bold text-slate-400 mb-1.5">
            <span>ציון FINZO</span>
            <span className="tabular-nums font-black text-slate-700">{lead.approvalScore}/100</span>
          </div>
          <ScoreBar score={lead.approvalScore} />
        </div>

        {/* Slot inventory */}
        {!lead._purchased && !isSold && !isPartnerAdvisor && (
          <SlotBar purchaseCount={lead.purchaseCount || 0} />
        )}

        {/* Locked contact — only shown when lead is not yet purchased by this advisor */}
        {!lead._purchased && !alreadyOwnedByMe && !isSold && (
          <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 px-3 py-2.5 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-xs font-bold text-slate-500">שם וטלפון נחשפים לאחר רכישה</p>
          </div>
        )}

        {/* Already owned by this advisor (loaded from server) or just purchased in this session */}
        {(lead._purchased || alreadyOwnedByMe) && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm font-black text-emerald-700">כבר נרכש על ידכם</p>
            </div>
            <Link
              href={`/advisor/lead/${lead.id}`}
              className="text-xs font-black text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-full px-3 py-1.5 transition-colors shrink-0"
            >
              פתח בלידים שלי ←
            </Link>
          </div>
        )}

        {/* Purchase buttons */}
        {!isSold && !lead._purchased && !alreadyOwnedByMe && !confirm && (
          isPartnerAdvisor ? (
            <button
              onClick={() => setConfirm("partner_claim")}
              disabled={purchasing}
              className="w-full text-sm font-black px-3 py-2.5 rounded-2xl bg-violet-700 text-white hover:bg-violet-800 transition-colors disabled:opacity-50 min-h-[46px]"
            >
              קח לטיפול
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {/* Regular purchase — disabled when all 3 slots are filled */}
              {regularSlotsFull ? (
                <div className="text-center px-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 min-h-[46px] flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-slate-400 mb-0.5">ליד רגיל</span>
                  <span className="text-xs font-black text-slate-400">אזל לרכישה רגילה</span>
                </div>
              ) : (
                <button
                  onClick={() => setConfirm("regular")}
                  disabled={purchasing}
                  className="text-sm font-black px-3 py-2.5 rounded-2xl border border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 transition-colors disabled:opacity-50 min-h-[46px]"
                >
                  <span className="block text-xs font-bold text-violet-500 mb-0.5">ליד רגיל</span>
                  {formatPrice(lead.storePrice)}
                </button>
              )}
              {/* Exclusive purchase — disabled when any regular buyer exists */}
              {exclusiveBlocked ? (
                <div className="text-center px-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 min-h-[46px] flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-slate-400 mb-0.5">בלעדי</span>
                  <span className="text-[10px] font-black text-slate-400 leading-tight">בלעדיות לא זמינה לאחר רכישה רגילה</span>
                </div>
              ) : (
                <button
                  onClick={() => setConfirm("exclusive")}
                  disabled={purchasing}
                  className="text-sm font-black px-3 py-2.5 rounded-2xl bg-gradient-to-b from-violet-600 to-violet-800 text-white hover:from-violet-500 hover:to-violet-700 transition-all disabled:opacity-50 shadow-[0_4px_20px_rgba(109,40,217,0.35)] min-h-[46px]"
                >
                  <span className="block text-xs font-bold text-violet-300 mb-0.5">בלעדי</span>
                  {formatPrice(lead.exclusivePrice)}
                </button>
              )}
            </div>
          )
        )}

        {/* Confirm dialog */}
        {confirm && !lead._purchased && !alreadyOwnedByMe && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
            <p className="text-sm font-black text-violet-900 mb-1">
              {confirm === "partner_claim" ? "אישור לקיחת ליד לטיפול" : `אישור רכישת ליד ${confirm === "exclusive" ? "בלעדי" : "רגיל"}`}
            </p>
            <p className="text-xs text-violet-700 mb-4 leading-relaxed">
              {confirm === "partner_claim"
                ? "הליד יוקצה לטיפולך ויוסר מהשוק ליועצים אחרים."
                : confirm === "exclusive"
                  ? "ליד בלעדי יימכר לך בלבד ויחסם לרכישה נוספת."
                  : "לאחר רכישה תקבלו גישה לפרטי הקשר המלאים."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={purchasing}
                className="flex-1 text-sm font-black px-4 py-2.5 rounded-full bg-violet-700 text-white hover:bg-violet-800 transition-colors disabled:opacity-70 min-h-[44px]"
              >
                {purchasing ? "מעבד..." : (confirm === "partner_claim" ? "אשר לקיחה" : "אשר רכישה")}
              </button>
              <button
                onClick={() => setConfirm(null)}
                disabled={purchasing}
                className="text-sm font-bold px-4 py-2.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors min-h-[44px]"
              >
                ביטול
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export default function AdvisorLeadsStore() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPartnerAdvisor, setIsPartnerAdvisor] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [successId, setSuccessId] = useState(null);
  const [successLead, setSuccessLead] = useState(null);
  const [successPurchaseType, setSuccessPurchaseType] = useState(null);
  const [filter, setFilter] = useState("הכל");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/advisor/store-leads");
    if (r.status === 401) { window.location.href = "/advisor/login"; return; }
    if (!r.ok) { setError("שגיאה בטעינת הלידים. נסו לרענן."); setLoading(false); return; }
    const j = await r.json();
    setLeads(j.leads || []);
    setIsPartnerAdvisor(Boolean(j.isPartnerAdvisor));
    setLoading(false);
  }

  async function purchase(leadId, purchaseType) {
    setPurchasing(true);
    setError("");
    try {
      const endpoint = purchaseType === "partner_claim" ? "/api/advisor/partner-claim-lead" : "/api/advisor/purchase-lead";
      const payload = purchaseType === "partner_claim" ? { leadId } : { leadId, purchaseType };
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.message || "הרכישה נכשלה. נסו שוב.");
        return { ok: false };
      }
      const purchased = leads.find((l) => l.id === leadId) || null;
      setSuccessId(leadId);
      setSuccessLead(purchased);
      setSuccessPurchaseType(purchaseType);
      if (purchaseType === "partner_claim") {
        setLeads((arr) => arr.filter((l) => l.id !== leadId));
      } else if (purchaseType === "exclusive") {
        // Mark sold in client state so the card immediately shows as unavailable
        // rather than remaining purchasable until the next fetch.
        setLeads((arr) => arr.map((l) => l.id === leadId ? { ...l, storeStatus: "sold", _purchased: true } : l));
      } else {
        setLeads((arr) => arr.map((l) => l.id === leadId ? { ...l, _purchased: true, purchaseCount: (l.purchaseCount || 0) + 1 } : l));
      }
      return { ok: true };
    } catch {
      setError("שגיאת רשת. נסו שוב.");
      return { ok: false };
    } finally {
      setPurchasing(false);
    }
  }

  const hot    = leads.filter((l) => l.leadQuality === "חם");
  const warm   = leads.filter((l) => l.leadQuality === "בינוני");
  const filtered = filter === "חם" ? hot : filter === "בינוני" ? warm : leads;

  return (
    <>
      <Head>
        <title>שוק לידים | FINZO PRO</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main dir="rtl" className="min-h-screen bg-slate-50">
        <AdvisorHeader active="/advisor/leads" />

        <div className="max-w-[92rem] mx-auto px-4 lg:px-6 py-4 lg:py-5">

          {/* Hero */}
          <div className="mb-6">
            <p className="text-[10px] font-black text-violet-600 tracking-[0.15em] uppercase mb-3">
              FINZO MARKETPLACE · שוק לידים
            </p>
            <h1 className="text-2xl md:text-3xl font-black text-slate-950 leading-tight mb-2">
              לידים חדשים, מסוננים<br />
              <span className="text-violet-700">לפי האזור שלכם.</span>
            </h1>
            <p className="text-sm text-slate-500 font-bold max-w-lg">
              כל ליד עובר אימות זהות ובדיקת איכות לפני שהוא נכנס לשוק. שם וטלפון נחשפים רק אחרי הרכישה.
            </p>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2.5">
                  <Skeleton variant="line" className="w-20" />
                  <Skeleton variant="line" className="w-10 h-8" />
                </div>
              ))
            ) : (
              <>
                <KpiTile label="לידים זמינים" value={leads.length} />
                <KpiTile label="חמים" value={hot.length} delta={hot.length > 0 ? "פוטנציאל גבוה" : undefined} deltaDir="up" />
                <KpiTile label="בינוניים" value={warm.length} />
              </>
            )}
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 flex-wrap mb-5">
            <Pill active={filter === "הכל"}    count={leads.length} onClick={() => setFilter("הכל")}>הכל</Pill>
            <Pill active={filter === "חם"}     count={hot.length}   onClick={() => setFilter("חם")}>חמים</Pill>
            <Pill active={filter === "בינוני"} count={warm.length}  onClick={() => setFilter("בינוני")}>בינוניים</Pill>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-bold flex items-center justify-between gap-3">
              <span>{error}</span>
              <button onClick={() => setError("")} className="text-red-400 hover:text-red-600 font-black text-lg leading-none">×</button>
            </div>
          )}

          {successId && (
            <PurchaseSuccessPanel
              lead={successLead}
              purchaseType={successPurchaseType}
              leadId={successId}
              onClose={() => { setSuccessId(null); setSuccessLead(null); setSuccessPurchaseType(null); }}
            />
          )}

          {loading && (
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <EmptyState
              glyph="🏪"
              title={filter === "הכל" ? "אין לידים זמינים כרגע" : "אין לידים בקטגוריה זו"}
              description={filter === "הכל"
                ? "לידים חדשים מתווספים לאחר שמשתמשים ממלאים את מחשבון הזכאות."
                : "נסו לשנות את הסינון."}
            />
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((lead) => (
              <LeadStoreCard key={lead.id} lead={lead} onPurchase={purchase} purchasing={purchasing} isPartnerAdvisor={isPartnerAdvisor} />
            ))}
          </div>

        </div>
      </main>
    </>
  );
}
