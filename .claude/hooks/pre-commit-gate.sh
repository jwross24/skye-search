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
  echo "BLOCKED: --no-verify is not allowed in this project. Fix the issue instead." >&2
  exit 2
fi

# Check for session-scoped verify stamp
if ! stamp_is_fresh "verify" 600; then
  echo "BLOCKED: No fresh verify stamp for this session. Run 'bun run verify' before committing." >&2
  echo "" >&2
  echo "The bead checklist requires:" >&2
  echo "  1. bun run verify  (build + lint + test)" >&2
  echo "  2. ntm scan --diff (bug scan)" >&2
  echo "  3. git pull" >&2
  echo "  4. Then commit" >&2
  exit 2
fi

exit 0
