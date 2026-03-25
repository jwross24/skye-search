# Beads Workflow Rules

## Test specs belong in descriptions, not comments

All test plans, agent-browser verification steps, and testing standards MUST be part of the bead's `--description` field. Never use `br comments add` for test specs.

Before adding test content to a bead:
1. Run `br show <id>` to read the current description
2. Check if test content already exists in the description
3. If updating tests, use `br update <id> --description` with the FULL merged description
4. Never append duplicate test specs via comments

## Reading beads before modifying

`br list --json` does NOT include comments, full descriptions, or dependency IDs. It only has `dependency_count` and `dependent_count` as integers. Always use `br show <id> --json` to read the complete bead state (description, comments, dependencies) before making changes. Use `br dep list <id>` to get actual dependency IDs.

## Creating beads

Before creating a new bead:
1. Run `br list --limit 0` to check for existing beads that cover the same feature
2. Search: `br search "<keyword>"` to catch similar titles
3. Include the full test plan in the `--description` at creation time

## Dependencies

Use `br dep add <issue> <depends-on>` to set blocking relationships. Check existing deps with `br dep list <id>` before adding to avoid duplicates.

## br command reference

- `br list --limit 0` — default limit is 50, always use --limit 0 for full list
- `br show <id> --json` — full bead with description, comments, deps
- `br update <id> --description "..."` — REPLACES entire description
- `br comments add <id> "text"` — append-only, NO delete. Use for coordination notes on OPEN beads only (e.g., blockers, handoff context). Do NOT use for post-completion lessons — nothing reads closed bead comments. Route learnings to `.claude/rules/`, CM, or memory instead.
- `br dep add <issue> <depends-on>` — add blocking dependency
- `br dep list <id>` — show dependencies
- `br dep cycles` — check for circular deps
