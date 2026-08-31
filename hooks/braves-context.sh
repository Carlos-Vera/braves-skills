#!/bin/sh
# braves-skills context checkpoint: on UserPromptSubmit, read how much of the
# context window this session has burned and, past the configured threshold,
# hand Claude an instruction to offer /braves-save.
# The percentage is read, never computed and never assumed — see below.
#
# It runs on UserPromptSubmit, not on Stop, because of where the output lands.
# A Stop hook can only reach Claude by blocking, and Claude Code renders that
# reason to the user as "Stop hook error" with the whole instruction dumped
# underneath — an internal note, shown raw, labelled as a failure. On
# UserPromptSubmit plain stdout is added to Claude's context and the user sees
# nothing, which is what this was always meant to be.
payload=$(cat)
command -v python3 >/dev/null 2>&1 || exit 0
BRAVES_HOOK_PAYLOAD="$payload" exec python3 - <<'PY'
import json, os, time

try:
    payload = json.loads(os.environ.get("BRAVES_HOOK_PAYLOAD") or "{}")
except ValueError:
    raise SystemExit(0)

cfg = {}
try:
    with open(os.path.expanduser("~/.claude/braves-skills.json")) as f:
        cfg = json.load(f).get("context_checkpoint") or {}
except Exception:
    pass
if cfg.get("enabled") is False:
    raise SystemExit(0)

threshold = int(cfg.get("threshold", 40))
STEP = 15  # re-arm every 15 points, so a declined save still gets nagged later

state_dir = os.path.expanduser("~/.claude/braves-ctx")
os.makedirs(state_dir, mode=0o700, exist_ok=True)

transcript = os.path.expanduser(payload.get("transcript_path") or "")
session = os.path.basename(payload.get("session_id") or transcript or "unknown")

# The percentage is never computed here and never assumed. Claude Code works it
# out itself and passes it ONLY to the statusline command — hook payloads never
# carry it — so the statusline caches it (scripts/statusline-context.sh) and we
# read it back. Exact for any model and any window size.
#
# No cached value means we genuinely do not know how full the window is. Say
# nothing: a hardcoded window is a guess, and a guess fires the checkpoint at
# the wrong time (a 200k assumption nags a 1M session five times too early).
try:
    with open(os.path.join(state_dir, session + ".pct")) as f:
        pct = round(float(f.read().strip()))
except (OSError, ValueError):
    raise SystemExit(0)

if pct < threshold:
    raise SystemExit(0)
level = threshold + STEP * ((pct - threshold) // STEP)
for name in os.listdir(state_dir):  # one file per session; drop the stale ones
    stale = os.path.join(state_dir, name)
    if os.path.getmtime(stale) < time.time() - 7 * 86400:
        os.remove(stale)
flag = os.path.join(state_dir, session)
try:
    if int(open(flag).read()) >= level:
        raise SystemExit(0)
except (OSError, ValueError):
    pass
with open(flag, "w") as f:
    f.write(str(level))

print(f"""\
BRAVES CONTEXT CHECKPOINT — this session is at ~{pct}% of its context window. \
This fires once per {STEP}-point step, so it will not repeat at this level.

This is a system notice riding along with the user's message. They did not \
write it and cannot see it. Judge the moment yourself; do not ask them to \
judge it:
- Answer what the user actually asked, first and in full.
- Mid-operation (an edit half applied, a command still running, a plan just \
approved and not yet started): say nothing about this. The checkpoint fires \
again at the next step.
- Otherwise, at the next clean boundary, tell the user in one or two lines, in \
the `language` from ~/.claude/braves-skills.json, that this is a good point to \
run /braves-save, and why — past this point the earlier detail starts getting \
compacted away and the log loses fidelity.
- Never run /braves-save without the user's explicit consent.
- If tasks remain after the save, follow the braves-save skill's "Step 6: \
Handoff block", which leaves CONTEXTO.md in the project root for the next \
session to pick up.""")
PY
