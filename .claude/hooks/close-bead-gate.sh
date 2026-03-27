#!/usr/bin/env bash
set -euo pipefail

# Close-bead gate — blocks `br close` unless integration tests were run recently.
# Prevents premature bead closure without real end-to-end verification.
#
# Hook: PreToolUse[Bash]
# Exit 0 = allow, Exit 2 = block
#
# Checks for an .integration-stamp file. The stamp must be < 10 min old.

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0

# Only gate br close commands
if ! echo "$CMD" | grep -Eq 'br\s+close'; then
  exit 0
fi

STAMP="${CLAUDE_PROJECT_DIR:-.}/.claude/.integration-stamp"

if [ ! -f "$STAMP" ]; then
  echo "BLOCKED: No integration stamp found. Before closing a bead:" >&2
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

# Check stamp age (600 seconds = 10 minutes)
if [ "$(uname)" = "Darwin" ]; then
  STAMP_MOD=$(stat -f %m "$STAMP")
else
  STAMP_MOD=$(stat -c %Y "$STAMP")
fi
NOW=$(date +%s)
STAMP_AGE=$(( NOW - STAMP_MOD ))

if [ "$STAMP_AGE" -gt 600 ]; then
  echo "BLOCKED: Integration stamp is stale (${STAMP_AGE}s old, max 600s)." >&2
  echo "Re-run your integration test and touch .claude/.integration-stamp" >&2
  exit 2
fi

exit 0
