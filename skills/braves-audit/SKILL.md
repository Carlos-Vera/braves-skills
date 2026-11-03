---
name: braves-audit
description: >
  Use when the user says "/braves-audit", "auditoría completa" (full
  audit), "audita todo el proyecto" (audit the whole project), "audita
  el repo" (audit the repo), "braves-global", or wants the real state of
  the project (security + over-engineering + performance +
  accessibility) with an executable remediation plan written to the
  root. Also "/braves-audit diff", "revisa la rama" (review the
  branch), "revisa el diff" (review the diff), "thermos": a deep review
  of only the current branch's changes.
license: MIT
---

# Braves Audit

Two modes:

- **Full mode** (default): the whole project in four passes. ALWAYS
  ends by writing `braves-audit-YYYY-MM-DD.md` to the project root: a
  runbook a fresh agent can run in a brand-new conversation with no
  prior context (braves-fix runs it).
- **Diff mode** (`/braves-audit diff`): a deep review of only the
  current branch's changes. NEVER writes a runbook; the findings go in
  the conversation. See **Diff mode** below.

Everything up to **Diff mode** is full mode.

## The four passes

1. **Security** — REQUIRED SUB-SKILL: full braves-security (Pass A
   infra + Pass B code).
2. **Over-engineering** — tags inherited from ponytail, one line per
   finding:
   - `delete:` dead code, unused flexibility, speculative feature.
   - `stdlib:` reimplementation of something the standard library
     already provides.
   - `native:` dependency or code that the platform already covers
     (CSS > JS, DB constraint > app-level validation, `<input
     type="date">` > custom picker).
   - `yagni:` abstraction with a single implementation, config nobody
     changes, layer with a single caller.
   - `shrink:` same logic in fewer lines — show the short form.
3. **Basic performance** — N+1 queries, missing indexes on
   filtered/joined columns, bloated bundle (heavy deps for one
   function), sequential request waterfalls that could be
   parallelized, unoptimized images, obvious re-render/hot-loop issues.
4. **Accessibility** — only if the project ships a UI (HTML, JSX/TSX,
   Vue, Svelte, templates). Audit against
   `${CLAUDE_SKILL_DIR}/a11y/CHECKLIST.md`; its contrast script is
   `python3 "${CLAUDE_SKILL_DIR}/a11y/contrast-check.py" "#777" "#fff"`
   (quote the colours: an unquoted `#` starts a shell comment). No UI →
   skip the pass and say so in one line.

## The runbook (mandatory)

Write `braves-audit-YYYY-MM-DD.md` to the root of the audited project —
the git root / wherever the code's manifest lives (package.json,
pyproject, …). If the workspace contains several nested projects,
confirm which one is being audited BEFORE starting. Structure:

```markdown
# Braves Audit — <project> — <YYYY-MM-DD>

## Instructions for the executing agent
1. Read this file COMPLETELY before touching anything.
2. Run the steps in order. Don't skip or reorder them.
3. After each step, run its **Verification** block and mark `[x]` ONLY
   if the result matches what's expected.
4. If a verification fails: stop at that step, fix it, re-verify. Don't
   move forward with red verifications.
5. Once all steps are done, run the full **Final verification** and
   report the table step → status with evidence (command + output).

## Context
- Project: <name> — <one line of what it is>
- Root: <absolute path> | Stack: <summary>
- Commands: install `<cmd>` · build `<cmd>` · lint `<cmd>` · test `<cmd>`

## Findings
| # | Severity | Tag | Finding | Path |
|---|-----------|-----|----------|------|

## Execution plan
### Step 1 — <title> [CRITICAL]
- Finding: #<n>
- Action: <what to change, concrete>
- Files: <paths>
- **Verification**: `<non-destructive command>` → expected: <result>
- [ ] Verified

### Step 2 — ...

## Final verification
- [ ] All verifications from all steps re-run green
- [ ] Production build with no errors: `<cmd>`
- [ ] No secret in the bundle/client: `<rg over the build>` → no matches
- [ ] Lint/tests (if any) green

## Requires platform access (the user handles this, not the agent)
- <fixes that live in an external dashboard (Supabase, Cloudflare,
  EasyPanel): what to enable, where, and how to verify it afterward>

## Out of scope (logged, not executed)
- <LOW findings / product decisions the user must make>
```

