---
name: fable-plan
description: >
  Usar cuando el usuario diga "/fable-plan", "planifica esta feature", "antes
  de desarrollar", "hazme las preguntas", o pida desarrollar cualquier
  función/módulo no trivial sin plan previo. También como motor de entrevista
  de braves-start.
license: MIT
---

# Fable Plan

Las preguntas que un arquitecto senior hace ANTES de escribir código, y el
plan por fases que sale de las respuestas. Una pregunta a la vez; esperar
respuesta antes de la siguiente.

## Las preguntas

Recorrer las categorías en orden. SALTAR toda pregunta que el contexto, el
código o los docs ya respondan — preguntar lo obvio es tan malo como no
preguntar. Normalmente 3-6 preguntas bastan.

1. **Problema** — ¿Qué se rompe o se pierde si esto NO se construye? ¿Quién
   lo va a usar de verdad y cuántas veces al día?
2. **Alcance** — ¿Qué queda explícitamente FUERA de esta versión? Si la
   respuesta es "nada", el alcance no está pensado.
3. **Datos** — ¿Cuál es la fuente de la verdad? ¿Qué forma tienen los datos y
   quién más los escribe? ¿Hay migración? ¿Hay PII que proteger?
4. **Estados** — ¿Qué ve el usuario en vacío, cargando, error y con 10.000
   registros? ¿Qué pasa si dos usuarios tocan lo mismo a la vez?
5. **Seguridad** — ¿Quién puede llamar a esto y cómo lo verificamos en el
   servidor? ¿Cruza algún trust boundary (input externo, API con key, dinero)?
6. **Costo** — ¿Qué cuesta esto con 100x usuarios (queries, tokens LLM,
   storage)? ¿Quién paga la factura si se abusa del endpoint?
7. **Mantenimiento** — ¿Quién depura esto a las 3am y con qué logs? ¿Qué
   dependencia nueva estamos adoptando y quién la mantiene?
8. **Éxito** — ¿Cómo sabremos que funciona? Un comando, un número o un flujo
   verificable — no "se siente bien".

## Del interrogatorio al plan

Con las respuestas load-bearing, producir el plan:

```markdown
# Plan: <feature>

## Decisiones (de las respuestas)
- <decisión> — porque <respuesta que la soporta>

## Fase N: <título>
- Objetivo: <slice más pequeño que se pueda demostrar corriendo>
- Archivos: <rutas concretas>
- Pasos: <2-6 pasos>
- Verificación: `<comando o flujo>` → esperado: <resultado observable>
```

Reglas: cada fase es el slice shippeable más pequeño; verificación ejecutable
por fase (fase sin verificación no es fase); lo descartado se anota en una
línea ("fuera: X, se añade cuando Y").

## Después del plan

- Feature grande o decisión discutible → pasar el plan por braves-opinion.
- Plan aprobado → ejecutar fase por fase, o delegar cada fase a un subagente
  con el plan como contexto.

## Límites

Planifica, no implementa. Si el usuario dice "no preguntes, hazlo", hacer las
2 preguntas más load-bearing como máximo y plantear el resto como supuestos
explícitos en el plan: "[ASUMO] X — corrígeme si no".
