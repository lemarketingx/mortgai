import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { KpiTile, Skeleton, EmptyState } from "../../components/ui";
import AdvisorHeader from "../../components/AdvisorHeader";

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

const DEPARTMENTS = [
  { key: "first_apartment", label: "🏠 דירה ראשונה",         types: ["first_apartment"] },
  { key: "refinance",       label: "🔄 מחזור משכנתא",        types: ["refinance"] },
  { key: "upgrader",        label: "📈 משפרי דיור",           types: ["upgrader"] },
  { key: "investment",      label: "🏢 השקעה / דירה שנייה",  types: ["investment", "new_purchase"] },
  { key: "bank_issues",     label: "⚠️ מסורבי בנק ו-BDI",  types: ["bank_declined", "bdi_credit_issue"] },
  { key: "senior_60plus",   label: "👴 גיל 60+",              types: ["senior_60plus"] },
  { key: "debt",            label: "💳 איחוד הלוואות",        types: ["debt_consolidation"] },
  { key: "general",         label: "📋 כללי",                 types: ["general", ""] },
];

function deptForLead(lead) {
  const ps = lead.purchaseStatus || "";
  for (const dept of DEPARTMENTS) {
    if (dept.types.includes(ps)) return dept.key;
  }
  return "general";
}

function formatILS(v) {
  if (!v || v === 0) return "—";
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(v);
}
function formatPrice(price) {
  if (!price || price === 0) return "פנו לתמחור";
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(price);
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ScoreBar({ score }) {
  const pct = Math.min(100, Math.max(0, Number(score) || 0));
  const color = pct >= 76 ? "bg-emerald-500" : pct >= 61 ? "bg-amber-400" : pct >= 41 ? "bg-sky-400" : "bg-slate-300";
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

function PricingBreakdown({ lead }) {
  const [open, setOpen] = useState(false);
  if (lead.finzoScore == null) return null;
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-right"
      >
        <span className="text-[10px] font-black text-slate-500">למה המחיר הזה? ↕</span>
        <span className="text-[10px] font-black text-violet-700">FINZO Score: {lead.finzoScore}/100</span>
      </button>
      {open && (
        <div className="px-3 py-3 bg-white space-y-2.5">
          <div className="space-y-1">
            {(lead.pricingBullets || []).map((b, i) => {
              const isGood = b.startsWith("✓");
              const isMid  = b.startsWith("~");
              return (
                <p key={i} className={`text-[11px] font-bold ${isGood ? "text-emerald-700" : isMid ? "text-amber-700" : "text-red-600"}`}>{b}</p>
              );
            })}
          </div>
          <div className="border-t border-slate-100 pt-2 grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-[9px] font-black text-slate-400 mb-0.5">ציון FINZO</p>
              <p className="text-xs font-black text-slate-800">{lead.finzoScore}/100</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 mb-0.5">מחיר</p>
              <p className="text-xs font-black text-violet-800">{formatPrice(lead.storePrice)}</p>
            </div>
          </div>
          <p className="text-[9px] text-slate-400 font-bold border-t border-slate-100 pt-2">
            רמת איכות: <span className="text-slate-700">{lead.computedQuality || lead.leadQuality}</span>
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

function PurchaseSuccessPanel({ lead, leadId, onClose }) {
  const label   = lead?.purchaseStatus ? (PURCHASE_STATUS_LABELS[lead.purchaseStatus] || lead.purchaseStatus) : null;
  const quality = lead?.computedQuality || lead?.leadQuality;
  const city    = lead?.city;
  const amount  = lead?.mortgageAmount;
  const now     = new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="mb-6 rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 to-white shadow-md overflow-hidden">
      <div className="flex items-center justify-between gap-3 bg-emerald-600 px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-black text-white">הליד נרכש בהצלחה ונוסף ל&#39;הלקוחות שלי&#39;</span>
        </div>
        <button onClick={onClose} className="text-emerald-200 hover:text-white font-black text-lg leading-none shrink-0">×</button>
      </div>
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
          <p className="text-[10px] font-black text-slate-400 mb-0.5">שעת רכישה</p>
          <p className="text-sm font-black text-slate-900">{now}</p>
        </div>
        {quality && (
          <div className="rounded-xl bg-white border border-slate-200 px-3 py-2.5">
            <p className="text-[10px] font-black text-slate-400 mb-0.5">איכות ליד</p>
            <p className="text-sm font-black text-slate-900">{quality}</p>
          </div>
        )}
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

function LeadStoreCard({ lead, onPurchase, purchasing, isPartnerAdvisor }) {
  const [confirm, setConfirm] = useState(false);

  const isSold         = lead.storeStatus === "sold";
  const diffDays       = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86400000);
  const isNew          = diffDays <= 3;
  const alreadyOwnedByMe = Boolean(lead._ownedByAdvisor);
  const qualityLabel   = lead.computedQuality || lead.leadQuality || "";

  async function handleConfirm() {
    const result = await onPurchase(lead.id);
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

      {/* Header: quality + type / price */}
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {qualityLabel && (
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border whitespace-nowrap ${
                qualityLabel === "פרימיום"  ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                qualityLabel === "חם מאוד"  ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                qualityLabel === "חם"        ? "bg-amber-50 text-amber-800 border-amber-200" :
                qualityLabel === "בינוני"   ? "bg-sky-50 text-sky-700 border-sky-200" :
                "bg-slate-50 text-slate-600 border-slate-200"
              }`}>{qualityLabel}</span>
            )}
            {lead.purchaseStatus && PURCHASE_STATUS_LABELS[lead.purchaseStatus] && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200 whitespace-nowrap">
                {PURCHASE_STATUS_LABELS[lead.purchaseStatus]}
              </span>
            )}
            {isSold && <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200">נמכר</span>}
            {(lead._purchased || alreadyOwnedByMe) && <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-200">נרכש ✓</span>}
            {isNew && !isSold && !lead._purchased && !alreadyOwnedByMe && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-200">חדש</span>
            )}
          </div>
        </div>
        <div className="text-start shrink-0">
          <p className="text-xl font-black text-slate-950 tabular-nums leading-none">{formatPrice(lead.storePrice)}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">לליד</p>
        </div>
      </div>

      {/* Location + age */}
      <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
        {lead.city && <span className="text-xs font-bold text-slate-500">📍 {lead.city}</span>}
        {lead.createdAt && <AgeBadge createdAt={lead.createdAt} />}
      </div>

      {/* Main issue */}
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

        {/* FINZO Score bar */}
        <div>
          <div className="flex justify-between text-xs font-bold text-slate-400 mb-1.5">
            <span>FINZO Score</span>
            <span className="tabular-nums font-black text-slate-700">{lead.finzoScore ?? lead.approvalScore}/100</span>
          </div>
          <ScoreBar score={lead.finzoScore ?? lead.approvalScore} />
        </div>

        {/* Pricing transparency */}
        <PricingBreakdown lead={lead} />

        {/* Locked contact */}
        {!lead._purchased && !alreadyOwnedByMe && !isSold && (
          <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 px-3 py-2.5 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-xs font-bold text-slate-500">שם וטלפון נחשפים לאחר רכישה</p>
          </div>
        )}

        {/* Owned state */}
        {(lead._purchased || alreadyOwnedByMe) && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm font-black text-emerald-700">כבר נרכש על ידכם</p>
            </div>
            <Link href={`/advisor/lead/${lead.id}`} className="text-xs font-black text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-full px-3 py-1.5 transition-colors shrink-0">
              פתח בלידים שלי ←
            </Link>
          </div>
        )}

        {/* Buy button — single action */}
        {!isSold && !lead._purchased && !alreadyOwnedByMe && !confirm && (
          isPartnerAdvisor ? (
            <button onClick={() => setConfirm(true)} disabled={purchasing}
              className="w-full text-sm font-black px-3 py-2.5 rounded-2xl bg-violet-700 text-white hover:bg-violet-800 transition-colors disabled:opacity-50 min-h-[46px]">
              קח לטיפול
            </button>
          ) : (
            <button
              onClick={() => setConfirm(true)}
              disabled={purchasing}
              className="w-full text-sm font-black px-3 py-2.5 rounded-2xl bg-gradient-to-b from-violet-600 to-violet-800 text-white hover:from-violet-500 hover:to-violet-700 transition-all disabled:opacity-50 shadow-[0_4px_20px_rgba(109,40,217,0.35)] min-h-[46px]"
            >
              קנה ליד · {formatPrice(lead.storePrice)}
            </button>
          )
        )}

        {/* Confirm dialog */}
        {confirm && !lead._purchased && !alreadyOwnedByMe && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
            <p className="text-sm font-black text-violet-900 mb-1">
              {isPartnerAdvisor ? "אישור לקיחת ליד לטיפול" : "אישור רכישת ליד"}
            </p>
            <p className="text-xs text-violet-700 mb-4 leading-relaxed">
              {isPartnerAdvisor
                ? "הליד יוקצה לטיפולך ויוסר מהשוק ליועצים אחרים."
                : "לאחר הרכישה תקבלו גישה בלעדית לפרטי הקשר המלאים. הליד לא יהיה זמין ליועצים אחרים."}
            </p>
            <div className="flex gap-2">
              <button onClick={handleConfirm} disabled={purchasing}
                className="flex-1 text-sm font-black px-4 py-2.5 rounded-full bg-violet-700 text-white hover:bg-violet-800 transition-colors disabled:opacity-70 min-h-[44px]">
                {purchasing ? "מעבד..." : (isPartnerAdvisor ? "אשר לקיחה" : "אשר רכישה")}
              </button>
              <button onClick={() => setConfirm(false)} disabled={purchasing}
                className="text-sm font-bold px-4 py-2.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors min-h-[44px]">
                ביטול
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function DepartmentSection({ dept, leads, onPurchase, purchasing, isPartnerAdvisor }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!leads.length) return null;
  return (
    <section className="mb-6">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between gap-3 mb-3 group"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-base font-black text-slate-800 group-hover:text-violet-700 transition-colors">{dept.label}</h2>
          <span className="text-xs font-black text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 tabular-nums">{leads.length}</span>
        </div>
        <span className="text-slate-400 font-black text-sm">{collapsed ? "▼" : "▲"}</span>
      </button>
      {!collapsed && (
        <div className="grid gap-3 md:grid-cols-2">
          {leads.map((lead) => (
            <LeadStoreCard key={lead.id} lead={lead} onPurchase={onPurchase} purchasing={purchasing} isPartnerAdvisor={isPartnerAdvisor} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const PRICE_RANGES = [
  { label: "הכל",      max: Infinity },
  { label: "עד ₪149",  max: 149 },
  { label: "עד ₪249",  max: 249 },
  { label: "עד ₪349",  max: 349 },
  { label: "עד ₪499",  max: 499 },
];

const AGE_RANGES = [
  { label: "הכל",      maxDays: Infinity },
  { label: "היום",     maxDays: 0 },
  { label: "3 ימים",   maxDays: 3 },
  { label: "שבוע",     maxDays: 7 },
  { label: "חודש",     maxDays: 30 },
];

export default function AdvisorLeadsStore() {
  const [leads, setLeads]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [isPartnerAdvisor, setIsPartnerAdvisor] = useState(false);
  const [purchasing, setPurchasing]   = useState(false);
  const [successId, setSuccessId]     = useState(null);
  const [successLead, setSuccessLead] = useState(null);
  // Filters
  const [filterDept, setFilterDept]         = useState("all");
  const [filterQuality, setFilterQuality]   = useState("all");
  const [filterPriceMax, setFilterPriceMax] = useState(Infinity);
  const [filterCity, setFilterCity]         = useState("");
  const [filterMaxDays, setFilterMaxDays]   = useState(Infinity);

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

  async function purchase(leadId) {
    setPurchasing(true);
    setError("");
    try {
      const endpoint = isPartnerAdvisor ? "/api/advisor/partner-claim-lead" : "/api/advisor/purchase-lead";
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.message || "הרכישה נכשלה. נסו שוב."); return { ok: false }; }
      const purchased = leads.find((l) => l.id === leadId) || null;
      setSuccessId(leadId);
      setSuccessLead(purchased);
      // Lead is now sold — remove it from the available list
      setLeads((arr) => arr.map((l) => l.id === leadId ? { ...l, storeStatus: "sold", _purchased: true } : l));
      return { ok: true };
    } catch {
      setError("שגיאת רשת. נסו שוב.");
      return { ok: false };
    } finally {
      setPurchasing(false);
    }
  }

  const cities = useMemo(() => {
    const set = new Set(leads.map((l) => l.city).filter(Boolean));
    return ["הכל", ...Array.from(set).sort()];
  }, [leads]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (filterDept !== "all") {
        const dept = DEPARTMENTS.find((d) => d.key === filterDept);
        if (dept && !dept.types.includes(l.purchaseStatus || "")) return false;
      }
      if (filterQuality !== "all" && (l.computedQuality || l.leadQuality) !== filterQuality) return false;
      if (filterPriceMax !== Infinity && (l.storePrice || 0) > filterPriceMax) return false;
      if (filterCity && filterCity !== "הכל" && l.city !== filterCity) return false;
      if (filterMaxDays !== Infinity) {
        const days = Math.floor((Date.now() - new Date(l.createdAt).getTime()) / 86400000);
        if (days > filterMaxDays) return false;
      }
      return true;
    });
  }, [leads, filterDept, filterQuality, filterPriceMax, filterCity, filterMaxDays]);

  const qualityLevels = useMemo(() => {
    const set = new Set(leads.map((l) => l.computedQuality || l.leadQuality).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [leads]);

  const departments = useMemo(() => {
    return DEPARTMENTS.map((dept) => ({
      ...dept,
      leads: filtered.filter((l) => deptForLead(l) === dept.key),
    })).filter((d) => d.leads.length > 0);
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

          {/* Hero */}
          <div className="mb-5">
            <p className="text-[10px] font-black text-violet-600 tracking-[0.15em] uppercase mb-2">
              FINZO MARKETPLACE · שוק לידים
            </p>
            <h1 className="text-2xl md:text-3xl font-black text-slate-950 leading-tight mb-1.5">
              לידים מסווגים לפי מחלקות<br />
              <span className="text-violet-700">מחיר שקוף, ניקוד מוסבר.</span>
            </h1>
            <p className="text-sm text-slate-500 font-bold max-w-lg">
              כל ליד הוא בלעדי — יועץ אחד בלבד רוכש אותו. לחצו &#34;למה המחיר הזה?&#34; לפירוט הניקוד המלא.
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
                <KpiTile label="לידים זמינים" value={leads.filter((l) => l.storeStatus !== "sold").length} />
                <KpiTile label="מחלקות פעילות" value={departments.length} delta={departments.length > 0 ? "מגוון גבוה" : undefined} deltaDir="up" />
                <KpiTile label="לאחר סינון" value={filtered.length} />
              </>
            )}
          </div>

          {/* ─── Filter bar ─────────────────────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 mb-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-black text-slate-700">סינון לידים</p>
              {hasFilters && (
                <button onClick={clearFilters} className="text-[10px] font-black text-violet-600 hover:text-violet-800 transition-colors">
                  נקה סינון ×
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
                className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-violet-400">
                <option value="all">כל המחלקות</option>
                {DEPARTMENTS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>

              <select value={filterQuality} onChange={(e) => setFilterQuality(e.target.value)}
                className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-violet-400">
                <option value="all">כל הרמות</option>
                {qualityLevels.filter((q) => q !== "all").map((q) => <option key={q} value={q}>{q}</option>)}
              </select>

              <select
                value={filterPriceMax === Infinity ? "Infinity" : String(filterPriceMax)}
                onChange={(e) => setFilterPriceMax(e.target.value === "Infinity" ? Infinity : Number(e.target.value))}
                className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-violet-400">
                {PRICE_RANGES.map((p) => (
                  <option key={p.label} value={p.max === Infinity ? "Infinity" : String(p.max)}>{p.label}</option>
                ))}
              </select>

              <select value={filterCity || "הכל"} onChange={(e) => setFilterCity(e.target.value === "הכל" ? "" : e.target.value)}
                className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-violet-400">
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>

              <select
                value={filterMaxDays === Infinity ? "Infinity" : String(filterMaxDays)}
                onChange={(e) => setFilterMaxDays(e.target.value === "Infinity" ? Infinity : Number(e.target.value))}
                className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-violet-400">
                {AGE_RANGES.map((a) => (
                  <option key={a.label} value={a.maxDays === Infinity ? "Infinity" : String(a.maxDays)}>{a.label}</option>
                ))}
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
              leadId={successId}
              onClose={() => { setSuccessId(null); setSuccessLead(null); }}
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
              title={hasFilters ? "אין לידים התואמים את הסינון" : "אין לידים זמינים כרגע"}
              description={hasFilters ? "נסו לשנות או לנקות את הסינון." : "לידים חדשים מתווספים לאחר שמשתמשים ממלאים את מחשבון הזכאות."}
            />
          )}

          {!loading && departments.map((dept) => (
            <DepartmentSection
              key={dept.key}
              dept={dept}
              leads={dept.leads}
              onPurchase={purchase}
              purchasing={purchasing}
              isPartnerAdvisor={isPartnerAdvisor}
            />
          ))}

        </div>
      </main>
    </>
  );
}
