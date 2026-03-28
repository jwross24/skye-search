#!/usr/bin/env bash
set -euo pipefail

# Close-bead gate v2 — disposition + evidence verification.
#
# Two layers:
#   1. Disposition file (universal): every bead close requires a per-bead
#      review disposition file with all findings dispositioned.
#   2. Evidence check (opt-in): beads with test-contract blocks in their
#      description get command log evidence verified against patterns.
#
# No API calls. No LLM classification. Zero cost.
#
# Hook: PreToolUse[Bash]
# Exit 0 = allow, Exit 2 = block

source "$(dirname "$0")/_stamp-helpers.sh"

SCRIPTS_DIR="$(cd "$(dirname "$0")/../../scripts" && pwd)"

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0
init_session_id "$INPUT"

# Only gate actual br close commands (check first line only, not heredoc body)
FIRST_LINE=$(echo "$CMD" | head -1)
if ! echo "$FIRST_LINE" | grep -Eq '\bbr[[:space:]]+close\b'; then
  exit 0
fi

# ── Step 1: Extract bead ID ──────────────────────────────────────────────

BEAD_ID=$(echo "$FIRST_LINE" | sed -E 's/.*br[[:space:]]+close[[:space:]]+([a-zA-Z0-9_-]+).*/\1/' | head -1) || true
# Validate: if sed didn't match, it returns the full line unchanged
if echo "$BEAD_ID" | grep -qE '^[a-zA-Z0-9][a-zA-Z0-9_-]*$' && [ "$BEAD_ID" != "$FIRST_LINE" ]; then
  : # valid bead ID
else
  BEAD_ID=""
fi
if [ -z "$BEAD_ID" ]; then
  echo "BLOCKED: Cannot parse bead ID from command. Use: br close <bead-id> --reason \"...\"" >&2
  exit 2
fi

# ── Step 1b: Validate review disposition (universal requirement) ──────────

DISP_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/.review-disposition-${_SESSION}-${BEAD_ID}.json"
DISP_RESULT=$(bash "$SCRIPTS_DIR/validate-disposition.sh" "$DISP_FILE" 2>/dev/null) || true

DISP_PASS=$(printf '%s' "$DISP_RESULT" | jq -r '.pass // false' 2>/dev/null) || DISP_PASS="false"

# Verify the disposition is for THIS bead, not a stale one from an earlier close
if [ "$DISP_PASS" = "true" ]; then
  DISP_BEAD=$(jq -r '.bead_id // ""' "$DISP_FILE" 2>/dev/null) || DISP_BEAD=""
  if [ "$DISP_BEAD" != "$BEAD_ID" ]; then
    DISP_PASS="false"
    DISP_RESULT='{"pass":false,"error":"Disposition file is for bead '"'$DISP_BEAD'"', not '"'$BEAD_ID'"'. Write a new disposition for this bead."}'
  fi
fi

if [ "$DISP_PASS" != "true" ]; then
  DISP_ERROR=$(printf '%s' "$DISP_RESULT" | jq -r '.error // empty' 2>/dev/null) || DISP_ERROR=""
  DISP_ISSUES=$(printf '%s' "$DISP_RESULT" | jq -r '.issues // empty' 2>/dev/null) || DISP_ISSUES=""

  echo "BLOCKED: Review disposition not valid for $BEAD_ID" >&2
  echo "" >&2

  if [ -n "$DISP_ERROR" ]; then
    echo "  $DISP_ERROR" >&2
  fi

  if [ -n "$DISP_ISSUES" ] && [ "$DISP_ISSUES" != "null" ]; then
    NUM_DISP_ISSUES=$(printf '%s' "$DISP_ISSUES" | jq 'length' 2>/dev/null) || NUM_DISP_ISSUES=0
    for i in $(seq 0 $((NUM_DISP_ISSUES - 1))); do
      FINDING=$(printf '%s' "$DISP_ISSUES" | jq -r ".[$i].finding")
      PROBLEM=$(printf '%s' "$DISP_ISSUES" | jq -r ".[$i].problem")
      echo "  ✗ $FINDING" >&2
      echo "    → $PROBLEM" >&2
    done
  fi

  echo "" >&2
  echo "  Write disposition to: $DISP_FILE" >&2
  echo "  Format: {\"bead_id\":\"$BEAD_ID\",\"reviewer\":\"subagent\",\"findings\":[...]}" >&2
  echo "  Each finding needs: id, description, severity, disposition (fix|bead|not-a-bug), action" >&2
  exit 2
