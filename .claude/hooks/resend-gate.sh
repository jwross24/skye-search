#!/usr/bin/env bash
set -euo pipefail

# Resend gate — blocks git commit on email beads unless /resend skill was
# invoked in this session.
#
# "Email bead" = commit message contains "br-" AND staged files touch email infra
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

# Check if any staged files are email-related
STAGED_EMAIL=$(git diff --cached --name-only 2>/dev/null | grep -cE '(email-templates/|email-alerts|resend)' || true)
if [ "$STAGED_EMAIL" = "0" ]; then
  exit 0  # No email files staged
fi

# Email files staged — check for resend stamp
STAMP="${CLAUDE_PROJECT_DIR:-.}/.claude/.resend-stamp"
if [ ! -f "$STAMP" ]; then
  cat >&2 <<'MSG'
BLOCKED: Email files staged but /resend skill was not invoked.

The bead checklist requires /resend skill for email-related work.
Run:  /resend
MSG
  exit 2
fi

# Check stamp age (300 seconds = 5 minutes)
if [ "$(uname)" = "Darwin" ]; then
  STAMP_MOD=$(stat -f %m "$STAMP")
else
  STAMP_MOD=$(stat -c %Y "$STAMP")
fi
NOW=$(date +%s)
STAMP_AGE=$(( NOW - STAMP_MOD ))

if [ "$STAMP_AGE" -gt 300 ]; then
  echo "BLOCKED: Resend stamp is stale (${STAMP_AGE}s old, max 300s). Re-run /resend." >&2
  exit 2
fi

exit 0
