#!/usr/bin/env bash
set -euo pipefail

# Cross-review gate — after every 3 bead closures, blocks the next br close
# (or bv --robot-next) until a cross-review is completed.
#
# Hook: PostToolUse[Bash]
# Exit 0 = allow (always, this is PostToolUse — the action already happened)
# Instead, outputs a system message reminding the agent to do a cross-review.

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0

# Only track br close commands
if ! echo "$CMD" | grep -Eq 'br\s+close'; then
  exit 0
fi

COUNTER_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/.bead-close-count"
REVIEW_STAMP="${CLAUDE_PROJECT_DIR:-.}/.claude/.cross-review-stamp"

# Increment counter
COUNT=0
if [ -f "$COUNTER_FILE" ]; then
  COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
fi
COUNT=$((COUNT + 1))
echo "$COUNT" > "$COUNTER_FILE"

# Check if cross-review is due
if [ "$COUNT" -ge 3 ]; then
  # Check if a recent cross-review was done
  if [ -f "$REVIEW_STAMP" ]; then
    if [ "$(uname)" = "Darwin" ]; then
      STAMP_MOD=$(stat -f %m "$REVIEW_STAMP")
    else
      STAMP_MOD=$(stat -c %Y "$REVIEW_STAMP")
    fi
    NOW=$(date +%s)
    STAMP_AGE=$(( NOW - STAMP_MOD ))
    # If cross-review was done in the last 30 min, reset counter
    if [ "$STAMP_AGE" -lt 1800 ]; then
      echo "0" > "$COUNTER_FILE"
      exit 0
    fi
  fi

  # Cross-review is due — output reminder as JSON
  cat <<'REMIND'
{"systemMessage":"⚠️ CROSS-REVIEW DUE: You've closed 3+ beads since the last cross-agent review. Before starting the next bead, spin up a review agent to check recently changed files for bugs, type errors, missing error handling, inconsistent patterns, and untested edge cases. Touch .claude/.cross-review-stamp when done."}
REMIND
fi

exit 0
