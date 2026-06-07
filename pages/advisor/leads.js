import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { KpiTile, Skeleton, EmptyState } from "../../components/ui";
import AdvisorHeader from "../../components/AdvisorHeader";
import { FIXED_LEAD_PRICE } from "../../lib/config";

const PURCHASE_STATUS_LABELS = {
  new_purchase: "רכישת דירה",
  first_apartment: "דירה ראשונה",
  upgrader: "משפר דיור",
  investment: "דירה להשקעה",
  refinance: "מחזור משכנתא",
  bank_declined: "סורב בבנק",
  bdi_credit_issue: "מורכבות אשראית",
  senior_60plus: "גיל 60+",
  debt_consolidation: "איחוד הלוואות",
  general: "בדיקה כללית",
};

const DEPARTMENTS = [
  { key: "first_apartment", label: "🏠 דירה ראשונה", types: ["first_apartment"] },
  { key: "refinance", label: "🔄 מחזור משכנתא", types: ["refinance"] },
  { key: "upgrader", label: "📈 משפרי דיור", types: ["upgrader"] },
  { key: "investment", label: "🏢 השקעה / דירה שנייה", types: ["investment", "new_purchase"] },
  { key: "bank_issues", label: "⚠️ מסורבי בנק ו-BDI", types: ["bank_declined", "bdi_credit_issue"] },
  { key: "senior_60plus", label: "👴 גיל 60+", types: ["senior_60plus"] },
  { key: "debt", label: "💳 איחוד הלוואות", types: ["debt_consolidation"] },
  { key: "general", label: "📋 כללי", types: ["general", ""] },
];

const PRICE_RANGES = [
  { label: "הכל", max: Infinity },
  { label: "עד ₪50", max: 50 },
  { label: "עד ₪100", max: 100 },
  { label: "עד ₪200", max: 200 },
  { label: "עד ₪300", max: 300 },
];

const AGE_RANGES = [
  { label: "הכל", maxDays: Infinity },
  { label: "היום", maxDays: 0 },
  { label: "3 ימים", maxDays: 3 },
  { label: "שבוע", maxDays: 7 },
  { label: "חודש", maxDays: 30 },
];

function deptForLead(lead) {
  const status = lead.purchaseStatus || "";
  return DEPARTMENTS.find((dept) => dept.types.includes(status))?.key || "general";
}

function ageInDays(createdAt) {
  if (!createdAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000));
}

function formatILS(value) {
  if (!value || Number(value) === 0) return "—";
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatPrice(price) {
  return formatILS(price || FIXED_LEAD_PRICE);
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return `${number.toFixed(number % 1 === 0 ? 0 : 1)}%`;
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
  const days = ageInDays(createdAt);
  const label = days === 0 ? "היום" : `לפני ${days} ימים`;
  const cls = days <= 3
    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : days <= 14
      ? "text-amber-700 bg-amber-50 border-amber-200"
      : "text-slate-500 bg-slate-100 border-slate-200";
  return <span className={`text-[10px] font-black border rounded-full px-2 py-0.5 ${cls}`}>{label}</span>;
}

function MarketplaceTags({ lead }) {
  if (ageInDays(lead.createdAt) > 3) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] font-black border rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-800 border-emerald-200">חדש</span>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-2 text-center">
      <p className="text-[9px] font-black text-slate-400 mb-0.5">{label}</p>
      <p className="text-xs font-black text-slate-800">{value || "—"}</p>
    </div>
  );
}

