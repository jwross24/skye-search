#!/usr/bin/env bash
set -euo pipefail

# Cross-agent review via claude -p (non-interactive, independent session).
# Runs after every 3 bead closures. Uses Sonnet for quality.
#
# IMPORTANT: Run this from a MANUAL TERMINAL, not from within Claude Code.
# Running claude -p inside a Claude Code Bash tool causes recursive invocation
# issues. When inside Claude Code, use the Agent tool to spawn a subagent instead.
#
# Usage: bash scripts/cross-review.sh [num_commits]
# Default: reviews last 3 commits

NUM_COMMITS=${1:-3}
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RESULTS="$PROJECT_DIR/.claude/.cross-review-results.json"

echo "Cross-review: checking last $NUM_COMMITS commits..."

# Get the diff
DIFF=$(git diff "HEAD~${NUM_COMMITS}..HEAD" --no-color 2>/dev/null || git diff HEAD --no-color)

if [ -z "$DIFF" ]; then
  echo "No changes to review."
  echo "0" > "$PROJECT_DIR/.claude/.bead-close-count-global"
  exit 0
fi

CHANGED_FILES=$(git diff "HEAD~${NUM_COMMITS}..HEAD" --name-only 2>/dev/null || git diff HEAD --name-only)
echo "Files changed:"
echo "$CHANGED_FILES" | sed 's/^/  /'
echo ""

# Run the review
echo "Running review with claude -p (Sonnet, independent session)..."
REVIEW=$(echo "$DIFF" | claude -p \
  --model sonnet \
  --output-format json \
  --max-budget-usd 0.50 \
  "You are a staff engineer reviewing code written by an AI agent. This diff represents the last $NUM_COMMITS commits.

Review for:
1. CRITICAL: Bugs that will crash in production (null derefs, missing await, wrong types)
2. CRITICAL: Security issues (auth bypasses, secret exposure, injection, missing RLS)
3. HIGH: Data loss (silent errors, discarded input, missing DB writes)
4. HIGH: API misuse (wrong SDK methods, stale patterns, missing error handling)
5. MEDIUM: Dead code, unused imports, redundant logic

For each finding:
- File and approximate line
- Severity (CRITICAL/HIGH/MEDIUM)
- What's wrong
- Specific fix

If no issues found, say 'PASS: No critical or high issues found.'
Do NOT flag style, naming, or low-priority issues." 2>&1) || true

echo "$REVIEW" > "$RESULTS"

# Reset the global bead counter (unlocks next bead for all agents)
echo "0" > "$PROJECT_DIR/.claude/.bead-close-count-global"

# Parse and display results
echo ""
echo "═══════════════════════════════════════════"
echo "  Cross-Review Results"
echo "═══════════════════════════════════════════"

if echo "$REVIEW" | jq -e '.result' &>/dev/null; then
  echo "$REVIEW" | jq -r '.result'
else
  # Fallback: if not JSON, print raw output
  echo "$REVIEW"
fi

echo ""
echo "Results saved to .claude/.cross-review-results.json"
echo "Counter reset — next bead is unblocked."
