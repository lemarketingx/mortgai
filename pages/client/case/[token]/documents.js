import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import BrandLogo from "../../../../components/BrandLogo";

// ─── Constants ────────────────────────────────────────────────────────────────
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const MAX_SIZE      = 10 * 1024 * 1024; // 10 MB

const STATUS_LABEL = {
  missing:      "חסר",
  requested:    "נדרש",
  received:     "התקבל",
  approved:     "אושר",
  rejected:     "נדחה — יש להעלות שוב",
  not_required: "לא נדרש",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatBytes(b) {
  if (!b) return "";
  if (b < 1024)        return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function formatDeadline(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── DocUploadCard ────────────────────────────────────────────────────────────
function DocUploadCard({ doc, file, result, uploading, onFileSelect, onUpload, onClear }) {
  const inputRef = useRef(null);

  const bgClass = {
    missing:   "bg-slate-50   border-slate-200",
    requested: "bg-amber-50   border-amber-200",
    rejected:  "bg-rose-50    border-rose-200",
  }[doc.status] || "bg-white border-slate-200";

  const icon = { missing: "📋", requested: "⏳", rejected: "❌" }[doc.status] || "📄";

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${bgClass}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-slate-900 leading-snug">{doc.label}</p>
          <p className="text-xs font-bold text-slate-500 mt-0.5">{STATUS_LABEL[doc.status]}</p>
          {doc.status === "rejected" && doc.rejectionNote && (
            <p className="text-xs text-rose-700 mt-1.5 bg-white rounded-lg px-2.5 py-1.5 border border-rose-200">
              💬 {doc.rejectionNote}
            </p>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";  // allow re-selecting same file
          if (f) onFileSelect(f);
        }}
      />

      {/* File selected — confirm or cancel */}
      {file ? (
        <div className="bg-white rounded-xl border border-slate-200 px-3 py-2.5 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base shrink-0">📎</span>
            <span className="text-xs font-bold text-slate-700 truncate flex-1">{file.name}</span>
            <span className="text-[11px] text-slate-400 shrink-0">{formatBytes(file.size)}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onUpload}
              disabled={uploading}
              className="flex-1 py-2.5 rounded-xl bg-violet-700 text-white text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-1.5">
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                  מעלה...
                </span>
              ) : "העלה מסמך"}
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={uploading}
              className="px-3 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-black disabled:opacity-50"
            >
              ביטול
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-xs font-black text-slate-500 hover:border-violet-400 hover:text-violet-600 transition-colors"
        >
          + בחר קובץ להעלאה
        </button>
      )}

      {/* Upload result */}
      {result && (
        <div className={`rounded-xl px-3 py-2 text-xs font-black border ${
          result.ok
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-rose-50 border-rose-200 text-rose-700"
        }`}>
          {result.message}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ClientDocumentPortal() {
  const router = useRouter();
  const { token } = router.query;

  const [caseData,     setCaseData]     = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [pageError,    setPageError]    = useState(null);   // {code, message}
  const [selectedFiles, setSelectedFiles] = useState({});   // docType → File
  const [uploading,    setUploading]    = useState({});     // docType → bool
  const [uploadResults, setUploadResults] = useState({});   // docType → {ok, message}

  useEffect(() => {
    if (!token) return;
    fetch(`/api/client/case/${token}/info`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw j;
        return j;
      })
      .then((data) => { setCaseData(data); setLoading(false); })
      .catch((err) => {
        const code = err?.error || "UNKNOWN";
        const message =
          code === "INVALID_TOKEN" ? "הקישור אינו תקף, פג תוקף, או בוטל. פנה ליועץ שלך לקישור חדש." :
          code === "LEAD_NOT_FOUND" ? "התיק לא נמצא." :
          "אירעה שגיאה. נא לנסות שוב.";
        setPageError({ code, message });
        setLoading(false);
      });
  }, [token]);

  async function handleUpload(documentType) {
    const file = selectedFiles[documentType];
    if (!file) return;

    // Client-side pre-validation
    const normalizedType = file.type === "image/jpg" ? "image/jpeg" : file.type;
    if (!ALLOWED_TYPES.includes(normalizedType)) {
      setUploadResults((p) => ({ ...p, [documentType]: { ok: false, message: "סוג קובץ לא נתמך. יש להעלות PDF, JPG או PNG." } }));
      return;
    }
    if (file.size > MAX_SIZE) {
      setUploadResults((p) => ({ ...p, [documentType]: { ok: false, message: "הקובץ גדול מדי. גודל מקסימלי: 10MB." } }));
      return;
    }

    setUploading((p) => ({ ...p, [documentType]: true }));
    setUploadResults((p) => ({ ...p, [documentType]: null }));

    try {
      // Read as base64 (transport only — never stored as base64)
      const fileData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = (e) => resolve(e.target.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/client/documents/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          documentType,
          fileData,
          fileName: file.name,
          mimeType: normalizedType,
          fileSize: file.size,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setUploadResults((p) => ({ ...p, [documentType]: { ok: true, message: "הקובץ הועלה בהצלחה ✓" } }));
        // Optimistically update the checklist in local state
        setCaseData((prev) => {
          if (!prev) return prev;
          const updated = prev.documents.checklist.map((d) =>
            d.document_type === documentType
              ? { ...d, status: "received", received: true, missing: false, hasFile: true, fileName: file.name }
              : d
          );
          const req   = updated.filter((d) => d.required !== false);
          const recvd = req.filter((d) => d.received).length;
          return {
            ...prev,
            documents: {
              ...prev.documents,
              checklist:         updated,
              receivedCount:     recvd,
              completionPercent: req.length > 0 ? Math.round((recvd / req.length) * 100) : 0,
            },
          };
        });
        setSelectedFiles((p) => { const n = { ...p }; delete n[documentType]; return n; });
      } else {
        setUploadResults((p) => ({ ...p, [documentType]: { ok: false, message: data.message || "שגיאה בהעלאה. נא לנסות שוב." } }));
      }
    } catch {
      setUploadResults((p) => ({ ...p, [documentType]: { ok: false, message: "שגיאה בהעלאה. נא לנסות שוב." } }));
    } finally {
      setUploading((p) => ({ ...p, [documentType]: false }));
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <main dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-10 h-10 rounded-full border-4 border-violet-200 border-t-violet-700 animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-400">טוען...</p>
        </div>
      </main>
    );
  }

  // ── Error page ──
  if (pageError) {
    return (
      <>
        <Head><title>שגיאה | FINZO</title><meta name="robots" content="noindex,nofollow" /></Head>
        <main dir="rtl" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
          <div className="max-w-sm w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
            <div className="text-5xl mb-4">🔒</div>
            <h1 className="text-xl font-black text-slate-900 mb-2">הקישור אינו תקף</h1>
            <p className="text-sm font-bold text-slate-500 mb-6">{pageError.message}</p>
            <p className="text-xs text-slate-400">פנה ליועץ המשכנתא שלך לקישור חדש.</p>
          </div>
        </main>
      </>
    );
  }

  if (!caseData) return null;

  const { case: caseInfo, documents, deadline } = caseData;

  const uploadableDocs  = documents.checklist.filter((d) => d.required !== false && ["missing", "requested", "rejected"].includes(d.status));
  const completedDocs   = documents.checklist.filter((d) => d.required !== false && ["received", "approved"].includes(d.status));
  const allDone         = documents.completionPercent === 100 && documents.totalCount > 0;

  return (
    <>
      <Head>
        <title>העלאת מסמכים | FINZO</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main dir="rtl" className="min-h-screen bg-slate-50 pb-10">

        {/* ── Header ── */}
        <header className="bg-white border-b border-slate-100 shadow-sm py-4 px-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <BrandLogo variant="advisor" mode="light" size="sm" />
            <span className="text-slate-300">|</span>
            <span className="text-sm font-bold text-slate-500">העלאת מסמכים</span>
          </div>
        </header>

        <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">

          {/* ── Greeting ── */}
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              {caseInfo.name ? `שלום ${caseInfo.name.split(" ")[0]},` : "שלום,"}
            </h1>
            <p className="text-sm font-bold text-slate-500 mt-1">
              כדי להתקדם בתיק המשכנתא שלך, יש להעלות את המסמכים הנדרשים.
            </p>
          </div>

          {/* ── Case summary ── */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{caseInfo.caseTypeIcon}</span>
              <div>
                <p className="text-sm font-black text-slate-900">{caseInfo.caseType || "משכנתא"}</p>
                <p className="text-xs font-bold text-slate-400 mt-0.5">{caseInfo.stageLabel}</p>
              </div>
            </div>
            {caseInfo.advisorName && (
              <p className="text-xs font-bold text-slate-500">יועץ: {caseInfo.advisorName}</p>
            )}

            {/* Progress */}
            <div>
              <div className="flex justify-between text-xs font-black text-slate-500 mb-1.5">
                <span>מסמכים שהועלו</span>
                <span className="tabular-nums">{documents.receivedCount} / {documents.totalCount}</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all duration-500"
                  style={{ width: `${documents.completionPercent}%` }}
                />
              </div>
              {allDone && (
                <p className="text-xs font-black text-emerald-600 mt-2">
                  🎉 כל המסמכים הועלו! נציג ייצור איתך קשר בהקדם.
                </p>
              )}
            </div>

            {/* Deadline */}
            {deadline && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
                <p className="text-xs font-black text-amber-700">
                  ⏰ נא להעלות את המסמכים עד: {formatDeadline(deadline)}
                </p>
              </div>
            )}
          </div>

          {/* ── Upload required documents ── */}
          {uploadableDocs.length > 0 && (
            <section>
              <h2 className="text-sm font-black text-slate-700 mb-3">מסמכים להעלאה</h2>
              <div className="space-y-3">
                {uploadableDocs.map((doc) => (
                  <DocUploadCard
                    key={doc.document_type}
                    doc={doc}
                    file={selectedFiles[doc.document_type] || null}
                    result={uploadResults[doc.document_type] || null}
                    uploading={Boolean(uploading[doc.document_type])}
                    onFileSelect={(f) => setSelectedFiles((p) => ({ ...p, [doc.document_type]: f }))}
                    onUpload={() => handleUpload(doc.document_type)}
                    onClear={() => setSelectedFiles((p) => { const n = { ...p }; delete n[doc.document_type]; return n; })}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Completed documents ── */}
          {completedDocs.length > 0 && (
            <section>
              <h2 className="text-sm font-black text-slate-400 mb-2">מסמכים שהועלו</h2>
              <div className="space-y-2">
                {completedDocs.map((doc) => (
                  <div key={doc.document_type} className="bg-white rounded-xl border border-emerald-100 px-4 py-3 flex items-center gap-3">
                    <span className="text-emerald-500 font-black shrink-0">✓</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-700">{doc.label}</p>
                      {doc.fileName && <p className="text-xs text-slate-400 truncate">{doc.fileName}</p>}
                    </div>
                    <span className="text-xs font-black text-emerald-600 shrink-0">
                      {doc.status === "approved" ? "אושר" : "התקבל"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Empty state ── */}
          {uploadableDocs.length === 0 && completedDocs.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
              <p className="text-3xl mb-3">📋</p>
              <p className="text-sm font-black text-slate-500">אין מסמכים להעלאה בשלב זה.</p>
              <p className="text-xs text-slate-400 mt-1">פנה ליועץ שלך לקבלת הנחיות.</p>
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 pb-4">
            FINZO PRO · מערכת מאובטחת להעלאת מסמכים
          </p>
        </div>
      </main>
    </>
  );
}
