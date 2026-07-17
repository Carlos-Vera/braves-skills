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
INST="$INST_DIR/$ALIAS.json"
[ -f "$INST" ] || { echo "ERROR: instance file $INST not found." >&2; exit 1; }

N8N_API_URL=$(python3 -c "import json; print(json.load(open('$INST'))['N8N_API_URL'])")
N8N_API_KEY=$(python3 -c "import json; print(json.load(open('$INST'))['N8N_API_KEY'])")
export N8N_API_URL N8N_API_KEY MCP_MODE=stdio

if command -v pnpm >/dev/null 2>&1; then
  exec pnpm dlx n8n-mcp
else
  exec npx -y n8n-mcp
fi
