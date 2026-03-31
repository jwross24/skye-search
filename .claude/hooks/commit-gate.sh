#!/usr/bin/env bash
set -euo pipefail

# Unified commit gate — checks ALL pre-commit conditions in a single process.
#
# Merged from: pre-commit-gate.sh, agent-browser-gate.sh, impeccable-gate.sh, resend-gate.sh
# With "if": "Bash(git commit*)" in settings.json, this only fires on git commit.
#
# Checks (in order):
#   1. --no-verify flag (always blocked)
#   2. Verify stamp (bun run verify ran recently — includes ntm scan)
#   3. Agent-browser stamp (if UI bead with .tsx files)
#   4. Impeccable stamp (if UI bead with .tsx files)
#   5. Resend stamp (if email bead)
#
# Hook: PreToolUse[Bash] with if: "Bash(git commit*)"
# Exit 0 = allow, Exit 2 = block

source "$(dirname "$0")/_stamp-helpers.sh"

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0
init_session_id "$INPUT"

# Only gate git commit commands (search full command — compound cmds put commit on line 2+)
if ! echo "$CMD" | grep -Eq 'git\s+commit'; then
  exit 0
fi

# ── Check 1: --no-verify ────────────────────────────────────────────────

if echo "$CMD" | grep -Eq '\-\-no-verify'; then
  echo "BLOCKED: --no-verify is not allowed." >&2
  echo "" >&2
  echo "  → Fix the hook issue instead of bypassing it" >&2
  exit 2
fi

# ── Check 2: Verify stamp (bun run verify, includes ntm scan) ──────────

if ! stamp_is_fresh "verify" 600; then
  echo "BLOCKED: No fresh verify stamp for this session." >&2
  echo "" >&2
  echo "  → bun run verify" >&2
  exit 2
fi

# ── Determine if this is a bead commit with special file types ──────────

IS_BEAD_COMMIT=false
if echo "$CMD" | grep -Eq 'br-'; then
  IS_BEAD_COMMIT=true
fi

# Check staged file types (one git diff --cached for all checks)
STAGED_FILES=""
if [ "$IS_BEAD_COMMIT" = "true" ]; then
  STAGED_FILES=$(git diff --cached --name-only 2>/dev/null || true)
fi

HAS_TSX=false
HAS_EMAIL=false

if [ -n "$STAGED_FILES" ]; then
  if echo "$STAGED_FILES" | grep -q '\.tsx$'; then
    HAS_TSX=true
  fi
  if echo "$STAGED_FILES" | grep -qE '(email-templates/|email-alerts|resend)'; then
    HAS_EMAIL=true
  fi
fi

# Also check files mentioned in the command itself (git add ... && git commit)
if [ "$IS_BEAD_COMMIT" = "true" ]; then
  if echo "$CMD" | grep -q '\.tsx'; then
    HAS_TSX=true
  fi
  if echo "$CMD" | grep -qE '(email-templates|email-alerts|resend)'; then
    HAS_EMAIL=true
  fi
fi

# ── Check 3: Agent-browser stamp (UI beads with .tsx) ───────────────────

if [ "$HAS_TSX" = "true" ]; then
  if ! stamp_is_fresh "agent-browser" 600; then
    echo "BLOCKED: UI bead detected but agent-browser verification was not run." >&2
    echo "" >&2
    echo "  → agent-browser --session-name skye open http://localhost:3000/<route>" >&2
    echo "  → agent-browser snapshot -i" >&2
    echo "  → agent-browser errors" >&2
    echo "  → agent-browser close" >&2
    exit 2
  fi
fi

# ── Check 4: Impeccable stamp (UI beads with .tsx) ──────────────────────

if [ "$HAS_TSX" = "true" ]; then
  if ! stamp_is_fresh "impeccable" 300; then
    echo "BLOCKED: .tsx files staged but /impeccable skill was not invoked." >&2
    echo "" >&2
    echo "  → /impeccable" >&2
    exit 2
  fi
fi

# ── Check 5: Resend stamp (email beads) ─────────────────────────────────

if [ "$HAS_EMAIL" = "true" ]; then
  if ! stamp_is_fresh "resend" 300; then
    echo "BLOCKED: Email files staged but /resend skill was not invoked." >&2
    echo "" >&2
    echo "  → /resend" >&2
    exit 2
  fi
fi

# ── Check 6: Self-review disposition (bead commits with src/supabase changes) ──

HAS_CODE_CHANGES=false
ALL_STAGED=$(git diff --cached --name-only 2>/dev/null || true)
if echo "$ALL_STAGED" | grep -qE '^(src/|supabase/)'; then
  HAS_CODE_CHANGES=true
fi

if [ "$IS_BEAD_COMMIT" = "true" ] && [ "$HAS_CODE_CHANGES" = "true" ]; then
  # Extract bead ID from commit message (pattern: "bead-id:" at start of message)
  COMMIT_MSG=$(echo "$CMD" | grep -oP "(?<=<<'EOF'\n|<<EOF\n|^git commit -m \")[^\"]*" 2>/dev/null || true)
  if [ -z "$COMMIT_MSG" ]; then
    # Try extracting from heredoc body
    COMMIT_MSG=$(echo "$CMD" | sed -n '/EOF/,/EOF/p' | head -1 2>/dev/null || true)
  fi

  # Check for ANY disposition file for this session (not bead-specific,
  # since extracting bead ID from commit msg is fragile)
  DISP_PATTERN="${CLAUDE_PROJECT_DIR:-.}/.claude/.review-disposition-${_SESSION}-*.json"
  DISP_FILES=$(ls $DISP_PATTERN 2>/dev/null || true)

  if [ -z "$DISP_FILES" ]; then
    echo "BLOCKED: Bead commit with code changes but no self-review disposition found." >&2
    echo "" >&2
    echo "  Run self-review before committing (step 11 of marching orders):" >&2
    echo "" >&2
    echo '  Agent tool call:' >&2
    echo '    description: "Self-review <bead-id>"' >&2
    echo '    model: "sonnet"' >&2
    echo '    prompt: "Review ALL changed files for bugs, type errors, security..."' >&2
    echo "" >&2
    echo "  The subagent writes the disposition file automatically." >&2
    exit 2
  fi

  # Check freshness — disposition must be from this session (< 2 hours)
  NEWEST_DISP=$(ls -t $DISP_PATTERN 2>/dev/null | head -1)
  if [ -n "$NEWEST_DISP" ]; then
    if [ "$(uname)" = "Darwin" ]; then
      DISP_MOD=$(stat -f %m "$NEWEST_DISP")
    else
      DISP_MOD=$(stat -c %Y "$NEWEST_DISP")
    fi
    NOW=$(date +%s)
    DISP_AGE=$(( NOW - DISP_MOD ))
    if [ "$DISP_AGE" -gt 7200 ]; then
      echo "BLOCKED: Self-review disposition is stale ($(( DISP_AGE / 60 )) min old)." >&2
      echo "" >&2
      echo "  → Run a fresh self-review before committing" >&2
      exit 2
    fi
  fi
fi

exit 0
