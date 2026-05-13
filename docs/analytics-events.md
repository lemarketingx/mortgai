# MortgAI Analytics Event Schema (GTM/GA4)

All events are pushed to `window.dataLayer` and are designed to be safe before GTM loads.

## Events

- `wizard_started`
- `wizard_step_completed`
- `wizard_completed`
- `lead_submit_started`
- `lead_submit_success`
- `lead_submit_failed`

## Common fields

- `event` (string)
- `timestamp` (ISO datetime)
- `source` (e.g. `homepage`)
- `utmSource`
- `utmMedium`
- `utmCampaign`
- `utmContent`
- `utmTerm`

## Event-specific fields

- Wizard events may include:
  - `step` (number)
  - `stepName` (string)
  - `approvalEstimate` (number)
  - `paymentEstimate` (number)
- `wizard_step_completed` may include `nextStep`.
- `wizard_completed` may include `steps`.
- Lead submit events may include:
  - `approvalEstimate` (number)
  - `paymentEstimate` (number)
- `lead_submit_failed` may include `errorCode`.

## PII policy

The analytics payload must not include:

- name
- phone
- email
- ID number
- free-text notes

Development-only debug logging prints event metadata to the browser console and should not include personal lead details.
