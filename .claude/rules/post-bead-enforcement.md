# Post-Bead Step Enforcement

## The Problem
Steps 11-18 in the bead marching orders were repeatedly skipped or done out of order during the 2026-03-25 session. The pre-commit hook catches build/lint/test failures but nothing enforces the workflow steps.

## Mandatory Checklist (after EVERY bead, no exceptions)

Before closing a bead, mentally verify each step. If you catch yourself skipping one, STOP and do it.

1. **Self-review via subagent** — BEFORE commit, not after. The self-review must complete and fixes must be applied before the commit.
2. **E2E verify (UI beads)** — If agent-browser fails (timeout, server hung), FIX THE ROOT CAUSE. Do not commit without E2E passing. Restart the dev server if needed.
3. **bun run verify** — Already enforced by hook.
4. **ntm scan --diff** — Check for warnings too, not just critical. Fix warnings if they're from your changes.
5. **Commit + push** — Already enforced.
6. **Learn** — After EVERY bead, ask: "Did I discover something surprising?" If yes, save it NOW. Don't batch lessons across beads — you'll forget.
7. **/impeccable** — ANY .tsx file. The rule says "No exceptions. Even forms and dialogs benefit."
8. **Skills from bead spec** — If the bead spec says "Invoke /resend skill" or "Use Context7 MCP", DO IT. Don't skip because you think you know enough.

## bv Override Policy
If overriding bv's pick, state the reason in a brief comment before claiming the bead:
"Overriding bv: u4b (P0, blocks 4 P0 beads) takes priority over orn (P1, unblocks 4 P1 beads). bv doesn't see dependent_count correctly."

## Cross-Bead Review Reminder
After every 3rd closed bead, the cross-bead review is mandatory. Count closed beads since last review. If >= 3, run it before starting the next bead.
