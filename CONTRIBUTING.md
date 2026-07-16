# Contributing to braves-skills

Thanks for considering a contribution. A few rules keep this toolbox
consistent and easy to maintain.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):
`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, etc.

Do not add AI attribution lines (e.g. `Co-Authored-By: Claude`) to commit
messages.

## Language

All skill content and documentation is English by default.

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

- PRs are squash-merged. Target branch: `main`.
- Keep diffs minimal — no drive-by refactors bundled with unrelated
  changes.

## License

MIT. Contributions are accepted under the same license — see
[LICENSE](LICENSE).
