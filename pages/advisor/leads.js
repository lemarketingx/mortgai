import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";

const QUALITY_CONFIG = {
  חם:     { cls: "bg-emerald-100 text-emerald-700 border-emerald-300", icon: "🔥" },
  בינוני: { cls: "bg-amber-100 text-amber-700 border-amber-300",       icon: "☀️" },
};

function AdvisorNav({ active }) {
  const links = [
    { href: "/advisor", label: "סקירה כללית" },
    { href: "/advisor/leads", label: "חנות לידים" },
    { href: "/advisor/my-leads", label: "הלידים שלי" },
  ];
  return (
    <nav className="flex gap-1 mt-3 border-b border-slate-800 px-4">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`px-4 py-2.5 text-sm font-bold rounded-t-lg transition-colors ${active === href ? "bg-white text-slate-950" : "text-slate-400 hover:text-white"}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

function QualityBadge({ quality }) {
  const cfg = QUALITY_CONFIG[quality] || QUALITY_CONFIG["בינוני"];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-full border ${cfg.cls}`}>
      {cfg.icon} {quality}
    </span>
  );
}

function ScoreBar({ score }) {
  const pct = Math.min(100, Math.max(0, Number(score) || 0));
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-slate-300";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-black text-slate-500 w-8 text-left">{pct}%</span>
    </div>
  );
}

function formatPrice(price) {
  if (!price || price === 0) return "פנו לתמחור";
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(price);
}

