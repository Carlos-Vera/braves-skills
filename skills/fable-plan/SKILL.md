---
name: fable-plan
description: >
  Use when the user says "/fable-plan", "planifica esta feature"/"plan
  this feature", "antes de desarrollar"/"before developing", "hazme las
  preguntas"/"ask me the questions", or asks to develop any non-trivial
  function/module without a prior plan. Also used as braves-start's
  interview engine.
license: MIT
---

# Fable Plan

Speak to the user in the `language` set in `~/.claude/braves-skills.json`;
if unset, default to Spanish.

The questions a senior architect asks BEFORE writing code, and the
phased plan that comes out of the answers. One question at a time; wait
for the answer before the next.

## The questions

Go through the categories in order. SKIP any question that context,
code, or docs already answer — asking the obvious is as bad as not
asking. Usually 3-6 questions are enough.

1. **Problem** — What breaks or is lost if this is NOT built? Who will
   actually use it and how many times a day?
2. **Scope** — What's explicitly OUT of this version? If the answer is
   "nothing," the scope hasn't been thought through.
3. **Data** — What's the source of truth? What shape does the data have
   and who else writes to it? Is there a migration? Is there PII to
   protect?
4. **States** — What does the user see when empty, loading, error, and
   with 10,000 records? What happens if two users touch the same thing
   at once?
5. **Security** — Who can call this and how do we verify it on the
   server? Does it cross any trust boundary (external input, API with a
   key, money)?
6. **Cost** — What does this cost at 100x users (queries, LLM tokens,
   storage)? Who pays the bill if the endpoint gets abused?
7. **Maintenance** — Who debugs this at 3am and with what logs? What new
   dependency are we adopting and who maintains it?
8. **Success** — How will we know it works? A command, a number, or a
   verifiable flow — not "it feels right."

## From interrogation to plan

With the load-bearing answers, produce the plan:

```markdown
# Plan: <feature>

## Decisions (from the answers)
- <decision> — because <answer that supports it>

## Phase N: <title>
- Goal: <smallest slice that can be demonstrated running>
- Files: <concrete paths>
- Steps: <2-6 steps>
- Verification: `<command or flow>` → expected: <observable result>
```

Rules: each phase is the smallest shippable slice; runnable
verification per phase (a phase without verification isn't a phase);
what's dropped is noted in one line ("out: X, added when Y").

## After the plan

- Large feature or debatable decision → run the plan through
  braves-opinion.
- Approved plan → execute phase by phase, or delegate each phase to a
  subagent with the plan as context.

## Limits

Plans, doesn't implement. If the user says "don't ask, just do it," ask
at most the 2 most load-bearing questions and state the rest as
explicit assumptions in the plan: "[ASSUMED] X — correct me if wrong."
