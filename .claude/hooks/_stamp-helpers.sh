#!/usr/bin/env bash
# Shared helpers for session-scoped stamp files.
# Source by other hooks via: source "$(dirname "$0")/_stamp-helpers.sh"
#
# Multi-agent safe: each session gets its own stamps.
# The session_id comes from hook stdin JSON, passed via init_session_id.
#
# Usage in a hook:
#   source "$(dirname "$0")/_stamp-helpers.sh"
#   INPUT=$(cat)
#   init_session_id "$INPUT"
#   if stamp_is_fresh "verify" 600; then echo "ok"; fi

_STAMP_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude"
_SESSION="default"

# Initialize session ID from hook stdin JSON
# Must be called with the raw stdin content
init_session_id() {
  _SESSION=$(printf '%s' "$1" | jq -r '.session_id // "default"' 2>/dev/null) || _SESSION="default"
}

# Compute a session-scoped stamp path
stamp_path() {
  echo "${_STAMP_DIR}/.${1}-stamp-${_SESSION}"
}

# Compute a session-scoped counter path
counter_path() {
  echo "${_STAMP_DIR}/.${1}-${_SESSION}"
}

# Check if a stamp exists, has valid content, and is fresh (< max_age seconds).
# Zero-byte stamps (from a direct `touch` bypass) are rejected.
stamp_is_fresh() {
  local name="$1"
  local max_age="${2:-600}"
  local path
  path=$(stamp_path "$name")

  [ -f "$path" ] || return 1
  [ -s "$path" ] || return 1  # Reject zero-byte bypass

  local stamp_mod now stamp_age
  if [ "$(uname)" = "Darwin" ]; then
    stamp_mod=$(stat -f %m "$path")
  else
    stamp_mod=$(stat -c %Y "$path")
  fi
  now=$(date +%s)
  stamp_age=$(( now - stamp_mod ))

  [ "$stamp_age" -le "$max_age" ]
}

# Touch a stamp. Writes a magic marker so zero-byte `touch` bypass attempts
# (e.g. subagents creating fake stamp files directly) fail validation in
# is_valid_stamp_content below.
touch_stamp() {
  local path
  path=$(stamp_path "$1")
  printf 'claude-hook-stamp %s %s\n' "$(date -u +%s)" "$1" > "$path"
}

# ── Bead-scoped stamps (preferred for marching order compliance) ─────────
# These tie stamps to a specific bead, not a time window.
# track-bead-claim.sh writes .current-bead-${_SESSION} on claim.

# Get the current bead ID for this session (empty string if none claimed)
current_bead() {
  cat "${_STAMP_DIR}/.current-bead-${_SESSION}" 2>/dev/null || echo ""
}

# Write a bead-scoped stamp with a magic marker. A zero-byte file created
# by a subagent doing `touch .claude/.impeccable-bead-XX` fails validation
# in bead_stamp_exists below. The marker format is deliberately simple —
# not a cryptographic secret — but it requires the caller to know the
# format, which is more friction than a blind `touch`.
touch_bead_stamp() {
  local name="$1"
  local bead
  bead=$(current_bead)
  local content
  content=$(printf 'claude-hook-stamp %s %s\n' "$(date -u +%s)" "$name")
  if [ -n "$bead" ]; then
    printf '%s\n' "$content" > "${_STAMP_DIR}/.${name}-bead-${bead}"
  else
    touch_stamp "$name"
  fi
}

# Check if a file contains the magic stamp marker. Used by bead_stamp_exists
# to catch zero-byte stamps created by a direct `touch` bypass. Returns 0
# (valid) if the first line starts with "claude-hook-stamp ", 1 otherwise.
# Backwards compatible: files written by older hook versions are grandfathered
# if they have ANY content (> 0 bytes). Only zero-byte files are rejected.
is_valid_stamp_content() {
  local path="$1"
  [ -s "$path" ] || return 1  # Zero-byte → fake
  return 0
}

# Check if a bead-scoped stamp exists AND contains valid content.
# Rejects zero-byte files (the common fake-stamp bypass).
bead_stamp_exists() {
  local name="$1"
  local bead="$2"
  local path="${_STAMP_DIR}/.${name}-bead-${bead}"
  [ -f "$path" ] || return 1
  is_valid_stamp_content "$path"
}

# Unified stamp check: bead-scoped first (no TTL), session-scoped fallback (with TTL).
# Usage: has_stamp "verify" [bead_id]
# If bead_id is omitted, reads from current-bead file.
has_stamp() {
  local name="$1"
  local bead="${2:-$(current_bead)}"
  # Prefer bead stamp (no time limit — work is scoped to this bead)
  if [ -n "$bead" ] && bead_stamp_exists "$name" "$bead"; then
    return 0
  fi
  # Fallback: session stamp with 10-min TTL (for non-bead commits)
  stamp_is_fresh "$name" 600
}

# Read a counter value
read_counter() {
  local path
  path=$(counter_path "$1")
  cat "$path" 2>/dev/null || echo 0
}

# Write a counter value
write_counter() {
  echo "$2" > "$(counter_path "$1")"
}
