---
name: braves-setup
description: >
  Usar cuando el usuario diga "/braves-setup", "configura braves", "onboarding
  braves", cuando el hook de SessionStart detecte primera instalación (no
  existe ~/.claude/braves-skills.json), o cuando braves-ship o braves-save
  necesiten configuración que aún no existe.
license: MIT
---

# Braves Setup

Onboarding único de la caja. Hace las preguntas UNA A LA VEZ (esperar
respuesta antes de la siguiente; en Claude Code usar AskUserQuestion cuando
aplique) y guarda el resultado en `~/.claude/braves-skills.json`.

## Preguntas (en este orden)

1. **Identidad para commits** — usuario de GitHub y email a usar en los
   commits. Proponer los de `git config --global user.name / user.email` si
   existen; el usuario confirma o corrige.
2. **¿Hago los commits por ti?** — opciones: `siempre` (commiteo al cerrar
   trabajo), `preguntar` (propongo mensaje y espero ok), `nunca` (solo
   preparo el mensaje, el usuario commitea).
3. **Firma de commits** — texto libre que irá al pie de cada commit (puede
   ser vacío). Mostrar un ejemplo:
   ```
   Autor: Nombre <email>
   ---
   Frase personal opcional.
   ```
4. **Co-autoría de IA** — explicar en una línea: "por defecto NO añado líneas
   `Co-Authored-By: Claude...` ni menciones a IA en los commits". Solo
   activarla si el usuario lo pide explícitamente aquí. Default: `false`.
5. **PR y merge** — ¿creo PRs o solo ramas? ¿estrategia de merge preferida
   (merge / squash / rebase)? ¿puedo mergear yo o siempre mergea el usuario?
   ¿push directo a main permitido? (default: no).
6. **NotebookLM** — explicar en 2-3 líneas: "braves-save puede subir una
   bitácora de cada sesión a un notebook 'AI Brain' en Google NotebookLM,
   buscable y con el que puedes chatear o generar podcasts/informes
   (braves-notebook). Usa la librería no oficial notebooklm-py con tu cuenta
   Google." Preguntar si desea activarlo.
   - Si SÍ: seguir el "Paso 0: Configuración" de la skill braves-notebook
     (instalar CLI en venv + login asistido por navegador) y al terminar
     verificar con `notebooklm auth check`. Guardar `enabled: true`.
   - Si NO: guardar `enabled: false`. braves-save funcionará solo en local.
7. **Adopción de skills propias** — listar los directorios de
   `~/.claude/skills/` y `.claude/skills/` del proyecto que NO pertenezcan a
   la caja ni a plugins conocidos. Para cada skill propia del usuario,
   evaluar en una línea si es redundante con alguna de las 11 de la caja.
   Ofrecer adoptar las NO redundantes: copiarlas a `skills/<nombre>/` dentro
   del plugin braves-skills y añadirlas al array `skills` de
   `.claude-plugin/plugin.json`. Solo copiar con aprobación explícita, skill
   por skill. Las redundantes: decir con cuál de la caja chocan y sugerir
   retirarlas (decisión del usuario, no borrar nada sin permiso).

## Escribir la configuración

Guardar en `~/.claude/braves-skills.json`:

```json
{
  "version": 1,
  "github_user": "usuario",
  "git_email": "email",
  "commits_by_claude": "siempre|preguntar|nunca",
  "coauthor_ai": false,
  "commit_signature": "texto de la firma o \"\"",
  "pr": { "create": true, "merge_strategy": "squash", "who_merges": "usuario", "direct_push_main": false },
  "notebooklm": { "enabled": false },
  "adopted_skills": []
}
```

## Cierre

Confirmar en 2-3 líneas: configuración guardada, qué quedó activado, y que
`/braves-help` muestra la caja completa. Si el usuario declina el onboarding,
no insistir: el hook lo recordará en la próxima sesión.

## Límites

No hace commits ni toca repos del usuario; solo configura. Re-ejecutable:
si la config ya existe, mostrar los valores actuales y preguntar qué cambiar.
