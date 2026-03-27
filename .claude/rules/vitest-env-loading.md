# Vitest .env.local Loading

Vitest does NOT load `.env.local` automatically. Integration tests that need Supabase connection (or any env vars) must load it explicitly:

```typescript
import { config } from 'dotenv'
import path from 'path'
config({ path: path.resolve(process.cwd(), '.env.local') })
```

Place this BEFORE any imports that use env vars (e.g., `@supabase/supabase-js` createClient).

`dotenv` is available as a transitive dependency — no need to install it.
