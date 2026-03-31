#!/usr/bin/env bash
set -euo pipefail

# Block `git add .`, `git add -A`, and `git add --all` — stage specific files only.
#
# Why: Prevents accidentally staging .env, credentials, node_modules, .next, etc.
# Rule: CLAUDE.md + bead-marching-orders.md both say "NEVER git add . or git add -A"
#
# Hook: PreToolUse[Bash] with if: "Bash(*git add*)"
# Exit 0 = allow, Exit 2 = block

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0

# Match: git add . | git add -A | git add --all (with optional flags between)
if echo "$CMD" | grep -Eq 'git\s+add\s+(-[A]|--all|\.\s|\.$)'; then
  echo "BLOCKED: git add . / git add -A / git add --all is not allowed." >&2
  echo "" >&2
  echo "  Stage specific files instead:" >&2
  echo "  → git add src/lib/my-file.ts src/app/my-route/route.ts" >&2
  echo "" >&2
  echo "  Why: Prevents accidentally staging .env, credentials, or build artifacts." >&2
  exit 2
fi

exit 0
