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
_CLAUDE_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude"

# Adopt orphaned disposition files (subagents may not know parent session ID)
if [ ! -f "$DISP_FILE" ]; then
  # Try: no session prefix
  _ORPHAN="${_CLAUDE_DIR}/.review-disposition-${BEAD_ID}.json"
  [ -f "$_ORPHAN" ] && mv "$_ORPHAN" "$DISP_FILE"
fi
if [ ! -f "$DISP_FILE" ]; then
  # Try: short bead ID (e.g., "k3l8" from "skye-search-k3l8")
  _SHORT_ID=$(echo "$BEAD_ID" | sed 's/^skye-search-//')
  _ORPHAN="${_CLAUDE_DIR}/.review-disposition-${_SHORT_ID}.json"
  [ -f "$_ORPHAN" ] && mv "$_ORPHAN" "$DISP_FILE"
fi
if [ ! -f "$DISP_FILE" ]; then
  # Try: wrong session prefix but correct bead ID
  _FOUND=$(ls "${_CLAUDE_DIR}"/.review-disposition-*-"${BEAD_ID}".json 2>/dev/null | head -1 || true)
  [ -n "$_FOUND" ] && [ "$_FOUND" != "$DISP_FILE" ] && mv "$_FOUND" "$DISP_FILE"
fi

# Compute lines changed for complexity check
STAT_LINE=$(git diff --stat origin/main...HEAD 2>/dev/null | tail -1 || echo "")
_INS=$(echo "$STAT_LINE" | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo 0)
_DEL=$(echo "$STAT_LINE" | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo 0)
LINES_CHANGED=$(( ${_INS:-0} + ${_DEL:-0} ))

DISP_RESULT=$(bash "$SCRIPTS_DIR/validate-disposition.sh" "$DISP_FILE" "$LINES_CHANGED" 2>/dev/null) || true

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

  # Build structured evaluator prompt for the agent
  EVAL_PROMPT=$(bash "$SCRIPTS_DIR/build-evaluator-prompt.sh" "$BEAD_ID" "$_SESSION" "$DISP_FILE" 2>/dev/null) || EVAL_PROMPT=""
  if [ -n "$EVAL_PROMPT" ]; then
    echo "" >&2
    echo "  Spawn a self-review subagent:" >&2
    echo "" >&2
    echo '  Agent tool call:' >&2
    echo "    description: \"Self-review $BEAD_ID\"" >&2
    echo '    model: "sonnet"' >&2
    echo "    prompt: (see evaluator prompt below)" >&2
    echo "" >&2
    echo "  ─── Evaluator Prompt ───" >&2
    echo "$EVAL_PROMPT" | head -60 | sed 's/^/  /' >&2
    echo "  ────────────────────────" >&2
  else
    echo "" >&2
    echo "  Write disposition to: $DISP_FILE" >&2
    echo "  Format: {\"bead_id\":\"$BEAD_ID\",\"reviewer\":\"subagent\",\"findings\":[...]}" >&2
    echo "  Each finding needs: id, description, severity, disposition (fix|bead|not-a-bug), action" >&2
  fi
  exit 2
fi

# ── Step 1c: Plan traceability (if plan file exists) ──────────────────────

PLAN_RESULT=$(bash "$SCRIPTS_DIR/validate-plan-traceability.sh" "$BEAD_ID" "$_SESSION" 2>/dev/null) || true
PLAN_PASS=$(printf '%s' "$PLAN_RESULT" | jq -r '.pass // true' 2>/dev/null) || PLAN_PASS="true"

if [ "$PLAN_PASS" != "true" ]; then
  PLAN_FILE=$(printf '%s' "$PLAN_RESULT" | jq -r '.plan_file // ""' 2>/dev/null) || PLAN_FILE=""
  echo "BLOCKED: Plan traceability check failed for $BEAD_ID" >&2
  echo "" >&2
  if [ -n "$PLAN_FILE" ]; then
    echo "  Plan file: $PLAN_FILE" >&2
  fi
  NUM_PLAN_MISSING=$(printf '%s' "$PLAN_RESULT" | jq '.files.missing | length' 2>/dev/null) || NUM_PLAN_MISSING=0
  for i in $(seq 0 $((NUM_PLAN_MISSING - 1))); do
    FILE=$(printf '%s' "$PLAN_RESULT" | jq -r ".files.missing[$i]")
    echo "  ✗ $FILE — listed in plan but not found in git diff" >&2
  done
  # Show verification warnings (non-blocking)
  NUM_VERIFY_MISSING=$(printf '%s' "$PLAN_RESULT" | jq '.verification.missing | length' 2>/dev/null) || NUM_VERIFY_MISSING=0
  if [ "$NUM_VERIFY_MISSING" -gt 0 ]; then
    echo "" >&2
    echo "  Verification steps not found in command log (warning):" >&2
    for i in $(seq 0 $((NUM_VERIFY_MISSING - 1))); do
      CMD=$(printf '%s' "$PLAN_RESULT" | jq -r ".verification.missing[$i]")
      echo "    ? $CMD" >&2
    done
  fi
  echo "" >&2
  echo "  Implement the missing deliverables, or update the plan if scope changed." >&2
  exit 2
fi

# ── Step 1d: Production readiness check ───────────────────────────────────
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

# ── Step 1e: Push check — verify HEAD is on remote ───────────────────────

UNPUSHED=$(git -C "${CLAUDE_PROJECT_DIR:-.}" rev-list --count origin/main..HEAD 2>/dev/null) || UNPUSHED=""
if [ -n "$UNPUSHED" ] && [ "$UNPUSHED" -gt 0 ]; then
  echo "BLOCKED: $UNPUSHED commit(s) not pushed to origin." >&2
  echo "" >&2
  echo "  → git push" >&2
  exit 2
