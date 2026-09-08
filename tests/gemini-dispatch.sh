#!/bin/sh
# Behaviour tests for scripts/gemini-dispatch.sh.
#
# Never call the real agy or the network: every case points AGY at a stub
# written into a throwaway temp dir, and GEMINI_STATE at a throwaway state
# dir. The stub records its own argv and prints agy's stream-json — an init
# event carrying a known UUID, one tool step and a result — enough to
# exercise the dispatch/continue/id/watch logic without ever touching Gemini.

ROOT=$(cd "$(dirname "$0")/.." && pwd)
SCRIPT="$ROOT/scripts/gemini-dispatch.sh"
PASSED=0
FAILED=0

pass() { printf 'ok   %s\n' "$1"; PASSED=$((PASSED + 1)); }
fail() { printf 'FAIL %s\n     %s\n' "$1" "$2"; FAILED=$((FAILED + 1)); }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# Mirrors the script's own state-key derivation, so a test can predict which
# .log/.id files a dispatch will touch.
state_key() { printf '%s' "$1" | tr '/ ' '__'; }

# Stub for agy. Records argv (one per line) to $STUB_ARGS_FILE, prints a
# stream-json run carrying $STUB_UUID and one tool step, and exits 3 if
# MAGIC_FAIL is anywhere in its argv — the hook the failure-exit-code test uses.
STUB="$TMP/agy-stub.sh"
cat > "$STUB" <<'EOF'
#!/bin/sh
: > "$STUB_ARGS_FILE"
want_fail=0
want_hang=0
want_idle=0
for a in "$@"; do
  printf '%s\n' "$a" >> "$STUB_ARGS_FILE"
  [ "$a" = "MAGIC_FAIL" ] && want_fail=1
  [ "$a" = "MAGIC_HANG" ] && want_hang=1
  [ "$a" = "MAGIC_IDLE" ] && want_idle=1
done
[ "$want_hang" -eq 1 ] && sleep 60
# Shapes copied verbatim from a real agy run — conversation_id sits at the top
# level of init, not inside it. Invent them and the tests pass while the script
# reads the wrong field.
printf '{"event":"init","conversation_id":"%s","init":{"model":"stub"}}\n' "$STUB_UUID"
printf '{"event":"step_update","step_update":{"step_index":2,"state":"ACTIVE","step_type":"tool","tool_name":"view_file","tool_info":{"parameters":{"AbsolutePath":"/tmp/stub.txt"}}}}\n'
printf '{"event":"step_update","step_update":{"step_index":2,"state":"DONE","step_type":"tool","tool_name":"view_file","duration_seconds":0.25,"tool_info":{"parameters":{"AbsolutePath":"/tmp/stub.txt"}}}}\n'
printf '{"event":"result","result":{"status":"SUCCESS","response":"stub reply"}}\n'
[ "$want_idle" -eq 1 ] && sleep 60
[ "$want_fail" -eq 1 ] && exit 3
exit 0
EOF
chmod +x "$STUB"

# run_dispatch <gemini-dispatch.sh args...> — runs the script against the stub
# using $STATE / $ARGS_FILE / $UUID as set by the caller. Sets $OUT and $STATUS.
run_dispatch() {
  OUT=$(AGY="$STUB" GEMINI_STATE="$STATE" STUB_ARGS_FILE="$ARGS_FILE" STUB_UUID="$UUID" \
    sh "$SCRIPT" "$@" 2>&1)
  STATUS=$?
}

# --- 1: new dispatch — --add-dir with the absolute path, model slug, --mode accept-edits

PROJECT="$TMP/proj-new"
mkdir -p "$PROJECT"
STATE="$TMP/state-new"
ARGS_FILE="$TMP/args-new"
UUID="11111111-1111-1111-1111-111111111111"
run_dispatch "$PROJECT" "hello there"

if [ "$STATUS" -eq 0 ] &&
   grep -Fxq -- "--add-dir" "$ARGS_FILE" &&
   grep -Fxq -- "$PROJECT" "$ARGS_FILE" &&
   grep -Fxq -- "gemini-3.7-flash-medium" "$ARGS_FILE" &&
   grep -Fxq -- "--mode" "$ARGS_FILE" &&
   grep -Fxq -- "accept-edits" "$ARGS_FILE"; then
  pass "new dispatch: --add-dir (absolute), model slug and --mode accept-edits"
