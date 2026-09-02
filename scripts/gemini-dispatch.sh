#!/bin/sh
# Dispatches a prompt to the Gemini CLI (agy), pinning each project directory
# to its own conversation, and recording every step of the run so it can be
# watched while it is still going (--watch).
#
# agy's --continue/-c means "the most recent conversation, globally" — with
# several projects each running agy from their own Cursor window, -c in
# project A can resume project B's conversation. This script keeps a
# per-project conversation id (captured from agy's stream-json output) under
# $GEMINI_STATE, keyed by the project's absolute path, and resumes with
# --conversation <id> instead — so -c here always means "this project's last
# conversation."
set -eu

# jq parses agy's stream-json: the reply, the conversation id and the step log
# all come out of it.
command -v jq >/dev/null 2>&1 || {
  echo "ERROR: jq is required — macOS: brew install jq | Debian/WSL: apt install jq | Windows: winget install jqlang.jq" >&2
  exit 1
}

AGY=${AGY:-$HOME/.local/bin/agy}
GEMINI_MODEL=${GEMINI_MODEL:-gemini-3.7-flash-medium}
# Whole seconds. agy honours its own --print-timeout — measured at a steady
# 5 poll iterations per second, with 60s and 1m both ending at exactly 300
# polls — so this is not here to compensate for it. It is here because the
# ceiling belongs in one place, in one unit, and because the idle cut below
# needs the same clock. Whole seconds only: a stray "45m" would otherwise
# read as 45 milliseconds. agy gets a slightly shorter deadline so its own
# graceful shutdown normally lands first, which keeps the result event.
GEMINI_TIMEOUT=${GEMINI_TIMEOUT:-900}
case "$GEMINI_TIMEOUT" in
  ''|*[!0-9]*) echo "ERROR: GEMINI_TIMEOUT is whole seconds (got: $GEMINI_TIMEOUT)" >&2; exit 2 ;;
esac
# A dispatch that has not taken a step in this long is not thinking, it is
# waiting on something that will not come back — a dev server, a watch-mode
# test, a command with no output. Cutting it here costs minutes instead of
# the whole ceiling.
GEMINI_IDLE=${GEMINI_IDLE:-300}
case "$GEMINI_IDLE" in
  ''|*[!0-9]*) echo "ERROR: GEMINI_IDLE is whole seconds (got: $GEMINI_IDLE)" >&2; exit 2 ;;
esac

if [ "$GEMINI_TIMEOUT" -gt 15 ]; then
  AGY_TIMEOUT=$(( GEMINI_TIMEOUT - 10 ))
else
  AGY_TIMEOUT=5
fi
GEMINI_STATE=${GEMINI_STATE:-$HOME/.cache/braves-gemini}
GEMINI_HOME=${GEMINI_HOME:-$HOME/.gemini/antigravity-cli}

usage() {
  cat <<'EOF'
Usage:
  gemini-dispatch.sh <project-dir> <prompt>       # new conversation, pinned to that project
  gemini-dispatch.sh -c <project-dir> <prompt>    # continue THAT project's conversation
  gemini-dispatch.sh -y <project-dir> <prompt>    # same, auto-approving every tool
  gemini-dispatch.sh --id <project-dir>           # print the stored conversation id and exit
  gemini-dispatch.sh --watch <project-dir>        # print step by step what the current (or last) run did
  gemini-dispatch.sh --status <project-dir>       # one line for a statusline, or nothing at all

GEMINI_TIMEOUT (default 900) is the hard ceiling in whole seconds; GEMINI_IDLE
(default 300) cuts a dispatch that has stopped taking steps — the shape a stall
has from outside. Both are enforced here, in whole seconds.

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
    -c) MODE="continue"; shift ;;
    -y|--yolo) YOLO=1; shift ;;
    --id) MODE=id; shift ;;
    --watch) MODE=watch; shift ;;
    --status) MODE=status; shift ;;
    *) break ;;
  esac
done

