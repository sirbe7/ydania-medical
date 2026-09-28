# Dra. Ydania medical website

Multilingual medical website plus Phase 1 scheduling/AI backend for Cloudflare Workers.

## Public
- Spanish, English, Portuguese, Italian, Korean landing pages
- Level-2 AI receptionist endpoint (`/api/chat`)
- Booking request page (`/booking/`)

## Staff
- Doctor Admin (`/admin/`)
- service durations and buffers
- staff-approved bookings
- schedule blocks / vacations
- weekly availability rules
- health and error dashboard
- WhatsApp/YCloud text + voice scheduling commands
- daily agenda email workflow

## Reliability
- D1 source of truth
- atomic booking locks
- audit log
- error log
- Workers observability
- D1 Time Travel recovery
- automated tests

See `docs/ARCHITECTURE.md` for setup and provider configuration.