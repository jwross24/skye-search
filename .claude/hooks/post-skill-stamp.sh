#!/usr/bin/env bash
set -euo pipefail

# Post-skill stamp — records when enforced skills are invoked.
# Gate hooks check these stamps before allowing git commit.
#
# Hook: PostToolUse[Skill]

source "$(dirname "$0")/_stamp-helpers.sh"

INPUT=$(cat)
init_session_id "$INPUT"

SKILL=$(printf '%s' "$INPUT" | jq -r '.tool_input.skill // ""' 2>/dev/null) || exit 0

case "$SKILL" in
  impeccable)
    touch_bead_stamp "impeccable"
    ;;
  resend)
    touch_bead_stamp "resend"
    ;;
  humanizer)
    touch_bead_stamp "humanizer"
    ;;
  context7-mcp)
    touch_bead_stamp "context7"
    ;;
esac

exit 0
