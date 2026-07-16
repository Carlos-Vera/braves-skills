---
name: braves-help
description: >
  Usar cuando el usuario diga "/braves-help", "braves help", "ayuda braves",
  "qué skills tengo", "muéstrame la caja", "qué hace cada skill", o pregunte
  qué skill de la caja braves usar para una tarea. Display de una sola vez,
  no es un modo persistente.
license: MIT
---

# Braves Help

Muestra la caja completa. Display único, sin efectos secundarios.

## Salida

Imprimir esta tabla tal cual (adaptar solo el estado de configuración):

```
BRAVES SKILLS — caja de herramientas BravesLab (todo el ciclo de vida)

 Ciclo de vida:
 /braves-start → /fable-plan → /braves-opinion → [construir] →
 /braves-security → /braves-audit → /braves-fix → /braves-ship → /braves-save

 Skill            Cuándo usarla
 ─────────────    ─────────────────────────────────────────────────────────
 /braves-setup    Primera vez u onboarding: identidad git, firma de commits,
                  política PR/merge, NotebookLM, adopción de skills propias.
 /braves-start    Arrancar un proyecto: genera PRD, TRD, UI/UX, Flujo,
                  Backend y Plan ANTES de tocar código.
 /fable-plan      Antes de desarrollar cualquier feature: las preguntas que
                  Fable haría → plan por fases con verificación.
 /braves-opinion  Abogado del diablo: crítica constructiva sin adulación.
                  Veredicto SHIP / SHIP CON CAMBIOS / REPENSAR / MATAR.
 /braves-security El candado: auditoría de seguridad de infra (secretos,
                  proxy, RLS, pooling, cache, rate limits, carga) + código
                  (OWASP). Solo reporta.
 /braves-audit    Auditoría global (seguridad + over-engineering +
                  performance). Escribe braves-audit-FECHA.md ejecutable
                  en la raíz.
 /braves-fix      Arregla bugs con evidencia obligatoria. Si existe
                  braves-audit-FECHA.md en la raíz, lo ejecuta paso a paso.
 /braves-ship     Cierre profesional: pre-vuelo, commit con tu firma,
                  PR/merge según tu configuración, checklist de release.
 /braves-save     Cierre de sesión: memorias + bitácora al notebook Brain
                  de NotebookLM.
 /braves-notebook API completa de NotebookLM (podcasts, informes, quiz,
                  fuentes, descargas).
 /braves-help     Esta tabla.
```

## Después de la tabla

1. Comprobar si existe `~/.claude/braves-skills.json`. Si NO existe, añadir:
   "Configuración pendiente — corre `/braves-setup` para el onboarding único."
2. Si el usuario preguntó por una tarea concreta ("¿cuál uso para X?"),
   recomendar UNA skill y por qué, en una línea.

## Límites

Solo muestra. No ejecuta ninguna otra skill ni modifica nada.
