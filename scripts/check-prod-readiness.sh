#!/usr/bin/env bash
set -euo pipefail

# Check production readiness based on what files changed vs what commands ran.
# Infers required prod steps from git diff, verifies them in command log.
#
# Input:
#   $1 — command log JSONL path
#   $2 — number of commits to check (default: 1)
#
# Output: JSON {pass, missing: [{step, reason, hint}]}
# Exit: 0 = pass, 1 = missing steps

LOG_FILE="${1:?Usage: check-prod-readiness.sh <log-file> [num-commits]}"
NUM_COMMITS="${2:-1}"

# Get changed files from recent commits
CHANGED=$(git diff "HEAD~${NUM_COMMITS}..HEAD" --name-only 2>/dev/null) || CHANGED=""

if [ -z "$CHANGED" ]; then
  echo '{"pass":true,"missing":[]}'
  exit 0
fi

# Read all commands from log
ALL_CMDS=""
if [ -f "$LOG_FILE" ]; then
  ALL_CMDS=$(jq -r '.cmd' "$LOG_FILE" 2>/dev/null) || ALL_CMDS=""
fi

MISSING="[]"

# ── Rule 1: New migrations → supabase db push ────────────────────────────
if echo "$CHANGED" | grep -q '^supabase/migrations/'; then
  if ! echo "$ALL_CMDS" | grep -qE 'supabase db push|supabase db reset'; then
    MISSING=$(printf '%s' "$MISSING" | jq -c '. + [{
      "step": "supabase db push",
      "reason": "New migration files committed but not pushed to production",
      "hint": "Run: supabase db push"
    }]')
  fi
fi

# ── Rule 2: Edge Function changes → supabase functions deploy ────────────
if echo "$CHANGED" | grep -q '^supabase/functions/' && ! echo "$CHANGED" | grep -q '^supabase/functions/_shared/'; then
  # Extract which functions changed (directory name after supabase/functions/)
  FUNCS=$(echo "$CHANGED" | grep '^supabase/functions/' | grep -v '^supabase/functions/_shared/' | sed 's|supabase/functions/\([^/]*\)/.*|\1|' | sort -u)
  for func in $FUNCS; do
    if ! echo "$ALL_CMDS" | grep -qE "supabase functions deploy.*$func|supabase functions deploy$"; then
      MISSING=$(printf '%s' "$MISSING" | jq -c --arg f "$func" '. + [{
        "step": ("supabase functions deploy " + $f),
        "reason": ("Edge Function " + $f + " modified but not deployed"),
        "hint": ("Run: supabase functions deploy " + $f)
      }]')
    fi
  done
fi

# ── Rule 3: New env vars in code → vercel env ────────────────────────────
# Check if any committed .ts/.tsx files reference env vars not in the Vercel env list
NEW_ENV_REFS=""
for f in $(echo "$CHANGED" | grep -E '\.(ts|tsx)$'); do
  [ -f "$f" ] || continue
  # Find process.env.XXX or Deno.env.get('XXX') patterns in changed files
  REFS=$(grep -ohE "process\.env\.([A-Z_]+)|Deno\.env\.get\(['\"]([A-Z_]+)" "$f" 2>/dev/null | grep -ohE '[A-Z_]{3,}' | sort -u) || true
  NEW_ENV_REFS="$NEW_ENV_REFS $REFS"
done

if [ -n "$(echo "$NEW_ENV_REFS" | xargs)" ]; then
  # Check if vercel env was run at all during this session
  if ! echo "$ALL_CMDS" | grep -qE 'vercel env'; then
    # Only flag if this is a new env var (not previously deployed)
    UNIQUE_VARS=$(echo "$NEW_ENV_REFS" | tr ' ' '\n' | sort -u | grep -v '^$' | head -5)
    if [ -n "$UNIQUE_VARS" ]; then
      VAR_LIST=$(echo "$UNIQUE_VARS" | tr '\n' ', ' | sed 's/,$//')
      MISSING=$(printf '%s' "$MISSING" | jq -c --arg v "$VAR_LIST" '. + [{
        "step": "vercel env add",
        "reason": ("Code references env vars (" + $v + ") — verify they are set in production"),
        "hint": "Run: vercel env ls | grep VAR_NAME — or set with: vercel env add VAR_NAME production --force"
      }]')
    fi
  fi
fi

NUM_MISSING=$(printf '%s' "$MISSING" | jq 'length')
if [ "$NUM_MISSING" -eq 0 ]; then
  echo '{"pass":true,"missing":[]}'
  exit 0
else
  printf '{"pass":false,"missing":%s}\n' "$MISSING"
  exit 1
fi
