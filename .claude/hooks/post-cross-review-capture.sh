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
#
# Finding extraction (v2):
#   Parses the subagent's actual JSON findings array if present (structured).
#   Falls back to severity-word grep only if no structured output found.

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

# ── Extract findings from structured JSON in response ────────────────────
# The subagent is prompted to return a JSON block with "findings": [...]
# Try to extract that array directly — much more reliable than grep heuristics.

STRUCTURED_FINDINGS=""
FINDING_COUNT=0

# Try extracting a JSON code block from the response
JSON_BLOCK=$(printf '%s' "$RESPONSE" | sed -n '/```json/,/```/p' | sed '1d;$d' 2>/dev/null) || JSON_BLOCK=""

if [ -n "$JSON_BLOCK" ]; then
  # Validate it has a findings array
  PARSED=$(printf '%s' "$JSON_BLOCK" | jq -c '.findings // empty' 2>/dev/null) || PARSED=""
  if [ -n "$PARSED" ] && [ "$PARSED" != "null" ]; then
    FINDING_COUNT=$(printf '%s' "$PARSED" | jq 'length' 2>/dev/null) || FINDING_COUNT=0
    # Use the subagent's actual findings (they have real severity + disposition)
    STRUCTURED_FINDINGS="$PARSED"
  fi
fi

# Fallback: try parsing the entire response as JSON (some subagents return raw JSON)
if [ -z "$STRUCTURED_FINDINGS" ]; then
  PARSED=$(printf '%s' "$RESPONSE" | jq -c '.findings // empty' 2>/dev/null) || PARSED=""
  if [ -n "$PARSED" ] && [ "$PARSED" != "null" ]; then
    FINDING_COUNT=$(printf '%s' "$PARSED" | jq 'length' 2>/dev/null) || FINDING_COUNT=0
    STRUCTURED_FINDINGS="$PARSED"
  fi
fi

# Last resort fallback: grep for severity words (only if no structured output)
if [ -z "$STRUCTURED_FINDINGS" ]; then
  for severity in CRITICAL HIGH MEDIUM LOW; do
    MATCHES=$(echo "$RESPONSE" | grep -oiE "\"severity\":\s*\"$severity\"" | wc -l | tr -d ' ' || echo 0)
    FINDING_COUNT=$((FINDING_COUNT + MATCHES))
  done
  # Generate placeholder findings (old behavior, but less aggressive)
  if [ "$FINDING_COUNT" -gt 0 ]; then
    STRUCTURED_FINDINGS=$(jq -nc --argjson n "$FINDING_COUNT" \
      '[range($n)] | map({id: ("F" + (. + 1 | tostring)), severity: "detected"})')
  else
    STRUCTURED_FINDINGS="[]"
  fi
fi

# Determine if it's a clean pass
PASS_VERDICT=""
if echo "$RESPONSE" | grep -qi 'no.*critical.*high\|no.*issues\|all.*clean'; then
  PASS_VERDICT="PASS: No critical or high issues found."
fi

# Extract commit count from response
COMMITS_REVIEWED=$(echo "$RESPONSE" | grep -oE 'last [0-9]+ commits|HEAD~[0-9]+' | grep -oE '[0-9]+' | head -1)
COMMITS_REVIEWED=${COMMITS_REVIEWED:-3}

# Build the verified results file
RESULTS_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/.cross-review-results.json"

TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
VERDICT="${PASS_VERDICT:-Review completed with $FINDING_COUNT finding(s).}"

# Write results — structured findings preserve the subagent's actual data
jq -nc \
  --arg ts "$TS" \
  --argjson commits "$COMMITS_REVIEWED" \
  --arg model "${MODEL:-inherited}" \
  --arg verdict "$VERDICT" \
  --argjson findings "$STRUCTURED_FINDINGS" \
  --argjson count "$FINDING_COUNT" \
  '{
    reviewed_at: $ts,
    commits_reviewed: $commits,
    reviewer: ("subagent-" + $model),
    source: "harness-hook",
    findings_detected: $count,
    findings: $findings,
    verdict: $verdict
  }' > "$RESULTS_FILE"

echo '{"systemMessage":"✓ Cross-review captured: '"$FINDING_COUNT"' finding(s) extracted from subagent output."}'
exit 0
