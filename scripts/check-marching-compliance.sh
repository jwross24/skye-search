#!/usr/bin/env bash
set -euo pipefail

# Check marching order compliance based on what files were changed.
#
# Inspects git diff to determine which marching order steps apply,
# then verifies bead-scoped stamps that they were actually performed.
#
# Input: $1 — session ID, $2 — bead ID (optional, for bead-scoped stamp lookup)
# Output: JSON { "pass": bool, "missing": [...], "checked": [...] }
#
# Checks:
# 1. .tsx files changed → /impeccable stamp required
# 2. UI page/component .tsx changed → agent-browser stamp required
# 3. ai-scoring.ts or urgency-scoring.ts changed → golden-set stamp required
# 4. server action / DB code changed → integration test evidence required

SESSION_ID="${1:?Usage: check-marching-compliance.sh <session_id> [bead_id]}"
BEAD_ID="${2:-}"
CLAUDE_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude"

# Source shared stamp helpers
HOOKS_DIR="$(cd "$(dirname "$0")/../.claude/hooks" 2>/dev/null && pwd)" || HOOKS_DIR=""
if [ -n "$HOOKS_DIR" ] && [ -f "$HOOKS_DIR/_stamp-helpers.sh" ]; then
  source "$HOOKS_DIR/_stamp-helpers.sh"
  _SESSION="$SESSION_ID"
fi

MISSING="[]"
CHECKED="[]"

# Resolve bead ID: prefer explicit arg, then current-bead file, then glob
if [ -z "$BEAD_ID" ]; then
  BEAD_ID=$(current_bead 2>/dev/null || echo "")
fi

# Get files changed: use bead base commit if available
BEAD_BASE=""
if [ -n "$BEAD_ID" ] && [ -f "${CLAUDE_DIR}/.bead-base-commit-${BEAD_ID}" ]; then
  BEAD_BASE=$(cat "${CLAUDE_DIR}/.bead-base-commit-${BEAD_ID}" 2>/dev/null)
fi
# Fallback: any bead base commit file (backward compat)
if [ -z "$BEAD_BASE" ]; then
  for base_file in "${CLAUDE_DIR}/.bead-base-commit-"*; do
    [ -f "$base_file" ] && BEAD_BASE=$(cat "$base_file" 2>/dev/null) && break
  done
fi

if [ -n "$BEAD_BASE" ]; then
  CHANGED_FILES=$(git diff --name-only "${BEAD_BASE}..HEAD" 2>/dev/null || true)
elif [ -n "$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)" ] && [ "$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)" -gt 0 ]; then
  CHANGED_FILES=$(git diff --name-only origin/main...HEAD 2>/dev/null || true)
else
  CHANGED_FILES=$(git diff --name-only HEAD~5..HEAD 2>/dev/null || true)
fi
if [ -z "$CHANGED_FILES" ]; then
  LOG_FILE="${CLAUDE_DIR}/.command-log-${SESSION_ID}.jsonl"
  if [ -f "$LOG_FILE" ]; then
    CHANGED_FILES=$(grep -oE '"file_path":"[^"]+\.tsx?"' "$LOG_FILE" 2>/dev/null | sed 's/"file_path":"//;s/"//' | sort -u || true)
  fi
fi

if [ -z "$CHANGED_FILES" ]; then
  echo '{"pass":true,"missing":[],"checked":["no_changes"]}'
  exit 0
fi

# has_stamp() from _stamp-helpers.sh handles bead-scoped → session fallback.

# ── Check 1: .tsx changes → /impeccable required ────────────────────────
TSX_CHANGED=$(echo "$CHANGED_FILES" | grep '\.tsx$' | grep -v 'test\.tsx$' | grep -v 'src/components/ui/' || true)

if [ -n "$TSX_CHANGED" ]; then
  CHECKED=$(printf '%s' "$CHECKED" | jq -c '. + ["impeccable_check"]')
  if has_stamp "impeccable" "$BEAD_ID"; then
    CHECKED=$(printf '%s' "$CHECKED" | jq -c '. + ["impeccable_passed"]')
  else
    TSX_LIST=$(echo "$TSX_CHANGED" | head -5 | tr '\n' ', ' | sed 's/,$//')
    MISSING=$(printf '%s' "$MISSING" | jq -c --arg files "$TSX_LIST" \
      '. + [{"step": "impeccable", "reason": "Modified .tsx files but /impeccable was not invoked", "hint": "Run /impeccable skill to audit UI quality. Files: " + $files}]')
  fi
fi

# ── Check 2: UI page/component .tsx → agent-browser E2E required ────────
UI_CHANGED=$(echo "$CHANGED_FILES" | grep -E '(app/.*page\.tsx|components/.+\.tsx)' | grep -v 'test\.tsx$' | grep -v 'components/ui/' || true)

if [ -n "$UI_CHANGED" ]; then
  CHECKED=$(printf '%s' "$CHECKED" | jq -c '. + ["agent_browser_check"]')
  if has_stamp "agent-browser" "$BEAD_ID"; then
    CHECKED=$(printf '%s' "$CHECKED" | jq -c '. + ["agent_browser_passed"]')
  else
    MISSING=$(printf '%s' "$MISSING" | jq -c \
      '. + [{"step": "agent_browser", "reason": "Modified UI components but agent-browser E2E was not run", "hint": "Run agent-browser to verify the UI visually. Log in, navigate, snapshot, interact."}]')
  fi
fi

# ── Check 3: Scoring files → golden set regression required ──────────────
SCORING_CHANGED=$(echo "$CHANGED_FILES" | grep -E '(ai-scoring\.ts|urgency-scoring\.ts)' | grep -v 'test' || true)

if [ -n "$SCORING_CHANGED" ]; then
  CHECKED=$(printf '%s' "$CHECKED" | jq -c '. + ["golden_set_check"]')
  if has_stamp "golden-set" "$BEAD_ID"; then
    CHECKED=$(printf '%s' "$CHECKED" | jq -c '. + ["golden_set_passed"]')
  else
    MISSING=$(printf '%s' "$MISSING" | jq -c \
      '. + [{"step": "golden_set", "reason": "Modified scoring files but golden set regression was not run", "hint": "Run: bun run test src/lib/__tests__/golden-set-eval.test.ts — or stamp manually after verifying scoring quality."}]')
  fi
fi

# ── Check 4: Server actions / DB code → integration tests required ───────
DB_CHANGED=$(echo "$CHANGED_FILES" | grep -E '(actions\.ts|supabase/.*\.ts|db/.*\.ts)' | grep -v 'test' | grep -v '\.sql$' || true)

if [ -n "$DB_CHANGED" ]; then
  CHECKED=$(printf '%s' "$CHECKED" | jq -c '. + ["integration_test_check"]')
  LOG_FILE="${CLAUDE_DIR}/.command-log-${SESSION_ID}.jsonl"
  INTEG_RAN=false
  if [ -f "$LOG_FILE" ] && grep -q 'integration.test' "$LOG_FILE" 2>/dev/null; then
    INTEG_RAN=true
  fi
  if [ "$INTEG_RAN" = true ] || has_stamp "integration" "$BEAD_ID"; then
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