fi

# ── Step 1f: Marching order compliance ───────────────────────────────────
# Checks that marching order steps were followed based on what files changed:
# - .tsx changed → /impeccable required
# - UI page/component changed → agent-browser E2E required
# - Scoring files changed → golden set regression required
# - Server/DB code changed → integration tests required

MARCH_RESULT=$(bash "$SCRIPTS_DIR/check-marching-compliance.sh" "$_SESSION" "$BEAD_ID" 2>/dev/null) || true
MARCH_PASS=$(printf '%s' "$MARCH_RESULT" | jq -r '.pass // true' 2>/dev/null) || MARCH_PASS="true"

if [ "$MARCH_PASS" != "true" ]; then
  echo "BLOCKED: Marching order steps not completed for $BEAD_ID" >&2
  echo "" >&2
  NUM_MARCH_MISSING=$(printf '%s' "$MARCH_RESULT" | jq '.missing | length' 2>/dev/null) || NUM_MARCH_MISSING=0
  for i in $(seq 0 $((NUM_MARCH_MISSING - 1))); do
    STEP=$(printf '%s' "$MARCH_RESULT" | jq -r ".missing[$i].reason")
    HINT=$(printf '%s' "$MARCH_RESULT" | jq -r ".missing[$i].hint")
    echo "  ✗ $STEP" >&2
    echo "    → $HINT" >&2
  done
  echo "" >&2
  exit 2
fi

# ── Step 1g: CI status check ──────────────────────────────────────────────

if command -v gh &>/dev/null; then
  CI_JSON=$(gh run list --commit "$(git rev-parse HEAD 2>/dev/null)" --json status,conclusion --limit 1 2>/dev/null) || CI_JSON="[]"
  CI_STATUS=$(printf '%s' "$CI_JSON" | jq -r '.[0].status // ""' 2>/dev/null) || CI_STATUS=""
  CI_CONCLUSION=$(printf '%s' "$CI_JSON" | jq -r '.[0].conclusion // ""' 2>/dev/null) || CI_CONCLUSION=""

  if [ "$CI_STATUS" = "completed" ] && [ "$CI_CONCLUSION" = "failure" ]; then
    echo "BLOCKED: CI failed on HEAD commit." >&2
    echo "" >&2
    echo "  → Fix CI failures, push, then retry: br close $BEAD_ID" >&2
    exit 2
  fi
  if [ "$CI_STATUS" = "in_progress" ] || [ "$CI_STATUS" = "queued" ]; then
    echo '{"systemMessage":"CI is still running on HEAD. Consider waiting for it to complete before closing."}' >&2
  fi
fi

# ── Step 1h: Skill directive check — verify skills from bead spec ───────
# Parses bead description for "Invoke /skill" or "Use /skill" directives
# and checks that corresponding stamps exist in this session.

BEAD_DESC=$(br show "$BEAD_ID" --json 2>/dev/null | jq -r '.[0].description // ""' 2>/dev/null) || BEAD_DESC=""

if [ -n "$BEAD_DESC" ]; then
  MISSING_SKILLS=""

  if echo "$BEAD_DESC" | grep -qiE '(invoke|use)\s+/impeccable'; then
    if ! stamp_is_fresh "impeccable" 86400; then
      MISSING_SKILLS="${MISSING_SKILLS}  ✗ /impeccable — required by bead spec but not invoked this session\n"
    fi
  fi

  if echo "$BEAD_DESC" | grep -qiE '(invoke|use)\s+/resend'; then
    if ! stamp_is_fresh "resend" 86400; then
      MISSING_SKILLS="${MISSING_SKILLS}  ✗ /resend — required by bead spec but not invoked this session\n"
    fi
  fi

  if echo "$BEAD_DESC" | grep -qiE '(invoke|use)\s+/humanizer'; then
    if ! stamp_is_fresh "humanizer" 86400; then
      MISSING_SKILLS="${MISSING_SKILLS}  ✗ /humanizer — required by bead spec but not invoked this session\n"
    fi
  fi

  if echo "$BEAD_DESC" | grep -qiE 'context7\s+mcp|use\s+context7'; then
    if ! stamp_is_fresh "context7" 86400; then
      MISSING_SKILLS="${MISSING_SKILLS}  ✗ Context7 MCP — required by bead spec but not queried this session\n"
    fi
  fi

  if [ -n "$MISSING_SKILLS" ]; then
    echo "BLOCKED: Bead spec requires skills that were not invoked:" >&2
    echo "" >&2
    printf '%b' "$MISSING_SKILLS" >&2
    echo "" >&2
    echo "  Invoke the required skills, then retry: br close $BEAD_ID" >&2
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
  touch_stamp "integration"
  # Clean up disposition file for this bead (no longer needed post-close)
  rm -f "$DISP_FILE" 2>/dev/null || true
  # Reflection prompt — forces agent to pause before closing
  cat >&2 <<'REFLECT'

  Before closing, reflect:
    1. Did I implement everything in the acceptance criteria?
    2. What assumption am I most uncertain about?
    3. If reviewing someone else's code, what would I question?
    4. Is there anything I deferred that should be addressed now?
REFLECT
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
  touch_stamp "integration"
  # Clean up disposition file for this bead (no longer needed post-close)
  rm -f "$DISP_FILE" 2>/dev/null || true
  cat >&2 <<'REFLECT'

  Before closing, reflect:
    1. Did I implement everything in the acceptance criteria?
    2. What assumption am I most uncertain about?
    3. If reviewing someone else's code, what would I question?
    4. Is there anything I deferred that should be addressed now?
REFLECT
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
