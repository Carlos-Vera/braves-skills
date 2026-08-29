#!/bin/sh
# braves-skills handoff: hand the next session the block braves-save wrote for
# it, so the user stops carrying it across conversations by hand.
#
# Served ONCE, and only in the project the session actually opened in — a
# handoff pasted into the wrong repo is worse than no handoff at all.
payload=$(cat)
command -v python3 >/dev/null 2>&1 || exit 0
BRAVES_HOOK_PAYLOAD="$payload" exec python3 - <<'PY'
import json, os, time

try:
    payload = json.loads(os.environ.get("BRAVES_HOOK_PAYLOAD") or "{}")
except ValueError:
    raise SystemExit(0)

cwd = os.path.normpath(payload.get("cwd") or os.getcwd())

try:
    with open(os.path.expanduser("~/.claude/braves-skills.json")) as f:
        projects = json.load(f).get("projects") or {}
except Exception:
    raise SystemExit(0)

# Same rule as braves-save Step 0: a path nested inside a registered root
# inherits its entry, so the longest matching prefix wins (a monorepo package
# resumes the monorepo's handoff).
entry = None
match = ""
for root, data in projects.items():
    r = os.path.normpath(os.path.expanduser(root))
    if (cwd == r or cwd.startswith(r + os.sep)) and len(r) > len(match):
        entry, match = data, r

tag = (entry or {}).get("tag")
if not tag:
    raise SystemExit(0)

path = os.path.expanduser("~/.claude/sessions/.handoff-%s.md" % tag)
try:
    block = open(path).read().strip()
    age = time.time() - os.path.getmtime(path)
except OSError:
    raise SystemExit(0)
if not block:
    raise SystemExit(0)

# Consume BEFORE printing: two sessions opened at once in the same project must
# not both pick it up, and a crash after the rename loses nothing — the same
# state is in the session log the block itself points at.
try:
    os.replace(path, path[:-3] + ".consumed.md")
except OSError:
    raise SystemExit(0)

hours = age / 3600
when = "just now" if age < 60 else "%d minutes ago" % (age / 60) if hours < 1 else (
    "%d hours ago" % hours if hours < 48 else "%d days ago" % (hours / 24)
)

print(
    "BRAVES HANDOFF (%s) — the previous session closed with /braves-save and left "
    "this for you, written %s. Read it as the user's own opening message and pick "
    "the work up from there; do not ask them to repeat it. Served once, it will "
    "not appear again.\n\nJudge the age yourself: if it is old enough that the "
    "repo has likely moved on, verify the state before acting on it, and say so "
    "in one line.\n\n%s" % (tag, when, block)
)
PY
