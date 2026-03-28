#!/usr/bin/env bash
set -euo pipefail

# Pre-commit gate — blocks git commit unless bun run verify passed recently.
# Session-scoped: each agent session has its own verify stamp.
#
# Hook: PreToolUse[Bash]
# Exit 0 = allow, Exit 2 = block

source "$(dirname "$0")/_stamp-helpers.sh"

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0
init_session_id "$INPUT"

# Only gate git commit commands
if ! echo "$CMD" | grep -Eq 'git\s+commit'; then
  exit 0
fi

# Block --no-verify
if echo "$CMD" | grep -Eq '\-\-no-verify'; then
  echo "BLOCKED: --no-verify is not allowed." >&2
  echo "" >&2
  echo "  → Fix the hook issue instead of bypassing it" >&2
  exit 2
fi

# Check for session-scoped verify stamp (bun run verify now includes ntm scan)
if ! stamp_is_fresh "verify" 600; then
  echo "BLOCKED: No fresh verify stamp for this session." >&2
  echo "" >&2
  echo "  → bun run verify" >&2
  exit 2
fi

exit 0
