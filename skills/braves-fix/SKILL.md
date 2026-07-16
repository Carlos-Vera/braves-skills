---
name: braves-fix
description: >
  Use when the user says "/braves-fix", "arregla este bug" (fix this
  bug), "no funciona" (it doesn't work), "sigue fallando" (it keeps
  failing), "ejecuta el audit" (run the audit), or when a
  braves-audit-*.md exists in the project root waiting to be run. Also
  when a previous fix was "already fixed" and the bug came back.
license: MIT
---

# Braves Fix

Speak to the user in the `language` set in `~/.claude/braves-skills.json`;
if unset, mirror the language the user writes in.

Fixes bugs and runs audit runbooks. The rule that governs everything:
**"fixed" without evidence doesn't exist.** This skill exists because
models declare victory too early.

## Runbook mode

If a `braves-audit-*.md` exists in the root (if there are several, the
most recent one) and the user doesn't bring a concrete bug:

1. Read the ENTIRE runbook before touching anything.
2. Run the steps in order; after each one, run its **Verification** and
   mark `[x]` in the file only if the result matches.
3. Verification fails → stop at that step, fix it, re-verify. Don't move
   forward while red.
4. At the end, run the full **Final verification** and report the table
   step → status with evidence (command + actual output).

## Bug mode

1. **Reproduce BEFORE touching code.** See the failure with your own
   eyes (command, curl, browser flow). If you can't reproduce it, you
   can't verify the fix: instrument (logs, real inputs) until you
   reproduce it, or say so honestly.
2. **Read the full error.** The message, the stack, the line. Don't
   guess from the title.
3. **Root cause, not symptom.** Trace back to the real origin. Patching
   where it hurts instead of where it's born means the bug comes back
   next week wearing a different disguise.
4. **Minimal fix** in the right place. No opportunistic refactors in the
   same diff.
5. **Reproduce AFTER.** The same flow from step 1, now green. Paste the
   evidence in the response.
6. **Look for the pattern.** Does the same bug live in other files?
   (`rg` for the pattern). List them even if they don't get fixed today.
7. **Minimal regression test** that fails if the bug comes back. One,
   small, no new frameworks.

## Anti-"it's fine now"

| Excuse | Reality |
|--------|---------|
| "The build passes" | The build doesn't run your flow. Run the real flow. |
| "It should work now" | "Should" isn't evidence. Show the output. |
| "The tests pass" | Did any test fail because of THIS bug? If not, they don't test the fix. |
| "I changed the line that caused the error" | Did you see it fail before and pass after? If not, you don't know. |
| "I can't reproduce it, but the fix makes sense" | Not reproduced = not verified. Tell the user exactly that. |
| "It's a trivial change" | "Trivial" changes are 50% of rollbacks. Verify anyway. |

## Red flags — stop and verify

You're about to write "done", "fixed", "it's fine now", "should work",
and your response has NO command with its output demonstrating it. The
word "done" requires evidence attached in the same message. If
verification is impossible (missing access, missing a secret, only
reproduces in prod), say so explicitly: "change applied, NOT verified
because X — verify it with `<command>`".

## Limits

Fixes what's diagnosed; not a re-architecture (that goes through
fable-plan + braves-opinion). Three failed attempts on the same bug →
stop and rethink the diagnosis with the user instead of continuing to
mutate the code.
