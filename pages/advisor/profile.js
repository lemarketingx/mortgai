import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import AdvisorHeader from "../../components/AdvisorHeader";

const PROFILE_KEY = "finzo_advisor_profile_v1";

const SPECIALTIES = [
  { key: "purchase",   label: "רכישת דירה" },
  { key: "refinance",  label: "מחזור משכנתא" },
  { key: "youth",      label: "מחיר למשתכן" },
  { key: "selfbuild",  label: "בנייה עצמית" },
  { key: "investors",  label: "משקיעים" },
];

function loadProfile() {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}"); }
  catch { return {}; }
}

function saveProfile(p) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); return true; } catch { return false; }
}

export default function AdvisorProfile() {
  const [profile, setProfile] = useState({});
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
    setMounted(true);
  }, []);

  function update(key, value) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSpecialty(key) {
    const current = profile.specialties || [];
    const next = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key];
    update("specialties", next);
  }

  function handleSave() {
    const ok = saveProfile(profile);
    if (ok) {
      setSaveError(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } else {
      setSavedFlash(false);
      setSaveError(true);
      setTimeout(() => setSaveError(false), 2500);
    }
  }

  // Skeleton during SSR / hydration
  if (!mounted) {
    return (
      <main dir="rtl" className="min-h-screen bg-slate-50">
        <AdvisorHeader active="/advisor/settings" />
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-40 animate-pulse border border-slate-100" />
          ))}
        </div>
      </main>
    );
  }

  const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300 bg-white";

  return (
    <>
      <Head>
        <title>פרופיל יועץ | FINZO PRO</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main dir="rtl" className="min-h-screen bg-slate-50 pb-24 md:pb-0">
        <AdvisorHeader active="/advisor/settings" />

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

          {/* Page header */}
          <div className="flex items-center gap-3">
            <Link href="/advisor/settings" className="text-xs font-black text-slate-400 hover:text-slate-700 transition-colors">
              ← הגדרות
            </Link>
            <h1 className="text-xl font-black text-slate-950 flex-1">פרופיל יועץ</h1>
            {savedFlash && <span className="text-xs font-black text-emerald-600">נשמר ✓</span>}
            {saveError && <span className="text-xs font-black text-red-600">שמירה נכשלה — נסו שוב</span>}
          </div>

          {/* Privacy notice */}
          <div className="flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
            <span className="text-base shrink-0">🔒</span>
            <p className="text-xs font-bold text-sky-800">
              פרטי הפרופיל נשמרים כרגע באופן <strong>מקומי במכשיר בלבד</strong> ואינם גלויים ללקוחות.
              בגרסאות עתידיות יסתנכרנו עם הפלטפורמה.
            </p>
          </div>

          {/* ── פרטים אישיים ───────────────────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-950">פרטים אישיים</h2>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-black text-slate-500 mb-1.5">שם מלא</label>
                <input type="text" className={inputCls}
                  placeholder="שם היועץ"
                  value={profile.name || ""}
                  onChange={(e) => update("name", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1.5">טלפון</label>
                  <input type="tel" className={inputCls}
                    placeholder="05X-XXXXXXX"
                    value={profile.phone || ""}
                    onChange={(e) => update("phone", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1.5">מייל</label>
                  <input type="email" className={inputCls}
                    placeholder="advisor@example.com"
                    value={profile.email || ""}
                    onChange={(e) => update("email", e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 mb-1.5">עיר / אזור שירות</label>
                <input type="text" className={inputCls}
                  placeholder="תל אביב, מרכז"
                  value={profile.city || ""}
                  onChange={(e) => update("city", e.target.value)} />
              </div>
            </div>
          </section>

          {/* ── פרופיל מקצועי ───────────────────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-950">פרופיל מקצועי</h2>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-black text-slate-500 mb-1.5">רישיון / ניסיון</label>
                <input type="text" className={inputCls}
                  placeholder="5 שנות ניסיון, רישיון מספר XXXXX"
                  value={profile.license || ""}
                  onChange={(e) => update("license", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 mb-1.5">ביוגרפיה קצרה</label>
                <textarea className={`${inputCls} min-h-[100px] resize-y`}
                  placeholder="כמה מילים על עצמך, הניסיון שלך ומה מייחד אותך..."
                  value={profile.bio || ""}
                  onChange={(e) => update("bio", e.target.value)} />
              </div>
            </div>
          </section>

          {/* ── התמחויות ────────────────────────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-950">התמחויות</h2>
              <p className="text-xs font-bold text-slate-400 mt-0.5">בחר את תחומי ההתמחות שלך</p>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {SPECIALTIES.map((s) => {
                  const selected = (profile.specialties || []).includes(s.key);
                  return (
                    <button key={s.key} type="button"
                      onClick={() => toggleSpecialty(s.key)}
                      className={`rounded-xl px-3 py-3 text-sm font-black border text-right transition-all flex items-center gap-2 ${
                        selected
                          ? "bg-violet-50 border-violet-300 text-violet-800"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}>
                      <span className={`text-lg shrink-0 transition-transform ${selected ? "scale-110" : ""}`}>
                        {selected ? "✓" : "○"}
                      </span>
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ── CTA ─────────────────────────────────────────────────────────── */}
          <button type="button" onClick={handleSave}
            className="w-full rounded-2xl bg-violet-700 text-white font-black py-3.5 text-sm hover:bg-violet-800 active:bg-violet-900 transition-colors">
            שמור פרופיל
          </button>

        </div>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 px-4 py-3 flex gap-2">
          <Link href="/advisor"          className="flex-1 text-center text-xs font-black text-slate-600 bg-slate-100 rounded-xl py-2.5">ראשי</Link>
          <Link href="/advisor/my-leads" className="flex-1 text-center text-xs font-black text-slate-600 bg-slate-100 rounded-xl py-2.5">הלידים שלי</Link>
          <Link href="/advisor/settings" className="flex-1 text-center text-xs font-black text-slate-600 bg-slate-100 rounded-xl py-2.5">הגדרות</Link>
        </div>
      </main>
    </>
  );
}
