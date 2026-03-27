# Avoid Async Server Components in Root Layout

Observed: dev server hung repeatedly when root layout contained an async server component that called `cookies()` → `getUser()` → Supabase query. Removing it (plus clearing `.next` cache) resolved the issue. Root cause not definitively isolated — could be Turbopack cache corruption, `getUser()` timeout blocking all routes, or port conflicts from rapid restarts.

Regardless, the pattern is bad for performance: `getUser()` adds a network round-trip to EVERY page load (layout renders on every navigation). Even if it doesn't hang, it adds ~100-500ms latency to every route.

**Instead, for server-side data in the sidebar/layout:**
- Create a lightweight API route (e.g., `/api/inbox-count`)
- Fetch from the client component via same-origin `fetch()` in useEffect
- Non-blocking, no CSP issues, no layout performance penalty
