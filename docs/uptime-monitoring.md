# Uptime Monitoring Setup

## Health Endpoint

**Production URL:** `https://skye-search.vercel.app/api/health`

### Liveness (lightweight, no DB)
```
GET https://skye-search.vercel.app/api/health
→ 200 { "status": "alive", "timestamp": "..." }
```

### Readiness (DB + all pipelines)
```
GET https://skye-search.vercel.app/api/health?ready=true
→ 200 { "status": "ready", "checks": { db, unemployment_cron, queue_worker, exa_pipeline, scoring_pipeline } }
→ 503 { "status": "degraded", ... } if any check fails
```

## BetterStack Setup (recommended, free tier)

1. Sign up at [betterstack.com](https://betterstack.com) (free tier: 5 monitors)
2. Create a monitor:
   - **URL:** `https://skye-search.vercel.app/api/health?ready=true`
   - **Check interval:** 5 minutes
   - **Request method:** GET
   - **Expected status code:** 200
   - **Keyword check:** Body contains `"ready"` (catches degraded state)
   - **Confirmation period:** 3 checks (15 min before alert)
3. Add alert contact:
   - SMS to your phone number
   - Email to your inbox
4. Optional: Create a status page (free) for public visibility

## Alternative: UptimeRobot (free tier)

1. Sign up at [uptimerobot.com](https://uptimerobot.com) (free: 50 monitors, 5-min intervals)
2. Add HTTP(s) monitor → same URL and settings as above
3. Add alert contact (SMS requires paid, email is free)

## What Gets Monitored

| Layer | What | Alert trigger |
|-------|------|--------------|
| **Uptime** (this) | App reachable, DB connected, pipelines healthy | 15 min down |
| **Daily email** | Scoring + email cron ran | Stale checkpoint >50h |
| **Scoring** | AI scoring completed | Unscored backlog >26h |
| **Discovery** | Exa pipeline found new jobs | No discoveries >8 days |
