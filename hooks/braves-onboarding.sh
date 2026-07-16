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
exit 0
