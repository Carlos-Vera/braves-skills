#!/bin/sh
# Behaviour tests for the hooks.
#
# `sh -n` and shellcheck prove a hook parses. They cannot prove it does the one
# thing it exists for, and these hooks fail *silently* when they break: a
# handoff that stops being served and a checkpoint that stops firing both look
# exactly like a quiet session.
#
# Every case runs against a throwaway HOME, so a test can never read or write
# the real ~/.claude.

ROOT=$(cd "$(dirname "$0")/.." && pwd)
PASSED=0
FAILED=0

pass() { printf 'ok   %s\n' "$1"; PASSED=$((PASSED + 1)); }
fail() { printf 'FAIL %s\n     %s\n' "$1" "$2"; FAILED=$((FAILED + 1)); }

# A fresh HOME plus a registered project, so each case starts from a known
# config instead of inheriting the previous one's writes.
setup_home() {
  HOME=$(mktemp -d)
  export HOME
  PROJECT="$HOME/repo"
  mkdir -p "$PROJECT/pkg" "$HOME/.claude/sessions"
  cat > "$HOME/.claude/braves-skills.json" <<EOF
{
  "language": "es",
  "projects": {
    "$PROJECT": { "tag": "TEST", "name": "Test project", "notebook": "nb-id" }
  },
  "context_checkpoint": { "enabled": true, "threshold": 40 }
}
EOF
}

run_hook() {
  # run_hook <hook name> <json payload>
  printf '%s' "$2" | sh "$ROOT/hooks/$1" 2>&1
}

expect_silent() {
  # expect_silent <case name> <captured output>
  if [ -z "$2" ]; then pass "$1"; else fail "$1" "got: $2"; fi
}

# --- braves-handoff -------------------------------------------------------

# CONTEXTO.md is written by braves-save into the project root, not into
# ~/.claude — a test that writes it anywhere else proves nothing.
write_contexto() {
  # write_contexto <text> — always lands newer than the served stamp, so the
  # re-arm case does not depend on the clock ticking over a whole second.
  printf '%s' "$1" > "$PROJECT/CONTEXTO.md"
  python3 -c 'import os,sys,time; os.utime(sys.argv[1], (time.time()+2,)*2)' "$PROJECT/CONTEXTO.md"
}

setup_home
write_contexto '# Continuación

**Dónde quedamos:** a medias.
'

out=$(run_hook braves-handoff.sh "{\"cwd\":\"$PROJECT\"}")
case "$out" in
  *"BRAVES HANDOFF (TEST)"*"Dónde quedamos"*) pass "handoff: serves the block in a registered project" ;;
  *) fail "handoff: serves the block in a registered project" "got: $out" ;;
esac

# The whole point of moving it into the repo: the user keeps seeing it. A hook
# that consumes the file would look identical on the first start and be wrong.
if [ -f "$PROJECT/CONTEXTO.md" ] && [ -f "$HOME/.claude/sessions/.contexto-served-TEST" ]; then
  pass "handoff: stamps it served and leaves CONTEXTO.md in place"
else
  fail "handoff: stamps it served and leaves CONTEXTO.md in place" \
    "CONTEXTO.md was removed, or no stamp was written"
fi

out=$(run_hook braves-handoff.sh "{\"cwd\":\"$PROJECT\"}")
expect_silent "handoff: stays silent on the second start" "$out"

# The next /braves-save rewrites the file, which must re-arm it — otherwise the
# stamp silences every handoff after the first one, forever.
write_contexto 'rewritten by the next save
'
out=$(run_hook braves-handoff.sh "{\"cwd\":\"$PROJECT\"}")
case "$out" in
  *"rewritten by the next save"*) pass "handoff: a rewrite re-arms it" ;;
  *) fail "handoff: a rewrite re-arms it" "got: $out" ;;
esac

# A package inside a registered root inherits its entry (braves-save Step 0),
# and reads the root's CONTEXTO.md, not one of its own.
setup_home
write_contexto 'nested
'
out=$(run_hook braves-handoff.sh "{\"cwd\":\"$PROJECT/pkg\"}")
case "$out" in
  *"BRAVES HANDOFF (TEST)"*"nested"*) pass "handoff: a nested path inherits the project" ;;
  *) fail "handoff: a nested path inherits the project" "got: $out" ;;
esac

