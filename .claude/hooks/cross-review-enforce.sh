#!/usr/bin/env bash
set -euo pipefail

# Cross-review enforcer — blocks bv --robot-next and br update --status in_progress
# when 3+ beads have been closed without a cross-review.
#
# Hook: PreToolUse[Bash]
# Exit 0 = allow, Exit 2 = block

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0

# Only gate bead-starting commands
if ! echo "$CMD" | grep -Eq 'bv\s+--robot-next|br\s+update.*in_progress'; then
  exit 0
fi

COUNTER_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/.bead-close-count"
REVIEW_STAMP="${CLAUDE_PROJECT_DIR:-.}/.claude/.cross-review-stamp"

# Check counter
COUNT=0
if [ -f "$COUNTER_FILE" ]; then
  COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
fi

if [ "$COUNT" -lt 3 ]; then
  exit 0
fi

# Counter >= 3. Check for recent cross-review.
if [ -f "$REVIEW_STAMP" ]; then
  if [ "$(uname)" = "Darwin" ]; then
    STAMP_MOD=$(stat -f %m "$REVIEW_STAMP")
  else
    STAMP_MOD=$(stat -c %Y "$REVIEW_STAMP")
  fi
  NOW=$(date +%s)
  STAMP_AGE=$(( NOW - STAMP_MOD ))
  if [ "$STAMP_AGE" -lt 1800 ]; then
    # Reset counter since review was done
    echo "0" > "$COUNTER_FILE"
    exit 0
  fi
fi

echo "BLOCKED: Cross-agent review is due ($COUNT beads closed since last review)." >&2
echo "" >&2
echo "  Run the independent review:" >&2
echo "    bash scripts/cross-review.sh" >&2
echo "" >&2
echo "  This runs claude -p (Haiku, independent session) on the last 3 commits." >&2
echo "  Fix any CRITICAL/HIGH findings before picking the next bead." >&2
exit 2
