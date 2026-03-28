# Plan Self-Evaluation Before ExitPlanMode

Before calling ExitPlanMode, ALWAYS pause and self-evaluate the plan. Do NOT call ExitPlanMode without completing this checklist.

## Structural Requirements (plan file MUST have all of these)

- `## Context` — explains WHY this change is needed, not just what
- `## Files Modified/Created` — concrete table of deliverables
- `## Verification` — how to test the changes end-to-end
- Plan is substantive (not a stub)

## Self-Critique Questions (answer each honestly before proceeding)

1. **Simplicity**: Is there a simpler approach that achieves the same goal? Could any proposed files be eliminated?
2. **Assumptions**: What assumptions could be wrong? What if the library API changed, or the existing code works differently than expected?
3. **Reuse**: Are there existing utilities, patterns, or hooks being duplicated instead of extended?
4. **Maintenance**: What's the maintenance cost? Will this create tech debt? Is the complexity proportional to the value?
5. **User workflow**: Does this match how the user actually works, or just how the system technically functions?

## Action

If self-evaluation reveals improvements: **revise the plan FIRST**, then call ExitPlanMode. Iterating in plan space is cheap. Iterating in code space is expensive.

## Why This Rule Exists

Session 2026-03-28: agent called ExitPlanMode 3 times. Each time, the user pushed back with "is this optimal?" The agent found 6 concrete improvements only after being challenged:
- Template vs shell string assembly
- Copy-pasteable Agent tool calls in block messages
- Smart convergence (pass 2 only when CRITICAL/HIGH found)
- Truncated code diff in evaluator prompt
- Actionable why_fits in scoring output
- Hiring timeline estimate field

All 6 were obvious in hindsight. The agent just didn't pause to think.
