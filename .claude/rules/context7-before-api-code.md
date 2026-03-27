# Context7 Before API Integration Code

Before writing ANY code that calls an external API, you MUST query Context7 for current documentation. Training data is stale — APIs add features (like structured outputs) that eliminate entire classes of bugs.

## Required before writing API calls to:
- **Anthropic/Claude** — check for structured outputs, new content block types, SDK helpers
- **Supabase** — check for new SDK methods, RPC patterns, Storage API changes
- **Resend** — check for new sending patterns, webhook changes
- **Exa** — check for new search/similarity endpoints

## Steps
1. `resolve-library-id` with the library name
2. `query-docs` with your specific use case (e.g., "structured JSON output from Claude")
3. Use the documented approach, not what you remember from training data

## Why
Session 2026-03-27: wrote extract-cv using raw `messages.create()` + manual JSON parsing + fence-stripping hack. The SDK had `messages.parse()` + `zodOutputFormat()` the whole time — returns validated, typed output with zero parsing code. Two bugs (fence wrapping, parse failures) would never have existed.
