# Supabase Client Patterns

Two valid patterns exist in this codebase:

## 1. Request-context client (pages, server actions)
```typescript
import { createClient } from '@/db/supabase-server'
const supabase = await createClient()  // Uses cookies(), respects RLS
```
Use when: Server components, server actions, any context with user session cookies.

## 2. Direct service-role client (cron, webhooks, background jobs)
```typescript
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)
```
Use when: Cron endpoints (`/api/cron/*`), webhook handlers (`/api/webhooks/*`), `CheckpointDbSupabase`, `email-alerts.ts` — any context without user session cookies. Bypasses RLS.

The direct client is NOT a violation of "never create ad-hoc clients" — it's a documented exception for contexts where `cookies()` is unavailable.
