<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="media/Braves_Skills_white.svg">
    <img src="media/Braves_Skills_black.svg" alt="braves-skills" width="360">
  </picture>
</p>

<p align="center">
  <a href="https://github.com/Carlos-Vera/braves-skills/releases"><img src="https://img.shields.io/github/v/release/Carlos-Vera/braves-skills" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/Carlos-Vera/braves-skills" alt="License"></a>
  <a href="https://github.com/Carlos-Vera/braves-skills/graphs/contributors"><img src="https://img.shields.io/github/contributors/Carlos-Vera/braves-skills" alt="Contributors"></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs welcome"></a>
</p>

**Español** | [English](README.en.md) 

# braves-skills

La caja de herramientas todo-en-uno que uso en mi trabajo con Claude Code, posee 18 skills
que cubren el ciclo de vida completo de un proyecto (12 skills de ciclo de
vida + 6 skills de soporte), porque me volvia loco recordar 40 skills
sueltas y sin saber si chocaban o no, braves skills resuelve esto.

## Mi ciclo de trabajo con Claude Code
Puedes ejecutarlo así:

```
/braves-start → /fable-plan → /braves-opinion → [construye tu proyecto] →
/braves-security → /braves-audit → /braves-fix → /braves-ship → /braves-save
```

| Skill | Qué hace |
|-------|----------|
| `/braves-setup` | Te permite configurar el entorno de trabajo para que Claude pueda trabajar contigo. Configura: identidad git, firma de commits (coautoría de IA OFF por defecto), política de PR/merge, NotebookLM opcional, adopción de tus propias skills. |
| `/braves-help` | Muestra esta caja de ayuda para saber que skill usar para cada tarea. |
| `/braves-start` | Arranque de proyecto: te ayuda a crear: PRD, TRD, UI/UX, Flujo, Backend y Plan antes de tocar código. |
| `/fable-plan` | Te hace las preguntas que un arquitecto senior hace antes de construir → un plan por fases con verificación. |
| `/braves-opinion` | Décimo Hombre: crítica constructiva sin adulación. Veredicto SHIP / SHIP WITH CHANGES / RETHINK / KILL. |
| `/braves-security` | El candado: realiza una auditoría de infraestructura (secretos, proxy de API, RLS, pooling, cache, rate limits, pruebas de carga con k6/Artillery) + código (OWASP). |
| `/braves-audit` | Auditoría Global (seguridad + sobre-ingeniería + rendimiento). Escribe un `braves-audit-DATE.md` ejecutable en la raíz del repo. |
| `/braves-fix` | Arregla bugs con evidencia obligatoria; ejecuta el runbook `braves-audit-DATE.md` si existe uno. |
| `/braves-ship` | Cierre profesional: chequeos previos, commit con tu firma, PR/merge según tu configuración, checklist de release. |
| `/braves-save` | Cierre de sesión: memorias + entrada de log al notebook AI Brain (NotebookLM). (recomendable antes de llegar a 40% de contexto de la sesión) |
| `/braves-notebook` | Te da la API completa de Google NotebookLM (fuentes, podcasts, reportes, quizzes, descargas). Va de la mano con `/braves-save`: el save lo usa como memoria al crear tu notebook AI Brain, por eso conviene guardar antes de llegar al 40% de contexto de la sesión. |
| `/braves-update` | Te avisa al arrancar la sesión si hay versión nueva de la caja (chequeo 1 vez al día) y la verifica/actualiza cuando tú digas, mostrando qué trae el release. |

### Skills de soporte (adoptadas)

| Skill | Qué hace |
|-------|----------|
| `/desarrollo` | Planifica una feature y constrúyela mediante agentes delegados. |
| `codebase-memory` | Consultas estructurales de código mediante el grafo de codebase-memory-mcp. |
| `delegate-by-default` | Modo orquestador: despacha subagentes en vez de trabajar en línea. |
| `humanizar` | Voz de marca de BravesLab para copy en español. |
| `n8n-workflow-builder` | Construye/depura workflows de n8n con validación y chequeo de CVE. |
| `wordpress-spanish` | Traducción es_ES para plugins de WordPress. |

