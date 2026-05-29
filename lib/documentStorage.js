/**
 * Supabase Storage helpers for mortgage document files.
 *
 * Bucket: mortgage-documents  (PRIVATE — create manually in Supabase dashboard)
 * Path convention (relative to bucket, NO leading slash, NO bucket prefix):
 *   lead_{leadId}/{documentType}/{timestamp}_{sanitizedFilename}
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
 * Sanitize a filename for safe Supabase Storage object keys.
 *
 * Rules:
 *   - Extract the extension (last dot-segment, lowercase)
 *   - Strip extension from the base name
 *   - Replace all non-alphanumeric chars in base with underscore
 *   - Collapse runs of underscores to a single underscore
 *   - Trim leading/trailing underscores from base
 *   - Prefix with timestamp
 *   - Truncate base to 60 chars
 *
 * Examples:
 *   "WhatsApp Image 2026-05-04 at 10.03.49.jpeg"  →  "1234_WhatsApp_Image_2026-05-04_at_10_03_49.jpeg"
 *   "מסמך זהות.pdf"                               →  "1234___.pdf"  (Hebrew → underscores)
 */
function sanitizeFilename(rawName) {
  const name = String(rawName || "file");

  // Split off the file extension (last .xxx, max 5 chars)
  const extMatch = name.match(/\.([a-zA-Z0-9]{1,5})$/);
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : "";
  const basePart = extMatch ? name.slice(0, name.lastIndexOf(extMatch[0])) : name;

  // Sanitize base: keep only alphanumeric, dash, underscore; collapse everything else to "_"
  const safeBase = basePart
    .replace(/[^a-zA-Z0-9-]/g, "_")   // non-safe chars → _
    .replace(/_+/g, "_")              // collapse repeated underscores
    .replace(/^_+|_+$/g, "")         // trim edge underscores
    .slice(0, 60)                     // max 60 chars for base
    || "file";

  return `${safeBase}${ext}`;
}

/**
 * Normalize a stored storage path so it is always bucket-relative with no
 * leading slash and no bucket-name prefix. Handles bad rows from older code.
 *
 * Correct:   lead_abc/id_card/123_file.jpeg
 * Fixed:     mortgage-documents/lead_abc/id_card/123_file.jpeg  →  lead_abc/id_card/123_file.jpeg
 * Fixed:     /lead_abc/id_card/123_file.jpeg                    →  lead_abc/id_card/123_file.jpeg
 */
export function normalizeStoragePath(rawPath) {
  let path = String(rawPath || "").trim();
  // Strip bucket-name prefix if present
  const bucketPrefix = `${STORAGE_BUCKET}/`;
  if (path.startsWith(bucketPrefix)) {
    path = path.slice(bucketPrefix.length);
  }
  // Strip leading slash
  path = path.replace(/^\/+/, "");
  return path;
}

/** Build the storage path for a document upload (bucket-relative, no prefix). */
export function buildStoragePath(leadId, documentType, fileName) {
  const ts = Date.now();
  const safe = sanitizeFilename(fileName);
  // documentType is already normalized (e.g. "id_card") — no extra sanitization needed
  return `lead_${leadId}/${documentType}/${ts}_${safe}`;
}

/**
 * Upload a Buffer to Supabase Storage.
 * Returns the storage path string (bucket-relative) on success, null on failure.
 */
export async function uploadToStorage(leadId, documentType, fileName, fileBuffer, mimeType) {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceKey();
  if (!url || !key) {
    console.warn("[documentStorage] uploadToStorage: Supabase config missing");
    return null;
  }

  const storagePath = buildStoragePath(leadId, documentType, fileName);

  console.log("[documentStorage] upload.start", {
    bucket: STORAGE_BUCKET,
    storagePath,
    fileName,
    mimeType,
    bytes: fileBuffer.length,
  });

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
      console.warn("[documentStorage] upload.failed", {
        status: res.status,
        bucket: STORAGE_BUCKET,
        storagePath,
        error: text.slice(0, 300),
      });
      return null;
    }
    console.log("[documentStorage] upload.success", { bucket: STORAGE_BUCKET, storagePath });
    return storagePath;
  } catch (err) {
    console.warn("[documentStorage] upload.error", { message: err?.message, storagePath });
    return null;
  }
}

