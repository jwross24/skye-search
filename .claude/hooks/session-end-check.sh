#!/usr/bin/env bash
set -euo pipefail

# Stop hook — runs when the session ends.
# Checks for dangling state that could cause problems.
#
# Hook: Stop
# Outputs systemMessage JSON with warnings.

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
WARNINGS=""

# Check for beads left in_progress
IN_PROGRESS=$(br list --limit 0 --json 2>/dev/null | jq -r '[.[] | select(.status == "in_progress")] | length' 2>/dev/null || echo "0")
if [ "$IN_PROGRESS" -gt 0 ]; then
  BEADS=$(br list --limit 0 --json 2>/dev/null | jq -r '[.[] | select(.status == "in_progress")] | .[].id' 2>/dev/null || echo "unknown")
  WARNINGS="${WARNINGS}⚠️ $IN_PROGRESS bead(s) left in_progress: $BEADS. Release or close before leaving.\n"
fi

# Check for uncommitted changes
DIRTY=$(git -C "$PROJECT_DIR" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [ "$DIRTY" -gt 0 ]; then
  WARNINGS="${WARNINGS}⚠️ $DIRTY uncommitted file(s). Commit or stash before leaving.\n"
fi

if [ -n "$WARNINGS" ]; then
  # Escape for JSON
  ESCAPED=$(printf '%s' "$WARNINGS" | sed 's/"/\\"/g' | tr '\n' ' ')
  echo "{\"systemMessage\":\"SESSION END WARNINGS:\\n${ESCAPED}\"}"
fi

exit 0
