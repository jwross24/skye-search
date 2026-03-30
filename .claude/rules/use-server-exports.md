# 'use server' files can ONLY export async functions

Next.js 16 enforces that files with `'use server'` at the top can only export async functions — not constants, types, interfaces, or re-exports.

Exporting a const array (like `RELATIONSHIP_TYPES`) from a `'use server'` file causes a runtime crash on the client: `X.map is not a function` (the value gets serialized as something non-iterable).

## Pattern

**Wrong:**
```typescript
'use server'
export const ALLOWED_TYPES = ['a', 'b'] as const  // BREAKS client
export interface MyType { ... }  // BREAKS client
export { SomeConst } from './shared'  // BREAKS client
```

**Right:**
```typescript
// lib/my-constants.ts (no 'use server')
export const ALLOWED_TYPES = ['a', 'b'] as const
export interface MyType { ... }

// app/route/actions.ts
'use server'
import { ALLOWED_TYPES } from '@/lib/my-constants'
import type { MyType } from '@/lib/my-constants'
// Only export async functions from here
```

Client components import types/constants from the shared lib file directly.
