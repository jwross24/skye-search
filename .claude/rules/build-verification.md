---
paths:
  - src/**
  - "*.ts"
  - "*.tsx"
description: Build verification rules for all source code changes
---

# Build Verification

After ANY code change:
1. `bun run build` — must pass
2. `bun run lint` — must pass
3. `bun run test` — must pass (if tests exist for modified code)

Do NOT commit if any fail. Fix first.
Do NOT skip tests with .skip or comment them out.
Do NOT add @ts-ignore unless genuinely necessary (document why).
