#!/usr/bin/env bash
# PostToolUse[Bash] — track which beads THIS session claimed (in_progress).
# Used by session-end-check.sh to only warn about beads we own.
#
# Output: .claude/.session-beads-${SESSION_ID}.txt (one bead ID per line)
#
# Must be FAST (<20ms) — regex match on command string, no external calls.

set -euo pipefail

INPUT=$(cat)

# Only care about Bash tool
TOOL=$(printf '%s' "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null) || exit 0
[ "$TOOL" = "Bash" ] || exit 0

CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0

# Detect: br update <id> --status in_progress
# Patterns: "br update skye-search-xxx --status in_progress"
if printf '%s' "$CMD" | grep -qE 'br update [a-z0-9-]+ --status in_progress'; then
  BEAD_ID=$(printf '%s' "$CMD" | grep -oE 'br update ([a-z0-9-]+)' | awk '{print $3}')
  [ -z "$BEAD_ID" ] && exit 0
  [ -z "${CLAUDE_PROJECT_DIR:-}" ] && exit 0

  SESSION_ID=$(printf '%s' "$INPUT" | jq -r '.session_id // "default"' 2>/dev/null) || SESSION_ID="default"
  CLAIM_FILE="${CLAUDE_PROJECT_DIR}/.claude/.session-beads-${SESSION_ID}.txt"

  # Append if not already tracked
  if ! grep -qxF "$BEAD_ID" "$CLAIM_FILE" 2>/dev/null; then
    printf '%s\n' "$BEAD_ID" >> "$CLAIM_FILE"
  fi

  # Save base commit so check-marching-compliance.sh can diff precisely
  BASE_COMMIT=$(git -C "${CLAUDE_PROJECT_DIR}" rev-parse HEAD 2>/dev/null || true)
  if [ -n "$BASE_COMMIT" ]; then
    printf '%s' "$BASE_COMMIT" > "${CLAUDE_PROJECT_DIR}/.claude/.bead-base-commit-${BEAD_ID}"
  fi

  # Write current-bead file so stamp hooks can create bead-scoped stamps
  printf '%s' "$BEAD_ID" > "${CLAUDE_PROJECT_DIR}/.claude/.current-bead-${SESSION_ID}"

  # Inject marching orders reminder
  cat <<'REMINDER'
{"systemMessage":"MARCHING ORDERS REMINDER for this bead:\n\n□ Read full spec: br show <id>\n□ cm context for relevant rules\n□ Context7 for any library APIs\n□ Write tests ALONGSIDE code (not after)\n□ /impeccable on ANY .tsx changes (no exceptions)\n□ Integration tests for DB/API code (real Supabase, not mocks)\n□ Golden set regression for scoring changes (ai-scoring.ts, urgency-scoring.ts)\n□ agent-browser E2E for UI changes\n□ Self-review via SEPARATE subagent\n□ bun run verify before commit\n□ Create beads for ALL deferred findings (boy scout rule)\n\nThe close-bead-gate WILL BLOCK if you skip /impeccable, agent-browser, golden set, or integration tests."}
REMINDER
fi

exit 0
