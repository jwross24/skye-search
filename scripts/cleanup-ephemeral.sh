#!/usr/bin/env bash
set -euo pipefail

# Clean stale ephemeral files from previous sessions.
# Called by session-cleanup.sh at SessionStart.

CURRENT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --current-session) CURRENT="$2"; shift 2 ;;
    *) shift ;;
  esac
done

[ -z "$CURRENT" ] && echo "No session ID provided" >&2 && exit 0

CLAUDE_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude"
REMOVED=0

for f in \
  "${CLAUDE_DIR}"/.*-stamp-* \
  "${CLAUDE_DIR}"/.command-log-*.jsonl \
  "${CLAUDE_DIR}"/.review-disposition-*.json \
  "${CLAUDE_DIR}"/.session-beads-*.txt \
  "${CLAUDE_DIR}"/.current-bead-* \
  "${CLAUDE_DIR}"/.review-session-id \
  "${CLAUDE_DIR}"/.cross-review-results.json
do
  [ -f "$f" ] || continue
  case "$f" in *"$CURRENT"*) continue ;; esac
  rm -f "$f"
  REMOVED=$((REMOVED + 1))
done

[ "$REMOVED" -gt 0 ] && echo "Cleaned $REMOVED stale ephemeral file(s)"
exit 0
