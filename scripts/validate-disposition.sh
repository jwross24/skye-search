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

DISP_FILE="${1:?Usage: validate-disposition.sh <disposition-file> [lines_changed]}"
LINES_CHANGED="${2:-0}"
COMPLEXITY_THRESHOLD=200

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
      BEAD_REF=$(echo "$ACTION" | grep -oE 'skye-search-[a-z0-9]+' | head -1 || true)
      if [ -z "$BEAD_REF" ]; then
        ISSUES=$(printf '%s' "$ISSUES" | jq -c --arg f "#$FINDING_ID: $DESC" --arg a "$ACTION" \
          '. + [{"finding": $f, "problem": "Bead disposition must reference a bead ID (e.g., skye-search-abc). Create the bead first with br create.", "action": $a}]')
      else
        # Verify the bead actually exists
        BEAD_EXISTS=$(br show "$BEAD_REF" --json 2>/dev/null | jq -r '.id // ""' 2>/dev/null || true)
        if [ -z "$BEAD_EXISTS" ]; then
          ISSUES=$(printf '%s' "$ISSUES" | jq -c --arg f "#$FINDING_ID: $DESC" --arg b "$BEAD_REF" \
            '. + [{"finding": $f, "problem": "Referenced bead " + $b + " does not exist. Create it with br create before closing."}]')
        fi
      fi
      ;;
    not-a-bug)
      # CRITICAL/HIGH: 50+ chars justification, or fix/bead instead
      if echo "$SEVERITY" | grep -qiE 'CRITICAL|HIGH'; then
        if [ "${#ACTION}" -lt 50 ]; then
          ISSUES=$(printf '%s' "$ISSUES" | jq -c --arg f "#$FINDING_ID ($SEVERITY): $DESC" --arg a "$ACTION" \
            '. + [{"finding": $f, "problem": "CRITICAL/HIGH findings marked not-a-bug require detailed justification (>50 chars). Either fix it or create a bead."}]')
        fi
      # MEDIUM: 30+ chars — these often represent real improvements being skipped
      elif echo "$SEVERITY" | grep -qiE 'MEDIUM'; then
        if [ "${#ACTION}" -lt 30 ]; then
          ISSUES=$(printf '%s' "$ISSUES" | jq -c --arg f "#$FINDING_ID ($SEVERITY): $DESC" --arg a "$ACTION" \
            '. + [{"finding": $f, "problem": "MEDIUM findings marked not-a-bug require meaningful justification (>30 chars). Consider fixing or creating a bead — leave the code better than you found it.", "action": $a}]')
        fi
      elif [ "${#ACTION}" -lt 20 ]; then
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

# ── Smart complexity check: >200 lines + CRITICAL/HIGH findings → require pass 2 ──

if [ "$LINES_CHANGED" -gt "$COMPLEXITY_THRESHOLD" ]; then
  PASS_NUM=$(jq -r 'if (.pass | type) == "number" then .pass else 1 end' "$DISP_FILE" 2>/dev/null) || PASS_NUM=1
  # Count CRITICAL/HIGH findings in this disposition
  CRIT_HIGH_COUNT=$(jq '[.findings[] | select(.severity == "CRITICAL" or .severity == "HIGH")] | length' "$DISP_FILE" 2>/dev/null) || CRIT_HIGH_COUNT=0

  if [ "$CRIT_HIGH_COUNT" -gt 0 ] && [ "$PASS_NUM" -lt 2 ]; then
    ISSUES=$(printf '%s' "$ISSUES" | jq -c --arg lc "$LINES_CHANGED" --arg ch "$CRIT_HIGH_COUNT" \
      '. + [{"finding": "Complex bead (" + $lc + " lines) with " + $ch + " CRITICAL/HIGH findings", "problem": "Beads with >200 lines and CRITICAL/HIGH findings require a second review pass. Fix the issues, then spawn another review subagent with pass: 2."}]')
  fi
fi

NUM_ISSUES=$(printf '%s' "$ISSUES" | jq 'length')

if [ "$NUM_ISSUES" -eq 0 ]; then
  echo "{\"pass\":true,\"findings\":$NUM_FINDINGS,\"issues\":[]}"
  exit 0
else
  printf '{"pass":false,"findings":%d,"issues":%s}\n' "$NUM_FINDINGS" "$ISSUES"
  exit 1
fi
