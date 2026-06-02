import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function formatILS(v) {
  if (!v && v !== 0) return "—";
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(v);
}

function formatMonth(ym) {
  if (!ym) return "—";
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("he-IL", { month: "long", year: "numeric" });
}

function KpiCard({ label, value, sub, accent }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "bg-violet-50 border-violet-200" : "bg-white border-slate-100"}`}>
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">{label}</p>
      <p className={`text-3xl font-black tabular-nums ${accent ? "text-violet-800" : "text-slate-950"}`}>{value}</p>
      {sub && <p className="text-[11px] font-bold text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function PricingEditor({ config, onSave, saving }) {
  const [local, setLocal] = useState(config);
  useEffect(() => { setLocal(config); }, [config]);

  function set(quality, val) {
    setLocal((prev) => ({ ...prev, [quality]: Number(val) || 0 }));
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5">
      <h3 className="text-sm font-black text-slate-800 mb-4">מחירון לידים</h3>
      <div className="space-y-3 mb-4">
        {[
          { key: "חם",     label: "ליד חם",    color: "text-amber-700" },
          { key: "בינוני", label: "ליד בינוני", color: "text-sky-700" },
          { key: "חלש",    label: "ליד קר",    color: "text-slate-500" },
        ].map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-3">
            <span className={`text-sm font-black w-28 shrink-0 ${color}`}>{label}</span>
            <div className="flex items-center gap-1.5 flex-1">
              <span className="text-sm font-bold text-slate-500">₪</span>
              <input
                type="number"
                min={0}
                step={5}
                value={local[key] ?? ""}
                onChange={(e) => set(key, e.target.value)}
                className="w-28 border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-black text-slate-900 focus:outline-none focus:border-violet-400 tabular-nums"
              />
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => onSave(local)}
        disabled={saving}
        className="px-4 py-2 rounded-full bg-violet-700 text-white text-xs font-black hover:bg-violet-800 transition-colors disabled:opacity-50"
      >
        {saving ? "שומר..." : "שמור מחירון"}
      </button>
    </div>
  );
}

function WalletTopup({ advisors, onTopup }) {
  const [advisorId, setAdvisorId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!advisorId || !amount) return;
    setLoading(true);
    setMsg("");
    const result = await onTopup(advisorId, Number(amount));
    setMsg(result.ok ? `✓ יתרה עודכנה ל-${formatILS(result.newBalance)}` : `שגיאה: ${result.error}`);
    if (result.ok) { setAmount(""); }
    setLoading(false);
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5">
      <h3 className="text-sm font-black text-slate-800 mb-4">טעינת ארנק יועץ</h3>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">יועץ</label>
          <select value={advisorId} onChange={(e) => setAdvisorId(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-700 focus:outline-none focus:border-violet-400 bg-white">
            <option value="">בחר יועץ</option>
            {(advisors || []).map((w) => (
              <option key={w.advisor_id} value={w.advisor_id}>
                {w.advisor_id} · יתרה: {formatILS(w.balance)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">סכום (₪)</label>
          <input type="number" min={1} step={50} value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="500"
            className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-violet-400 tabular-nums" />
        </div>
        {msg && <p className={`text-xs font-bold ${msg.startsWith("✓") ? "text-emerald-700" : "text-red-600"}`}>{msg}</p>}
        <button type="submit" disabled={loading || !advisorId || !amount}
          className="w-full px-4 py-2 rounded-full bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 transition-colors disabled:opacity-50">
          {loading ? "טוען..." : "טען ארנק"}
        </button>
      </form>
    </div>
  );
}

export default function AdminMarketplacePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pricingConfig, setPricingConfig] = useState({ "חם": 250, "בינוני": 150, "חלש": 75 });
  const [savingPricing, setSavingPricing] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [summaryRes, pricingRes] = await Promise.all([
      fetch("/api/admin/marketplace-summary"),
      fetch("/api/admin/pricing-config"),
    ]);
    if (summaryRes.status === 401) { window.location.href = "/admin"; return; }
    if (!summaryRes.ok) { setError("שגיאה בטעינת הנתונים."); setLoading(false); return; }
    const summaryData = await summaryRes.json();
    if (pricingRes.ok) {
      const pd = await pricingRes.json();
      if (pd.config) setPricingConfig(pd.config);
    }
    setData(summaryData);
    setLoading(false);
  }

  async function savePricing(config) {
    setSavingPricing(true);
    const res = await fetch("/api/admin/pricing-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (res.ok) {
      const pd = await res.json();
      if (pd.config) setPricingConfig(pd.config);
    }
    setSavingPricing(false);
  }

  async function topUpWallet(advisorId, amount) {
    const res = await fetch("/api/admin/wallet-topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ advisorId, amount }),
    });
    const j = await res.json();
    if (res.ok) {
      setData((prev) => prev ? {
        ...prev,
        wallets: prev.wallets.map((w) =>
          w.advisor_id === advisorId ? { ...w, balance: j.newBalance } : w
        ),
      } : prev);
      return { ok: true, newBalance: j.newBalance };
    }
    return { ok: false, error: j.error || "שגיאה" };
  }

  const maxMonthRevenue = useMemo(() => {
    if (!data?.revenueByMonth?.length) return 1;
    return Math.max(...data.revenueByMonth.map((r) => r.revenue));
  }, [data]);

  return (
    <>
      <Head>
        <title>מרקטפלייס — ניהול | FINZO ADMIN</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main dir="rtl" className="min-h-screen bg-slate-50">
        {/* Admin nav */}
        <header className="bg-slate-950 text-white sticky top-0 z-40 border-b border-white/10">
          <div className="max-w-[92rem] mx-auto px-4 lg:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-sm font-black hover:text-violet-400 transition-colors">
                FINZO ADMIN
              </Link>
              <span className="text-white/20">/</span>
              <span className="text-sm font-black text-violet-400">מרקטפלייס</span>
            </div>
            <Link href="/admin" className="text-xs font-bold text-slate-400 hover:text-white transition-colors">
              ← חזרה לניהול
            </Link>
          </div>
        </header>

        <div className="max-w-[92rem] mx-auto px-4 lg:px-6 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-black text-slate-950 mb-1">סיכום מרקטפלייס</h1>
            <p className="text-sm text-slate-500 font-bold">הכנסות, לידים ויתרות ארנקים של יועצים.</p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-bold">{error}</div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5">
                  <div className="h-3 w-20 bg-slate-100 rounded animate-pulse mb-3" />
                  <div className="h-8 w-24 bg-slate-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : data && (
            <>
              {/* KPI strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <KpiCard label="סה״כ הכנסות" value={formatILS(data.totalRevenue)} accent />
                <KpiCard label="לידים נמכרו" value={data.leadsSold} sub={`${data.totalPurchases} עסקאות`} />
                <KpiCard label="לידים זמינים" value={data.unsoldLeads} />
                <KpiCard label="הכנסה ממוצעת לעסקה"
                  value={data.totalPurchases > 0 ? formatILS(Math.round(data.totalRevenue / data.totalPurchases)) : "—"} />
              </div>

              <div className="grid md:grid-cols-3 gap-5 mb-6">
                {/* Revenue by month chart */}
                <div className="md:col-span-2 bg-white border border-slate-100 rounded-2xl p-5">
                  <h3 className="text-sm font-black text-slate-800 mb-4">הכנסות לפי חודש</h3>
                  {data.revenueByMonth.length === 0 ? (
                    <p className="text-sm text-slate-400 font-bold py-8 text-center">אין נתונים עדיין</p>
                  ) : (
                    <div className="space-y-2.5">
                      {data.revenueByMonth.slice(0, 12).map(({ month, revenue }) => (
                        <div key={month} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-500 w-28 shrink-0 tabular-nums text-end">
                            {formatMonth(month)}
                          </span>
                          <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-violet-500 rounded-full transition-all"
                              style={{ width: `${Math.max(2, (revenue / maxMonthRevenue) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-black text-slate-800 tabular-nums w-24 shrink-0">
                            {formatILS(revenue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right column */}
                <div className="space-y-5">
                  <PricingEditor config={pricingConfig} onSave={savePricing} saving={savingPricing} />
                  <WalletTopup advisors={data.wallets} onTopup={topUpWallet} />
                </div>
              </div>

              {/* Wallet table */}
              {data.wallets.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <h3 className="text-sm font-black text-slate-800">ארנקות יועצים</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="px-4 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">מזהה יועץ</th>
                          <th className="px-4 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">יתרה</th>
                          <th className="px-4 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">עדכון אחרון</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.wallets.map((w) => (
                          <tr key={w.advisor_id} className="border-b border-slate-50 hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-sm font-bold text-slate-800 tabular-nums">{w.advisor_id}</td>
                            <td className="px-4 py-3">
                              <span className={`text-sm font-black tabular-nums ${w.balance > 0 ? "text-emerald-700" : "text-slate-400"}`}>
                                {formatILS(w.balance)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs font-bold text-slate-400 tabular-nums">
                              {w.updated_at ? new Date(w.updated_at).toLocaleDateString("he-IL") : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}

export async function getServerSideProps({ req }) {
  const { hasAdminSession } = await import("../../lib/adminAuth");
  if (!hasAdminSession(req)) {
    return { redirect: { destination: "/admin", permanent: false } };
  }
  return { props: {} };
}