## Runbook rules

- Self-contained: the executor did NOT see this conversation. Absolute
  paths, full commands, zero references to "what we discussed".
- Every step has an executable, non-destructive verification with an
  observable expected result. A step without verification doesn't make
  it into the plan.
- Ordered by severity: CRITICAL → HIGH → MEDIUM → LOW.
- Over-engineering, performance and accessibility severity: never
  exceeds MEDIUM — MEDIUM if it causes bugs, costs money or locks people
  out today (N+1 in a hot path, incorrect logic, a form keyboard users
  can't submit, body text under 4.5:1), LOW otherwise. CRITICAL and
  HIGH are exclusive to security.
- braves-security findings get folded into the findings table (one row
  each); its `exposure: ...` line only goes in the conversation
  summary, not duplicated in the file.
- A fix that lives in an external dashboard (rate limits, managed
  pooling, domain restrictions) → "Requires platform access" section
  with its follow-up verification; the executing agent can't touch it.
- Findings that require a user decision (deleting features, switching
  providers) go to "Out of scope", not the plan.
- If a previous `braves-audit-*.md` already exists in the root, mention
  it and ask whether to replace it or generate a new one with a
  different date.

## Full mode output

Short summary: total findings by severity, the 3 most serious ones in
one line each, and the path to the generated runbook. The detail lives
in the file, don't duplicate it in the chat.

## Diff mode

1. **Scope.** Base = the PR's base if there is one
   (`gh pr view --json baseRefName -q .baseRefName`), else the default
   branch (`git symbolic-ref --short refs/remotes/origin/HEAD`, minus
   its `origin/` prefix). Run `git fetch` and compare against
   `origin/<base>` so a stale local branch doesn't drag in upstream
   commits. Changes =
   `git diff $(git merge-base origin/<base> HEAD)` (commits, staged and
   unstaged) plus every untracked file from
   `git ls-files --others --exclude-standard`, read in full. Nothing in
   either → say so and stop.
2. **Two reviewers in parallel**, launched in the same message as
   background `general-purpose` subagents on `opus`. Each brief carries
   the base, the diff command, the list of changed and untracked files,
   and the absolute path of its rubric, to read first and follow:
   - `${CLAUDE_SKILL_DIR}/diff/correctness.md`: bugs, breakage, devex,
     feature-flag leaks, and security via braves-security Pass B
     (pass `${CLAUDE_SKILL_DIR}/../braves-security/SKILL.md` too).
   - `${CLAUDE_SKILL_DIR}/diff/quality.md`: missed simplifications,
     spaghetti growth, files past 1k lines, wrong layer, muddy contracts.
   If the diff touches UI, the quality brief also carries
   `${CLAUDE_SKILL_DIR}/a11y/CHECKLIST.md` and the contrast script
   `${CLAUDE_SKILL_DIR}/a11y/contrast-check.py`, as absolute paths,
   and tells it to audit the UI changes against them.
   Neither reviewer spawns further subagents or edits files.
3. **Synthesize.** Deduplicate across both; a finding both reported
   weighs more. Verify every HIGH yourself against the code before
   reporting it, and settle disagreements with your own judgment.

Severity is about the branch: correctness findings use HIGH / MEDIUM /
LOW, and a change that breaks existing behaviour can be HIGH even if it
isn't security. Quality and `a11y:` findings never exceed MEDIUM.

Output: a one-line verdict (ready / needs changes), then the findings
most severe first, each with `file:line`, the defect and a concrete
failure scenario. Fixes are applied only if the user asks (braves-fix).

## Limits

Audits and reports; does NOT apply the fixes (that's braves-fix, or a
fresh agent with the runbook). Analysis by reading
code only: no exploits, no production data.
