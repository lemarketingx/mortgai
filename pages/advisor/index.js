import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatILS } from "../../lib/format";
import { KpiTile, Tag } from "../../components/ui";
import AdvisorHeader from "../../components/AdvisorHeader";

const QUALITY_TAG = { "חם": "upgrade", "בינוני": "refi", "חלש": "danger" };
const STATUS_OPTIONS = ["חדש", "נשלח ליועץ", "בטיפול", "אושר עקרונית", "נסגר", "לא רלוונטי"];

function getFocusItems(leads) {
  const items = [];
  const today = new Date(new Date().toDateString());

  const hotNew = leads
    .filter((l) => (l.leadQuality === "חם" || (!l.leadQuality && Number(l.approvalScore) >= 70)) && (!l.leadStatus || l.leadStatus === "חדש"))
    .slice(0, 2);
  hotNew.forEach((lead) => {
    items.push({ lead, text: lead.mainIssue || "ליד חם שממתין לפנייה ראשונה.", sub: lead.city || null });
  });

  if (items.length < 3) {
    leads
      .filter((l) => l.followUpDate && new Date(l.followUpDate.slice(0, 10)) < today && !items.find((i) => i.lead.id === l.id))
      .slice(0, 1)
      .forEach((lead) => {
        items.push({ lead, text: "מועד מעקב עבר – זמן לחזור ללקוח.", sub: lead.city || null });
      });
  }

  if (items.length < 3) {
    leads
      .filter((l) => (l.leadStatus === "בטיפול" || l.leadStatus === "נקבעה שיחה") && !items.find((i) => i.lead.id === l.id))
      .slice(0, 1)
      .forEach((lead) => {
        items.push({ lead, text: "ליד בטיפול פעיל – יש לעדכן סטטוס.", sub: lead.city || null });
      });
  }

  return items.slice(0, 3);
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0">
      <div className="w-12 h-5 bg-slate-100 rounded-full animate-pulse shrink-0" />
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="h-3.5 bg-slate-100 rounded w-2/5 animate-pulse" />
        <div className="h-3 bg-slate-100 rounded w-1/3 animate-pulse" />
      </div>
      <div className="hidden lg:block w-20 h-2 bg-slate-100 rounded animate-pulse" />
      <div className="hidden md:block w-24 h-3.5 bg-slate-100 rounded animate-pulse" />
      <div className="w-28 h-7 bg-slate-100 rounded-lg animate-pulse shrink-0" />
    </div>
  );
}

