#!/usr/bin/env bash
set -euo pipefail

# Cross-review enforcer — blocks bv --robot-next and br update --status in_progress
# when 3+ beads have been closed (globally, across all agents) without a cross-review.
#
# Enforcement:
#   1. Counter tracks bead closures (incremented by cross-review-gate.sh PostToolUse)
#   2. Counter resets ONLY when a valid, fresh results file exists:
#      - .claude/.cross-review-results.json
#      - < 10 min old
#      - Valid JSON with required fields (commits_reviewed, findings array, verdict)
#      - commits_reviewed >= 1
#   3. Agent can't bypass by writing "0" to counter or writing a trivial file
#
# Hook: PreToolUse[Bash]
# Exit 0 = allow, Exit 2 = block

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0

# Only gate bead-starting commands
if ! echo "$CMD" | grep -Eq 'bv\s+--robot-next|br\s+update.*in_progress'; then
  exit 0
fi

COUNTER_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/.bead-close-count-global"
RESULTS_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/.cross-review-results.json"

COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)

if [ "$COUNT" -lt 3 ]; then
  exit 0
fi

# ── Counter >= 3: validate cross-review results file ──────────────────────

VALID=false

if [ -f "$RESULTS_FILE" ]; then
  # Check freshness (< 10 min)
  if [ "$(uname)" = "Darwin" ]; then
    RESULTS_MOD=$(stat -f %m "$RESULTS_FILE")
  else
    RESULTS_MOD=$(stat -c %Y "$RESULTS_FILE")
  fi
  NOW=$(date +%s)
  AGE=$(( NOW - RESULTS_MOD ))

  if [ "$AGE" -le 600 ]; then
    # Validate structure: must have commits_reviewed (>= 1), findings array, verdict string
    COMMITS=$(jq -r '.commits_reviewed // 0' "$RESULTS_FILE" 2>/dev/null) || COMMITS=0
    HAS_FINDINGS=$(jq -e '.findings | type == "array"' "$RESULTS_FILE" 2>/dev/null) || HAS_FINDINGS=""
    VERDICT=$(jq -r '.verdict // ""' "$RESULTS_FILE" 2>/dev/null) || VERDICT=""

    if [ "$COMMITS" -ge 1 ] && [ "$HAS_FINDINGS" = "true" ] && [ -n "$VERDICT" ]; then
      VALID=true
    fi
  fi
fi

if [ "$VALID" = "true" ]; then
  echo "0" > "$COUNTER_FILE"
  exit 0
fi

echo "BLOCKED: Cross-review is due ($COUNT beads closed since last review)." >&2
echo "" >&2
echo "  Spawn a cross-review subagent (the harness hook captures the results):" >&2
echo "" >&2
echo '  Agent tool call:' >&2
echo '    description: "Cross-review last N commits"' >&2
echo '    model: "sonnet"' >&2
echo '    prompt: "Review last 3-5 commits for CRITICAL/HIGH issues.' >&2
echo '      Run git diff HEAD~N..HEAD, read files for context. Check for bugs,' >&2
echo '      security issues, data loss, API misuse. Run bun run verify."' >&2
echo "" >&2
echo "  The PostToolUse[Agent] hook writes .cross-review-results.json automatically." >&2
echo "  Direct writes to the results file are blocked by the harness." >&2
exit 2
