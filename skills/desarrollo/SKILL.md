---
name: desarrollo
description: Use when the user asks to implement, build, or fix code features ("desarrolla"/"implement", "implementa"/"build", "crea la feature"/"create the feature", "programa esto"/"code this", "/desarrollo") and the work should be planned by Claude and executed by delegated agents
---

# Desarrollo — Claude Plans, Executors Execute

## Principle

Claude plans, delegates execution, and reviews the result. Claude does NOT
write the task's code — the executor indicated by triage does. Single
exception: trivial few-line changes in 1 file.

## Flow

1. **Plan**: read the minimum necessary context, break into tasks with
   clear acceptance criteria.
2. **Triage and dispatch** (table below). The prompt to the executor
   carries: context, files with ABSOLUTE PATHS, acceptance criteria, and
   "execute, don't explain."
3. **Review**: read the real diff (`git diff`), not the executor's report.
4. **Verify**: lint/tests/build per the project. Never report "done"
   without evidence.
5. **Iterate**: feedback to Gemini via `agy --continue`; to Claude
   subagents via SendMessage.

## Triage

| Task | Executor | How |
|---|---|---|
| Frontend — UI, views, HTML, CSS, interface JS, components. ALWAYS, no exception | Gemini (gemini-3.7-flash-medium) | `agy` (command below) |
| Simple backend — CRUD, targeted fix, mechanical refactor, tests | Sonnet 5 | Agent tool with `model: "sonnet"` |
| Complex backend — architecture, critical business logic, migrations, security | Opus 4.8 | Agent tool with `model: "opus"` |

Mixed task → split it: the frontend part still goes to Gemini.

## Dispatch to Gemini (agy)

```bash
sh "$CLAUDE_PLUGIN_ROOT/scripts/gemini-dispatch.sh" \
  "/absolute/path/to/project" "<task with absolute paths and acceptance criteria>"
```

Run it with `dangerouslyDisableSandbox: true` and a generous timeout. Add
`-y` if the task needs a shell (install, build, tests), `-c` to iterate on
the same project's conversation. Never call `agy` directly: its `-c` is
global and will resume another project's conversation. Models, the
permission modes and the failure cases live in the `braves-gemini` skill —
read it before dispatching anything non-obvious.

## Common mistakes

- Delegating frontend to a Claude subagent → NO: frontend always goes to
  Gemini.
- Relative path in `--add-dir` → files end up in the wrong scratch dir.
- Trusting the executor's "I'm done" → the diff and verification are the
  only source of truth.
- Dispatching without acceptance criteria → the executor improvises scope.
- Assuming `--model` applied → check the log to see which model actually
  propagated.
