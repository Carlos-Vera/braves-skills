#!/bin/sh
# Dispatches a prompt to the Gemini CLI (agy), pinning each project directory
# to its own conversation.
#
# agy's --continue/-c means "the most recent conversation, globally" — with
# several projects each running agy from their own Cursor window, -c in
# project A can resume project B's conversation. This script keeps a
# per-project conversation id (captured from agy's --log-file output) under
# $GEMINI_STATE, keyed by the project's absolute path, and resumes with
# --conversation <id> instead — so -c here always means "this project's last
# conversation."
set -eu

AGY=${AGY:-$HOME/.local/bin/agy}
GEMINI_MODEL=${GEMINI_MODEL:-gemini-3.7-flash-medium}
GEMINI_TIMEOUT=${GEMINI_TIMEOUT:-15m}
GEMINI_STATE=${GEMINI_STATE:-$HOME/.cache/braves-gemini}
GEMINI_HOME=${GEMINI_HOME:-$HOME/.gemini/antigravity-cli}

usage() {
  cat <<'EOF'
Usage:
  gemini-dispatch.sh <project-dir> <prompt>       # new conversation, pinned to that project
  gemini-dispatch.sh -c <project-dir> <prompt>    # continue THAT project's conversation
  gemini-dispatch.sh -y <project-dir> <prompt>    # same, auto-approving every tool
  gemini-dispatch.sh --id <project-dir>           # print the stored conversation id and exit

-c and -y combine in either order. Without -y only file edits are approved:
a task that needs shell commands (npm, mkdir, tests) dies half-done with
"a tool required the command permission that headless mode cannot prompt for".
EOF
}

MODE=new
YOLO=0
while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    -c) MODE=continue; shift ;;
    -y|--yolo) YOLO=1; shift ;;
    --id) MODE=id; shift ;;
    *) break ;;
  esac
done

if [ "$MODE" = "id" ]; then
  [ $# -eq 1 ] || { usage >&2; exit 2; }
  DIR=$1
else
  [ $# -eq 2 ] || { usage >&2; exit 2; }
  DIR=$1
  PROMPT=$2
fi

[ -d "$DIR" ] || { echo "ERROR: not a directory: $DIR" >&2; exit 1; }
ABS_DIR=$(cd "$DIR" && pwd)

mkdir -p "$GEMINI_STATE"
# Per-project state key: the absolute path with `/` and spaces flattened to
# `_`. A leading `_` (every real path starts with `/`) is harmless.
KEY=$(printf '%s' "$ABS_DIR" | tr '/ ' '__')
LOG="$GEMINI_STATE/$KEY.log"
IDFILE="$GEMINI_STATE/$KEY.id"

if [ "$MODE" = "id" ]; then
  [ -f "$IDFILE" ] || { echo "ERROR: no conversation recorded for $ABS_DIR" >&2; exit 1; }
  ID=$(cat "$IDFILE")
  # agy titles each conversation for itself and parks it in annotations/.
  # A bare uuid says nothing about what is pinned here, so show the title
  # when it exists. Tab-separated: `--id <dir> | cut -f1` still yields the id.
  TITLE=$(sed -n 's/.*title:"\([^"]*\)".*/\1/p' "$GEMINI_HOME/annotations/$ID.pbtxt" 2>/dev/null | head -1)
  if [ -n "$TITLE" ]; then
    printf '%s\t%s\n' "$ID" "$TITLE"
  else
    printf '%s\n' "$ID"
  fi
  exit 0
fi

# "$@" carries the mode-specific flags; the permission flag is chosen here so
# it stays a single decision, and -y is only ever set from the command line.
run_agy() {
  if [ "$YOLO" = 1 ]; then
    "$AGY" "$@" --dangerously-skip-permissions \
      --log-file "$LOG" -p "$PROMPT" --print-timeout "$GEMINI_TIMEOUT"
  else
    "$AGY" "$@" --mode accept-edits \
      --log-file "$LOG" -p "$PROMPT" --print-timeout "$GEMINI_TIMEOUT"
  fi
}

STATUS=0
if [ "$MODE" = "continue" ]; then
  [ -f "$IDFILE" ] || {
    echo "ERROR: no conversation recorded for $ABS_DIR — dispatch once without -c first" >&2
    exit 1
  }
  ID=$(cat "$IDFILE")
  run_agy --conversation "$ID" --add-dir "$ABS_DIR" --model "$GEMINI_MODEL" || STATUS=$?
else
  run_agy --add-dir "$ABS_DIR" --model "$GEMINI_MODEL" || STATUS=$?
fi

# Capture the conversation id regardless of agy's exit status — a failed run
# still logs the id if the conversation started. Never let a failed (or
# empty) extraction mask agy's own exit code.
NEW_ID=$(grep -oE 'conversation update stream for [0-9a-f-]{36}' "$LOG" 2>/dev/null | tail -1 | awk '{print $NF}')
if [ -n "$NEW_ID" ]; then
  printf '%s\n' "$NEW_ID" > "$IDFILE"
fi

exit "$STATUS"
