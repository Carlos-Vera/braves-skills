<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="media/Braves_Skills_white.svg">
    <img src="media/Braves_Skills_black.svg" alt="braves-skills" width="360">
  </picture>
</p>

**English** | [Español](README.md)

# braves-skills

BravesLab's all-in-one toolbox for Claude Code: 17 skills that cover a
project's full lifecycle (11 lifecycle skills + 6 support skills), so you
don't have to remember 40 loose skills.

## The lifecycle

```
/braves-start → /fable-plan → /braves-opinion → [build] →
/braves-security → /braves-audit → /braves-fix → /braves-ship → /braves-save
```

| Skill | What it does |
|-------|----------|
| `/braves-help` | Shows this toolbox and which skill to use for each task. |
| `/braves-setup` | One-time onboarding: git identity, commit signature (AI co-authorship OFF by default), PR/merge policy, optional NotebookLM, adoption of your own skills. |
| `/braves-start` | Project kickoff: PRD, TRD, UI/UX, Flow, Backend and Plan before touching code. |
| `/fable-plan` | The questions a senior architect asks before building → a phased plan with verification. |
| `/braves-opinion` | Devil's advocate: constructive critique without flattery. Verdict SHIP / SHIP WITH CHANGES / RETHINK / KILL. |
| `/braves-security` | The lock: infra audit (secrets, API proxying, RLS, pooling, cache, rate limits, load testing with k6/Artillery) + code (OWASP). |
| `/braves-audit` | Global audit (security + over-engineering + performance). Writes an executable `braves-audit-DATE.md` at the repo root. |
| `/braves-fix` | Fixes bugs with mandatory evidence; runs the `braves-audit-DATE.md` runbook if one exists. |
| `/braves-ship` | Professional close-out: pre-flight checks, commit with your signature, PR/merge per your configuration, release checklist. |
| `/braves-save` | Session close: memories + log entry to the AI Brain notebook (NotebookLM). |
| `/braves-notebook` | Full Google NotebookLM API (sources, podcasts, reports, quizzes, downloads). |

### Support skills (adopted)

| Skill | What it does |
|-------|----------|
| `/desarrollo` | Plan a feature and build it via delegated agents. |
| `codebase-memory` | Structural code queries via the codebase-memory-mcp graph. |
| `delegate-by-default` | Orchestrator mode: dispatch subagents instead of working inline. |
| `humanizar` | BravesLab brand voice for Spanish copy. |
| `n8n-workflow-builder` | Build/debug n8n workflows with validation and CVE check. |
| `wordpress-spanish` | es_ES translation for WordPress plugins. |

## Installation

Clone (or copy) into Claude Code's skills directory:

```bash
git clone https://github.com/Carlos-Vera/braves-skills ~/.claude/skills/braves-skills
```

It auto-loads on the next session as `braves-skills@skills-dir` (or run
`/reload-plugins` to load it right away). On the first session, a hook
detects there's no configuration yet and offers to run `/braves-setup`.

## Configuration

`/braves-setup` is a one-time onboarding flow (re-runnable any time to
change values later). It asks one question at a time:

1. Language Claude should use with you.
2. Git identity for commits.
3. Whether Claude commits for you (always / ask / never).
4. Commit signature (free-text footer).
5. AI co-authorship in commits — OFF by default.
6. PR & merge policy (create PRs?, merge strategy, who merges, direct push to main — default no) and release policy (versioning convention — patch-per-change, semver or your own; releases are never published without asking, with recommendations at key moments).
7. Optional NotebookLM integration (session logs sent to an "AI Brain" notebook via the unofficial `notebooklm-py` CLI, browser-assisted Google login).
8. Optional MCP servers, with guided configuration: Perplexity (AI web search), Firecrawl (site crawling/scraping), Chrome DevTools (frontend debugging), Playwright (browser automation and testing), Codebase memory (code knowledge graph), n8n (workflow building).
9. Adoption of your own skills, MCPs and plugins into the toolbox: skills are copied into the plugin, extra MCPs join the curated set, and plugins are recorded as part of your standard kit for new machines.

The configuration lives at `~/.claude/braves-skills.json`:

```json
{
  "version": 1,
  "language": "en",
  "github_user": "your-github-user",
  "git_name": "Your Name",
  "git_email": "you@example.com",
  "commits_by_claude": "ask",
  "coauthor_ai": false,
  "commit_signature": "Author: Your Name <you@example.com>",
  "pr": {
    "create": true,
    "merge_strategy": "squash",
    "who_merges": "user",
    "direct_push_main": false
  },
  "notebooklm": { "enabled": false },
  "releases": { "versioning": "semver", "always_ask": true, "recommend_at_key_moments": true },
  "mcps": [],
  "plugins": [],
  "adopted_skills": []
}
```

All skills speak to you in the configured `language` (fallback: defaults to
Spanish if `language` is unset).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add or change skills.

## Credits

- The audit skills inherit the philosophy and format of
  [ponytail](https://github.com/DietrichGebert/ponytail) (MIT, Dietrich
  Gebert), of which this project is a conceptual fork.
- `braves-save` and `braves-notebook` are ports of
  [BrainClaude](https://github.com/Carlos-Vera/BrainClaude) (Carlos Vera).

## License

MIT — see [LICENSE](LICENSE).
