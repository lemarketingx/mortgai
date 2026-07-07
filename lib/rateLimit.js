// In-memory rate limiter, keyed by `${scope}:${ip}` so each endpoint gets an
// isolated counter — flooding one endpoint (e.g. the public lead form) must
// never lock out another (e.g. admin login). See docs/QA_REPORT_2026-07-06.md (F-1).
//
// TODO(production-scale): counters live in the memory of a single serverless
// instance, so on Vercel each instance enforces the limit independently. Good
// enough as a first line of defense, but a distributed rate limiter (e.g.
// Upstash Redis or Vercel WAF rules) is required before high-volume paid
// campaigns. Do not add that dependency without an approved config.
const buckets = globalThis.__mortgai2RateLimitBuckets || new Map();
globalThis.__mortgai2RateLimitBuckets = buckets;

const DEFAULT_SCOPE = "global";
const DEFAULT_LIMIT = 5;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

function bucketKey(ip, scope) {
  return `${scope || DEFAULT_SCOPE}:${ip}`;
}

export function getClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "");
  return forwarded.split(",")[0].trim()
    || String(req.headers["x-real-ip"] || "").trim()
    || req.socket?.remoteAddress
    || "unknown";
}

export function checkRateLimit(ip, options = {}) {
  const limit = options.limit || DEFAULT_LIMIT;
  const windowMs = options.windowMs || DEFAULT_WINDOW_MS;
  const key = bucketKey(ip, options.scope);
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    const next = { count: 0, resetAt: now + windowMs };
    buckets.set(key, next);
    return { allowed: true, remaining: limit, resetAt: next.resetAt };
  }

  const remaining = Math.max(0, limit - entry.count);
  return { allowed: entry.count < limit, remaining, resetAt: entry.resetAt };
}

export function recordRateLimitHit(ip, options = {}) {
  const current = checkRateLimit(ip, options);
  const entry = buckets.get(bucketKey(ip, options.scope));
  entry.count += 1;
  return { ...current, remaining: Math.max(0, current.remaining - 1), count: entry.count };
}

export function clearRateLimit(ip, options = {}) {
  buckets.delete(bucketKey(ip, options.scope));
}
