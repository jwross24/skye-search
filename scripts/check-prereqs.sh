#!/usr/bin/env bash
# Verify all prerequisites for development work.
# Run: bash scripts/check-prereqs.sh
# Called by: PreToolUse hook before bv/br commands

set -euo pipefail

ERRORS=0

# ─── Local Supabase ──────────────────────────────────────────────────────

if curl -sf --max-time 2 http://127.0.0.1:54321/auth/v1/health > /dev/null 2>&1; then
  echo "✓ Local Supabase running"
else
  echo "✗ Local Supabase NOT running — run: supabase start"
  ERRORS=$((ERRORS + 1))
fi

# ─── Dev server ──────────────────────────────────────────────────────────

DEV_PORT=""
for port in 3000 3001 3002; do
  if curl -sf --max-time 2 -o /dev/null "http://localhost:$port/" 2>/dev/null; then
    DEV_PORT=$port
    break
  fi
done

if [ -n "$DEV_PORT" ]; then
  echo "✓ Dev server running on port $DEV_PORT"
else
  echo "✗ Dev server NOT running — run: bun run dev"
  ERRORS=$((ERRORS + 1))
fi

# ─── .env.local points to local Supabase ─────────────────────────────────

if [ -f .env.local ]; then
  if grep -q "127.0.0.1:54321" .env.local; then
    echo "✓ .env.local points to local Supabase"
  else
    echo "✗ .env.local does NOT point to local Supabase (127.0.0.1:54321)"
    echo "  WARNING: You may be pointing at production!"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "✗ .env.local missing — copy from .env.local.example"
  ERRORS=$((ERRORS + 1))
fi

# ─── Docker running ──────────────────────────────────────────────────────

if docker info > /dev/null 2>&1; then
  echo "✓ Docker running"
else
  echo "✗ Docker NOT running — start Docker/OrbStack"
  ERRORS=$((ERRORS + 1))
fi

# ─── Optional API keys (warn, don't block) ───────────────────────────────
# These keys gate features. Missing or placeholder values fail open at
# runtime ("AI analysis unavailable", no email send, etc.) — surface them
# here so the next agent doesn't waste time debugging silent feature gaps.

if [ -f .env.local ]; then
  for key in ANTHROPIC_API_KEY EXA_API_KEY RESEND_API_KEY; do
    line=$(grep "^${key}=" .env.local 2>/dev/null || true)
    val="${line#*=}"
    if [ -z "$line" ] || [ -z "$val" ] || echo "$val" | grep -qE '^(your_|sk-ant-\.\.\.|re_your_|placeholder)'; then
      echo "⚠ ${key} not set or placeholder in .env.local — features that depend on it will fail open"
    fi
  done
fi

# ─── Result ──────────────────────────────────────────────────────────────

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "All prerequisites met."
  exit 0
else
  echo "BLOCKED: $ERRORS prerequisite(s) failed. Fix before starting bead work."
  exit 1
fi
