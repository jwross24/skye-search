#!/usr/bin/env bash
set -euo pipefail

# PostToolUse[Agent] — validate self-review disposition after subagent completes.
#
# When an Agent tool call completes with a description matching "self-review"
# or "review" + a bead ID pattern, this hook:
#   1. Adopts orphaned disposition files (written without session prefix)
#   2. Checks if the canonical disposition file exists
#   3. Validates its structure
#
# This is EARLY FEEDBACK — close-bead-gate is still the hard enforcement point.
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
if ! echo "$DESC" | grep -qiE 'self.review|review.*skye-search|review.*disposition|review.*bead|rename.*disposition|write.*disposition'; then
  exit 0
fi

SCRIPTS_DIR="$(cd "$(dirname "$0")/../../scripts" && pwd)"
CLAUDE_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude"

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

# ── Adopt orphaned disposition files ────────────────────────────────────
# Subagents may write disposition files without the session prefix because
# they don't know the parent's session ID. Look for common patterns and
# rename to the canonical path.
#
# Patterns checked (most specific first):
#   .review-disposition-{bead_id}.json  (no session prefix)
#   .review-disposition-{short_id}.json (e.g., "k3l8" instead of "skye-search-k3l8")

CANONICAL="${CLAUDE_DIR}/.review-disposition-${_SESSION}-${BEAD_ID}.json"

if [ ! -f "$CANONICAL" ]; then
  # Try: subagent wrote with bead ID but no session
  ORPHAN="${CLAUDE_DIR}/.review-disposition-${BEAD_ID}.json"
  if [ -f "$ORPHAN" ]; then
    mv "$ORPHAN" "$CANONICAL"
  fi
fi

if [ ! -f "$CANONICAL" ]; then
  # Try: subagent used short bead ID (e.g., "k3l8" from "skye-search-k3l8")
  SHORT_ID=$(echo "$BEAD_ID" | sed 's/^skye-search-//')
  ORPHAN="${CLAUDE_DIR}/.review-disposition-${SHORT_ID}.json"
  if [ -f "$ORPHAN" ]; then
    mv "$ORPHAN" "$CANONICAL"
  fi
fi

if [ ! -f "$CANONICAL" ]; then
  # Try: subagent used session ID from the session-id hint file but different bead format
  ORPHAN_PATTERN="${CLAUDE_DIR}/.review-disposition-*-${BEAD_ID}.json"
  FOUND=$(ls $ORPHAN_PATTERN 2>/dev/null | head -1 || true)
  if [ -n "$FOUND" ] && [ "$FOUND" != "$CANONICAL" ]; then
    mv "$FOUND" "$CANONICAL"
  fi
fi

# ── Validate disposition ────────────────────────────────────────────────

if [ ! -f "$CANONICAL" ]; then
  echo "{\"systemMessage\":\"Self-review for ${BEAD_ID} completed but no disposition file found. The subagent must write to: ${CANONICAL}\"}"
  exit 0
fi

# Ensure reviewer field is set (subagent may have omitted it).
# Safe to inject because this hook ONLY fires for PostToolUse[Agent],
# so a subagent definitely wrote it.
HAS_REVIEWER=$(jq -r '.reviewer // ""' "$CANONICAL" 2>/dev/null) || HAS_REVIEWER=""
if [ -z "$HAS_REVIEWER" ]; then
  jq '.reviewer = "subagent"' "$CANONICAL" > "${CANONICAL}.tmp" && mv "${CANONICAL}.tmp" "$CANONICAL"
fi

# Validate disposition structure
RESULT=$(bash "$SCRIPTS_DIR/validate-disposition.sh" "$CANONICAL" 2>/dev/null) || RESULT='{"pass":false,"error":"validation crashed"}'
PASS=$(printf '%s' "$RESULT" | jq -r '.pass // false' 2>/dev/null) || PASS="false"

if [ "$PASS" = "true" ]; then
  FINDING_COUNT=$(jq '.findings | length' "$CANONICAL" 2>/dev/null) || FINDING_COUNT=0
  echo "{\"systemMessage\":\"✓ Self-review disposition validated for ${BEAD_ID}: ${FINDING_COUNT} findings, all properly dispositioned. Ready for br close.\"}"
else
  ERROR=$(printf '%s' "$RESULT" | jq -r '.error // "unknown validation error"' 2>/dev/null) || ERROR="unknown"
  echo "{\"systemMessage\":\"Self-review disposition for ${BEAD_ID} is INVALID: ${ERROR}. Fix the disposition file before closing.\"}"
fi

exit 0
