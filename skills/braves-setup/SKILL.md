---
name: braves-setup
description: >
  Use when the user says "/braves-setup", "configura braves" (set up
  braves), "onboarding braves" (braves onboarding), when the SessionStart
  hook detects a first-time install (no ~/.claude/braves-skills.json
  exists), or when braves-ship or braves-save need configuration that
  doesn't exist yet.
license: MIT
---

# Braves Setup

Speak to the user in the `language` set in `~/.claude/braves-skills.json`;
if unset, default to Spanish.

One-time onboarding for the toolbox. Ask the questions ONE AT A TIME
(wait for the answer before the next; in Claude Code use AskUserQuestion
when applicable) and save the result to `~/.claude/braves-skills.json`.

## Questions (in this order)

1. **Language** — "Which language should Claude use to talk with you?"
   Offer at least Español / English plus free text for any other, with
   Español as the recommended default. Store it as
   `"language": "<short code or name, e.g. es, en>"`. From the
   moment the user answers, the rest of the onboarding continues in that
   language.
2. **Identity for commits** — GitHub username and email to use in
   commits. Propose the ones from `git config --global user.name /
   user.email` if they exist; the user confirms or corrects.
3. **Do I make the commits for you?** — options: `always` (I commit when
   closing out work), `ask` (I propose a message and wait for ok),
   `never` (I only prepare the message, the user commits).
4. **Commit signature** — free text that goes in the footer of every
   commit (can be empty). Show an example:
   ```
   Author: Name <email>
   ---
   Optional personal line.
   ```
5. **AI co-authorship** — explain in one line: "by default I do NOT add
   `Co-Authored-By: Claude...` lines or AI mentions in commits". Only
   enable it if the user explicitly requests it here. Default: `false`.
6. **PR and merge** — do I create PRs or just branches? preferred merge
   strategy (merge / squash / rebase)? can I merge myself or does the
   user always merge? is direct push to main allowed? (default: no).
   Then, releases:
   - **Versioning convention** — bump `0.0.1` (patch) on every change,
     classic semver (patch=fix, minor=feature, major=breaking), or their
     own rule (free text, stored verbatim).
   - **When to release** — releases are NEVER published without asking
     first, and never one per change. Claude recommends a release at key
     moments (feature complete, security fix, breaking change) and waits
     for an explicit yes. Ask if the user wants those recommendations
     (default: yes).
7. **NotebookLM** — explain in 2-3 lines: "braves-save can upload a log
   of each session to an 'AI Brain' notebook in Google NotebookLM,
   searchable and one you can chat with or generate podcasts/reports
   from (braves-notebook). Uses the unofficial notebooklm-py library
   with your Google account." Ask if they want to enable it.
   - If YES: follow "Step 0: Configuration" from the braves-notebook
     skill (install the CLI in a venv + browser-assisted login) and once
     done verify with `notebooklm auth check`. Save `enabled: true`.
   - If NO: save `enabled: false`. braves-save will work locally only.
8. **MCP servers** — offer to install a curated set of MCPs (multi-select,
   none pre-selected). One line each:
   - **Perplexity** — AI web search from the conversation. Needs
     `PERPLEXITY_API_KEY` (perplexity.ai → Settings → API).
   - **Firecrawl** — crawl/scrape websites into clean markdown. Needs
     `FIRECRAWL_API_KEY` (firecrawl.dev).
   - **Chrome DevTools** — frontend debugging: console, network,
     performance traces on a real Chrome. No key.
   - **Playwright** — drive a browser: navigate, fill forms, test sites,
     automate flows. No key.
   - **Codebase memory** — persistent code knowledge graph (who calls
     what, architecture queries). Binary install.
   - **n8n** — build/validate/deploy n8n workflows. Needs the instance
     URL + API key (n8n → Settings → API).
   - **Context7** — up-to-date library/framework docs fetched into the
     conversation. No key required.

   For each one selected, help configure it. **Never ask the user to
   paste an API key into the chat** (it would be exposed in the
   conversation): install with the placeholder `PASTE_YOUR_KEY_HERE` as
   the env value, then open `~/.claude.json` in their editor and point
   them to the exact spot (`mcpServers.<name>.env.<VAR>`) to paste the
   key themselves. Verify with `claude mcp list` once they confirm.
   Use `pnpm dlx` if pnpm exists, else `npx -y`:
   ```bash
   claude mcp add --scope user perplexity -e PERPLEXITY_API_KEY=PASTE_YOUR_KEY_HERE -- pnpm dlx server-perplexity-ask
   claude mcp add --scope user firecrawl -e FIRECRAWL_API_KEY=PASTE_YOUR_KEY_HERE -- pnpm dlx firecrawl-mcp
   claude mcp add --scope user chrome-devtools -- pnpm dlx chrome-devtools-mcp@latest
   claude mcp add --scope user playwright -- pnpm dlx @playwright/mcp@latest
   # Codebase memory: install the binary per
   # github.com/DeusData/codebase-memory-mcp, then run:
   codebase-memory-mcp install
   # n8n (named instances, switchable without restarting Claude Code):
   # create ~/.claude/n8n-instances/<alias>.json with N8N_API_URL and
   # N8N_API_KEY (placeholder + user pastes in editor), write the alias
   # into ~/.claude/n8n-instances/active, then register the launcher:
   claude mcp add --scope user n8n-mcp -- sh ~/.claude/skills/braves-skills/scripts/n8n-launcher.sh
   claude mcp add --scope user context7 -- pnpm dlx @upstash/context7-mcp
   ```
   Exception: if a credential already lives in a local file the user
   controls (e.g. `~/.claude/n8n-instances/<alias>.json`), read it from
   there in the shell command directly — without printing it — instead
   of using the placeholder.
   Save the installed names in `"mcps": [...]`. Remind the user to
   restart Claude Code so the new MCPs load.
