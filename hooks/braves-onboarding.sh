#!/bin/sh
# braves-skills first-run detector: prints the onboarding reminder
# only while ~/.claude/braves-skills.json does not exist yet.
CONFIG="$HOME/.claude/braves-skills.json"
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
if [ -z "$(find "$STAMP" -mtime -1 2>/dev/null)" ]; then
  touch "$STAMP"
  latest=$(git -C "$ROOT" ls-remote --tags --refs origin 2>/dev/null | sed -n 's|.*refs/tags/v||p' | sort -V | tail -1)
  current=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$ROOT/.claude-plugin/plugin.json")
  if [ -n "$latest" ] && [ "$latest" != "$current" ] && \
     [ "$(printf '%s\n%s\n' "$current" "$latest" | sort -V | tail -1)" = "$latest" ]; then
    echo "BRAVES SKILLS: v$latest is available (installed: v$current). Offer the user to run /braves-update to review and apply it."
  fi
fi
exit 0
