---
name: braves-start
description: >
  Usar cuando el usuario diga "/braves-start", "arranca un proyecto", "nuevo
  proyecto", "empecemos el proyecto", "cómo empiezo esto", o pida crear una
  app/sistema desde cero. También cuando un proyecto existente no tenga
  documentos fundacionales (PRD, plan) y se vayan a construir features
  grandes sobre él.
license: MIT
---

# Braves Start

Arranque profesional de cualquier proyecto. El objetivo: que no se caiga al
mes. Ni una línea de código de producción antes de que existan los documentos
fundacionales y el usuario los apruebe.

## Regla de oro

Código sin PRD aprobado = deuda desde el día cero. Si el usuario pide "hazlo
ya", construir solo un spike desechable y decirlo: "esto es un prototipo para
validar X, el proyecto real arranca con los docs".

## Flujo

1. **Entrevista** — usar las preguntas de fable-plan (REQUIRED SUB-SKILL:
   fable-plan), una a la vez, hasta tener respuestas que soporten decisiones:
   problema, usuario, alcance y NO-alcance, datos, restricciones, éxito.
   Saltar las que el contexto ya responde.
2. **Generar los documentos** en `docs/` del proyecto, EN ESTE ORDEN, cada
   uno corto y decisorio (máximo ~2 páginas, decisiones, no prosa):
   - `PRD.md` — problema, usuarios, casos de uso, alcance, NO-alcance
     explícito, métricas de éxito.
   - `TRD.md` — stack elegido y por qué (la opción más aburrida que cumpla),
     integraciones externas, restricciones, riesgos técnicos con mitigación.
   - `UIUX.md` — flujos de usuario pantalla a pantalla, wireframes en texto o
     mermaid, y SIEMPRE los estados vacío / carga / error de cada vista.
   - `FLUJO.md` — flujo de datos end-to-end: quién llama a quién, dónde viven
     los secretos (el navegador jamás llama APIs externas con keys — proxy en
     el servidor), qué se cachea.
   - `BACKEND.md` — esquema de datos con constraints en la DB, endpoints con
     auth de cada uno, trust boundaries, RLS/policies si aplica.
   - `PLAN.md` — plan de implementación por fases.
3. **Someter los docs a braves-opinion** antes de codear. Incorporar el
   veredicto.
4. Con docs aprobados → ejecutar PLAN.md fase por fase (o delegar).

## Reglas del PLAN.md (el anti-colapso)

- Cada fase termina con algo EJECUTABLE y su verificación (comando + resultado
  esperado). Fase que no se puede demostrar corriendo = fase mal cortada.
- Fase 1 demo-able en días, no semanas: esqueleto end-to-end (UI mínima →
  API → DB) antes que cualquier feature completa.
- Cada fase cabe en una sesión de trabajo. Si no cabe, partirla.
- Dependencias entre fases explícitas. Nada de "fase 9: seguridad" — la
  seguridad va dentro de cada fase (braves-security como puerta antes de
  cerrar cada una).

## Proyecto existente sin docs

Ingeniería inversa primero: leer el código y generar los docs faltantes desde
lo que existe (marcando `[ASUMIDO]` lo no verificable). Luego el flujo normal.

## Límites

No construye el proyecto; deja los documentos y el plan listos. La ejecución
es de fable-plan/desarrollo normal. No inventar requisitos que el usuario no
dio: preguntar.
