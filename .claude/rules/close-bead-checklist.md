# Close-Bead Validation Checklist

Before closing ANY bead, verify every item. Unit tests passing is necessary but not sufficient.

## Mandatory checks

1. **Re-read the plan file** — check off every deliverable. If something is commented out or deferred, it's not done.
2. **Integration test** — for database/API/Edge Function beads, run the actual flow end-to-end (not just unit tests):
   - Database RPCs: `supabase db query --local` to verify they work
   - Edge Functions: `supabase functions serve` + curl
   - API routes: curl against the dev server
   - UI changes: agent-browser snapshot
3. **Production readiness** — document what's needed for deploy:
   - Migrations: can they be applied to prod? (`supabase db push`)
   - Secrets: are they configured in the target environment?
   - Extensions: are required Postgres extensions available on the target tier?
   - Edge Functions: `supabase functions deploy`
4. **`bun run verify`** — build + lint + test (the floor, not the ceiling)
5. **`ntm scan --diff`** — bug scan

## Why

skye-search-p44 was closed with pg_cron scheduling unimplemented, no integration test run, and unhealthy Docker containers masking the issue. The bead passed `bun run verify` because Vitest doesn't test Edge Functions or database RPCs.
