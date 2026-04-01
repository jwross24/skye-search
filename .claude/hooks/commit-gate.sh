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

# ── Check 1b: git add . / git add -A in compound command ───────────────
# Catches: git add . && git commit, git add -A && git commit, etc.

if echo "$CMD" | grep -Eq 'git\s+add\s+(-[A]|--all|\.\s|\.$)'; then
  echo "BLOCKED: git add . / git add -A detected in commit command." >&2
  echo "" >&2
  echo "  Stage specific files instead:" >&2
  echo "  → git add src/lib/my-file.ts src/app/my-route/route.ts" >&2
  exit 2
fi

# ── Check 2: Verify stamp (bun run verify, includes ntm scan) ──────────

if ! stamp_is_fresh "verify" 600; then
  echo "BLOCKED: No fresh verify stamp for this session." >&2
  echo "" >&2
  echo "  → bun run verify" >&2
  exit 2
fi

# ── Check staged file types (ALWAYS — not just bead commits) ───────────
# Previous bug: only checked .tsx/email when commit message contained "br-".
# Bead IDs use formats like "d3y:", "55l:", etc. — checking unconditionally
# is simpler and more correct.

STAGED_FILES=$(git diff --cached --name-only 2>/dev/null || true)

HAS_TSX=false
HAS_EMAIL=false
HAS_SERVER_ACTION=false
HAS_CODE_CHANGES=false

if [ -n "$STAGED_FILES" ]; then
  if echo "$STAGED_FILES" | grep -q '\.tsx$'; then
    HAS_TSX=true
  fi
  if echo "$STAGED_FILES" | grep -qE '(email-templates/|email-alerts|resend)'; then
    HAS_EMAIL=true
  fi
  if echo "$STAGED_FILES" | grep -q 'actions\.ts'; then
    HAS_SERVER_ACTION=true
  fi
  if echo "$STAGED_FILES" | grep -qE '^(src/|supabase/)'; then
    HAS_CODE_CHANGES=true
  fi
fi

# Note: only check STAGED files, not the command string.
# Command string includes commit message text which causes false positives
# (e.g., mentioning ".tsx" in a commit message description).

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

# ── Check 6: Data persistence invariant (server actions must write to DB) ──

if [ "$HAS_SERVER_ACTION" = "true" ]; then
  # Check staged actions.ts files for stub returns without DB calls
  for f in $(echo "$STAGED_FILES" | grep 'actions\.ts$'); do
    if [ -f "$f" ] && head -1 "$f" | grep -q "'use server'"; then
      # Check if any exported async function returns { success: true } without createClient
      if grep -q "success: true" "$f" && ! grep -q "createClient\|createServiceClient\|supabase" "$f"; then
        echo "BLOCKED: Server action '$f' returns success without a database call." >&2
        echo "" >&2
        echo "  Data persistence invariant: every server action MUST write to Supabase." >&2
        echo "  → Add a real database operation, or don't create the action yet." >&2
        exit 2
      fi
    fi
  done
fi

# ── Check 7: Self-review disposition (commits with src/supabase changes) ──

if [ "$HAS_CODE_CHANGES" = "true" ]; then
  # Check for ANY disposition file for this session (not bead-specific,
  # since extracting bead ID from commit msg is fragile)
  # Check for session-prefixed disposition files (canonical)
  DISP_PATTERN="${CLAUDE_PROJECT_DIR:-.}/.claude/.review-disposition-${_SESSION}-*.json"
  DISP_FILES=$(ls $DISP_PATTERN 2>/dev/null || true)

  # Adopt orphaned disposition files (subagents may write without session prefix)
  if [ -z "$DISP_FILES" ]; then
    _CLAUDE_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude"
    for _ORPHAN in "${_CLAUDE_DIR}"/.review-disposition-skye-search-*.json "${_CLAUDE_DIR}"/.review-disposition-[a-z0-9][a-z0-9][a-z0-9][a-z0-9].json; do
      [ -f "$_ORPHAN" ] || continue
      # Skip files that already have a session prefix (UUID pattern)
      _BASENAME=$(basename "$_ORPHAN")
      if echo "$_BASENAME" | grep -qE '^\.review-disposition-[0-9a-f]{8}-'; then
        continue
      fi
      # Rename to canonical path
      _BEAD_PART=$(echo "$_BASENAME" | sed 's/^\.review-disposition-//' | sed 's/\.json$//')
      mv "$_ORPHAN" "${_CLAUDE_DIR}/.review-disposition-${_SESSION}-${_BEAD_PART}.json" 2>/dev/null || true
    done
    DISP_FILES=$(ls $DISP_PATTERN 2>/dev/null || true)
  fi

  if [ -z "$DISP_FILES" ]; then
    echo "BLOCKED: Commit with code changes but no self-review disposition found." >&2
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

  # Check freshness — disposition must be from this session (< 10 min)
  NEWEST_DISP=$(ls -t $DISP_PATTERN 2>/dev/null | head -1)
  if [ -n "$NEWEST_DISP" ]; then
    if [ "$(uname)" = "Darwin" ]; then
      DISP_MOD=$(stat -f %m "$NEWEST_DISP")
    else
      DISP_MOD=$(stat -c %Y "$NEWEST_DISP")
    fi
    NOW=$(date +%s)
    DISP_AGE=$(( NOW - DISP_MOD ))
    if [ "$DISP_AGE" -gt 600 ]; then
      echo "BLOCKED: Self-review disposition is stale ($(( DISP_AGE / 60 )) min old, max 10 min)." >&2
      echo "" >&2
      echo "  → Run a fresh self-review before committing" >&2
      exit 2
    fi
  fi
fi

exit 0
