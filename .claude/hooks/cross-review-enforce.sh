#!/usr/bin/env bash
set -euo pipefail

# Cross-review enforcer — blocks bv --robot-next and br update --status in_progress
# when 3+ beads have been closed (globally, across all agents) without a cross-review.
#
# Enforcement: the counter resets ONLY when a fresh cross-review results file exists
# (.claude/.cross-review-results.json, < 10 min old). The agent cannot bypass this
# by writing "0" to the counter — the results file must exist with actual review content.
#
# Hook: PreToolUse[Bash]
# Exit 0 = allow, Exit 2 = block

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0

# Only gate bead-starting commands
if ! echo "$CMD" | grep -Eq 'bv\s+--robot-next|br\s+update.*in_progress'; then
  exit 0
fi

# Global counter (shared across agents — review resets it to 0)
COUNTER_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/.bead-close-count-global"
RESULTS_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/.cross-review-results.json"

COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)

if [ "$COUNT" -lt 3 ]; then
  exit 0
fi

# Counter >= 3. Check if a fresh cross-review results file exists.
# If it does and is < 30 min old, the review happened — reset counter and allow.
if [ -f "$RESULTS_FILE" ]; then
  if [ "$(uname)" = "Darwin" ]; then
    RESULTS_MOD=$(stat -f %m "$RESULTS_FILE")
  else
    RESULTS_MOD=$(stat -c %Y "$RESULTS_FILE")
  fi
  NOW=$(date +%s)
  AGE=$(( NOW - RESULTS_MOD ))

  # 10 min window — tight enough for multi-agent swarm pace
  if [ "$AGE" -le 600 ]; then
    # Fresh results exist — reset counter and allow
    echo "0" > "$COUNTER_FILE"
    exit 0
  fi
fi

echo "BLOCKED: Cross-agent review is due ($COUNT beads closed since last review)." >&2
echo "" >&2
echo "  Spawn a cross-review subagent with the Agent tool:" >&2
echo "    Prompt: 'Review the last 3-5 commits for CRITICAL/HIGH issues. Run git diff HEAD~N..HEAD." >&2
echo "    Then write findings to .claude/.cross-review-results.json'" >&2
echo "" >&2
echo "  Or from a manual terminal (NOT inside Claude Code):" >&2
echo "    bash scripts/cross-review.sh" >&2
echo "" >&2
echo "  Fix any CRITICAL/HIGH findings before picking the next bead." >&2
exit 2
