---
paths:
  - src/components/**
  - src/app/**
description: Agent browser e2e verification for UI changes
---

# Agent Browser Verification

After implementing or modifying UI components, verify with agent-browser before marking complete.

Steps:
1. Ensure dev server running: `bun run dev`
2. `agent-browser open http://localhost:3000/<route>`
3. `agent-browser wait --load networkidle`
4. `agent-browser snapshot -i` — check expected elements present
5. Test interactions using @refs from snapshot
6. Re-snapshot after interactions — verify state changed correctly
7. `agent-browser errors` — check no console errors
8. `agent-browser close`

CRITICAL: Always re-snapshot after navigation or DOM changes. Refs are invalidated.
For non-UI beads (API routes, data models, utilities): unit/integration tests are sufficient.
