---
paths:
  - src/db/**
  - src/lib/supabase*
  - supabase/**
description: Supabase database patterns and conventions
---

# Supabase Patterns

- Supabase client from `@/db/client.ts` — never create ad-hoc clients
- Server-side: `createServerClient` (from @supabase/ssr)
- Client-side: `createBrowserClient` (from @supabase/ssr)
- Types auto-generated: `bunx supabase gen types typescript`
- RLS enabled on all tables
- Migrations in `supabase/migrations/` — never modify database directly
- Credentials in `.env.local` — never hardcode
