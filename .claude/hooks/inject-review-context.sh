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

# Only inject for general-purpose agents that are doing reviews
# Check the agent description/prompt for review-related keywords
AGENT_DESC=$(printf '%s' "$INPUT" | jq -r '.description // ""' 2>/dev/null) || true
AGENT_PROMPT=$(printf '%s' "$INPUT" | jq -r '.prompt // ""' 2>/dev/null) || true

if [ "$AGENT_TYPE" = "Explore" ] || [ "$AGENT_TYPE" = "Plan" ]; then
  exit 0
fi

# Only inject review context when the subagent is actually doing a review
if ! echo "$AGENT_DESC $AGENT_PROMPT" | grep -iqE 'review|audit|disposition|finding|cross.?review|self.?review'; then
  exit 0
fi

# Authorize disposition writes for this subagent.
# pre-agent-review-auth.sh sets this when the parent spawns via Agent tool,
# but when a reviewer is invoked directly (e.g. the top-level agent IS the
# reviewer), the parent hook never fires.  Touch it here so both paths work.
AUTH_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/.review-write-authorized"
touch "$AUTH_FILE"

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

# SubagentStart: stdout is injected as raw text into subagent context
cat << EOF
$EVAL_TEMPLATE

## Current Context
Bead: $CURRENT_BEAD
Changed files:
$FILES_CHANGED

Diff summary:
$DIFF_STAT
EOF