else
  fail "new dispatch: --add-dir (absolute), model slug and --mode accept-edits" "status=$STATUS out: $OUT"
fi

# --- 2: the conversation id is captured from the stream into <key>.id

IDFILE="$STATE/$(state_key "$PROJECT").id"
if [ -f "$IDFILE" ] && [ "$(cat "$IDFILE")" = "$UUID" ]; then
  pass "conversation id is captured from the stream into <key>.id"
else
  fail "conversation id is captured from the stream into <key>.id" \
    "expected $UUID in $IDFILE, got: $(cat "$IDFILE" 2>/dev/null)"
fi

# --- 3: -c passes --conversation <that id>, alongside the normal dispatch flags

ORIGINAL_ID=$(cat "$IDFILE")
ARGS_FILE="$TMP/args-continue"
UUID="22222222-2222-2222-2222-222222222222"
run_dispatch -c "$PROJECT" "continue please"

if [ "$STATUS" -eq 0 ] &&
   awk -v id="$ORIGINAL_ID" 'p == "--conversation" && $0 == id { found = 1 } { p = $0 } END { exit !found }' \
     "$ARGS_FILE" &&
   grep -Fxq -- "--add-dir" "$ARGS_FILE" &&
   grep -Fxq -- "$PROJECT" "$ARGS_FILE"; then
  pass "-c: resumes with --conversation <stored id>, alongside --add-dir"
else
  fail "-c: resumes with --conversation <stored id>, alongside --add-dir" "status=$STATUS out: $OUT"
fi

# --- 4: -c with no recorded id fails, naming the directory

PROJECT4="$TMP/proj-unseen"
mkdir -p "$PROJECT4"
STATE="$TMP/state-unseen"
ARGS_FILE="$TMP/args-unseen"
UUID="unused"
run_dispatch -c "$PROJECT4" "resume me"

if [ "$STATUS" -eq 0 ]; then
  fail "-c: no recorded id fails, naming the directory" "expected non-zero exit, got 0"
else
  case "$OUT" in
    *"$PROJECT4"*) pass "-c: no recorded id fails, naming the directory" ;;
    *) fail "-c: no recorded id fails, naming the directory" "got: $OUT" ;;
  esac
fi

# --- 5: a relative project dir resolves to an absolute path in the args

ORIG_PWD=$(pwd)
mkdir -p "$TMP/proj-rel/nested"
cd "$TMP/proj-rel" || exit 1
EXPECTED_ABS=$(cd nested && pwd)
STATE="$TMP/state-rel"
ARGS_FILE="$TMP/args-rel"
UUID="33333333-3333-3333-3333-333333333333"
run_dispatch "nested" "relative prompt"
cd "$ORIG_PWD" || exit 1

if [ "$STATUS" -eq 0 ] && grep -Fxq -- "$EXPECTED_ABS" "$ARGS_FILE"; then
  pass "a relative project dir resolves to an absolute path in the args"
else
  fail "a relative project dir resolves to an absolute path in the args" \
    "expected $EXPECTED_ABS in args, status=$STATUS out: $OUT"
fi

# --- 6: the script exits with agy's exit code when the stub fails

PROJECT6="$TMP/proj-fail"
mkdir -p "$PROJECT6"
STATE="$TMP/state-fail"
ARGS_FILE="$TMP/args-fail"
UUID="44444444-4444-4444-4444-444444444444"
run_dispatch "$PROJECT6" "MAGIC_FAIL"

if [ "$STATUS" -eq 3 ]; then
  pass "exits with agy's exit code when the stub fails"
else
  fail "exits with agy's exit code when the stub fails" "expected 3, got $STATUS (out: $OUT)"
fi

# --- 7: two project dirs get two state keys, neither overwrites the other's .id

