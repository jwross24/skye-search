#!/usr/bin/env bash
set -euo pipefail

# Close-bead gate — blocks `br close` unless integration tests were run recently.
# Session-scoped: each agent must run its own integration test.
#
# Hook: PreToolUse[Bash]
# Exit 0 = allow, Exit 2 = block

source "$(dirname "$0")/_stamp-helpers.sh"

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0
init_session_id "$INPUT"

# Only gate actual br close commands (check first line only, not heredoc body)
FIRST_LINE=$(echo "$CMD" | head -1)
if ! echo "$FIRST_LINE" | grep -Eq '^br\s+close|;\s*br\s+close|&&\s*br\s+close'; then
  exit 0
fi

if ! stamp_is_fresh "integration" 600; then
  echo "BLOCKED: No fresh integration stamp for this session." >&2
  echo "" >&2
  echo "  1. Run the relevant integration test:" >&2
  echo "     - Edge Functions: supabase functions serve + curl" >&2
  echo "     - Database RPCs: supabase db query --local" >&2
  echo "     - UI beads: agent-browser snapshot" >&2
  echo "     - API routes: curl against dev server" >&2
  echo "  2. Then run: touch .claude/.integration-stamp" >&2
  echo "  3. Then: br close <id>" >&2
  echo "" >&2
  echo "  Or if this bead has no integration test (docs-only, config-only):" >&2
  echo "     touch .claude/.integration-stamp && br close <id>" >&2
  exit 2
fi

exit 0
