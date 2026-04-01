#!/usr/bin/env bash
set -euo pipefail

# PreToolUse[Agent] — authorize disposition file writes for self-review subagents.
#
# When the parent spawns a self-review Agent, this hook:
#   1. Sets a short-lived GLOBAL stamp that protect-review-results.sh checks
#   2. Writes the parent's session ID to a well-known file so subagents can
#      name disposition files correctly ({session}-{bead}.json)
#
# The stamp is GLOBAL (not session-scoped) because the subagent has a
# different session ID than the parent.
#
# Hook: PreToolUse[Agent]
# Exit 0 = allow (always — this hook authorizes, never blocks)

source "$(dirname "$0")/_stamp-helpers.sh"

INPUT=$(cat)
init_session_id "$INPUT"
DESC=$(printf '%s' "$INPUT" | jq -r '.tool_input.description // ""' 2>/dev/null) || exit 0

# Only authorize for self-review agents (not cross-review)
if echo "$DESC" | grep -qi 'cross.review'; then
  exit 0
fi

if ! echo "$DESC" | grep -qiE 'self.review|review.*skye-search|review.*disposition|review.*bead|rename.*disposition|write.*disposition'; then
  exit 0
fi

# Set global authorization stamp (300s TTL — long enough for complex reviews)
AUTH_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/.review-write-authorized"
touch "$AUTH_FILE"

# Write parent session ID so subagents can construct the canonical disposition path
# Format: plain text, single line, no newline ambiguity
SESSION_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/.review-session-id"
printf '%s' "$_SESSION" > "$SESSION_FILE"

exit 0
