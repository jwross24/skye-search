#!/usr/bin/env bash
# PreToolUse[Bash|Write|Edit] — block direct writes to protected review files.
# These files must be written by subagents (via Agent tool), not the implementing agent.
#
# Protected files:
#   .cross-review-results.json — written by PostToolUse[Agent] hook
#   .review-disposition-* — written by the self-review subagent
#
# Exit 0 = allow, Exit 2 = block

INPUT=$(cat)
TOOL=$(printf '%s' "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null) || exit 0

PROTECTED_PATTERN='cross-review-results\.json|review-disposition-'

case "$TOOL" in
  Bash)
    CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0
    # Only block actual write operations, not reads or mentions
    if echo "$CMD" | grep -qE "(>|tee|cp |mv ).*($PROTECTED_PATTERN)"; then
      echo "BLOCKED: Review files are written by subagents, not directly." >&2
      echo "  Spawn a self-review subagent via the Agent tool." >&2
      echo "  The subagent writes the disposition file." >&2
      exit 2
    fi
    ;;
  Write|Edit)
    FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""' 2>/dev/null) || exit 0
    if echo "$FILE" | grep -qE "$PROTECTED_PATTERN"; then
      echo "BLOCKED: Review files are written by subagents, not directly." >&2
      echo "  Spawn a self-review subagent via the Agent tool." >&2
      echo "  The subagent writes the disposition file." >&2
      exit 2
    fi
    ;;
esac

exit 0