PROJECT_A="$TMP/proj-a"
PROJECT_B="$TMP/proj-b"
mkdir -p "$PROJECT_A" "$PROJECT_B"
STATE="$TMP/state-two"
UUID_A="55555555-5555-5555-5555-555555555555"
UUID_B="66666666-6666-6666-6666-666666666666"

ARGS_FILE="$TMP/args-a"
UUID="$UUID_A"
run_dispatch "$PROJECT_A" "prompt a"

ARGS_FILE="$TMP/args-b"
UUID="$UUID_B"
run_dispatch "$PROJECT_B" "prompt b"

IDFILE_A="$STATE/$(state_key "$PROJECT_A").id"
IDFILE_B="$STATE/$(state_key "$PROJECT_B").id"

if [ "$IDFILE_A" != "$IDFILE_B" ] &&
   [ "$(cat "$IDFILE_A" 2>/dev/null)" = "$UUID_A" ] &&
   [ "$(cat "$IDFILE_B" 2>/dev/null)" = "$UUID_B" ]; then
  pass "two project dirs get two state keys, neither overwrites the other's .id"
else
  fail "two project dirs get two state keys, neither overwrites the other's .id" \
    "a=$(cat "$IDFILE_A" 2>/dev/null) b=$(cat "$IDFILE_B" 2>/dev/null)"
fi

# --- 8: -y swaps the edits-only approval for full tool approval

PROJECT8="$TMP/proj-yolo"
mkdir -p "$PROJECT8"
STATE="$TMP/state-yolo"
ARGS_FILE="$TMP/args-yolo"
UUID="77777777-7777-7777-7777-777777777777"
run_dispatch -y "$PROJECT8" "needs a shell"

if [ "$STATUS" -eq 0 ] &&
   grep -Fxq -- "--dangerously-skip-permissions" "$ARGS_FILE" &&
   ! grep -Fxq -- "accept-edits" "$ARGS_FILE"; then
  pass "-y: full tool approval replaces --mode accept-edits"
else
  fail "-y: full tool approval replaces --mode accept-edits" "status=$STATUS args: $(tr '\n' ' ' < "$ARGS_FILE")"
fi

# --- 9: -c and -y combine, in either order

ID8=$(cat "$STATE/$(state_key "$PROJECT8").id")
ARGS_FILE="$TMP/args-yolo-continue"
UUID="88888888-8888-8888-8888-888888888888"
run_dispatch -y -c "$PROJECT8" "keep going"

if [ "$STATUS" -eq 0 ] &&
   awk -v id="$ID8" 'p == "--conversation" && $0 == id { found = 1 } { p = $0 } END { exit !found }' \
     "$ARGS_FILE" &&
   grep -Fxq -- "--dangerously-skip-permissions" "$ARGS_FILE"; then
  pass "-y -c: resumes this project's conversation with full tool approval"
else
  fail "-y -c: resumes this project's conversation with full tool approval" \
    "status=$STATUS args: $(tr '\n' ' ' < "$ARGS_FILE")"
fi

# --- 10: --id shows agy's own title for the conversation when there is one

FAKE_HOME="$TMP/gemini-home"
mkdir -p "$FAKE_HOME/annotations"
printf 'title:"Refactor The Header"\n' > "$FAKE_HOME/annotations/$UUID.pbtxt"
OUT=$(AGY="$STUB" GEMINI_STATE="$STATE" GEMINI_HOME="$FAKE_HOME" \
  STUB_ARGS_FILE="$ARGS_FILE" STUB_UUID="$UUID" sh "$SCRIPT" --id "$PROJECT8" 2>&1)

if [ "$(printf '%s' "$OUT" | cut -f1)" = "$UUID" ] &&
   [ "$(printf '%s' "$OUT" | cut -f2)" = "Refactor The Header" ]; then
  pass "--id: prints the conversation id and agy's title for it"
else
  fail "--id: prints the conversation id and agy's title for it" "got: $OUT"
fi

# --- 11: --id falls back to the bare id when there is no annotation

OUT=$(AGY="$STUB" GEMINI_STATE="$STATE" GEMINI_HOME="$TMP/no-such-home" \
  STUB_ARGS_FILE="$ARGS_FILE" STUB_UUID="$UUID" sh "$SCRIPT" --id "$PROJECT8" 2>&1)