function FinzoScoreExplanation({ lead, score }) {
  const [open, setOpen] = useState(false);
  const days = ageInDays(lead.createdAt);
  const quality = lead.computedQuality || lead.leadQuality || "—";
  const status = PURCHASE_STATUS_LABELS[lead.purchaseStatus] || lead.purchaseStatus || "—";
  const equityRatio = lead.propertyPrice > 0 && lead.equityAmount > 0
    ? (Number(lead.equityAmount) / Number(lead.propertyPrice)) * 100
    : null;
  const repaymentRatio = lead.monthlyIncome > 0 && lead.estimatedPayment > 0
    ? (Number(lead.estimatedPayment) / Number(lead.monthlyIncome)) * 100
    : lead.repaymentRatio;
  const filteredBullets = (lead.pricingBullets || []).filter((item) => {
    const text = String(item || "");
    return !text.includes("מחיר") && !text.includes("הנחה") && !text.includes("בלעדי") && !text.includes("רגיל") && !text.includes("₪");
  });

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-right"
      >
        <span className="text-[10px] font-black text-slate-500">הסבר ציון FINZO ↕</span>
        <span className="text-[10px] font-black text-violet-700">{score}/100</span>
      </button>
      {open && (
        <div className="px-3 py-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <InfoBox label="איכות ליד" value={quality} />
            <InfoBox label="סטטוס עסקה" value={status} />
            <InfoBox label="יחס הון עצמי" value={formatPercent(equityRatio)} />
            <InfoBox label="יחס החזר" value={formatPercent(repaymentRatio)} />
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 flex items-center justify-between gap-2">
            <span className="text-[10px] font-black text-slate-400">גיל הליד</span>
            <span className="text-xs font-black text-slate-700">{days === 0 ? "היום" : `לפני ${days} ימים`}</span>
          </div>
          {filteredBullets.length > 0 && (
            <div className="border-t border-slate-100 pt-2 space-y-1">
              {filteredBullets.map((bullet, index) => (
                <p key={index} className="text-[11px] font-bold text-slate-600 leading-relaxed">{bullet}</p>
              ))}
            </div>
          )}
          <p className="text-[9px] text-slate-400 font-bold border-t border-slate-100 pt-2 leading-relaxed">
            ההסבר מתייחס לאיכות הליד בלבד. מחיר הליד מוצג בנפרד ואינו מחושב כאן.
          </p>
        </div>
      )}
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
      <Skeleton variant="block" className="h-12 rounded-2xl" />
    </div>
  );
}

function PurchaseSuccessPanel({ lead, purchaseType, leadId, onClose }) {
  const label = PURCHASE_STATUS_LABELS[lead?.purchaseStatus] || lead?.purchaseStatus || null;
  const quality = lead?.computedQuality || lead?.leadQuality;
  const typeLabel = purchaseType === "partner_claim" ? "לקיחת ליד" : "רכישת ליד";
  const now = new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="mb-6 rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 to-white shadow-md overflow-hidden">
      <div className="flex items-center justify-between gap-3 bg-emerald-600 px-4 py-3">
        <span className="text-sm font-black text-white">הליד נרכש בהצלחה ונוסף ל'הלקוחות שלי'</span>
        <button onClick={onClose} className="text-emerald-200 hover:text-white font-black text-lg leading-none shrink-0">×</button>
      </div>
      <div className="px-4 pt-4 pb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {label && <InfoBox label="סוג תיק" value={label} />}
        {lead?.city && <InfoBox label="עיר" value={`📍 ${lead.city}`} />}
        {lead?.mortgageAmount > 0 && <InfoBox label="משכנתא" value={formatILS(lead.mortgageAmount)} />}
        <InfoBox label="סוג רכישה · שעה" value={`${typeLabel} · ${now}`} />
        {quality && <InfoBox label="איכות ליד" value={quality} />}
      </div>
      <div className="px-4 pb-4 flex flex-wrap gap-2">
        <Link href={`/advisor/lead/${leadId}?newPurchase=1`} className="px-4 py-2.5 rounded-full bg-violet-700 text-white text-sm font-black hover:bg-violet-800 transition-colors">
          פתח את הליד עכשיו ←
        </Link>
        <Link href="/advisor/my-leads" className="px-4 py-2.5 rounded-full border border-violet-200 bg-violet-50 text-violet-800 text-sm font-black hover:bg-violet-100 transition-colors">
          עבור ללידים שלי
        </Link>
        <button onClick={onClose} className="px-4 py-2.5 rounded-full border border-slate-200 bg-white text-slate-700 text-sm font-black hover:bg-slate-50 transition-colors">
          המשך לקנות לידים
        </button>
      </div>
    </div>
  );
}

