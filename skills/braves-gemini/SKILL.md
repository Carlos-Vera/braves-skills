---
name: braves-gemini
description: >
  Use when the user says "/braves-gemini", "delega esto a Gemini"/"delegate
  this to Gemini", "manda el frontend a Gemini"/"send the frontend to
  Gemini", "usa el CLI de Gemini"/"use the Gemini CLI", "agy", or when work
  should run on Gemini instead of a Claude subagent — UI and frontend, a
  second opinion from another model, or a long job that shouldn't eat this
  context.
license: MIT
---

# Braves Gemini — driving the Gemini CLI

Claude dispatches, Gemini executes, Claude verifies. Gemini's "done" is a
claim; `git diff` is the evidence.

The binary is `agy` (Antigravity CLI) at `~/.local/bin/agy`.

## The user never types any of this

"Delega esto a Gemini" is the whole interface. Everything below is yours to
run, not something to teach, quote back, or hand over as instructions.

When the user says it, do not ask them for a path or for details they have
already shown you:

1. **Resolve the project yourself** — the repo root of the work in hand
   (`git rev-parse --show-toplevel`), or the directory of the files under
   discussion. Ask only when genuinely ambiguous, e.g. a monorepo with
   several apps and no clue which one.
2. **Find the code yourself** before dispatching. Grep for the string on
   screen, read the surrounding lines, and check for near-identical
   matches — two buttons with the same label is the normal case, and the
   prompt has to name which one dies and which one stays.
3. **Commit the checkpoint** (below) before Gemini touches anything.
4. **Prepare the ground** — install, scaffold, wire up. Everything that
   needs a shell is yours, not Gemini's.
5. **Write the prompt** with absolute paths, acceptance criteria, what must
   not be touched, and the house rules.
6. **Review the result and report** — what changed and what you verified,
   not the command you ran.

A screenshot with an arrow on it is a complete brief. Turn it into the
prompt yourself.

## Checkpoint before dispatching

You commit, Gemini never does. Commit the working tree yourself first, so
the dispatch has a floor to stand on:

```bash
git add -A && git commit -m "chore: checkpoint before delegating to Gemini"
```

Local only — never push, and never on the user's behalf to a remote. If
the tree is already clean, HEAD is the checkpoint; note the sha either way.

That commit is what makes the rest work: `git diff HEAD` afterwards is
exactly Gemini's work and nothing else, even when someone else is editing
the same repo. And undoing a bad dispatch is `git reset --hard <sha>`
instead of reconstructing what was there.

Tell Gemini in the prompt: **do not commit, do not push, leave the changes
in the working tree.** Its job ends at the edit.

## Prepare the ground before dispatching

Gemini is good at editing code and bad at everything around it. It stalls
the moment the environment isn't ready: a package that isn't installed, a
file that doesn't exist yet, a route nobody wired, a build it has to run to
see what it broke. It doesn't fail cleanly there — it grinds, retries, and
burns the clock.

So hand it a job that is pure editing. Before dispatching, you do:

- Install what the task needs (`pnpm add`, the missing types, the icon
  package).
- Create the files that don't exist yet — empty, or with the imports,
  export and route already wired. Gemini fills them in.
- Run the migration, the codegen, the scaffold command.
- Check the build and the linter run clean, so the floor is known-good
  before Gemini stands on it.

Then the dispatch is: edit these existing files, in place. Nothing else.

That is also why the default carries no `-y`. Reaching for `-y` is the
signal that a shell step is in the prompt that should have been yours.

## House rules that ride along

Every prompt carries these, because the executor has none of the user's
context:

- Artifacts in English — code, comments, docs, UI strings — unless the
  project already uses another language. Match the file you are editing.
- The minimum that solves it. No abstractions, helpers or features nobody
  asked for.
- Touch only what the task names. Leave the rest alone.
- Write code that reads like the code around it: same naming, same comment
  density, same idiom.
- Never real client names in examples or fixtures — neutral placeholders.

