# Review Disposition Table Required

After every self-review or cross-bead review, you MUST produce a disposition table before closing the bead:

```
| # | Finding | Severity | Disposition | Action |
|---|---------|----------|-------------|--------|
| 1 | Base64 crash | CRITICAL | Fix now | Fixed in this commit |
| 2 | No test coverage | HIGH | Bead created | skye-search-kia |
| 3 | Unused import | LOW | Not a bug | Dead code from refactor, harmless |
```

## Rules
- Every row must have a disposition: **Fix now**, **Bead created** (with ID), or **Not a bug** (with one-line justification)
- Empty dispositions = bead cannot be closed
- "Pre-existing" is NOT a valid disposition. If you found it, it's yours now.
- "Low priority" requires a bead, not a skip
- Beads created from findings must have FULL specs (Implementation, Tests, Acceptance Criteria) — not one-liners

## Why
Session 2026-03-27: dismissed 6 review findings as "pre-existing" or "skip." One was a data persistence violation. User: "Do not be lazy and be meticulous here."
