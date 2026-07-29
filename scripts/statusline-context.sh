#!/bin/sh
# Cache `context_window.used_percentage` for hooks/braves-context.sh.
#
# Claude Code computes that percentage itself and passes it ONLY to the
# statusLine command — hook payloads never carry it. The statusline is
# therefore the one process that can hand the real number over, which is what
# lets the checkpoint work on any model and any window size without hardcoding
# one. Without this, braves-context.sh falls back to estimating from the
# transcript against a configured window.
#
# Reads the statusline JSON on stdin. Prints nothing, so it is safe to chain.
#
#   As the whole statusline:  "command": "sh <plugin>/scripts/statusline-context.sh"
#   Alongside an existing one, after it has read stdin into "$input":
#       printf '%s' "$input" | sh <plugin>/scripts/statusline-context.sh
set -eu
payload=$(cat)
command -v python3 >/dev/null 2>&1 || exit 0
BRAVES_SL_PAYLOAD="$payload" exec python3 - <<'PY'
import json, os

try:
    p = json.loads(os.environ.get("BRAVES_SL_PAYLOAD") or "{}")
except ValueError:
    raise SystemExit(0)

sid = p.get("session_id")
pct = (p.get("context_window") or {}).get("used_percentage")
if not sid or pct is None:
    raise SystemExit(0)

d = os.path.expanduser("~/.claude/braves-ctx")
os.makedirs(d, mode=0o700, exist_ok=True)
# basename: session_id lands in a path, keep it from walking anywhere.
with open(os.path.join(d, os.path.basename(str(sid)) + ".pct"), "w") as f:
    f.write(str(pct))
PY
