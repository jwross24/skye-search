# Bead Marching Orders

Follow every step. No skipping. The pre-commit hook will block you if you skip verify.

## Before starting each bead

1. `bv --robot-next` — pick the bead
2. `br show <id>` — read the FULL spec (not br list)
3. `br update <id> --status in_progress`
4. `cm context "<task>" --json --limit 3` — check relevant rules
5. AGENTS.md — check `node_modules/next/dist/docs/` for Next.js 16 breaking changes
6. Context7 MCP — fetch current docs for any libraries used

## During implementation

7. Write tests alongside code (not after)
8. If bead creates/modifies ANY .tsx component: invoke /impeccable skill. No exceptions. Even forms and dialogs benefit from UX writing + interaction design audits. The skill reads .impeccable.md + 7 reference docs automatically.
9. Use `cass search` when stuck
10. Use seed test user for E2E: `dev@skye-search.test` / `testpass123`

## After completing each bead (EVERY step, in order)

11. **Self-review via subagent**: Spin up a review agent to read ALL new/modified files with fresh eyes. The implementing agent is biased — a separate agent catches more. The subagent should check: bugs, type errors, missing edge cases, test assertions matching components, accessibility, dead code, hardcoded values. Fix CRITICAL and MEDIUM issues. Run tests after fixes.
12. **E2E verify** (UI beads): Sign in via agent-browser, navigate to route, snapshot, interact, check errors
13. `bun run verify` — build + lint + test (creates .verify-stamp for pre-commit hook)
14. `ntm scan --diff` — bug scan
15. `git pull && git add <specific files> && git commit -m "br-XX: description"`
16. `git push`
17. Learn: Route surprising discoveries to `.claude/rules/` or memory. Skip if obvious.
18. `br close <id> --reason "Completed"`
19. `bv --robot-next` — advance

## Every 3-5 beads: Cross-agent review

After completing 3-5 beads, run a deep review pass before starting the next batch.
Spin up a subagent with this prompt:

> Pick 3-5 recently changed files, deeply investigate each one, trace execution
> flows through imports and dependencies. Check for: bugs, type errors, missing
> error handling, inconsistent patterns, broken imports, untested edge cases.
> Run `/simplify` on changed code. Fix anything you find. Run `bun run verify`
> after fixes.

This mirrors the swarm-supervisor's cross-agent review (triggered every N beads).
In single-agent mode, do it yourself between bead batches.

## What NOT to do

- `br comments add` for lessons — closed beads are never read
- Manual `cm mark` — automated by SessionEnd pipeline
- `git add .` or `git add -A` — stage specific files only
- `--no-verify` — pre-commit hook exists for a reason
- Skip agent-browser on UI beads — "the build passed" is not visual verification
