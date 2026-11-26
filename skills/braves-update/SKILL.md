---
name: braves-update
description: >
  Use when the user says "/braves-update", "actualiza braves" (update
  braves), "¿hay actualización de braves?" (is there a braves update?),
  "update the toolbox", or when the SessionStart hook reports that a newer
  braves-skills version is available. Checks the latest release and updates
  the plugin on demand.
license: MIT
---

# Braves Update

Plugin root: `~/.claude/skills/braves-skills` (a git clone).

## Check

1. `git -C <root> fetch --tags --quiet origin`
2. Latest version = highest `v*` tag. Installed version = `version` in
   `<root>/.claude-plugin/plugin.json`.
3. Equal → tell the user they're up to date (vX.Y.Z), run **Mods**
   below, and stop.
4. Newer → show what's new: `gh release view v<latest>` if `gh` is
   available, otherwise list the tags between installed and latest.

## Update

1. If `git -C <root> status --short` shows local changes, report them and
   STOP — never stomp the user's modifications.
2. Ask before applying, unless the user already asked to update.
3. `git -C <root> pull --ff-only origin master`
4. Run **Mods** below.
5. Confirm the new version from plugin.json and remind the user to restart
   Claude Code (or run /reload-plugins) so the new version loads.

## Mods

The optional mods (braves-panel, image-preview, quick-peek, and any added
later) are separate plugins: Claude Code runs each from an installed copy
that the pull above doesn't refresh. Update every one that
`claude plugin list` shows as `<name>@braves-skills`:

```bash
claude plugin marketplace update braves-skills
for p in $(claude plugin list | grep -o '[a-z0-9-]*@braves-skills' | sort -u); do
  claude plugin update "$p"
done
```

Report the old → new version each one prints (or "already up to date"); a
new version needs a Claude Code restart. None installed → skip silently.

## After updating

Name any skill the update added that wasn't there before (diff `skills/`
against the pre-pull list, or read it off the release notes). If one of them
is configured by `/braves-setup` — right now `caveman`, with its "caveman
mode for dispatched subagents" toggle — offer `/braves-setup` to set it;
until the user runs it the default applies (caveman on for subagents).

## Limits

Read-only until the user confirms the pull; never force-pushes, never
discards local changes.
