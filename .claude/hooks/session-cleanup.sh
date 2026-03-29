#!/usr/bin/env bash
set -euo pipefail

# SessionStart[startup] — clean stale ephemeral files from previous sessions.
# Runs once at session start. Outputs summary to stderr (not injected into context).

INPUT=$(cat)
SESSION_ID=$(printf '%s' "$INPUT" | jq -r '.session_id // ""' 2>/dev/null) || SESSION_ID=""

SCRIPTS_DIR="${CLAUDE_PROJECT_DIR:-.}/scripts"

if [ -x "$SCRIPTS_DIR/cleanup-ephemeral.sh" ]; then
  RESULT=$(bash "$SCRIPTS_DIR/cleanup-ephemeral.sh" --current-session "$SESSION_ID" 2>/dev/null) || true
  if [ -n "$RESULT" ]; then
    echo "$RESULT" >&2
  fi
fi

# Reset the bead close counter for this session (cross-review tracks globally)
echo "0" > "${CLAUDE_PROJECT_DIR:-.}/.claude/.bead-close-count-${SESSION_ID}" 2>/dev/null || true
