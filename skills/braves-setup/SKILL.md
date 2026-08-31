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
7. **Gemini Notebook** — explain in 2-3 lines: "braves-save can upload a log
   of each session to an 'AI Brain' notebook in Gemini Notebook,
   searchable and one you can chat with or generate podcasts/reports
   from (braves-notebook). Uses the unofficial notebooklm-py library
   with your Google account." Ask if they want to enable it.
   - If YES: follow "Step 0: Setup (Runs Automatically on First Use)"
     from the braves-notebook skill (install the CLI in a venv +
     browser-assisted login) and once done verify with
     `notebooklm auth check`. Save `enabled: true`.
   - If NO: save `enabled: false`. braves-save will work locally only.
   - Either way, don't ask for project tags or notebooks here: braves-save
     registers each project in `projects` the first time it saves from it
     (tag for the filename, notebook for the upload), so the question lands
     when it has an obvious answer.
8. **Copy voice** — the `humanizar` skill rewrites copy with BravesLab's
   brand voice by default. Ask if the user wants to customize it with
   their own voice.
   - If NO: save `"voice": { "custom": false }` (BravesLab voice).
   - If YES: ask the necessary questions ONE AT A TIME — brand/project
     name, tone (e.g. warm, professional, technical), tuteo or usted,
     target audience, words/phrases to prefer, words to ban, and 1-2
     short example snippets the user likes. Write the resulting style
     guide to `~/.claude/braves-voice.md` and save
     `"voice": { "custom": true, "file": "~/.claude/braves-voice.md" }`.
9. **Sound alerts** — Claude can play one sound when it needs permission
   (or has been waiting on the user) and another when it finishes a task.
   Ask if the user wants them (default: yes).
   - If NO: don't write the `sounds` block — the hooks stay silent.
   - If YES **on macOS**: ask whether they want to pick the sounds
     themselves. If they decline, use the defaults `Illuminate`
     (permission) and `Stargaze` (done). If they accept, play them a
     batch — the hook has a preview mode that announces each tone by
     number and localized name, spoken in the user's `language`, then
     plays it:
     ```bash
     sh "$CLAUDE_PLUGIN_ROOT/hooks/braves-sound.sh" preview Illuminate Stargaze Glass Complete
     ```
     Enumerate the catalogs at runtime (`ls`), never from a hardcoded
     list, since Apple changes the sets between releases:
     ```
     /System/Library/Sounds/*.aiff                      # 14 alert sounds
     $TL/Ringtones/*.m4r                                # ringtones
     $TL/AlertTones/Modern/*.m4r                        # short cues
     $TL/AlertTones/Classic/*.m4r                       # short cues
     # TL=/System/Library/PrivateFrameworks/ToneLibrary.framework/Versions/A/Resources
     ```
     There are ~120 of them: never dump the whole list or preview it in
     one go. Offer 4-6 per round, ask which one they liked, and let them
     ask for more. Pass **file base names** (`Illuminate`, `News Flash`)
     — no extension, no path — and store that same name in the config;
     the hook resolves the path and the display name on its own.
   - If YES **on Windows or Linux**: nothing to choose — Windows plays the
     standard system sounds (Exclamation for permission, Asterisk for
     done) and Linux falls back to `paplay`. Save the macOS defaults
     anyway so the same config works on a Mac later.

   Save `"sounds": { "permission": "Illuminate", "done": "Stargaze" }`.
10. **Context checkpoint** — explain in two lines: "when the session passes a
   percentage of the context window I'll offer to run /braves-save, and if
   tasks are left I'll hand you a block to paste into a new conversation and
   carry on from there." Ask whether they want it (default: yes) and at what
   percentage (default: 40 — past that the log starts losing detail).
   - If YES: save `"context_checkpoint": { "enabled": true, "threshold": 40 }`
     with their percentage.
   - If NO: save `"context_checkpoint": { "enabled": false }` — the hook stays
     quiet.
   It re-arms every 15 points above the threshold, so declining once doesn't
   silence it for the rest of the session.

   **If YES, wire it before moving on — otherwise it can never fire.** Claude
   Code computes `context_window.used_percentage` itself and passes it **only**
   to the `statusLine` command; hook payloads never carry it. With nothing
   caching that number the checkpoint stays silent by design, because the
   alternative is guessing a window size and nagging a 1M-window session five
   times too early. Read `statusLine` from `~/.claude/settings.json`:
   - **Not configured:** offer to set it to
     `sh "<plugin>/scripts/statusline-context.sh"`. It prints a minimal
     `model · folder · N% ctx` bar and writes the cache. It replaces nothing,
     because there is nothing there.
   - **Already configured:** NEVER overwrite it. Read their script first, then
     show the one line to add right after it reads stdin, and offer to add it:
     ```sh
     printf '%s' "$input" | sh "<plugin>/scripts/statusline-context.sh" >/dev/null
     ```
     Adapt `$input` to whatever variable their script keeps the payload in. If
     it doesn't keep the payload at all, say so and leave it alone rather than
     guessing.
   - **Wiring declined:** say plainly that the checkpoint will never fire, and
     that this is silence rather than a wrong number.
