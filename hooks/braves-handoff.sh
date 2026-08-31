#!/bin/sh
# braves-skills handoff: hand the next session the CONTEXTO.md that braves-save
# left in the project root, so the user stops carrying it across conversations
# by hand.
#
# The file lives in the repo on purpose: the user sees it, misses it when it is
# gone, and it moves with the project instead of being orphaned by a path key
# under ~/.claude/projects. braves-save keeps it out of version control.
#
# Served once per write, and only in the project the session actually opened in
# — a handoff pasted into the wrong repo is worse than no handoff at all.
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
root = ""
for candidate, data in projects.items():
    r = os.path.normpath(os.path.expanduser(candidate))
    if (cwd == r or cwd.startswith(r + os.sep)) and len(r) > len(root):
        entry, root = data, r

tag = (entry or {}).get("tag")
if not tag:
    # Not registered. The file travels with the project but the registry is
    # still keyed by absolute path, so a moved repo lands here with its handoff
    # sitting right there. Point at it in one line and never print it: an
    # unregistered repo is one the user has not vouched for, and its CONTEXTO.md
    # is text a clone could have brought in.
    d = cwd
    while not os.path.exists(os.path.join(d, ".git")):
        parent = os.path.dirname(d)
        if parent == d:
            raise SystemExit(0)
        d = parent
    try:
        if os.path.getsize(os.path.join(d, "CONTEXTO.md")) == 0:
            raise SystemExit(0)
    except OSError:
        raise SystemExit(0)
    print(
        "BRAVES HANDOFF — %s holds a CONTEXTO.md from an earlier session, but "
        "this project is not registered in braves-skills.json, so the handoff "
        "cannot be served (the folder was most likely moved). Tell the user in "
        "one line and offer to register it with /braves-setup; do not read the "
        "file out to them unless they ask for it." % d
    )
    raise SystemExit(0)

path = os.path.join(root, "CONTEXTO.md")
try:
    block = open(path).read().strip()
    written = os.path.getmtime(path)
except OSError:
    raise SystemExit(0)
if not block:
    raise SystemExit(0)

# The file stays put — the user is meant to keep seeing it — so "already served"
# is a stamp outside the repo instead of a rename. A stamp newer than the file
# means this block was already handed to a session; braves-save rewriting
# CONTEXTO.md makes the file newer again, which re-arms it.
stamp = os.path.expanduser("~/.claude/sessions/.contexto-served-%s" % tag)
try:
    if os.path.getmtime(stamp) >= written:
        raise SystemExit(0)
except OSError:
    pass

# Stamp BEFORE printing: two sessions opened at once in the same project must
# not both pick it up, and a crash after stamping loses nothing — CONTEXTO.md
# is still there to read.
try:
    os.makedirs(os.path.dirname(stamp), exist_ok=True)
    open(stamp, "w").close()
    # Stamp with the file's own mtime, not with now: the stamp answers "which
    # write did I serve", and a clock that hands the file a timestamp slightly
    # ahead of now would otherwise leave the stamp behind it forever, replaying
    # the same block on every single start.
    os.utime(stamp, (written, written))
except OSError:
    raise SystemExit(0)

age = time.time() - written
hours = age / 3600
when = "just now" if age < 60 else "%d minutes ago" % (age / 60) if hours < 1 else (
    "%d hours ago" % hours if hours < 48 else "%d days ago" % (hours / 24)
)

print(
    "BRAVES HANDOFF (%s) — the previous session closed with /braves-save and left "
    "this for you in CONTEXTO.md, written %s. Read it as the user's own opening "
    "message and pick the work up from there; do not ask them to repeat it. It "
    "will not be served again until the next /braves-save rewrites it.\n\nJudge "
    "the age yourself: if it is old enough that the repo has likely moved on, "
    "verify the state before acting on it, and say so in one line.\n\n%s"
    % (tag, when, block)
)
PY