# An unregistered directory must never receive another project's handoff.
setup_home
write_contexto 'unrelated
'
out=$(run_hook braves-handoff.sh "{\"cwd\":\"$HOME\"}")
expect_silent "handoff: stays silent outside a registered project" "$out"

# A moved repo: the file came along, the registry still points at the old path.
# The hook must point at it without ever printing what is inside — an
# unregistered repo could have arrived as a clone, handoff included.
setup_home
MOVED="$HOME/moved-repo"
mkdir -p "$MOVED/.git"
printf 'secreto que no debe volcarse\n' > "$MOVED/CONTEXTO.md"
out=$(run_hook braves-handoff.sh "{\"cwd\":\"$MOVED\"}")
case "$out" in
  *"secreto que no debe volcarse"*)
    fail "handoff: an unregistered repo is flagged, never printed" "it printed the block" ;;
  *"not registered in braves-skills.json"*)
    pass "handoff: an unregistered repo is flagged, never printed" ;;
  *) fail "handoff: an unregistered repo is flagged, never printed" "got: $out" ;;
esac

# Same repo, no handoff in it: nothing to flag, so nothing to say.
rm -f "$MOVED/CONTEXTO.md"
out=$(run_hook braves-handoff.sh "{\"cwd\":\"$MOVED\"}")
expect_silent "handoff: an unregistered repo with no handoff stays silent" "$out"

# --- braves-context -------------------------------------------------------

setup_home
mkdir -p "$HOME/.claude/braves-ctx"

# No cached percentage means the window usage is genuinely unknown. Saying
# nothing is the contract; a hardcoded window is the bug this replaced.
out=$(run_hook braves-context.sh '{"session_id":"sid"}')
expect_silent "context: silent when no percentage was cached" "$out"

printf '12' > "$HOME/.claude/braves-ctx/sid.pct"
out=$(run_hook braves-context.sh '{"session_id":"sid"}')
expect_silent "context: silent below the threshold" "$out"

printf '70' > "$HOME/.claude/braves-ctx/sid.pct"
out=$(run_hook braves-context.sh '{"session_id":"sid"}')
case "$out" in
  *"BRAVES CONTEXT CHECKPOINT"*"70%"*) pass "context: fires past the threshold, with the real percentage" ;;
  *) fail "context: fires past the threshold, with the real percentage" "got: $out" ;;
esac

# Same level twice must not nag twice.
out=$(run_hook braves-context.sh '{"session_id":"sid"}')
expect_silent "context: does not repeat at the same level" "$out"

# It runs on UserPromptSubmit, where plain stdout reaches Claude and the user
# sees nothing. On Stop the only way to reach Claude was to block, which Claude
# Code shows the user as "Stop hook error" with the instruction dumped raw. So
# the output must stay plain text: a decision/reason envelope means it regressed
# to the shape that leaked onto the user's screen.
printf '95' > "$HOME/.claude/braves-ctx/sid2.pct"
out=$(run_hook braves-context.sh '{"session_id":"sid2"}')
case "$out" in
  *'"decision"'*|*'"reason"'*|*'"hookSpecificOutput"'*)
    fail "context: speaks to Claude as plain text, not as a block decision" "got JSON: $out" ;;
  *"BRAVES CONTEXT CHECKPOINT"*)
    pass "context: speaks to Claude as plain text, not as a block decision" ;;
  *) fail "context: speaks to Claude as plain text, not as a block decision" "got: $out" ;;
esac

# The checkpoint now rides on the user's own message, so it must never tell
# Claude to drop what they asked for.
case "$out" in
  *"Answer what the user actually asked"*) pass "context: tells Claude to answer the user first" ;;
  *) fail "context: tells Claude to answer the user first" "got: $out" ;;
esac

# It is wired to UserPromptSubmit, and the Stop lane keeps only the sound.
if jq -e '.hooks.UserPromptSubmit[0].hooks[0].command | contains("braves-context.sh")' "$ROOT/hooks/hooks.json" >/dev/null &&
   ! jq -e '[.hooks.Stop[].hooks[].command] | join(" ") | contains("braves-context.sh")' "$ROOT/hooks/hooks.json" >/dev/null; then
  pass "context: wired to UserPromptSubmit, not to Stop"
else
  fail "context: wired to UserPromptSubmit, not to Stop" "hooks.json still runs the checkpoint on Stop"
fi

printf '\n%s passed, %s failed\n' "$PASSED" "$FAILED"
[ "$FAILED" -eq 0 ]
