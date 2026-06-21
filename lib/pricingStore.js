import { LeadStoreError } from "./leadsStore";

const TABLE = "advisor_pricing_profiles";

function getSupabaseUrl() {
  return String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
}

function getSupabaseServiceKey() {
  return String(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
}

function assertConfig() {
  if (!getSupabaseUrl() || !getSupabaseServiceKey()) {
    throw new LeadStoreError("SUPABASE_ENV_MISSING", "Missing Supabase config");
  }
}

function headers() {
  const key = getSupabaseServiceKey();
  return {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

function endpoint(query = "") {
  const base = `${getSupabaseUrl()}/rest/v1/${TABLE}`;
  return query ? `${base}?${query}` : base;
}

export const PRICING_MODELS = ["fixed", "percent", "hybrid", "by_lead_type"];

function fromRow(row) {
  return {
    id: row.id,
    advisorId: row.advisor_id,
    pricingModel: row.pricing_model,
    fixedFee: row.fixed_fee,
    percentFee: row.percent_fee,
    hybridBaseFee: row.hybrid_base_fee,
    hybridPercentFee: row.hybrid_percent_fee,
    leadTypeRules: row.lead_type_rules || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function readPricingProfile(advisorId) {
  assertConfig();
  const url = endpoint(`advisor_id=eq.${encodeURIComponent(advisorId)}&limit=1`);
  const res = await fetch(url, { method: "GET", headers: headers() });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 400 && body.includes("does not exist")) return null;
    throw new LeadStoreError("SUPABASE_READ_FAILED", `readPricingProfile ${res.status}`, body);
  }
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return fromRow(rows[0]);
}

export async function upsertPricingProfile(advisorId, data) {
  assertConfig();
  const now = new Date().toISOString();
  const row = {
    advisor_id: advisorId,
    pricing_model: data.pricingModel,
    fixed_fee: Number(data.fixedFee) || 0,
    percent_fee: Number(data.percentFee) || 0,
    hybrid_base_fee: Number(data.hybridBaseFee) || 0,
    hybrid_percent_fee: Number(data.hybridPercentFee) || 0,
    lead_type_rules: data.leadTypeRules || {},
    updated_at: now,
  };

  const existing = await readPricingProfile(advisorId);
  if (existing) {
    const url = endpoint(`advisor_id=eq.${encodeURIComponent(advisorId)}`);
    const res = await fetch(url, {
      method: "PATCH",
      headers: { ...headers(), Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new LeadStoreError("SUPABASE_UPDATE_FAILED", `upsertPricingProfile PATCH ${res.status}`, body);
    }
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0 ? fromRow(rows[0]) : null;
  }

  row.created_at = now;
  const res = await fetch(endpoint(), {
    method: "POST",
    headers: { ...headers(), Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new LeadStoreError("SUPABASE_CREATE_FAILED", `upsertPricingProfile POST ${res.status}`, body);
  }
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0 ? fromRow(rows[0]) : null;
}

export function calculateCommission(profile, lead) {
  if (!profile || !profile.pricingModel) return null;

  const loanAmount = Number(lead.mortgageAmount || 0);
  const leadType = lead.mortgageType || lead.purchaseStatus || "default";

  switch (profile.pricingModel) {
    case "fixed":
      return profile.fixedFee || 0;

    case "percent":
      return loanAmount * (profile.percentFee / 100);

    case "hybrid":
      return (profile.hybridBaseFee || 0) + loanAmount * ((profile.hybridPercentFee || 0) / 100);

    case "by_lead_type": {
      const rules = profile.leadTypeRules || {};
      const rule = rules[leadType] || rules["default"];
      if (rule !== undefined && rule !== null) return Number(rule) || 0;
      return null;
    }

    default:
      return null;
  }
}
