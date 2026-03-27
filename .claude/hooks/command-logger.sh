#!/usr/bin/env bash
# PostToolUse[Bash] — append every Bash invocation to session-scoped JSONL.
# Immutable evidence of what actually ran. Used by close-bead-gate.sh.
#
# Output: .claude/.command-log-${SESSION_ID}.jsonl
# Each line: {"ts":"ISO8601","cmd":"...","exit_code":N}
#
# Must be FAST (<50ms) — runs on every Bash command.

set -euo pipefail

INPUT=$(cat)

# Extract session ID
SESSION_ID=$(printf '%s' "$INPUT" | jq -r '.session_id // "default"' 2>/dev/null) || SESSION_ID="default"

# Extract command and exit code
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0
EXIT_CODE=$(printf '%s' "$INPUT" | jq -r '.tool_result.exit_code // 0' 2>/dev/null) || EXIT_CODE=0

# Skip empty commands
[ -z "$CMD" ] && exit 0

# Compute log path (skip if CLAUDE_PROJECT_DIR not set — can't determine location)
[ -z "${CLAUDE_PROJECT_DIR:-}" ] && exit 0
LOG_DIR="${CLAUDE_PROJECT_DIR}/.claude"
LOG_FILE="${LOG_DIR}/.command-log-${SESSION_ID}.jsonl"

# Append as single JSONL line (jq -c for compact, single line)
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
printf '%s\n' "$(jq -nc --arg ts "$TS" --arg cmd "$CMD" --argjson ec "${EXIT_CODE:-0}" '{ts:$ts,cmd:$cmd,exit_code:$ec}')" >> "$LOG_FILE"

exit 0
