#!/usr/bin/env bash
set -euo pipefail

# Verify that required evidence exists in the command log.
#
# Input:
#   $1 — path to command log JSONL file
#   $2 — JSON array of evidence requirements [{type, evidence}, ...]
#
# Output: JSON object with pass/fail and details
#   {"pass": true/false, "missing": [...], "found": [...]}
#
# Exit code: 0 = pass, 1 = missing evidence

LOG_FILE="${1:?Usage: verify-evidence.sh <log-file> <requirements-json>}"
REQUIREMENTS="${2:?Usage: verify-evidence.sh <log-file> <requirements-json>}"

# If requirements contain "none" type, auto-pass
if printf '%s' "$REQUIREMENTS" | jq -e 'any(.[]; .type == "none")' &>/dev/null; then
  echo '{"pass":true,"missing":[],"found":[{"type":"none","reason":"No integration test required"}]}'
  exit 0
fi

# If requirements is empty array, auto-pass
if printf '%s' "$REQUIREMENTS" | jq -e 'length == 0' &>/dev/null; then
  echo '{"pass":true,"missing":[],"found":[]}'
  exit 0
fi

# Read all commands from the log (just the cmd field)
if [ ! -f "$LOG_FILE" ]; then
  # No log file = no evidence at all
  MISSING=$(printf '%s' "$REQUIREMENTS" | jq -c '[.[] | {type, evidence, reason: "No command log found for this session"}]')
  printf '{"pass":false,"missing":%s,"found":[]}\n' "$MISSING"
  exit 1
fi

ALL_CMDS=$(jq -r '.cmd' "$LOG_FILE" 2>/dev/null) || ALL_CMDS=""

FOUND="[]"
MISSING="[]"

# Check each requirement
NUM_REQS=$(printf '%s' "$REQUIREMENTS" | jq 'length')
for i in $(seq 0 $((NUM_REQS - 1))); do
  TYPE=$(printf '%s' "$REQUIREMENTS" | jq -r ".[$i].type")
  EVIDENCE=$(printf '%s' "$REQUIREMENTS" | jq -r ".[$i].evidence")

  # Skip if no evidence pattern (shouldn't happen but be safe)
  if [ -z "$EVIDENCE" ]; then
    FOUND=$(printf '%s' "$FOUND" | jq -c --arg t "$TYPE" '. + [{type: $t, reason: "No evidence pattern required"}]')
    continue
  fi

  # Split evidence on " + " delimiter for multi-pattern requirements (all must match)
  ALL_MATCHED=true
  FIRST_MISS=""
  # Use bash IFS='+' split (macOS sed doesn't interpret \n in replacements)
  IFS='+' read -ra PATTERNS <<< "$EVIDENCE"
  for pattern in "${PATTERNS[@]}"; do
    pattern=$(echo "$pattern" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    [ -z "$pattern" ] && continue

    # Validate regex before using it
    if ! echo "" | grep -qE "$pattern" 2>/dev/null && [ $? -eq 2 ]; then
      ALL_MATCHED=false
      FIRST_MISS="$pattern (invalid regex)"
      break
    fi

    if echo "$ALL_CMDS" | grep -qE "$pattern" 2>/dev/null; then
      : # matched
    else
      ALL_MATCHED=false
      FIRST_MISS="$pattern"
      break
    fi
  done

  if $ALL_MATCHED; then
    FOUND=$(printf '%s' "$FOUND" | jq -c --arg t "$TYPE" --arg e "$EVIDENCE" '. + [{type: $t, evidence: $e, reason: "Evidence found in command log"}]')
  else
    # Build helpful guidance per type
    case "$TYPE" in
      edge-function)
        HINT="Run: supabase functions serve, then curl the function endpoint" ;;
      agent-browser)
        HINT="Run: agent-browser open http://localhost:3000/<route>, snapshot, interact" ;;
      api-route)
        HINT="Run: curl http://localhost:3000/api/<route>" ;;
      db-query)
        HINT="Run: supabase db query --local or psql to verify data" ;;
      db-push)
        HINT="Run: supabase db push to deploy migrations" ;;
      function-deploy)
        HINT="Run: supabase functions deploy <name>" ;;
      storage-upload)
        HINT="Upload a real file through the Supabase Storage client" ;;
      external-api)
        HINT="Make a real API call (not mocked) to verify integration" ;;
      hook-pipe-test)
        HINT="Run: echo '{...}' | .claude/hooks/<hook>.sh to pipe-test" ;;
      prod-smoke)
        HINT="Run: curl against the production endpoint to verify deploy" ;;
      *)
        HINT="Run the integration test for: $TYPE" ;;
    esac

    MISSING=$(printf '%s' "$MISSING" | jq -c --arg t "$TYPE" --arg e "$EVIDENCE" --arg h "$HINT" --arg m "$FIRST_MISS" \
      '. + [{type: $t, evidence: $e, hint: $h, missing_pattern: $m}]')
  fi
done

NUM_MISSING=$(printf '%s' "$MISSING" | jq 'length')
if [ "$NUM_MISSING" -eq 0 ]; then
  printf '{"pass":true,"missing":[],"found":%s}\n' "$FOUND"
  exit 0
else
  printf '{"pass":false,"missing":%s,"found":%s}\n' "$MISSING" "$FOUND"
  exit 1
fi
