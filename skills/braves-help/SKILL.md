---
name: braves-help
description: >
  Use when the user says "/braves-help", "braves help", "ayuda braves"
  (Spanish for "braves help"), "qué skills tengo"/"what skills do I have",
  "muéstrame la caja"/"show me the toolbox", "qué hace cada skill"/"what
  does each skill do", or asks which skill in the braves toolbox to use for
  a task. One-time display, not a persistent mode.
license: MIT
---

# Braves Help

Speak to the user in the `language` set in `~/.claude/braves-skills.json`;
if unset, mirror the language the user writes in.

Shows the full toolbox. One-time display, no side effects.

## Output

Print this table as-is (only adapt the configuration status):

```
BRAVES SKILLS — BravesLab toolbox (full lifecycle)

 Lifecycle:
 /braves-start → /fable-plan → /braves-opinion → [build] →
 /braves-security → /braves-audit → /braves-fix → /braves-ship → /braves-save

 Skill            When to use it
 ─────────────    ─────────────────────────────────────────────────────────
 /braves-setup    First time or onboarding: git identity, commit
                  signature, PR/merge policy, NotebookLM, adoption of
                  custom skills.
 /braves-start    Kick off a project: generates PRD, TRD, UI/UX, Flow,
                  Backend, and Plan BEFORE touching code.
 /fable-plan      Before developing any feature: the questions Fable
                  would ask → phased plan with verification.
 /braves-opinion  Devil's advocate: constructive criticism without
                  flattery. Verdict SHIP / SHIP WITH CHANGES / RETHINK /
                  KILL.
 /braves-security The lock: infra security audit (secrets, proxy, RLS,
                  pooling, cache, rate limits, load) + code (OWASP).
                  Report only.
 /braves-audit    Global audit (security + over-engineering +
                  performance). Writes an executable braves-audit-DATE.md
                  at the repo root.
 /braves-fix      Fixes bugs with mandatory evidence. If a
                  braves-audit-DATE.md exists at the root, executes it
                  step by step.
 /braves-ship     Professional close-out: pre-flight, commit with your
                  signature, PR/merge per your configuration, release
                  checklist.
 /braves-save     Session close: memories + log to the NotebookLM Brain
                  notebook.
 /braves-notebook Full NotebookLM API (podcasts, reports, quizzes,
                  sources, downloads).
 /braves-help     This table.
```

## Support skills (adopted)

```
 Skill                   What it does
 ──────────────────────  ──────────────────────────────────────────────────
 /desarrollo             Plans a feature and builds it via delegated
                         agents.
 codebase-memory         Structural code queries via the
                         codebase-memory-mcp graph.
 delegate-by-default     Orchestrator mode: dispatch subagents instead of
                         working inline.
 humanizar               BravesLab brand voice for Spanish copy.
 n8n-workflow-builder    Build/debug n8n workflows with validation and CVE
                         check.
 wordpress-spanish       es_ES translation for WordPress plugins.
```

## After the table

1. Check whether `~/.claude/braves-skills.json` exists. If it does NOT
   exist, add: "Configuration pending — run `/braves-setup` for the
   one-time onboarding."
2. If the user asked about a specific task ("which one do I use for X?"),
   recommend ONE skill and why, in one line.

## Limits

Only displays. Doesn't execute any other skill or modify anything.
