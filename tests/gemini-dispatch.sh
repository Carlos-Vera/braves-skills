#!/bin/sh
# Behaviour tests for scripts/gemini-dispatch.sh.
#
# Never call the real agy or the network: every case points AGY at a stub
# written into a throwaway temp dir, and GEMINI_STATE at a throwaway state
# dir. The stub records its own argv, fakes a "conversation update stream"
# log line with a known UUID, and prints a canned reply — enough to exercise
# the dispatch/continue/id logic without ever touching Gemini.

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

# Stub for agy. Records argv (one per line) to $STUB_ARGS_FILE, appends a fake
# "conversation update stream" log line (carrying $STUB_UUID) to whatever path
# follows --log-file, prints a canned reply, and exits 3 if MAGIC_FAIL is
# anywhere in its argv — the hook the failure-exit-code test uses.
STUB="$TMP/agy-stub.sh"
cat > "$STUB" <<'EOF'
#!/bin/sh
: > "$STUB_ARGS_FILE"
logfile=""
prev=""
want_fail=0
for a in "$@"; do
  printf '%s\n' "$a" >> "$STUB_ARGS_FILE"
  [ "$prev" = "--log-file" ] && logfile=$a
  [ "$a" = "MAGIC_FAIL" ] && want_fail=1
  prev=$a
done
if [ -n "$logfile" ]; then
  printf 'I0101 00:00:00.000000  123 server.go:1151] Starting conversation update stream for %s\n' \
    "$STUB_UUID" >> "$logfile"
fi
echo "stub reply"
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

# --- 2: the conversation id is captured from the log into <key>.id

IDFILE="$STATE/$(state_key "$PROJECT").id"
if [ -f "$IDFILE" ] && [ "$(cat "$IDFILE")" = "$UUID" ]; then
  pass "conversation id is captured from the log into <key>.id"
else
  fail "conversation id is captured from the log into <key>.id" \
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
cd "$TMP/proj-rel"
EXPECTED_ABS=$(cd nested && pwd)
STATE="$TMP/state-rel"
ARGS_FILE="$TMP/args-rel"
UUID="33333333-3333-3333-3333-333333333333"
run_dispatch "nested" "relative prompt"
cd "$ORIG_PWD"

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

printf '\n%s passed, %s failed\n' "$PASSED" "$FAILED"
[ "$FAILED" -eq 0 ]
