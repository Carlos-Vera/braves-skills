#!/bin/sh
# n8n-mcp launcher with named-instance switching.
# Reads the active instance alias from ~/.claude/n8n-instances/active,
# loads that instance's credentials and execs n8n-mcp with them.
# Switching instance = rewrite the `active` file + reconnect the MCP
# (/mcp -> reconnect n8n-mcp). No Claude Code restart needed.
set -eu

INST_DIR="$HOME/.claude/n8n-instances"
ACTIVE_FILE="$INST_DIR/active"

[ -f "$ACTIVE_FILE" ] || { echo "ERROR: $ACTIVE_FILE not found. Write an instance alias into it." >&2; exit 1; }
ALIAS=$(tr -d '[:space:]' < "$ACTIVE_FILE")
# The alias becomes a path segment: keep it to a flat, safe name so `../` can't
# walk out of $INST_DIR, and so it can't break out of the reader below.
case "$ALIAS" in
  *[!A-Za-z0-9_-]*|"") echo "ERROR: invalid alias in $ACTIVE_FILE (allowed: A-Z a-z 0-9 _ -)." >&2; exit 1;;
esac
INST="$INST_DIR/$ALIAS.json"
[ -f "$INST" ] || { echo "ERROR: instance file $INST not found." >&2; exit 1; }

# Path goes through argv, never interpolated into the Python source string.
read_json() { python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))[sys.argv[2]])' "$1" "$2"; }
N8N_API_URL=$(read_json "$INST" N8N_API_URL)
N8N_API_KEY=$(read_json "$INST" N8N_API_KEY)
export N8N_API_URL N8N_API_KEY MCP_MODE=stdio

# --- MCP version -------------------------------------------------------------
# The version is pinned in a JSON the user owns, never floating `latest`: this
# process is exec'd with N8N_API_KEY already in its environment, so `latest`
# would hand the live key to whatever was published today. The pin is refreshed
# at most once a day, in the background, only ever moves forward, and only to a
# release that has been public for at least 24 h: a hijacked publish is usually
# caught and pulled within that window, before it ever sees the key.
VER_FILE="$INST_DIR/mcp-version.json"
STAMP="$INST_DIR/.mcp-version-check"
NOTICE="$INST_DIR/.mcp-update-notice"
DEFAULT_VER=2.102.0
MIN_AGE_HOURS=24

# MCP servers start with a bare PATH that often lacks pnpm's global bin dir.
for d in "${PNPM_HOME:-}" "$HOME/Library/pnpm" "$HOME/.local/share/pnpm"; do
  [ -n "$d" ] && PATH="$d/bin:$d:$PATH"
done
command -v pnpm >/dev/null 2>&1 || { echo "ERROR: pnpm not found in PATH (install it with corepack)." >&2; exit 1; }

[ -f "$VER_FILE" ] || printf '{"version":"%s"}\n' "$DEFAULT_VER" > "$VER_FILE"
MCP_VER=$(read_json "$VER_FILE" version 2>/dev/null) || MCP_VER=""
[ -n "$MCP_VER" ] || MCP_VER="$DEFAULT_VER"

# Report an upgrade the previous check applied. stderr only: stdout is the MCP
# stdio channel and any stray byte there corrupts the protocol.
if [ -s "$NOTICE" ]; then
  cat "$NOTICE" >&2
  rm -f "$NOTICE"
fi

# Newest stable x.y.z published at least MIN_AGE_HOURS ago, from the registry's
# publish times on stdin. Prints nothing if none qualifies or the input is bad.
newest_aged() {
  python3 -c '
import json, sys, datetime as dt
try:
    times = json.load(sys.stdin)
except ValueError:
    sys.exit(0)
cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=float(sys.argv[1]))
ok = []
for ver, ts in times.items():
    parts = ver.split(".")
    if len(parts) != 3 or not all(p.isdigit() for p in parts):
        continue  # created/modified keys, prereleases
    if dt.datetime.fromisoformat(ts.replace("Z", "+00:00")) <= cutoff:
        ok.append(tuple(map(int, parts)))
if ok:
    print(".".join(map(str, max(ok))))
' "$1"
}

# Backgrounded: an MCP launch must not wait on the registry.
if [ -z "$(find "$STAMP" -mtime -1 2>/dev/null)" ]; then
  touch "$STAMP"
  (
    target=$(pnpm view n8n-mcp time --json 2>/dev/null | newest_aged "$MIN_AGE_HOURS")
    case "$target" in ''|*[!0-9.]*) exit 0;; esac
    if [ "$target" != "$MCP_VER" ] &&
       [ "$(printf '%s\n%s\n' "$MCP_VER" "$target" | sort -V | tail -1)" = "$target" ]; then
      printf '{"version":"%s"}\n' "$target" > "$VER_FILE"
      printf 'n8n-mcp: pin moved %s -> %s (public for %sh+). Active from this launch.\n' \
        "$MCP_VER" "$target" "$MIN_AGE_HOURS" > "$NOTICE"
    fi
  ) >/dev/null 2>&1 &
fi

exec pnpm dlx "n8n-mcp@$MCP_VER"
