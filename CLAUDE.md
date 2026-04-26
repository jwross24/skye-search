# SkyeSearch

Immigration-aware career companion for international PhD students.
Built for one user first. Designed like it could be a product.

@AGENTS.md

## What This Is

A web app that combines job discovery, application tracking, and immigration status
management. For international students, job search and immigration status are deeply
intertwined — no existing tool understands this.

### Tech Stack
- Runtime/Package Manager: Bun (primary), Node 22 (fnm, for compatibility)
- Frontend: Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui
- Backend: Next.js API routes + Server Actions
- Database: PostgreSQL via Supabase
- AI: Claude API (document tailoring, job scoring, preference reasoning)
- Job Data: Exa API + academic job board feeds
- File Storage: Supabase Storage (encrypted at rest)
- Testing: Vitest (unit/integration) + Playwright (e2e) + agent-browser (agent self-QA)
- Deployment: Vercel

### Key Directories
```
src/
  app/           # Next.js App Router pages
  components/    # React components
    ui/          # shadcn/ui components
    immigration/ # Immigration HQ components
    jobs/        # Job discovery + cards
    tracker/     # Kanban board
    documents/   # Resume/cover letter studio
  lib/           # Utilities, API clients, constants
  hooks/         # Custom React hooks
  types/         # TypeScript type definitions
  db/            # Supabase client, queries, migrations
```

### Domain Context
The primary user is a Chinese-born PhD environmental scientist whose:
- STEM OPT expires ~August 2026
- PostDoc ends April 11, 2026
- H1-B FY2027 lottery was missed
- EB-2 NIW is filed (3-7+ year China backlog)
- Cap-exempt employers (universities, nonprofits, gov labs) are top priority

Full context: /Users/jr843u/Documents/skye-search-research.md
System spec: /Users/jr843u/Documents/skye-search-plan.md

## How to Work Here

### Commands
```
bun run dev              # Start dev server (http://localhost:3000, Turbopack)
bun run build            # Production build — MUST pass before committing
bun run lint             # Lint — MUST pass before committing
bun run test             # Unit/integration tests (Vitest)
bun run test:coverage    # With coverage thresholds (80% lines/functions)
bun run test:e2e         # Playwright e2e tests
bun run test:all         # typecheck + lint + vitest + playwright
bun run verify           # build + lint + test (the full gate)
bun run typecheck        # TypeScript check
agent-browser navigate http://localhost:3000  # Browser automation for e2e
ntm scan .              # UBS bug scan
```

### Environments

**Local development** uses local Supabase via Docker. **Production** uses the hosted Supabase project on Vercel.

```
# Start local Supabase (required before bun run dev)
supabase start           # Starts Postgres + Auth + Storage via Docker
supabase status          # Show connection URLs and keys
supabase db reset        # Replay all migrations from clean state
supabase stop            # Stop all containers

# Local Supabase URLs (from supabase status)
# Project URL:    http://127.0.0.1:54321
# Studio:         http://127.0.0.1:54323
# Database:       postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

| Environment | Supabase | .env source | Test user |
|---|---|---|---|
| Local dev | Docker (`supabase start`) | `.env.local` → `127.0.0.1:54321` | `dev@skye-search.test` / `testpass123` |
| Vercel Production | Hosted project | Vercel env vars | None — Skye only |

**Rules:**
- `.env.local` MUST point to local Supabase, never production
- Production Supabase credentials go in Vercel env vars only
- Test user (`dev@skye-search.test`) exists in local Supabase ONLY — never in production
- Migrations live in `supabase/migrations/` — single source of truth for both environments
- Run `supabase db reset` to replay all migrations after pulling new ones
- Run `bun run src/db/seed-to-supabase.ts` after reset to seed data + create test user

**Optional API keys** (features fail open if missing — `scripts/check-prereqs.sh` warns):
- `ANTHROPIC_API_KEY` — Look it up (Add Job URL analysis), weekly recap commentary. Get one at https://console.anthropic.com/settings/keys.
- `EXA_API_KEY` — Job discovery via neural search. Get one at https://dashboard.exa.ai.
- `RESEND_API_KEY` — Email send (alerts, weekly recap delivery). Get one at https://resend.com/api-keys.

Edge Function scoring uses a SEPARATE `ANTHROPIC_API_KEY` stored in Supabase secrets (`supabase secrets list`). Rotating the Vercel key does not rotate the Edge Function key — fix both when keys change.

### Build Gate (mandatory before every commit)
```
bun run verify
```
Never commit if any fail. Fix first.

### Git Rules
- Never: git reset --hard, git clean -fd, git push --force, rm -rf
- Always: git pull before committing
- Always: stage specific files (never git add . or git add -A)
- Always: commit messages reference bead ID (e.g., "br-42: implement dual clock")
- Never: skip hooks (--no-verify)

## Testing (Testing Trophy)

Tests prioritize confidence: Static > Integration > Unit > E2E.
Integration tests are the LARGEST layer — test components as users use them.

### Rules
- Every component must have a `.test.tsx` co-located test file
- Tests use Testing Library — test behavior, not implementation
- No mocking internal modules — mock only external APIs (use MSW)
- No `test.skip` or `test.only` in committed code (ESLint enforces this)
- Coverage thresholds ratchet up automatically (never decrease)
- Server Components: test via integration or e2e, not unit tests
- Convention: `.test.ts(x)` = Vitest, `.spec.ts` = Playwright

### After implementing a bead
1. Write tests FIRST or alongside implementation (not after)
2. Run `bun run verify` before committing
3. For UI beads: verify with agent-browser (see below)

## E2E Verification with agent-browser

After implementing or modifying any UI component, verify visually:
1. `agent-browser open http://localhost:3000/<route>`
2. `agent-browser wait --load networkidle`
3. `agent-browser snapshot -i` — verify expected elements appear
4. Interact: `agent-browser click @e1`, `agent-browser fill @e2 "value"`
5. Re-snapshot after interactions to verify state changes
6. `agent-browser errors` — check for console errors
7. `agent-browser close`

