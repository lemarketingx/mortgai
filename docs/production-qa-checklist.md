# MortgAI Manual Production QA Checklist

Use this short checklist before launch or after major releases.

## 1) Mobile homepage check
- Open homepage on a mobile viewport (e.g., 390x844).
- Confirm hero, CTA buttons, and sections render without overlap/cutoff.
- Confirm sticky/mobile CTA is visible and clickable.
- Confirm no obvious layout breakage in RTL text.

## 2) Wizard full-flow check
- Start from the homepage calculator/wizard.
- Complete all steps from first input to final review/result state.
- Confirm step progression works and no blocked navigation appears unexpectedly.
- Confirm result metrics update as inputs change.

## 3) Lead submit success check
- Fill lead form with valid test data.
- Submit once and confirm success UI/state appears.
- Confirm no client-side errors and no duplicate success events.

## 4) Lead submit failure check
- Force a failure scenario (e.g., temporary API/env misconfig in staging, or intentional invalid backend response path).
- Submit lead and confirm user-friendly error message appears.
- Confirm user can retry after failure.

## 5) CRM lead visibility check
- Log in to Admin CRM.
- Confirm the newly submitted test lead appears in the list.
- Confirm key fields (name, phone, city, amount, status) are visible.

## 6) Enriched fields check
- In CRM, verify enriched/source fields are present when available:
  - UTM source/campaign
  - landing page
  - referrer
  - estimated approval/payment
  - property/equity/income/debt fields

## 7) GTM/GA4 dataLayer check
- Verify GTM script loads **only** when `NEXT_PUBLIC_GTM_ID` is set.
- In browser devtools, inspect `window.dataLayer`.
- Trigger wizard/lead actions and confirm expected events are pushed.
- Confirm no PII (name/phone/email/free-text) is present in analytics events.

## 8) SEO pages check
- Confirm these pages load and return 200:
  - `/`
  - `/guides`
  - all 6 guide detail pages
- Spot-check title/description/canonical tags on homepage + guides index + one guide detail page.

## 9) Sitemap/robots check
- Open `/sitemap.xml` and confirm it includes:
  - homepage (`/`)
  - guides index (`/guides`)
  - all guide detail URLs
- Open `/robots.txt` and confirm:
  - `Disallow: /admin`
  - `Disallow: /api/`

## 10) Post-test cleanup
- Remove test leads or clearly mark them as QA/test in CRM notes/status.
- Clear local test data/storage if used.
- Record pass/fail notes and blockers in release log.

