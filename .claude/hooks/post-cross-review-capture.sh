#!/usr/bin/env bash
set -euo pipefail

# PostToolUse[Agent] — capture cross-review subagent output.
#
# When an Agent tool call completes with a description matching "cross-review",
# this hook writes the verified results file. The agent cannot write this file
# directly — only the harness hook can.
#
# Validates:
#   - description contains "cross-review" (case-insensitive)
#   - model is "sonnet" or "opus" (quality floor — no haiku reviews)
#   - subagent output contains review content (not empty)

INPUT=$(cat)

# Extract Agent tool metadata
DESC=$(printf '%s' "$INPUT" | jq -r '.tool_input.description // ""' 2>/dev/null) || exit 0
MODEL=$(printf '%s' "$INPUT" | jq -r '.tool_input.model // ""' 2>/dev/null) || MODEL=""
RESPONSE=$(printf '%s' "$INPUT" | jq -r '.tool_response // ""' 2>/dev/null) || exit 0

# Only act on cross-review agents
if ! echo "$DESC" | grep -qi 'cross.review'; then
  exit 0
fi

# Validate model quality floor
case "$MODEL" in
  sonnet|opus) ;; # acceptable
  *)
    # If no model specified, it inherits parent (likely opus) — allow
    if [ -n "$MODEL" ] && [ "$MODEL" != "" ]; then
      echo '{"systemMessage":"⚠️ Cross-review model must be sonnet or opus, got: '"$MODEL"'. Results not captured."}'
      exit 0
    fi
    ;;
esac

# Validate response has content
if [ -z "$RESPONSE" ] || [ ${#RESPONSE} -lt 50 ]; then
  echo '{"systemMessage":"⚠️ Cross-review subagent returned insufficient output. Results not captured."}'
  exit 0
fi

# Count findings mentioned (rough heuristic — look for severity markers)
FINDING_COUNT=0
for severity in CRITICAL HIGH MEDIUM; do
  MATCHES=$(echo "$RESPONSE" | grep -oi "$severity" | wc -l | tr -d ' ')
  FINDING_COUNT=$((FINDING_COUNT + MATCHES))
done

# Determine if it's a clean pass
PASS_VERDICT=""
if echo "$RESPONSE" | grep -qi 'PASS.*no.*critical\|no.*critical.*high\|no.*issues\|all.*clean'; then
  PASS_VERDICT="PASS: No critical or high issues found."
fi

# Extract commit count from response (look for "last N commits" or "HEAD~N")
COMMITS_REVIEWED=$(echo "$RESPONSE" | grep -oE 'last [0-9]+ commits|HEAD~[0-9]+' | grep -oE '[0-9]+' | head -1)
COMMITS_REVIEWED=${COMMITS_REVIEWED:-3}

# Build the verified results file
RESULTS_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/.cross-review-results.json"

TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
VERDICT="${PASS_VERDICT:-Review completed with $FINDING_COUNT severity markers found.}"

# Write results — only this hook can create this file
jq -nc \
  --arg ts "$TS" \
  --argjson commits "$COMMITS_REVIEWED" \
  --arg model "${MODEL:-inherited}" \
  --arg verdict "$VERDICT" \
  --arg response "${RESPONSE:0:5000}" \
  '{
    reviewed_at: $ts,
    commits_reviewed: $commits,
    reviewer: ("subagent-" + $model),
    source: "harness-hook",
    findings_detected: '"$FINDING_COUNT"',
    verdict: $verdict,
    raw_output_truncated: $response
  }' > "$RESULTS_FILE"

echo '{"systemMessage":"✓ Cross-review captured by harness hook. Results written to .cross-review-results.json"}'
exit 0