function LeadStoreCard({ lead, onPurchase, purchasing }) {
  const [confirm, setConfirm] = useState(null); // null | "regular" | "exclusive"

  const created = new Date(lead.createdAt).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
  const isSold = lead.storeStatus === "sold";

  async function handleConfirm() {
    const result = await onPurchase(lead.id, confirm);
    if (result?.ok) setConfirm(null);
  }

  return (
    <article className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-violet-200 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <QualityBadge quality={lead.leadQuality} />
          {lead.city && <span className="text-xs font-bold text-slate-500">📍 {lead.city}</span>}
          <span className="text-xs font-bold text-slate-400">{created}</span>
        </div>
        {isSold && (
          <span className="text-xs font-black text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-full shrink-0">נמכר</span>
        )}
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        {lead.mortgageAmount > 0 && (
          <div className="bg-slate-50 rounded-xl px-3 py-2">
            <p className="text-xs text-slate-500 font-bold">סכום משכנתא</p>
            <p className="font-black text-slate-950 mt-0.5">
              {new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(lead.mortgageAmount)}
            </p>
          </div>
        )}
        {lead.propertyPrice > 0 && (
          <div className="bg-slate-50 rounded-xl px-3 py-2">
            <p className="text-xs text-slate-500 font-bold">מחיר נכס</p>
            <p className="font-black text-slate-950 mt-0.5">
              {new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(lead.propertyPrice)}
            </p>
          </div>
        )}
      </div>

      {/* Approval score */}
      <div className="mb-4">
        <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
          <span>סיכוי אישור (אומדן)</span>
          <span>{lead.approvalScore}%</span>
        </div>
        <ScoreBar score={lead.approvalScore} />
      </div>

      {/* Main issue */}
      {lead.mainIssue && (
        <div className="mb-4 rounded-xl bg-violet-50 border border-violet-100 px-3 py-2">
          <p className="text-xs font-bold text-violet-700">{lead.mainIssue}</p>
        </div>
      )}

      {/* Hidden contact info indicator */}
      <div className="mb-4 rounded-xl bg-slate-100 px-3 py-2 flex items-center gap-2">
        <span className="text-slate-400 text-sm">🔒</span>
        <p className="text-xs font-bold text-slate-500">שם וטלפון נחשפים לאחר רכישה</p>
      </div>

      {/* Already purchased by this advisor */}
      {lead._purchased && (
        <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-2">
          <span className="text-emerald-600 font-black text-sm">✓</span>
          <p className="text-sm font-black text-emerald-700">נרכש — ראו בלשונית הלידים שלי</p>
        </div>
      )}

      {/* Purchase section */}
      {!isSold && !lead._purchased && !confirm && (
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={() => setConfirm("regular")}
            disabled={purchasing}
            className="text-sm font-black px-3 py-2.5 rounded-full border border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 transition-colors disabled:opacity-50"
          >
            <span className="block text-xs font-bold text-violet-500 mb-0.5">ליד רגיל</span>
            {formatPrice(lead.storePrice)}
          </button>
          <button
            onClick={() => setConfirm("exclusive")}
            disabled={purchasing}
            className="text-sm font-black px-3 py-2.5 rounded-full bg-violet-700 text-white hover:bg-violet-800 transition-colors disabled:opacity-50"
          >
            <span className="block text-xs font-bold text-violet-300 mb-0.5">בלעדי</span>
            {formatPrice(lead.exclusivePrice)}
          </button>
        </div>
      )}

      {confirm && !lead._purchased && (
        <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-4">
          <p className="text-sm font-black text-violet-900 mb-1">
            אישור רכישת ליד {confirm === "exclusive" ? "בלעדי" : "רגיל"}
          </p>
          <p className="text-xs text-violet-700 mb-3">
            {confirm === "exclusive"
              ? "ליד בלעדי יימכר לך בלבד ויחסם לרכישה נוספת."
              : "לאחר רכישה תקבלו גישה לפרטי הקשר המלאים."}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={purchasing}
              className="flex-1 text-sm font-black px-4 py-2.5 rounded-full bg-violet-700 text-white hover:bg-violet-800 transition-colors disabled:opacity-70"
            >
              {purchasing ? "מעבד..." : "אשר רכישה"}
            </button>
            <button
              onClick={() => setConfirm(null)}
              disabled={purchasing}
              className="text-sm font-bold px-4 py-2.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export default function AdvisorLeadsStore() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [successId, setSuccessId] = useState(null);
  const [filter, setFilter] = useState("הכל");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/advisor/store-leads");
    if (r.status === 401) { window.location.href = "/advisor/login"; return; }
    if (!r.ok) { setError("שגיאה בטעינת הלידים. נסו לרענן."); setLoading(false); return; }
    const j = await r.json();
    setLeads(j.leads || []);
    setLoading(false);
  }

  async function purchase(leadId, purchaseType) {
    setPurchasing(true);
    setError("");
    try {
      const r = await fetch("/api/advisor/purchase-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, purchaseType }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.message || "הרכישה נכשלה. נסו שוב.");
        return { ok: false };
      }
      setSuccessId(leadId);
      // Remove exclusive leads from list; mark regular as purchased
      if (purchaseType === "exclusive") {
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

  const hot   = leads.filter((l) => l.leadQuality === "חם");
  const warm  = leads.filter((l) => l.leadQuality === "בינוני");
  const filtered = filter === "חם" ? hot : filter === "בינוני" ? warm : leads;

  return (
    <>
      <Head>
        <title>חנות לידים | FINZO</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main dir="rtl" className="min-h-screen bg-slate-50">

        <header className="bg-slate-950 text-white px-4 pb-0 pt-4 sticky top-0 z-40">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-3">
                <span className="text-lg font-black">FINZO</span>
                <span className="text-xs text-violet-400 font-bold">פורטל יועצים</span>
              </div>
              <button
                onClick={() => { fetch("/api/advisor/login", { method: "DELETE" }).finally(() => { window.location.href = "/advisor/login"; }); }}
                className="text-xs text-slate-400 hover:text-white font-bold transition-colors"
              >
                יציאה
              </button>
            </div>
            <AdvisorNav active="/advisor/leads" />
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-4 py-8">

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "לידים זמינים", value: leads.length, color: "text-slate-950" },
              { label: "🔥 חמים", value: hot.length, color: "text-emerald-600" },
              { label: "☀️ בינוניים", value: warm.length, color: "text-amber-600" },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs font-bold text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 flex-wrap mb-6">
            {[
              { key: "הכל", label: `הכל (${leads.length})` },
              { key: "חם", label: `🔥 חמים (${hot.length})` },
              { key: "בינוני", label: `☀️ בינוניים (${warm.length})` },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`text-sm font-bold px-4 py-2 rounded-full border transition-colors ${filter === key ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-500 border-slate-200 hover:border-violet-300"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-bold">{error}</div>
          )}

          {successId && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-black">
              הליד נרכש בהצלחה! תוכלו לראות את פרטי הקשר המלאים בלשונית{" "}
              <Link href="/advisor/my-leads" className="underline">הלידים שלי</Link>.
            </div>
          )}

          {loading && <div className="text-center py-16 text-slate-500 font-bold">טוען לידים...</div>}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
              <p className="text-4xl mb-3">🏪</p>
              <p className="font-black text-slate-950 text-lg">אין לידים זמינים כרגע</p>
              <p className="text-slate-500 mt-2 text-sm">לידים חדשים מתווספים לאחר שמשתמשים ממלאים את מחשבון הזכאות.</p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((lead) => (
              <LeadStoreCard key={lead.id} lead={lead} onPurchase={purchase} purchasing={purchasing} />
            ))}
          </div>

        </div>
      </main>
    </>
  );
}
