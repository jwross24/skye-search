#!/usr/bin/env bash
# shellcheck disable=SC2086
set -euo pipefail

# Stop hook: Fires when a session ends. Checks whether hot.md and status.md
# were updated during this session. If either is stale, emits a reminder to
# run /wrap (or update manually) before leaving.
#
# Session start marker: /tmp/claude-session-start-$USER.marker
# Created by: session-cleanup.sh (or this hook as fallback, on first run)
#
# Design principle: ADVISORY ONLY. Exit 0 always.

VAULT_DIR="${HOME}/Knowledge"
HOT_MD="${VAULT_DIR}/hot.md"
STATUS_MD="${VAULT_DIR}/projects/skye-search/status.md"
SESSION_MARKER="/tmp/claude-session-start-${USER}.marker"
CHECKLIST_DIR="${VAULT_DIR}/projects/skye-search"

# Create a session start marker if missing (first-run bootstrap).
# If the marker doesn't exist, treat session start as 24 hours ago.
if [[ ! -f "$SESSION_MARKER" ]]; then
  # Fallback: 24h ago
  if [[ "$(uname)" == "Darwin" ]]; then
    session_start=$(date -v-24H +%s)
  else
    session_start=$(date -d "24 hours ago" +%s)
  fi
else
  if [[ "$(uname)" == "Darwin" ]]; then
    session_start=$(stat -f %m "$SESSION_MARKER" 2>/dev/null || date -v-24H +%s)
  else
    session_start=$(stat -c %Y "$SESSION_MARKER" 2>/dev/null || date -d "24 hours ago" +%s)
  fi
fi

get_mtime() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "0"
    return
  fi
  if [[ "$(uname)" == "Darwin" ]]; then
    stat -f %m "$path" 2>/dev/null || echo "0"
  else
    stat -c %Y "$path" 2>/dev/null || echo "0"
  fi
}

hot_mtime=$(get_mtime "$HOT_MD")
status_mtime=$(get_mtime "$STATUS_MD")

hot_stale=false
status_stale=false

if [[ "$hot_mtime" -lt "$session_start" ]]; then
  hot_stale=true
fi
if [[ "$status_mtime" -lt "$session_start" ]]; then
  status_stale=true
fi

# Checklist audit: for every day*-checklist.md that was MODIFIED this session
# AND STILL has unchecked [ ] items, flag it. This catches the Session 10
# failure mode: "I updated the Marketing section of day3-checklist.md but
# missed checking off the Infrastructure section items I'd actually done."
# Skips checklists not touched this session (those are future/planned work).
touched_checklists_with_unchecked=()
if [[ -d "$CHECKLIST_DIR" ]]; then
  while IFS= read -r checklist; do
    [[ -z "$checklist" ]] && continue
    cmtime=$(get_mtime "$checklist")
    if [[ "$cmtime" -ge "$session_start" ]]; then
      # modified this session — check for remaining [ ] items
      # grep -c returns exit 1 when zero matches — with pipefail + set -e that
      # would kill the script mid-loop. `|| true` absorbs the non-zero exit.
      uc=$( (grep -cE '^\s*-\s*\[\s*\]' "$checklist" 2>/dev/null || true) | head -1 | tr -d '[:space:]')
      uc="${uc:-0}"
      if [[ "$uc" -gt 0 ]]; then
        touched_checklists_with_unchecked+=("$(basename "$checklist"):$uc")
      fi
    fi
  done < <(find "$CHECKLIST_DIR" -maxdepth 1 -name 'day*-checklist.md' 2>/dev/null)
fi

if [[ "$hot_stale" == "false" && "$status_stale" == "false" && "${#touched_checklists_with_unchecked[@]}" -eq 0 ]]; then
  exit 0
fi

# Build the stale file list
stale_files=()
if [[ "$hot_stale" == "true" ]]; then
  stale_files+=("hot.md (warm-start cache — who you are, what you're doing, key facts)")
fi
if [[ "$status_stale" == "true" ]]; then
  stale_files+=("projects/skye-search/status.md (project status — bead counts, blockers, decisions)")
fi
for entry in "${touched_checklists_with_unchecked[@]}"; do
  fname="${entry%:*}"
  count="${entry##*:}"
  stale_files+=("$fname — $count unchecked [ ] items remain despite touching this file this session; audit vs bead closures + work done before leaving")
done

{
  echo "════════════════════════════════════════════════════════════════"
  echo "⚠️  SESSION ENDING — VAULT UPDATE NEEDED"
  echo "════════════════════════════════════════════════════════════════"
  echo "These vault files were not updated this session:"
  for f in "${stale_files[@]}"; do
    echo "  • $f"
  done
  echo ""
  echo "Run the /wrap skill to auto-update both via subagent:"
  echo "  /wrap"
  echo ""
  echo "Or update manually:"
  echo "  1. mcp__obsidian__read_note path='hot.md'"
  echo "     Update: Last Updated, Key Recent Facts, Recent Changes, Active Threads"
  echo "     (keep under 500 words — overwrite completely)"
  echo "  2. mcp__obsidian__read_note path='projects/skye-search/status.md'"
  echo "     Check off completed items, update bead counts (br list), update Blockers"
  echo "  3. cd ~/Knowledge && git add -f hot.md projects/skye-search/status.md && git commit -m 'session wrap'"
  echo ""
  echo "Why: hot.md is the warm-start cache. Stale hot.md means the next"
  echo "session starts cold with no context. 2 minutes now saves 10 minutes"
  echo "of context reconstruction later."
  echo "════════════════════════════════════════════════════════════════"
} >&2

exit 0