fi

# ── Step 1c: Production readiness check ───────────────────────────────────
# Infers required prod steps from git diff (migrations → db push, functions → deploy,
# env vars → vercel env). Checks command log for evidence they ran.

LOG_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/.command-log-${_SESSION}.jsonl"
PROD_RESULT=$(bash "$SCRIPTS_DIR/check-prod-readiness.sh" "$LOG_FILE" 1 2>/dev/null) || true
PROD_PASS=$(printf '%s' "$PROD_RESULT" | jq -r '.pass // false' 2>/dev/null) || PROD_PASS="false"

if [ "$PROD_PASS" != "true" ] && [ -n "$PROD_RESULT" ]; then
  NUM_PROD_MISSING=$(printf '%s' "$PROD_RESULT" | jq '.missing | length' 2>/dev/null) || NUM_PROD_MISSING=0
  if [ "$NUM_PROD_MISSING" -gt 0 ]; then
    echo "BLOCKED: Production deployment steps missing for $BEAD_ID" >&2
    echo "" >&2
    for i in $(seq 0 $((NUM_PROD_MISSING - 1))); do
      STEP=$(printf '%s' "$PROD_RESULT" | jq -r ".missing[$i].reason")
      HINT=$(printf '%s' "$PROD_RESULT" | jq -r ".missing[$i].hint")
      echo "  ✗ $STEP" >&2
      echo "    → $HINT" >&2
    done
    echo "" >&2
    exit 2
  fi
fi

# ── Step 2: Parse test contract from bead spec ───────────────────────────

REQUIREMENTS=""
CONTRACT=$(bash "$SCRIPTS_DIR/parse-test-contract.sh" "$BEAD_ID" 2>/dev/null) || CONTRACT="[]"
NUM_CONTRACT=$(printf '%s' "$CONTRACT" | jq 'length' 2>/dev/null) || NUM_CONTRACT=0

if [ "$NUM_CONTRACT" -gt 0 ]; then
  REQUIREMENTS="$CONTRACT"
  SOURCE="test-contract"
else
  # No test-contract — skip evidence check entirely.
  # The disposition file (checked above) is the primary gate.
  # Test contracts are opt-in for beads that need specific integration proof.
  touch_stamp "integration"
  exit 0
fi

# ── Step 4: Verify evidence in command log ────────────────────────────────

LOG_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/.command-log-${_SESSION}.jsonl"

RESULT=$(bash "$SCRIPTS_DIR/verify-evidence.sh" "$LOG_FILE" "$REQUIREMENTS" 2>/dev/null) || true

# Validate result is parseable JSON
if [ -z "$RESULT" ] || ! printf '%s' "$RESULT" | jq -e '.pass' &>/dev/null; then
  echo "BLOCKED: Evidence verification crashed for $BEAD_ID. Run scripts/verify-evidence.sh manually to debug." >&2
  exit 2
fi

PASS=$(printf '%s' "$RESULT" | jq -r '.pass' 2>/dev/null) || PASS="false"

if [ "$PASS" = "true" ]; then
  # Also touch the stamp for backward compatibility with other hooks
  touch_stamp "integration"
  exit 0
fi

# ── Step 5: Block with specific guidance ──────────────────────────────────

echo "BLOCKED: Missing integration evidence for $BEAD_ID (source: $SOURCE)" >&2
echo "" >&2

# Show what's missing with specific hints
NUM_MISSING=$(printf '%s' "$RESULT" | jq '.missing | length' 2>/dev/null) || NUM_MISSING=0
for i in $(seq 0 $((NUM_MISSING - 1))); do
  TYPE=$(printf '%s' "$RESULT" | jq -r ".missing[$i].type")
  HINT=$(printf '%s' "$RESULT" | jq -r ".missing[$i].hint")
  echo "  ✗ $TYPE: $HINT" >&2
done

echo "" >&2

# Show what was found (for encouragement)
NUM_FOUND=$(printf '%s' "$RESULT" | jq '.found | length' 2>/dev/null) || NUM_FOUND=0
if [ "$NUM_FOUND" -gt 0 ]; then
  for i in $(seq 0 $((NUM_FOUND - 1))); do
    TYPE=$(printf '%s' "$RESULT" | jq -r ".found[$i].type")
    echo "  ✓ $TYPE: evidence found" >&2
  done
  echo "" >&2
fi

echo "Run the missing tests, then retry: br close $BEAD_ID" >&2
exit 2
