#!/usr/bin/env bash
set -euo pipefail

# Post-verify stamp — session-scoped timestamp when bun run verify succeeds.
# Hook: PostToolUse[Bash]

source "$(dirname "$0")/_stamp-helpers.sh"

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0
init_session_id "$INPUT"

if echo "$CMD" | grep -Eq 'bun\s+run\s+verify'; then
  touch_bead_stamp "verify"
fi

exit 0
