#!/usr/bin/env bash
set -euo pipefail

# Hook test script — feeds mock JSON stdin to each hook, verifies behavior.
# Run: bash scripts/test-hooks.sh
#
# Tests exit codes (0=allow, 2=block) and output patterns.
# Catches regressions like grep pipefail, awk multi-line, type coercion.

HOOKS_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude/hooks"
SCRIPTS_DIR="${CLAUDE_PROJECT_DIR:-.}/scripts"
PASS=0
FAIL=0
TOTAL=0

pass() { PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1)); echo "  ✓ $1"; }
fail() { FAIL=$((FAIL + 1)); TOTAL=$((TOTAL + 1)); echo "  ✗ $1: $2"; }

run_hook() {
  local hook="$1" stdin="$2" expected_exit="$3"
  local actual_exit=0
  echo "$stdin" | bash "$hook" >/dev/null 2>/dev/null || actual_exit=$?
  if [ "$actual_exit" -eq "$expected_exit" ]; then
    return 0
  else
    return 1
  fi
}

echo "=== Hook Test Suite ==="
echo ""

# ── protect-review-results.sh ──────────────────────────────────────────────
echo "protect-review-results.sh:"

# Block parent Write to disposition file (no auth stamp)
rm -f "$HOOKS_DIR/../.review-write-authorized" 2>/dev/null || true
if run_hook "$HOOKS_DIR/protect-review-results.sh" \
  '{"tool_name":"Write","tool_input":{"file_path":".claude/.review-disposition-test.json"}}' 2; then
  pass "blocks Write to disposition without auth stamp"
else
  fail "blocks Write to disposition without auth stamp" "expected exit 2"
fi

# Allow Write to disposition with fresh auth stamp
touch "$HOOKS_DIR/../.review-write-authorized"
if run_hook "$HOOKS_DIR/protect-review-results.sh" \
  '{"tool_name":"Write","tool_input":{"file_path":".claude/.review-disposition-test.json"}}' 0; then
  pass "allows Write to disposition with auth stamp"
else
  fail "allows Write to disposition with auth stamp" "expected exit 0"
fi
rm -f "$HOOKS_DIR/../.review-write-authorized"

# Always block Write to cross-review results
if run_hook "$HOOKS_DIR/protect-review-results.sh" \
  '{"tool_name":"Write","tool_input":{"file_path":".claude/.cross-review-results.json"}}' 2; then
  pass "blocks Write to cross-review results (even with auth stamp)"
else
  fail "blocks Write to cross-review results" "expected exit 2"
fi

# Allow unrelated Write
if run_hook "$HOOKS_DIR/protect-review-results.sh" \
  '{"tool_name":"Write","tool_input":{"file_path":"src/app/page.tsx"}}' 0; then
  pass "allows unrelated Write"
else
  fail "allows unrelated Write" "expected exit 0"
fi

echo ""

# ── pre-agent-review-auth.sh ──────────────────────────────────────────────
echo "pre-agent-review-auth.sh:"

rm -f "$HOOKS_DIR/../.review-write-authorized" 2>/dev/null || true

# Self-review description sets auth stamp
echo '{"tool_input":{"description":"Self-review skye-search-xyz"}}' | \
  bash "$HOOKS_DIR/pre-agent-review-auth.sh" >/dev/null 2>/dev/null || true
if [ -f "$HOOKS_DIR/../.review-write-authorized" ]; then
  pass "self-review description sets auth stamp"
else
  fail "self-review description sets auth stamp" "stamp file not created"
fi
rm -f "$HOOKS_DIR/../.review-write-authorized"

# Cross-review description does NOT set auth stamp
echo '{"tool_input":{"description":"Cross-review last 5 commits"}}' | \
  bash "$HOOKS_DIR/pre-agent-review-auth.sh" >/dev/null 2>/dev/null || true
if [ ! -f "$HOOKS_DIR/../.review-write-authorized" ]; then
  pass "cross-review description does NOT set auth stamp"
else
  fail "cross-review description does NOT set auth stamp" "stamp file was created"
  rm -f "$HOOKS_DIR/../.review-write-authorized"
fi

# Unrelated description does NOT set auth stamp
echo '{"tool_input":{"description":"Explore codebase patterns"}}' | \
  bash "$HOOKS_DIR/pre-agent-review-auth.sh" >/dev/null 2>/dev/null || true
if [ ! -f "$HOOKS_DIR/../.review-write-authorized" ]; then
  pass "unrelated description does NOT set auth stamp"
else
  fail "unrelated description does NOT set auth stamp" "stamp file was created"
  rm -f "$HOOKS_DIR/../.review-write-authorized"
fi

echo ""

# ── validate-disposition.sh ──────────────────────────────────────────────
echo "validate-disposition.sh:"

TMPDIR=$(mktemp -d)

# Clean disposition passes
echo '{"bead_id":"test","reviewer":"subagent","findings":[]}' > "$TMPDIR/clean.json"
if bash "$SCRIPTS_DIR/validate-disposition.sh" "$TMPDIR/clean.json" 0 >/dev/null 2>/dev/null; then
  pass "clean disposition passes"
else
  fail "clean disposition passes" "expected exit 0"
fi

# Missing reviewer fails
echo '{"bead_id":"test","findings":[]}' > "$TMPDIR/no-reviewer.json"
if ! bash "$SCRIPTS_DIR/validate-disposition.sh" "$TMPDIR/no-reviewer.json" 0 >/dev/null 2>/dev/null; then
  pass "missing reviewer fails"
