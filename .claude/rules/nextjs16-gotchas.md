---
paths:
  - src/**
description: Next.js 16 breaking changes and shadcn/ui base-nova patterns
---

# Next.js 16 + shadcn/ui Gotchas

## Next.js 16 Breaking Changes
- `middleware.ts` is renamed to `proxy.ts`, export `middleware()` → `proxy()`
- `params` and `searchParams` are async in page/layout components
- Always check `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` before using framework APIs

## shadcn/ui base-nova Style
- Uses `render={<Component />}` prop for composition, NOT `asChild`
- Always check the actual component file in `src/components/ui/` before using patterns from docs or training data
- Sidebar component uses `useRender` hook internally

## Supabase Auth
- New env var convention: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not ANON_KEY)
- Secret key: `SUPABASE_SECRET_KEY` (not SERVICE_ROLE_KEY)
- `cookies()` is async in Next.js 16 — must `await cookies()` in server clients

## PostgreSQL
- `GENERATED ALWAYS AS (...) STORED` requires immutable expressions
- `current_date` is NOT immutable — compute time-dependent booleans in application code