9. **Adoption of own skills, MCPs and plugins** — same behavior for the
   three kinds of user assets. Always evaluate redundancy in one line,
   adopt only with explicit approval, item by item; for redundant ones,
   say what they collide with and suggest retiring (the user's decision,
   never delete without permission).
   - **Skills**: list the directories under `~/.claude/skills/` and the
     project's `.claude/skills/` that do NOT belong to the toolbox or to
     known plugins. Adopt = copy to `skills/<name>/` inside the
     braves-skills plugin and add to the `skills` array in
     `.claude-plugin/plugin.json`.
   - **MCPs**: read the user's configured servers (`claude mcp list`)
     that are NOT in step 8's curated set. Adopt = append the server to
     step 8's curated list in this SKILL.md (name, one-line purpose,
     install command with `PASTE_YOUR_KEY_HERE` for any secret) and
     record it in the config's `mcps`.
   - **Plugins**: list installed plugins (`claude plugin list` or
     `~/.claude/plugins/`) that aren't braves-skills itself. Adopt =
     record the name in the config's `plugins` so setup on another
     machine offers to install them as part of the user's standard kit.
10. **Usage check (re-runs only)** — for each configured MCP, adopted or
    user skill, and installed plugin, find its last use by searching the
    session transcripts in `~/.claude/projects/*/*.jsonl` (`rg -l
    "mcp__<server>__"` for MCPs; the skill/plugin name for the rest) and
    taking the newest matching file's mtime. Report every item unused
    for 30+ days with the days since last use. An item that never
    appears must still get a number: report its install age (directory
    birth time, `stat -f %B` on macOS) plus how many days the retained
    history covers (oldest transcript's age) — e.g. "installed 90 days
    ago, no use in the 45 days of history". Then ask item by item
    whether to uninstall/retire it
    (`claude mcp remove <name>`, delete the skill directory, `claude
    plugin uninstall <name>`). Before each removal, check what it
    collides with and say in one line how things end up: what else
    references it (hooks, other skills' SKILL.md, config entries, index
    skills) and what covers the gap afterwards — a native feature, a
    toolbox skill, or nothing (a real loss the user accepts). After
    removing, fix or flag any dangling reference found. Never remove
    anything without an explicit yes, and keep `mcps`, `plugins` and
    `adopted_skills` in the config in sync with the outcome.

## Writing the configuration

Save to `~/.claude/braves-skills.json`:

```json
{
  "version": 1,
  "language": "es",
  "github_user": "user",
  "git_email": "email",
  "commits_by_claude": "always|ask|never",
  "coauthor_ai": false,
  "commit_signature": "signature text or \"\"",
  "pr": { "create": true, "merge_strategy": "squash", "who_merges": "user", "direct_push_main": false },
  "releases": { "versioning": "patch-per-change|semver|<custom rule>", "always_ask": true, "recommend_at_key_moments": true },
  "notebooklm": { "enabled": false },
  "mcps": [],
  "plugins": [],
  "adopted_skills": []
}
```

## Closing

Confirm in 2-3 lines: configuration saved, what got enabled, and that
`/braves-help` shows the full toolbox. If the user declines onboarding,
don't push it: the hook will remind them next session.

## Limits

Doesn't make commits or touch the user's repos; only configures.
Re-runnable: if the config already exists, show the current values and
ask what to change.
