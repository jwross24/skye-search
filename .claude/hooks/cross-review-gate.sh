#!/usr/bin/env bash
set -euo pipefail

# Cross-review gate — after every 3 bead closures (across ALL agents),
# emits a reminder to do a cross-review.
#
# GLOBAL counter (not per-session): if Agent A closes 2 and Agent B closes 1,
# that's 3 total. The review benefits all agents.
#
# Hook: PostToolUse[Bash]

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0

# Only track actual br close commands (not commit messages)
if ! echo "$CMD" | grep -Eq '^br\s+close|;\s*br\s+close|&&\s*br\s+close'; then
  exit 0
fi

# Global counter and stamp (shared across agents)
COUNTER_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/.bead-close-count-global"
REVIEW_STAMP="${CLAUDE_PROJECT_DIR:-.}/.claude/.cross-review-stamp"

# Increment counter
COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
COUNT=$((COUNT + 1))
echo "$COUNT" > "$COUNTER_FILE"

# Remind when 3+ beads closed since last review reset
if [ "$COUNT" -ge 3 ]; then
  cat <<'REMIND'
{"systemMessage":"⚠️ CROSS-REVIEW DUE: 3+ beads closed since last review. Run: bash scripts/cross-review.sh"}
REMIND
fi

exit 0
