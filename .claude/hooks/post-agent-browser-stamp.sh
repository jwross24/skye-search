#!/usr/bin/env bash
set -euo pipefail

# Post-agent-browser stamp — records when agent-browser was used.
# The agent-browser-gate.sh hook checks this stamp before allowing
# git commit on UI beads (commits with .tsx files).
#
# Hook: PostToolUse[Bash]

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0

# Stamp when agent-browser is invoked
if echo "$CMD" | grep -Eq 'agent-browser'; then
  touch "${CLAUDE_PROJECT_DIR:-.}/.claude/.agent-browser-stamp"
fi

exit 0
