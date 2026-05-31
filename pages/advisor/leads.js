import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { KpiTile, Pill, Tag, Skeleton, EmptyState } from "../../components/ui";
import AdvisorHeader from "../../components/AdvisorHeader";

const QUALITY_TAG = { "חם": "upgrade", "בינוני": "refi" };

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
  const timeAgo = (() => {
    const diff = Date.now() - new Date(lead.createdAt).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return "לפני פחות משעה";
    if (h < 24) return `לפני ${h} שעות`;
    const d = Math.floor(h / 24);
    return `לפני ${d} ימים`;
  })();

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
          : isHot
            ? "border-emerald-200 ring-1 ring-emerald-300/60 shadow-md hover:shadow-lg"
            : "border-slate-100 hover:border-violet-200 hover:shadow-sm"
    }`}>

      {/* Header row: tags left, price right */}
      <div className="flex items-start justify-between gap-3 p-4 pb-2.5">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {lead.leadQuality && <Tag variant={tagVariant}>{lead.leadQuality}</Tag>}
            {lead.purchaseStatus && PURCHASE_STATUS_LABELS[lead.purchaseStatus] && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200 whitespace-nowrap">
                {PURCHASE_STATUS_LABELS[lead.purchaseStatus]}
              </span>
            )}
            {isSold && <Tag variant="danger">נמכר</Tag>}
            {lead._purchased && <Tag variant="upgrade">נרכש ✓</Tag>}
          </div>
          {lead.city && <p className="text-xs font-bold text-slate-400">📍 {lead.city} · {timeAgo}</p>}
        </div>
        <div className="text-start shrink-0">
          <p className="text-xl font-black text-slate-950 tabular-nums leading-none">{formatPrice(lead.storePrice)}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">לליד</p>
        </div>
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

        {/* Locked contact */}
        {!lead._purchased && !isSold && (
          <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 px-3 py-2.5 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-xs font-bold text-slate-500">שם וטלפון נחשפים לאחר רכישה</p>
          </div>
        )}

        {/* Purchased state */}
        {lead._purchased && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="text-sm font-black text-emerald-700">הליד נרכש</p>
              <Link href="/advisor/my-leads" className="text-xs font-bold text-emerald-600 hover:underline">
                ראו בלשונית הלידים שלי ←
              </Link>
            </div>
          </div>
        )}

        {/* Purchase buttons */}
        {!isSold && !lead._purchased && !confirm && (
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
              <button
                onClick={() => setConfirm("regular")}
                disabled={purchasing}
                className="text-sm font-black px-3 py-2.5 rounded-2xl border border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 transition-colors disabled:opacity-50 min-h-[46px]"
              >
                <span className="block text-xs font-bold text-violet-500 mb-0.5">ליד רגיל</span>
                {formatPrice(lead.storePrice)}
              </button>
              <button
                onClick={() => setConfirm("exclusive")}
                disabled={purchasing}
                className="text-sm font-black px-3 py-2.5 rounded-2xl bg-gradient-to-b from-violet-600 to-violet-800 text-white hover:from-violet-500 hover:to-violet-700 transition-all disabled:opacity-50 shadow-[0_4px_20px_rgba(109,40,217,0.35)] min-h-[46px]"
              >
                <span className="block text-xs font-bold text-violet-300 mb-0.5">בלעדי</span>
                {formatPrice(lead.exclusivePrice)}
              </button>
            </div>
          )
        )}

        {/* Confirm dialog */}
        {confirm && !lead._purchased && (
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
      setSuccessId(leadId);
      if (purchaseType === "exclusive" || purchaseType === "partner_claim") {
        setLeads((arr) => arr.filter((l) => l.id !== leadId));
      } else {
        setLeads((arr) => arr.map((l) => l.id === leadId ? { ...l, _purchased: true } : l));
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
            <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-black flex items-center justify-between gap-3">
              <span>
                הליד נרכש בהצלחה!{" "}
                <Link href="/advisor/my-leads" className="underline">ראו בלשונית הלידים שלי ←</Link>
              </span>
              <button onClick={() => setSuccessId(null)} className="text-emerald-400 hover:text-emerald-600 font-black text-lg leading-none">×</button>
            </div>
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
