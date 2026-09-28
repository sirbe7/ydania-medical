# DraYdania Phase 1 architecture

## Principles
- D1 is the scheduling source of truth.
- Scheduling correctness is deterministic code; AI interprets language but never decides whether a slot is free.
- All destructive appointment actions are status changes; appointments are not hard-deleted.
- Every meaningful mutation writes to `audit_log`.
- User-visible failures are also recorded in `error_log` when D1 is available.
- Public chat and booking are separate.
- Public chat must not solicit medical history.
- WhatsApp and AI providers are behind adapters so providers can be changed later.

## Managed infrastructure
- Cloudflare Worker + Static Assets: application and API.
- Cloudflare D1: scheduling database. D1 Time Travel is automatic point-in-time recovery (7 days on Workers Free, 30 days on Workers Paid as of Sep 2026).
- OpenAI API: public Level-2 receptionist and language interpretation. Defaults are configurable.
- YCloud: initial WhatsApp transport. Adapter boundary is `src/providers/whatsapp.js`.
- Cloudflare Email Routing on a dedicated subdomain such as `agenda.draydania.com` is the preferred inbound scheduling-email transport so the existing iCloud MX records on `draydania.com` remain untouched.

## Required Cloudflare binding
Create a D1 database named `ydania-scheduling`, apply `migrations/0001_init.sql`, then add a Wrangler binding:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "ydania-scheduling",
    "database_id": "<CLOUDFLARE_DATABASE_ID>"
  }
]
```

The site continues to serve static pages before this binding exists; API health reports `degraded` instead of breaking the website.

## Secrets / variables
Set as Cloudflare Worker secrets unless noted:
- `OPENAI_API_KEY`
- `ADMIN_TOKEN` — long random token for the first admin dashboard version
- `LOG_HASH_SALT`
- `YCLOUD_API_KEY`
- `WHATSAPP_FROM`
- `STAFF_WHATSAPP_NUMBERS` — comma-separated numbers allowed to issue scheduling commands
- `SCHEDULING_EMAIL_SENDERS` — comma-separated addresses allowed to issue email scheduling commands

Optional model routing vars:
- `OPENAI_MODEL_FAST` default `gpt-5.6-luna`
- `OPENAI_MODEL_SMART` default `gpt-5.6-terra`
- `OPENAI_TRANSCRIBE_MODEL` default `gpt-transcribe`

Provider vars:
- `AI_PROVIDER=openai` (reserved for provider switching)
- `WHATSAPP_PROVIDER=ycloud`

YCloud template vars (recommended for messages outside WhatsApp's customer-service window):
- `YCLOUD_TEMPLATE_BOOKING_CONFIRMED`
- `YCLOUD_TEMPLATE_BOOKING_DECLINED`
- `YCLOUD_TEMPLATE_BOOKING_CANCELLED`
- `YCLOUD_TEMPLATE_REMINDER_24H`
- `YCLOUD_TEMPLATE_REMINDER_2H`

## YCloud webhook
Point YCloud to:
`https://draydania.com/api/webhooks/ycloud`

Subscribe at minimum to:
- `whatsapp.inbound_message.received`
- `whatsapp.message.updated`

Staff can send text or voice scheduling commands. Voice media is downloaded from YCloud and transcribed with OpenAI. Staff numbers are allow-listed.

For staff approval by WhatsApp, the notification includes the booking ID. Authorized staff can reply:
- `APROBAR booking_...`
- `RECHAZAR booking_...`
- `CANCELAR booking_...`

## Email-to-calendar
Preferred address: `agenda@agenda.draydania.com`.
Use Cloudflare Email Routing on the `agenda.draydania.com` subdomain and route that literal address to this Worker. This avoids changing the apex iCloud MX records.
Only senders listed in `SCHEDULING_EMAIL_SENDERS` are processed.

## Daily agenda
An hourly cron runs maintenance. The database setting `agenda_email_hour_local` defaults to 19 (7 PM Caracas). The job sends tomorrow's agenda only once per local date and can be changed later in Doctor Admin.

## Recovery / low maintenance
- D1 Time Travel: automatic recovery history; no manual backup job required for the included retention window.
- `booking_locks`: 5-minute unique lock buckets make overlapping booking requests fail atomically even under concurrency.
- `audit_log`: business-level mutation history.
- `error_log`: unresolved application errors visible in Doctor Admin.
- Workers Observability: enabled in Wrangler.
- Node tests cover time conversion, overlap semantics, buffers, and duplicate blocking rules.
- Pending requests auto-expire after 24 hours and release their locks.
- Reminder jobs retry and eventually mark themselves failed instead of silently disappearing.