---
name: desarrollo
description: Use when the user asks to implement, build, or fix code features ("desarrolla"/"implement", "implementa"/"build", "crea la feature"/"create the feature", "programa esto"/"code this", "/desarrollo") and the work should be planned by Claude and executed by delegated agents
---

# Desarrollo — Claude Plans, Executors Execute

Speak to the user in the `language` set in `~/.claude/braves-skills.json`;
if unset, default to Spanish.

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
| Frontend — UI, views, HTML, CSS, interface JS, components. ALWAYS, no exception | Gemini (best available model; today 3.5 Flash) | `agy` (command below) |
| Simple backend — CRUD, targeted fix, mechanical refactor, tests | Sonnet 5 | Agent tool with `model: "sonnet"` |
| Complex backend — architecture, critical business logic, migrations, security | Opus 4.8 | Agent tool with `model: "opus"` |

Mixed task → split it: the frontend part still goes to Gemini.

## Dispatch to Gemini (agy)

```bash
~/.local/bin/agy --add-dir "/absolute/path/to/project" \
  -p "<task with absolute paths and acceptance criteria>" \
  --dangerously-skip-permissions --print-timeout 15m
```

- Run Bash with `dangerouslyDisableSandbox: true` (needs keyring and
  network) and a generous timeout.
- ALWAYS absolute paths, in `--add-dir` and inside the prompt; with
  relative paths Gemini writes to `~/.gemini/antigravity-cli/scratch/`.
- **Model**: check available ones with `agy models`. The flag is
  `--model "<name>"`, but WATCH OUT (as of 2026-07-09): custom IDs don't
  resolve and agy silently falls back to default — check
  `~/.gemini/antigravity-cli/cli.log` for the line `not in local config` /
  `Propagating selected model override`. Today the default is already
  Gemini 3.5 Flash (Google's best); if the default changes tomorrow or the
  flag gets fixed, adjust here.
- Iterating on the same task: `agy --continue -p "<feedback>"
  --dangerously-skip-permissions`.

## Common mistakes

- Delegating frontend to a Claude subagent → NO: frontend always goes to
  Gemini.
- Relative path in `--add-dir` → files end up in the wrong scratch dir.
- Trusting the executor's "I'm done" → the diff and verification are the
  only source of truth.
- Dispatching without acceptance criteria → the executor improvises scope.
- Assuming `--model` applied → check the log to see which model actually
  propagated.
