# Subagent Role Convention

The `description` field on Agent tool calls is the role signal. All hooks use it consistently to classify subagent permissions.

## Recognized roles (by description pattern)

| Description contains | Role | Can run verify | Can write code | Can close/push |
|---|---|---|---|---|
| `cross-review` | Review | Yes | No | No |
| `self-review` | Review | Yes | No | No |
| `code-review`, `audit` | Review | Yes | No | No |
| anything else | Implementation | Yes | Yes | No |

## How hooks use it

- **PreToolUse[Agent]** (`block-bead-delegation.sh`): classifies by description, applies graduated permissions
- **PostToolUse[Agent]** (`post-cross-review-capture.sh`): captures results only for `cross-review` descriptions
- **PostToolUse[Agent]** (`post-self-review-capture.sh`): captures dispositions for `self-review` descriptions
- **SubagentStart** (`inject-review-context.sh`): injects evaluator template for review descriptions

## Rules

1. Always include the role keyword in `description` — it's the primary discriminator
2. Review agents are fully trusted — description check happens FIRST, before any prompt scanning
3. Non-review subagents cannot `br close` or `git push` — those are main-context-only
4. Implementation agents can write code and run verify but can't drive lifecycle steps

## Why description, not prompt

The `prompt` field is long and contains incidental mentions of commands (e.g., "check if git commit messages follow convention" doesn't mean "run git commit"). The `description` field is 3-5 words, always intentional, and already required.
