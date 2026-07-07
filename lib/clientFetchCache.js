// In-memory stale-while-revalidate cache for advisor-portal GET endpoints.
//
// Module state survives Next.js client-side navigation, so moving between
// portal screens renders the last-known data instantly while a background
// fetch refreshes it. Nothing is written to localStorage/sessionStorage —
// lead PII stays in memory and disappears on full page reload or tab close.

const cache = new Map(); // url -> { data, at }

const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;

export function getCachedJson(url, maxAgeMs = DEFAULT_MAX_AGE_MS) {
  const entry = cache.get(url);
  if (!entry) return null;
  if (Date.now() - entry.at > maxAgeMs) {
    cache.delete(url);
    return null;
  }
  return entry.data;
}

export function setCachedJson(url, data) {
  cache.set(url, { data, at: Date.now() });
}

// Drop every cached entry whose URL starts with `prefix` (all entries when
// omitted). Call after a mutation so the next screen shows fresh data.
export function invalidateCache(prefix = "") {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
