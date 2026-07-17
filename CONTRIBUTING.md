**Español** | [English](CONTRIBUTING.en.md)

# Contribuir a braves-skills

Gracias por considerar una contribución. Unas pocas reglas mantienen esta
caja de herramientas consistente y fácil de mantener.

## Mensajes de commit

Usa [Conventional Commits](https://www.conventionalcommits.org/):
`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, etc.

No agregues líneas de atribución de IA (p. ej. `Co-Authored-By: Claude`) a
los mensajes de commit.

## Idioma

El contenido de las skills (los prompts que Claude lee) se escribe en
inglés. El idioma en el que Claude le habla al usuario es español por
defecto, configurable con el campo `language` de
`~/.claude/braves-skills.json`. El README y esta guía son bilingües: el
archivo `.md` (español, el que GitHub muestra por defecto) y su gemelo
`.en.md` (inglés) — actualiza ambos cuando cambies uno.

Los triggers del `description` en el frontmatter son bilingües: mantén los
triggers en español junto a sus equivalentes en inglés, para que la skill
se dispare sin importar en qué idioma escriba el usuario.

## Agregar una skill

- Una skill por directorio: `skills/<nombre>/SKILL.md` con frontmatter YAML
  (`name`, `description`).
- Registra la skill nueva en `.claude-plugin/plugin.json`, en el array
  `skills`.
- Mantén las skills concisas, imperativas y testeables. Pruébalas con una
  sesión de agente limpia antes de abrir un PR.

## Pull requests

- `master` está protegida: solo el mantenedor (Carlos Vera) commitea
  directo. Todos los demás trabajan en una rama nueva, abren un PR y el
  mantenedor verifica y mergea.
- Los PRs se mergean con squash. Rama destino: `master`.
- Diffs mínimos — nada de refactors de paso mezclados con cambios que no
  vienen al caso.

## Releases

Las actualizaciones salen como releases de GitHub:

1. Sube `version` en `.claude-plugin/plugin.json` (semver).
2. Etiqueta el commit: `git tag vX.Y.Z && git push origin vX.Y.Z`.
3. Publica: `gh release create vX.Y.Z --title "..." --notes "..."`.

Los usuarios actualizan con `git -C ~/.claude/skills/braves-skills pull`.

## Licencia

MIT. Las contribuciones se aceptan bajo la misma licencia — ver
[LICENSE](LICENSE).
