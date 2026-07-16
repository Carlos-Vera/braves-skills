---
name: braves-ship
description: >
  Use when the user says "/braves-ship", "cierra la feature" (close out
  the feature), "haz el commit" (make the commit), "crea el PR" (create
  the PR), "mergea esto" (merge this), "sube los cambios" (push the
  changes), "vamos a producción" (let's ship to production), or
  "release". Professional close-out of the work: pre-flight, commits
  with the configured signature, PR/merge per the user's policy.
license: MIT
---

# Braves Ship

Speak to the user in the `language` set in `~/.claude/braves-skills.json`;
if unset, mirror the language the user writes in.

Professional close-out of the work. Nothing ships without pre-flight,
and commits go out the way the user configured them — not however the
model feels like it.

## Step 0 — Configuration

Read `~/.claude/braves-skills.json`. If it doesn't exist → run
braves-setup first (REQUIRED SUB-SKILL: braves-setup). From it comes:
git identity, `commits_by_claude`, signature, `coauthor_ai`, PR/merge
policy.

## Step 1 — Pre-flight (blocking)

In order, using the project's commands:

1. `lint` and `build` green. `test` if it exists.
2. Review the full diff (`git diff` + `git status`) with braves-security
   eyes: does the diff carry secrets, unauthenticated endpoints,
   unjustified new deps, `console.log`/debug code?
3. Any files that shouldn't be included? (.env, dumps, binaries,
   node_modules).
4. If scope changed relative to the plan/docs, update `PLAN.md`/docs in
   the same commit or say why not.

Pre-flight red = no commit. Fix first (braves-fix if it's a bug).

## Step 2 — Commit

- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, …
  Short imperative message; body only if the "why" isn't obvious.
- Commit footer: the `commit_signature` from the config, as-is.
- `coauthor_ai: false` (default) → NEVER add `Co-Authored-By: Claude...`
  lines or AI mentions. Only if the config explicitly enables it.
- Per `commits_by_claude`: `always` → commit directly; `ask` → show the
  proposed message and wait for ok; `never` → leave the message ready
  and let the user commit.
- On the default branch with new changes → create a branch first
  (`feat/<slug>`, `fix/<slug>`), unless the config allows direct push.

## Step 3 — PR / Merge (per config)

- `pr.create: true` → PR with `gh pr create`: title = main commit
  message; body with **What / Why / How to verify** (concrete commands
  from pre-flight).
- Merge with the configured strategy (`merge_strategy`), and ONLY if
  `who_merges` allows it — if the user merges, leave the PR ready and
  the link.
- Never force push, never straight to main unless
  `direct_push_main: true`.

## Step 4 — Release checklist (if going to production)

- [ ] New environment variables documented (README/`.env.example`)
- [ ] Migrations applied with a known rollback path
- [ ] One-line rollback plan (revert? previous redeploy?)
- [ ] Where to look if something breaks (logs, dashboard) noted in the
      PR

## Step 5 — Close-out

Confirm in ≤3 lines: what got committed/pushed, PR link if any, and if
the session had significant decisions or learnings, suggest braves-save.

## Limits

Doesn't merge without the config's permission, doesn't skip pre-flight
even under time pressure ("it's a tiny change" — tiny ones take down
prod too), doesn't rewrite published history. Push to other people's
repos: never without explicit orders.