function LeadRow({ lead, onUpdate }) {
  const score = Math.round(Number(lead.approvalScore) || 0);
  const quality = lead.leadQuality || (score >= 70 ? "חם" : score >= 40 ? "בינוני" : "חלש");
  const tagVariant = QUALITY_TAG[quality] || "default";
  const scoreColor = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-400" : "bg-slate-300";
  const currentStatus = lead.leadStatus || lead.status || "חדש";

  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
      <Tag variant={tagVariant}>{quality}</Tag>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-slate-950 truncate">{lead.name || "—"}</p>
        {lead.phone ? (
          <a href={`tel:${lead.phone}`} className="text-xs font-bold text-violet-600 hover:underline tabular-nums">
            {lead.phone}
          </a>
        ) : (
          <span className="text-xs text-slate-400">אין טלפון</span>
        )}
      </div>
      <div className="hidden lg:flex items-center gap-2 w-20 shrink-0">
        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${scoreColor}`} style={{ width: `${score}%` }} />
        </div>
        <span className="text-xs text-slate-400 tabular-nums w-5">{score}</span>
      </div>
      <p className="hidden md:block text-sm font-black text-slate-950 tabular-nums shrink-0 w-24 text-start">
        {formatILS(lead.mortgageAmount || 0)}
      </p>
      <select
        className="text-xs font-bold border border-slate-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:ring-2 focus:ring-violet-300 shrink-0 max-w-[7.5rem]"
        value={currentStatus}
        onChange={(e) => onUpdate(lead.id, { leadStatus: e.target.value, lastContactedAt: new Date().toISOString() })}
      >
        {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
      </select>
    </div>
  );
}

export default function AdvisorDashboard() {
  const [leads, setLeads] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [tabFilter, setTabFilter] = useState("הכל");

  const todayStr = new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });

  async function load() {
    setLoading(true);
    const r = await fetch("/api/advisor/my-leads");
    if (!r.ok) { window.location.href = "/advisor/login"; return; }
    const j = await r.json();
    setLeads(j.leads || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function update(id, changes) {
    const r = await fetch("/api/advisor/my-leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, changes }),
    });
    if (!r.ok) { setMsg("שמירה נכשלה"); return; }
    const j = await r.json();
    setLeads((arr) => arr.map((l) => (l.id === id ? j.lead : l)));
    setMsg("");
  }

  const hot  = leads.filter((l) => (l.leadQuality === "חם")     || (!l.leadQuality && Number(l.approvalScore) >= 70));
  const warm = leads.filter((l) => (l.leadQuality === "בינוני") || (!l.leadQuality && Number(l.approvalScore) >= 40 && Number(l.approvalScore) < 70));
  const needsAction = leads.filter((l) => !l.leadStatus || l.leadStatus === "חדש");
  const focusItems = getFocusItems(leads);

  const tabs = [
    { key: "הכל",     label: "הכל",     count: leads.length },
    { key: "חמים",    label: "חמים",    count: hot.length },
    { key: "בינוניים", label: "בינוניים", count: warm.length },
  ];
  const filtered = tabFilter === "חמים" ? hot : tabFilter === "בינוניים" ? warm : leads;

  return (
    <>
      <Head>
        <title>לוח בקרה | FINZO PRO</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main dir="rtl" className="min-h-screen bg-slate-50">
        <AdvisorHeader active="/advisor" />

        <div className="max-w-[92rem] mx-auto px-4 lg:px-6 py-4 lg:py-5">

          {/* Greeting */}
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-bold text-slate-400 mb-1.5">{todayStr}</p>
              <h1 className="text-xl md:text-2xl lg:text-[2rem] font-black text-slate-950 leading-tight">
                {!loading && hot.length > 0 ? (
                  <>יש לכם <span className="text-violet-700">{hot.length} לידים חמים</span> לטיפול.</>
                ) : !loading && leads.length > 0 ? (
                  <>ברוכים הבאים, <span className="text-violet-700">FINZO PRO</span>.</>
                ) : !loading ? (
                  <>מוכנים לרכוש <span className="text-violet-700">לידים חדשים</span>?</>
                ) : (
                  <span className="inline-block h-9 w-72 bg-slate-200 rounded-xl animate-pulse" />
                )}
              </h1>
            </div>
            <Link
              href="/advisor/leads"
              className="hidden md:inline-flex items-center gap-2 bg-violet-700 text-white text-sm font-black px-4 py-2.5 rounded-xl hover:bg-violet-800 transition-colors shrink-0"
            >
              לשוק הלידים ←
            </Link>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2.5">
                  <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
                  <div className="h-8 w-12 bg-slate-100 rounded animate-pulse" />
                </div>
              ))
            ) : (
              <>
                <KpiTile label="לידים שלי" value={leads.length} />
                <KpiTile label="חמים" value={hot.length} delta={hot.length > 0 ? "פוטנציאל גבוה" : undefined} deltaDir="up" />
                <KpiTile label="בינוניים" value={warm.length} />
                <KpiTile label="ממתינים לטיפול" value={needsAction.length} />
              </>
            )}
          </div>

          {/* Two-column main */}
          <div className="grid xl:grid-cols-[320px_1fr] gap-3.5">

            {/* ── Left panel ── */}
            <div className="space-y-3">

              {/* Focus section */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 pt-5 pb-4 border-b border-slate-50">
                  <h2 className="text-sm font-black text-slate-950">הפוקוס של היום</h2>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">פעולות שממליץ לסגור היום.</p>
                </div>
                {loading ? (
                  <div className="p-5 space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-5 h-3 bg-slate-100 rounded animate-pulse shrink-0 mt-1" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 bg-slate-100 rounded w-3/4 animate-pulse" />
                          <div className="h-3 bg-slate-100 rounded w-1/2 animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : focusItems.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-2xl mb-2">✓</p>
                    <p className="text-sm font-bold text-slate-500">כל הלידים בטיפול</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {focusItems.map(({ lead, text, sub }, i) => (
                      <div key={lead.id} className="flex gap-3 px-5 py-4">
                        <span className="text-sm font-black text-violet-400/60 tabular-nums shrink-0 mt-0.5 w-6">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 leading-snug mb-1">{text}</p>
                          <p className="text-xs text-slate-400">
                            {lead.phone ? (
                              <a href={`tel:${lead.phone}`} className="text-violet-600 font-bold hover:underline">
                                {lead.name || "[לקוח]"}
                              </a>
                            ) : (
                              <span className="text-violet-600 font-bold">{lead.name || "[לקוח]"}</span>
                            )}
                            {sub ? ` · ${sub}` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* FINZO MARKET widget */}
              <div className="bg-[#0d1225] rounded-2xl p-5 text-white overflow-hidden relative">
                <div className="absolute -bottom-10 -start-10 w-36 h-36 bg-violet-600/20 rounded-full pointer-events-none" />
                <p className="text-[10px] font-black text-violet-400 tracking-widest mb-2">FINZO MARKET · שוק לידים</p>
                <p className="text-base font-black leading-snug mb-1">לידים חדשים זמינים<br />עכשיו באזורכם.</p>
                <p className="text-xs text-slate-500 mb-4">מסוננים לפי איכות ופוטנציאל אישור.</p>
                <Link
                  href="/advisor/leads"
                  className="relative z-10 flex items-center justify-center gap-2 bg-white text-slate-950 text-sm font-black rounded-xl py-2.5 hover:bg-slate-100 transition-colors"
                >
                  צפייה בכל הלידים ←
                </Link>
              </div>
            </div>

            {/* ── Right: lead table panel ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
                <div>
                  <h2 className="text-sm font-black text-slate-950">הלידים שלי</h2>
                  {!loading && (
                    <p className="text-xs text-slate-400 font-bold mt-0.5">
                      {leads.length} פעילים · {needsAction.length} ממתינים לטיפול
                    </p>
                  )}
                </div>
                <Link href="/advisor/my-leads" className="text-xs font-bold text-violet-600 hover:underline shrink-0">
                  ניהול מלא ←
                </Link>
              </div>

              {/* Tab filter */}
              <div className="flex border-b border-slate-100 shrink-0 overflow-x-auto">
                {tabs.map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setTabFilter(key)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
                      tabFilter === key
                        ? "border-violet-600 text-violet-700"
                        : "border-transparent text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    {label}
                    <span className={`tabular-nums px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      tabFilter === key ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>

              {msg && (
                <div className="px-5 py-2 bg-red-50 text-sm text-red-700 font-bold border-b border-red-100 shrink-0">
                  {msg}
                </div>
              )}

              {/* Rows */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 px-5 text-center">
                    {leads.length === 0 ? (
                      <>
                        <p className="text-3xl mb-3">📋</p>
                        <p className="text-sm font-black text-slate-700 mb-1">עדיין אין לידים</p>
                        <p className="text-xs text-slate-400 mb-4">רכשו לידים מחנות הלידים.</p>
                        <Link href="/advisor/leads" className="rounded-full bg-violet-700 text-white px-5 py-2 text-sm font-black hover:bg-violet-800 transition-colors">
                          לחנות הלידים ←
                        </Link>
                      </>
                    ) : (
                      <p className="text-sm font-bold text-slate-400">אין לידים בקטגוריה זו</p>
                    )}
                  </div>
                ) : (
                  filtered.map((lead) => <LeadRow key={lead.id} lead={lead} onUpdate={update} />)
                )}
              </div>
            </div>
          </div>

          {/* Mobile CTA */}
          <div className="mt-5 md:hidden">
            <Link href="/advisor/leads" className="flex items-center justify-center gap-2 bg-violet-700 text-white text-sm font-black px-4 py-3 rounded-xl hover:bg-violet-800 transition-colors">
              לשוק הלידים ←
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
