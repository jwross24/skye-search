#!/usr/bin/env bash
set -euo pipefail

# Post-verify stamp — creates a timestamp file when bun run verify succeeds.
# The pre-commit-gate.sh hook checks this stamp before allowing git commit.
#
# Hook: PostToolUse[Bash] (only fires on exit code 0)

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0

# Match "bun run verify" or "bun run build && bun run lint && bun run test"
if echo "$CMD" | grep -Eq 'bun\s+run\s+verify'; then
  touch "${CLAUDE_PROJECT_DIR:-.}/.claude/.verify-stamp"
fi

exit 0
