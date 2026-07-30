#!/bin/sh
# Cache `context_window.used_percentage` for hooks/braves-context.sh.
#
# Claude Code computes that percentage itself and passes it ONLY to the
# statusLine command — hook payloads never carry it. The statusline is
# therefore the one process that can hand the real number over, which is what
# lets the checkpoint work on any model and any window size without hardcoding
# one. Without this cache the checkpoint stays silent, by design: it will not
# guess a window size.
#
# Reads the statusline JSON on stdin and prints a minimal status line, so it is
# usable as a whole statusLine on its own rather than leaving the bar blank.
#
#   As the whole statusline:  "command": "sh <plugin>/scripts/statusline-context.sh"
#   Alongside an existing one, after it has read stdin into "$input":
#       printf '%s' "$input" | sh <plugin>/scripts/statusline-context.sh >/dev/null
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

if sid and pct is not None:
    d = os.path.expanduser("~/.claude/braves-ctx")
    os.makedirs(d, mode=0o700, exist_ok=True)
    # basename: session_id lands in a path, keep it from walking anywhere.
    with open(os.path.join(d, os.path.basename(str(sid)) + ".pct"), "w") as f:
        f.write(str(pct))

# Minimal bar. Anyone who wants more writes their own statusline and pipes the
# payload through this script for the cache alone.
model = (p.get("model") or {}).get("display_name")
folder = os.path.basename((p.get("workspace") or {}).get("current_dir") or "")
parts = [x for x in (model, folder) if x]
if pct is not None:
    parts.append(f"{int(float(pct))}% ctx")
if parts:
    print(" · ".join(parts))
PY
