#!/usr/bin/env bash
# UserPromptSubmit hook — detects mid-session user corrections ("wait", "actually",
# "why aren't we", "don't", "stop", "no you should", etc.) and logs them.
# If count ≥3 this session, injects context suggesting a retro per
# .claude/rules/session-retro-protocol.md, and sets a marker the Stop hook checks.
#
# Why this exists: corrections are the clearest signal that the agent drifted from
# the user's intent. Counting them is cheap, auto-logging them eliminates the
# "I'll remember to retro later" failure mode.

set -euo pipefail

STDIN=$(cat)
prompt=$(echo "$STDIN" | jq -r '.prompt // ""' 2>/dev/null || echo "")
session_id=$(echo "$STDIN" | jq -r '.session_id // "unknown"' 2>/dev/null || echo "unknown")
cwd=$(echo "$STDIN" | jq -r '.cwd // "."' 2>/dev/null || echo ".")

# Only fire in skye-search project
case "$cwd" in
  */skye-search*) : ;;
  *) exit 0 ;;
esac

# Strip system-injected blocks that aren't real user content (task-notification,
# system-reminder). These were triggering false positives on words like "don't"
# appearing inside the injected payload text.
cleaned=$(echo "$prompt" | sed -E 's|<task-notification>.*</task-notification>||g; s|<system-reminder>.*</system-reminder>||g; s|<system-notification>.*</system-notification>||g')

# Tightened phrase library — require these to appear at a word boundary AND
# be surrounded by likely user-correction context (not mid-sentence in a URL/code).
# Simplified regex; overmatching was the v1 problem.
pattern='(^|[[:space:],.;!?])(wait|actually|i mean|i meant|you missed|you forgot|you didn'"'"'t|shouldn'"'"'t (you|we)|lost the plot|cutting corners?|not sure why (you|we|it)|why (aren'"'"'t|are|not|would|is)\b|why (couldn'"'"'t|can'"'"'t) (you|we))([[:space:],.;!?]|$)'
lower=$(echo "$cleaned" | tr '[:upper:]' '[:lower:]')

log_dir="$cwd/.claude"
mkdir -p "$log_dir"
log_file="$log_dir/.correction-log-$session_id.md"

if echo " $lower " | grep -qiE "$pattern"; then
  # Extract the matching phrase (first match, up to 80 chars context)
  snippet=$(echo "$prompt" | tr -d '\n' | head -c 200)
  timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  echo "- $timestamp — \"$snippet\"" >> "$log_file"

  count=$(wc -l < "$log_file" | tr -d ' ')

  if [ "$count" -ge 3 ]; then
    jq -cn --argjson count "$count" '{
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: ("User-correction count this session: \($count). This is the 3rd+ correction — consider whether the pattern behind these corrections is worth codifying as a hook/rule/test per .claude/rules/session-retro-protocol.md. The Stop hook will require a retro artifact before session end.")
      }
    }'
  elif [ "$count" -ge 1 ]; then
    jq -cn --argjson count "$count" '{
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: ("User-correction signal detected (session total: \($count)). Logged to .claude/.correction-log-<session>.md for end-of-session retro analysis.")
      }
    }'
  fi
fi

exit 0
