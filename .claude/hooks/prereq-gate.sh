#!/usr/bin/env bash
# PreToolUse:Bash hook — blocks bv/br commands if prerequisites aren't met.
# Runs check-prereqs.sh and stamps success. Re-checks every 30 minutes.

set -euo pipefail

source "$(dirname "$0")/_stamp-helpers.sh"

# Only trigger on bead workflow commands
INPUT=$(cat)
init_session_id "$INPUT"

COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")

# Match bv and br commands (but not br search, br list which are read-only)
if ! echo "$COMMAND" | grep -qE "^(bv |br update |br close |br create )"; then
  exit 0
fi

# Check if stamp is fresh enough (30 min TTL)
if stamp_is_fresh "prereq" 1800; then
  exit 0
fi

# Run prereq check
if bash "$CLAUDE_PROJECT_DIR/scripts/check-prereqs.sh" 2>&1; then
  touch_stamp "prereq"
  exit 0
else
  echo "BLOCKED: Prerequisites not met. Run 'bash scripts/check-prereqs.sh' to see details."
  exit 2
fi
