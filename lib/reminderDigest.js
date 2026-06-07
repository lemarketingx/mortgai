/**
 * Pure logic for the FINZO advisor reminder digest.
 *
 * Kept side-effect free and easy to unit test — all I/O (reading leads,
 * sending email) lives in pages/api/cron/reminders.js.
 *
 * Categories surfaced to an advisor:
 *   1. unhandledNew   — purchased leads still in "new_lead" with no first contact
 *   2. followUpDue    — leads whose follow_up_date has arrived/passed
 *   3. missingDocs    — leads with outstanding required documents
 *   4. stale          — open cases with no activity for a while
 */

export const DEFAULT_THRESHOLDS = {
  unhandledHours: 24,
  staleDays: 7,
};

const CLOSED_STAGES = new Set(["closed_won", "closed_lost"]);

function hoursSince(isoDate, now) {
  if (!isoDate) return Infinity;
  const t = new Date(isoDate).getTime();
  if (!Number.isFinite(t)) return Infinity;
  return (now - t) / 3_600_000;
}

function isClosed(lead) {
  return CLOSED_STAGES.has(String(lead?.pipelineStage || lead?.leadStatus || ""));
}

/** Purchased leads sitting in "new_lead" with no recorded first contact for too long. */
export function selectUnhandledNewLeads(leads = [], { now = Date.now(), unhandledHours = DEFAULT_THRESHOLDS.unhandledHours } = {}) {
  return leads.filter((lead) => {
    if (isClosed(lead)) return false;
    if (String(lead.pipelineStage || lead.leadStatus) !== "new_lead") return false;
    if (lead.firstContactAt) return false;
    return hoursSince(lead.purchasedAt || lead.createdAt, now) >= unhandledHours;
  });
}

/** Leads whose follow-up date has arrived or passed and are still open. */
export function selectFollowUpDue(leads = [], { now = Date.now() } = {}) {
  return leads.filter((lead) => {
    if (isClosed(lead)) return false;
    if (!lead.followUpDate) return false;
    const t = new Date(lead.followUpDate).getTime();
    return Number.isFinite(t) && t <= now;
  });
}

/** Open leads that still have required documents outstanding. */
export function selectMissingDocuments(leads = []) {
  return leads.filter((lead) => !isClosed(lead) && Number(lead.missingDocumentsCount || 0) > 0);
}

/** Open cases with no recorded activity for longer than the staleness threshold. */
export function selectStaleCases(leads = [], { now = Date.now(), staleDays = DEFAULT_THRESHOLDS.staleDays } = {}) {
  const staleHours = staleDays * 24;
  return leads.filter((lead) => {
    if (isClosed(lead)) return false;
    const reference = lead.lastActivityAt || lead.stageUpdatedAt || lead.createdAt;
    return hoursSince(reference, now) >= staleHours;
  });
}

/**
 * Build the full digest for one advisor's purchased leads.
 * Returns null when there is nothing to report (keeps inboxes quiet).
 */
export function buildAdvisorDigest(leads = [], options = {}) {
  const now = options.now ?? Date.now();
  const sections = [
    { key: "unhandledNew", title: "לידים חדשים שטרם טופלו", leads: selectUnhandledNewLeads(leads, { ...options, now }) },
    { key: "followUpDue", title: "לידים הדורשים מעקב היום", leads: selectFollowUpDue(leads, { now }) },
    { key: "missingDocs", title: "תיקים עם מסמכים חסרים", leads: selectMissingDocuments(leads) },
    { key: "stale", title: "תיקים ללא פעילות לאחרונה", leads: selectStaleCases(leads, { ...options, now }) },
  ].filter((section) => section.leads.length > 0);

  if (sections.length === 0) return null;

  const totalCount = sections.reduce((sum, s) => sum + s.leads.length, 0);
  return { sections, totalCount };
}
