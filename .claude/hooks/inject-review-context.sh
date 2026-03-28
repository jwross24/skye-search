#!/usr/bin/env bash
set -euo pipefail

# SubagentStart — inject evaluator context into review subagents.
#
# When a self-review or cross-review subagent starts, inject:
# - The evaluator template
# - Git diff summary
# - Current bead info
#
# This replaces build-evaluator-prompt.sh for context assembly.

INPUT=$(cat)
AGENT_TYPE=$(printf '%s' "$INPUT" | jq -r '.agent_type // ""' 2>/dev/null) || exit 0

# Only inject for general-purpose agents (reviews use this type)
# Explore/Plan agents don't need review context
if [ "$AGENT_TYPE" = "Explore" ] || [ "$AGENT_TYPE" = "Plan" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
TEMPLATE="$PROJECT_DIR/.claude/evaluator-template.md"

# Only inject if the evaluator template exists
[ -f "$TEMPLATE" ] || exit 0

# Gather context
DIFF_STAT=$(git diff --stat origin/main...HEAD 2>/dev/null | tail -5 || echo "(no diff)")
FILES_CHANGED=$(git diff --name-only origin/main...HEAD 2>/dev/null | head -20 || echo "(no changes)")
CURRENT_BEAD=$(br list --limit 0 --json 2>/dev/null | jq -r '[.[] | select(.status == "in_progress")] | .[0].id // "unknown"' 2>/dev/null || echo "unknown")

# Read template
EVAL_TEMPLATE=$(cat "$TEMPLATE")

# Output as additionalContext
jq -nc --arg ctx "$(cat << EOF
$EVAL_TEMPLATE

## Current Context
Bead: $CURRENT_BEAD
Changed files:
$FILES_CHANGED

Diff summary:
$DIFF_STAT
EOF
)" '{hookSpecificOutput: {hookEventName: "SubagentStart", additionalContext: $ctx}}'
