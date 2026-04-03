#!/usr/bin/env bash
set -euo pipefail

# Blocks commits when staged source files import packages that aren't
# reflected in a staged package.json / bun.lock.
#
# Root cause: `bun add <pkg>` modifies package.json + bun.lock locally,
# but lint-staged's stash/restore cycle can silently drop them from the
# staged set. The build passes locally (node_modules has the pkg) but
# CI fails (package.json doesn't list it).
#
# This script catches that gap at commit time.

# Only check if there are staged .ts/.tsx files
STAGED_SOURCE=$(git diff --cached --name-only --diff-filter=ACM -- '*.ts' '*.tsx' 2>/dev/null || true)
if [ -z "$STAGED_SOURCE" ]; then
  exit 0
fi

# Check if package.json or bun.lock have unstaged modifications
PKG_DIRTY=false
LOCK_DIRTY=false

if git diff --name-only -- package.json 2>/dev/null | grep -q package.json; then
  PKG_DIRTY=true
fi

if git diff --name-only -- bun.lock 2>/dev/null | grep -q bun.lock; then
  LOCK_DIRTY=true
fi

if [ "$PKG_DIRTY" = true ] || [ "$LOCK_DIRTY" = true ]; then
  echo ""
  echo "⚠️  DEPENDENCY CHECK FAILED"
  echo ""
  if [ "$PKG_DIRTY" = true ]; then
    echo "  package.json has unstaged changes (did you run 'bun add' without staging?)"
  fi
  if [ "$LOCK_DIRTY" = true ]; then
    echo "  bun.lock has unstaged changes"
  fi
  echo ""
  echo "  Fix: git add package.json bun.lock"
  echo ""
  exit 1
fi
