#!/usr/bin/env bash
set -euo pipefail

# PostToolUse[Agent] — validate self-review disposition after subagent completes.
#
# When an Agent tool call completes with a description matching "self-review"
# or "review" + a bead ID pattern, this hook checks if the disposition file
# was written and validates its structure.
#
# This is EARLY FEEDBACK — close-bead-gate is still the hard enforcement point.
# The capture hook saves the agent a round-trip to discover invalid dispositions.
#
# Hook: PostToolUse[Agent]

source "$(dirname "$0")/_stamp-helpers.sh"

INPUT=$(cat)
init_session_id "$INPUT"

DESC=$(printf '%s' "$INPUT" | jq -r '.tool_input.description // ""' 2>/dev/null) || exit 0

# Only match self-review agents (not cross-review — handled by post-cross-review-capture.sh)
if echo "$DESC" | grep -qi 'cross.review'; then
  exit 0
fi
if ! echo "$DESC" | grep -qiE 'self.review|review.*skye-search|review.*disposition|review.*bead'; then
  exit 0
fi

SCRIPTS_DIR="$(cd "$(dirname "$0")/../../scripts" && pwd)"

# Extract bead ID from description
BEAD_ID=$(echo "$DESC" | grep -oE 'skye-search-[a-z0-9]+' | head -1 || true)
if [ -z "$BEAD_ID" ]; then
  # Try to extract from response text
  RESPONSE=$(printf '%s' "$INPUT" | jq -r '.tool_response // ""' 2>/dev/null) || exit 0
  BEAD_ID=$(echo "$RESPONSE" | grep -oE 'skye-search-[a-z0-9]+' | head -1 || true)
fi

if [ -z "$BEAD_ID" ]; then
  echo '{"systemMessage":"Self-review completed but could not extract bead ID from description. Ensure Agent description includes the bead ID (e.g., skye-search-xyz)."}'
  exit 0
fi

# Check if disposition file was written
DISP_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/.review-disposition-${_SESSION}-${BEAD_ID}.json"

if [ ! -f "$DISP_FILE" ]; then
  echo "{\"systemMessage\":\"Self-review for ${BEAD_ID} completed but no disposition file found at ${DISP_FILE}. The subagent must write the disposition file before bead can be closed.\"}"
  exit 0
fi

# Validate disposition structure
RESULT=$(bash "$SCRIPTS_DIR/validate-disposition.sh" "$DISP_FILE" 2>/dev/null) || RESULT='{"pass":false,"error":"validation crashed"}'
PASS=$(printf '%s' "$RESULT" | jq -r '.pass // false' 2>/dev/null) || PASS="false"

if [ "$PASS" = "true" ]; then
  FINDING_COUNT=$(jq '.findings | length' "$DISP_FILE" 2>/dev/null) || FINDING_COUNT=0
  echo "{\"systemMessage\":\"Self-review disposition validated for ${BEAD_ID}: ${FINDING_COUNT} findings, all properly dispositioned. Ready for br close.\"}"
else
  ERROR=$(printf '%s' "$RESULT" | jq -r '.error // "unknown validation error"' 2>/dev/null) || ERROR="unknown"
  echo "{\"systemMessage\":\"Self-review disposition for ${BEAD_ID} is INVALID: ${ERROR}. Fix the disposition file before closing.\"}"
fi

exit 0
