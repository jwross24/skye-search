#!/usr/bin/env bash
set -euo pipefail

# PostToolUse[Bash] — after br close, inject a learning reminder into context.
#
# This fires after a successful bead close. The output is injected as a system
# message that the main agent must respond to before moving on.
#
# Why a command hook (not prompt): Haiku can't write memory files. The main agent
# needs to do the learning. This hook just injects the reminder.

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0
STDOUT=$(printf '%s' "$INPUT" | jq -r '.stdout // ""' 2>/dev/null) || STDOUT=""

# Only fire on successful br close (output contains "Closed")
if ! echo "$STDOUT" | grep -q "Closed"; then
  exit 0
fi

# Extract bead ID from the close output
BEAD_ID=$(echo "$STDOUT" | grep -oE 'skye-search-[a-z0-9]+' | head -1) || BEAD_ID="unknown"

cat <<EOF
LEARNING CHECK (bead $BEAD_ID just closed):

Before picking the next bead, answer: Did you discover anything surprising
or non-obvious during this bead?

Consider:
- Unexpected API behavior or wrong assumptions
- Tooling gotchas (hooks, gates, stamps)
- Patterns that worked well and should be repeated
- Things that should be enforced (rules, hooks, tests)

If YES → write to .claude/rules/ (enforcement) or memory/ (context) + update MEMORY.md.
If genuinely nothing → say so briefly and move on.

Do NOT batch learnings across beads. Do NOT skip this step.
(Previous session lost 3 learnings by deferring them.)
EOF
