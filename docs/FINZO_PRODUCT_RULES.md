# FINZO Product Rules

**MANDATORY: Any AI task, Codex session, or Claude task must read this file before changing any UI, page, or component.**

---

## 1. Public Homepage `/` — Consumers Only
The homepage is for consumers (mortgage seekers) ONLY.
- Never add advisor links, FINZO PRO mentions, or advisor CTAs to `/`.
- Never restore old card-heavy calculator layout.
- Do not add any content that belongs under `/advisors` or `/advisor/*` to the homepage.

## 2. FINZO PRO — Advisor Portal
FINZO PRO advisor content exists exclusively under:
- `/advisors` — public advisor landing page
- `/advisor/*` — authenticated advisor portal (leads, profile, register, login, etc.)

Never merge advisor content into the public consumer site.

## 3. Design Language
- Current design language (violet/purple primary, rounded cards, dark slate backgrounds) is the source of truth.
- Do not change the active design system without explicit written approval.
- Do not restore old designs or layouts without explicit instruction.

## 4. Lead Form Flows
- Public mortgage eligibility: **stepped wizard** (5 steps) in `/lead`
  - Step 1: Contact details (name, phone, email optional)
  - Step 2: User intent (5 options)
  - Step 3: Property/financial details (conditional on intent)
  - Step 4: Income and obligations
  - Step 5: Result + lead submit via `/api/lead`
- Refinance flow: **stepped wizard** (4 steps) in `/refinance-check`
  - Step 1: Contact details
  - Step 2: Method choice (PDF / manual / just checking)
  - Step 3: Data entry (PDF upload or manual fields)
  - Step 4: Result + lead submit via `/api/lead`
- **Contact details from Step 1 MUST be preserved and included in final lead submission.**
- Never show a long flat form as the primary entry point.

## 5. Separate Flows
- Mortgage eligibility (`/`, `/lead`) and refinance (`/refinance-check`) must stay visually consistent but functionally separate.
- Do not merge their data models.

## 6. Lead Store Security
- Name/phone are hidden before purchase in the advisor store — do NOT change this.
- `readStoreLeads()` must never return full contact data.

## 7. Incremental Changes Only
- Any change must be incremental on top of the latest version.
- Do not restore old sections, old components, or old layouts.
- Verify before and after: `/` has no advisor content, `/advisors` still exists, `/advisor/*` still exists.
