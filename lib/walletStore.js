// Advisor wallet and marketplace pricing operations

function getUrl() {
  return String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
}
function getKey() {
  return String(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
}
function baseHeaders() {
  const k = getKey();
  return { "Content-Type": "application/json", apikey: k, Authorization: `Bearer ${k}` };
}
function ep(table, query = "") {
  const base = `${getUrl()}/rest/v1/${table}`;
  return query ? `${base}?${query}` : base;
}

// ── Wallet ─────────────────────────────────────────────────────────────────────

export async function getAdvisorWallet(advisorId) {
  const url = ep("advisor_wallets", `advisor_id=eq.${encodeURIComponent(advisorId)}&select=balance`);
  try {
    const res = await fetch(url, { method: "GET", headers: baseHeaders() });
    if (!res.ok) return { advisorId, balance: 0 };
    const rows = await res.json().catch(() => []);
    const balance = Array.isArray(rows) && rows.length > 0 ? Number(rows[0].balance) || 0 : 0;
    return { advisorId, balance };
  } catch {
    return { advisorId, balance: 0 };
  }
}

// Atomic deduction via Supabase RPC (stored procedure with FOR UPDATE row lock)
export async function deductWalletBalance(advisorId, amount) {
  const url = `${getUrl()}/rest/v1/rpc/deduct_wallet_balance`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ p_advisor_id: advisorId, p_amount: Number(amount) }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[wallet] deductWalletBalance error", res.status, body);
      return { success: false, newBalance: 0 };
    }
    const rows = await res.json().catch(() => []);
    const row = Array.isArray(rows) ? rows[0] : rows;
    return { success: Boolean(row?.success), newBalance: Number(row?.new_balance) || 0 };
  } catch (err) {
    console.error("[wallet] deductWalletBalance fetch failed", err?.message);
    return { success: false, newBalance: 0 };
  }
}

export async function topUpWallet(advisorId, amount) {
  const url = `${getUrl()}/rest/v1/rpc/top_up_wallet`;
  const res = await fetch(url, {
    method: "POST",
    headers: baseHeaders(),
    body: JSON.stringify({ p_advisor_id: advisorId, p_amount: Number(amount) }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`topUpWallet ${res.status}: ${body}`);
  }
  const rows = await res.json().catch(() => []);
  const row = Array.isArray(rows) ? rows[0] : rows;
  return { newBalance: Number(row?.new_balance) || 0 };
}

export async function getAllAdvisorWallets() {
  const url = ep("advisor_wallets", "select=advisor_id,balance,updated_at&order=balance.desc");
  try {
    const res = await fetch(url, { method: "GET", headers: baseHeaders() });
    if (!res.ok) return [];
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

// ── Pricing config ─────────────────────────────────────────────────────────────

const DEFAULT_PRICING = { "חם": 250, "בינוני": 150, "חלש": 75 };

export async function getPricingConfig() {
  try {
    const url = ep("lead_pricing_config", "select=quality,price_ils");
    const res = await fetch(url, { method: "GET", headers: baseHeaders() });
    if (!res.ok) return { ...DEFAULT_PRICING };
    const rows = await res.json().catch(() => []);
    if (!Array.isArray(rows) || rows.length === 0) return { ...DEFAULT_PRICING };
    const config = { ...DEFAULT_PRICING };
    for (const row of rows) {
      if (row.quality) config[row.quality] = Number(row.price_ils) || 0;
    }
    return config;
  } catch {
    return { ...DEFAULT_PRICING };
  }
}

export async function updatePricingConfig(updates) {
  // updates: Array<{ quality: string, price_ils: number }>
  const results = [];
  for (const { quality, price_ils } of updates) {
    const url = ep("lead_pricing_config", `quality=eq.${encodeURIComponent(quality)}`);
    const res = await fetch(url, {
      method: "PATCH",
      headers: { ...baseHeaders(), Prefer: "return=representation" },
      body: JSON.stringify({ price_ils: Number(price_ils), updated_at: new Date().toISOString() }),
    });
    const rows = await res.json().catch(() => []);
    results.push(Array.isArray(rows) ? rows[0] : rows);
  }
  return results;
}

export function getLeadPrice(leadQuality, pricingConfig) {
  const config = pricingConfig || DEFAULT_PRICING;
  return Number(config[leadQuality]) || 0;
}
