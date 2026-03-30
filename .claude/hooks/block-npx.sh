#!/usr/bin/env bash
# Block npx — this project uses bun (bunx) as its package manager.
# Hook: PreToolUse[Bash] with if: Bash(*npx *)

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0

# Only block if command starts with npx or contains " npx " (not just substring matches like "stnpx")
if echo "$CMD" | head -1 | grep -qE '^\s*npx\s|&&\s*npx\s|\|\s*npx\s'; then
  echo "BLOCKED: Use bunx instead of npx. This project uses bun." >&2
  echo "" >&2
  echo "  Replace: npx <command>" >&2
  echo "  With:    bunx <command>" >&2
  exit 2
fi

exit 0
