#!/usr/bin/env bash
set -euo pipefail

# SessionStart[compact] — re-inject workflow state after context compaction.
#
# After compaction, the agent loses track of:
# - Which bead is in_progress
# - Which stamps are fresh
# - The bead close counter
# - Recent work context
#
# This hook outputs text to stdout, which Claude Code adds to context.

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"

# Current bead
CURRENT_BEAD=$(br list --limit 0 --json 2>/dev/null | jq -r '[.[] | select(.status == "in_progress")] | .[0] | "\(.id): \(.title)"' 2>/dev/null || echo "none")

# Bead close counter
CLOSE_COUNT=$(cat "$PROJECT_DIR/.claude/.bead-close-count-global" 2>/dev/null || echo "0")

# Recent commits
RECENT=$(git log --oneline -5 2>/dev/null || echo "(no git history)")

# Uncommitted changes
DIRTY=$(git -C "$PROJECT_DIR" status --porcelain 2>/dev/null | head -5 || echo "")

cat << EOF
=== Post-Compaction Context ===
Current bead: $CURRENT_BEAD
Bead close counter: $CLOSE_COUNT (cross-review due at 3)
Recent commits:
$RECENT
${DIRTY:+Uncommitted changes:
$DIRTY}
Follow the bead marching orders in CLAUDE.md for the current bead.
EOF
