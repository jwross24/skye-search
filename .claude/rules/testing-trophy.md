---
paths:
  - src/**/*.test.ts
  - src/**/*.test.tsx
  - tests/**
description: Testing Trophy enforcement — integration tests are the largest layer
---

# Testing Trophy Rules

- Prefer integration tests over unit tests. Test components as users interact with them.
- Use Testing Library's screen/user-event queries, not internal state inspection.
- Mock only external boundaries (APIs via MSW, not internal modules).
- No enzyme-style shallow rendering. Render the full component tree.
- Every test must have at least one assertion (eslint: vitest/expect-expect).
- No test.skip or test.only in committed code (eslint enforces this).
- Server Components: test through integration (render full page) or e2e (Playwright).
- Coverage thresholds are set to 80% and ratchet up automatically.
- When adding a new component: create co-located .test.tsx file before or alongside implementation.