if [ "$OUT" = "$UUID" ]; then
  pass "--id: falls back to the bare id with no annotation"
else
  fail "--id: falls back to the bare id with no annotation" "got: $OUT"
fi

# --- 12: stdout is Gemini's reply, not the event stream

PROJECT12="$TMP/proj-reply"
mkdir -p "$PROJECT12"
STATE="$TMP/state-reply"
ARGS_FILE="$TMP/args-reply"
UUID="99999999-9999-9999-9999-999999999999"
run_dispatch "$PROJECT12" "say something"

if [ "$OUT" = "stub reply" ]; then
  pass "stdout is the reply alone, with the event stream kept out of it"
else
  fail "stdout is the reply alone, with the event stream kept out of it" "got: $OUT"
fi

# --- 13: --watch lists each tool step once, with its duration and arguments

OUT=$(AGY="$STUB" GEMINI_STATE="$STATE" sh "$SCRIPT" --watch "$PROJECT12" 2>&1)
STEPS=$(printf '%s\n' "$OUT" | grep -c 'view_file' || true)

if [ "$STEPS" -eq 1 ] &&
   printf '%s' "$OUT" | grep -q '0.3s' &&
   printf '%s' "$OUT" | grep -q '/tmp/stub.txt' &&
   printf '%s' "$OUT" | grep -q -- '-- finished: SUCCESS'; then
  pass "--watch: one line per tool step, with duration, arguments and the result"
else
  fail "--watch: one line per tool step, with duration, arguments and the result" "got: $OUT"
fi

# --- 14: --watch on a run still going reports it as running, not finished

STREAM14="$STATE/$(state_key "$PROJECT12").stream"
printf '{"event":"init","conversation_id":"%s"}\n' "$UUID" > "$STREAM14"
printf '{"event":"step_update","step_update":{"step_index":4,"state":"ACTIVE","step_type":"tool","tool_name":"grep_search","tool_info":{"parameters":{"Query":"Button"}}}}\n' >> "$STREAM14"
OUT=$(AGY="$STUB" GEMINI_STATE="$STATE" sh "$SCRIPT" --watch "$PROJECT12" 2>&1)

if printf '%s' "$OUT" | grep -q 'RUNNING' &&
   printf '%s' "$OUT" | grep -q 'grep_search' &&
   printf '%s' "$OUT" | grep -q -- '-- still running'; then
  pass "--watch: an unfinished run reports the live step as RUNNING"
else
  fail "--watch: an unfinished run reports the live step as RUNNING" "got: $OUT"
fi

# --- 15: --watch with nothing recorded fails, naming the directory

PROJECT15="$TMP/proj-nowatch"
mkdir -p "$PROJECT15"
OUT=$(AGY="$STUB" GEMINI_STATE="$TMP/state-nowatch" sh "$SCRIPT" --watch "$PROJECT15" 2>&1)
STATUS=$?

if [ "$STATUS" -ne 0 ]; then
  case "$OUT" in
    *"$PROJECT15"*) pass "--watch: nothing recorded fails, naming the directory" ;;
    *) fail "--watch: nothing recorded fails, naming the directory" "got: $OUT" ;;
  esac
else
  fail "--watch: nothing recorded fails, naming the directory" "expected non-zero exit, got 0"
fi

# --- 16: --status prints one statusline line while a run is still going

PROJECT16="$TMP/proj-status"
mkdir -p "$PROJECT16"
STATE="$TMP/state-status"
mkdir -p "$STATE"
STREAM16="$STATE/$(state_key "$PROJECT16").stream"
printf '{"event":"init","conversation_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}\n' > "$STREAM16"
printf '{"event":"step_update","step_update":{"step_index":4,"state":"ACTIVE","step_type":"tool","tool_name":"replace_file_content","tool_info":{"parameters":{"TargetFile":"/abs/src/Header.tsx"}}}}\n' >> "$STREAM16"
OUT=$(AGY="$STUB" GEMINI_STATE="$STATE" sh "$SCRIPT" --status "$PROJECT16" 2>&1)

