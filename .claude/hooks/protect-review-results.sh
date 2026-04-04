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

CROSS_REVIEW_PATTERN='cross-review-results\.json'
DISPOSITION_PATTERN='review-disposition-'
AUTH_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/.review-write-authorized"
AUTH_TTL=300  # seconds

# Check if disposition write is authorized (stamp set by pre-agent-review-auth.sh)
is_disposition_authorized() {
  [ -f "$AUTH_FILE" ] || return 1
  if [ "$(uname)" = "Darwin" ]; then
    AUTH_MOD=$(stat -f %m "$AUTH_FILE")
  else
    AUTH_MOD=$(stat -c %Y "$AUTH_FILE")
  fi
  NOW=$(date +%s)
  AGE=$(( NOW - AUTH_MOD ))
  [ "$AGE" -le "$AUTH_TTL" ]
}

case "$TOOL" in
  Bash)
    CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0
    # Cross-review results: always blocked
    if echo "$CMD" | grep -qE "(>|tee|cp |mv ).*($CROSS_REVIEW_PATTERN)"; then
      echo "BLOCKED: Cross-review results are written by the harness hook, not directly." >&2
      exit 2
    fi
    # Disposition files: blocked unless authorized by pre-agent-review-auth stamp
    if echo "$CMD" | grep -qE "(>|tee|cp |mv ).*($DISPOSITION_PATTERN)"; then
      if is_disposition_authorized; then
        exit 0  # Authorized subagent window
      fi
      echo "BLOCKED: Review disposition files are written by subagents, not directly." >&2
      echo "  → Spawn a self-review subagent via the Agent tool." >&2
      exit 2
    fi
    ;;
  Write)
    FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""' 2>/dev/null) || exit 0
    # Cross-review results: always blocked
    if echo "$FILE" | grep -qE "$CROSS_REVIEW_PATTERN"; then
      echo "BLOCKED: Cross-review results are written by the harness hook, not directly." >&2
      exit 2
    fi
    # Disposition files: Write blocked unless authorized (subagent creates the review)
    if echo "$FILE" | grep -qE "$DISPOSITION_PATTERN"; then
      if is_disposition_authorized; then
        exit 0  # Authorized subagent window
      fi
      echo "BLOCKED: Review disposition files are written by subagents, not directly." >&2
      echo "  → Spawn a self-review subagent via the Agent tool." >&2
      exit 2
    fi
    ;;
  Edit)
    FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""' 2>/dev/null) || exit 0
    # Cross-review results: always blocked
    if echo "$FILE" | grep -qE "$CROSS_REVIEW_PATTERN"; then
      echo "BLOCKED: Cross-review results are written by the harness hook, not directly." >&2
      exit 2
    fi
    # Disposition files: Edit always allowed (main context fixing validation issues)
    # The bias guard is about CREATING reviews, not fixing formatting.
    ;;
esac

exit 0
