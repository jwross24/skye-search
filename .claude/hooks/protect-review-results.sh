#!/usr/bin/env bash
# PreToolUse[Bash|Write|Edit] — block direct writes to protected hook files.
# These files must be written by PostToolUse stamp hooks (shell hooks that
# bypass PreToolUse entirely) or by Agent-tool subagents, not by direct
# Write/Edit/Bash tool calls from the LLM.
#
# Protected files:
#   .cross-review-results.json — written by PostToolUse[Agent] hook
#   .review-disposition-*      — written by the self-review subagent
#   .{stamp}-bead-*            — written by post-*-stamp.sh PostToolUse hooks
#                                 (impeccable, agent-browser, resend, humanizer,
#                                 context7, golden-set, verify, integration,
#                                 self-review)
#
# Why: A subagent could `touch .claude/.impeccable-bead-XX` to bypass the
# commit gate that checks stamp existence. This hook makes that touch
# visible and blocked before it lands.
#
# Exit 0 = allow, Exit 2 = block

INPUT=$(cat)
TOOL=$(printf '%s' "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null) || exit 0

CROSS_REVIEW_PATTERN='cross-review-results\.json'
DISPOSITION_PATTERN='review-disposition-'
# Matches .{name}-bead-{bead-id} stamp files under .claude/
# Non-greedy so it doesn't accidentally match unrelated files.
STAMP_PATTERN='\.claude/\.[a-z0-9_-]+-bead-[a-z0-9-]+'
AUTH_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/.review-write-authorized"
AUTH_TTL=1800  # seconds (30 min — enough for a thorough review)

# Human-readable block message for stamp bypass attempts
stamp_block_message() {
  echo "BLOCKED: Stamp files under .claude/ are written by PostToolUse hooks, not directly." >&2
  echo "" >&2
  echo "  Stamps like .impeccable-bead-*, .agent-browser-bead-*, .verify-stamp-* are" >&2
  echo "  created automatically when the real skill or command runs. Touching them" >&2
  echo "  directly defeats the check the stamp was designed to enforce." >&2
  echo "" >&2
  echo "  → Actually invoke the skill (e.g. use the Skill tool with 'impeccable')" >&2
  echo "  → Or actually run the command (e.g. agent-browser, bun run verify)" >&2
}

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
    # Stamp files: block any command that touches/writes/copies to a stamp path
    # Catches: touch .claude/.impeccable-bead-XX, echo > path, cp src dst, mv src dst
    # Does NOT catch exotic paths (node -e, python -c) — those are a known gap.
    if echo "$CMD" | grep -qE "(touch|>|tee|cp |mv ).*($STAMP_PATTERN)"; then
      stamp_block_message
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
    # Stamp files: never writable via Write tool
    if echo "$FILE" | grep -qE "$STAMP_PATTERN"; then
      stamp_block_message
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
    # Disposition files: Edit blocked unless authorized (same rule as Write)
    # The implementing agent must not be able to weaken findings from the review subagent.
    if echo "$FILE" | grep -qE "$DISPOSITION_PATTERN"; then
      if is_disposition_authorized; then
        exit 0  # Authorized subagent window
      fi
      echo "BLOCKED: Review disposition files are written by subagents, not directly." >&2
      echo "  → Spawn a self-review subagent via the Agent tool." >&2
      exit 2
    fi
    # Stamp files: never editable via Edit tool
    if echo "$FILE" | grep -qE "$STAMP_PATTERN"; then
      stamp_block_message
      exit 2
    fi
    ;;
esac

exit 0
