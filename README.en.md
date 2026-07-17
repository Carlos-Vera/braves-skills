<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="media/Braves_Skills_white.svg">
    <img src="media/Braves_Skills_black.svg" alt="braves-skills" width="360">
  </picture>
</p>

**English** | [Español](README.md)

# braves-skills

The all-in-one toolbox I use in my work with Claude Code. It has 17 skills
covering a project's full lifecycle (11 lifecycle skills + 6 support
skills), because I was going crazy remembering 40 loose skills without
knowing whether they collided or not — braves-skills solves that.

## My work cycle with Claude Code
You can run it like this:

```
/braves-start → /fable-plan → /braves-opinion → [build] →
/braves-security → /braves-audit → /braves-fix → /braves-ship → /braves-save
```

| Skill | What it does |
|-------|----------|
| `/braves-setup` | Lets you set up the working environment so Claude can work with you. Configures: git identity, commit signature (AI co-authorship OFF by default), PR/merge policy, optional NotebookLM, adoption of your own skills. |
| `/braves-help` | Shows this help box so you know which skill to use for each task. |
| `/braves-start` | Project kickoff: helps you create PRD, TRD, UI/UX, Flow, Backend and Plan before touching code. |
| `/fable-plan` | Asks you the questions a senior architect asks before building → a phased plan with verification. |
| `/braves-opinion` | Tenth Man: constructive criticism without flattery. Verdict SHIP / SHIP WITH CHANGES / RETHINK / KILL. |
| `/braves-security` | The padlock: runs an infrastructure audit (secrets, API proxying, RLS, pooling, cache, rate limits, load testing with k6/Artillery) + code (OWASP). |
| `/braves-audit` | Global Audit (security + over-engineering + performance). Writes an executable `braves-audit-DATE.md` at the repo root. |
| `/braves-fix` | Fixes bugs with mandatory evidence; runs the `braves-audit-DATE.md` runbook if one exists. |
| `/braves-ship` | Professional close-out: pre-flight checks, commit with your signature, PR/merge per your configuration, release checklist. |
| `/braves-save` | Session close: memories + log entry to the AI Brain notebook (NotebookLM). (best run before hitting 40% of session context) |
| `/braves-notebook` | Gives you the full Google NotebookLM API (sources, podcasts, reports, quizzes, downloads). Works hand in hand with `/braves-save`: the save uses it as memory when building your AI Brain notebook, which is why saving before 40% of session context is recommended. |

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

`/braves-setup` is a one-time configuration and onboarding flow (re-runnable
any time to change values later). It asks one question at a time:

1. Language Claude should use with you.
2. Git identity for commits.
3. Whether Claude commits for you (always / ask / never).
4. Commit signature (free-text footer).
5. AI co-authorship in commits — OFF by default.
6. PR & merge policy (create PRs?, merge strategy, who merges, direct push to main — default no) and release policy (versioning convention — patch-per-change, semver or your own; releases are never published without asking, with recommendations at key moments).
7. Optional NotebookLM integration (session logs sent to an "AI Brain" notebook via the unofficial `notebooklm-py` CLI, browser-assisted Google login).
8. Optional MCP servers, with guided configuration: Perplexity (AI web search), Firecrawl (site crawling/scraping), Chrome DevTools (frontend debugging), Playwright (browser automation and testing), Codebase memory (code knowledge graph), n8n (workflow building), Context7 (up-to-date library docs).
9. Adoption of your own skills, MCPs and plugins into the toolbox: skills are copied into the plugin, extra MCPs join the curated set, and plugins are recorded as part of your standard kit for new machines.
10. Usage check (on re-runs): audits every MCP, skill and plugin against your session transcripts and tells you the days since last use — always as a number: if something was never used, it shows when it was installed and how many days of history the analysis covers. Before retiring anything it tells you what it collides with and what covers the gap; nothing gets uninstalled without your explicit yes.

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