if [ "$(printf '%s' "$OUT" | cut -f1)" = "run" ] &&
   case "$(printf '%s' "$OUT" | cut -f3)" in "#4 · replace_file_content Header.tsx "*s) true ;; *) false ;; esac; then
  pass "--status: one line naming the step, the live tool and how long it has been on it"
else
  fail "--status: one line naming the step, the live tool and how long it has been on it" "got: $OUT"
fi

# --- 17: a run that has gone quiet is flagged slow, not busy

touch -t "$(date -v-2M +%Y%m%d%H%M 2>/dev/null || date -d '2 minutes ago' +%Y%m%d%H%M)" "$STREAM16"
OUT=$(AGY="$STUB" GEMINI_STATE="$STATE" sh "$SCRIPT" --status "$PROJECT16" 2>&1)

if [ "$(printf '%s' "$OUT" | cut -f1)" = "slow" ]; then
  pass "--status: a run silent past the threshold is flagged slow"
else
  fail "--status: a run silent past the threshold is flagged slow" "got: $OUT"
fi

# --- 18: a finished run, or none at all, says nothing

printf '{"event":"result","result":{"status":"SUCCESS","response":"done"}}\n' >> "$STREAM16"
touch "$STREAM16"
OUT_DONE=$(AGY="$STUB" GEMINI_STATE="$STATE" sh "$SCRIPT" --status "$PROJECT16" 2>&1)
STATUS_DONE=$?
OUT_NONE=$(AGY="$STUB" GEMINI_STATE="$TMP/state-nostatus" sh "$SCRIPT" --status "$TMP" 2>&1)
STATUS_NONE=$?

if [ -z "$OUT_DONE" ] && [ "$STATUS_DONE" -eq 0 ] &&
   [ -z "$OUT_NONE" ] && [ "$STATUS_NONE" -eq 0 ]; then
  pass "--status: silent and successful for a finished run and for no run at all"
else
  fail "--status: silent and successful for a finished run and for no run at all" \
    "done=[$OUT_DONE] ($STATUS_DONE) none=[$OUT_NONE] ($STATUS_NONE)"
fi

# --- 19: the wrapper enforces its own ceiling when agy will not stop

PROJECT19="$TMP/proj-hang"
mkdir -p "$PROJECT19"
STATE="$TMP/state-hang"
ARGS_FILE="$TMP/args-hang"
UUID="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
HANG_START=$(date +%s)
OUT=$(AGY="$STUB" GEMINI_STATE="$STATE" GEMINI_TIMEOUT=2 STUB_ARGS_FILE="$ARGS_FILE" STUB_UUID="$UUID" \
  sh "$SCRIPT" "$PROJECT19" "MAGIC_HANG" 2>/dev/null)
STATUS=$?
HANG_WALL=$(( $(date +%s) - HANG_START ))

if [ "$STATUS" -ne 0 ] && [ "$HANG_WALL" -lt 15 ]; then
  pass "a dispatch that will not stop is killed at the wrapper's own ceiling"
else
  fail "a dispatch that will not stop is killed at the wrapper's own ceiling" \
    "status=$STATUS wall=${HANG_WALL}s out: $OUT"
fi

# --- 20: a timeout in anything but whole seconds is refused, not misread

OUT=$(AGY="$STUB" GEMINI_STATE="$STATE" GEMINI_TIMEOUT=15m STUB_ARGS_FILE="$ARGS_FILE" STUB_UUID="$UUID" \
  sh "$SCRIPT" "$PROJECT19" "hello" 2>&1)
STATUS=$?

if [ "$STATUS" -ne 0 ] && [ "${OUT#*GEMINI_TIMEOUT}" != "$OUT" ]; then
  pass "GEMINI_TIMEOUT in anything but whole seconds is refused loudly"
else
  fail "GEMINI_TIMEOUT in anything but whole seconds is refused loudly" "status=$STATUS out: $OUT"
fi

# --- 21: a dispatch that stops taking steps is cut without waiting for the ceiling

