#!/bin/sh
# braves-skills SubagentStart hook: the parent session's context never reaches a
# subagent, so every delegated agent starts blind to the house rules and hands
# back work that has to be redone. Inject the short version into each one.
command -v python3 >/dev/null 2>&1 || exit 0
exec python3 - <<'PY'
import json, os

cfg = {}
try:
    with open(os.path.expanduser("~/.claude/braves-skills.json")) as f:
        cfg = json.load(f)
except Exception:
    pass
if (cfg.get("subagent_rules") or {}).get("enabled") is False:
    raise SystemExit(0)

rules = """BRAVES SKILLS — house rules for this subagent. The parent session's \
context does not reach you, so these are not optional background:

- Artifacts in English: code, comments, docs, commit messages and UI strings, \
unless the project already uses another language. Whatever persona or language \
the parent conversation uses stops at the artifact.
- Smallest thing that works: stdlib and native platform features before \
dependencies, no abstraction with a single caller, no scaffolding for a future \
that has not arrived. Mark a deliberate shortcut with a `ponytail:` comment \
naming its ceiling.
- Never write a client's or third party's name into any file, example, log or \
commit — use neutral placeholders. This is a privacy rule, not a style one.
- Modern tooling when shelling out: `rg` over grep, `fd` over find, `bat` over \
cat, `pnpm` over npm.
- Done means verified: build it, run the tests, or exercise the change before \
reporting success. Report what actually happened — including what failed, what \
you skipped, and what you could not check."""

signature = cfg.get("commit_signature")
if signature:
    rules += "\n- If you commit: conventional commits, and this footer verbatim:\n"
    rules += "\n".join("    " + line for line in signature.splitlines())
if cfg.get("coauthor_ai") is False:
    rules += "\n- Never add a `Co-Authored-By` line for an AI, or mention Claude/AI in a commit."

print(json.dumps({"hookSpecificOutput": {
    "hookEventName": "SubagentStart",
    "additionalContext": rules,
}}))
PY
