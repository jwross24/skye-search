#!/usr/bin/env bash
set -euo pipefail

# Post-impeccable stamp — records when /impeccable skill was invoked.
# The impeccable-gate.sh hook checks this stamp before allowing
# git commit on beads with .tsx files.
#
# Hook: PostToolUse[Skill]

INPUT=$(cat)
SKILL=$(printf '%s' "$INPUT" | jq -r '.tool_input.skill // ""' 2>/dev/null) || exit 0

# Stamp when impeccable skill is invoked
if [ "$SKILL" = "impeccable" ]; then
  touch "${CLAUDE_PROJECT_DIR:-.}/.claude/.impeccable-stamp"
fi

exit 0
