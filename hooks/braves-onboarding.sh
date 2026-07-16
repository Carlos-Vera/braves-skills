#!/bin/sh
# braves-skills first-run detector: prints the onboarding reminder
# only while ~/.claude/braves-skills.json does not exist yet.
CONFIG="$HOME/.claude/braves-skills.json"
if [ ! -f "$CONFIG" ]; then
  cat <<'EOF'
BRAVES SKILLS: primera instalación detectada (no existe ~/.claude/braves-skills.json).
Al inicio de la conversación, ofrece al usuario correr /braves-setup — onboarding único que configura:
usuario de GitHub para commits, si Claude hace commits por él, firma de commits (co-autoría de IA
desactivada por defecto), política de PR/merge, activación opcional de NotebookLM y adopción de
skills propias. NO lo ejecutes sin que el usuario acepte. Si declina, no insistir en esta sesión.
EOF
fi
exit 0
