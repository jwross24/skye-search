#!/usr/bin/env bash
set -euo pipefail

# Impeccable gate — blocks git commit on UI beads unless /impeccable was
# invoked in this session.
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

# Check if any staged files are .tsx
STAGED_TSX=$(git diff --cached --name-only 2>/dev/null | grep -c '\.tsx$' || true)
if [ "$STAGED_TSX" = "0" ]; then
  exit 0  # No .tsx files staged — not a UI bead
fi

# This is a UI bead with .tsx files — check for impeccable stamp (5 min TTL)
if stamp_is_fresh "impeccable" 300; then
  exit 0
fi

cat >&2 <<'MSG'
BLOCKED: .tsx files staged but /impeccable skill was not invoked.

The bead checklist requires /impeccable on ALL .tsx files. No exceptions.
Run:  /impeccable <path-to-tsx-files>
MSG
exit 2
