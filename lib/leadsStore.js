import { randomUUID } from "crypto";

// ─── Supabase config ──────────────────────────────────────────────────────────
// Required environment variables:
//   SUPABASE_URL          — e.g. https://xyzxyz.supabase.co
//   SUPABASE_SERVICE_KEY  — service_role key (Settings → API → service_role)
//                           Never expose this key to the browser.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TABLE = "leads";

function assertConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error(
      "Missing Supabase config. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in your environment variables.",
    );
  }
}

function endpoint(query = "") {
  const base = `${SUPABASE_URL}/rest/v1/${TABLE}`;
  return query ? `${base}?${query}` : base;
}

function baseHeaders() {
  return {
    "Content-Type": "application/json",
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
  };
}

// ─── Field mapping (camelCase app ↔ snake_case DB) ───────────────────────────

function toRow(record) {
  return {
    id:                   record.id,
    created_at:           record.createdAt,
    last_updated:         record.lastUpdated,
    name:                 record.name,
    phone:                record.phone,
    city:                 record.city,
    mortgage_amount:      record.mortgageAmount,
    purchase_status:      record.purchaseStatus,
    approval_score:       record.approvalScore,
    main_issue:           record.mainIssue,
    source:               record.source,
    status:               record.status,
    assigned_advisor:     record.assignedAdvisor,
    advisor_phone:        record.advisorPhone,
    expected_commission:  record.expectedCommission,
    actual_commission:    record.actualCommission,
    commission_status:    record.commissionStatus,
    commission_agreement: record.commissionAgreement,
    notes:                record.notes,
  };
}

function fromRow(row) {
  return {
    id:                   row.id,
    createdAt:            row.created_at,
    lastUpdated:          row.last_updated,
    name:                 row.name,
    phone:                row.phone,
    city:                 row.city,
    mortgageAmount:       row.mortgage_amount,
    purchaseStatus:       row.purchase_status,
    approvalScore:        row.approval_score,
    mainIssue:            row.main_issue,
    source:               row.source,
    status:               row.status,
    assignedAdvisor:      row.assigned_advisor,
    advisorPhone:         row.advisor_phone,
    expectedCommission:   row.expected_commission,
    actualCommission:     row.actual_commission,
    commissionStatus:     row.commission_status,
    commissionAgreement:  row.commission_agreement,
    notes:                row.notes,
  };
}

// Maps only the camelCase keys that are present in `changes` to snake_case.
// This is used for PATCH — we only send the columns that actually changed.
const ALLOWED_CHANGES_MAP = {
  status:               "status",
  assignedAdvisor:      "assigned_advisor",
  advisorPhone:         "advisor_phone",
  expectedCommission:   "expected_commission",
  actualCommission:     "actual_commission",
  commissionStatus:     "commission_status",
  commissionAgreement:  "commission_agreement",
  notes:                "notes",
};

function toPartialRow(changes) {
  const patch = { last_updated: new Date().toISOString() };
  for (const [camel, snake] of Object.entries(ALLOWED_CHANGES_MAP)) {
    if (Object.prototype.hasOwnProperty.call(changes, camel)) {
      patch[snake] = changes[camel];
    }
  }
  return patch;
}

// ─── Exported constants ───────────────────────────────────────────────────────

export const LEAD_STATUSES = [
  "חדש",
  "נשלח ליועץ",
  "בטיפול",
  "אושר עקרונית",
  "נסגר",
  "לא רלוונטי",
];

export const COMMISSION_STATUSES = ["pending", "invoiced", "paid"];

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function readLeads() {
  assertConfig();
  const res = await fetch(endpoint("order=created_at.desc"), {
    method: "GET",
    headers: baseHeaders(),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Supabase readLeads ${res.status}: ${body}`);
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows.map(fromRow) : [];
}

export async function createLead(payload = {}) {
  assertConfig();
  const now = new Date().toISOString();
  const lead = payload.lead || payload;
  const analysis = payload.analysis || {};

  const record = {
    id:                   randomUUID(),
    createdAt:            lead.createdAt || now,
    lastUpdated:          now,
    name:                 lead.name || "",
    phone:                lead.phone || "",
    city:                 lead.city || "",
    mortgageAmount:       Number(lead.mortgageAmount || lead.mortgage || analysis.mortgage || 0),
    purchaseStatus:       lead.purchaseStatus || "",
    approvalScore:        Number(lead.approval || analysis.approval || 0),
    mainIssue:            lead.mainIssue || analysis.mainIssue || "",
    source:               lead.source || "mortgai2",
    status:               "חדש",
    assignedAdvisor:      "",
    advisorPhone:         "",
    expectedCommission:   "",
    actualCommission:     "",
    commissionStatus:     "pending",
    commissionAgreement:  "",
    notes:                "",
  };

  const res = await fetch(endpoint(), {
    method: "POST",
    headers: { ...baseHeaders(), "Prefer": "return=representation" },
    body: JSON.stringify(toRow(record)),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Supabase createLead ${res.status}: ${body}`);
  }
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0 ? fromRow(rows[0]) : record;
}

export async function updateLead(id, changes = {}) {
  assertConfig();
  const patch = toPartialRow(changes);

  const res = await fetch(endpoint(`id=eq.${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: { ...baseHeaders(), "Prefer": "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Supabase updateLead ${res.status}: ${body}`);
  }
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0 ? fromRow(rows[0]) : null;
}

// ─── Auth (unchanged — uses env var, not DB) ──────────────────────────────────

export function isAdminPassword(value) {
  const expected = String(process.env.ADMIN_PASSWORD || "").trim();
  const submitted = String(value || "").trim();
  return Boolean(expected && submitted === expected);
}
