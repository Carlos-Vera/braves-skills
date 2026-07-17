---
name: braves-security
description: >
  Use when the user says "/braves-security", "audita la seguridad"
  (audit security), "chequeo de seguridad" (security check), "hardening",
  "production readiness", "¿es seguro?" (is this secure?), or before a
  deploy/launch. Covers infrastructure security (secrets, API proxying,
  RLS, pooling, cache, rate limits, load) and code security (OWASP).
  Reports only, doesn't apply fixes.
license: MIT
---

# Braves Security

Speak to the user in the `language` set in `~/.claude/braves-skills.json`;
if unset, default to Spanish.

The lock. Two-pass security audit: infrastructure and code. Single-pass
report: one line per finding, ranked by severity. Applies nothing.

## Finding format

`<SEVERITY> <tag> <what>. <recommended fix>. [path:line]`

Severities: `CRITICAL` (data/money leak already possible) → `HIGH`
(abuse that burns money or takes down the service) → `MEDIUM` (falls
over under load) → `LOW` (unknown capacity).

## Pass A — Infrastructure

- `secret:` credential reachable from the client: hardcoded in the
  frontend, in the repo or its history, or exposed via build env
  (`VITE_*`, `NEXT_PUBLIC_*`, `REACT_APP_*`). Secret keys (service_role,
  sk_live, OpenAI, etc.) must NEVER reach the browser. Publishable/anon
  keys are designed for the client — not a finding, but verify the guard
  behind them (RLS, domain restriction).
- `proxy:` frontend calling an external API (OpenAI, Stripe, Resend, …)
  directly with a secret key. Fix: API route/backend proxy — the
  browser calls OUR server and the server holds the keys.
- `rls:` database reachable with a client key but tables without
  row-level security or with permissive policies (Supabase: anon key +
  table without RLS = public database).
- `pool:` Postgres/MySQL without connection pooling (PgBouncer,
  Supavisor, pgpool) — especially services on EasyPanel/self-hosted and
  serverless functions opening raw connections.
- `cache:` hot or near-static reads hitting the DB on every request.
  Fix: the cheapest thing that holds — HTTP/CDN headers first, Redis/KV
  only if invalidation is actually needed.
- `limit:` public endpoint with no rate limit or concurrency cap (auth,
  signup, search, webhooks, LLM calls). Fix: platform rate limiter
  first (Cloudflare, nginx, framework middleware), custom code last.
- `load:` zero evidence the system holds up under concurrent users.
  Fix: a k6 or Artillery scenario (their free tiers simulate ~100
  virtual users) against the 2-3 main endpoints; save the script under
  `loadtest/`. The actionable step is WRITING the script; running it
  (and against which environment) is the user's call — never against
  production on your own.

## Pass B — Code (practical OWASP)

- `inject:` external input concatenated into SQL/commands/HTML:
  unparameterized queries, `exec`/`eval` with input,
  `dangerouslySetInnerHTML`/`v-html` without sanitizing.
- `authz:` IDOR and client-only checks: every endpoint must verify ON
  THE SERVER that the user owns the resource (`/api/orders/123` — whose
  is 123?). UI that hides the button isn't authorization.
- `authn:` JWT without signature/expiration verification, eternal
  sessions, passwords without strong hashing (bcrypt/argon2), admin
  endpoints without a gate.
- `csrf/ssrf:` cookie-based mutations without a CSRF token; server
  fetching user-supplied URLs without an allowlist (SSRF to internal
  metadata).
- `deps:` known vulnerabilities — run whatever exists: `bun audit` /
  `pnpm audit` / `pip-audit` / `osv-scanner`. High/critical are
  findings; moderate/low go in a separate watchlist at the end of the
  report (not lost, don't block).
- `leak:` errors that return stack traces/SQL to the client; CORS `*`
  with credentials; `.git`/backup directories being served.
- `upload:` uploaded files without type/size/path validation (path
  traversal), served from the same origin.

## Where to hunt

`rg` for key patterns in client code (`sk_live`, `sk-proj`,
`service_role`, `Bearer `); which vars the build exposes; frontend
`fetch`/`axios` calls to third-party hosts; migrations (RLS per table?);
deploy configs (docker-compose, EasyPanel: pooler? DB exposed to the
internet?); middleware (any rate limit at all?); repo (does
`loadtest/` exist?).

## The lazy rule

Platform config > custom code: RLS > app-level checks, PgBouncer >
homemade pooling, CDN/headers > custom cache, platform rate limiter >
hand-rolled middleware. Always recommend the highest rung that holds.

## Output

Findings ranked, one line each. Close with:
`exposure: <N> critical, <M> high.` If nothing: `Locked down. Ship.`

## Limits

Reports, doesn't fix — fixes go to braves-fix or the braves-audit
runbook. Over-engineering isn't this skill's concern (that's
braves-audit). Never run exploits or touch production data:
verification is by reading code and configs only.
