---
name: braves-audit
description: >
  Usar cuando el usuario diga "/braves-audit", "auditoría completa", "audita
  todo el proyecto", "audita el repo", "braves-global", o quiera el estado
  real del proyecto (seguridad + over-engineering + performance) con un plan
  de remediación ejecutable escrito en la raíz.
license: MIT
---

# Braves Audit

Auditoría global del proyecto en tres pases. SIEMPRE termina escribiendo
`braves-audit-AAAA-MM-DD.md` en la raíz del proyecto: un runbook que un
agente fresco ejecuta en una conversación nueva sin contexto previo
(braves-fix lo ejecuta).

## Los tres pases

1. **Seguridad** — REQUIRED SUB-SKILL: braves-security completa (Pase A
   infra + Pase B código).
2. **Over-engineering** — tags heredados de ponytail, una línea por hallazgo:
   - `delete:` código muerto, flexibilidad sin uso, feature especulativa.
   - `stdlib:` reimplementación de algo que la librería estándar ya trae.
   - `native:` dependencia o código que la plataforma ya cubre (CSS > JS,
     constraint de DB > validación en app, `<input type="date">` > picker).
   - `yagni:` abstracción con una sola implementación, config que nadie
     cambia, capa con un solo caller.
   - `shrink:` misma lógica en menos líneas — mostrar la forma corta.
3. **Performance básica** — N+1 queries, índices faltantes en columnas
   filtradas/joineadas, bundle inflado (deps pesadas para una función),
   waterfalls de requests secuenciales paralelizables, imágenes sin
   optimizar, re-renders/loops calientes evidentes.

## El runbook (obligatorio)

Escribir `braves-audit-<AAAA-MM-DD>.md` en la raíz con esta estructura:

```markdown
# Braves Audit — <proyecto> — <AAAA-MM-DD>

## Instrucciones para el agente ejecutor
1. Lee este archivo COMPLETO antes de tocar nada.
2. Ejecuta los pasos en orden. No saltes ni reordenes.
3. Tras cada paso corre su bloque **Verificación** y marca `[x]` SOLO si el
   resultado coincide con lo esperado.
4. Si una verificación falla: detente en ese paso, corrige, re-verifica.
   No avances con verificaciones en rojo.
5. Al terminar todos los pasos, ejecuta la **Verificación final** completa y
   reporta la tabla paso → estado con la evidencia (comando + output).

## Contexto
- Proyecto: <nombre> — <una línea de qué es>
- Raíz: <ruta absoluta> | Stack: <resumen>
- Comandos: install `<cmd>` · build `<cmd>` · lint `<cmd>` · test `<cmd>`

## Hallazgos
| # | Severidad | Tag | Hallazgo | Ruta |
|---|-----------|-----|----------|------|

## Plan de ejecución
### Paso 1 — <título> [CRITICAL]
- Hallazgo: #<n>
- Acción: <qué cambiar, concreto>
- Archivos: <rutas>
- **Verificación**: `<comando no destructivo>` → esperado: <resultado>
- [ ] Verificado

### Paso 2 — ...

## Verificación final
- [ ] Todas las verificaciones de todos los pasos re-ejecutadas en verde
- [ ] Build de producción sin errores: `<cmd>`
- [ ] Ningún secreto en el bundle/cliente: `<rg sobre el build>` → sin matches
- [ ] Lint/tests (si existen) en verde

## Fuera de alcance (registrado, no ejecutar)
- <hallazgos LOW/decisiones de producto que el usuario debe decidir>
```

## Reglas del runbook

- Autocontenido: el ejecutor NO vio esta conversación. Rutas absolutas,
  comandos completos, cero referencias a "lo que hablamos".
- Todo paso tiene verificación ejecutable y no destructiva, con resultado
  esperado observable. Paso sin verificación no entra al plan.
- Orden por severidad: CRITICAL → HIGH → MEDIUM → LOW.
- Los hallazgos que requieren decisión del usuario (borrar features, cambiar
  de proveedor) van a "Fuera de alcance", no al plan.
- Si ya existe un `braves-audit-*.md` anterior en la raíz, mencionarlo y
  preguntar si se reemplaza o se genera uno nuevo con otra fecha.

## Salida en conversación

Resumen corto: total de hallazgos por severidad, los 3 más graves en una
línea cada uno, y la ruta del runbook generado. El detalle vive en el
archivo, no duplicarlo en el chat.

## Límites

Audita y escribe el runbook; NO aplica los fixes (eso es braves-fix, o un
agente fresco con el runbook). Análisis por lectura de código: nada de
exploits ni datos de producción.