function LeadStoreCard({ lead, onPurchase, purchasing }) {
  const [confirm, setConfirm] = useState(false);
  const isSold = lead.storeStatus === "sold";
  const alreadyOwnedByMe = Boolean(lead._ownedByAdvisor);
  const isNew = ageInDays(lead.createdAt) <= 3;
  const qualityLabel = lead.computedQuality || lead.leadQuality || "";
  const score = lead.finzoScore ?? lead.approvalScore ?? 0;

  async function handleConfirm() {
    const result = await onPurchase(lead.id, "purchase");
    if (result?.ok) setConfirm(false);
  }

  return (
    <article className={`bg-white rounded-2xl shadow-sm transition-all border ${
      lead._purchased || alreadyOwnedByMe
        ? "border-emerald-200 bg-emerald-50/30"
        : isSold
          ? "border-slate-100 opacity-60"
          : isNew
            ? "border-emerald-200 ring-1 ring-emerald-300/40 shadow-md hover:shadow-lg"
            : "border-slate-100 hover:border-violet-200 hover:shadow-sm"
    }`}>
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {qualityLabel && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200 whitespace-nowrap">
                {qualityLabel}
              </span>
            )}
            {lead.purchaseStatus && PURCHASE_STATUS_LABELS[lead.purchaseStatus] && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200 whitespace-nowrap">
                {PURCHASE_STATUS_LABELS[lead.purchaseStatus]}
              </span>
            )}
            {isSold && <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200">נמכר</span>}
            {(lead._purchased || alreadyOwnedByMe) && <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-200">נרכש ✓</span>}
          </div>
          <MarketplaceTags lead={lead} />
        </div>
        <div className="text-start shrink-0">
          <p className="text-xl font-black text-slate-950 tabular-nums leading-none">{formatPrice(lead.storePrice)}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">לליד</p>
        </div>
      </div>

      <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
        {lead.city && <span className="text-xs font-bold text-slate-500">📍 {lead.city}</span>}
        {lead.createdAt && <AgeBadge createdAt={lead.createdAt} />}
      </div>

      {lead.mainIssue && (
        <div className="px-4 pb-3">
          <p className="text-sm font-black text-slate-900 leading-snug">{lead.mainIssue}</p>
        </div>
      )}

      <div className="px-4 pb-3 space-y-3">
        {(lead.mortgageAmount > 0 || lead.propertyPrice > 0) && (
          <div className="grid grid-cols-2 gap-3">
            {lead.mortgageAmount > 0 && <InfoBox label="סכום משכנתא" value={formatILS(lead.mortgageAmount)} />}
            {lead.propertyPrice > 0 && <InfoBox label="מחיר נכס" value={formatILS(lead.propertyPrice)} />}
          </div>
        )}

        <div>
          <div className="flex justify-between text-xs font-bold text-slate-400 mb-1.5">
            <span>FINZO Score</span>
            <span className="tabular-nums font-black text-slate-700">{score}/100</span>
          </div>
          <ScoreBar score={score} />
        </div>

        <FinzoScoreExplanation lead={lead} score={score} />

        {!lead._purchased && !alreadyOwnedByMe && !isSold && (
          <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 px-3 py-2.5">
            <p className="text-xs font-bold text-slate-500">שם וטלפון נחשפים לאחר רכישה</p>
          </div>
        )}

        {(lead._purchased || alreadyOwnedByMe) && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm font-black text-emerald-700">הליד כבר נרכש על ידך</p>
            <Link href={`/advisor/lead/${lead.id}`} className="text-xs font-black text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-full px-3 py-1.5 transition-colors shrink-0">
              פתח בלידים שלי ←
            </Link>
          </div>
        )}

        {!isSold && !lead._purchased && !alreadyOwnedByMe && !confirm && (
          <button
            onClick={() => setConfirm(true)}
            disabled={purchasing}
            className="w-full text-sm font-black px-3 py-2.5 rounded-2xl bg-violet-700 text-white hover:bg-violet-800 transition-colors disabled:opacity-50 min-h-[46px]"
          >
            רכישת ליד · {formatPrice(lead.storePrice || FIXED_LEAD_PRICE)}
          </button>
        )}

        {confirm && !lead._purchased && !alreadyOwnedByMe && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
            <p className="text-sm font-black text-violet-900 mb-1">אישור רכישת ליד</p>
            <p className="text-xs text-violet-700 mb-4 leading-relaxed">
              לאחר הרכישה תקבלו גישה לפרטי הקשר המלאים של הלקוח.
            </p>
            <div className="flex gap-2">
              <button onClick={handleConfirm} disabled={purchasing} className="flex-1 text-sm font-black px-4 py-2.5 rounded-full bg-violet-700 text-white hover:bg-violet-800 transition-colors disabled:opacity-70 min-h-[44px]">
                {purchasing ? "מעבד..." : "אשר רכישה"}
              </button>
              <button onClick={() => setConfirm(false)} disabled={purchasing} className="text-sm font-bold px-4 py-2.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors min-h-[44px]">
                ביטול
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function DepartmentSection({ dept, leads, onPurchase, purchasing }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!leads.length) return null;
  return (
    <section className="mb-6">
      <button onClick={() => setCollapsed((value) => !value)} className="w-full flex items-center justify-between gap-3 mb-3 group">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-black text-slate-800 group-hover:text-violet-700 transition-colors">{dept.label}</h2>
          <span className="text-xs font-black text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 tabular-nums">{leads.length}</span>
        </div>
        <span className="text-slate-400 font-black text-sm">{collapsed ? "▼" : "▲"}</span>
      </button>
      {!collapsed && (
        <div className="grid gap-3 md:grid-cols-2">
          {leads.map((lead) => (
            <LeadStoreCard key={lead.id} lead={lead} onPurchase={onPurchase} purchasing={purchasing} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function AdvisorLeadsStore() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [successId, setSuccessId] = useState(null);
  const [successLead, setSuccessLead] = useState(null);
  const [successPurchaseType, setSuccessPurchaseType] = useState(null);
  const [filterDept, setFilterDept] = useState("all");
  const [filterQuality, setFilterQuality] = useState("all");
  const [filterPriceMax, setFilterPriceMax] = useState(Infinity);
  const [filterCity, setFilterCity] = useState("");
  const [filterMaxDays, setFilterMaxDays] = useState(Infinity);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/advisor/store-leads");
    if (response.status === 401) {
      window.location.href = "/advisor/login";
      return;
    }
    if (!response.ok) {
      setError("שגיאה בטעינת הלידים. נסו לרענן.");
      setLoading(false);
      return;
    }
    const data = await response.json();
    setLeads(data.leads || []);
    setLoading(false);
  }

  async function purchase(leadId, purchaseType) {
    setPurchasing(true);
    setError("");
    try {
      const endpoint = purchaseType === "partner_claim" ? "/api/advisor/partner-claim-lead" : "/api/advisor/purchase-lead";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "הרכישה נכשלה. נסו שוב.");
        return { ok: false };
      }
      const purchased = leads.find((lead) => lead.id === leadId) || null;
      setSuccessId(leadId);
      setSuccessLead(purchased);
      setSuccessPurchaseType(purchaseType);
      setLeads((items) => items.map((lead) => lead.id === leadId ? { ...lead, storeStatus: "sold", _purchased: true } : lead));
      return { ok: true };
    } catch {
      setError("שגיאת רשת. נסו שוב.");
      return { ok: false };
    } finally {
      setPurchasing(false);
    }
  }

  const cities = useMemo(() => {
    const unique = new Set(leads.map((lead) => lead.city).filter(Boolean));
    return ["הכל", ...Array.from(unique).sort()];
  }, [leads]);

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      if (filterDept !== "all") {
        const dept = DEPARTMENTS.find((item) => item.key === filterDept);
        if (dept && !dept.types.includes(lead.purchaseStatus || "")) return false;
      }
      if (filterQuality !== "all" && (lead.computedQuality || lead.leadQuality) !== filterQuality) return false;
      if (filterPriceMax !== Infinity && (lead.storePrice || 0) > filterPriceMax) return false;
      if (filterCity && filterCity !== "הכל" && lead.city !== filterCity) return false;
      if (filterMaxDays !== Infinity && ageInDays(lead.createdAt) > filterMaxDays) return false;
      return true;
    });
  }, [leads, filterDept, filterQuality, filterPriceMax, filterCity, filterMaxDays]);

  const qualityLevels = useMemo(() => {
    const unique = new Set(leads.map((lead) => lead.computedQuality || lead.leadQuality).filter(Boolean));
    return ["all", ...Array.from(unique)];
  }, [leads]);

  const departments = useMemo(() => {
    return DEPARTMENTS.map((dept) => ({
      ...dept,
      leads: filtered.filter((lead) => deptForLead(lead) === dept.key),
    })).filter((dept) => dept.leads.length > 0);
  }, [filtered]);

  const hasFilters = filterDept !== "all" || filterQuality !== "all" || filterPriceMax !== Infinity || (filterCity && filterCity !== "הכל") || filterMaxDays !== Infinity;

  function clearFilters() {
    setFilterDept("all");
    setFilterQuality("all");
    setFilterPriceMax(Infinity);
    setFilterCity("");
    setFilterMaxDays(Infinity);
  }

  return (
    <>
      <Head>
        <title>שוק לידים | FINZO PRO</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main dir="rtl" className="min-h-screen bg-slate-50">
        <AdvisorHeader active="/advisor/leads" />
        <div className="max-w-[92rem] mx-auto px-4 lg:px-6 py-4 lg:py-5">
          <div className="mb-5">
            <p className="text-[10px] font-black text-violet-600 tracking-[0.15em] uppercase mb-2">FINZO MARKETPLACE · שוק לידים</p>
            <h1 className="text-2xl md:text-3xl font-black text-slate-950 leading-tight mb-1.5">
              לידים מסווגים לפי מחלקות<br />
              <span className="text-violet-700">מחיר ברור, ניקוד מוסבר.</span>
            </h1>
            <p className="text-sm text-slate-500 font-bold max-w-lg">
              כל ליד מקבל ציון FINZO והסבר איכות קצר. פרטי הקשר נפתחים לאחר רכישה.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 mb-5">
            {loading ? Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2.5">
                <Skeleton variant="line" className="w-20" />
                <Skeleton variant="line" className="w-10 h-8" />
              </div>
            )) : (
              <>
                <KpiTile label="לידים זמינים" value={leads.length} />
                <KpiTile label="מחלקות פעילות" value={departments.length} delta={departments.length > 0 ? "מגוון גבוה" : undefined} deltaDir="up" />
                <KpiTile label="לאחר סינון" value={filtered.length} />
              </>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 mb-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-black text-slate-700">סינון לידים</p>
              {hasFilters && <button onClick={clearFilters} className="text-[10px] font-black text-violet-600 hover:text-violet-800 transition-colors">נקה סינון ×</button>}
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-violet-400">
                <option value="all">כל המחלקות</option>
                {DEPARTMENTS.map((dept) => <option key={dept.key} value={dept.key}>{dept.label}</option>)}
              </select>
              <select value={filterQuality} onChange={(e) => setFilterQuality(e.target.value)} className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-violet-400">
                <option value="all">כל הרמות</option>
                {qualityLevels.filter((quality) => quality !== "all").map((quality) => <option key={quality} value={quality}>{quality}</option>)}
              </select>
              <select value={filterPriceMax === Infinity ? "Infinity" : String(filterPriceMax)} onChange={(e) => setFilterPriceMax(e.target.value === "Infinity" ? Infinity : Number(e.target.value))} className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-violet-400">
                {PRICE_RANGES.map((range) => <option key={range.label} value={range.max === Infinity ? "Infinity" : String(range.max)}>{range.label}</option>)}
              </select>
              <select value={filterCity || "הכל"} onChange={(e) => setFilterCity(e.target.value === "הכל" ? "" : e.target.value)} className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-violet-400">
                {cities.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
              <select value={filterMaxDays === Infinity ? "Infinity" : String(filterMaxDays)} onChange={(e) => setFilterMaxDays(e.target.value === "Infinity" ? Infinity : Number(e.target.value))} className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-violet-400">
                {AGE_RANGES.map((range) => <option key={range.label} value={range.maxDays === Infinity ? "Infinity" : String(range.maxDays)}>{range.label}</option>)}
              </select>
            </div>
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
              {Array.from({ length: 4 }).map((_, index) => <CardSkeleton key={index} />)}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <EmptyState
              glyph="🏪"
              title={hasFilters ? "אין לידים התואמים את הסינון" : "אין לידים זמינים כרגע"}
              description={hasFilters ? "נסו לשנות או לנקות את הסינון." : "לידים חדשים מתווספים לאחר שמשתמשים ממלאים את מחשבון הזכאות."}
            />
          )}

          {!loading && departments.map((dept) => (
            <DepartmentSection key={dept.key} dept={dept} leads={dept.leads} onPurchase={purchase} purchasing={purchasing} />
          ))}
        </div>
      </main>
    </>
  );
}
