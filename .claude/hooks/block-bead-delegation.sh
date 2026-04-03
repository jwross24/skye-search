#!/usr/bin/env bash
set -euo pipefail

# PreToolUse[Agent] hook: blocks launching a subagent that tries to run
# the full bead lifecycle (marching orders). The main context must drive
# all enforcement steps; subagents should only do implementation work.
#
# Checks the agent prompt for lifecycle keywords that indicate the parent
# is delegating enforcement responsibilities.

INPUT=$(cat)

PROMPT=$(printf '%s' "$INPUT" | jq -r '.tool_input.prompt // ""' 2>/dev/null) || PROMPT=""

if [ -z "$PROMPT" ]; then
  exit 0
fi

# Lifecycle keywords that should only happen in main context
VIOLATIONS=""

if echo "$PROMPT" | grep -qi 'br close\|br update.*status'; then
  VIOLATIONS="${VIOLATIONS}  - bead state management (br close/update)\n"
fi

if echo "$PROMPT" | grep -qi 'disposition.*file\|review-disposition\|write.*disposition'; then
  VIOLATIONS="${VIOLATIONS}  - review disposition file creation\n"
fi

if echo "$PROMPT" | grep -qi 'agent-browser\|snapshot.*-i'; then
  VIOLATIONS="${VIOLATIONS}  - agent-browser E2E verification\n"
fi

if echo "$PROMPT" | grep -qi '/impeccable\|invoke.*impeccable'; then
  VIOLATIONS="${VIOLATIONS}  - /impeccable skill invocation\n"
fi

if echo "$PROMPT" | grep -qi 'cm context\|cm mark'; then
  VIOLATIONS="${VIOLATIONS}  - CM context/mark operations\n"
fi

# Self-review subagents are fine (they're SUPPOSED to be separate agents).
# Only flag if the prompt looks like it's delegating the FULL lifecycle.
LIFECYCLE_SIGNALS=0
if echo "$PROMPT" | grep -qi 'br close'; then
  LIFECYCLE_SIGNALS=$((LIFECYCLE_SIGNALS + 1))
fi
if echo "$PROMPT" | grep -qi 'bun run verify'; then
  LIFECYCLE_SIGNALS=$((LIFECYCLE_SIGNALS + 1))
fi
if echo "$PROMPT" | grep -qi 'git commit\|git push'; then
  LIFECYCLE_SIGNALS=$((LIFECYCLE_SIGNALS + 1))
fi
if echo "$PROMPT" | grep -qi 'marching.orders\|bead.*checklist\|after.*complet.*bead'; then
  LIFECYCLE_SIGNALS=$((LIFECYCLE_SIGNALS + 1))
fi

# Only block if 2+ lifecycle signals detected (heuristic: a self-review
# prompt might mention "verify" but not "br close" + "git push")
if [ "$LIFECYCLE_SIGNALS" -ge 2 ]; then
  ESCAPED_VIOLATIONS=$(printf '%s' "$VIOLATIONS" | tr '\n' ' ')
  echo "{\"decision\":\"block\",\"reason\":\"BLOCKED: This agent prompt delegates bead lifecycle steps to a subagent. The main context must drive marching orders — subagents only do implementation or review work.\n\nDetected lifecycle delegation:\n${ESCAPED_VIOLATIONS}\nSee .claude/rules/worktree-bead-workflow.md for the correct pattern:\n1. Main context claims bead + runs gates\n2. Subagent does implementation only\n3. Main context runs review, verify, commit, close\"}"
  exit 0
fi

exit 0