Add whatever the project itself mandates (its CLAUDE.md, AGENTS.md, lint
config). Gemini cannot read the user's setup; if it is not in the prompt,
it does not exist.

## The command

Always through the wrapper — never `agy` bare (see "Several projects at
once" for why):

```bash
sh "$CLAUDE_PLUGIN_ROOT/scripts/gemini-dispatch.sh" \
  "<ABSOLUTE project dir>" "<task, absolute paths, acceptance criteria>"
```

Run it through Bash with `dangerouslyDisableSandbox: true` (it needs the
keyring and the network) and a tool timeout above 15m.

Run it in the background (`run_in_background: true`) so you can watch it
and tell the user how it's going instead of sitting blind for fifteen
minutes.

`-y` is the exception, not a flag you reach for by default. Without it only
file edits are approved: the moment Gemini reaches for a shell, headless
mode auto-denies it and the run dies with no output and exit 1, `a tool
required the "command" permission that headless mode cannot prompt for`.
The fix is almost always to run that shell step yourself beforehand — see
"Prepare the ground". `-y` is for the rare task that genuinely has to drive
a shell of its own.

```bash
sh "$CLAUDE_PLUGIN_ROOT/scripts/gemini-dispatch.sh" -y "<dir>" "<task>"
```

`-y` approves every tool the model decides to call, so never point it at
content you did not write — a third party's PR diff, a scraped page, an
issue body. Instructions buried in that text become shell commands the CLI
runs for you (indirect prompt injection). Untrusted input: dispatch
without `-y` and read the diff yourself.

## Non-negotiables

- **Absolute paths everywhere** — the project dir and every path inside
  the prompt. With relative paths Gemini writes into
  `~/.gemini/antigravity-cli/scratch/` and the work is lost.
- **Acceptance criteria in the prompt.** Without them the executor invents
  its own scope. Tell it what "done" looks like and what not to touch.
- **Never `-i` / `--prompt-interactive`** from Claude: it opens a TUI and
  the Bash call hangs until timeout.

## Several projects at once

`agy` files every CLI conversation under one shared project
(`default-cli-project`), and its `--continue` / `-c` means *the most recent
conversation, globally* — not the most recent one here. With two editor
windows dispatching to Gemini, a bare `agy -c` in project A resumes
project B's conversation and hands the wrong context to the wrong repo.

The wrapper is the fix: it keeps a conversation id per project directory
(under `~/.cache/braves-gemini/`, keyed by absolute path) and resumes with
`--conversation <id>`. So `-c` through the wrapper always means "this
project's last conversation".

`--id <dir>` prints what is pinned there — the id, and the title agy gave
that conversation itself, tab-separated:

```
130cf734-9310-4ad7-94e6-e03b6a500bfa	Create HTML File Request
```

Check it before a `-c` you are not sure about. `| cut -f1` if you only
want the id.

The IDE is not part of this. Each `agy` run starts and stops its own
language server, opens its own conversation and authenticates on its own
against Google — nothing observed so far routes through the Antigravity
app. Opening the project in the IDE lets you watch a conversation; it is
not what makes one work.

## Watching a run

You can see what Gemini is doing while it does it. The wrapper records
every step of the run, and `--watch` prints them:

```bash
sh "$CLAUDE_PLUGIN_ROOT/scripts/gemini-dispatch.sh" --watch "<dir>"
```

```
0.2s	view_file	/abs/path/Header.tsx
0.1s	grep_search	Button
RUNNING	replace_file_content	/abs/path/Header.tsx
-- still running, last step 12s ago
```

One line per tool: how long it took, what it called, the arguments it got.
The last line is the verdict — `finished: SUCCESS`, or how long the stream
has been quiet. Read it that way:

- Steps still appearing, seconds apart → it's working. Leave it alone.
- `RUNNING` on the same step, or nothing new, for minutes → it's stuck.
- The same file read four times, a search repeated with the same query →
  it's circling, and it will keep circling.

Stuck is not something you wait out. Stop the background dispatch, then
re-dispatch with `-c` and the thing it was missing: the exact path, the
name of the component, the fact that the file it wants doesn't exist yet.
That last one usually means the ground wasn't ready, so fix that first.

Poll it while a dispatch is in flight and report progress to the user in
their own words — "va por el tercer archivo" — rather than making them ask.

## Models

`agy models` prints slug and label. Pass the slug to `--model`; the
suffix is the reasoning effort, not a different model.

| Slug | Use it for |
|---|---|
| `gemini-3.7-flash-medium` | Default. Frontend, UI, components, copy-to-markup. |
| `gemini-3.7-flash-high` | Same work when the layout logic is genuinely hard. |
| `gemini-3.1-pro-high` | Long reasoning, refactors spanning many files. |

Verify what actually ran: end the prompt with "then reply with the name of
the model you are", or grep `~/.gemini/antigravity-cli/cli.log` for
`Propagating selected model override`. A slug that doesn't resolve falls
back to the default silently.

## Iterating

Same project, same conversation, new instruction:

```bash
sh "$CLAUDE_PLUGIN_ROOT/scripts/gemini-dispatch.sh" -c "<dir>" "<feedback>"
```

`-c` and `-y` combine in either order. The first dispatch for a directory
must run without `-c` — there is no conversation to resume yet, and the
wrapper says so instead of guessing.

## After every dispatch

You review the code, always, and you tell the user what you found — that
report is the deliverable, not Gemini's "DONE".

1. `git diff HEAD` — against your checkpoint, so what you read is Gemini's
   work alone. `git status` too: anything outside the named files is a
   finding, not a detail.
2. Read it as a reviewer, not as a receipt. Orphaned imports, a stray
   `console.log`, scope it invented, a second occurrence it hit by mistake.
3. Run the project's lint/tests/build.
4. Report to the user: what changed, what you verified with what result,
   and any concern. Summarise — the files touched, the lines added and
   removed, what it actually did. Paste the diff only when it is short
   enough to read in the chat (a handful of lines) or when the user asks
   for it; a wall of diff is not a report. If it went wrong, say so plainly
   and offer the `git reset --hard <checkpoint>`.
5. Broken or off-scope? Feed it back with `-c`, don't fix it by hand — that
   defeats the delegation.

## This toolbox runs inside agy too

`agy plugin install <path to this repo>` imports all 19 skills, and Gemini
then calls them by name. That is what the `plugin.json` symlink at the repo
root is for — agy looks for the manifest there, Claude Code looks in
`.claude-plugin/`, and the symlink lets one file serve both. Don't delete
it.

Only `skills` crosses over: hooks, agents, commands and MCP servers are
skipped, so the `CONTEXTO.md` handoff and the context checkpoint stay on
the Claude Code side. The import is a copy, so re-run the install after
changing a skill.

## Common mistakes

- `agy models` not listing 3.7 → the local cache is stale. Run
  `agy update`; it refreshes the list even when the binary is current.
- Trusting `--version` alone: it has reported a stale number while the
  installed binary was newer.
- Relative paths in the prompt → the diff is empty and the files are in the
  scratch dir.
- A dispatch that returns nothing and exits 1 → the task needed a shell you
  should have run for it. `--watch` names the step it died on. Read the diff
  before re-running: that message means *a* tool was denied, not that
  nothing happened. Gemini often finishes the edits and only dies at the
  end, reaching for a shell to verify its own work. Re-dispatching blind
  then does the job twice.
- Dispatching into an environment that isn't ready → it grinds instead of
  failing. Install and scaffold first.
- Calling `agy -c` directly → you may be resuming another project's
  conversation. Go through the wrapper.
- Dispatching without the checkpoint → when the diff comes out wrong you
  have nothing to reset to, and someone else's uncommitted work is now
  tangled with Gemini's.
- Letting Gemini commit or push → it commits, you review. A commit it made
  is one you have not read yet.
- Dispatching a mixed frontend/backend task whole: split it, the backend
  half belongs to a Claude subagent.