PROJECT21="$TMP/proj-idle"
mkdir -p "$PROJECT21"
STATE="$TMP/state-idle"
ARGS_FILE="$TMP/args-idle"
UUID="cccccccc-cccc-cccc-cccc-cccccccccccc"
IDLE_START=$(date +%s)
OUT=$(AGY="$STUB" GEMINI_STATE="$STATE" GEMINI_TIMEOUT=600 GEMINI_IDLE=2 \
  STUB_ARGS_FILE="$ARGS_FILE" STUB_UUID="$UUID" \
  sh "$SCRIPT" "$PROJECT21" "MAGIC_IDLE" 2>/dev/null)
STATUS=$?
IDLE_WALL=$(( $(date +%s) - IDLE_START ))

if [ "$STATUS" -ne 0 ] && [ "$IDLE_WALL" -lt 15 ]; then
  pass "a dispatch that stops taking steps is cut long before the ceiling"
else
  fail "a dispatch that stops taking steps is cut long before the ceiling" \
    "status=$STATUS wall=${IDLE_WALL}s (ceiling was 600s) out: $OUT"
fi

# --- 22: --status carries the model, the -y mark, the elapsed time and the
#         tokens — the bar scaled to the model's own window (gemini-3.x: 1M),
#         and filled from the LAST usage step's input+cache_read (step 35:
#         3331+203465=206796 -> "206.7k"), not a sum across steps (step 33's
#         41200 must not leak in). Numbers for step 35 are the real sample
#         from a live agy stream, not invented.

PROJECT22="$TMP/proj-fields"
mkdir -p "$PROJECT22"
STATE="$TMP/state-fields"
mkdir -p "$STATE"
STREAM22="$STATE/$(state_key "$PROJECT22").stream"
{
  printf '{"event":"init","init":{"model":"gemini-3.7-flash-high","permission_mode":"always-proceed"}}\n'
  printf '{"event":"step_update","step_update":{"step_index":33,"state":"DONE","step_type":"agent_response","usage":{"input_tokens":20000,"cache_read_tokens":21200,"total_tokens":41200}}}\n'
  printf '{"event":"step_update","step_update":{"step_index":34,"state":"ACTIVE","step_type":"tool","tool_name":"replace_file_content","tool_info":{"parameters":{"TargetFile":"/x/src/acting-banner.tsx"}}}}\n'
  printf '{"event":"step_update","step_update":{"step_index":35,"state":"DONE","step_type":"agent_response","usage":{"input_tokens":3331,"cache_read_tokens":203465,"total_tokens":5064}}}\n'
} > "$STREAM22"
echo "$(( $(date +%s) - 252 ))" > "$STREAM22.start"
OUT=$(AGY="$STUB" GEMINI_STATE="$STATE" sh "$SCRIPT" --status "$PROJECT22" 2>&1)
TEXT=$(printf '%s' "$OUT" | cut -f3)

MISSING=""
for want in "3.7-flash-high" "-y" "#34" "acting-banner.tsx" "4m12s" "tok:▰▰▱▱▱▱▱▱▱▱ 206.7k / 1M"; do
  case "$TEXT" in *"$want"*) ;; *) MISSING="$MISSING [$want]" ;; esac
done

if [ -z "$MISSING" ]; then
  pass "--status: model, -y mark, step, elapsed and windowed occupancy bar all ride on the line"
else
  fail "--status: model, -y mark, step, elapsed and windowed occupancy bar all ride on the line" \
    "missing:$MISSING got: $TEXT"
fi

# --- 23: a dispatch approved only for edits carries no -y mark

sed 's/always-proceed/request-review/' "$STREAM22" > "$STREAM22.tmp" && mv "$STREAM22.tmp" "$STREAM22"
OUT=$(AGY="$STUB" GEMINI_STATE="$STATE" sh "$SCRIPT" --status "$PROJECT22" 2>&1)

case "$(printf '%s' "$OUT" | cut -f3)" in
  *"-y"*) fail "--status: no -y mark when only edits were approved" "got: $OUT" ;;
  *) pass "--status: no -y mark when only edits were approved" ;;
esac

