# Supabase Secrets Deployment Checklist

Every time you add a new env var that an Edge Function reads (`Deno.env.get()`), you MUST:

1. Add to `supabase/functions/.env` (local dev)
2. Add to `.env.local.example` (documentation)
3. Set in production: `supabase secrets set KEY=value --project-ref tuqfrmcxxhbujpgvqufs`
4. Redeploy: `supabase functions deploy <name> --no-verify-jwt --project-ref tuqfrmcxxhbujpgvqufs`

Verify with: `supabase secrets list --project-ref tuqfrmcxxhbujpgvqufs`

## Why
Session 2026-03-30: Three separate secrets (ANTHROPIC_API_KEY, EXA_API_KEY, USAJOBS_API_KEY) were all missing or stale in production Supabase secrets. Each caused silent pipeline failures that were only discovered by manually checking task_queue error_log. The admin dashboard now surfaces these, but prevention is better than detection.
