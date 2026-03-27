# Close-Bead Validation Checklist

Before closing ANY bead, verify every item. Unit tests passing is necessary but not sufficient.

## Gate 1: Static Analysis (catches pattern bugs)
- `bun run verify` — build + lint + test
- `ntm scan --diff` — 0 critical, 0 warnings from YOUR changes
- These are automated by hooks. If they fail, fix before proceeding.

## Gate 2: Integration Test with REAL Data (catches wiring bugs)
Run the actual flow end-to-end. Mocks prove structure; integration proves correctness.
- **Edge Functions**: `supabase functions serve` + curl with real payload
- **Database RPCs**: `supabase db query --local` with real data
- **Storage**: upload a real file through the client with RLS active
- **API routes**: curl against the dev server (not just unit tests)
- **Claude API calls**: send a real document, verify the response parses
- **UI**: agent-browser with real user flow (login, navigate, interact, verify)
- Touch `.integration-stamp` ONLY after real testing. Hook enforces this.

## Gate 3: Production Deployment (catches env/config bugs)
- Push verified migrations to prod: `supabase db push`
- Deploy Edge Functions: `supabase functions deploy <name>`
- Set secrets: `supabase secrets set`
- Verify on prod: curl the health endpoint, check API routes aren't redirected

## Gate 4: Review Disposition (catches logic bugs)
Run self-review via subagent. Produce a disposition table:
```
| # | Finding | Severity | Disposition | Action |
```
Every finding: **Fix now**, **Bead created** (with ID + full spec), or **Not a bug** (with justification).
"Pre-existing" is NOT valid. "Low priority" requires a bead, not a skip.

For complex beads (>200 lines changed): apply the **Rule of Five** — run 2-3 review iterations with fresh agents until findings converge to trivial issues only.

## Gate 5: Plan Traceability
Re-read the plan file. Check off every deliverable. If something was commented out, deferred, or "TODO'd", it's not done.

## Why all five gates?

Session 2026-03-27 post-mortem:
- Gate 1 alone: proxy.ts bug shipped (unit tests passed, production broke)
- Gate 2 alone: base64 crash found (mocks hid it, first real PDF caught it)
- Gate 3 alone: pg_cron not activated (code was done, deploy was forgotten)
- Gate 4 alone: 4 findings silently skipped (dismissed as "pre-existing")
- Gate 5 alone: pg_cron scheduling was in the plan but never implemented

No single gate catches everything. All five together do.

Enforcement: `close-bead-gate.sh` hook (level 1) blocks `br close` without `.integration-stamp` (10 min TTL). The other gates are enforced by discipline and cross-review.
