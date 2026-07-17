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

   For each one selected, help configure it: ask for the required
   credentials (one at a time), run the install command, then verify
   with `claude mcp list`. Use `pnpm dlx` if pnpm exists, else `npx -y`:
   ```bash
   claude mcp add --scope user perplexity -e PERPLEXITY_API_KEY=<key> -- pnpm dlx server-perplexity-ask
   claude mcp add --scope user firecrawl -e FIRECRAWL_API_KEY=<key> -- pnpm dlx firecrawl-mcp
   claude mcp add --scope user chrome-devtools -- pnpm dlx chrome-devtools-mcp@latest
   claude mcp add --scope user playwright -- pnpm dlx @playwright/mcp@latest
   # Codebase memory: install the binary per
   # github.com/DeusData/codebase-memory-mcp, then run:
   codebase-memory-mcp install
   claude mcp add --scope user n8n -e N8N_API_URL=<url> -e N8N_API_KEY=<key> -- pnpm dlx n8n-mcp
   ```
   Save the installed names in `"mcps": [...]`. Remind the user to
   restart Claude Code so the new MCPs load.
9. **Adoption of own skills** — list the directories under
   `~/.claude/skills/` and the project's `.claude/skills/` that do NOT
   belong to the toolbox or to known plugins. For each of the user's own
   skills, evaluate in one line whether it's redundant with one of the
   toolbox's skills. Offer to adopt the NON-redundant ones: copy them to
   `skills/<name>/` inside the braves-skills plugin and add them to the
   `skills` array in `.claude-plugin/plugin.json`. Only copy with
   explicit approval, skill by skill. For redundant ones: say which
   toolbox skill it collides with and suggest retiring it (the user's
   decision, never delete without permission).

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
  "notebooklm": { "enabled": false },
  "mcps": [],
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
