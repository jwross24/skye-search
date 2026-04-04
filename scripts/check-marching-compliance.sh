#!/usr/bin/env bash
set -euo pipefail

# Check marching order compliance based on what files were changed.
#
# Inspects git diff to determine which marching order steps apply,
# then verifies stamps/evidence that they were actually performed.
#
# Input: $1 — session ID (for stamp checking)
# Output: JSON { "pass": bool, "missing": [...], "checked": [...] }
#
# Checks:
# 1. .tsx files changed → /impeccable stamp required
# 2. UI page/component .tsx changed → agent-browser stamp required
# 3. ai-scoring.ts or urgency-scoring.ts changed → golden-set stamp required
# 4. server action / DB code changed → integration test evidence required

SESSION_ID="${1:?Usage: check-marching-compliance.sh <session_id>}"
CLAUDE_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude"

MISSING="[]"
CHECKED="[]"

# Get files changed: use bead base commit if available, else unpushed, else last 5
# Bead base commit is saved by track-bead-claim.sh when a bead is claimed.
BEAD_BASE=""
for base_file in "${CLAUDE_DIR}/.bead-base-commit-"*; do
  [ -f "$base_file" ] && BEAD_BASE=$(cat "$base_file" 2>/dev/null) && break
done

if [ -n "$BEAD_BASE" ]; then
  CHANGED_FILES=$(git diff --name-only "${BEAD_BASE}..HEAD" 2>/dev/null || true)
elif [ -n "$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)" ] && [ "$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)" -gt 0 ]; then
  CHANGED_FILES=$(git diff --name-only origin/main...HEAD 2>/dev/null || true)
else
  # Already pushed — check recent commits (session work is typically in last 5)
  CHANGED_FILES=$(git diff --name-only HEAD~5..HEAD 2>/dev/null || true)
fi
if [ -z "$CHANGED_FILES" ]; then
  # Fall back to command log for edited files
  LOG_FILE="${CLAUDE_DIR}/.command-log-${SESSION_ID}.jsonl"
  if [ -f "$LOG_FILE" ]; then
    CHANGED_FILES=$(grep -oE '"file_path":"[^"]+\.tsx?"' "$LOG_FILE" 2>/dev/null | sed 's/"file_path":"//;s/"//' | sort -u || true)
  fi
fi

if [ -z "$CHANGED_FILES" ]; then
  echo '{"pass":true,"missing":[],"checked":["no_changes"]}'
  exit 0
fi

# Helper: check if a stamp file exists and is recent (within 24h)
stamp_fresh() {
  local name="$1"
  local stamp_file
  stamp_file=$(ls "${CLAUDE_DIR}/.${name}-stamp-${SESSION_ID}" 2>/dev/null || ls "${CLAUDE_DIR}/.${name}-stamp-"* 2>/dev/null | head -1 || true)
  if [ -n "$stamp_file" ] && [ -f "$stamp_file" ]; then
    local age
    age=$(( $(date +%s) - $(stat -f %m "$stamp_file" 2>/dev/null || stat -c %Y "$stamp_file" 2>/dev/null || echo 0) ))
    [ "$age" -lt 86400 ]
  else
    return 1
  fi
}

# ── Check 1: .tsx changes → /impeccable required ────────────────────────
# Per marching orders step 8: "If bead creates/modifies ANY .tsx component:
# invoke /impeccable skill. No exceptions."

TSX_CHANGED=$(echo "$CHANGED_FILES" | grep '\.tsx$' | grep -v 'test\.tsx$' | grep -v 'src/components/ui/' || true)

if [ -n "$TSX_CHANGED" ]; then
  CHECKED=$(printf '%s' "$CHECKED" | jq -c '. + ["impeccable_check"]')
  if stamp_fresh "impeccable"; then
    CHECKED=$(printf '%s' "$CHECKED" | jq -c '. + ["impeccable_passed"]')
  else
    TSX_LIST=$(echo "$TSX_CHANGED" | head -5 | tr '\n' ', ' | sed 's/,$//')
    MISSING=$(printf '%s' "$MISSING" | jq -c --arg files "$TSX_LIST" \
      '. + [{"step": "impeccable", "reason": "Modified .tsx files but /impeccable was not invoked", "hint": "Run /impeccable skill to audit UI quality. Files: " + $files}]')
  fi
