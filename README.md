# MortgAI2

Next.js + Tailwind mortgage calculator with Hebrew RTL fintech UI, live approval probability, financial summary cards, and a lead form.

## Local Development

```bash
npm install
npm run dev
```

## Production Validation

```bash
npm run build
```

If Windows blocks the regular Next worker process, try:

```bash
npm run build:webpack
```

## Leads

Set this environment variable to forward leads:

```bash
LEAD_WEBHOOK_URL=https://your-webhook-url
```

## Admin CRM

Admin page:

```text
/admin
```

The old temporary private URL was removed. Use `/admin` only.

Admin access now requires:

```text
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
```

Login is handled by `/api/admin/login` and uses an HttpOnly signed session cookie.

## Lead Storage

Leads are stored in Supabase through server-side API routes.

Required environment variables:

```text
SUPABASE_URL
SUPABASE_SERVICE_KEY
```

Optional lead forwarding webhook:

```text
LEAD_WEBHOOK_URL
```

If `SUPABASE_URL` or `SUPABASE_SERVICE_KEY` is missing in Vercel, `/api/admin/leads` returns `SUPABASE_ENV_MISSING` and the CRM shows a clear setup message instead of a generic loading failure.

## Required Vercel Environment Variables

Set these in Vercel Project Settings -> Environment Variables:

```text
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
SUPABASE_URL
SUPABASE_SERVICE_KEY
```

Optional:

```text
LEAD_WEBHOOK_URL
OPENAI_API_KEY
```

`OPENAI_API_KEY` is only needed if a future PDF extraction or analysis flow uses OpenAI. The current PDF extraction uses browser-side PDF text parsing and does not require OpenAI.

## Supabase Setup

Create the `leads` table by running:

```text
lib/supabase-schema.sql
```

Use the Supabase `service_role` key for `SUPABASE_SERVICE_KEY`. Do not expose this key in client-side code.

## Vercel / GitHub Deployment

Make sure the full `mortgai2` folder is tracked in GitHub before deploying to Vercel.

If a new route returns 404 in Vercel, first verify the file exists in GitHub in the exact path, then run a full Redeploy.