Key rules:
- ALWAYS snapshot before interacting (refs don't exist until snapshot)
- ALWAYS re-snapshot after navigation or DOM changes (refs invalidated)
- Use `agent-browser wait --text "Expected"` to verify content appeared

## Multi-Agent Coordination

When working in a swarm (multiple agents via NTM):
- Check `bv --robot-next` before starting work
- Mark beads as in_progress immediately when starting
- Use Agent Mail MCP tools to announce claims and reserve files
- Release file reservations after committing
- NEVER run bare `bv` (launches TUI) — always use --robot-* flags

### After Completing Each Bead
1. Self-review: Read all new/modified code with fresh eyes. Fix bugs. Repeat until clean.
2. E2e verify (for UI beads): Use agent-browser to verify the feature works
3. Build gate: `bun run verify`
4. Bug scan: `ntm scan --diff`
5. Commit: `git pull && git add <specific files> && git commit -m "br-XX: description"`
6. Learn: If you discovered something surprising or non-obvious, route it to where it'll be read:
   - **Reusable pattern/gotcha** → new file in `.claude/rules/` (loaded every session)
   - **Cross-session project context** → memory file (recalled in future conversations)
   - Skip if the lesson is obvious or already captured in the commit/code.
   - Do NOT use `br comments add` (closed beads never read) or manual `cm mark` (automated by SessionEnd pipeline).
7. Close: `br close <id> --reason "Completed"`
8. Advance: `bv --robot-next` to pick next bead

### Beads & BV
- `br list --limit 0 --json` — all open beads (default limit is 50, always override)
- `br show <id>` — full bead state. **Read before modifying** — `br list` omits comments and truncates descriptions.
- `br update <id> --description "..."` — REPLACES entire description
- `br dep add <issue> <depends-on>` — add blocking dependency
- `bv --robot-next` — highest-priority unblocked bead
- `bv --robot-plan` — parallel execution tracks
- `bv --robot-triage` — full graph analysis with scores

Bead descriptions are the single source of truth for specs, test plans, and acceptance criteria.

## Session Memory (CASS + CM)

Agents in this repo have access to two memory systems that improve over time:

### CASS (Coding Agent Session Search)
Search past coding sessions for solutions, patterns, and context.
```
cass search "<query>" --robot --limit 5    # Search past sessions
cass context src/lib/urgency-scoring.ts    # Context for a specific file
cass sessions --workspace "$(pwd)" --json  # Sessions in this project
cass health --json                         # Health check (run if searches fail)
```
CASS indexes sessions automatically. If health check shows `stale: true`, run `cass index --full`.

### CM (Procedural Memory)
Retrieve and contribute to the project's learned rules.
```
cm context "<task>" --json                 # Get relevant rules before starting work
cm mark <rule-id> --helpful --reason "..." --json   # Rule helped
cm mark <rule-id> --harmful --reason "..." --json   # Rule hurt or misled
```

**Agent workflow with CASS + CM:**
1. **START**: Run `cm context "<task>" --json` before complex work — check relevantBullets and antiPatterns
2. **SEARCH**: Use `cass search` when stuck — past sessions often have solutions
3. **WORK**: Reference rule IDs in comments when following CM guidance: `// [cass: helpful b-xyz]`
4. **END**: Mark rules that helped or hurt via `cm mark`

Agents can create new rules in `.claude/rules/` when they discover patterns. Flag problematic rules for revision.

## Quality Standards
- No AI writing patterns in user-facing text (use /humanizer skill)
- Warm, encouraging tone — never clinical or robotic (see warm-ux-tone rule)
- Immigration data must be accurate — when uncertain, flag it
- All user data encrypted at rest
- No API keys in code (use environment variables)
- DCG will block dangerous commands — if blocked, find a safe alternative
- Use Context7 MCP to fetch current library docs before generating code

### Design Quality
- Use /impeccable skill for all UI work — prevents generic AI aesthetic
- Use /frontend-design skill for distinctive, production-grade interfaces
- Use /humanizer skill on all user-facing text
- SkyeSearch aesthetic: ocean blues, jade greens, warm tones, rounded shapes
- Never: Inter font as default, purple-to-blue gradients, cards-in-cards, gray-on-color text

## When to STOP and Ask the Human

STOP working and ask for help when:
- You need an API key, account, or credential not in .env.local
- You're about to make a decision that affects billing or external services
- You've failed the same task 3 times with different approaches
- You're unsure about an immigration rule (flag it, don't guess)
- A bead's requirements are ambiguous or contradictory

Format: "BLOCKED: [reason]. I need you to [specific action]."
