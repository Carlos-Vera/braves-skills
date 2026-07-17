# Contributing to braves-skills

Thanks for considering a contribution. A few rules keep this toolbox
consistent and easy to maintain.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):
`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, etc.

Do not add AI attribution lines (e.g. `Co-Authored-By: Claude`) to commit
messages.

## Language

Skill content (the prompts Claude reads) is written in English. The
language Claude speaks with the user defaults to Spanish, overridable via
the `language` field in `~/.claude/braves-skills.json`. The README is
bilingual: `README.md` (Spanish, the default GitHub sees) and
`README.en.md` (English) — update both when you change one.

Frontmatter `description` triggers are bilingual: keep the existing Spanish
user-utterance triggers alongside their English equivalents, so a skill
fires regardless of which language the user writes in.

## Adding a skill

- One skill per directory: `skills/<name>/SKILL.md` with YAML frontmatter
  (`name`, `description`).
- Register the new skill in `.claude-plugin/plugin.json`, in the `skills`
  array.
- Keep skills concise, imperative, and testable. Test with a clean agent
  session before opening a PR.

## Pull requests

- PRs are squash-merged. Target branch: `master`.
- Keep diffs minimal — no drive-by refactors bundled with unrelated
  changes.

## Releases

Updates ship as GitHub releases:

1. Bump `version` in `.claude-plugin/plugin.json` (semver).
2. Tag the commit: `git tag vX.Y.Z && git push origin vX.Y.Z`.
3. Publish: `gh release create vX.Y.Z --title "..." --notes "..."`.

Users update with `git -C ~/.claude/skills/braves-skills pull`.

## License

MIT. Contributions are accepted under the same license — see
[LICENSE](LICENSE).
