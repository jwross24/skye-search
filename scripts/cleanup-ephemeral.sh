#!/usr/bin/env bash
set -euo pipefail

# Clean up stale ephemeral files from .claude/ directory.
#
# Removes:
#   - Stamps from sessions older than MAX_AGE (default 24h)
#   - Disposition files from sessions older than MAX_AGE
#   - Command logs from sessions older than MAX_AGE
#   - Legacy non-session-scoped stamps (pre-session era)
#   - Expired review-write-authorized stamps (5min TTL)
#
# Safe to run on every session start. Only deletes files matching known patterns.
# Never deletes: settings.json, settings.local.json, hooks/, rules/, evaluator-template.md
#
# Usage:
#   cleanup-ephemeral.sh [--current-session SESSION_ID] [--max-age-hours N]
#   cleanup-ephemeral.sh --dry-run  # show what would be deleted

CLAUDE_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude"
CURRENT_SESSION=""
MAX_AGE_HOURS=24
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --current-session) CURRENT_SESSION="$2"; shift 2 ;;
    --max-age-hours) MAX_AGE_HOURS="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) shift ;;
  esac
done

MAX_AGE_MINUTES=$((MAX_AGE_HOURS * 60))
DELETED=0
SKIPPED=0

cleanup_file() {
  local f="$1"
  local reason="$2"
  if [ "$DRY_RUN" = "true" ]; then
    echo "  [dry-run] would delete: $(basename "$f") ($reason)"
  else
    rm -f "$f"
  fi
  DELETED=$((DELETED + 1))
}

skip_file() {
  SKIPPED=$((SKIPPED + 1))
}

# ── 1. Session-scoped stamps ────────────────────────────────────────────────
# Pattern: .{name}-stamp-{session_id}
# Keep: current session stamps. Delete: everything else older than MAX_AGE.

for f in "$CLAUDE_DIR"/.*-stamp-*; do
  [ -f "$f" ] || continue
  basename=$(basename "$f")

  # Skip current session
  if [ -n "$CURRENT_SESSION" ] && echo "$basename" | grep -q "$CURRENT_SESSION"; then
    skip_file
    continue
  fi

  # Check age
  if [ "$(uname)" = "Darwin" ]; then
    mod_time=$(stat -f %m "$f")
  else
    mod_time=$(stat -c %Y "$f")
  fi
  now=$(date +%s)
  age_minutes=$(( (now - mod_time) / 60 ))

  if [ "$age_minutes" -gt "$MAX_AGE_MINUTES" ]; then
    cleanup_file "$f" "stale stamp, ${age_minutes}min old"
  else
    skip_file
  fi
done

# ── 2. Legacy non-session stamps ────────────────────────────────────────────
# Pattern: .{name}-stamp (no session suffix) — from before session-scoping
# These are always stale if session-scoped stamps exist.

for f in "$CLAUDE_DIR"/.verify-stamp "$CLAUDE_DIR"/.agent-browser-stamp "$CLAUDE_DIR"/.impeccable-stamp "$CLAUDE_DIR"/.resend-stamp "$CLAUDE_DIR"/.integration-stamp "$CLAUDE_DIR"/.prereq-stamp; do
  [ -f "$f" ] || continue
  cleanup_file "$f" "legacy non-session stamp"
done

# ── 3. Disposition files ────────────────────────────────────────────────────
# Pattern: .review-disposition-{session_id}-{bead_id}.json
# Also: .review-disposition-subagent-*-{bead_id}.json (orphaned from workaround)
# Keep: current session. Delete: everything else older than MAX_AGE.

for f in "$CLAUDE_DIR"/.review-disposition-*.json; do
  [ -f "$f" ] || continue
  basename=$(basename "$f")

  if [ -n "$CURRENT_SESSION" ] && echo "$basename" | grep -q "$CURRENT_SESSION"; then
    skip_file
    continue
  fi

  if [ "$(uname)" = "Darwin" ]; then
    mod_time=$(stat -f %m "$f")
  else
    mod_time=$(stat -c %Y "$f")
  fi
  now=$(date +%s)
  age_minutes=$(( (now - mod_time) / 60 ))

  if [ "$age_minutes" -gt "$MAX_AGE_MINUTES" ]; then
    cleanup_file "$f" "stale disposition, ${age_minutes}min old"
  else
    skip_file
  fi
