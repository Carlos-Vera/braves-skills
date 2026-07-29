#!/bin/sh
# braves-skills context checkpoint: on Stop, estimate how much of the context
# window this session has burned and, past the configured threshold, hand Claude
# an instruction to offer /braves-save (plus a handoff block if work remains).
payload=$(cat)
command -v python3 >/dev/null 2>&1 || exit 0
BRAVES_HOOK_PAYLOAD="$payload" exec python3 - <<'PY'
import json, os, time

try:
    payload = json.loads(os.environ.get("BRAVES_HOOK_PAYLOAD") or "{}")
except ValueError:
    raise SystemExit(0)
if payload.get("stop_hook_active"):  # already resumed by a Stop hook: never chain
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
# ponytail: 200k is every current Claude Code model; set "window" for the 1M betas.
window = int(cfg.get("window", 200000))
STEP = 15  # re-arm every 15 points, so a declined save still gets nagged later

transcript = os.path.expanduser(payload.get("transcript_path") or "")
used = 0
try:
    with open(transcript) as f:
        for line in f:
            try:
                entry = json.loads(line)
            except ValueError:
                continue
            if entry.get("type") != "assistant" or entry.get("isSidechain"):
                continue
            usage = (entry.get("message") or {}).get("usage") or {}
            if "input_tokens" in usage:
                # last assistant turn: prompt + both caches is what the window holds
                used = (usage.get("input_tokens", 0)
                        + usage.get("cache_read_input_tokens", 0)
                        + usage.get("cache_creation_input_tokens", 0)
                        + usage.get("output_tokens", 0))
except OSError:
    raise SystemExit(0)

pct = round(100 * used / window)
if pct < threshold:
    raise SystemExit(0)
level = threshold + STEP * ((pct - threshold) // STEP)

state_dir = os.path.expanduser("~/.claude/braves-ctx")
os.makedirs(state_dir, mode=0o700, exist_ok=True)
for name in os.listdir(state_dir):  # one file per session; drop the stale ones
    stale = os.path.join(state_dir, name)
    if os.path.getmtime(stale) < time.time() - 7 * 86400:
        os.remove(stale)
flag = os.path.join(state_dir, os.path.basename(
    payload.get("session_id") or transcript or "unknown"))
try:
    if int(open(flag).read()) >= level:
        raise SystemExit(0)
except (OSError, ValueError):
    pass
with open(flag, "w") as f:
    f.write(str(level))

print(json.dumps({"decision": "block", "reason": f"""\
BRAVES CONTEXT CHECKPOINT — this session is at ~{pct}% of its context window \
(~{used:,} of {window:,} tokens). This fires once per {STEP}-point step, so it \
will not repeat at this level.

Judge the moment yourself; do not ask the user whether to judge it:
- Mid-operation (an edit half applied, a command still running, a plan just \
approved and not yet started): say nothing about this, finish the operation. \
The checkpoint fires again at the next step.
- Otherwise: stop here and tell the user in one or two lines, in the `language` \
from ~/.claude/braves-skills.json, that this is a good point to run \
/braves-save, and why — past this point the earlier detail starts getting \
compacted away and the log loses fidelity.
- Never run /braves-save without the user's explicit consent.
- If tasks remain after the save, follow the braves-save skill's "Step 6: \
Handoff block" and give the user the copy-paste block that resumes the work in \
a fresh conversation."""}))
PY
