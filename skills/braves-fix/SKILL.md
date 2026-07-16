---
name: braves-fix
description: >
  Usar cuando el usuario diga "/braves-fix", "arregla este bug", "no
  funciona", "sigue fallando", "ejecuta el audit", o cuando exista un
  braves-audit-*.md en la raíz del proyecto pendiente de ejecutar. También
  cuando un fix anterior "ya estaba arreglado" y el bug volvió.
license: MIT
---

# Braves Fix

Arregla bugs y ejecuta runbooks de auditoría. La regla que gobierna todo:
**"arreglado" sin evidencia no existe.** Este skill existe porque los modelos
declaran victoria antes de tiempo.

## Modo runbook

Si existe `braves-audit-*.md` en la raíz (si hay varios, el más reciente) y
el usuario no trae un bug concreto:

1. Leer el runbook COMPLETO antes de tocar nada.
2. Ejecutar los pasos en orden; tras cada uno, correr su **Verificación** y
   marcar `[x]` en el archivo solo si el resultado coincide.
3. Verificación falla → detenerse en ese paso, corregir, re-verificar. No
   avanzar en rojo.
4. Al final, ejecutar la **Verificación final** completa y reportar la tabla
   paso → estado con evidencia (comando + output real).

## Modo bug

1. **Reproducir ANTES de tocar código.** Ver el fallo con tus propios ojos
   (comando, curl, flujo en el navegador). Si no puedes reproducirlo, no
   puedes verificar el fix: instrumenta (logs, inputs reales) hasta
   reproducir o dilo honestamente.
2. **Leer el error completo.** El mensaje, el stack, la línea. No adivinar
   desde el título.
3. **Causa raíz, no síntoma.** Rastrear hacia atrás hasta el origen real.
   Parchar donde duele en vez de donde nace = el bug vuelve la semana que
   viene con otro disfraz.
4. **Fix mínimo** en el lugar correcto. Sin refactors oportunistas en el
   mismo diff.
5. **Reproducir DESPUÉS.** El mismo flujo del paso 1, ahora en verde. Pegar
   la evidencia en la respuesta.
6. **Buscar el patrón.** ¿El mismo bug vive en otros archivos? (`rg` del
   patrón). Listarlos aunque no se arreglen hoy.
7. **Test de regresión mínimo** que falle si el bug vuelve. Uno, pequeño,
   sin frameworks nuevos.

## Anti-"ya quedó"

| Excusa | Realidad |
|--------|----------|
| "El build pasa" | El build no ejecuta tu flujo. Corre el flujo real. |
| "Debería funcionar ahora" | "Debería" no es evidencia. Muestra el output. |
| "Los tests pasan" | ¿Algún test fallaba por ESTE bug? Si no, no prueban el fix. |
| "Cambié la línea que causaba el error" | ¿Lo viste fallar antes y pasar después? Si no, no lo sabes. |
| "No logro reproducirlo, pero el fix tiene sentido" | No reproducido = no verificado. Dilo tal cual al usuario. |
| "Es un cambio trivial" | Los "triviales" son el 50% de los rollbacks. Verifica igual. |

## Red flags — detente y verifica

Estás a punto de escribir "listo", "arreglado", "ya quedó", "should work" y
en tu respuesta NO hay un comando con su output demostrándolo. La palabra
"listo" exige evidencia adjunta en el mismo mensaje. Si la verificación es
imposible (falta acceso, falta un secreto, solo reproduce en prod), decirlo
explícitamente: "cambio aplicado, NO verificado porque X — verifícalo con
`<comando>`".

## Límites

Arregla lo diagnosticado; no re-arquitectura (eso pasa por fable-plan +
braves-opinion). Tres intentos fallidos sobre el mismo bug → parar y
replantear el diagnóstico con el usuario en vez de seguir mutando el código.
