#!/usr/bin/env bash
set -euo pipefail

# Haiku classifier — infer required integration evidence from bead spec.
# Used as fallback when no test-contract block exists in the bead description.
#
# Input: bead ID as $1
# Output: JSON array of {type, evidence} objects
# Cost: < $0.01 per call (Haiku)
#
# Evidence taxonomy:
#   edge-function    — supabase functions serve + curl
#   agent-browser    — agent-browser snapshot/interact
#   api-route        — curl against localhost API routes
#   db-query         — supabase db query or psql
#   db-push          — supabase db push (migration deploy)
#   function-deploy  — supabase functions deploy
#   storage-upload   — file upload through Supabase Storage
#   external-api     — curl to external APIs (Claude, Exa, Resend)
#   hook-pipe-test   — echo JSON | hook script (pipe test)
#   prod-smoke       — curl against production endpoint
#   none             — no integration test needed (docs, config, rules)

BEAD_ID="${1:?Usage: classify-bead.sh <bead-id>}"

# Get bead title and description
BEAD_JSON=$(br show "$BEAD_ID" --json 2>/dev/null) || {
  echo '[{"type":"none","evidence":""}]'
  exit 0
}

TITLE=$(printf '%s' "$BEAD_JSON" | jq -r '.[0].title // "unknown"')
DESC=$(printf '%s' "$BEAD_JSON" | jq -r '.[0].description // ""')

# Truncate description to ~2000 chars to keep cost down
DESC_TRUNC=$(printf '%s' "$DESC" | head -c 2000)

PROMPT="You are a build gate classifier. Given a bead (task) spec, determine what integration tests are needed before it can be closed.

Evidence types (pick ALL that apply):
- edge-function: Supabase Edge Function (needs: supabase functions serve + curl)
- agent-browser: UI component or page (needs: agent-browser snapshot/interact)
- api-route: Next.js API route (needs: curl against localhost)
- db-query: Database read/write (needs: supabase db query or psql verification)
- db-push: Schema migration (needs: supabase db push)
- function-deploy: Edge Function deployment (needs: supabase functions deploy)
- storage-upload: File storage (needs: upload through Supabase Storage)
- external-api: External API integration (needs: real API call to Claude/Exa/Resend)
- hook-pipe-test: CLI hook or script (needs: echo JSON | script pipe test)
- prod-smoke: Production verification (needs: curl against prod)
- none: No integration test needed (docs-only, config-only, rules-only)

For each type, provide the grep pattern that should appear in the command log.

Title: ${TITLE}
Description: ${DESC_TRUNC}

Respond with ONLY a JSON array. Example:
[{\"type\":\"agent-browser\",\"evidence\":\"agent-browser\"},{\"type\":\"api-route\",\"evidence\":\"curl.*localhost\"}]

If no integration test is needed: [{\"type\":\"none\",\"evidence\":\"\"}]"

# Call Haiku via claude -p
RESULT=$(printf '%s' "$PROMPT" | claude -p \
  --model haiku \
  --bare \
  --max-turns 1 \
  --output-format json \
  2>/dev/null) || {
  # If claude -p fails, fall back to "none" (don't block)
  echo '[{"type":"none","evidence":""}]'
  exit 0
}

# Extract the JSON result — handle both raw JSON and wrapped format
if printf '%s' "$RESULT" | jq -e 'type == "array"' &>/dev/null; then
  printf '%s' "$RESULT" | jq -c '.'
elif printf '%s' "$RESULT" | jq -e '.result' &>/dev/null; then
  # claude -p --output-format json wraps in {result: "..."}
  INNER=$(printf '%s' "$RESULT" | jq -r '.result')
  if printf '%s' "$INNER" | jq -e 'type == "array"' &>/dev/null; then
    printf '%s' "$INNER" | jq -c '.'
  else
    # Try to extract JSON array from the text
    EXTRACTED=$(printf '%s' "$INNER" | grep -oE '\[.*\]' | head -1) || true
    if printf '%s' "$EXTRACTED" | jq -e 'type == "array"' &>/dev/null 2>&1; then
      printf '%s' "$EXTRACTED" | jq -c '.'
    else
      echo '[{"type":"none","evidence":""}]'
    fi
  fi
else
  echo '[{"type":"none","evidence":""}]'
fi
