#!/usr/bin/env bash
set -euo pipefail

# Cross-review enforcer — blocks bv --robot-next and br update --status in_progress
# when 3+ beads have been closed (globally, across all agents) without a cross-review.
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

COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)

if [ "$COUNT" -lt 3 ]; then
  exit 0
fi

# Counter >= 3. The cross-review script resets the counter when done.
# No time window — purely counter-based.

echo "BLOCKED: Cross-agent review is due ($COUNT beads closed since last review)." >&2
echo "" >&2
echo "  Run the independent review:" >&2
echo "    bash scripts/cross-review.sh" >&2
echo "" >&2
echo "  This runs claude -p (Sonnet, independent session) on the last 3 commits." >&2
echo "  Fix any CRITICAL/HIGH findings before picking the next bead." >&2
exit 2