/**
 * Convert a Supabase Storage signed URL (which may be relative) to an
 * absolute URL that includes the required /storage/v1 prefix.
 *
 * Supabase REST API returns signedURL as a relative path like:
 *   /object/sign/<bucket>/<path>?token=...
 *
 * It must be served as:
 *   https://<project>.supabase.co/storage/v1/object/sign/<bucket>/<path>?token=...
 *
 * @param {string} signedUrl  Value from Supabase API response
 * @param {string} baseUrl    Supabase project URL (e.g. https://xxx.supabase.co)
 */
function toAbsoluteStorageSignedUrl(signedUrl, baseUrl) {
  if (!signedUrl) return "";
  // Already absolute — return as-is (Supabase SDK occasionally returns full URLs)
  if (/^https?:\/\//i.test(signedUrl)) return signedUrl;

  const cleanBase = String(baseUrl || "").replace(/\/+$/, "");

  // Already has the full storage prefix
  if (signedUrl.startsWith("/storage/v1/")) {
    return `${cleanBase}${signedUrl}`;
  }

  // Missing /storage/v1 — the most common Supabase REST API format
  if (signedUrl.startsWith("/object/")) {
    return `${cleanBase}/storage/v1${signedUrl}`;
  }

  // No leading slash
  if (signedUrl.startsWith("object/")) {
    return `${cleanBase}/storage/v1/${signedUrl}`;
  }

  // Fallback: prepend full prefix
  return `${cleanBase}/storage/v1/${signedUrl.replace(/^\/+/, "")}`;
}

/**
 * Get a time-limited signed URL for a stored file.
 *
 * @param {string} rawStoragePath  Value from DB (may have bucket prefix or leading slash — normalized automatically)
 * @param {number} expiresIn       Seconds until expiry (default 1 hour)
 * @returns {Promise<string|null>} Absolute signed URL, or null on failure
 */
export async function getSignedUrl(rawStoragePath, expiresIn = 3600) {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceKey();
  if (!url || !key) {
    console.warn("[documentStorage] getSignedUrl: Supabase config missing");
    return null;
  }
  if (!rawStoragePath) {
    console.warn("[documentStorage] getSignedUrl: empty storagePath");
    return null;
  }

  // Always normalize to strip any accidental bucket prefix or leading slash
  const storagePath = normalizeStoragePath(rawStoragePath);

  if (!storagePath) {
    console.warn("[documentStorage] getSignedUrl: storagePath empty after normalization", { rawStoragePath });
    return null;
  }

  console.log("[documentStorage] getSignedUrl.request", {
    bucket: STORAGE_BUCKET,
    storagePath,
    rawStoragePath: rawStoragePath !== storagePath ? rawStoragePath : "(same)",
  });

  try {
    const res = await fetch(
      storageEndpoint(`object/sign/${STORAGE_BUCKET}/${storagePath}`),
      {
        method: "POST",
        headers: storageHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ expiresIn }),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn("[documentStorage] getSignedUrl.failed", {
        status: res.status,
        bucket: STORAGE_BUCKET,
        storagePath,
        supabaseError: errText.slice(0, 300),
      });
      return null;
    }

    const data = await res.json().catch(() => null);
    const rawSigned = data?.signedURL || data?.signedUrl || "";
    if (!rawSigned) {
      console.warn("[documentStorage] getSignedUrl.no_signed_url", {
        bucket: STORAGE_BUCKET,
        storagePath,
        dataKeys: data ? Object.keys(data) : [],
      });
      return null;
    }

    const finalUrl = toAbsoluteStorageSignedUrl(rawSigned, url);

    console.log("[documentStorage] getSignedUrl.success", {
      bucket: STORAGE_BUCKET,
      storagePath,
      rawPrefix: rawSigned.slice(0, 40),
      finalPrefix: finalUrl.slice(0, 60),
    });
    return finalUrl;
  } catch (err) {
    console.warn("[documentStorage] getSignedUrl.error", { message: err?.message, storagePath });
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
