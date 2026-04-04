#!/usr/bin/env bash
set -euo pipefail

# PostToolUse[Bash] — stamp when golden set eval runs.
# Detects: RUN_GOLDEN_SET=1 bun run test golden-set-eval
# Creates a fresh golden-set stamp for check-marching-compliance.sh

source "$(dirname "$0")/_stamp-helpers.sh"

INPUT=$(cat)
init_session_id "$INPUT"

CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0
EXIT_CODE=$(printf '%s' "$INPUT" | jq -r '.tool_response.exitCode // .tool_response.exit_code // ""' 2>/dev/null) || EXIT_CODE=""

# Only stamp on golden set runs that PASS (exit 0)
# Both conditions required: correct command AND success exit code.
# Previous bug: || instead of && let failing golden-set runs stamp the gate.
if echo "$CMD" | grep -q 'golden-set-eval' && [ "$EXIT_CODE" = "0" ]; then
  touch_bead_stamp "golden-set"
fi

exit 0
