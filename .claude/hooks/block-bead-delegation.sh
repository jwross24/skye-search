#!/usr/bin/env bash
set -euo pipefail

# PreToolUse[Agent] hook: blocks launching a subagent that tries to run
# the full bead lifecycle (marching orders). The main context must drive
# all enforcement steps; subagents do implementation or review work only.
#
# Classification: uses `description` field as the role signal (consistent
# with PostToolUse hooks). The `prompt` field is only checked for hard
# lifecycle ops that NO subagent should perform.
#
# Permission model (graduated by role):
#   Review agents   → can: read, verify, diff. Cannot: br close, git push, cm mark
#   Impl agents     → can: read, verify, write, test. Cannot: br close, git push, /impeccable, agent-browser
#   Any subagent    → cannot: br close, git push (irreversible main-context-only ops)

INPUT=$(cat)

DESCRIPTION=$(printf '%s' "$INPUT" | jq -r '.tool_input.description // ""' 2>/dev/null) || DESCRIPTION=""
PROMPT=$(printf '%s' "$INPUT" | jq -r '.tool_input.prompt // ""' 2>/dev/null) || PROMPT=""

if [ -z "$PROMPT" ]; then
  exit 0
fi

# ── Hard blocks: no subagent may do these (irreversible lifecycle ops) ──

HARD_VIOLATIONS=""

if echo "$PROMPT" | grep -qi 'br close'; then
  HARD_VIOLATIONS="${HARD_VIOLATIONS}  - br close (bead state is main-context-only)\n"
fi

if echo "$PROMPT" | grep -qi 'git push'; then
  HARD_VIOLATIONS="${HARD_VIOLATIONS}  - git push (publishing is main-context-only)\n"
fi

if [ -n "$HARD_VIOLATIONS" ]; then
  ESCAPED=$(printf '%s' "$HARD_VIOLATIONS" | tr '\n' ' ')
  echo "{\"decision\":\"block\",\"reason\":\"BLOCKED: Subagents cannot perform irreversible lifecycle operations.\n\nDetected:\n${ESCAPED}\nThese must happen in the main context. See .claude/rules/worktree-bead-workflow.md\"}"
  exit 0
fi

# ── Classify role by description (consistent with PostToolUse hooks) ──

is_review=false
if echo "$DESCRIPTION" | grep -qiE 'cross.?review|self.?review|code.?review|audit|review.*commit'; then
  is_review=true
fi

# Review agents: allowed to read code, run verify, run diffs, grep, etc.
# They just can't do lifecycle ops (already blocked above).
if [ "$is_review" = "true" ]; then
  exit 0
fi

# ── Implementation agents: block lifecycle delegation ──
# These agents should write code + tests, run verify in worktree, return results.
# They must NOT drive marching orders steps that belong to main context.

IMPL_VIOLATIONS=""

if echo "$PROMPT" | grep -qi 'disposition.*file\|review-disposition\|write.*disposition'; then
  IMPL_VIOLATIONS="${IMPL_VIOLATIONS}  - review disposition file creation\n"
fi

if echo "$PROMPT" | grep -qi 'agent-browser\|snapshot.*-i'; then
  IMPL_VIOLATIONS="${IMPL_VIOLATIONS}  - agent-browser E2E verification\n"
fi

if echo "$PROMPT" | grep -qi '/impeccable\|invoke.*impeccable'; then
  IMPL_VIOLATIONS="${IMPL_VIOLATIONS}  - /impeccable skill invocation\n"
fi

if echo "$PROMPT" | grep -qi 'cm context\|cm mark'; then
  IMPL_VIOLATIONS="${IMPL_VIOLATIONS}  - CM context/mark operations\n"
fi

# Count lifecycle signals that indicate full delegation (not just one mention)
LIFECYCLE_SIGNALS=0
if echo "$PROMPT" | grep -qi 'br update.*status\|br close'; then
  LIFECYCLE_SIGNALS=$((LIFECYCLE_SIGNALS + 1))
fi
if echo "$PROMPT" | grep -qi 'git commit\|git push'; then
  LIFECYCLE_SIGNALS=$((LIFECYCLE_SIGNALS + 1))
fi
if echo "$PROMPT" | grep -qi 'marching.orders\|bead.*checklist\|after.*complet.*bead'; then
  LIFECYCLE_SIGNALS=$((LIFECYCLE_SIGNALS + 1))
fi

# Block if 2+ lifecycle signals (full delegation attempt)
if [ "$LIFECYCLE_SIGNALS" -ge 2 ]; then
  ESCAPED=$(printf '%s' "$IMPL_VIOLATIONS" | tr '\n' ' ')
  echo "{\"decision\":\"block\",\"reason\":\"BLOCKED: This agent prompt delegates bead lifecycle steps to a subagent. The main context must drive marching orders — subagents only do implementation or review work.\n\nDetected lifecycle delegation:\n${ESCAPED}\nSee .claude/rules/worktree-bead-workflow.md for the correct pattern:\n1. Main context claims bead + runs gates\n2. Subagent does implementation only\n3. Main context runs review, verify, commit, close\"}"
  exit 0
fi

exit 0
