# FINZO reminder digest — scheduled job setup

`GET/POST /api/cron/reminders` sends each active advisor a daily Hebrew email
digest of leads that need attention:

- לידים חדשים שטרם טופלו (purchased, still "new_lead", no first contact for 24h+)
- לידים הדורשים מעקב היום (`follow_up_date` reached)
- תיקים עם מסמכים חסרים (`missing_documents_count > 0`)
- תיקים ללא פעילות לאחרונה (no activity for 7+ days)

The endpoint is **read-only** (no DB writes) and requires authorization —
it cannot be triggered by the public.

## Required environment variables

| Variable | Purpose |
|---|---|
| `CRON_SECRET` | Shared secret the scheduler must present. Vercel automatically sends `Authorization: Bearer $CRON_SECRET` with its own Cron Jobs once this env var is set on the project — no extra config needed. |
| `RESEND_API_KEY` | Resend API key used by `lib/email.js` to actually deliver the emails. |
| `EMAIL_FROM` | Verified sender, e.g. `FINZO <notifications@yourdomain.com>`. |
| `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` | Used to build absolute "view lead" links in the email. |

If `RESEND_API_KEY`/`EMAIL_FROM` are missing the job still runs and reports
`skipped` per advisor — nothing breaks, emails are simply not sent.

## Option A — Vercel Cron (recommended, already wired up)

`vercel.json` at the repo root already declares:

```json
{
  "crons": [
    { "path": "/api/cron/reminders", "schedule": "0 7 * * *" }
  ]
}
```

This runs daily at 07:00 UTC. Steps:

1. Set `CRON_SECRET` (any long random string) in the Vercel project's
   Environment Variables — Production (and Preview if desired).
2. Deploy. Vercel will register the cron job automatically and will send the
   `Authorization: Bearer $CRON_SECRET` header on every invocation, which
   `isAuthorized()` in `pages/api/cron/reminders.js` validates.
3. Adjust the `schedule` (standard cron syntax, UTC) as needed.

## Option B — Supabase scheduled function / pg_cron

If you prefer triggering from Supabase instead:

```sql
select
  cron.schedule(
    'finzo-reminder-digest',
    '0 7 * * *',
    $$
    select net.http_get(
      url := 'https://your-domain.com/api/cron/reminders',
      headers := jsonb_build_object('Authorization', 'Bearer ' || '<CRON_SECRET value>')
    );
    $$
  );
```

(Requires the `pg_cron` and `pg_net` extensions enabled on the project.)
Store the secret value the same way you store other credentials — never commit
it to source control.

## Manual trigger / testing

```bash
curl -X GET "https://your-domain.com/api/cron/reminders" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Response is a JSON summary (`{ ok, advisorsChecked, results }`) — no PII beyond
advisor IDs and send status, safe to log.
