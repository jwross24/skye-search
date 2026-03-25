# Data Persistence Invariant

## The Rule

Every server action that accepts user input MUST write to Supabase. No exceptions. No stubs that return `{ success: true }` without a database call.

If a server action exists, it either:
1. Writes to the database and returns the result, OR
2. Does not exist yet (don't create stub actions — they create false confidence)

## Why

Phase 0 shipped with 6 stub server actions that return `{ success: true }` without touching the database. Every page appeared functional but nothing persisted — Kanban moves, job votes, immigration calibration, employment toggles all reset on refresh. This was discovered on 2026-03-25 after 21 beads were closed.

The root cause: seed data was hardcoded in TypeScript imports instead of loaded into Supabase tables. Pages were built against in-memory arrays, and server actions were stubbed "for later." Nobody created the bead to wire them up.

## How to Apply

When creating a new page or feature bead:
- If it reads data: the bead spec MUST include "reads from [table] via Supabase query"
- If it writes data: the bead spec MUST include "writes to [table] via server action → Supabase"
- If the table doesn't exist yet: block on the schema bead
- If the query isn't implemented yet: that IS the bead — don't defer it

When reviewing beads:
- Check: does the page import from `@/db/seed`? If yes, that's a persistence gap
- Check: does any server action return without calling `createClient()` or `createServiceClient()`? If yes, that's a stub

## Environment Separation

- Production Supabase: real user data (Skye). URL in Vercel Production env vars.
- Development Supabase: test user (`dev@skye-search.test`), throwaway data. URL in `.env.local` and Vercel Development env vars.
- Test user credentials MUST NEVER exist in the production Supabase project.
- When creating beads that touch auth or user data, specify which environment.
