#!/bin/sh
# braves-skills SessionStart hook: house rules + first-run detector + update check.
CONFIG="$HOME/.claude/braves-skills.json"

# Injected once per session instead of being copy-pasted into all 18 SKILL.md
# files. Deliberately does NOT resolve the value: the skills said the same
# sentence, so behaviour is unchanged and no JSON parser becomes a dependency.
# Trade-off: a skill copied out of this plugin loses the rule with it.
cat <<'EOF'
BRAVES SKILLS: speak to the user in the `language` set in ~/.claude/braves-skills.json;
if unset, default to Spanish. This applies to every braves-* skill in this session.
EOF

if [ ! -f "$CONFIG" ]; then
  cat <<'EOF'
BRAVES SKILLS: first-time install detected (~/.claude/braves-skills.json does not exist).
At the start of the conversation, offer the user to run /braves-setup — a one-time onboarding
that configures: GitHub username for commits, whether Claude commits on their behalf, commit
signature (AI co-authorship disabled by default), PR/merge policy, optional NotebookLM
activation, and adoption of custom skills. Do NOT run it without the user's consent. If
declined, don't insist again this session.
EOF
fi

# Daily update check: latest remote tag vs local plugin version.
ROOT="${CLAUDE_PLUGIN_ROOT:-$HOME/.claude/skills/braves-skills}"
STAMP="$HOME/.claude/braves-skills-update-check"
NOTICE="$HOME/.claude/braves-skills-update-notice"

# Report what the last check found. Local read, never blocks.
[ -s "$NOTICE" ] && cat "$NOTICE"

# Refresh at most once a day, and off the blocking path: SessionStart waits on
# this hook, so `ls-remote` on a slow or offline network would stall every
# session until the hook timeout. The result lands in $NOTICE for next session.
if [ -z "$(find "$STAMP" -mtime -1 2>/dev/null)" ]; then
  touch "$STAMP"
  (
    latest=$(git -C "$ROOT" ls-remote --tags --refs origin 2>/dev/null | sed -n 's|.*refs/tags/v||p' | sort -V | tail -1)
    current=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$ROOT/.claude-plugin/plugin.json")
    # Redirect covers the whole `if`, so an up-to-date check clears a stale notice.
    if [ -n "$latest" ] && [ "$latest" != "$current" ] && \
       [ "$(printf '%s\n%s\n' "$current" "$latest" | sort -V | tail -1)" = "$latest" ]; then
      echo "BRAVES SKILLS: v$latest is available (installed: v$current). Offer the user to run /braves-update to review and apply it."
    fi > "$NOTICE"
  ) >/dev/null 2>&1 &
fi
exit 0
