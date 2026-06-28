import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import AdvisorHeader from "../../components/AdvisorHeader";

const PREFS_KEY = "finzo_prefs_v1";

function loadPrefs() {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"); }
  catch { return {}; }
}

function savePrefs(p) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {}
}

function Toggle({ checked, onChange, label }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-sm font-bold text-slate-700 dark:text-slate-400">{label}</span>
      <button type="button" onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full transition-colors relative ${checked ? "bg-violet-600" : "bg-slate-200 dark:bg-slate-700"}`}>
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "right-0.5" : "right-[18px]"}`} />
      </button>
    </div>
  );
}

const PRICING_MODEL_OPTIONS = [
  { value: "fixed",        label: "עמלה קבועה",     icon: "💰" },
  { value: "percent",      label: "אחוז מהמשכנתא",  icon: "%" },
  { value: "hybrid",       label: "בסיס + אחוז",    icon: "⚡" },
  { value: "by_lead_type", label: "לפי סוג תיק",    icon: "📋" },
];

const LEAD_TYPE_OPTIONS = ["רכישה", "מחזור", "משפר דיור", "בנייה עצמית", "default"];

function PricingSettings() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [model, setModel] = useState("");
  const [fixedFee, setFixedFee] = useState("");
  const [percentFee, setPercentFee] = useState("");
  const [hybridBaseFee, setHybridBaseFee] = useState("");
  const [hybridPercentFee, setHybridPercentFee] = useState("");
  const [leadTypeRules, setLeadTypeRules] = useState({});

  useEffect(() => {
    fetch("/api/advisor/pricing")
      .then(async (r) => {
        if (r.status === 401) { window.location.href = "/advisor/login"; return null; }
        if (!r.ok) {
          const errBody = await r.json().catch(() => ({}));
          if (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_DEBUG === "true") {
            console.log("[PricingSettings] load error:", r.status, errBody);
          }
          return { profile: null };
        }
        return r.json();
      })
      .then((j) => {
        if (j && j.profile) {
          const p = j.profile;
          if (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_DEBUG === "true") {
            console.log("[PricingSettings] loaded profile:", p.pricingModel);
          }
          setProfile(p);
          setModel(p.pricingModel || "");
          setFixedFee(p.fixedFee || "");
          setPercentFee(p.percentFee || "");
          setHybridBaseFee(p.hybridBaseFee || "");
          setHybridPercentFee(p.hybridPercentFee || "");
          setLeadTypeRules(p.leadTypeRules || {});
        } else {
          if (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_DEBUG === "true") {
            console.log("[PricingSettings] no profile found — first-time setup");
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        if (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_DEBUG === "true") {
          console.log("[PricingSettings] fetch error:", err);
        }
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const method = profile ? "PUT" : "POST";
      const res = await fetch("/api/advisor/pricing", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pricingModel: model,
          fixedFee: Number(fixedFee) || 0,
          percentFee: Number(percentFee) || 0,
          hybridBaseFee: Number(hybridBaseFee) || 0,
          hybridPercentFee: Number(hybridPercentFee) || 0,
          leadTypeRules,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "TABLE_MISSING") {
          setError("טבלת הגדרות עמלות חסרה במסד הנתונים. יש להריץ את קובץ ה-SQL migration.");
        } else {
          setError(data.message || "שגיאה בשמירה");
        }
      } else {
        if (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_DEBUG === "true") {
          console.log("[PricingSettings] saved profile:", data.profile?.pricingModel);
        }
        setProfile(data.profile);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError("שגיאת רשת");
    }
    setSaving(false);
  }

  function updateLeadTypeRule(type, value) {
    setLeadTypeRules((prev) => ({ ...prev, [type]: Number(value) || 0 }));
  }

  if (loading) {
    return (
      <div className="px-5 py-6 space-y-3">
        <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-50 dark:divide-slate-800">
      <div className="px-5 py-4">
        <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-2.5">מודל עמלה</label>
        <div className="grid grid-cols-2 gap-2">
          {PRICING_MODEL_OPTIONS.map((opt) => (
            <button key={opt.value} type="button"
              onClick={() => setModel(opt.value)}
              className={`rounded-xl py-3 text-sm font-black border transition-all flex flex-col items-center gap-1 ${
                model === opt.value
                  ? "bg-violet-700 text-white border-violet-700 shadow-sm"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}>
              <span className="text-base">{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {model === "fixed" && (
        <div className="px-5 py-4">
          <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-1.5">עמלה קבועה לתיק (₪)</label>
          <input type="number" value={fixedFee} onChange={(e) => setFixedFee(e.target.value)}
            placeholder="לדוגמה: 3000"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-400" />
        </div>
      )}

      {model === "percent" && (
        <div className="px-5 py-4">
          <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-1.5">אחוז עמלה מסכום המשכנתא (%)</label>
          <input type="number" step="0.01" value={percentFee} onChange={(e) => setPercentFee(e.target.value)}
            placeholder="לדוגמה: 0.5"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-400" />
          {percentFee && Number(percentFee) > 0 && (
            <p className="text-[11px] font-bold text-slate-400 mt-1">
              למשכנתא של ₪1,000,000 → עמלה: ₪{(1000000 * Number(percentFee) / 100).toLocaleString("he-IL")}
            </p>
          )}
        </div>
      )}

      {model === "hybrid" && (
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-1.5">עמלת בסיס (₪)</label>
            <input type="number" value={hybridBaseFee} onChange={(e) => setHybridBaseFee(e.target.value)}
              placeholder="לדוגמה: 1500"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-400" />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-1.5">אחוז נוסף מסכום המשכנתא (%)</label>
            <input type="number" step="0.01" value={hybridPercentFee} onChange={(e) => setHybridPercentFee(e.target.value)}
              placeholder="לדוגמה: 0.25"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-400" />
          </div>
          {hybridBaseFee && hybridPercentFee && (
            <p className="text-[11px] font-bold text-slate-400">
              למשכנתא של ₪1,000,000 → עמלה: ₪{(Number(hybridBaseFee) + 1000000 * Number(hybridPercentFee) / 100).toLocaleString("he-IL")}
            </p>
          )}
        </div>
      )}

      {model === "by_lead_type" && (
        <div className="px-5 py-4 space-y-2">
          <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-1.5">עמלה לפי סוג תיק (₪)</label>
          {LEAD_TYPE_OPTIONS.map((type) => (
            <div key={type} className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-24 shrink-0 text-right">
                {type === "default" ? "ברירת מחדל" : type}
              </span>
              <input type="number" value={leadTypeRules[type] || ""}
                onChange={(e) => updateLeadTypeRule(type, e.target.value)}
                placeholder="₪"
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-400" />
            </div>
          ))}
        </div>
      )}

      {model && (
        <div className="px-5 py-4 space-y-2">
          {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
          {saved && <p className="text-xs font-bold text-emerald-600 animate-pulse">מודל העמלה נשמר בהצלחה ✓</p>}
          <button type="button" onClick={handleSave} disabled={saving}
            className="w-full rounded-xl bg-violet-700 text-white font-black py-3 text-sm hover:bg-violet-800 transition-colors disabled:opacity-50">
            {saving ? "שומר..." : "שמור מודל עמלה"}
          </button>
        </div>
      )}

      {!model && (
        <div className="px-5 py-4 text-center">
          <p className="text-sm font-black text-amber-700 dark:text-amber-300 mb-1">עדיין לא הוגדר מודל עמלה</p>
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
            בחר מודל עמלה כדי שהדשבורד יחשב עמלות צפויות בהתאם.
          </p>
        </div>
      )}
    </div>
  );
}

export default function AdvisorSettings() {
  const [prefs, setPrefs] = useState({});
  const [savedFlash, setSavedFlash] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({ overdue_alert: false, daily_reminder: false, whatsapp_new_lead: false });
  const [notifLoading, setNotifLoading] = useState(true);

  useEffect(() => {
    setPrefs(loadPrefs());
    setMounted(true);
    fetch("/api/advisor/notification-prefs")
      .then((r) => r.ok ? r.json() : { prefs: {} })
      .then((data) => {
        if (data.prefs && Object.keys(data.prefs).length > 0) {
          setNotifPrefs({
            overdue_alert: !!data.prefs.overdue_alert,
            daily_reminder: !!data.prefs.daily_reminder,
            whatsapp_new_lead: !!data.prefs.whatsapp_new_lead,
          });
        }
        setNotifLoading(false);
      })
      .catch(() => setNotifLoading(false));
  }, []);

  async function updateNotif(key, value) {
    const next = { ...notifPrefs, [key]: value };
    setNotifPrefs(next);
    try {
      await fetch("/api/advisor/notification-prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch {}
  }

  function update(key, value) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePrefs(next);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  const VIEW_OPTIONS = [
    { value: "kanban",  label: "קנבן",     icon: "⊞" },
    { value: "cards",   label: "כרטיסים",  icon: "▤" },
    { value: "list",    label: "רשימה",    icon: "≡" },
  ];

  const SORT_OPTIONS = [
    { value: "priority", label: "עדיפות" },
    { value: "newest",   label: "חדש ביותר" },
    { value: "amount",   label: "סכום גבוה" },
    { value: "status",   label: "שלב" },
  ];

  return (
    <>
      <Head>
        <title>הגדרות | FINZO PRO</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 md:pb-0">
        <AdvisorHeader active="/advisor/settings" />

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

          {/* Page header */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-black text-slate-950 dark:text-slate-100">הגדרות</h1>
            {savedFlash && <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 animate-pulse">נשמר ✓</span>}
          </div>

          {/* ── תצוגה ──────────────────────────────────────────────────────── */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-black text-slate-950 dark:text-slate-100">תצוגה</h2>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-0.5">העדפות תצוגת לידים ומיון</p>
            </div>

            <div className="divide-y divide-slate-50 dark:divide-slate-800">

              {/* Default view */}
              <div className="px-5 py-4">
                <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-2.5">תצוגת לידים ברירת מחדל</label>
                <div className="grid grid-cols-3 gap-2">
                  {VIEW_OPTIONS.map((opt) => {
                    const active = (mounted ? prefs.defaultView : "kanban") === opt.value || (!prefs.defaultView && opt.value === "kanban");
                    return (
                      <button key={opt.value} type="button"
                        onClick={() => update("defaultView", opt.value)}
                        className={`rounded-xl py-3 text-sm font-black border transition-all flex flex-col items-center gap-1 ${
                          active
                            ? "bg-violet-700 text-white border-violet-700 shadow-sm"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}>
                        <span className="text-base">{opt.icon}</span>
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Default sort */}
              <div className="px-5 py-4">
                <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-2.5">מיון לידים ברירת מחדל</label>
                <div className="grid grid-cols-2 gap-2">
                  {SORT_OPTIONS.map((opt) => {
                    const active = (mounted ? prefs.defaultSort : "priority") === opt.value || (!prefs.defaultSort && opt.value === "priority");
                    return (
                      <button key={opt.value} type="button"
                        onClick={() => update("defaultSort", opt.value)}
                        className={`rounded-xl py-2.5 text-sm font-black border transition-all ${
                          active
                            ? "bg-violet-700 text-white border-violet-700"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </section>

          {/* ── פרופיל ─────────────────────────────────────────────────────── */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-950 dark:text-slate-100">פרופיל יועץ</h2>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-0.5">שם, טלפון, התמחויות</p>
              </div>
              <Link href="/advisor/profile" className="text-xs font-black text-violet-700 dark:text-violet-300 hover:text-violet-900 dark:hover:text-violet-200 transition-colors">
                עריכה →
              </Link>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                הפרופיל מסונכרן עם הפלטפורמה ונשמר גם מקומית לגישה מהירה.
              </p>
            </div>
          </section>

          {/* ── התראות ─────────────────────────────────────────────────────── */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-950 dark:text-slate-100">התראות</h2>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-0.5">התראות מייל ו-WhatsApp</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              {notifLoading ? (
                <div className="h-20 animate-pulse bg-slate-50 dark:bg-slate-800 rounded-xl" />
              ) : (
                <>
                  <Toggle label="התראה על פעולה באיחור" checked={notifPrefs.overdue_alert} onChange={(v) => updateNotif("overdue_alert", v)} />
                  <Toggle label="תזכורת יומית בבוקר" checked={notifPrefs.daily_reminder} onChange={(v) => updateNotif("daily_reminder", v)} />
                  <Toggle label="WhatsApp על ליד חדש" checked={notifPrefs.whatsapp_new_lead} onChange={(v) => updateNotif("whatsapp_new_lead", v)} />
                </>
              )}
            </div>
          </section>

          {/* ── תבניות WhatsApp ─────────────────────────────────────────────── */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-black text-slate-950 dark:text-slate-100">תבניות WhatsApp</h2>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-0.5">ניהול תבניות הודעה ללקוחות</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">
                התבניות מנוהלות בתוך תיק הליד. פתח כל תיק ולחץ על "תבניות WA ▾" לעריכה ושליחה.
              </p>
              <Link href="/advisor/my-leads"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-4 py-2 text-xs font-black hover:bg-emerald-100 dark:hover:bg-emerald-800 transition-colors">
                עבור ל-הלידים שלי →
              </Link>
            </div>
          </section>

          {/* ── מודל עמלה ──────────────────────────────────────────────── */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-black text-slate-950 dark:text-slate-100">מודל עמלה</h2>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-0.5">הגדר את אופן חישוב העמלות שלך</p>
            </div>
            <PricingSettings />
          </section>

        </div>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-3 flex gap-2">
          <Link href="/advisor"          className="flex-1 text-center text-xs font-black text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl py-2.5">ראשי</Link>
          <Link href="/advisor/my-leads" className="flex-1 text-center text-xs font-black text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl py-2.5">הלידים שלי</Link>
          <Link href="/advisor/settings" className="flex-1 text-center text-xs font-black text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20 rounded-xl py-2.5">הגדרות</Link>
        </div>
      </main>
    </>
  );
}
