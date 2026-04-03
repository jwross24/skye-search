#!/usr/bin/env bash
set -euo pipefail

# Stop hook — runs when the session ends.
# Blocks once if dangling beads or uncommitted changes exist.
# Allows on retry (stop_hook_active = true).
#
# Hook: Stop
# Uses decision:block to prevent premature session abandonment.

INPUT=$(cat)
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"

# If already blocked once this turn, allow stopping
STOP_ACTIVE=$(printf '%s' "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null) || STOP_ACTIVE="false"

WARNINGS=""

# Check for beads left in_progress BY THIS SESSION
# Only warn about beads this session claimed (tracked by track-bead-claim.sh).
# Other sessions' in_progress beads are not our responsibility.
SESSION_ID=$(printf '%s' "$INPUT" | jq -r '.session_id // "default"' 2>/dev/null) || SESSION_ID="default"
CLAIM_FILE="${PROJECT_DIR}/.claude/.session-beads-${SESSION_ID}.txt"

if [ -f "$CLAIM_FILE" ]; then
  DANGLING_BEADS=""
  DANGLING_COUNT=0
  while IFS= read -r BEAD_ID; do
    [ -z "$BEAD_ID" ] && continue
    STATUS=$(br show "$BEAD_ID" --json 2>/dev/null | jq -r '.status // ""' 2>/dev/null) || STATUS=""
    if [ "$STATUS" = "in_progress" ]; then
      DANGLING_BEADS="${DANGLING_BEADS}${DANGLING_BEADS:+, }${BEAD_ID}"
      DANGLING_COUNT=$((DANGLING_COUNT + 1))
    fi
  done < "$CLAIM_FILE"

  IN_PROGRESS=$DANGLING_COUNT
  if [ "$DANGLING_COUNT" -gt 0 ]; then
    WARNINGS="${WARNINGS}⚠️ $DANGLING_COUNT bead(s) you claimed still in_progress: $DANGLING_BEADS. Release or close before leaving.\n"
  fi
else
  # No claim file — fall back to global check (backward compat for sessions
  # started before this hook existed)
  IN_PROGRESS=$(br list --limit 0 --json 2>/dev/null | jq -r '[.[] | select(.status == "in_progress")] | length' 2>/dev/null || echo "0")
  if [ "$IN_PROGRESS" -gt 0 ]; then
    BEADS=$(br list --limit 0 --json 2>/dev/null | jq -r '[.[] | select(.status == "in_progress")] | .[].id' 2>/dev/null || echo "unknown")
    WARNINGS="${WARNINGS}⚠️ $IN_PROGRESS bead(s) left in_progress: $BEADS. Release or close before leaving.\n"
  fi
fi

# Check for uncommitted changes
DIRTY=$(git -C "$PROJECT_DIR" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [ "$DIRTY" -gt 0 ]; then
  WARNINGS="${WARNINGS}⚠️ $DIRTY uncommitted file(s). Commit or stash before leaving.\n"
fi

# ── Session compliance report ────────────────────────────────────────────
# Analyze command log for marching order step evidence

COMPLIANCE=""
LOG_GLOB="$PROJECT_DIR/.claude/.command-log-*.jsonl"
LOG_FILES=$(ls $LOG_GLOB 2>/dev/null | head -1 || true)

if [ -n "$LOG_FILES" ]; then
  STEPS_TOTAL=0
  STEPS_HIT=0

  check_step() {
    local name="$1" pattern="$2"
    STEPS_TOTAL=$((STEPS_TOTAL + 1))
    if grep -q "$pattern" $LOG_GLOB 2>/dev/null; then
      STEPS_HIT=$((STEPS_HIT + 1))
      COMPLIANCE="${COMPLIANCE} ✓ ${name}"
    else
      COMPLIANCE="${COMPLIANCE} ✗ ${name}"
    fi
  }

  check_step "verify" "bun run verify"
  check_step "push" "git push"
  check_step "self-review" "Self-review\\|self.review\\|review.*disposition"

  # Check for learn activity — Write tool doesn't appear in command log,
  # so check for recently modified files in rules/ and memory/ directories
  LEARN_WRITES=0
  if [ -d "$PROJECT_DIR/.claude/rules" ]; then
    RULES_MODIFIED=$(find "$PROJECT_DIR/.claude/rules" -type f -newer "$LOG_FILES" 2>/dev/null | wc -l | tr -d ' ')
    LEARN_WRITES=$((LEARN_WRITES + RULES_MODIFIED))
  fi
  # Compute memory dir from main repo path (works in worktrees too)
  GIT_COMMON=$(git -C "$PROJECT_DIR" rev-parse --git-common-dir 2>/dev/null || echo ".git")
  if [ "$GIT_COMMON" = ".git" ] || [ "$GIT_COMMON" = "$PROJECT_DIR/.git" ]; then
    MAIN_REPO="$PROJECT_DIR"
  else
    # Worktree: git-common-dir points to main repo's .git dir
    MAIN_REPO="$(cd "$(dirname "$GIT_COMMON")" && pwd)"
  fi
  ENCODED_PATH=$(echo "$MAIN_REPO" | sed 's|/|-|g')
  MEMORY_DIR="$HOME/.claude/projects/${ENCODED_PATH}/memory"
  if [ -d "$MEMORY_DIR" ]; then
    MEMORY_MODIFIED=$(find "$MEMORY_DIR" -type f -newer "$LOG_FILES" 2>/dev/null | wc -l | tr -d ' ')
    LEARN_WRITES=$((LEARN_WRITES + MEMORY_MODIFIED))
  fi
  STEPS_TOTAL=$((STEPS_TOTAL + 1))
  if [ "$LEARN_WRITES" -gt 0 ]; then
    STEPS_HIT=$((STEPS_HIT + 1))
    COMPLIANCE="${COMPLIANCE} ✓ learn(${LEARN_WRITES})"
  else
    COMPLIANCE="${COMPLIANCE} ✗ learn"
  fi

  if [ "$STEPS_TOTAL" -gt 0 ]; then
    PCT=$(( STEPS_HIT * 100 / STEPS_TOTAL ))
    WARNINGS="${WARNINGS}📊 Session compliance: ${STEPS_HIT}/${STEPS_TOTAL} steps (${PCT}%) —${COMPLIANCE}\n"
  fi
fi

# Determine if we should block or just warn
HAS_DANGLING=$([ "$IN_PROGRESS" -gt 0 ] || [ "$DIRTY" -gt 0 ] && echo "true" || echo "false")

if [ "$HAS_DANGLING" = "true" ] && [ "$STOP_ACTIVE" != "true" ]; then
  # First stop attempt with dangling state — block
  ESCAPED=$(printf '%s' "$WARNINGS" | sed 's/"/\\"/g' | tr '\n' ' ')
  echo "{\"decision\":\"block\",\"reason\":\"SESSION WARNINGS: ${ESCAPED} Address these before stopping, or stop again to proceed.\"}"
  exit 0
fi

if [ -n "$WARNINGS" ]; then
  ESCAPED=$(printf '%s' "$WARNINGS" | sed 's/"/\\"/g' | tr '\n' ' ')
  echo "{\"systemMessage\":\"SESSION END:\\n${ESCAPED}\"}"
fi

exit 0
