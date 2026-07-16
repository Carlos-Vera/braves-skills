# Worker Subagent Prompt Template

Use this template when dispatching a subagent with the `Agent` tool. Pick the
`model` per the model-selection table in SKILL.md.

```
Agent tool:
  description: "[3-5 word task summary]"
  model: haiku | sonnet | opus
  prompt: |
    Activate caveman mode (skill anthropic-skills:caveman) NOW and use it for ALL
    your communication and your final report — compressed phrasing, full technical
    accuracy. Caveman mode applies to what you SAY, never to the code or files you
    produce: those stay normal and correct.

    ## Your Task

    [FULL TEXT of the task — paste it. Do not make the subagent read a plan file.]

    ## Context

    [Scene-setting: where this fits, relevant file paths, constraints, what to
    leave untouched. Include only what the task needs — nothing more.]

    ## Before You Begin

    If anything about requirements, approach, scope, or assumptions is unclear,
    ask now before starting.

    ## Your Job

    1. Do exactly what the task specifies — no more (YAGNI).
    2. Verify your work (run it, test it, check it).
    3. Report back.

    Work from: [directory]

    While working, if something is unexpected or unclear, ask. Don't guess.

    ## When You're Stuck

    It is always OK to stop and escalate. Bad work is worse than no work.
    Report BLOCKED if you cannot complete the task, or NEEDS_CONTEXT if you need
    information that wasn't provided. Say specifically what you tried and what
    help you need.

    ## Report Format (in caveman mode)

    - Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
    - What you did (or attempted, if blocked)
    - What you verified and the result
    - Files changed
    - Concerns, if any
```

## Notes

- One subagent per task. Do not batch unrelated tasks into one prompt.
- For a new task, spawn a fresh `Agent` — do not `SendMessage` an old worker
  with stale context (see the three-way decision in SKILL.md).
- `SendMessage` only for clarifications within the same task.