# --- 24: the spend percentage rides in its own field (206796/1000000 -> 20),
#         and a zero GEMINI_BUDGET drops the bar even for a recognised model

PCT=$(printf '%s' "$OUT" | cut -f2)
OUT_NOBAR=$(AGY="$STUB" GEMINI_STATE="$STATE" GEMINI_BUDGET=0 sh "$SCRIPT" --status "$PROJECT22" 2>&1)
TEXT_NOBAR=$(printf '%s' "$OUT_NOBAR" | cut -f3)

if [ "$PCT" = "20" ] &&
   case "$TEXT_NOBAR" in *"206.7k tok"*) true ;; *) false ;; esac &&
   case "$TEXT_NOBAR" in *"tok:▰"*) false ;; *) true ;; esac; then
  pass "--status: the percentage is its own field and GEMINI_BUDGET=0 drops the bar"
else
  fail "--status: the percentage is its own field and GEMINI_BUDGET=0 drops the bar" \
    "pct=$PCT nobar: $TEXT_NOBAR"
fi

# --- 25: the occupancy bar is the LAST usage step's input+cache_read, never a
#         sum across steps — a first, much bigger step must not leak into it

PROJECT25="$TMP/proj-occupancy"
mkdir -p "$PROJECT25"
STATE="$TMP/state-occupancy"
mkdir -p "$STATE"
STREAM25="$STATE/$(state_key "$PROJECT25").stream"
{
  printf '{"event":"init","init":{"model":"gemini-3.7-flash-high"}}\n'
  printf '{"event":"step_update","step_update":{"step_index":1,"state":"DONE","step_type":"agent_response","usage":{"input_tokens":50000,"cache_read_tokens":50000,"total_tokens":100000}}}\n'
  printf '{"event":"step_update","step_update":{"step_index":2,"state":"DONE","step_type":"agent_response","usage":{"input_tokens":1000,"cache_read_tokens":2000,"total_tokens":1500}}}\n'
} > "$STREAM25"
OUT25=$(AGY="$STUB" GEMINI_STATE="$STATE" sh "$SCRIPT" --status "$PROJECT25" 2>&1)
TEXT25=$(printf '%s' "$OUT25" | cut -f3)

if case "$TEXT25" in *"tok:▱▱▱▱▱▱▱▱▱▱ 3k / 1M"*) true ;; *) false ;; esac; then
  pass "--status: occupancy is the last usage step's input+cache_read, not a sum across steps"
else
  fail "--status: occupancy is the last usage step's input+cache_read, not a sum across steps" \
    "got: $TEXT25"
fi

# --- 26: a model outside the known families gets no bar at all, not an
#         invented scale — even though it still has usage to show as plain tokens

PROJECT26="$TMP/proj-unknown-model"
mkdir -p "$PROJECT26"
STATE="$TMP/state-unknown-model"
mkdir -p "$STATE"
STREAM26="$STATE/$(state_key "$PROJECT26").stream"
{
  printf '{"event":"init","init":{"model":"mystery-model-9000"}}\n'
  printf '{"event":"step_update","step_update":{"step_index":1,"state":"DONE","step_type":"agent_response","usage":{"input_tokens":5000,"cache_read_tokens":1000,"total_tokens":6000}}}\n'
} > "$STREAM26"
OUT26=$(AGY="$STUB" GEMINI_STATE="$STATE" sh "$SCRIPT" --status "$PROJECT26" 2>&1)
PCT26=$(printf '%s' "$OUT26" | cut -f2)
TEXT26=$(printf '%s' "$OUT26" | cut -f3)

if [ -z "$PCT26" ] &&
   case "$TEXT26" in *"tok:▰"*) false ;; *) true ;; esac &&
   case "$TEXT26" in *"6k tok"*) true ;; *) false ;; esac; then
  pass "--status: an unrecognised model family gets no bar, not an invented scale"
else
  fail "--status: an unrecognised model family gets no bar, not an invented scale" \
    "pct=$PCT26 text=$TEXT26"
fi

printf '\n%s passed, %s failed\n' "$PASSED" "$FAILED"
[ "$FAILED" -eq 0 ]
