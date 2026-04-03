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

# Read all commands from log (write to temp file to avoid SIGPIPE in pipelines with set -o pipefail)
_CMDS_TMP=$(mktemp)
trap 'rm -f "$_CMDS_TMP"' EXIT
if [ -f "$LOG_FILE" ]; then
  jq -r '.cmd' "$LOG_FILE" > "$_CMDS_TMP" 2>/dev/null || true
fi
ALL_CMDS=$(cat "$_CMDS_TMP" 2>/dev/null) || ALL_CMDS=""

MISSING="[]"

# ── Rule 1: New migrations → supabase db push ────────────────────────────
if echo "$CHANGED" | grep -q '^supabase/migrations/'; then
  if ! grep -qE 'supabase db push|supabase db reset' "$_CMDS_TMP"; then
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
    if ! grep -qE "supabase functions deploy.*$func|supabase functions deploy$" "$_CMDS_TMP"; then
      MISSING=$(printf '%s' "$MISSING" | jq -c --arg f "$func" '. + [{
        "step": ("supabase functions deploy " + $f),
        "reason": ("Edge Function " + $f + " modified but not deployed"),
        "hint": ("Run: supabase functions deploy " + $f)
      }]')
    fi
  done
fi

# ── Rule 3: New env vars in code → vercel env / supabase secrets ─────────
# Separate Vercel (src/**) and Supabase Edge Function (supabase/functions/**)
# env var references — they deploy to different runtimes.
VERCEL_ENV_REFS=""
SUPA_ENV_REFS=""
for f in $(echo "$CHANGED" | grep -E '\.(ts|tsx)$' | grep -vE '\.test\.(ts|tsx)$|\.integration\.test\.(ts|tsx)$|\.spec\.(ts|tsx)$|^tests/'); do
  [ -f "$f" ] || continue
  # Exclude: Vercel builtins (NODE_ENV, VERCEL, VERCEL_URL, CI) — auto-provided
  # Exclude: NEXT_PUBLIC_* — baked into build at compile time, not deployment secrets
  REFS=$(grep -ohE "process\.env\.([A-Z_]+)|Deno\.env\.get\(['\"]([A-Z_]+)" "$f" 2>/dev/null | grep -ohE '[A-Z_]{3,}' | grep -vE '^(NODE_ENV|VERCEL|VERCEL_URL|CI|NEXT_PUBLIC_.*)$' | sort -u) || true
  if echo "$f" | grep -q '^supabase/functions/'; then
    SUPA_ENV_REFS="$SUPA_ENV_REFS $REFS"
  else
    VERCEL_ENV_REFS="$VERCEL_ENV_REFS $REFS"
  fi
done

# 3a: Vercel routes (src/**) → vercel env
if [ -n "$(echo "$VERCEL_ENV_REFS" | xargs)" ]; then
  if ! grep -qE 'vercel env' "$_CMDS_TMP"; then
    UNIQUE_VARS=$(echo "$VERCEL_ENV_REFS" | tr ' ' '\n' | sort -u | grep -v '^$' | head -5)
    if [ -n "$UNIQUE_VARS" ]; then
      VAR_LIST=$(echo "$UNIQUE_VARS" | tr '\n' ', ' | sed 's/,$//')
      MISSING=$(printf '%s' "$MISSING" | jq -c --arg v "$VAR_LIST" '. + [{
        "step": "vercel env add",
        "reason": ("Vercel code references env vars (" + $v + ") — verify they are set in production"),
        "hint": "Run: vercel env ls | grep VAR_NAME — or set with: vercel env add VAR_NAME production --force"
      }]')
    fi
  fi
fi

# 3b: Supabase Edge Functions → supabase secrets set
if [ -n "$(echo "$SUPA_ENV_REFS" | xargs)" ]; then
  if ! grep -qE 'supabase secrets (set|list)' "$_CMDS_TMP"; then
    UNIQUE_VARS=$(echo "$SUPA_ENV_REFS" | tr ' ' '\n' | sort -u | grep -v '^$' | head -5)
    if [ -n "$UNIQUE_VARS" ]; then
      VAR_LIST=$(echo "$UNIQUE_VARS" | tr '\n' ', ' | sed 's/,$//')
      MISSING=$(printf '%s' "$MISSING" | jq -c --arg v "$VAR_LIST" '. + [{
        "step": "supabase secrets set",
        "reason": ("Edge Function code references env vars (" + $v + ") — verify they are set as Supabase secrets"),
        "hint": "Run: supabase secrets list | grep VAR_NAME — or set with: supabase secrets set VAR_NAME=value --project-ref <ref>"
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
