---
name: braves-start
description: >
  Use when the user says "/braves-start", "arranca un proyecto"/"start a
  project", "nuevo proyecto"/"new project", "empecemos el proyecto"/"let's
  start the project", "cómo empiezo esto"/"how do I start this", or asks
  to create an app/system from scratch. Also when an existing project
  lacks foundational documents (PRD, plan) and large features are about
  to be built on top of it.
license: MIT
---

# Braves Start

Speak to the user in the `language` set in `~/.claude/braves-skills.json`;
if unset, mirror the language the user writes in.

Professional kickoff for any project. The goal: it doesn't collapse a
month in. Not one line of production code before the foundational
documents exist and the user approves them.

## Golden rule

Code without an approved PRD = debt from day zero. If the user asks to
"just do it now," build only a throwaway spike and say so: "this is a
prototype to validate X, the real project starts with the docs."

## Flow

1. **Interview** — use fable-plan's questions (REQUIRED SUB-SKILL:
   fable-plan), one at a time, until you have answers that support
   decisions: problem, user, scope and NON-scope, data, constraints,
   success. Skip whatever context already answers.
2. **Generate the documents** in the project's `docs/`, IN THIS ORDER,
   each short and decisive (max ~2 pages, decisions, not prose):
   - `PRD.md` — problem, users, use cases, scope, explicit NON-scope,
     success metrics.
   - `TRD.md` — chosen stack and why (the most boring option that
     qualifies), external integrations, constraints, technical risks with
     mitigation.
   - `UIUX.md` — user flows screen by screen, wireframes in text or
     mermaid, and ALWAYS the empty / loading / error states of each
     view.
   - `FLUJO.md` — end-to-end data flow: who calls whom, where secrets
     live (the browser never calls external APIs with keys — proxy on
     the server), what gets cached.
   - `BACKEND.md` — data schema with DB constraints, endpoints with auth
     for each one, trust boundaries, RLS/policies if applicable.
   - `PLAN.md` — phased implementation plan.
3. **Submit the docs to braves-opinion** before coding. Incorporate the
   verdict.
4. With approved docs → execute PLAN.md phase by phase (or delegate).

## PLAN.md rules (the anti-collapse rules)

- Every phase ends with something EXECUTABLE and its verification
  (command + expected result). A phase that can't be demonstrated
  running = a poorly cut phase.
- Phase 1 demoable in days, not weeks: end-to-end skeleton (minimal UI →
  API → DB) before any complete feature.
- Every phase fits in one work session. If it doesn't, split it.
- Explicit dependencies between phases. No "phase 9: security" —
  security goes inside each phase (braves-security as a gate before
  closing each one).

## Existing project without docs

Reverse engineering first: read the code and generate the missing docs
from what exists (marking `[ASSUMED]` for anything unverifiable). Then
the normal flow.

## Limits

Doesn't build the project; leaves the documents and plan ready.
Execution is normal fable-plan/desarrollo territory. Don't invent
requirements the user didn't give: ask.
