const SAFE_UTM_KEYS = ["utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm"];

/**
 * MortgAI analytics event schema (PII-safe):
 * - wizard_started: { source, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, timestamp }
 * - wizard_step_completed: { step, stepName, source, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, approvalEstimate, paymentEstimate, timestamp }
 * - wizard_completed: { step, stepName, source, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, approvalEstimate, paymentEstimate, timestamp }
 * - lead_submit_started: { source, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, approvalEstimate, paymentEstimate, timestamp }
 * - lead_submit_success: { source, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, approvalEstimate, paymentEstimate, timestamp }
 * - lead_submit_failed: { source, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, approvalEstimate, paymentEstimate, timestamp, errorCode }
 *
 * Explicitly excluded from analytics payloads:
 * name, phone, email, ID number and any free-text notes.
 */
export function initializeAnalyticsLayer() {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
}

function safeString(value) {
  return typeof value === "string" ? value : "";
}

function pickUtmFields(sourceMeta = {}) {
  return SAFE_UTM_KEYS.reduce((acc, key) => {
    acc[key] = safeString(sourceMeta[key]);
    return acc;
  }, {});
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
  debugAnalytics(eventPayload);
}
