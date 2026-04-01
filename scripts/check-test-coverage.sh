#!/usr/bin/env bash
set -euo pipefail

# Enforce: every staged .tsx component and server action file must have a test.
# Runs as part of pre-commit or verify pipeline.
#
# Rules:
#   - src/components/**/*.tsx (except ui/) → must have co-located .test.tsx
#   - src/app/**/actions.ts with 'use server' → must have .test.ts
#   - src/app/api/**/route.ts → must have .test.ts
#
# Exit: 0 = all covered, 1 = missing tests

ERRORS=0

# Get staged or changed files (use git diff for staged, fallback to all)
if git diff --cached --name-only --diff-filter=ACM 2>/dev/null | grep -q '.'; then
  CHANGED=$(git diff --cached --name-only --diff-filter=ACM)
else
  # Fallback: check all files
  CHANGED=$(find src -name "*.tsx" -o -name "*.ts" 2>/dev/null)
fi

# Rule 1: Components must have tests (exclude ui/ primitives)
for f in $(echo "$CHANGED" | grep -E '^src/components/.*\.tsx$' | grep -v '\.test\.' | grep -v '/ui/'); do
  TEST_FILE="${f%.tsx}.test.tsx"
  if [ ! -f "$TEST_FILE" ]; then
    echo "MISSING TEST: $f"
    echo "  → Create: $TEST_FILE"
    ERRORS=$((ERRORS + 1))
  fi
done

# Rule 2: Server actions must have tests
for f in $(echo "$CHANGED" | grep -E '^src/app/.*/actions\.ts$'); do
  if grep -q "'use server'" "$f" 2>/dev/null; then
    DIR=$(dirname "$f")
    # Check for any test file in the same directory that tests actions
    if ! find "$DIR" -name "*actions*test*" -o -name "*actions*integration*" 2>/dev/null | grep -q .; then
      echo "MISSING TEST: $f (server action)"
      echo "  → Create unit test or integration test in $DIR/"
      ERRORS=$((ERRORS + 1))
    fi
  fi
done

# Rule 3: API routes must have tests
for f in $(echo "$CHANGED" | grep -E '^src/app/api/.*/route\.ts$'); do
  DIR=$(dirname "$f")
  if ! find "$DIR" -name "*test*" 2>/dev/null | grep -q .; then
    echo "MISSING TEST: $f (API route)"
    echo "  → Create: ${DIR}/route.test.ts"
    ERRORS=$((ERRORS + 1))
  fi
done

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "BLOCKED: $ERRORS file(s) missing tests."
  echo "Every component, server action, and API route needs a test."
  exit 1
fi

echo "✓ All staged files have test coverage"
exit 0
