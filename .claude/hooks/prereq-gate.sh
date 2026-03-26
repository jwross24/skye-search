#!/usr/bin/env bash
# PreToolUse:Bash hook — blocks bv/br commands if prerequisites aren't met.
# Runs check-prereqs.sh and stamps success. Re-checks every 30 minutes.

set -euo pipefail

STAMP_FILE="$CLAUDE_PROJECT_DIR/.claude/.prereq-stamp"
MAX_AGE=1800  # 30 minutes

# Only trigger on bead workflow commands
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")

# Match bv and br commands (but not br search, br list which are read-only)
if ! echo "$COMMAND" | grep -qE "^(bv |br update |br close |br create )"; then
  exit 0
fi

# Check if stamp is fresh enough
if [ -f "$STAMP_FILE" ]; then
  STAMP_AGE=$(( $(date +%s) - $(stat -f %m "$STAMP_FILE" 2>/dev/null || stat -c %Y "$STAMP_FILE" 2>/dev/null || echo 0) ))
  if [ "$STAMP_AGE" -lt "$MAX_AGE" ]; then
    exit 0  # Recent stamp, allow
  fi
fi

# Run prereq check
if bash "$CLAUDE_PROJECT_DIR/scripts/check-prereqs.sh" 2>&1; then
  touch "$STAMP_FILE"
  exit 0
else
  echo "BLOCKED: Prerequisites not met. Run 'bash scripts/check-prereqs.sh' to see details."
  exit 2
fi
