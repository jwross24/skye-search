#!/usr/bin/env bash
# PostToolUse[Write] — when an evaluator/harness artifact is written with an
# unambiguous decision field, nudge the main agent to EXECUTE the decision
# instead of summarizing it for user confirmation.
#
# The pattern this prevents: "evaluator returned rewrite-prompts → I write
# a big confirmation message to the user → user says 'why didn't you just do it'"
# (see .claude/.retro-results-session13-v1.md for root-cause analysis)
#
# Fires on writes to:
#   - .claude/.retro-results-*.json / .md
#   - assets/<persona>/loras/<v>/audit-report.json
#   - assets/<persona>/lora-validation-*/*eval*.json
#   - any path matching .*/.*eval*.json or .*/*decision*.json
#
# If the file contains an unambiguous decision/verdict field (action verb like
# "resume-batch" / "rewrite-prompts" / "pass" / "fail" / "execute" / "block"),
# emits additionalContext reminding the agent that the verdict IS authorization
# to act.

set -euo pipefail

STDIN=$(cat)
tool=$(echo "$STDIN" | jq -r '.tool_name // ""' 2>/dev/null || echo "")
if [ "$tool" != "Write" ] && [ "$tool" != "Edit" ]; then exit 0; fi

file_path=$(echo "$STDIN" | jq -r '.tool_input.file_path // ""' 2>/dev/null || echo "")
cwd=$(echo "$STDIN" | jq -r '.cwd // "."' 2>/dev/null || echo ".")

case "$cwd" in
  */skye-search*) : ;;
  *) exit 0 ;;
esac

# Path filter — only fire on evaluator/harness artifacts
matches_pattern=false
case "$file_path" in
  *.claude/.retro-results-*) matches_pattern=true ;;
  */audit-report.json) matches_pattern=true ;;
  */lora-validation-*/*eval*) matches_pattern=true ;;
  *.eval.json) matches_pattern=true ;;
  */decision*.json) matches_pattern=true ;;
esac

if [ "$matches_pattern" != "true" ]; then exit 0; fi
if [ ! -f "$file_path" ]; then exit 0; fi

# Only parse JSON files
case "$file_path" in
  *.json) : ;;
  *) exit 0 ;;
esac

# Extract decision/verdict fields. Hunt common field names.
decision=""
for field in "decision" "verdict" "overall_pass" "recommendation" ".batch_summary.decision" ".batch_summary.verdict"; do
  case "$field" in
    .*)
      val=$(jq -r "$field // empty" "$file_path" 2>/dev/null || echo "")
      ;;
    *)
      val=$(jq -r ".$field // empty" "$file_path" 2>/dev/null || echo "")
      ;;
  esac
  if [ -n "$val" ] && [ "$val" != "null" ] && [ "$val" != "unknown" ]; then
    decision="$val"
    break
  fi
done

if [ -z "$decision" ]; then exit 0; fi

# Is the decision an actionable verb? If so, nudge.
case "$decision" in
  resume-batch|rewrite-prompts|curate-selectively|refine|pivot|pass|fail|partial|execute|block|allow|deny|fix-now|bead-created|deferred|true|false)
    jq -cn --arg d "$decision" --arg f "$file_path" '{
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: ("Harness artifact written with decision=\"\($d)\" at \($f). Per .claude/rules/harness-verdict-authority.md, an unambiguous evaluator verdict IS authorization to act — execute the corresponding action now, do not re-confirm with user unless the verdict is partial/ambiguous or the action has irreversible blast radius. Summarize outcome AFTER executing, not before.")
      }
    }'
    ;;
  *) : ;;
esac

exit 0
