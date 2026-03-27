#!/usr/bin/env bash
set -euo pipefail

# Post-skill stamp — records when enforced skills are invoked.
# Gate hooks check these stamps before allowing git commit.
#
# Hook: PostToolUse[Skill]

INPUT=$(cat)
SKILL=$(printf '%s' "$INPUT" | jq -r '.tool_input.skill // ""' 2>/dev/null) || exit 0

DIR="${CLAUDE_PROJECT_DIR:-.}/.claude"

case "$SKILL" in
  impeccable)
    touch "$DIR/.impeccable-stamp"
    ;;
  resend)
    touch "$DIR/.resend-stamp"
    ;;
esac

exit 0
