const TABLE = "lead_pricing_rules";
const BASE_PRICE = 149;

function getSupabaseUrl() {
  return String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
}
function getSupabaseServiceKey() {
  return String(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
}
function baseHeaders() {
  const key = getSupabaseServiceKey();
  return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
}
function endpoint(table, query = "") {
  const base = `${getSupabaseUrl()}/rest/v1/${table}`;
  return query ? `${base}?${query}` : base;
}
function hasConfig() {
  return Boolean(getSupabaseUrl()) && Boolean(getSupabaseServiceKey());
}

const HARDCODED_RULES = [
  { rule_name: "high_finzo_score", field: "finzoScore", operator: "gte", threshold: "80", adjustment: 100, label_he: "ציון FINZO גבוה", priority: 10 },
  { rule_name: "medium_finzo_score", field: "finzoScore", operator: "gte", threshold: "60", adjustment: 50, label_he: "ציון FINZO בינוני-גבוה", priority: 9 },
  { rule_name: "hot_quality", field: "computedQuality", operator: "eq", threshold: "חם", adjustment: 50, label_he: "ליד חם", priority: 8 },
  { rule_name: "signed_contract", field: "contractStatus", operator: "eq", threshold: "חוזה חתום", adjustment: 75, label_he: "חוזה חתום", priority: 7 },
  { rule_name: "docs_attached", field: "documentsCount", operator: "gte", threshold: "5", adjustment: 30, label_he: "מסמכים מצורפים", priority: 6 },
  { rule_name: "high_equity", field: "equityRatio", operator: "gte", threshold: "0.3", adjustment: 25, label_he: "הון עצמי 30%+", priority: 5 },
  { rule_name: "fresh_lead_24h", field: "daysSinceCreated", operator: "lte", threshold: "1", adjustment: 40, label_he: "ליד טרי (24 שעות)", priority: 4 },
  { rule_name: "fresh_lead_3d", field: "daysSinceCreated", operator: "lte", threshold: "3", adjustment: 20, label_he: "ליד חדש (3 ימים)", priority: 3 },
  { rule_name: "old_lead", field: "daysSinceCreated", operator: "gte", threshold: "14", adjustment: -30, label_he: "ליד ישן (מעל שבועיים)", priority: 2 },
];

let cachedRules = null;
let cacheExpiry = 0;
const CACHE_TTL = 60_000;

async function fetchRules() {
  const now = Date.now();
  if (cachedRules && now < cacheExpiry) return cachedRules;

  if (!hasConfig()) return HARDCODED_RULES;

  try {
    const res = await fetch(endpoint(TABLE, "is_active=eq.true&order=priority.desc"), {
      method: "GET", headers: baseHeaders(),
    });
    if (!res.ok) return HARDCODED_RULES;
    const rows = await res.json().catch(() => null);
    if (!Array.isArray(rows) || rows.length === 0) return HARDCODED_RULES;
    cachedRules = rows;
    cacheExpiry = now + CACHE_TTL;
    return rows;
  } catch {
    return HARDCODED_RULES;
  }
}

function getLeadField(lead, field) {
  if (field === "equityRatio") {
    const equity = Number(lead.equityAmount || lead.equity || 0);
    const propPrice = Number(lead.propertyPrice || lead.propertyValue || 0);
    return propPrice > 0 ? equity / propPrice : 0;
  }
  if (field === "daysSinceCreated") {
    return lead.createdAt ? Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86400000) : 999;
  }
  if (field === "finzoScore") return Number(lead.finzoScore || lead.score || 0);
  if (field === "computedQuality") return lead.computedQuality || lead.quality || "";
  if (field === "documentsCount") return Number(lead.documentsCount || 0);
  return lead[field] !== undefined ? lead[field] : "";
}

function evaluateRule(rule, lead) {
  const value = getLeadField(lead, rule.field);
  const threshold = rule.threshold;

  switch (rule.operator) {
    case "gte": return Number(value) >= Number(threshold);
    case "lte": return Number(value) <= Number(threshold);
    case "gt":  return Number(value) > Number(threshold);
    case "lt":  return Number(value) < Number(threshold);
    case "eq":  return String(value) === String(threshold);
    case "neq": return String(value) !== String(threshold);
    default:    return false;
  }
}

export async function calculateLeadPrice(lead) {
  const rules = await fetchRules();
  let price = BASE_PRICE;
  const factors = [];
  const applied = new Set();

  const sorted = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  for (const rule of sorted) {
    if (rule.field === "finzoScore" && applied.has("finzoScore")) continue;
    if (rule.field === "daysSinceCreated" && applied.has("daysSinceCreated")) continue;

    if (evaluateRule(rule, lead)) {
      price += rule.adjustment;
      factors.push({ label: rule.label_he, adjustment: rule.adjustment });
      applied.add(rule.field);
    }
  }

  price = Math.max(99, Math.min(499, price));
  const score = Number(lead.finzoScore || lead.score || 0);
  return { price, basePrice: BASE_PRICE, factors, score };
}

export function calculateLeadPriceSync(lead) {
  let price = BASE_PRICE;
  const factors = [];
  const applied = new Set();

  const sorted = [...HARDCODED_RULES].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  for (const rule of sorted) {
    if (rule.field === "finzoScore" && applied.has("finzoScore")) continue;
    if (rule.field === "daysSinceCreated" && applied.has("daysSinceCreated")) continue;

    if (evaluateRule(rule, lead)) {
      price += rule.adjustment;
      factors.push({ label: rule.label_he, adjustment: rule.adjustment });
      applied.add(rule.field);
    }
  }

  price = Math.max(99, Math.min(499, price));
  const score = Number(lead.finzoScore || lead.score || 0);
  return { price, basePrice: BASE_PRICE, factors, score };
}

export function getPriceLabel(price) {
  if (price >= 350) return "פרימיום";
  if (price >= 250) return "מתקדם";
  if (price >= 150) return "סטנדרט";
  return "בסיסי";
}
