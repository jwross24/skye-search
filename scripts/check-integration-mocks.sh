#!/usr/bin/env bash
set -euo pipefail

# Enforce: files named *.integration.test.ts must NOT mock Supabase.
# Integration tests hit real local Supabase — mocks defeat the purpose.
#
# Convention:
#   *.test.ts     = unit test (mocks allowed)
#   *.integration.test.ts = integration test (real DB, no Supabase mocks)
#
# Why: Session 2026-03-31 shipped 712 "passing" tests that all used mocked
# Supabase chains. Citizenship filter SQL mismatch, column name drift, and
# RLS blocking writes would all pass mocked tests but fail in production.

VIOLATIONS=0

for f in $(find src tests -name "*.integration.test.ts" -o -name "*.integration.test.tsx" 2>/dev/null); do
  # Check for Supabase mock patterns
  if grep -qE "vi\.mock\(.*(supabase|@supabase)" "$f" 2>/dev/null; then
    echo "FAIL: $f mocks Supabase — integration tests must use real DB"
    echo "  → Remove vi.mock() for Supabase and use dotenv to load .env.local"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi

  # Check that dotenv is loaded (real env vars needed)
  if ! grep -qE "dotenv|\.env\.local|loadEnvConfig" "$f" 2>/dev/null; then
    echo "WARN: $f doesn't load .env.local — integration tests need real env vars"
    echo "  → Add: import { config } from 'dotenv'; config({ path: '.env.local' })"
  fi
done

if [ "$VIOLATIONS" -gt 0 ]; then
  echo ""
  echo "BLOCKED: $VIOLATIONS integration test(s) mock Supabase."
  echo "Integration tests must hit real local Supabase (supabase start)."
  exit 1
fi

# Count integration test files
COUNT=$(find src tests -name "*.integration.test.ts" -o -name "*.integration.test.tsx" 2>/dev/null | wc -l | tr -d ' ')
if [ "$COUNT" -eq 0 ]; then
  echo "No integration test files found (*.integration.test.ts)"
else
  echo "✓ $COUNT integration test file(s) verified — no Supabase mocks"
fi
exit 0
