#!/usr/bin/env bash
set -euo pipefail

# Agent-browser gate — blocks git commit on UI beads unless agent-browser
# was used in this session.
#
# "UI bead" = commit message contains "br-" AND staged files include .tsx
#
# Hook: PreToolUse[Bash]
# Exit 0 = allow, Exit 2 = block

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0

# Only gate git commit commands
if ! echo "$CMD" | grep -Eq 'git\s+commit'; then
  exit 0
fi

# Only gate bead commits (contain "br-" in the message)
if ! echo "$CMD" | grep -Eq 'br-'; then
  exit 0
fi

# Check if any staged files are .tsx
STAGED_TSX=$(git diff --cached --name-only 2>/dev/null | grep -c '\.tsx$' || true)
if [ "$STAGED_TSX" = "0" ]; then
  exit 0  # No .tsx files staged — not a UI bead
fi

# This is a UI bead commit — check for agent-browser stamp
STAMP="${CLAUDE_PROJECT_DIR:-.}/.claude/.agent-browser-stamp"
if [ ! -f "$STAMP" ]; then
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
  echo "BLOCKED: Agent-browser stamp is stale (${STAMP_AGE}s old, max 600s). Re-run agent-browser verification." >&2
  exit 2
fi

exit 0
