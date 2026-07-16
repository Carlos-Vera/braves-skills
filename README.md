# braves-skills

Caja de herramientas todo-en-uno de BravesLab para Claude Code: 11 skills que
cubren el ciclo de vida completo de un proyecto, sin tener que recordar 40
skills sueltas.

## El ciclo de vida

```
/braves-start → /fable-plan → /braves-opinion → [construir] →
/braves-security → /braves-audit → /braves-fix → /braves-ship → /braves-save
```

| Skill | Qué hace |
|-------|----------|
| `/braves-help` | Muestra esta caja y qué skill usar para cada tarea. |
| `/braves-setup` | Onboarding único: identidad git, firma de commits (co-autoría de IA OFF por defecto), política PR/merge, NotebookLM opcional, adopción de skills propias. |
| `/braves-start` | Arranque de proyecto: PRD, TRD, UI/UX, Flujo, Backend y Plan antes de tocar código. |
| `/fable-plan` | Las preguntas que un arquitecto senior hace antes de desarrollar → plan por fases con verificación. |
| `/braves-opinion` | Abogado del diablo: crítica constructiva sin adulación. Veredicto SHIP / SHIP CON CAMBIOS / REPENSAR / MATAR. |
| `/braves-security` | El candado: auditoría de infra (secretos, proxy de APIs, RLS, pooling, cache, rate limits, carga con k6/Artillery) + código (OWASP). |
| `/braves-audit` | Auditoría global (seguridad + over-engineering + performance). Escribe `braves-audit-FECHA.md` ejecutable en la raíz. |
| `/braves-fix` | Arregla bugs con evidencia obligatoria; ejecuta el runbook `braves-audit-FECHA.md` si existe. |
| `/braves-ship` | Cierre profesional: pre-vuelo, commit con tu firma, PR/merge según tu configuración, checklist de release. |
| `/braves-save` | Cierre de sesión: memorias + bitácora al notebook AI Brain (NotebookLM). |
| `/braves-notebook` | API completa de Google NotebookLM (fuentes, podcasts, informes, quiz, descargas). |

## Instalación

Clonar (o copiar) en el directorio de skills de Claude Code:

```bash
git clone https://github.com/Carlos-Vera/braves-skills ~/.claude/skills/braves-skills
```

Se auto-carga en la próxima sesión como `braves-skills@skills-dir` (o
`/reload-plugins` para cargarlo ya). En la primera sesión, un hook detecta
que no hay configuración y ofrece correr `/braves-setup`.

La configuración vive en `~/.claude/braves-skills.json`.

## Créditos

- Las skills de auditoría heredan la filosofía y el formato de
  [ponytail](https://github.com/DietrichGebert/ponytail) (MIT, Dietrich
  Gebert), del que este proyecto es un fork conceptual.
- `braves-save` y `braves-notebook` son ports de
  [BrainClaude](https://github.com/Carlos-Vera/BrainClaude) (Carlos Vera).

## Licencia

MIT — ver [LICENSE](LICENSE).
