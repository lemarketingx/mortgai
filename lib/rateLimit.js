const buckets = globalThis.__mortgai2RateLimitBuckets || new Map();
globalThis.__mortgai2RateLimitBuckets = buckets;

export function getClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "");
  return forwarded.split(",")[0].trim()
    || String(req.headers["x-real-ip"] || "").trim()
    || req.socket?.remoteAddress
    || "unknown";
}

export function checkRateLimit(ip, options = {}) {
  const limit = options.limit || 5;
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const now = Date.now();
  const entry = buckets.get(ip);

  if (!entry || entry.resetAt <= now) {
    const next = { count: 0, resetAt: now + windowMs };
    buckets.set(ip, next);
    return { allowed: true, remaining: limit, resetAt: next.resetAt };
  }

  const remaining = Math.max(0, limit - entry.count);
  return { allowed: entry.count < limit, remaining, resetAt: entry.resetAt };
}

export function recordRateLimitHit(ip) {
  const current = checkRateLimit(ip);
  const entry = buckets.get(ip);
  entry.count += 1;
  return { ...current, remaining: Math.max(0, current.remaining - 1), count: entry.count };
}

export function clearRateLimit(ip) {
  buckets.delete(ip);
}
