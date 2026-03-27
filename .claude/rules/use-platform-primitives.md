# Use Platform Primitives, Not Workarounds

When working in a specific runtime (Deno, Node, Bun), use its standard library and built-in APIs. Do not reimplement functionality that the platform already provides.

## Examples of violations
- Writing a manual base64 chunking loop instead of `encodeBase64` from Deno std
- Writing a JSON fence-stripping regex instead of using the SDK's `messages.parse()` structured output
- Writing a retry loop instead of using the SDK's built-in retry configuration
- Writing a file walker instead of using `Deno.readDir()` or `fs.readdir()`

## Before writing utility code, ask:
1. Does the runtime's standard library have this? (Check Context7)
2. Does the SDK have a helper for this? (Check Context7)
3. Does an existing project utility do this? (Grep the codebase)

Only write custom code if all three are no.

## Why
Session 2026-03-27: wrote `btoa(String.fromCharCode(...spread))` which crashes on >64KB. Deno's `encodeBase64` from std handles any size. Wrote a manual fence-stripping hack when the SDK had `messages.parse()` + `zodOutputFormat()`.
