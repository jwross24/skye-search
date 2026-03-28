#!/usr/bin/env bash
set -euo pipefail

# Agent-browser gate — blocks git commit on UI beads unless agent-browser
# was used in this session.
#
# "UI bead" = commit message contains "br-" AND staged files include .tsx
#
# Hook: PreToolUse[Bash]
# Exit 0 = allow, Exit 2 = block

source "$(dirname "$0")/_stamp-helpers.sh"

INPUT=$(cat)
init_session_id "$INPUT"

CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0

# Only gate git commit commands
if ! echo "$CMD" | grep -Eq 'git\s+commit'; then
  exit 0
fi

# Only gate bead commits (contain "br-" in the message)
if ! echo "$CMD" | grep -Eq 'br-'; then
  exit 0
fi

# Check if any .tsx files are being committed.
# Two paths: (1) already staged via earlier git add, or (2) staged in the same command (git add ... && git commit)
STAGED_TSX=$(git diff --cached --name-only 2>/dev/null | grep -c '\.tsx$' || true)
CMD_TSX=$(echo "$CMD" | grep -c '\.tsx' || true)
if [ "$STAGED_TSX" = "0" ] && [ "$CMD_TSX" = "0" ]; then
  exit 0  # No .tsx files staged or in the command — not a UI bead
fi

# This is a UI bead commit — check for agent-browser stamp (10 min TTL)
if stamp_is_fresh "agent-browser" 600; then
  exit 0
fi

cat >&2 <<'MSG'
BLOCKED: UI bead detected but agent-browser verification was not run.

The bead checklist requires visual verification for UI beads:
  1. agent-browser --session-name skye open http://localhost:3000/<route>
  2. agent-browser wait --load networkidle
  3. agent-browser snapshot -i
  4. Interact and verify
  5. agent-browser errors
  6. agent-browser close

Run agent-browser before committing.
MSG
exit 2
