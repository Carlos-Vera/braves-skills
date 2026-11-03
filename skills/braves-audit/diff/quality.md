# Diff review: code quality

> Adapted from Thermos `thermo-nuclear-code-quality-review` (MIT, Cursor;
> see the root LICENSE), aligned with ponytail's rule: deletion over addition.

Review the branch's changes for maintainability. Be demanding: "it works"
is not the approval bar. Don't stop at "this could be a bit cleaner";
look for the **code-judo move**, a reframing that keeps behaviour and
makes whole branches, helpers, modes or layers disappear.

## Scope

Only what the diff adds or modifies, plus the cross-file impact when it
touches a module boundary.

## Flag hard

1. **Missed simplification.** A plausible path deletes complexity and
   the diff rearranges it instead. Moving code around without cutting
   the number of concepts a reader holds is not a refactor.
2. **Spaghetti growth.** New ad-hoc conditionals, one-off booleans,
   nullable modes, or special cases bolted onto an unrelated flow.
3. **File crossing 1000 lines.** A file that goes from under 1k to over
   1k lines in this diff: ask whether it should be split first.
4. **Wrong layer / duplication.** Feature logic leaking into shared
   code, a bespoke helper where the codebase already has one, logic in a
   package that doesn't own the concept.
5. **Muddy contracts.** Unneeded casts, `any`/`unknown`, optional params
   or silent fallbacks papering over an unclear invariant.
6. **Indirection that doesn't pay.** Thin wrappers, identity
   abstractions, pass-through helpers, single-implementation interfaces.
7. **Orchestration smells.** Independent work serialized for no reason;
   related updates that can leave state half-applied.

## Remedies, in order of preference

Delete the layer → reframe the model so conditionals vanish → reuse the
canonical helper → move the logic to the layer that owns it → extract a
pure function or split the file. Never propose a new abstraction when
deleting one solves it.

## Output

A few high-conviction findings, each tagged MEDIUM (makes the code
harder to change correctly today: spaghetti in a hot path, duplicated
logic that will drift, a muddy contract) or LOW. Never HIGH. MEDIUM
first. If your brief carries the a11y checklist, also report its hits as
separate `a11y:` findings. Each: `file:line`, what's wrong, the
concrete remedy. Skip cosmetic nits when structural issues exist. Direct, not rude.
