// Rate limiter with two interchangeable backends, keyed by `${scope}:${ip}` so
// flooding one endpoint (e.g. the public lead form) never locks out another
// (e.g. admin login). See docs/QA_REPORT_2026-07-06.md (F-1).
//
//  1. Distributed (Upstash Redis REST) — used automatically when both
//     UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set. Counters are
//     shared across every serverless instance, which is what actually enforces
//     the limit on Vercel (fixes F-5). No npm dependency — plain fetch to the
//     Upstash REST API.
//  2. In-memory fallback — used when Redis is not configured (local dev, or a
//     deploy without the env vars). Per-instance only, best-effort.
//
// All functions are async. Callers must `await` them. If a Redis call fails we
// fall back to the in-memory path (fail-open) so a Redis outage never blocks
// legitimate traffic.

const buckets = globalThis.__mortgai2RateLimitBuckets || new Map();
globalThis.__mortgai2RateLimitBuckets = buckets;

const DEFAULT_SCOPE = "global";
const DEFAULT_LIMIT = 5;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

function bucketKey(ip, scope) {
  return `${scope || DEFAULT_SCOPE}:${ip}`;
}

function redisConfig() {
  const url = String(process.env.UPSTASH_REDIS_REST_URL || "").trim().replace(/\/$/, "");
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
  return url && token ? { url, token } : null;
}

async function redisPipeline(cfg, commands) {
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  return res.json(); // -> [{ result }, ...] (or { error }) per command
}

export function getClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "");
  return forwarded.split(",")[0].trim()
    || String(req.headers["x-real-ip"] || "").trim()
    || req.socket?.remoteAddress
    || "unknown";
}

// Read-only: how many hits are already recorded for this key. Never mutates.
export async function checkRateLimit(ip, options = {}) {
  const limit = options.limit || DEFAULT_LIMIT;
  const windowMs = options.windowMs || DEFAULT_WINDOW_MS;
  const key = bucketKey(ip, options.scope);
  const now = Date.now();

  const cfg = redisConfig();
  if (cfg) {
    try {
      const rkey = `rl:${key}`;
      const [get, pttl] = await redisPipeline(cfg, [["GET", rkey], ["PTTL", rkey]]);
      const count = Number(get?.result) || 0;
      const ttl = Number(pttl?.result);
      const resetAt = ttl > 0 ? now + ttl : now + windowMs;
      return { allowed: count < limit, remaining: Math.max(0, limit - count), resetAt };
    } catch {
      // Fall through to in-memory on any Redis error (fail-open).
    }
  }

  const entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    return { allowed: true, remaining: limit, resetAt: now + windowMs };
  }
  return { allowed: entry.count < limit, remaining: Math.max(0, limit - entry.count), resetAt: entry.resetAt };
}

// Records one hit against this key and returns the post-increment state.
export async function recordRateLimitHit(ip, options = {}) {
  const limit = options.limit || DEFAULT_LIMIT;
  const windowMs = options.windowMs || DEFAULT_WINDOW_MS;
  const key = bucketKey(ip, options.scope);
  const now = Date.now();

  const cfg = redisConfig();
  if (cfg) {
    try {
      const rkey = `rl:${key}`;
      // INCR then set the fixed-window TTL only on the first hit (NX), atomically.
      const [incr] = await redisPipeline(cfg, [
        ["INCR", rkey],
        ["PEXPIRE", rkey, String(windowMs), "NX"],
      ]);
      const count = Number(incr?.result) || 1;
      return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetAt: now + windowMs, count };
    } catch {
      // Fall through to in-memory on any Redis error.
    }
  }

  let entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    buckets.set(key, entry);
  }
  entry.count += 1;
  return { allowed: entry.count <= limit, remaining: Math.max(0, limit - entry.count), resetAt: entry.resetAt, count: entry.count };
}

export async function clearRateLimit(ip, options = {}) {
  const key = bucketKey(ip, options.scope);
  const cfg = redisConfig();
  if (cfg) {
    try { await redisPipeline(cfg, [["DEL", `rl:${key}`]]); } catch { /* ignore */ }
  }
  buckets.delete(key);
}
