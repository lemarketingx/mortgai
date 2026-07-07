/**
 * Regression tests for the QA-report security fixes (docs/QA_REPORT_2026-07-06.md).
 * Run with: node scripts/verify-qa-fixes.mjs
 *
 * Covers:
 *   F-1  Rate-limit buckets are isolated per endpoint scope (unit, real lib/rateLimit.js)
 *   F-3  Admin lead-notification email escapes user-controlled fields (unit, real lib/email.js)
 *
 * Optional integration checks against a locally running server (never run
 * against production; makes no external calls and sends no emails):
 *   BASE_URL=http://localhost:3100 node scripts/verify-qa-fixes.mjs
 *   F-1  Flooding /api/lead does not rate-limit admin login or forgot-password
 *   F-2  /api/advisor/forgot-password rate-limits after 5 requests
 *   F-4  /api/lead failure response contains no internal Supabase details
 */
import { register } from "node:module";

register("./esm-js-loader.mjs", import.meta.url);

let passed = 0;
let failed = 0;
function check(name, cond, extra = "") {
  if (cond) { passed += 1; console.log(`  ✓ ${name}`); }
  else { failed += 1; console.error(`  ✗ ${name}${extra ? ` — ${extra}` : ""}`); }
}

// ── F-1: per-scope rate-limit isolation (real lib/rateLimit.js) ───────────────
console.log("\n── F-1: rate-limit scope isolation ──");
{
  const { checkRateLimit, recordRateLimitHit, clearRateLimit } = await import("../lib/rateLimit.js");
  const ip = "203.0.113.77";
  const leadOpts = { scope: "lead", limit: 10, windowMs: 15 * 60 * 1000 };

  // Exhaust the lead scope
  for (let i = 0; i < 10; i++) await recordRateLimitHit(ip, leadOpts);
  check("lead scope blocked after 10 hits", (await checkRateLimit(ip, leadOpts)).allowed === false);

  // Every auth scope must still be open for the same IP
  for (const scope of ["admin-login", "advisor-login", "advisor-register", "advisor-reset-password", "advisor-forgot-password", "unlock"]) {
    check(`scope "${scope}" unaffected by lead flood`, (await checkRateLimit(ip, { scope, limit: 5 })).allowed === true);
  }

  // clearRateLimit only clears its own scope
  await recordRateLimitHit(ip, { scope: "admin-login", limit: 5 });
  await clearRateLimit(ip, { scope: "admin-login" });
  check("clearRateLimit(admin-login) does not clear lead scope", (await checkRateLimit(ip, leadOpts)).allowed === false);
  check("clearRateLimit(admin-login) resets admin-login scope", (await checkRateLimit(ip, { scope: "admin-login", limit: 5 })).remaining === 5);

  // Different IPs stay independent within a scope
  check("different IP not blocked in lead scope", (await checkRateLimit("198.51.100.9", leadOpts)).allowed === true);
  await clearRateLimit(ip, { scope: "lead" });
}

// ── F-3: HTML escaping in admin lead-notification email (real lib/email.js) ──
console.log("\n── F-3: email HTML escaping ──");
{
  const { escapeHtml, buildLeadNotificationEmailHtml } = await import("../lib/email.js");

  check("escapeHtml escapes <>&\"'", escapeHtml(`<a b="c">&'`) === "&lt;a b=&quot;c&quot;&gt;&amp;&#39;");

  const maliciousLead = {
    id: "lead_123",
    name: `<script>alert("xss")</script>`,
    phone: `<img src=x onerror=alert(1)>`,
    city: `"><iframe src=evil>`,
    purchaseStatus: `<b onmouseover=x>custom</b>`,
    propertyPrice: 2000000,
    equityAmount: 600000,
    monthlyIncome: 25000,
  };
  const html = buildLeadNotificationEmailHtml(maliciousLead);

  check("no raw <script> in email html", !html.includes("<script>"));
  check("no raw <img onerror> in email html", !html.includes("<img src=x"));
  check("no raw <iframe> in email html", !html.includes("<iframe"));
  check("no raw injected <b> tag in email html", !html.includes("<b onmouseover"));
  check("name is escaped, not dropped", html.includes("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"));
  check("city is escaped, not dropped", html.includes("&quot;&gt;&lt;iframe src=evil&gt;"));
  check("known purchaseStatus still maps to Hebrew label", buildLeadNotificationEmailHtml({ name: "א", phone: "0501", purchaseStatus: "refinance" }).includes("מחזור משכנתא"));
}

// ── Integration checks against a running local server (optional) ─────────────
const BASE_URL = String(process.env.BASE_URL || "").trim();
if (BASE_URL) {
  console.log(`\n── Integration checks against ${BASE_URL} ──`);
  const post = (path, body) =>
    fetch(BASE_URL + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  // F-1: flood the public lead endpoint to its 429.
  // F-4: capture a non-429 failure body from the flood — in a test env without
  // Supabase these are 500s, and that body must not leak internal details.
  let leadStatuses = [];
  let failureBody = "";
  for (let i = 0; i < 11; i++) {
    const r = await post("/api/lead", { lead: { name: "בדיקת בידוד", phone: "0501234567" } });
    leadStatuses.push(r.status);
    if (r.status !== 429 && !failureBody) failureBody = await r.text();
  }
  check("lead endpoint reaches 429 after flood", leadStatuses[10] === 429, `statuses: ${leadStatuses.join(",")}`);
  check("captured a pre-429 lead response body", failureBody.length > 0);
  check("lead failure response has no supabaseMessage/supabaseCode", !failureBody.includes("supabaseMessage") && !failureBody.includes("supabaseCode"));
  check("lead failure response has no env var names", !failureBody.includes("SUPABASE_URL") && !failureBody.includes("SERVICE_KEY"));

  // F-1: admin login must NOT be rate-limited by the lead flood (401 = reached password check)
  const adminRes = await post("/api/admin/login", { password: "wrong-password-for-isolation-test" });
  check("admin login not 429 after lead flood", adminRes.status !== 429, `got ${adminRes.status}`);

  // F-1: advisor login must NOT be rate-limited by the lead flood
  const advRes = await post("/api/advisor/login", { email: "isolation@test.local", password: "wrongwrong" });
  check("advisor login not 429 after lead flood", advRes.status !== 429, `got ${advRes.status}`);

  // F-2: forgot-password allows 5 then blocks the 6th; responses stay generic
  const fpStatuses = [];
  let fpBodyOk = true;
  for (let i = 0; i < 6; i++) {
    const r = await post("/api/advisor/forgot-password", { email: "isolation@test.local" });
    fpStatuses.push(r.status);
    if (r.status === 200) {
      const body = await r.json().catch(() => ({}));
      if (JSON.stringify(body) !== JSON.stringify({ ok: true })) fpBodyOk = false;
    }
  }
  check("forgot-password rate-limited on 6th request", fpStatuses[5] === 429, `statuses: ${fpStatuses.join(",")}`);
  check("forgot-password 200 responses stay generic ({ok:true})", fpBodyOk);

  // F-1: reset-password must NOT be rate-limited by the flood above
  const rpRes = await post("/api/advisor/reset-password", { accessToken: "x", password: "12345678" });
  check("reset-password not 429 after other floods", rpRes.status !== 429, `got ${rpRes.status}`);
} else {
  console.log("\n(i) BASE_URL not set — skipped server integration checks.");
  console.log("    Run: BASE_URL=http://localhost:3100 node scripts/verify-qa-fixes.mjs");
}

console.log(`\n──────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log("All QA-fix regression checks passed ✓");