case "$MODE" in
  id|watch|status) [ $# -eq 1 ] || { usage >&2; exit 2; }; DIR=$1 ;;
  *)        [ $# -eq 2 ] || { usage >&2; exit 2; }; DIR=$1; PROMPT=$2 ;;
esac

[ -d "$DIR" ] || { echo "ERROR: not a directory: $DIR" >&2; exit 1; }
ABS_DIR=$(cd "$DIR" && pwd)

mkdir -p "$GEMINI_STATE"
# Per-project state key: the absolute path with `/` and spaces flattened to
# `_`. A leading `_` (every real path starts with `/`) is harmless.
KEY=$(printf '%s' "$ABS_DIR" | tr '/ ' '__')
LOG="$GEMINI_STATE/$KEY.log"
IDFILE="$GEMINI_STATE/$KEY.id"
STREAM="$GEMINI_STATE/$KEY.stream"

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

if [ "$MODE" = "watch" ]; then
  [ -f "$STREAM" ] || { echo "ERROR: no run recorded for $ABS_DIR" >&2; exit 1; }
  # Every tool step of the run: what it called, with which arguments, and how
  # long it took. Each step is streamed twice (ACTIVE, then DONE), so keep the
  # last event per step_index — a step still showing RUNNING is the live one.
  jq -Rrs --arg dir "$ABS_DIR/" '
          split("\n") | map(fromjson? // empty)
          | map(select(.event == "step_update") | .step_update | select(.step_type == "tool"))
          | group_by(.step_index) | map(.[-1]) | .[]
          | [ (if .state == "DONE"
               then (((.duration_seconds // 0) * 10 | round) / 10 | tostring) + "s"
               else "RUNNING" end),
              .tool_name,
              ((.tool_info.parameters // {}) | to_entries
               | map(.value | tostring | ltrimstr($dir))
               | join(" ") | .[0:120]) ]
          | @tsv' "$STREAM"

  # The footer answers the only question worth asking mid-run: is it working
  # or is it stuck? A finished run has a result event; an unfinished one is
  # judged by how long ago the stream last grew.
  RESULT=$(jq -r 'select(.event == "result") | .result.status // empty' "$STREAM" | tail -1)
  if [ -n "$RESULT" ]; then
    printf -- '-- finished: %s\n' "$RESULT"
  else
    NOW=$(date +%s)
    LAST=$(stat -f %m "$STREAM" 2>/dev/null || stat -c %Y "$STREAM" 2>/dev/null || echo "$NOW")
    printf -- '-- still running, last step %ss ago\n' "$((NOW - LAST))"
  fi
  exit 0
fi

if [ "$MODE" = "status" ]; then
  # One line for a statusline: what the live dispatch is doing right now, or
  # nothing at all. It runs on every terminal repaint, so it stays quiet and
  # cheap — no errors, no output once the run is over.
  if [ ! -f "$STREAM" ]; then
    # Dispatches target the repo root; the terminal is often in a subdirectory.
    ROOT=$(git -C "$ABS_DIR" rev-parse --show-toplevel 2>/dev/null || true)
    [ -n "$ROOT" ] && STREAM="$GEMINI_STATE/$(printf '%s' "$ROOT" | tr '/ ' '__').stream"
  fi
  [ -f "$STREAM" ] || exit 0

  NOW=$(date +%s)
  LAST=$(stat -f %m "$STREAM" 2>/dev/null || stat -c %Y "$STREAM" 2>/dev/null || echo 0)
  QUIET=$((NOW - LAST))

  # A finished run is not news, and neither is one whose process died without
  # writing a result. The statusline only carries what is happening now.
  [ "$QUIET" -gt 600 ] && exit 0
  if tail -3 "$STREAM" | grep -q '"event":"result"'; then exit 0; fi

  LABEL=$(jq -Rrs --arg dir "$ABS_DIR/" '
          split("\n") | map(fromjson? // empty)
          | map(select(.event == "step_update") | .step_update | select(.step_type == "tool"))
          | last // empty
          | [ .tool_name,
              ((.tool_info.parameters // {}) | to_entries | map(.value | tostring)
               | join(" ") | split("/") | last | .[0:32]) ]
          | join(" ")' "$STREAM" 2>/dev/null || true)
  [ -n "$LABEL" ] || LABEL="thinking"

  # Tab-separated so the caller colours it without parsing: a run that has been
  # silent this long is stuck, not busy.
  if [ "$QUIET" -ge 90 ]; then
    printf 'slow\t%s %ss\n' "$LABEL" "$QUIET"
  else
    printf 'run\t%s %ss\n' "$LABEL" "$QUIET"
  fi
  exit 0
fi

# agy's stderr goes to its own log rather than to the caller. It is mostly
# glog noise, and more importantly a child that outlives a killed dispatch
# would otherwise hold the caller's pipe open long after the ceiling fired.
# "$@" carries the mode-specific flags; the permission flag is chosen here so
# it stays a single decision, and -y is only ever set from the command line.
run_agy() {
  if [ "$YOLO" = 1 ]; then
    "$AGY" "$@" --dangerously-skip-permissions --output-format stream-json \
      --log-file "$LOG" -p "$PROMPT" --print-timeout "${AGY_TIMEOUT}s"
  else
    "$AGY" "$@" --mode accept-edits --output-format stream-json \
      --log-file "$LOG" -p "$PROMPT" --print-timeout "${AGY_TIMEOUT}s"
  fi
}

# One stream per project: the record is of the run in progress, not a pile of
# every run this directory ever had.
: > "$STREAM"

STATUS=0
if [ "$MODE" = "continue" ]; then
  [ -f "$IDFILE" ] || {
    echo "ERROR: no conversation recorded for $ABS_DIR — dispatch once without -c first" >&2
    exit 1
  }
  ID=$(cat "$IDFILE")
  run_agy --conversation "$ID" --add-dir "$ABS_DIR" --model "$GEMINI_MODEL" > "$STREAM" 2>>"$LOG" &
else
  run_agy --add-dir "$ABS_DIR" --model "$GEMINI_MODEL" > "$STREAM" 2>>"$LOG" &
fi
AGY_PID=$!

# The ceiling, enforced here rather than trusted to agy. Watching from the
# foreground rather than from a background timer: a backgrounded watchdog holds
# the caller's stdout pipe open and its orphaned sleep keeps `$(...)` blocked
# long after agy is done.
DEADLINE=$(( $(date +%s) + GEMINI_TIMEOUT ))
while kill -0 "$AGY_PID" 2>/dev/null; do
  NOW=$(date +%s)
  # The stream grows with every step, so its mtime is the last sign of life.
  QUIET_SINCE=$(stat -f %m "$STREAM" 2>/dev/null || stat -c %Y "$STREAM" 2>/dev/null || echo "$NOW")
  if [ "$NOW" -ge "$DEADLINE" ] || [ "$(( NOW - QUIET_SINCE ))" -ge "$GEMINI_IDLE" ]; then
    # Killed, not abandoned: the stream stays on disk, so --watch still shows
    # which step it died on.
    kill "$AGY_PID" 2>/dev/null || true
    pkill -P "$AGY_PID" 2>/dev/null || true
    break
  fi
  sleep 1
done
wait "$AGY_PID" || STATUS=$?

# stdout stays what it was before the stream existed: Gemini's reply, nothing
# else. Callers read the diff, not the event log.
jq -r 'select(.event == "result") | .result.response // empty' "$STREAM"

# Capture the conversation id regardless of agy's exit status — a failed run
# still announces it in the init event if the conversation started. Never let
# a failed (or empty) extraction mask agy's own exit code.
NEW_ID=$(jq -r 'select(.event == "init") | .conversation_id // empty' "$STREAM" | tail -1)
if [ -n "$NEW_ID" ]; then
  printf '%s\n' "$NEW_ID" > "$IDFILE"
fi

exit "$STATUS"
