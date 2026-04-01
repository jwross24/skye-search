# Uptime Monitoring

## How it works

A daily cron at 6:00 UTC calls `/api/health?ready=true` internally. If any check fails, it emails the developer via Resend. No external services needed.

**Cron schedule (vercel.json):**
```
/api/cron/healthcheck → 6:00 UTC daily (after scoring + unemployment crons finish)
```

**What gets checked:**
| Check | Stale threshold | What it catches |
|-------|----------------|-----------------|
| DB connectivity | immediate | Supabase down |
| Unemployment cron | >50 hours | Missed checkpoint |
| Queue worker | >24 hours | Stuck tasks |
| Exa discovery | >8 days | Pipeline stopped |
| AI scoring | >26 hours + backlog | Scoring stalled |

**Alert goes to:** `DEVELOPER_ALERT_EMAIL` env var (falls back to `RESEND_FROM_EMAIL`)

## Health endpoint

```
GET /api/health              → liveness (app is up)
GET /api/health?ready=true   → readiness (all systems checked)
```

Both are public (no auth) — excluded from proxy auth redirect via `/api` prefix.

## Testing locally

```bash
# Liveness
curl http://localhost:3000/api/health

# Readiness
curl "http://localhost:3000/api/health?ready=true"

# Trigger healthcheck cron
curl -X POST http://localhost:3000/api/cron/healthcheck \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Production URLs

```
https://skye-search.vercel.app/api/health
https://skye-search.vercel.app/api/health?ready=true
```
