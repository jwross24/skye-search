#!/usr/bin/env bash
set -euo pipefail

# Pre-commit gate — blocks git commit unless bun run verify passed recently.
# Uses the existing tool-use-logger.sh infrastructure to check for evidence
# of test-runner and linter passing in the current session.
#
# Hook: PreToolUse[Bash]
# Exit 0 = allow, Exit 2 = block

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0

# Only gate git commit commands
if ! echo "$CMD" | grep -Eq 'git\s+commit'; then
  exit 0
fi

# Block --no-verify
if echo "$CMD" | grep -Eq '\-\-no-verify'; then
  echo "BLOCKED: --no-verify is not allowed in this project. Fix the issue instead." >&2
  exit 2
fi

# Check for verify stamp (created by post-verify-stamp.sh)
STAMP="${CLAUDE_PROJECT_DIR:-.}/.claude/.verify-stamp"
if [ ! -f "$STAMP" ]; then
  echo "BLOCKED: No verify stamp found. Run 'bun run verify' before committing." >&2
  echo "" >&2
  echo "The bead checklist requires:" >&2
  echo "  1. bun run verify  (build + lint + test)" >&2
  echo "  2. ntm scan --diff (bug scan)" >&2
  echo "  3. git pull" >&2
  echo "  4. Then commit" >&2
  exit 2
fi

# Check stamp age (600 seconds = 10 minutes)
if [ "$(uname)" = "Darwin" ]; then
  STAMP_MOD=$(stat -f %m "$STAMP")
else
  STAMP_MOD=$(stat -c %Y "$STAMP")
fi
NOW=$(date +%s)
STAMP_AGE=$(( NOW - STAMP_MOD ))

if [ "$STAMP_AGE" -gt 600 ]; then
  echo "BLOCKED: Verify stamp is stale (${STAMP_AGE}s old, max 600s). Re-run 'bun run verify'." >&2
  exit 2
fi

exit 0
