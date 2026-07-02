const SAFE_UTM_KEYS = ["utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm"];

const POSTHOG_EVENT_ALIASES = {
  wizard_started: "mortgage_calculator_started",
  wizard_completed: "mortgage_calculator_completed",
  lead_submit_started: "lead_form_started",
  bottom_lead_submit_started: "lead_form_started",
  lead_submit_success: "lead_submitted",
  bottom_lead_submit_success: "lead_submitted",
};

/**
 * MortgAI / FINZO analytics event schema (PII-safe):
 * - wizard_started: { source, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, timestamp }
 * - wizard_step_completed: { step, stepName, source, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, approvalEstimate, paymentEstimate, timestamp }
 * - wizard_completed: { step, stepName, source, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, approvalEstimate, paymentEstimate, timestamp }
 * - lead_submit_started: { source, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, approvalEstimate, paymentEstimate, timestamp }
 * - lead_submit_success: { source, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, approvalEstimate, paymentEstimate, timestamp }
 * - lead_submit_failed: { source, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, approvalEstimate, paymentEstimate, timestamp, errorCode }
 *
 * Explicitly excluded from analytics payloads:
 * name, phone, email, ID number, exact financial values and any free-text notes.
 */
export function initializeAnalyticsLayer() {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
}

function safeString(value) {
  return typeof value === "string" ? value : "";
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function pickUtmFields(sourceMeta = {}) {
  return SAFE_UTM_KEYS.reduce((acc, key) => {
    acc[key] = safeString(sourceMeta[key]);
    return acc;
  }, {});
}

function bucketApproval(value) {
  const number = safeNumber(value);
  if (number === null) return undefined;
  if (number < 45) return "0-44";
  if (number < 70) return "45-69";
  if (number <= 100) return "70-100";
  return "100_plus";
}

function bucketMonthlyPayment(value) {
  const number = safeNumber(value);
  if (number === null || number <= 0) return undefined;
  if (number < 4000) return "under_4k";
  if (number < 6000) return "4k_6k";
  if (number < 8000) return "6k_8k";
  if (number < 12000) return "8k_12k";
  return "12k_plus";
}

function buildPostHogPayload(eventPayload) {
  const payload = {
    source: safeString(eventPayload.source) || "homepage",
    timestamp: safeString(eventPayload.timestamp),
    ...pickUtmFields(eventPayload),
  };

  if (typeof eventPayload.location === "string") payload.location = eventPayload.location;
  if (typeof eventPayload.stepName === "string") payload.stepName = eventPayload.stepName;
  if (typeof eventPayload.errorCode === "string") payload.errorCode = eventPayload.errorCode.slice(0, 80);

  const step = safeNumber(eventPayload.step);
  const nextStep = safeNumber(eventPayload.nextStep);
  const steps = safeNumber(eventPayload.steps);
  if (step !== null) payload.step = step;
  if (nextStep !== null) payload.nextStep = nextStep;
  if (steps !== null) payload.steps = steps;

  const approvalRange = bucketApproval(eventPayload.approvalEstimate);
  const paymentRange = bucketMonthlyPayment(eventPayload.paymentEstimate);
  if (approvalRange) payload.approvalRange = approvalRange;
  if (paymentRange) payload.paymentRange = paymentRange;

  return payload;
}

function normalizePostHogEventName(eventName) {
  return POSTHOG_EVENT_ALIASES[eventName] || eventName;
}

function sendToPostHog(eventName, eventPayload) {
  if (typeof window === "undefined" || !window.posthog?.capture) return;

  window.posthog.capture(
    normalizePostHogEventName(eventName),
    buildPostHogPayload(eventPayload)
  );
}

function debugAnalytics(eventPayload) {
  if (typeof window === "undefined" || process.env.NODE_ENV === "production") return;
  console.info("[MortgAI Analytics]", eventPayload.event, {
    ...eventPayload,
    // Avoid noisy object previews and keep this developer-only.
    debugLoggedAt: new Date().toISOString(),
  });
}

export function trackEvent(eventName, payload = {}, options = {}) {
  if (typeof window === "undefined") return;
  initializeAnalyticsLayer();

  const sourceMeta = options.sourceMeta || {};
  const eventPayload = {
    event: eventName,
    source: safeString(options.source) || "homepage",
    ...pickUtmFields(sourceMeta),
    timestamp: new Date().toISOString(),
    ...payload,
  };

  window.dataLayer.push(eventPayload);
  sendToPostHog(eventName, eventPayload);
  debugAnalytics(eventPayload);
}
