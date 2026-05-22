/**
 * Supabase Storage helpers for mortgage document files.
 *
 * Bucket: mortgage-documents  (PRIVATE — create manually in Supabase dashboard)
 * Path:   lead_{leadId}/{documentType}/{timestamp}_{sanitizedFilename}
 *
 * All operations use the service role key — never called from client JS.
 */

const STORAGE_BUCKET = "mortgage-documents";

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function getSupabaseUrl() {
  return String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
}
function getSupabaseServiceKey() {
  return String(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
}
function storageEndpoint(path) {
  return `${getSupabaseUrl()}/storage/v1/${path}`;
}
function storageHeaders(extra = {}) {
  const key = getSupabaseServiceKey();
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

/**
 * Sanitize a filename: keep alphanumeric, dots, hyphens, underscores.
 * Truncates to 100 chars.
 */
function sanitizeFilename(name) {
  return String(name || "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
}

/** Build the storage path for a document upload. */
export function buildStoragePath(leadId, documentType, fileName) {
  const ts = Date.now();
  const safe = sanitizeFilename(fileName);
  return `lead_${leadId}/${documentType}/${ts}_${safe}`;
}

/**
 * Upload a Buffer to Supabase Storage.
 * Returns the storage path string on success, null on failure.
 */
export async function uploadToStorage(leadId, documentType, fileName, fileBuffer, mimeType) {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceKey();
  if (!url || !key) return null;

  const storagePath = buildStoragePath(leadId, documentType, fileName);

  try {
    const res = await fetch(
      storageEndpoint(`object/${STORAGE_BUCKET}/${storagePath}`),
      {
        method: "POST",
        headers: storageHeaders({ "Content-Type": mimeType, "x-upsert": "true" }),
        body: fileBuffer,
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn("[documentStorage] upload failed", res.status, text.slice(0, 200));
      return null;
    }
    return storagePath;
  } catch (err) {
    console.warn("[documentStorage] upload error", err?.message);
    return null;
  }
}

/**
 * Get a time-limited signed URL for an uploaded file.
 * Returns the full URL string, or null on failure.
 * @param {string} storagePath
 * @param {number} expiresIn  seconds (default 1 hour)
 */
export async function getSignedUrl(storagePath, expiresIn = 3600) {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceKey();
  if (!url || !key || !storagePath) return null;

  try {
    const res = await fetch(
      storageEndpoint(`object/sign/${STORAGE_BUCKET}/${storagePath}`),
      {
        method: "POST",
        headers: storageHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ expiresIn }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data?.signedURL) return null;
    // signedURL may be relative — make absolute
    return data.signedURL.startsWith("http") ? data.signedURL : `${url}${data.signedURL}`;
  } catch {
    return null;
  }
}

/**
 * Validate a file before upload.
 * Returns null if valid, or { code, message } if invalid.
 */
export function validateFile(mimeType, fileSizeBytes) {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return { code: "INVALID_FILE_TYPE", message: "סוג הקובץ אינו נתמך. יש להעלות PDF, JPG או PNG." };
  }
  if (Number(fileSizeBytes) > MAX_FILE_SIZE_BYTES) {
    return { code: "FILE_TOO_LARGE", message: "הקובץ גדול מדי. גודל מקסימלי: 10MB." };
  }
  return null;
}
