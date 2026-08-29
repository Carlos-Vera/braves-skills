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

setup_home
printf '# Continuación\n\n**Dónde quedamos:** a medias.\n' > "$HOME/.claude/sessions/.handoff-TEST.md"

out=$(run_hook braves-handoff.sh "{\"cwd\":\"$PROJECT\"}")
case "$out" in
  *"BRAVES HANDOFF (TEST)"*"Dónde quedamos"*) pass "handoff: serves the block in a registered project" ;;
  *) fail "handoff: serves the block in a registered project" "got: $out" ;;
esac

if [ -f "$HOME/.claude/sessions/.handoff-TEST.consumed.md" ] &&
   [ ! -f "$HOME/.claude/sessions/.handoff-TEST.md" ]; then
  pass "handoff: marks the block consumed"
else
  fail "handoff: marks the block consumed" "the .md was not renamed to .consumed.md"
fi

out=$(run_hook braves-handoff.sh "{\"cwd\":\"$PROJECT\"}")
expect_silent "handoff: stays silent on the second start" "$out"

# A package inside a registered root inherits its entry (braves-save Step 0).
printf 'nested\n' > "$HOME/.claude/sessions/.handoff-TEST.md"
out=$(run_hook braves-handoff.sh "{\"cwd\":\"$PROJECT/pkg\"}")
case "$out" in
  *"BRAVES HANDOFF (TEST)"*) pass "handoff: a nested path inherits the project" ;;
  *) fail "handoff: a nested path inherits the project" "got: $out" ;;
esac

# An unregistered directory must never receive another project's handoff.
printf 'unrelated\n' > "$HOME/.claude/sessions/.handoff-TEST.md"
out=$(run_hook braves-handoff.sh "{\"cwd\":\"$HOME\"}")
expect_silent "handoff: stays silent outside a registered project" "$out"

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

# A Stop hook that already resumed the session must never chain into another.
printf '95' > "$HOME/.claude/braves-ctx/sid2.pct"
out=$(run_hook braves-context.sh '{"session_id":"sid2","stop_hook_active":true}')
expect_silent "context: never chains when a Stop hook is already active" "$out"

printf '\n%s passed, %s failed\n' "$PASSED" "$FAILED"
[ "$FAILED" -eq 0 ]