done

# ── 4. Command logs ─────────────────────────────────────────────────────────
# Pattern: .command-log-{session_id}.jsonl
# Keep: current session. Delete: everything else older than 48h (slightly longer — useful for debugging).

COMMAND_LOG_MAX=$((48 * 60))
for f in "$CLAUDE_DIR"/.command-log-*.jsonl; do
  [ -f "$f" ] || continue
  basename=$(basename "$f")

  if [ -n "$CURRENT_SESSION" ] && echo "$basename" | grep -q "$CURRENT_SESSION"; then
    skip_file
    continue
  fi

  if [ "$(uname)" = "Darwin" ]; then
    mod_time=$(stat -f %m "$f")
  else
    mod_time=$(stat -c %Y "$f")
  fi
  now=$(date +%s)
  age_minutes=$(( (now - mod_time) / 60 ))

  if [ "$age_minutes" -gt "$COMMAND_LOG_MAX" ]; then
    cleanup_file "$f" "stale command log, ${age_minutes}min old"
  else
    skip_file
  fi
done

# ── 5. Cross-review results ────────────────────────────────────────────────
# Single file, stale after 1 hour (cross-review enforce checks freshness anyway)

for f in "$CLAUDE_DIR"/.cross-review-results.json; do
  [ -f "$f" ] || continue
  if [ "$(uname)" = "Darwin" ]; then
    mod_time=$(stat -f %m "$f")
  else
    mod_time=$(stat -c %Y "$f")
  fi
  now=$(date +%s)
  age_minutes=$(( (now - mod_time) / 60 ))

  if [ "$age_minutes" -gt 60 ]; then
    cleanup_file "$f" "stale cross-review, ${age_minutes}min old"
  else
    skip_file
  fi
done

# ── 6. Review-write-authorized stamp ────────────────────────────────────────
# 5-minute TTL — always clean if older than 5 min

for f in "$CLAUDE_DIR"/.review-write-authorized; do
  [ -f "$f" ] || continue
  if [ "$(uname)" = "Darwin" ]; then
    mod_time=$(stat -f %m "$f")
  else
    mod_time=$(stat -c %Y "$f")
  fi
  now=$(date +%s)
  age_minutes=$(( (now - mod_time) / 60 ))

  if [ "$age_minutes" -gt 5 ]; then
    cleanup_file "$f" "expired auth stamp, ${age_minutes}min old"
  else
    skip_file
  fi
done

# ── 7. Session-scoped counters ──────────────────────────────────────────────
# Pattern: .bead-close-count-{session_id} (but NOT .bead-close-count-global)

for f in "$CLAUDE_DIR"/.bead-close-count-*; do
  [ -f "$f" ] || continue
  basename=$(basename "$f")
  # Keep the global counter
  [ "$basename" = ".bead-close-count-global" ] && { skip_file; continue; }

  if [ -n "$CURRENT_SESSION" ] && echo "$basename" | grep -q "$CURRENT_SESSION"; then
    skip_file
    continue
  fi

  if [ "$(uname)" = "Darwin" ]; then
    mod_time=$(stat -f %m "$f")
  else
    mod_time=$(stat -c %Y "$f")
  fi
  now=$(date +%s)
  age_minutes=$(( (now - mod_time) / 60 ))

  if [ "$age_minutes" -gt "$MAX_AGE_MINUTES" ]; then
    cleanup_file "$f" "stale counter, ${age_minutes}min old"
  else
    skip_file
  fi
done

# ── Summary ─────────────────────────────────────────────────────────────────

if [ "$DRY_RUN" = "true" ]; then
  echo "Dry run: would delete $DELETED files, skip $SKIPPED"
else
  if [ "$DELETED" -gt 0 ]; then
    echo "Cleaned up $DELETED stale files, kept $SKIPPED"
  fi
fi
