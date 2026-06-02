import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Skeleton, EmptyState } from "../../components/ui";
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

function formatILS(v) {
  if (!v && v !== 0) return "—";
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(v);
}

function formatDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("he-IL", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function formatDateTime(str) {
  if (!str) return "—";
  return new Date(str).toLocaleString("he-IL", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function qualityBadge(quality) {
  const base = "text-[10px] font-black px-2 py-0.5 rounded-full border whitespace-nowrap";
  if (quality === "פרימיום" || quality === "חם מאוד") return `${base} bg-emerald-50 text-emerald-800 border-emerald-200`;
  if (quality === "חם") return `${base} bg-amber-50 text-amber-800 border-amber-200`;
  if (quality === "בינוני+" || quality === "בינוני") return `${base} bg-sky-50 text-sky-700 border-sky-200`;
  return `${base} bg-slate-50 text-slate-600 border-slate-200`;
}

function getMortgageRange(amount) {
  const v = Number(amount) || 0;
  if (v <= 0) return "—";
  if (v < 500000) return "עד ₪500K";
  if (v < 800000) return "₪500K–800K";
  if (v < 1000000) return "₪800K–1M";
  if (v < 1500000) return "₪1M–1.5M";
  if (v < 2000000) return "₪1.5M–2M";
  if (v < 3000000) return "₪2M–3M";
  return "מעל ₪3M";
}

function RowSkeleton() {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState(0);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [purchasesRes, walletRes] = await Promise.all([
      fetch("/api/advisor/purchases"),
      fetch("/api/advisor/wallet"),
    ]);
    if (purchasesRes.status === 401) { window.location.href = "/advisor/login"; return; }
    if (!purchasesRes.ok) {
      setError("שגיאה בטעינת ההיסטוריה.");
      setLoading(false);
      return;
    }
    const data = await purchasesRes.json();
    const walletData = walletRes.ok ? await walletRes.json() : { balance: 0 };
    setPurchases(data.purchases || []);
    setBalance(walletData.balance || 0);
    setLoading(false);
  }

  const totalSpent = useMemo(() => purchases.reduce((s, p) => s + (p.purchasePrice || 0), 0), [purchases]);

  return (
    <>
      <Head>
        <title>היסטוריית רכישות | FINZO PRO</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main dir="rtl" className="min-h-screen bg-slate-50">
        <AdvisorHeader active="/advisor/purchases" />

        <div className="max-w-[92rem] mx-auto px-4 lg:px-6 py-5">

          {/* Header */}
          <div className="mb-5">
            <p className="text-[10px] font-black text-violet-600 tracking-[0.15em] uppercase mb-1.5">
              FINZO PRO · ארנק
            </p>
            <h1 className="text-2xl font-black text-slate-950 mb-1">היסטוריית רכישות</h1>
            <p className="text-sm text-slate-500 font-bold">כל הלידים שרכשתם, תאריך הרכישה והמחיר ששולם.</p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">סה"כ רכישות</p>
              <p className="text-3xl font-black text-slate-950 tabular-nums">{loading ? "—" : purchases.length}</p>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">סה"כ הוצאה</p>
              <p className="text-2xl font-black text-rose-700 tabular-nums">{loading ? "—" : formatILS(totalSpent)}</p>
            </div>
            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 text-center col-span-2 md:col-span-1">
              <p className="text-[10px] font-black text-violet-500 uppercase tracking-wider mb-1">יתרת ארנק</p>
              <p className="text-2xl font-black text-violet-800 tabular-nums">{loading ? "—" : formatILS(balance)}</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-bold">
              {error}
            </div>
          )}

          {/* Table */}
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-black text-slate-800">פירוט רכישות</p>
              {!loading && purchases.length > 0 && (
                <p className="text-xs font-bold text-slate-400">{purchases.length} רשומות</p>
              )}
            </div>

            {loading ? (
              <table className="w-full">
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)}
                </tbody>
              </table>
            ) : purchases.length === 0 ? (
              <div className="py-16">
                <EmptyState
                  glyph="🛒"
                  title="טרם בצעתם רכישות"
                  description="לידים שתרכשו במרקטפלייס יופיעו כאן."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">עיר</th>
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">סוג תיק</th>
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">טווח משכנתא</th>
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">איכות</th>
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">תאריך רכישה</th>
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">מחיר ששולם</th>
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">פעולה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((p) => (
                      <tr key={p.leadId} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {p.city ? (
                              <>
                                <span className="text-slate-400">📍</span>
                                <span className="text-sm font-bold text-slate-800">{p.city}</span>
                              </>
                            ) : (
                              <span className="text-sm text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold text-slate-600">
                            {PURCHASE_STATUS_LABELS[p.purchaseStatus] || p.purchaseStatus || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold text-slate-600 tabular-nums">
                            {getMortgageRange(p.mortgageAmount)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {p.leadQuality ? (
                            <span className={qualityBadge(p.leadQuality)}>{p.leadQuality}</span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold text-slate-600 tabular-nums whitespace-nowrap">
                            {formatDateTime(p.purchasedAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-black text-slate-900 tabular-nums">
                            {formatILS(p.purchasePrice)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/advisor/lead/${p.leadId}`}
                            className="text-[10px] font-black text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-full px-2.5 py-1 transition-colors whitespace-nowrap">
                            פתח ←
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td colSpan={5} className="px-4 py-3 text-sm font-black text-slate-700 text-right">סה"כ</td>
                      <td className="px-4 py-3 text-sm font-black text-slate-900 tabular-nums">{formatILS(totalSpent)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <div className="mt-4 text-center">
            <Link href="/advisor/marketplace" className="text-sm font-black text-violet-600 hover:text-violet-800 transition-colors">
              ← חזרה למרקטפלייס
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
