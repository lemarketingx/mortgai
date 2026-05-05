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

Legacy path (still available for backward compatibility):

```text
/admin-dorian-private-2026
```

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

## Vercel / GitHub Deployment

Make sure the full `mortgai2` folder is tracked in GitHub before deploying to Vercel.

If a new route returns 404 in Vercel, first verify the file exists in GitHub in the exact path, then run a full Redeploy.