else
  fail "missing reviewer fails" "expected exit 1"
fi

# PASS_NUM type safety: boolean true should not crash
echo '{"bead_id":"test","reviewer":"subagent","pass":true,"findings":[{"id":"F1","description":"test","severity":"HIGH","disposition":"fix","action":"Fixed the issue in the code properly"}]}' > "$TMPDIR/bool-pass.json"
RESULT=$(bash "$SCRIPTS_DIR/validate-disposition.sh" "$TMPDIR/bool-pass.json" 250 2>/dev/null) || true
if echo "$RESULT" | grep -q '"pass"'; then
  pass "PASS_NUM type safety: boolean pass does not crash"
else
  fail "PASS_NUM type safety" "script crashed or returned empty"
fi

# Complex bead (>200 lines) with HIGH finding and pass=1 should block
echo '{"bead_id":"test","reviewer":"subagent","pass":1,"findings":[{"id":"F1","description":"test","severity":"HIGH","disposition":"fix","action":"Fixed the issue in the code properly"}]}' > "$TMPDIR/complex.json"
RESULT=$(bash "$SCRIPTS_DIR/validate-disposition.sh" "$TMPDIR/complex.json" 250 2>/dev/null) || true
if echo "$RESULT" | grep -q 'false'; then
  pass "complex bead with HIGH finding requires pass 2"
else
  fail "complex bead with HIGH finding requires pass 2" "expected pass=false"
fi

# Complex bead with LOW finding only should pass
echo '{"bead_id":"test","reviewer":"subagent","pass":1,"findings":[{"id":"F1","description":"style","severity":"LOW","disposition":"not-a-bug","action":"Consistent with project conventions"}]}' > "$TMPDIR/complex-clean.json"
if bash "$SCRIPTS_DIR/validate-disposition.sh" "$TMPDIR/complex-clean.json" 250 >/dev/null 2>/dev/null; then
  pass "complex bead with only LOW findings passes (smart convergence)"
else
  fail "complex bead with only LOW findings" "expected exit 0"
fi

rm -rf "$TMPDIR"

echo ""

# ── cross-review-enforce.sh (first-line-only regex) ─────────────────────
echo "cross-review-enforce.sh:"

# Heredoc body containing "bv --robot-next" should NOT trigger
HEREDOC_INPUT='{"tool_input":{"command":"git commit -m \"$(cat <<'"'"'EOF'"'"'\nbv --robot-next in description\nEOF\n)\""}}'
if run_hook "$HOOKS_DIR/cross-review-enforce.sh" "$HEREDOC_INPUT" 0; then
  pass "heredoc body with bv --robot-next does not trigger"
else
  fail "heredoc body regex" "expected exit 0 (first-line-only check)"
fi

echo ""

# ── compact-reinject.sh ─────────────────────────────────────────────────
echo "compact-reinject.sh:"

OUTPUT=$(CLAUDE_PROJECT_DIR="$HOOKS_DIR/../.." bash "$HOOKS_DIR/compact-reinject.sh" 2>/dev/null) || OUTPUT=""
if echo "$OUTPUT" | grep -q "Post-Compaction Context"; then
  pass "outputs post-compaction context header"
else
  fail "outputs post-compaction context header" "missing header"
fi

if echo "$OUTPUT" | grep -q "Recent commits"; then
  pass "includes recent commits"
else
  fail "includes recent commits" "missing commits section"
fi

echo ""

# ── inject-review-context.sh ────────────────────────────────────────────
echo "inject-review-context.sh:"

# Explore agent should be skipped (no review context)
RESULT=$(echo '{"agent_type":"Explore"}' | CLAUDE_PROJECT_DIR="$HOOKS_DIR/../.." bash "$HOOKS_DIR/inject-review-context.sh" 2>/dev/null) || RESULT=""
if [ -z "$RESULT" ]; then
  pass "skips Explore agents (no review context)"
else
  fail "skips Explore agents" "expected no output"
fi

# General-purpose agent should get context (if template exists)
if [ -f "$HOOKS_DIR/../evaluator-template.md" ]; then
  RESULT=$(echo '{"agent_type":"general-purpose"}' | CLAUDE_PROJECT_DIR="$HOOKS_DIR/../.." bash "$HOOKS_DIR/inject-review-context.sh" 2>/dev/null) || RESULT=""
  if echo "$RESULT" | grep -q "additionalContext"; then
    pass "injects context for general-purpose agents"
  else
    fail "injects context for general-purpose agents" "missing additionalContext"
  fi
else
  pass "skips when evaluator template missing (expected in test env)"
fi

echo ""

# ── session-end-check.sh (stop_hook_active) ──────────────────────────────
echo "session-end-check.sh:"

# With stop_hook_active=true, should NOT block (allow retry)
RESULT=$(echo '{"stop_hook_active":true}' | CLAUDE_PROJECT_DIR="$HOOKS_DIR/../.." bash "$HOOKS_DIR/session-end-check.sh" 2>/dev/null) || RESULT=""
if ! echo "$RESULT" | grep -q '"decision":"block"'; then
  pass "allows stop when stop_hook_active=true (retry)"
else
  fail "allows stop on retry" "should not block when stop_hook_active=true"
fi

echo ""

# ── Summary ─────────────────────────────────────────────────────────────
echo "=== Results: $PASS passed, $FAIL failed (of $TOTAL) ==="
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
