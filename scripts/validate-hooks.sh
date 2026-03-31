#!/usr/bin/env bash
set -euo pipefail

# Hook smoke test: validates all hooks in settings.json are loadable,
# their scripts exist, and are executable.
#
# Prevents: silent hook failures from missing/non-executable scripts
# (the "if patterns silently fail" bug from 2026-03-31 session)
#
# Usage: bash scripts/validate-hooks.sh
# Exit: 0 = all hooks valid, 1 = issues found

SETTINGS_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/settings.json"
ERRORS=0

if [ ! -f "$SETTINGS_FILE" ]; then
  echo "ERROR: settings.json not found at $SETTINGS_FILE"
  exit 1
fi

echo "Validating hooks in $SETTINGS_FILE..."
echo ""

# Extract all hook commands from settings.json
# Format: .hooks.{EventType}[].hooks[].command
HOOK_COMMANDS=$(jq -r '
  .hooks // {} | to_entries[] | .value[] | .hooks[]? | .command // empty
' "$SETTINGS_FILE" 2>/dev/null) || true

if [ -z "$HOOK_COMMANDS" ]; then
  echo "No hook commands found in settings.json"
  exit 0
fi

while IFS= read -r cmd; do
  [ -z "$cmd" ] && continue

  # Extract the script path (first word, resolve $CLAUDE_PROJECT_DIR)
  SCRIPT=$(echo "$cmd" | sed "s|\$CLAUDE_PROJECT_DIR|${CLAUDE_PROJECT_DIR:-.}|g" | awk '{print $1}')

  if [ ! -f "$SCRIPT" ]; then
    echo "  FAIL: Script not found: $SCRIPT"
    echo "        Command: $cmd"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  if [ ! -x "$SCRIPT" ]; then
    echo "  FAIL: Script not executable: $SCRIPT"
    echo "        Command: $cmd"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # Check shebang
  FIRST_LINE=$(head -1 "$SCRIPT")
  if ! echo "$FIRST_LINE" | grep -qE '^#!'; then
    echo "  WARN: No shebang in: $SCRIPT"
  fi

  echo "  OK: $SCRIPT"
done <<< "$HOOK_COMMANDS"

echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo "FAILED: $ERRORS hook(s) have issues"
  exit 1
else
  echo "All hooks validated successfully"
  exit 0
fi
