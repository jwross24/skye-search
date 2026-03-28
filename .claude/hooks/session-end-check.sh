#!/usr/bin/env bash
set -euo pipefail

# Stop hook — runs when the session ends.
# Checks for dangling state that could cause problems.
#
# Hook: Stop
# Outputs systemMessage JSON with warnings.

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
WARNINGS=""

# Check for beads left in_progress
IN_PROGRESS=$(br list --limit 0 --json 2>/dev/null | jq -r '[.[] | select(.status == "in_progress")] | length' 2>/dev/null || echo "0")
if [ "$IN_PROGRESS" -gt 0 ]; then
  BEADS=$(br list --limit 0 --json 2>/dev/null | jq -r '[.[] | select(.status == "in_progress")] | .[].id' 2>/dev/null || echo "unknown")
  WARNINGS="${WARNINGS}⚠️ $IN_PROGRESS bead(s) left in_progress: $BEADS. Release or close before leaving.\n"
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
  MEMORY_DIR="$HOME/.claude/projects/-Users-${USER}-Documents-skye-search/memory"
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

if [ -n "$WARNINGS" ]; then
  ESCAPED=$(printf '%s' "$WARNINGS" | sed 's/"/\\"/g' | tr '\n' ' ')
  echo "{\"systemMessage\":\"SESSION END:\\n${ESCAPED}\"}"
fi

exit 0
