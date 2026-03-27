#!/usr/bin/env bash
set -euo pipefail

# Resend gate — blocks git commit on email beads unless /resend skill was
# invoked in this session.
#
# "Email bead" = commit message contains "br-" AND staged files touch email infra
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

# Check if any staged files are email-related
STAGED_EMAIL=$(git diff --cached --name-only 2>/dev/null | grep -cE '(email-templates/|email-alerts|resend)' || true)
if [ "$STAGED_EMAIL" = "0" ]; then
  exit 0  # No email files staged
fi

# Email files staged — check for resend stamp (5 min TTL)
if stamp_is_fresh "resend" 300; then
  exit 0
fi

cat >&2 <<'MSG'
BLOCKED: Email files staged but /resend skill was not invoked.

The bead checklist requires /resend skill for email-related work.
Run:  /resend
MSG
exit 2