11. **MCP servers** — offer to install a curated set of MCPs (multi-select,
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
   # N8N_API_KEY (placeholder + user pastes in editor), then:
   chmod 600 ~/.claude/n8n-instances/<alias>.json
   # write the alias into ~/.claude/n8n-instances/active, then register
   # the launcher:
   claude mcp add --scope user n8n-mcp -- sh ~/.claude/skills/braves-skills/scripts/n8n-launcher.sh
   claude mcp add --scope user context7 -- pnpm dlx @upstash/context7-mcp
   ```
   Exception: if a credential already lives in a local file the user
   controls (e.g. `~/.claude/n8n-instances/<alias>.json`), resolve it
   with shell command substitution at run time instead of using the
   placeholder — e.g.
   `-e N8N_API_KEY="$(jq -r '.N8N_API_KEY' ~/.claude/n8n-instances/<alias>.json)"`.
   Never paste the value as a literal into the command: a literal secret
   lands in the tool call and is persisted in the session transcript.
   Save the installed names in `"mcps": [...]`. Remind the user to
   restart Claude Code so the new MCPs load.
12. **Adoption of own skills, MCPs and plugins** — same behavior for the
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
     that are NOT in step 11's curated set. Adopt = append the server to
     step 11's curated list in this SKILL.md (name, one-line purpose,
     install command with `PASTE_YOUR_KEY_HERE` for any secret) and
     record it in the config's `mcps`.
   - **Plugins**: list installed plugins (`claude plugin list` or
     `~/.claude/plugins/`) that aren't braves-skills itself. Adopt =
     record the name in the config's `plugins` so setup on another
     machine offers to install them as part of the user's standard kit.
13. **Usage check (re-runs only)** — for each configured MCP, adopted or
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
14. **Subagent house rules** — explain in one line: "when I delegate work
    to a subagent it starts blind to this session's context, so a hook
    injects a short version of the house rules (English artifacts,
    lazy-code discipline, no client names, modern CLI tooling, your
    commit footer if configured) into every one." Ask if they want it
    enabled (default: yes — matches what the hook already does when the
    key is absent).
    - If YES (or default): save `"subagent_rules": { "enabled": true }`.
    - If NO: save `"subagent_rules": { "enabled": false }` — subagents
      start with no injected context.

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
  "projects": { "/abs/path/to/repo": { "tag": "PRJ", "name": "Project name", "notebook": "<id>" } },
  "voice": { "custom": false },
  "sounds": { "permission": "Illuminate", "done": "Stargaze" },
  "context_checkpoint": { "enabled": true, "threshold": 40 },
  "mcps": [],
  "plugins": [],
  "adopted_skills": [],
  "subagent_rules": { "enabled": true }
}
```

`subagent_rules.enabled` (boolean, default `true`) controls whether the
SubagentStart hook (`hooks/braves-subagent.sh`) injects the house-rules
block (English artifacts, lazy-code discipline, no client names, modern
CLI tooling, commit footer if configured) into every delegated subagent.
The hook already behaves as enabled when the key is absent, so it only
needs to be written when the user opts out.

## Closing

Confirm in 2-3 lines: configuration saved, what got enabled, and that
`/braves-help` shows the full toolbox. If the user declines onboarding,
don't push it: the hook will remind them next session.

## Limits

Doesn't make commits or touch the user's repos; only configures.
Re-runnable: if the config already exists, show the current values and
ask what to change.
