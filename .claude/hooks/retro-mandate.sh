#!/usr/bin/env bash
# Stop hook — if this session accumulated ≥3 user corrections AND no retro
# artifact exists, block session end and nudge the agent to run a retro.
#
# Works with user-correction-detector.sh which populates .correction-log-<session>.md.
# Retro artifact expected at .claude/.retro-results-<session>.json or .md.

set -euo pipefail

STDIN=$(cat)
session_id=$(echo "$STDIN" | jq -r '.session_id // "unknown"' 2>/dev/null || echo "unknown")
cwd=$(echo "$STDIN" | jq -r '.cwd // "."' 2>/dev/null || echo ".")

case "$cwd" in
  */skye-search*) : ;;
  *) exit 0 ;;
esac

log_file="$cwd/.claude/.correction-log-$session_id.md"
retro_json="$cwd/.claude/.retro-results-$session_id.json"
retro_md="$cwd/.claude/.retro-results-$session_id.md"

# No corrections → allow stop
[ ! -f "$log_file" ] && exit 0

correction_count=$(wc -l < "$log_file" 2>/dev/null | tr -d ' ' || echo 0)
[ "$correction_count" -lt 3 ] && exit 0

# Retro artifact already exists → allow stop
if [ -f "$retro_json" ] || [ -f "$retro_md" ]; then
  exit 0
fi

# Block — demand a retro
jq -cn --argjson count "$correction_count" '{
  decision: "block",
  reason: ("Session has \($count) user corrections logged but no retro artifact. Per .claude/rules/session-retro-protocol.md, spawn a subagent to analyze the correction log (.claude/.correction-log-<session>.md), identify the pattern behind the corrections, and produce an enforcement artifact (hook, lint, test, skill, or rule doc). Write the retro outcome to .claude/.retro-results-<session>.json before stopping. One sentence max per finding — quality over quantity.")
}'

exit 0
