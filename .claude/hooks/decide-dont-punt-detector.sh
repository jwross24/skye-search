#!/usr/bin/env bash
# UserPromptSubmit hook — detects "punt-pushback": user pushing the agent UP
# the rigor/effort ladder after agent presented a stop-here-vs-continue framing.
#
# Lexical signals: "why not just X now", "yeah why not", "just do it",
# "just fix it now", "why dont we just", "just run it tonight", etc.
#
# Why this exists: decide-dont-punt.md (rule, Session 17 retro origin) defines
# the exact failure mode but is consulted only when read at session start.
# Session 19 had 3 corrections of this shape in one session despite the rule
# being in place since Session 17. Per the rule's own escalation footer
# (recurrence ≥3 across sessions → ship UserPromptSubmit hook), this is JIT
# reinforcement of the rule at the exact moment it applies.
#
# This is distinct from:
# - user-correction-detector.sh (generic mid-sentence corrections)
# - PROPOSAL-constraint-hardness-detector.md (pushback on imposed constraints)
# This hook fires on PUNT-PUSHBACK specifically: the user un-punting a punt.

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

# Strip system-injected blocks
cleaned=$(echo "$prompt" | sed -E 's|<task-notification>.*</task-notification>||g; s|<system-reminder>.*</system-reminder>||g; s|<system-notification>.*</system-notification>||g')
lower=$(echo "$cleaned" | tr '[:upper:]' '[:lower:]')

# Punt-pushback phrase library. These are the verified lexical signals from
# Session 17 C6 + Session 19 C1/C2/C3. Each requires word-boundary context
# to avoid mid-URL or mid-code matches.
#
# The "just X now/tonight/today" + "why not" + "yeah why not" cluster is the
# tightest signal — these phrases are almost never casual hedging in practice.
pattern='(^|[[:space:],.;!?])(why not (just|we|you)\b|why don'"'"'t (we|you) just\b|yeah,? why not\b|just do (it|them|that) now\b|just fix (it|them|that)( right)? now\b|just run (it|them|that) (tonight|now|today)\b|just ship (it|them|that)\b|fire away\b|boil the ocean\b|leave no stone unturned\b|holy shit,? that'"'"'s done\b|automate,? don'"'"'t remember\b|i'"'"'m still working on\b)([[:space:],.;!?]|$)'

log_dir="$cwd/.claude"
mkdir -p "$log_dir"
log_file="$log_dir/.punt-pushback-log-$session_id.md"

if echo " $lower " | grep -qiE "$pattern"; then
  snippet=$(echo "$prompt" | tr -d '\n' | head -c 200)
  timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  echo "- $timestamp — \"$snippet\"" >> "$log_file"
  count=$(wc -l < "$log_file" | tr -d ' ')

  base_msg="Punt-pushback signal detected. Per .claude/rules/decide-dont-punt.md: when the user signals 'do it now' / 'why not just X' / creed-level energy, the agent MUST decide and execute, not present another stop-vs-continue framing. Run the 3-question test BEFORE your next response: (1) Has the user already signaled the answer? (2) Is this reversible? (3) Am I punting out of timidity? If yes/yes/yes — decide, execute, announce. Do NOT end your next message with a decision-question."

  if [ "$count" -ge 3 ]; then
    jq -cn --argjson count "$count" --arg msg "$base_msg" '{
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: ("[3rd+ punt-pushback this session — count: \($count)] " + $msg + " The Stop hook will require a retro artifact before session end. Pattern is now demonstrated as repeating within a single session — check whether your stop-vs-continue framings are surfacing too eagerly when the user has set sustained-engagement context.")
      }
    }'
  elif [ "$count" -eq 2 ]; then
    jq -cn --arg msg "$base_msg" '{
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: ("[2nd punt-pushback this session] " + $msg + " You have now defaulted-to-defer twice this session against an engaged user. Recheck: is the user sitting in this thread? If yes, the bias toward 'safe stopping point' is wrong — execute now, not later.")
      }
    }'
  else
    jq -cn --arg msg "$base_msg" '{
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: $msg
      }
    }'
  fi
fi

exit 0
