---
name: braves-security
description: >
  Usar cuando el usuario diga "/braves-security", "audita la seguridad",
  "chequeo de seguridad", "hardening", "production readiness", "¿es seguro?",
  o antes de un deploy/lanzamiento. Cubre seguridad de infraestructura
  (secretos, proxy de APIs, RLS, pooling, cache, rate limits, carga) y de
  código (OWASP). Solo reporta, no aplica fixes.
license: MIT
---

# Braves Security

El candado. Auditoría de seguridad en dos pases: infraestructura y código.
Reporte de una sola pasada: una línea por hallazgo, ranked por severidad.
No aplica nada.

## Formato de hallazgo

`<SEVERIDAD> <tag> <qué>. <fix recomendado>. [ruta:línea]`

Severidades: `CRITICAL` (fuga de datos/dinero ya posible) → `HIGH` (abuso
que quema dinero o tumba el servicio) → `MEDIUM` (se cae bajo carga) →
`LOW` (capacidad desconocida).

## Pase A — Infraestructura

- `secret:` credencial alcanzable desde el cliente: hardcodeada en frontend,
  en el repo o su historial, o expuesta vía env de build (`VITE_*`,
  `NEXT_PUBLIC_*`, `REACT_APP_*`). Keys secretas (service_role, sk_live,
  OpenAI, etc.) JAMÁS llegan al navegador. Las publishable/anon keys están
  diseñadas para el cliente — no son hallazgo, pero verificar el guardia
  detrás (RLS, restricción de dominio).
- `proxy:` frontend llamando una API externa (OpenAI, Stripe, Resend, …)
  directamente con una key secreta. Fix: API route/backend proxy — el
  navegador llama a NUESTRO servidor y el servidor guarda las keys.
- `rls:` base de datos alcanzable con key de cliente pero tablas sin
  row-level security o con policies permisivas (Supabase: anon key + tabla
  sin RLS = base de datos pública).
- `pool:` Postgres/MySQL sin connection pooling (PgBouncer, Supavisor,
  pgpool) — especialmente servicios en EasyPanel/self-hosted y funciones
  serverless abriendo conexiones crudas.
- `cache:` lecturas calientes o que casi no cambian golpeando la DB en cada
  request. Fix: el más barato que aguante — headers HTTP/CDN primero, Redis/
  KV si hace falta invalidación.
- `limit:` endpoint público sin rate limit ni límite de concurrencia (auth,
  signup, búsqueda, webhooks, llamadas a LLM). Fix: rate limiter de
  plataforma primero (Cloudflare, nginx, middleware del framework), código
  propio al final.
- `load:` cero evidencia de que el sistema aguanta usuarios concurrentes.
  Fix: escenario k6 o Artillery (sus capas gratuitas simulan ~100 usuarios
  virtuales) contra los 2-3 endpoints principales; guardar el script en
  `loadtest/`.

## Pase B — Código (OWASP práctico)

- `inject:` input externo concatenado en SQL/comandos/HTML: queries sin
  parámetros, `exec`/`eval` con input, `dangerouslySetInnerHTML`/`v-html`
  sin sanitizar.
- `authz:` IDOR y checks solo en el cliente: cada endpoint debe verificar EN
  EL SERVIDOR que el usuario es dueño del recurso (`/api/orders/123` — ¿de
  quién es el 123?). UI que oculta el botón no es autorización.
- `authn:` JWT sin verificar firma/expiración, sesiones eternas, passwords
  sin hash fuerte (bcrypt/argon2), endpoints de admin sin gate.
- `csrf/ssrf:` mutaciones por cookie sin token CSRF; servidor haciendo fetch
  a URLs que da el usuario sin allowlist (SSRF a metadata interna).
- `deps:` vulnerabilidades conocidas — correr el que exista: `bun audit` /
  `npm audit` / `pip-audit` / `osv-scanner`. Reportar solo high/critical.
- `leak:` errores que devuelven stack traces/SQL al cliente; CORS `*` con
  credenciales; directorio `.git`/backups servidos.
- `upload:` archivos subidos sin validar tipo/tamaño/ruta (path traversal),
  servidos desde el mismo origen.

## Dónde cazar

`rg` de patrones de keys en código cliente (`sk_live`, `sk-proj`,
`service_role`, `Bearer `); qué vars expone el build; llamadas
`fetch`/`axios` del frontend a hosts de terceros; migraciones (¿RLS por
tabla?); configs de deploy (docker-compose, EasyPanel: ¿pooler?, ¿DB expuesta
a internet?); middleware (¿algún rate limit?); repo (¿existe `loadtest/`?).

## La regla lazy

Config de plataforma > código propio: RLS > checks en app, PgBouncer >
pool casero, CDN/headers > cache custom, rate limiter de plataforma >
middleware artesanal. Recomendar siempre el peldaño más alto que aguante.

## Salida

Hallazgos ranked, una línea cada uno. Cerrar con:
`exposición: <N> critical, <M> high.` Si no hay nada: `Blindado. Ship.`

## Límites

Reporta, no arregla — los fixes van a braves-fix o al runbook de
braves-audit. El over-engineering no es asunto de esta skill (va en
braves-audit). Nunca ejecutar exploits ni tocar datos de producción:
verificación por lectura de código y configs.
