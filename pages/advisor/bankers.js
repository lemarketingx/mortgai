import Head from "next/head";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdvisorHeader from "../../components/AdvisorHeader";
import { BANK_LIST } from "../../lib/bankerDirectory";

const BANK_NAMES = BANK_LIST.map((b) => b.name);
const PAGE_SIZE = 20;

const EMPTY_FORM = {
  bank_name: "", branch_name: "", region: "", banker_name: "",
  phone: "", email: "", role_title: "", specialties: "", notes: "", is_active: true,
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function BankerCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="h-4 bg-slate-200 rounded w-32" />
            <div className="h-3 bg-slate-100 rounded w-20" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 bg-violet-100 rounded w-20" />
            <div className="h-3 bg-slate-100 rounded w-24" />
            <div className="h-3 bg-slate-100 rounded w-16" />
          </div>
          <div className="flex gap-3">
            <div className="h-5 bg-slate-100 rounded w-28" />
            <div className="h-5 bg-slate-100 rounded w-40" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <div className="h-7 bg-slate-100 rounded-lg w-16" />
          <div className="h-7 bg-slate-100 rounded-lg w-16" />
          <div className="h-7 bg-slate-100 rounded-lg w-14" />
        </div>
      </div>
    </div>
  );
}

// ─── BankerFormFields ─────────────────────────────────────────────────────────
// Memoized so that sibling form fields don't re-render on each keystroke.
const BankerFormFields = memo(function BankerFormFields({ form, onChange }) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-black text-slate-400 mb-1">בנק *</label>
          <select
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300"
            value={form.bank_name}
            onChange={(e) => onChange("bank_name", e.target.value)}
          >
            <option value="">בחר בנק...</option>
            {BANK_NAMES.map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-black text-slate-400 mb-1">סניף</label>
          <input
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300"
            placeholder="שם/מספר סניף"
            value={form.branch_name}
            onChange={(e) => onChange("branch_name", e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-black text-slate-400 mb-1">שם בנקאי/ת *</label>
          <input
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300"
            placeholder="שם מלא"
            value={form.banker_name}
            onChange={(e) => onChange("banker_name", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-black text-slate-400 mb-1">תפקיד</label>
          <input
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300"
            placeholder="יועץ משכנתאות, מנהל סניף..."
            value={form.role_title}
            onChange={(e) => onChange("role_title", e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-black text-slate-400 mb-1">טלפון</label>
          <input
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300"
            placeholder="050-000-0000"
            type="tel"
            value={form.phone}
            onChange={(e) => onChange("phone", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-black text-slate-400 mb-1">מייל</label>
          <input
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300"
            placeholder="banker@bank.co.il"
            type="email"
            value={form.email}
            onChange={(e) => onChange("email", e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-black text-slate-400 mb-1">אזור</label>
          <input
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300"
            placeholder="תל אביב, ירושלים, חיפה..."
            value={form.region}
            onChange={(e) => onChange("region", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-black text-slate-400 mb-1">התמחות</label>
          <input
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300"
            placeholder="משכנתאות גדולות, מחיר למשתכן..."
            value={form.specialties}
            onChange={(e) => onChange("specialties", e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-black text-slate-400 mb-1">הערות</label>
        <textarea
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold min-h-[64px] resize-y outline-none focus:ring-2 focus:ring-violet-300"
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
        <span className="text-sm font-black text-slate-700">פעיל</span>
      </label>
    </div>
  );
});

// ─── BankerCard ───────────────────────────────────────────────────────────────
// Memoized so typing in the add/edit modal doesn't re-render the directory list.
const BankerCard = memo(function BankerCard({ banker, onEdit, onToggleActive, onDelete, isDeleting }) {
  return (
    <div className={`bg-white rounded-2xl border p-4 transition-all ${banker.is_active ? "border-slate-100" : "border-slate-100 opacity-60"}`}>
      <div className="flex items-start justify-between gap-3">
        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-black text-slate-950">{banker.banker_name}</span>
            {banker.role_title && (
              <span className="text-[11px] font-bold text-slate-400">{banker.role_title}</span>
            )}
            {!banker.is_active && (
              <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">לא פעיל</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-slate-500 mb-2">
            <span className="font-black text-violet-700">{banker.bank_name}</span>
            {banker.branch_name && <span>· סניף {banker.branch_name}</span>}
            {banker.region && <span>· {banker.region}</span>}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {banker.phone && (
              <div className="flex items-center gap-1">
                <a href={`tel:${banker.phone}`} className="font-bold text-slate-600 hover:text-violet-700">{banker.phone}</a>
                <a href={`tel:${banker.phone}`} className="px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700 font-black text-[10px]">☎</a>
                <a href={`https://wa.me/${banker.phone.replace(/[^\d]/g, "").replace(/^0/, "972")}`} target="_blank" rel="noopener noreferrer" className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-black text-[10px]">💬</a>
              </div>
            )}
            {banker.email && (
              <div className="flex items-center gap-1">
                <a href={`mailto:${banker.email}`} className="font-bold text-slate-600 hover:text-violet-700 truncate max-w-[180px]">{banker.email}</a>
                <a href={`mailto:${banker.email}`} className="px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 font-black text-[10px]">✉</a>
              </div>
            )}
          </div>
          {banker.specialties && (
            <p className="mt-1.5 text-[11px] font-bold text-slate-400">התמחות: {banker.specialties}</p>
          )}
          {banker.notes && (
            <p className="mt-1 text-[11px] font-bold text-slate-400 line-clamp-2">{banker.notes}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(banker.id)}
            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-black hover:bg-slate-200 transition-colors"
          >
            ✏ ערוך
          </button>
          <button
            type="button"
            onClick={() => onToggleActive(banker.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${banker.is_active ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
          >
            {banker.is_active ? "השבת" : "הפעל"}
          </button>
          <button
            type="button"
            onClick={() => onDelete(banker.id)}
            disabled={isDeleting}
            className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-black hover:bg-rose-100 transition-colors disabled:opacity-50"
          >
            {isDeleting ? "..." : "מחק"}
          </button>
        </div>
      </div>
    </div>
  );
});

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BankersPage() {
  const [bankers,      setBankers]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showAdd,      setShowAdd]      = useState(false);
  const [editingId,    setEditingId]    = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [msg,          setMsg]          = useState({ text: "", ok: true });
  const [search,       setSearch]       = useState("");
  const [filterBank,   setFilterBank]   = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [deletingId,   setDeletingId]   = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Refs so stable callbacks can always read the latest values without re-creating
  const bankersRef      = useRef([]);
  const showInactiveRef = useRef(false);
  useEffect(() => { bankersRef.current = bankers; }, [bankers]);
  useEffect(() => { showInactiveRef.current = showInactive; }, [showInactive]);

  useEffect(() => {
    loadBankers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  // Reset visible count whenever the filtered set changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, filterBank, showInactive]);

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

  // Stable flash — only uses the stable setMsg setter
  const flash = useCallback((text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg({ text: "", ok: true }), 3000);
  }, []);

  // Stable form field updater — functional update, no external deps
  const updateForm = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  function startAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowAdd(true);
  }

  // Stable: reads banker from ref so it doesn't need bankers in deps
  const handleEdit = useCallback((bankerId) => {
    const banker = bankersRef.current.find((b) => b.id === bankerId);
    if (!banker) return;
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
    setEditingId(bankerId);
    setShowAdd(true);
  }, []);

  // Stable: reads banker and showInactive from refs
  const handleToggleActive = useCallback(async (bankerId) => {
    const banker = bankersRef.current.find((b) => b.id === bankerId);
    if (!banker) return;
    const r = await fetch("/api/advisor/bankers", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: bankerId, is_active: !banker.is_active }),
    });
    if (r.ok) {
      const j = await r.json();
      setBankers((prev) =>
        prev.map((b) => b.id === bankerId ? j.banker : b)
            .filter((b) => showInactiveRef.current || b.is_active)
      );
      flash(banker.is_active ? "בנקאי הושבת" : "בנקאי הופעל ✓");
    }
  }, [flash]);

  // Stable: reads banker name from ref for confirm dialog
  const handleDelete = useCallback(async (bankerId) => {
    const banker = bankersRef.current.find((b) => b.id === bankerId);
    if (!banker) return;
    if (!window.confirm(`למחוק את ${banker.banker_name}? פעולה זו בלתי הפיכה.`)) return;
    setDeletingId(bankerId);
    try {
      const r = await fetch("/api/advisor/bankers", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bankerId }),
      });
      if (r.ok) {
        setBankers((prev) => prev.filter((b) => b.id !== bankerId));
        flash("בנקאי נמחק");
      } else {
        flash("מחיקה נכשלה", false);
      }
    } finally {
      setDeletingId(null);
    }
  }, [flash]);

  async function submitForm(e) {
    e.preventDefault();
    if (!form.bank_name.trim())   { flash("יש לבחור בנק", false);      return; }
    if (!form.banker_name.trim()) { flash("יש להזין שם בנקאי", false); return; }
    setSaving(true);
    try {
      if (editingId) {
        const r = await fetch("/api/advisor/bankers", {
          method:  "PATCH",
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
          method:  "POST",
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

  // Memoized derived lists — recompute only when deps change
  const filtered = useMemo(() => bankers.filter((b) => {
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
  }), [bankers, filterBank, search]);

  const uniqueBanks = useMemo(
    () => [...new Set(bankers.map((b) => b.bank_name).filter(Boolean))].sort(),
    [bankers]
  );

  const visibleBankers = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );

  return (
    <>
      <Head><title>ספר בנקאים | FINZO PRO</title><meta name="robots" content="noindex,nofollow" /></Head>
      <main dir="rtl" className="min-h-screen bg-slate-50 pb-16">
        <AdvisorHeader active="/advisor/bankers" />

        {/* Page header */}
        <div className="max-w-4xl mx-auto px-4 pt-6 pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-black text-slate-950">ספר בנקאים</h1>
              <p className="text-xs font-bold text-slate-400 mt-0.5">אנשי הקשר שלך בבנקים השונים</p>
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
            <div className={`mt-3 px-4 py-2.5 rounded-xl text-sm font-bold ${msg.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {msg.text}
            </div>
          )}
        </div>

        {/* Search & filters */}
        <div className="max-w-4xl mx-auto px-4 mb-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-3 flex flex-wrap gap-2 items-center">
            <input
              type="text"
              className="flex-1 min-w-[160px] border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300"
              placeholder="🔍 חיפוש בנקאי..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300"
              value={filterBank}
              onChange={(e) => setFilterBank(e.target.value)}
            >
              <option value="">כל הבנקים</option>
              {uniqueBanks.map((b) => <option key={b}>{b}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-xs font-black text-slate-500 cursor-pointer">
              <input type="checkbox" className="accent-violet-700" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
              כולל לא פעילים
            </label>
          </div>
        </div>

        {/* Add / Edit form */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowAdd(false)}>
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              dir="rtl"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-black text-slate-950">
                  {editingId ? "עריכת בנקאי" : "הוספת בנקאי חדש"}
                </h2>
                <button type="button" onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-700 font-black text-xl leading-none">×</button>
              </div>
              <form onSubmit={submitForm} className="p-5">
                <BankerFormFields form={form} onChange={updateForm} />
                <div className="flex gap-2 mt-5">
                  <button type="submit" disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-violet-700 text-white text-sm font-black disabled:opacity-50 hover:bg-violet-800 transition-colors">
                    {saving ? "שומר..." : editingId ? "שמור שינויים" : "הוסף בנקאי"}
                  </button>
                  <button type="button" onClick={() => setShowAdd(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-black hover:bg-slate-200 transition-colors">
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
              {[1, 2, 3, 4].map((i) => <BankerCardSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
              {bankers.length === 0 ? (
                <>
                  <p className="text-3xl mb-3">🏦</p>
                  <p className="text-sm font-black text-slate-700 mb-1">ספר הבנקאים ריק</p>
                  <p className="text-xs font-bold text-slate-400 mb-4">הוסף בנקאים ותוכל לבחור אותם בתוך תיקי לקוח</p>
                  <button type="button" onClick={startAdd} className="px-4 py-2.5 rounded-xl bg-violet-700 text-white text-sm font-black">
                    + הוסף בנקאי ראשון
                  </button>
                </>
              ) : (
                <>
                  <p className="text-2xl mb-2">🔍</p>
                  <p className="text-sm font-black text-slate-500">אין תוצאות לחיפוש זה</p>
                </>
              )}
            </div>
          ) : (
            <>
              {filtered.length > PAGE_SIZE && (
                <p className="text-xs font-bold text-slate-400 mb-2 text-left">
                  מציג {Math.min(visibleCount, filtered.length)} מתוך {filtered.length} בנקאים
                </p>
              )}
              <div className="grid gap-3">
                {visibleBankers.map((banker) => (
                  <BankerCard
                    key={banker.id}
                    banker={banker}
                    onEdit={handleEdit}
                    onToggleActive={handleToggleActive}
                    onDelete={handleDelete}
                    isDeleting={deletingId === banker.id}
                  />
                ))}
              </div>
              {filtered.length > visibleCount && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    טען עוד ({filtered.length - visibleCount} נותרו)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
