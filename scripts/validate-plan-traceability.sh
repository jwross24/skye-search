#!/usr/bin/env bash
set -euo pipefail

# Validate plan traceability: check that plan deliverables match actual changes.
#
# Checks:
#   A. File deliverables: files listed in plan's "Files Modified/Created" table
#      must appear in git diff
#   B. Verification steps: commands in plan's "Verification" section should
#      appear in the command log (warning only, not blocking)
#
# Usage: validate-plan-traceability.sh <bead_id> [session_id]
# Output: JSON { pass, plan_file, files: {missing, found}, verification: {missing, found} }

BEAD_ID="${1:?Usage: validate-plan-traceability.sh <bead_id> [session_id]}"
SESSION_ID="${2:-}"

# ── Find plan file ──────────────────────────────────────────────────────────

PLAN_FILE=$(grep -rl "$BEAD_ID" "$HOME/.claude/plans/"*.md 2>/dev/null | head -1 || true)

if [ -z "$PLAN_FILE" ] || [ ! -f "$PLAN_FILE" ]; then
  jq -nc '{"pass":true,"reason":"No plan file found for this bead","plan_file":null}'
  exit 0
fi

# ── A. Check file deliverables ──────────────────────────────────────────────

# Extract Files Modified/Created table rows
# Look for lines with | `path` | or | path | patterns
FILES_SECTION=$(sed -n '/## Files/,/^## /p' "$PLAN_FILE" 2>/dev/null || true)

if [ -z "$FILES_SECTION" ]; then
  # No files table — pass with warning
  jq -nc --arg pf "$PLAN_FILE" \
    '{"pass":true,"reason":"Plan file has no Files table — skipping file check","plan_file":$pf}'
  exit 0
fi

# Parse file paths from table rows (backtick-quoted or plain)
# Handles: | `path/to/file.ts` | Action | and | path/to/file.ts | Action |
PLANNED_FILES=$(echo "$FILES_SECTION" | grep -oE '`[^`]+\.(ts|tsx|js|jsx|sql|sh|json|yml|yaml|md)`' | tr -d '`' | sort -u || true)

if [ -z "$PLANNED_FILES" ]; then
  jq -nc --arg pf "$PLAN_FILE" \
    '{"pass":true,"reason":"Plan file table has no parseable file paths","plan_file":$pf}'
  exit 0
fi

# Get actual changed files
CHANGED_FILES=$(git diff --name-only origin/main...HEAD 2>/dev/null | sort -u || true)

# Check each planned file against actual changes
FILES_MISSING='[]'
FILES_FOUND='[]'

while IFS= read -r planned; do
  [ -z "$planned" ] && continue
  FOUND=false
  while IFS= read -r changed; do
    [ -z "$changed" ] && continue
    # Use fixed-string match for exact paths, or glob match for YYYYMMDD patterns
    if echo "$planned" | grep -q 'YYYYMMDD'; then
      # Date-stamped file: match prefix and suffix around the date
      PREFIX=$(echo "$planned" | sed 's/YYYYMMDD.*//')
      SUFFIX=$(echo "$planned" | sed 's/.*YYYYMMDD[^/]*//')
      if echo "$changed" | grep -qF "$PREFIX" && echo "$changed" | grep -qF "$SUFFIX"; then
        FOUND=true
        break
      fi
    else
      # Exact path match (fixed-string, no regex)
      if [ "$changed" = "$planned" ]; then
        FOUND=true
        break
      fi
    fi
  done <<< "$CHANGED_FILES"

  if [ "$FOUND" = "true" ]; then
    FILES_FOUND=$(echo "$FILES_FOUND" | jq -c --arg f "$planned" '. + [$f]')
  else
    FILES_MISSING=$(echo "$FILES_MISSING" | jq -c --arg f "$planned" '. + [$f]')
  fi
done <<< "$PLANNED_FILES"

# ── B. Check verification steps (soft check) ────────────────────────────────

VERIFY_SECTION=$(sed -n '/## Verification/,/^## /p' "$PLAN_FILE" 2>/dev/null || true)
VERIFY_MISSING='[]'
VERIFY_FOUND='[]'

if [ -n "$VERIFY_SECTION" ] && [ -n "$SESSION_ID" ]; then
  LOG_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/.command-log-${SESSION_ID}.jsonl"

  if [ -f "$LOG_FILE" ]; then
    # Extract verification commands (lines starting with number. or -)
    VERIFY_CMDS=$(echo "$VERIFY_SECTION" | grep -oE '`[^`]+`' | tr -d '`' | head -20 || true)

    while IFS= read -r cmd; do
      [ -z "$cmd" ] && continue
      # Check if this command (or close variant) appears in the log
      ESCAPED=$(printf '%s' "$cmd" | sed 's/[.*+?^${}()|[\]\\]/\\&/g' | head -c 100)
      if grep -q "$ESCAPED" "$LOG_FILE" 2>/dev/null; then
        VERIFY_FOUND=$(echo "$VERIFY_FOUND" | jq -c --arg c "$cmd" '. + [$c]')
      else
        VERIFY_MISSING=$(echo "$VERIFY_MISSING" | jq -c --arg c "$cmd" '. + [$c]')
      fi
    done <<< "$VERIFY_CMDS"
  fi
fi

# ── Output ──────────────────────────────────────────────────────────────────

NUM_MISSING=$(echo "$FILES_MISSING" | jq 'length')
PASS=$( [ "$NUM_MISSING" -eq 0 ] && echo "true" || echo "false" )

jq -nc \
  --argjson pass "$PASS" \
  --arg pf "$PLAN_FILE" \
  --argjson fm "$FILES_MISSING" \
  --argjson ff "$FILES_FOUND" \
  --argjson vm "$VERIFY_MISSING" \
  --argjson vf "$VERIFY_FOUND" \
  '{
    pass: $pass,
    plan_file: $pf,
    files: { missing: $fm, found: $ff },
    verification: { missing: $vm, found: $vf }
  }'
