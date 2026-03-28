#!/usr/bin/env bash
set -euo pipefail

# Validate a review disposition file before allowing bead closure.
#
# Input: $1 — path to disposition JSON file
#
# Disposition file format:
# {
#   "bead_id": "skye-search-tik",
#   "reviewer": "subagent|self",
#   "findings": [
#     {
#       "id": 1,
#       "description": "macOS sed newline bug",
#       "severity": "HIGH",
#       "disposition": "fix",
#       "action": "Fixed in verify-evidence.sh — replaced sed with IFS split"
#     },
#     {
#       "id": 2,
#       "description": "Unused import",
#       "severity": "LOW",
#       "disposition": "not-a-bug",
#       "action": "Import is used by the re-exported type on line 42"
#     },
#     {
#       "id": 3,
#       "description": "Missing edge case test",
#       "severity": "MEDIUM",
#       "disposition": "bead",
#       "action": "skye-search-xyz: Add edge case tests for empty input"
#     }
#   ]
# }
#
# Rules:
#   - Every finding MUST have a disposition: "fix", "bead", or "not-a-bug"
#   - "pre-existing" is NOT a valid disposition (per project rule)
#   - "fix" actions must be > 10 chars (not just "fixed")
#   - "not-a-bug" actions must be > 20 chars (force a real justification)
#   - "bead" actions must reference a bead ID (pattern: skye-search-XXX or similar)
#   - Zero findings is valid (clean review) but the file must exist
#
# Output: JSON with pass/fail and details
# Exit: 0 = pass, 1 = fail

DISP_FILE="${1:?Usage: validate-disposition.sh <disposition-file>}"

if [ ! -f "$DISP_FILE" ]; then
  echo '{"pass":false,"error":"Disposition file not found. Run self-review and write disposition before closing."}'
  exit 1
fi

# Validate JSON structure
if ! jq -e '.findings' "$DISP_FILE" &>/dev/null; then
  echo '{"pass":false,"error":"Disposition file is not valid JSON or missing .findings array."}'
  exit 1
fi

# Validate reviewer is a subagent, not self
REVIEWER=$(jq -r '.reviewer // ""' "$DISP_FILE")
if [ -z "$REVIEWER" ]; then
  echo '{"pass":false,"error":"Missing reviewer field. The disposition must be written by a subagent, not the implementing agent."}'
  exit 1
fi
case "$REVIEWER" in
  subagent|subagent-*)
    ;; # valid
  *)
    echo '{"pass":false,"error":"Reviewer is \"'"$REVIEWER"'\". Disposition must come from a subagent (reviewer field must start with \"subagent\"). Spin up a review agent via the Agent tool."}'
    exit 1
    ;;
esac

NUM_FINDINGS=$(jq '.findings | length' "$DISP_FILE")

# Zero findings = clean review, that's fine
if [ "$NUM_FINDINGS" -eq 0 ]; then
  echo '{"pass":true,"findings":0,"issues":[]}'
  exit 0
fi

ISSUES="[]"

for i in $(seq 0 $((NUM_FINDINGS - 1))); do
  DESC=$(jq -r ".findings[$i].description // \"\"" "$DISP_FILE")
  SEVERITY=$(jq -r ".findings[$i].severity // \"UNKNOWN\"" "$DISP_FILE")
  DISPOSITION=$(jq -r ".findings[$i].disposition // \"\"" "$DISP_FILE")
  ACTION=$(jq -r ".findings[$i].action // \"\"" "$DISP_FILE")
  FINDING_ID=$(jq -r ".findings[$i].id // $((i+1))" "$DISP_FILE")

  # Check: disposition must exist
  if [ -z "$DISPOSITION" ]; then
    ISSUES=$(printf '%s' "$ISSUES" | jq -c --arg f "#$FINDING_ID: $DESC" \
      '. + [{"finding": $f, "problem": "Missing disposition. Must be: fix, bead, or not-a-bug"}]')
    continue
  fi

  # Check: "pre-existing" is banned
  if echo "$DISPOSITION" | grep -qi "pre.existing"; then
    ISSUES=$(printf '%s' "$ISSUES" | jq -c --arg f "#$FINDING_ID: $DESC" \
      '. + [{"finding": $f, "problem": "\"pre-existing\" is not a valid disposition. If you found it, own it: fix, create a bead, or justify why it is not a bug."}]')
    continue
  fi

  # Check: valid disposition values
  case "$DISPOSITION" in
    fix)
      if [ "${#ACTION}" -lt 10 ]; then
        ISSUES=$(printf '%s' "$ISSUES" | jq -c --arg f "#$FINDING_ID: $DESC" --arg a "$ACTION" \
          '. + [{"finding": $f, "problem": "Fix disposition needs a real description (>10 chars) of what was fixed, not just \"fixed\"", "action": $a}]')
      fi
      ;;
    bead)
      # Must reference a bead ID
      if ! echo "$ACTION" | grep -qE '[a-z]+-[a-z0-9]+'; then
        ISSUES=$(printf '%s' "$ISSUES" | jq -c --arg f "#$FINDING_ID: $DESC" --arg a "$ACTION" \
          '. + [{"finding": $f, "problem": "Bead disposition must reference a bead ID (e.g., skye-search-abc)", "action": $a}]')
      fi
      ;;
    not-a-bug)
      if [ "${#ACTION}" -lt 20 ]; then
        ISSUES=$(printf '%s' "$ISSUES" | jq -c --arg f "#$FINDING_ID: $DESC" --arg a "$ACTION" \
          '. + [{"finding": $f, "problem": "not-a-bug needs a real justification (>20 chars). Explain WHY it is not a bug.", "action": $a}]')
      fi
      ;;
    *)
      ISSUES=$(printf '%s' "$ISSUES" | jq -c --arg f "#$FINDING_ID: $DESC" --arg d "$DISPOSITION" \
        '. + [{"finding": $f, "problem": "Invalid disposition. Must be: fix, bead, or not-a-bug", "disposition": $d}]')
      ;;
  esac
done

NUM_ISSUES=$(printf '%s' "$ISSUES" | jq 'length')

if [ "$NUM_ISSUES" -eq 0 ]; then
  echo "{\"pass\":true,\"findings\":$NUM_FINDINGS,\"issues\":[]}"
  exit 0
else
  printf '{"pass":false,"findings":%d,"issues":%s}\n' "$NUM_FINDINGS" "$ISSUES"
  exit 1
fi
