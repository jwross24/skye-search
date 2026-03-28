#!/usr/bin/env bash
set -euo pipefail

# PostToolUse nudge — when a file imports from libraries with known
# training-data staleness, remind to check Context7 for current docs.
#
# Hook: PostToolUse[Write|Edit]
# Soft enforcement (reminder, not block).

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .tool_response.filePath // ""' 2>/dev/null) || exit 0

# Only check .ts/.tsx files
if ! echo "$FILE" | grep -qE '\.(ts|tsx)$'; then
  exit 0
fi

# Skip test files and type definitions
if echo "$FILE" | grep -qE '\.(test|spec|d)\.(ts|tsx)$'; then
  exit 0
fi

[ -f "$FILE" ] || exit 0

# Libraries with known training-data staleness or breaking changes
# Pattern: import keyword or from-clause containing the package name
STALE_LIBS=(
  # Frameworks with breaking changes
  "next/"                    # Next.js 16 — async params, proxy.ts, etc.
  "next/server"              # Next.js middleware/proxy patterns
  "@supabase/"               # Supabase SDK — auth, SSR, storage patterns
  # UI libraries
  "shadcn"                   # base-nova style (render= not asChild)
  "@base-ui/"                # Base UI React — new component APIs
  "framer-motion"            # Framer Motion API changes
  "@dnd-kit/"                # Drag-and-drop library
  "recharts"                 # Charting library
  "@react-email/"            # React Email components
  "class-variance-authority" # CVA patterns
  # API SDKs
  "@anthropic-ai/"           # Claude SDK — structured outputs, etc.
  "npm:@anthropic-ai"        # Deno variant
  "resend"                   # Resend SDK
  # Data/validation
  "zod"                      # Zod v4 breaking changes
  # Testing
  "@playwright/"             # Playwright API changes
  "@testing-library/"        # Testing Library updates
  "vitest"                   # Vitest config/API changes
)

for lib in "${STALE_LIBS[@]}"; do
  if grep -q "$lib" "$FILE" 2>/dev/null; then
    echo "{\"systemMessage\":\"⚠️ CONTEXT7 NEEDED: This file uses $lib — fetch current docs with Context7 MCP before committing. Your training data for this library may be WRONG. Run: resolve-library-id + query-docs\"}"
    exit 0  # One nudge per file write, not one per import
  fi
done

exit 0
