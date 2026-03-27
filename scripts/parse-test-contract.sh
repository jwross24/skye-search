#!/usr/bin/env bash
set -euo pipefail

# Parse a test-contract block from a bead description.
# Input: bead ID as $1
# Output: JSON array of evidence requirements, or empty array if no contract found.
#
# Contract format (in bead description):
#   test-contract:
#     - type: edge-function, evidence: functions serve + curl functions/v1
#     - type: agent-browser, evidence: agent-browser snapshot
#     - type: none
#
# Valid types: edge-function, agent-browser, api-route, db-query, db-push,
#   function-deploy, storage-upload, external-api, hook-pipe-test, prod-smoke, none

BEAD_ID="${1:?Usage: parse-test-contract.sh <bead-id>}"

# Get bead description
DESC=$(br show "$BEAD_ID" --json 2>/dev/null | jq -r '.[0].description // ""') || {
  echo "[]"
  exit 0
}

# Extract test-contract block (allow leading whitespace, ensure trailing newline for range)
CONTRACT_BLOCK=$(printf '%s\n' "$DESC" | sed -n '/[[:space:]]*test-contract:/,/^[[:space:]]*$/p' | tail -n +2)

if [ -z "$CONTRACT_BLOCK" ]; then
  echo "[]"
  exit 0
fi

# Parse each line into JSON
ITEMS="[]"
while IFS= read -r line; do
  # Skip empty lines
  [ -z "$line" ] && continue

  # Extract type (text after "type:" up to comma or end of line)
  TYPE=$(echo "$line" | sed -n 's/.*type:[[:space:]]*\([^,]*\).*/\1/p' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//') || continue
  [ -z "$TYPE" ] && continue

  # Extract evidence pattern (text after "evidence:" to end of line)
  EVIDENCE=$(echo "$line" | sed -n 's/.*evidence:[[:space:]]*\(.*\)/\1/p' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//') || EVIDENCE=""

  ITEMS=$(printf '%s' "$ITEMS" | jq -c --arg t "$TYPE" --arg e "$EVIDENCE" '. + [{type: $t, evidence: $e}]')
done <<< "$CONTRACT_BLOCK"

echo "$ITEMS"
