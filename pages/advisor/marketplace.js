import Head from "next/head";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Skeleton, EmptyState } from "../../components/ui";
import AdvisorHeader from "../../components/AdvisorHeader";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatILS(v) {
  if (!v || v === 0) return "—";
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(v);
}

function getMortgageRange(amount) {
  const v = Number(amount) || 0;
  if (v <= 0) return null;
  if (v < 500000) return "עד ₪500K";
  if (v < 800000) return "₪500K–800K";
  if (v < 1000000) return "₪800K–1M";
  if (v < 1500000) return "₪1M–1.5M";
  if (v < 2000000) return "₪1.5M–2M";
  if (v < 3000000) return "₪2M–3M";
  return "מעל ₪3M";
}

function getPropertyRange(price) {
  const v = Number(price) || 0;
  if (v <= 0) return null;
  if (v < 1000000) return "עד ₪1M";
  if (v < 1500000) return "₪1M–1.5M";
  if (v < 2000000) return "₪1.5M–2M";
  if (v < 2500000) return "₪2M–2.5M";
  if (v < 3000000) return "₪2.5M–3M";
  if (v < 5000000) return "₪3M–5M";
  return "מעל ₪5M";
}

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

function qualityColor(quality) {
  if (quality === "פרימיום" || quality === "חם מאוד") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (quality === "חם") return "bg-amber-50 text-amber-800 border-amber-200";
  if (quality === "בינוני+" || quality === "בינוני") return "bg-sky-50 text-sky-700 border-sky-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function ScoreBar({ score }) {
  const pct = Math.min(100, Math.max(0, Number(score) || 0));
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-slate-300";
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function AgeBadge({ createdAt }) {
  const diffDays = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (diffDays === 0) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
      היום
    </span>
  );
  if (diffDays <= 3) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
      לפני {diffDays} ימים
    </span>
  );
  if (diffDays <= 14) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
      לפני {diffDays} ימים
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
      לפני {diffDays} ימים
    </span>
  );
}

// ─── Lead card ─────────────────────────────────────────────────────────────────

