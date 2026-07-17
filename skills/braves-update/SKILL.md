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

Speak to the user in the `language` set in `~/.claude/braves-skills.json`;
if unset, default to Spanish.

Plugin root: `~/.claude/skills/braves-skills` (a git clone).

## Check

1. `git -C <root> fetch --tags --quiet origin`
2. Latest version = highest `v*` tag. Installed version = `version` in
   `<root>/.claude-plugin/plugin.json`.
3. Equal → tell the user they're up to date (vX.Y.Z) and stop.
4. Newer → show what's new: `gh release view v<latest>` if `gh` is
   available, otherwise list the tags between installed and latest.

## Update

1. If `git -C <root> status --short` shows local changes, report them and
   STOP — never stomp the user's modifications.
2. Ask before applying, unless the user already asked to update.
3. `git -C <root> pull --ff-only origin master`
4. Confirm the new version from plugin.json and remind the user to restart
   Claude Code (or run /reload-plugins) so the new version loads.

## Limits

Read-only until the user confirms the pull; never force-pushes, never
discards local changes.
