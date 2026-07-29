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
# at most once a day, in the background, and only ever moves forward.
VER_FILE="$INST_DIR/mcp-version.json"
STAMP="$INST_DIR/.mcp-version-check"
NOTICE="$INST_DIR/.mcp-update-notice"
DEFAULT_VER=2.67.1

[ -f "$VER_FILE" ] || printf '{"version":"%s"}\n' "$DEFAULT_VER" > "$VER_FILE"
MCP_VER=$(read_json "$VER_FILE" version 2>/dev/null) || MCP_VER=""
[ -n "$MCP_VER" ] || MCP_VER="$DEFAULT_VER"

# Report an upgrade the previous check applied. stderr only: stdout is the MCP
# stdio channel and any stray byte there corrupts the protocol.
if [ -s "$NOTICE" ]; then
  cat "$NOTICE" >&2
  rm -f "$NOTICE"
fi

# Backgrounded: an MCP launch must not wait on the npm registry.
if [ -z "$(find "$STAMP" -mtime -1 2>/dev/null)" ]; then
  touch "$STAMP"
  (
    latest=$(npm view n8n-mcp version 2>/dev/null | tr -d '[:space:]')
    # Registry unreachable or answer isn't a bare version: keep the current pin.
    case "$latest" in ''|*[!0-9.]*) exit 0;; esac
    if [ "$latest" != "$MCP_VER" ] &&
       [ "$(printf '%s\n%s\n' "$MCP_VER" "$latest" | sort -V | tail -1)" = "$latest" ]; then
      printf '{"version":"%s"}\n' "$latest" > "$VER_FILE"
      printf 'n8n-mcp: pin moved %s -> %s (npm registry). Active from this launch.\n' \
        "$MCP_VER" "$latest" > "$NOTICE"
    fi
  ) >/dev/null 2>&1 &
fi

MCP_PKG="n8n-mcp@$MCP_VER"
if command -v pnpm >/dev/null 2>&1; then
  exec pnpm dlx "$MCP_PKG"
else
  exec npx -y "$MCP_PKG"
fi
