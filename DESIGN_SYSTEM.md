# MortgAI2 Fintech Design System

## Design Pattern

MortgAI2 uses a conversion-focused advisory dashboard pattern:

1. Hero with live approval probability, trust badges, and one clear CTA.
2. Calculator workspace with input controls and instant financial feedback.
3. Decision panel showing approval label, main issue, risk, and recommended action.
4. Financial summary grid for bank-facing metrics.
5. Before/after cash-flow table to create clarity and urgency.
6. Lead section with a focused promise, friction-light form, and trust disclaimer.

## Color Palette

- Ink: `#0b1720`
- Body text: `#243746`
- Muted text: `#64748b`
- Surface: `rgba(255,255,255,.86)`
- Surface strong: `#ffffff`
- Border: `rgba(15,23,42,.10)`
- Brand emerald: `#059669`
- Brand teal: `#0f766e`
- Trust blue: `#2563eb`
- Premium gold: `#b7791f`
- Warning red: `#dc2626`
- Soft background: `#eef7f4`

## Typography

- Font stack: `Assistant`, `Heebo`, `Rubik`, Arial, sans-serif.
- H1: 56-76px desktop, 40-48px mobile, 900 weight.
- Section titles: 28-40px, 900 weight.
- Labels: 13-14px, 800-900 weight.
- Body: 16-18px, 600-700 weight for product clarity.

## UI Components

- App shell: centered max-width container with glass header.
- Hero card: large rounded glass surface with trust badges.
- Live score card: high-contrast probability, status, and recommended action.
- Money input: visible label, currency prefix, large numeric value.
- Select input: native select for accessibility and RTL safety.
- Metric card: label, primary value, helper note, warning state.
- Cash-flow row: structured label/value comparison.
- Lead card: green/blue gradient, strong headline, loading/disabled states.

## UX Decisions For Conversion

- Always show approval probability live to create immediate feedback.
- Put the main issue near the score so the user understands what blocks approval.
- Use before/after cash-flow to make the financial impact concrete.
- Keep one primary conversion action: free eligibility check.
- Show trust copy below the form to reduce fear of commitment.
- Disable form submission while sending and only show success after server OK.
- Use warning states for risk metrics without relying on color alone.
