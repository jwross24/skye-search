# Worktree-Per-Bead Workflow

Use git worktrees for code isolation. The MAIN CONTEXT drives all marching orders.

## Correct Pattern

1. **Main context** claims the bead (`br update --status in_progress`)
2. **Main context** runs prereqs, cm context, reads spec
3. **Main context** delegates IMPLEMENTATION ONLY to a subagent with `isolation: "worktree"`
4. Subagent writes code + tests, runs `bun run verify`, returns results
5. **Main context** merges worktree branch to main
6. **Main context** runs self-review (separate subagent, NOT the implementing agent)
7. **Main context** runs agent-browser E2E (for UI beads)
8. **Main context** runs `bun run verify` on main after merge
9. **Main context** commits, pushes, closes bead

## What the subagent should do
- Write implementation code and tests
- Run `bun run verify` in the worktree to confirm it passes
- Return a summary of what was built and any issues found

## What the subagent must NOT do
- Run `br close` or `br update`
- Write disposition files
- Run agent-browser
- Invoke /impeccable or other skills
- Make decisions about bead scope or acceptance criteria

## Why This Matters

Session 2026-04-03: delegated full bead lifecycle to a subagent. Result:
- No prereq-gate fired (subagent doesn't trigger hooks)
- No cm context checked
- No /impeccable on .tsx files
- Self-review done by the same agent (bias)
- No agent-browser E2E
- Worktree created inside project dir, broke vitest (duplicate React)
- `bun add sonner` in a prior bead lost package.json from commit (lint-staged stash/restore)

Every enforcement mechanism exists in the main context's hook system. Delegating the lifecycle to a subagent bypasses ALL of them.