## Instalación

Clona (o copia) dentro del directorio de skills de Claude Code:

```bash
git clone https://github.com/Carlos-Vera/braves-skills ~/.claude/skills/braves-skills
```

Se auto-carga en la siguiente sesión como `braves-skills@skills-dir` (o
ejecuta `/reload-plugins` para cargarla de inmediato). En la primera sesión,
un hook detecta que aún no hay configuración y ofrece ejecutar
`/braves-setup`.

## Configuración

`/braves-setup` es un flujo de configuración y onboarding único (re-ejecutable en cualquier
momento para cambiar valores luego). Pregunta una cosa a la vez:

1. Idioma en el que Claude debe hablarte.
2. Identidad git para los commits.
3. Si Claude hace los commits por ti (always / ask / never).
4. Firma de commit (pie de texto libre).
5. Coautoría de IA en los commits — OFF por defecto.
6. Política de PR y merge (¿crear PRs?, estrategia de merge, quién mergea, push directo a main — no por defecto) y política de releases (convención de versionado — patch por cambio, semver o la tuya propia; los releases nunca se publican sin preguntar, con recomendaciones en momentos clave).
7. Integración opcional con NotebookLM (logs de sesión enviados a un notebook "AI Brain" mediante el CLI no oficial `notebooklm-py`, login de Google asistido por navegador).
8. MCPs opcionales, con configuración guiada: Perplexity (búsqueda web con IA), Firecrawl (rastreo/scraping de sitios), Chrome DevTools (debugging frontend), Playwright (automatización y pruebas de navegador), Codebase memory (grafo de conocimiento del código), n8n (construcción de workflows), Context7 (docs actualizadas de librerías).
9. Adopción de tus propias skills, MCPs y plugins en la caja: las skills se copian al plugin, los MCPs extra entran al set curado, y los plugins se registran como parte de tu kit estándar para máquinas nuevas.
10. Chequeo de uso (en re-ejecuciones): audita cada MCP, skill y plugin contra los transcripts de sesión y te dice los días sin uso — siempre con número: si algo nunca se usó, muestra cuándo se instaló y cuántos días de historial cubre el análisis. Antes de retirar algo te dice con qué choca y qué cubre el hueco; nunca desinstala sin tu sí explícito.

La configuración vive en `~/.claude/braves-skills.json`:

```json
{
  "version": 1,
  "language": "es",
  "github_user": "your-github-user",
  "git_name": "Your Name",
  "git_email": "you@example.com",
  "commits_by_claude": "ask",
  "coauthor_ai": false,
  "commit_signature": "Author: Your Name <you@example.com>",
  "pr": {
    "create": true,
    "merge_strategy": "squash",
    "who_merges": "user",
    "direct_push_main": false
  },
  "notebooklm": { "enabled": false },
  "releases": { "versioning": "semver", "always_ask": true, "recommend_at_key_moments": true },
  "mcps": [],
  "plugins": [],
  "adopted_skills": []
}
```

Todas las skills te hablan en el `language` configurado (fallback: español
por defecto si `language` no está definido).

## Contribuir

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para saber cómo agregar o cambiar
skills.

## Contribuidores

`master` está protegida: se trabaja en rama nueva → PR → el mantenedor
verifica y mergea (detalle en [CONTRIBUTING.md](CONTRIBUTING.md)). Cada PR
mergeado te agrega a esta grilla y suma para tus badges de GitHub (Pull
Shark y compañía) — los logros son de quien contribuye, no solo del
mantenedor:

<a href="https://github.com/Carlos-Vera/braves-skills/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Carlos-Vera/braves-skills" alt="Contribuidores" />
</a>

## Créditos

- Las skills de auditoría heredan la filosofía y el formato de
  [ponytail](https://github.com/DietrichGebert/ponytail) (MIT, Dietrich
  Gebert), del cual este proyecto es un fork conceptual.
- `braves-save` y `braves-notebook` son ports de
  [BrainClaude](https://github.com/Carlos-Vera/BrainClaude) (Carlos Vera).

## Licencia

MIT — ver [LICENSE](LICENSE).
