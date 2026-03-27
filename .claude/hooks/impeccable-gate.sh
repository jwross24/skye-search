#!/usr/bin/env bash
set -euo pipefail

# Impeccable gate — blocks git commit on UI beads unless /impeccable was
# invoked in this session.
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

# This is a UI bead with .tsx files — check for impeccable stamp
STAMP="${CLAUDE_PROJECT_DIR:-.}/.claude/.impeccable-stamp"
if [ ! -f "$STAMP" ]; then
  cat >&2 <<'MSG'
BLOCKED: .tsx files staged but /impeccable skill was not invoked.

The bead checklist requires /impeccable on ALL .tsx files. No exceptions.
Run:  /impeccable <path-to-tsx-files>
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

if [ "$STAMP_AGE" -gt 300 ]; then
  echo "BLOCKED: Impeccable stamp is stale (${STAMP_AGE}s old, max 300s). Re-run /impeccable." >&2
  exit 2
fi

exit 0