fi

# ── Check 2: UI page/component .tsx → agent-browser E2E required ────────
# Per marching orders step 12: "E2E verify (UI beads): Sign in via
# agent-browser, navigate to route, snapshot, interact, check errors"

UI_CHANGED=$(echo "$CHANGED_FILES" | grep -E '(app/.*page\.tsx|components/.+\.tsx)' | grep -v 'test\.tsx$' | grep -v 'components/ui/' || true)

if [ -n "$UI_CHANGED" ]; then
  CHECKED=$(printf '%s' "$CHECKED" | jq -c '. + ["agent_browser_check"]')
  if stamp_fresh "agent-browser"; then
    CHECKED=$(printf '%s' "$CHECKED" | jq -c '. + ["agent_browser_passed"]')
  else
    MISSING=$(printf '%s' "$MISSING" | jq -c \
      '. + [{"step": "agent_browser", "reason": "Modified UI components but agent-browser E2E was not run", "hint": "Run agent-browser to verify the UI visually. Log in, navigate, snapshot, interact."}]')
  fi
fi

# ── Check 3: Scoring files → golden set regression required ──────────────
# ai-scoring.ts or urgency-scoring.ts changes affect how jobs are scored.
# Golden set regression must pass to ensure scoring quality is maintained.

SCORING_CHANGED=$(echo "$CHANGED_FILES" | grep -E '(ai-scoring\.ts|urgency-scoring\.ts)' | grep -v 'test' || true)

if [ -n "$SCORING_CHANGED" ]; then
  CHECKED=$(printf '%s' "$CHECKED" | jq -c '. + ["golden_set_check"]')
  if stamp_fresh "golden-set"; then
    CHECKED=$(printf '%s' "$CHECKED" | jq -c '. + ["golden_set_passed"]')
  else
    MISSING=$(printf '%s' "$MISSING" | jq -c \
      '. + [{"step": "golden_set", "reason": "Modified scoring files but golden set regression was not run", "hint": "Run: bun run test src/lib/__tests__/golden-set-eval.test.ts — or stamp manually after verifying scoring quality."}]')
  fi
fi

# ── Check 4: Server actions / DB code → integration tests required ───────
# Per testing trophy: "Integration tests are the LARGEST layer"

DB_CHANGED=$(echo "$CHANGED_FILES" | grep -E '(actions\.ts|supabase/.*\.ts|db/.*\.ts)' | grep -v 'test' | grep -v '\.sql$' || true)

if [ -n "$DB_CHANGED" ]; then
  CHECKED=$(printf '%s' "$CHECKED" | jq -c '. + ["integration_test_check"]')
  # Check if any integration tests were run in this session
  LOG_FILE="${CLAUDE_DIR}/.command-log-${SESSION_ID}.jsonl"
  INTEG_RAN=false
  if [ -f "$LOG_FILE" ] && grep -q 'integration.test' "$LOG_FILE" 2>/dev/null; then
    INTEG_RAN=true
  fi
  if [ "$INTEG_RAN" = true ] || stamp_fresh "integration"; then
    CHECKED=$(printf '%s' "$CHECKED" | jq -c '. + ["integration_test_passed"]')
  else
    DB_LIST=$(echo "$DB_CHANGED" | head -5 | tr '\n' ', ' | sed 's/,$//')
    MISSING=$(printf '%s' "$MISSING" | jq -c --arg files "$DB_LIST" \
      '. + [{"step": "integration_test", "reason": "Modified server/DB code but no integration tests ran", "hint": "Write and run integration tests against real local Supabase. Files: " + $files}]')
  fi
fi

# ── Result ───────────────────────────────────────────────────────────────

NUM_MISSING=$(printf '%s' "$MISSING" | jq 'length')

if [ "$NUM_MISSING" -eq 0 ]; then
  printf '{"pass":true,"missing":[],"checked":%s}\n' "$CHECKED"
else
  printf '{"pass":false,"missing":%s,"checked":%s}\n' "$MISSING" "$CHECKED"
fi
