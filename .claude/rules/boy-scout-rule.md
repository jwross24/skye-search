# Boy Scout Rule: Leave Code Better Than You Found It

When reviewing code and finding issues — even "pre-existing" ones — you must act:

1. **Fix now** if it takes <15 minutes
2. **Create a bead** with full spec if it's larger
3. **"not-a-bug"** only if it genuinely is not a bug (with real justification)

"Pre-existing" is NOT a valid reason to skip. "Low priority" requires a bead, not a skip. If you found it while touching that code, it's yours.

## Enforcement

The `validate-disposition.sh` hook enforces:
- "bead" dispositions must reference a bead that actually EXISTS (verified via `br show`)
- CRITICAL/HIGH "not-a-bug" needs 50+ char justification
- MEDIUM "not-a-bug" needs 30+ char justification
- "pre-existing" as disposition is rejected

## Why

Session 2026-04-03: Multiple review findings were dismissed as "pre-existing" or given lazy "not-a-bug" dispositions. This included a Deno urgency-scoring drift (MEDIUM), missing Canadian employers (LOW), test coverage gaps, and a golden set prompt mismatch. None of these got beads until the user caught the gap.

Every session that ignores a finding makes the next session's review harder. Beads are cheap. Shipping bugs is expensive.
