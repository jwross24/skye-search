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

# Check if a stamp exists and is fresh (< max_age seconds)
stamp_is_fresh() {
  local name="$1"
  local max_age="${2:-600}"
  local path
  path=$(stamp_path "$name")

  [ -f "$path" ] || return 1

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

# Touch a stamp
touch_stamp() {
  touch "$(stamp_path "$1")"
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
