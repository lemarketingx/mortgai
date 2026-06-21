import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import AdvisorHeader from "../../components/AdvisorHeader";
import { BANK_LIST } from "../../lib/bankerDirectory";

const BANK_NAMES = BANK_LIST.map((b) => b.name);

const EMPTY_FORM = {
  bank_name: "", branch_name: "", region: "", banker_name: "",
  phone: "", email: "", role_title: "", specialties: "", notes: "", is_active: true,
};

function BankerFormFields({ form, onChange }) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-1">בנק *</label>
          <select
            className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:text-slate-200"
            value={form.bank_name}
            onChange={(e) => onChange("bank_name", e.target.value)}
          >
            <option value="">בחר בנק...</option>
            {BANK_NAMES.map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-1">סניף</label>
          <input
            className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:text-slate-200"
            placeholder="שם/מספר סניף"
            value={form.branch_name}
            onChange={(e) => onChange("branch_name", e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-1">שם בנקאי/ת *</label>
          <input
            className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:text-slate-200"
            placeholder="שם מלא"
            value={form.banker_name}
            onChange={(e) => onChange("banker_name", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-1">תפקיד</label>
          <input
            className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:text-slate-200"
            placeholder="יועץ משכנתאות, מנהל סניף..."
            value={form.role_title}
            onChange={(e) => onChange("role_title", e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-1">טלפון</label>
          <input
            className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:text-slate-200"
            placeholder="050-000-0000"
            type="tel"
            value={form.phone}
            onChange={(e) => onChange("phone", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-1">מייל</label>
          <input
            className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:text-slate-200"
            placeholder="banker@bank.co.il"
            type="email"
            value={form.email}
            onChange={(e) => onChange("email", e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-1">אזור</label>
          <input
            className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:text-slate-200"
            placeholder="תל אביב, ירושלים, חיפה..."
            value={form.region}
            onChange={(e) => onChange("region", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-1">התמחות</label>
          <input
            className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:text-slate-200"
            placeholder="משכנתאות גדולות, מחיר למשתכן..."
            value={form.specialties}
            onChange={(e) => onChange("specialties", e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-1">הערות</label>
        <textarea
          className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm font-bold min-h-[64px] resize-y outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:text-slate-200"
          placeholder="שעות פעילות, העדפות, מידע נוסף..."
          value={form.notes}
          onChange={(e) => onChange("notes", e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          className="w-4 h-4 accent-violet-700"
          checked={form.is_active}
          onChange={(e) => onChange("is_active", e.target.checked)}
        />
        <span className="text-sm font-black text-slate-700 dark:text-slate-300">פעיל</span>
      </label>
    </div>
  );
}

export default function BankersPage() {
  const [bankers, setBankers]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showAdd, setShowAdd]             = useState(false);
  const [editingId, setEditingId]         = useState(null);
  const [form, setForm]                   = useState(EMPTY_FORM);
  const [saving, setSaving]               = useState(false);
  const [msg, setMsg]                     = useState({ text: "", ok: true });
  const [search, setSearch]               = useState("");
  const [filterBank, setFilterBank]       = useState("");
  const [showInactive, setShowInactive]   = useState(false);
  const [deletingId, setDeletingId]       = useState(null);

  useEffect(() => {
    loadBankers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  async function loadBankers() {
    setLoading(true);
    try {
      const r = await fetch(`/api/advisor/bankers${showInactive ? "?includeInactive=1" : ""}`);
      if (r.ok) {
        const j = await r.json();
        setBankers(Array.isArray(j.bankers) ? j.bankers : []);
      }
    } finally {
      setLoading(false);
    }
  }

  function flash(text, ok = true) {
    setMsg({ text, ok });
    setTimeout(() => setMsg({ text: "", ok: true }), 3000);
  }

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowAdd(true);
  }

  function startEdit(banker) {
    setForm({
      bank_name:   banker.bank_name   || "",
      branch_name: banker.branch_name || "",
      region:      banker.region      || "",
      banker_name: banker.banker_name || "",
      phone:       banker.phone       || "",
      email:       banker.email       || "",
      role_title:  banker.role_title  || "",
      specialties: banker.specialties || "",
      notes:       banker.notes       || "",
      is_active:   banker.is_active !== false,
    });
    setEditingId(banker.id);
    setShowAdd(true);
  }

  async function submitForm(e) {
    e.preventDefault();
    if (!form.bank_name.trim()) { flash("יש לבחור בנק", false); return; }
    if (!form.banker_name.trim()) { flash("יש להזין שם בנקאי", false); return; }
    setSaving(true);
    try {
      if (editingId) {
        const r = await fetch("/api/advisor/bankers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...form }),
        });
        if (r.ok) {
          const j = await r.json();
          setBankers((prev) => prev.map((b) => b.id === editingId ? j.banker : b));
          flash("פרטי הבנקאי עודכנו ✓");
          setShowAdd(false);
        } else {
          flash("שמירה נכשלה", false);
        }
      } else {
        const r = await fetch("/api/advisor/bankers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (r.ok) {
          const j = await r.json();
          setBankers((prev) => [j.banker, ...prev]);
          flash("בנקאי נוסף ✓");
          setShowAdd(false);
        } else {
          flash("הוספה נכשלה", false);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(banker) {
    const r = await fetch("/api/advisor/bankers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: banker.id, is_active: !banker.is_active }),
    });
    if (r.ok) {
      const j = await r.json();
      setBankers((prev) => prev.map((b) => b.id === banker.id ? j.banker : b).filter((b) => showInactive || b.is_active));
      flash(banker.is_active ? "בנקאי הושבת" : "בנקאי הופעל ✓");
    }
  }

  async function confirmDelete(banker) {
    if (!window.confirm(`למחוק את ${banker.banker_name}? פעולה זו בלתי הפיכה.`)) return;
    setDeletingId(banker.id);
    try {
      const r = await fetch("/api/advisor/bankers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: banker.id }),
      });
      if (r.ok) {
        setBankers((prev) => prev.filter((b) => b.id !== banker.id));
        flash("בנקאי נמחק");
      } else {
        flash("מחיקה נכשלה", false);
      }
    } finally {
      setDeletingId(null);
    }
  }

  // Filtered list
  const filtered = bankers.filter((b) => {
    if (filterBank && b.bank_name !== filterBank) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (b.banker_name || "").toLowerCase().includes(q) ||
        (b.bank_name   || "").toLowerCase().includes(q) ||
        (b.branch_name || "").toLowerCase().includes(q) ||
        (b.phone       || "").includes(q) ||
        (b.email       || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const uniqueBanks = [...new Set(bankers.map((b) => b.bank_name).filter(Boolean))].sort();

  return (
    <>
      <Head><title>ספר בנקאים | FINZO PRO</title><meta name="robots" content="noindex,nofollow" /></Head>
      <main dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
        <AdvisorHeader active="/advisor/bankers" />

        {/* Page header */}
        <div className="max-w-4xl mx-auto px-4 pt-6 pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-black text-slate-950 dark:text-slate-100">ספר בנקאים</h1>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-0.5">אנשי הקשר שלך בבנקים השונים</p>
            </div>
            <button
              type="button"
              onClick={startAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-700 text-white text-sm font-black hover:bg-violet-800 transition-colors"
            >
              + הוסף בנקאי
            </button>
          </div>

          {msg.text && (
            <div className={`mt-3 px-4 py-2.5 rounded-xl text-sm font-bold ${msg.ok ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"}`}>
              {msg.text}
            </div>
          )}
        </div>

        {/* Search & filters */}
        <div className="max-w-4xl mx-auto px-4 mb-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-3 flex flex-wrap gap-2 items-center">
            <input
              type="text"
              className="flex-1 min-w-[160px] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:text-slate-200"
              placeholder="🔍 חיפוש בנקאי..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:text-slate-200"
              value={filterBank}
              onChange={(e) => setFilterBank(e.target.value)}
            >
              <option value="">כל הבנקים</option>
              {uniqueBanks.map((b) => <option key={b}>{b}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-xs font-black text-slate-500 dark:text-slate-400 cursor-pointer">
              <input type="checkbox" className="accent-violet-700" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
              כולל לא פעילים
            </label>
          </div>
        </div>

        {/* Add / Edit form */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowAdd(false)}>
            <div
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              dir="rtl"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-black text-slate-950 dark:text-slate-100">
                  {editingId ? "עריכת בנקאי" : "הוספת בנקאי חדש"}
                </h2>
                <button type="button" onClick={() => setShowAdd(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-black text-xl leading-none">×</button>
              </div>
              <form onSubmit={submitForm} className="p-5">
                <BankerFormFields form={form} onChange={updateForm} />
                <div className="flex gap-2 mt-5">
                  <button type="submit" disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-violet-700 text-white text-sm font-black disabled:opacity-50 hover:bg-violet-800 transition-colors">
                    {saving ? "שומר..." : editingId ? "שמור שינויים" : "הוסף בנקאי"}
                  </button>
                  <button type="button" onClick={() => setShowAdd(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    ביטול
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Banker list */}
        <div className="max-w-4xl mx-auto px-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 h-28 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-10 text-center">
              {bankers.length === 0 ? (
                <>
                  <p className="text-3xl mb-3">🏦</p>
                  <p className="text-sm font-black text-slate-700 dark:text-slate-300 mb-1">ספר הבנקאים ריק</p>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-4">הוסף בנקאים ותוכל לבחור אותם בתוך תיקי לקוח</p>
                  <button type="button" onClick={startAdd} className="px-4 py-2.5 rounded-xl bg-violet-700 text-white text-sm font-black">
                    + הוסף בנקאי ראשון
                  </button>
                </>
              ) : (
                <>
                  <p className="text-2xl mb-2">🔍</p>
                  <p className="text-sm font-black text-slate-500 dark:text-slate-400">אין תוצאות לחיפוש זה</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((banker) => (
                <div
                  key={banker.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 transition-all ${banker.is_active ? "border-slate-100 dark:border-slate-800" : "border-slate-100 dark:border-slate-800 opacity-60"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-black text-slate-950 dark:text-slate-100">{banker.banker_name}</span>
                        {banker.role_title && (
                          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{banker.role_title}</span>
                        )}
                        {!banker.is_active && (
                          <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full">לא פעיל</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                        <span className="font-black text-violet-700 dark:text-violet-300">{banker.bank_name}</span>
                        {banker.branch_name && <span>· סניף {banker.branch_name}</span>}
                        {banker.region && <span>· {banker.region}</span>}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {banker.phone && (
                          <div className="flex items-center gap-1">
                            <a href={`tel:${banker.phone}`} className="font-bold text-slate-600 dark:text-slate-400 hover:text-violet-700 dark:hover:text-violet-300">{banker.phone}</a>
                            <a href={`tel:${banker.phone}`} className="px-1.5 py-0.5 rounded-md bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 font-black text-[10px]">☎</a>
                            <a href={`https://wa.me/${banker.phone.replace(/[^\d]/g, "").replace(/^0/, "972")}`} target="_blank" rel="noopener noreferrer" className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-black text-[10px]">💬</a>
                          </div>
                        )}
                        {banker.email && (
                          <div className="flex items-center gap-1">
                            <a href={`mailto:${banker.email}`} className="font-bold text-slate-600 dark:text-slate-400 hover:text-violet-700 dark:hover:text-violet-300 truncate max-w-[180px]">{banker.email}</a>
                            <a href={`mailto:${banker.email}`} className="px-1.5 py-0.5 rounded-md bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 font-black text-[10px]">✉</a>
                          </div>
                        )}
                      </div>
                      {banker.specialties && (
                        <p className="mt-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500">התמחות: {banker.specialties}</p>
                      )}
                      {banker.notes && (
                        <p className="mt-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 line-clamp-2">{banker.notes}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(banker)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        ✏ ערוך
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(banker)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${banker.is_active ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800" : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-800"}`}
                      >
                        {banker.is_active ? "השבת" : "הפעל"}
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDelete(banker)}
                        disabled={deletingId === banker.id}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 text-xs font-black hover:bg-rose-100 dark:hover:bg-rose-800 transition-colors disabled:opacity-50"
                      >
                        {deletingId === banker.id ? "..." : "מחק"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
