#!/usr/bin/env bash
set -euo pipefail

# Build a structured evaluator prompt from git/bead/plan context.
#
# Usage: build-evaluator-prompt.sh <bead_id> <session_id> <disp_file_path> [pass_num]
# Output: filled evaluator prompt on stdout
#
# Template structure documented in .claude/evaluator-template.md
# This script assembles the prompt programmatically (heredoc avoids awk/sed escaping issues).

BEAD_ID="${1:?Usage: build-evaluator-prompt.sh <bead_id> <session_id> <disp_file_path> [pass_num]}"
SESSION_ID="${2:?Missing session_id}"
DISP_FILE="${3:?Missing disposition file path}"
PASS_NUM="${4:-1}"

# ── Gather context ──────────────────────────────────────────────────────────

FILES_CHANGED=$(git diff --name-only origin/main...HEAD 2>/dev/null || echo "(unable to compute diff)")

STAT_LINE=$(git diff --stat origin/main...HEAD 2>/dev/null | tail -1 || echo "")
INSERTIONS=$(echo "$STAT_LINE" | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo 0)
DELETIONS=$(echo "$STAT_LINE" | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo 0)
LINES_CHANGED=$(( ${INSERTIONS:-0} + ${DELETIONS:-0} ))

CODE_DIFF=$(git diff origin/main...HEAD 2>/dev/null | head -200 || echo "(unable to compute diff)")

ACCEPTANCE_CRITERIA=$(br show "$BEAD_ID" 2>/dev/null | grep -v '^[○●]\|^Owner:\|^Created:\|^Updated:\|^$' | head -80 || echo "(unable to fetch bead spec)")

# Plan deliverables
PLAN_DELIVERABLES="(no plan file found for this bead)"
PLAN_FILE=$(grep -rl "$BEAD_ID" "$HOME/.claude/plans/"*.md 2>/dev/null | head -1 || true)
if [ -n "$PLAN_FILE" ] && [ -f "$PLAN_FILE" ]; then
  FILES_TABLE=$(sed -n '/## Files/,/^## /p' "$PLAN_FILE" 2>/dev/null | head -30 || true)
  VERIFY_SECTION=$(sed -n '/## Verification/,/^## /p' "$PLAN_FILE" 2>/dev/null | head -20 || true)
  PLAN_DELIVERABLES="${FILES_TABLE}

Verification steps:
${VERIFY_SECTION}"
fi

# Complexity note
COMPLEXITY_NOTE=""
if [ "$LINES_CHANGED" -gt 200 ]; then
  COMPLEXITY_NOTE="
## COMPLEX BEAD (${LINES_CHANGED} lines changed)
This bead has >200 lines changed. Include \"pass\": ${PASS_NUM} in your disposition.
If you find CRITICAL or HIGH issues, the gate will require a second review pass after fixes."
fi

# Previous findings (for pass 2+)
PREVIOUS_FINDINGS=""
if [ "$PASS_NUM" -gt 1 ] && [ -f "$DISP_FILE" ]; then
  PREV=$(jq -r '.findings[] | "- [\(.severity)] \(.description) -> \(.disposition): \(.action)"' "$DISP_FILE" 2>/dev/null || true)
  if [ -n "$PREV" ]; then
    PREVIOUS_FINDINGS="
## Previous Findings (Pass $((PASS_NUM - 1)))
Verify these were addressed:
${PREV}"
  fi
fi

# ── Assemble prompt ─────────────────────────────────────────────────────────

cat << PROMPT
You are a skeptical code reviewer for bead ${BEAD_ID}. Your job is to find bugs the implementing agent missed. Do NOT praise the code. Do NOT accept surface-level explanations.

## Acceptance Criteria
${ACCEPTANCE_CRITERIA}

## Plan Deliverables
${PLAN_DELIVERABLES}

## Changed Files (${LINES_CHANGED} lines total)
${FILES_CHANGED}

## Code Diff (truncated)
\`\`\`diff
${CODE_DIFF}
\`\`\`

## Instructions
1. Read ALL changed files in full (the diff above is truncated)
2. Check: bugs, type errors, missing edge cases, dead code, security issues
3. Cross-reference against acceptance criteria — is anything missing?
4. Cross-reference against plan deliverables — was anything dropped?
5. Write disposition to: ${DISP_FILE}
   Format: {"bead_id":"${BEAD_ID}","reviewer":"subagent","pass":${PASS_NUM},"findings":[...]}
   Each finding: {id, description, severity (CRITICAL|HIGH|MEDIUM|LOW), disposition (fix|bead|not-a-bug), action}

Rules:
- Every finding MUST have a disposition
- "pre-existing" is NOT valid
- CRITICAL/HIGH not-a-bug needs 50+ char justification
- Zero findings is valid (clean review)
${COMPLEXITY_NOTE}
${PREVIOUS_FINDINGS}
PROMPT
