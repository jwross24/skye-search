#!/usr/bin/env bash
# PreToolUse[Bash|Write|Edit] — block direct writes to cross-review results file.
# Only the PostToolUse[Agent] harness hook should write this file.
#
# Exit 0 = allow, Exit 2 = block

INPUT=$(cat)
TOOL=$(printf '%s' "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null) || exit 0

case "$TOOL" in
  Bash)
    CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0
    # Only block actual write operations (>, >>, tee, cp, mv, echo...>), not reads or mentions
    if echo "$CMD" | grep -qE '(>|tee|cp |mv ).*cross-review-results\.json'; then
      echo "BLOCKED: .cross-review-results.json is written by the harness hook, not directly." >&2
      echo "  Spawn a cross-review subagent via the Agent tool instead." >&2
      exit 2
    fi
    ;;
  Write|Edit)
    FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""' 2>/dev/null) || exit 0
    if echo "$FILE" | grep -q 'cross-review-results\.json'; then
      echo "BLOCKED: .cross-review-results.json is written by the harness hook, not directly." >&2
      echo "  Spawn a cross-review subagent via the Agent tool instead." >&2
      exit 2
    fi
    ;;
esac

exit 0
