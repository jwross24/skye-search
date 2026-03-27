# Cron + Alerts Orchestration

The unemployment checkpoint and email alerts are two separate endpoints:

1. `POST /api/cron/unemployment` — runs daily checkpoint (writes to daily_checkpoint + cron_execution_log)
2. `POST /api/alerts` — checks alert conditions and sends emails via Resend

The orchestrator (Vercel Cron or GitHub Actions) must call BOTH:
```
# In cron schedule or GHA workflow:
curl -X POST .../api/cron/unemployment -H "Authorization: Bearer $CRON_SECRET"
curl -X POST .../api/alerts -H "Authorization: Bearer $CRON_SECRET"
```

Order matters: run checkpoint first, then alerts (alerts read from checkpoint data).

The cron endpoint does NOT auto-trigger alerts — this is intentional. Keeps concerns separated and allows independent testing/scheduling.
