---
name: braves-ship
description: >
  Usar cuando el usuario diga "/braves-ship", "cierra la feature", "haz el
  commit", "crea el PR", "mergea esto", "sube los cambios", "vamos a
  producción" o "release". Cierre profesional del trabajo: pre-vuelo,
  commits con la firma configurada, PR/merge según la política del usuario.
license: MIT
---

# Braves Ship

Cierre profesional del trabajo. Nada sale sin pre-vuelo, y los commits salen
como el usuario los configuró — no como el modelo quiera.

## Paso 0 — Configuración

Leer `~/.claude/braves-skills.json`. Si no existe → correr braves-setup
primero (REQUIRED SUB-SKILL: braves-setup). De ahí salen: identidad git,
`commits_by_claude`, firma, `coauthor_ai`, política de PR/merge.

## Paso 1 — Pre-vuelo (bloqueante)

En orden, con los comandos del proyecto:

1. `lint` y `build` en verde. `test` si existe.
2. Revisar el diff completo (`git diff` + `git status`) con ojos de
   braves-security: ¿el diff mete secretos, endpoints sin auth, deps nuevas
   sin justificar, `console.log`/código de debug?
3. ¿Archivos que no deberían ir? (.env, dumps, binarios, node_modules).
4. Si el alcance cambió respecto al plan/docs, actualizar `PLAN.md`/docs en
   el mismo commit o decir por qué no.

Pre-vuelo en rojo = no se commitea. Arreglar primero (braves-fix si es bug).

## Paso 2 — Commit

- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, …
  Mensaje corto en imperativo; cuerpo solo si el porqué no es obvio.
- Pie del commit: la `commit_signature` de la config, tal cual.
- `coauthor_ai: false` (default) → JAMÁS añadir `Co-Authored-By: Claude...`
  ni menciones a IA. Solo si la config lo activa explícitamente.
- Según `commits_by_claude`: `siempre` → commitear directo; `preguntar` →
  mostrar mensaje propuesto y esperar ok; `nunca` → dejar el mensaje listo y
  que el usuario commitee.
- En rama default con cambios nuevos → crear rama primero
  (`feat/<slug>`, `fix/<slug>`), salvo que la config permita push directo.

## Paso 3 — PR / Merge (según config)

- `pr.create: true` → PR con `gh pr create`: título = mensaje del commit
  principal; body con **Qué / Por qué / Cómo verificar** (comandos
  concretos del pre-vuelo).
- Merge con la estrategia configurada (`merge_strategy`), y SOLO si
  `who_merges` lo permite — si mergea el usuario, dejar el PR listo y el
  link.
- Nunca push forzado, nunca a main directo salvo `direct_push_main: true`.

## Paso 4 — Checklist de release (si va a producción)

- [ ] Variables de entorno nuevas documentadas (README/`.env.example`)
- [ ] Migraciones aplicadas y con vuelta atrás conocida
- [ ] Plan de rollback en una línea (¿revert? ¿redeploy anterior?)
- [ ] Dónde mirar si algo explota (logs, dashboard) anotado en el PR

## Paso 5 — Cierre

Confirmar en ≤3 líneas: qué se commiteó/pusheó, link del PR si hay, y si la
sesión tuvo decisiones o aprendizajes significativos, sugerir braves-save.

## Límites

No mergea sin permiso de la config, no salta el pre-vuelo aunque haya prisa
("es un cambio chiquito" — los chiquitos también tumban prod), no reescribe
historia publicada. Push a repos ajenos: jamás sin orden explícita.