function LeadCard({ lead, walletBalance, onPurchase, purchasing }) {
  const [confirm, setConfirm] = useState(false);
  const price = lead.storePrice || 0;
  const canAfford = walletBalance >= price;
  const purchased = Boolean(lead._ownedByAdvisor);
  const isSold = lead.storeStatus === "sold";
  const quality = lead.computedQuality || lead.leadQuality || "";
  const mortgageRange = getMortgageRange(lead.mortgageAmount);
  const propertyRange = getPropertyRange(lead.propertyPrice);
  const score = lead.finzoScore ?? lead.approvalScore ?? 0;
  const statusLabel = PURCHASE_STATUS_LABELS[lead.purchaseStatus] || lead.purchaseStatus || "";
  const diffDays = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86400000);
  const isNew = diffDays <= 3;

  async function handleBuy() {
    const result = await onPurchase(lead.id);
    if (result?.ok) setConfirm(false);
  }

  return (
    <article className={`bg-white rounded-2xl border transition-all ${
      purchased ? "border-emerald-200 bg-emerald-50/20" :
      isSold ? "border-slate-100 opacity-50" :
      isNew ? "border-emerald-200 ring-1 ring-emerald-200/50 shadow-md hover:shadow-lg" :
      "border-slate-100 hover:border-violet-200 hover:shadow-sm"
    }`}>
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              {quality && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border whitespace-nowrap ${qualityColor(quality)}`}>
                  {quality}
                </span>
              )}
              {statusLabel && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200 whitespace-nowrap">
                  {statusLabel}
                </span>
              )}
              {isSold && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-red-50 text-red-600 border-red-200">נמכר</span>
              )}
              {purchased && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-200">נרכש ✓</span>
              )}
            </div>
          </div>
          {price > 0 && (
            <div className="text-end shrink-0">
              <p className="text-xl font-black text-slate-950 tabular-nums leading-none">{formatILS(price)}</p>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">מחיר לליד</p>
            </div>
          )}
        </div>

        {/* Location + age */}
        <div className="flex items-center gap-2 flex-wrap mt-1">
          {lead.city && <span className="text-xs font-bold text-slate-600">📍 {lead.city}</span>}
          {lead.createdAt && <AgeBadge createdAt={lead.createdAt} />}
        </div>
      </div>

      {/* Data grid */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-2.5">
        {mortgageRange && (
          <div className="bg-slate-50 rounded-xl px-3 py-2">
            <p className="text-[10px] text-slate-400 font-bold mb-0.5">טווח משכנתא</p>
            <p className="text-xs font-black text-slate-900 tabular-nums">{mortgageRange}</p>
          </div>
        )}
        {propertyRange && (
          <div className="bg-slate-50 rounded-xl px-3 py-2">
            <p className="text-[10px] text-slate-400 font-bold mb-0.5">טווח מחיר נכס</p>
            <p className="text-xs font-black text-slate-900 tabular-nums">{propertyRange}</p>
          </div>
        )}
        <div className="bg-slate-50 rounded-xl px-3 py-2">
          <p className="text-[10px] text-slate-400 font-bold mb-1">ציון FINZO</p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-900 tabular-nums">{score}/100</span>
          </div>
          <ScoreBar score={score} />
        </div>
        {statusLabel && (
          <div className="bg-slate-50 rounded-xl px-3 py-2">
            <p className="text-[10px] text-slate-400 font-bold mb-0.5">סטטוס רכישה</p>
            <p className="text-xs font-black text-slate-900">{statusLabel}</p>
          </div>
        )}
      </div>

      {/* Locked contact info notice */}
      {!purchased && !isSold && (
        <div className="px-4 pb-3">
          <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 px-3 py-2 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-xs font-bold text-slate-500">שם, טלפון ומייל נחשפים לאחר רכישה</p>
          </div>
        </div>
      )}

      {/* Purchased state */}
      {purchased && (
        <div className="px-4 pb-4">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm font-black text-emerald-700">✓ נרכש על ידכם</p>
            <Link href={`/advisor/lead/${lead.id}`} className="text-xs font-black text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-full px-3 py-1.5 transition-colors">
              פתח ←
            </Link>
          </div>
        </div>
      )}

      {/* Buy button */}
      {!purchased && !isSold && (
        <div className="px-4 pb-4">
          {!confirm ? (
            <button
              onClick={() => setConfirm(true)}
              disabled={purchasing || !canAfford}
              className={`w-full text-sm font-black px-4 py-3 rounded-2xl transition-all min-h-[48px] ${
                canAfford
                  ? "bg-violet-700 text-white hover:bg-violet-800 shadow-[0_4px_16px_rgba(109,40,217,0.3)]"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
              }`}
            >
              {canAfford ? `קנה ליד · ${formatILS(price)}` : `יתרה לא מספיקה (₪${Math.ceil(price - walletBalance)} חסר)`}
            </button>
          ) : (
            <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
              <p className="text-sm font-black text-violet-900 mb-1">אישור רכישת ליד</p>
              <p className="text-xs text-violet-700 mb-1 leading-relaxed">
                {formatILS(price)} יגרעו מהארנק שלכם. לאחר הרכישה תקבלו גישה לפרטי הקשר המלאים.
              </p>
              <p className="text-[11px] text-violet-600 mb-3">
                יתרה לאחר רכישה: {formatILS(walletBalance - price)}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleBuy}
                  disabled={purchasing}
                  className="flex-1 text-sm font-black px-4 py-2.5 rounded-full bg-violet-700 text-white hover:bg-violet-800 transition-colors disabled:opacity-70 min-h-[44px]"
                >
                  {purchasing ? "מעבד..." : "אשר רכישה"}
                </button>
                <button
                  onClick={() => setConfirm(false)}
                  disabled={purchasing}
                  className="text-sm font-bold px-4 py-2.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 min-h-[44px]"
                >
                  ביטול
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-1.5">
          <div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse" />
          <div className="h-4 w-24 bg-slate-100 rounded-full animate-pulse" />
        </div>
        <div className="h-7 w-20 bg-slate-100 rounded-lg animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
      </div>
      <div className="h-12 bg-slate-100 rounded-2xl animate-pulse" />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const QUALITY_FILTER_OPTIONS = ["הכל", "פרימיום", "חם מאוד", "חם", "בינוני+", "בינוני", "הזדמנות"];

export default function MarketplacePage() {
  const [leads, setLeads] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [successLeadId, setSuccessLeadId] = useState(null);
  const [filterQuality, setFilterQuality] = useState("הכל");
  const [filterCity, setFilterCity] = useState("");
  const [filterMaxDays, setFilterMaxDays] = useState(Infinity);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [leadsRes, walletRes] = await Promise.all([
      fetch("/api/advisor/store-leads"),
      fetch("/api/advisor/wallet"),
    ]);
    if (leadsRes.status === 401 || walletRes.status === 401) {
      window.location.href = "/advisor/login";
      return;
    }
    if (!leadsRes.ok) {
      setError("שגיאה בטעינת הלידים. נסו לרענן.");
      setLoading(false);
      return;
    }
    const leadsData = await leadsRes.json();
    const walletData = walletRes.ok ? await walletRes.json() : { balance: 0 };
    setLeads(leadsData.leads || []);
    setBalance(walletData.balance || 0);
    setLoading(false);
  }

  const purchase = useCallback(async (leadId) => {
    setPurchasing(true);
    setError("");
    try {
      const r = await fetch("/api/advisor/marketplace-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.message || "הרכישה נכשלה. נסו שוב.");
        return { ok: false };
      }
      setLeads((arr) => arr.map((l) => l.id === leadId ? { ...l, storeStatus: "sold", _ownedByAdvisor: true } : l));
      setBalance(j.newBalance ?? (balance - (leads.find((l) => l.id === leadId)?.storePrice || 0)));
      setSuccessLeadId(leadId);
      return { ok: true };
    } catch {
      setError("שגיאת רשת. נסו שוב.");
      return { ok: false };
    } finally {
      setPurchasing(false);
    }
  }, [balance, leads]);

  const cities = useMemo(() => {
    const s = new Set(leads.map((l) => l.city).filter(Boolean));
    return ["הכל", ...Array.from(s).sort()];
  }, [leads]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (filterQuality !== "הכל" && (l.computedQuality || l.leadQuality) !== filterQuality) return false;
      if (filterCity && filterCity !== "הכל" && l.city !== filterCity) return false;
      if (filterMaxDays !== Infinity) {
        const d = Math.floor((Date.now() - new Date(l.createdAt).getTime()) / 86400000);
        if (d > filterMaxDays) return false;
      }
      return true;
    });
  }, [leads, filterQuality, filterCity, filterMaxDays]);

  const available = filtered.filter((l) => l.storeStatus !== "sold" && !l._ownedByAdvisor);
  const owned = filtered.filter((l) => l._ownedByAdvisor);
  const hasFilters = filterQuality !== "הכל" || (filterCity && filterCity !== "הכל") || filterMaxDays !== Infinity;

  return (
    <>
      <Head>
        <title>מרקטפלייס לידים | FINZO PRO</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main dir="rtl" className="min-h-screen bg-slate-50">
        <AdvisorHeader active="/advisor/marketplace" />

        <div className="max-w-[92rem] mx-auto px-4 lg:px-6 py-5">

          {/* Page header */}
          <div className="mb-5">
            <p className="text-[10px] font-black text-violet-600 tracking-[0.15em] uppercase mb-1.5">
              FINZO MARKETPLACE
            </p>
            <h1 className="text-2xl md:text-3xl font-black text-slate-950 leading-tight mb-1.5">
              מרקטפלייס לידים
            </h1>
            <p className="text-sm text-slate-500 font-bold max-w-lg">
              כל הלידים מגיעים מטפסים ציבוריים בלבד. רכשו ליד וקבלו גישה מיידית לפרטי הקשר המלאים.
            </p>
          </div>

          {/* Wallet banner */}
          <div className={`mb-5 rounded-2xl border px-4 py-3.5 flex items-center justify-between gap-3 ${
            balance > 0 ? "bg-violet-50 border-violet-200" : "bg-amber-50 border-amber-200"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black shrink-0 ${
                balance > 0 ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700"
              }`}>
                ₪
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">יתרת ארנק</p>
                <p className={`text-2xl font-black tabular-nums leading-none ${balance > 0 ? "text-violet-800" : "text-amber-700"}`}>
                  {formatILS(balance)}
                </p>
              </div>
            </div>
            <div className="text-end">
              <p className="text-[10px] font-bold text-slate-400">יתרה זמינה לרכישת לידים</p>
              {balance === 0 && (
                <p className="text-xs font-black text-amber-700 mt-0.5">פנו למנהל לטעינת ארנק</p>
              )}
            </div>
          </div>

          {/* KPI strip */}
          {!loading && (
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">לידים זמינים</p>
                <p className="text-3xl font-black text-slate-950 tabular-nums">{available.length}</p>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">נרכשו על ידכם</p>
                <p className="text-3xl font-black text-emerald-700 tabular-nums">{owned.length}</p>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">לאחר סינון</p>
                <p className="text-3xl font-black text-slate-950 tabular-nums">{filtered.length}</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 mb-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-xs font-black text-slate-700">סינון לידים</p>
              {hasFilters && (
                <button onClick={() => { setFilterQuality("הכל"); setFilterCity(""); setFilterMaxDays(Infinity); }}
                  className="text-[10px] font-black text-violet-600 hover:text-violet-800">
                  נקה ×
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={filterQuality} onChange={(e) => setFilterQuality(e.target.value)}
                className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:border-violet-400">
                {QUALITY_FILTER_OPTIONS.map((q) => <option key={q} value={q}>{q === "הכל" ? "כל הרמות" : q}</option>)}
              </select>
              <select value={filterCity || "הכל"} onChange={(e) => setFilterCity(e.target.value === "הכל" ? "" : e.target.value)}
                className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:border-violet-400">
                {cities.map((c) => <option key={c} value={c}>{c === "הכל" ? "כל הערים" : c}</option>)}
              </select>
              <select value={filterMaxDays === Infinity ? "all" : String(filterMaxDays)}
                onChange={(e) => setFilterMaxDays(e.target.value === "all" ? Infinity : Number(e.target.value))}
                className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:border-violet-400">
                <option value="all">כל הזמנים</option>
                <option value="0">היום</option>
                <option value="3">3 ימים</option>
                <option value="7">שבוע</option>
                <option value="30">חודש</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-bold flex items-center justify-between gap-3">
              <span>{error}</span>
              <button onClick={() => setError("")} className="text-red-400 hover:text-red-600 font-black text-lg leading-none">×</button>
            </div>
          )}

          {successLeadId && (
            <div className="mb-5 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-emerald-600 text-lg">✓</span>
                <p className="text-sm font-black text-emerald-800">הליד נרכש בהצלחה! פרטי הקשר המלאים זמינים עכשיו.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link href={`/advisor/lead/${successLeadId}?newPurchase=1`}
                  className="text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-full px-3 py-1.5 transition-colors">
                  פתח ליד ←
                </Link>
                <button onClick={() => setSuccessLeadId(null)} className="text-emerald-500 hover:text-emerald-700 font-black text-lg leading-none">×</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              glyph="🏪"
              title={hasFilters ? "אין לידים התואמים את הסינון" : "אין לידים זמינים כרגע"}
              description={hasFilters ? "נסו לשנות את הסינון." : "לידים חדשים מתווספים לאחר שמשתמשים ממלאים את הטפסים הציבוריים."}
            />
          ) : (
            <>
              {available.length > 0 && (
                <section className="mb-6">
                  <h2 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2">
                    לידים זמינים לרכישה
                    <span className="text-[10px] font-black bg-violet-100 text-violet-700 rounded-full px-2 py-0.5">{available.length}</span>
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {available.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        walletBalance={balance}
                        onPurchase={purchase}
                        purchasing={purchasing}
                      />
                    ))}
                  </div>
                </section>
              )}
              {owned.length > 0 && (
                <section>
                  <h2 className="text-sm font-black text-slate-500 mb-3 flex items-center gap-2">
                    נרכשו על ידכם
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">{owned.length}</span>
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {owned.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        walletBalance={balance}
                        onPurchase={purchase}
                        purchasing={purchasing}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
