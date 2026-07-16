---
name: wordpress-spanish
description: Use when translating WordPress plugin strings to Spanish (es_ES) for GlotPress or .po files, following WordPress España community standards and official glossary.
---

# WordPress Spanish Translation (es_ES)

Speak to the user in the `language` set in `~/.claude/braves-skills.json`;
if unset, mirror the language the user writes in.

## Overview
Translates WordPress plugin strings to Spanish (es_ES) following the
official glossary and the WordPress España team's guide. Updates the
plugin's `.po` file, ready to import into `translate.wordpress.org`.

## Workflow

1. Read `languages/<plugin>-es_ES.po` (or `.pot` if no `.po` exists)
2. Identify entries with an empty `msgstr ""` or marked `#, fuzzy`
3. Translate applying the rules and glossary below
4. Write the updated `.po` to the same file
5. The file is ready to import into GlotPress as "suggested"

## Golden rules

- **Informal "tú"** — never "usted". Imperatives: `haz`, `ve`, `configura`, `añade`
- **No double capitals** — `Subir archivo` not `Subir Archivo` (anglicism)
- **Spanish quotes** — «» always, never `""` or `''` in translated text
- **Contextual translations**, not literal ones
- **Preserve variables exactly** — `%s`, `%d`, `%1$s`, `{{var}}`, inline HTML (`<strong>`, `<a href="%s">`) unmodified, not reordered
- **Don't translate** — plugin/theme names, `ajax`, `blog`, `feed`, `FAQ`, `banner`, `hostname`, `JavaScript`, `commit`, `cookie`, `WordPress`, `WooCommerce`, `slug`, `widget`, `nonce`

## Critical glossary

| English | Correct Spanish | Don't use |
|--------|-----------------|---------|
| add | añadir | agregar |
| authenticate | identificar | autenticar, autentificar |
| authentication | identificación | autenticación |
| backup | copia de seguridad | backup |
| bulk / bulk actions | por lotes / acciones en lote | en masa |
| cart | carrito | carro, cesta |
| checkout | finalizar compra | checkout |
| click / make clic | hacer clic / clic | click con K |
| computer | ordenador | computador, computadora |
| content | contenido | contenidos (plural genérico) |
| dashboard | Escritorio | tablero, panel de control |
| delete | borrar | eliminar |
| deselect | anular selección | deseleccionar |
| email | correo electrónico | email, e-mail |
| enable / disable | activar / desactivar | habilitar |
| encrypt / encryption | cifrar / cifrado | encriptar, encriptación |
| expiration / expire / expired | caducidad / caducar / caducado | expiración, expirar, expirado |
| feature | característica | feature |
| feel free to | no dudes en | siéntete libre de |
| frontend / front-end | portada / vista pública | frontend |
| GDPR | RGPD | GDPR en texto corrido |
| hide | ocultar | esconder |
| hook | gancho | hook |
| hosting / hoster | alojamiento / proveedor | hosting |
| in order to | para | con el fin de |
| invalid | no válido | inválido |
| issue | problema / incidencia | issue |
| library | biblioteca | librería |
| link / to link | enlace / enlazar | link, vínculo, vincular, linkear |
| log in / log out | acceder / salir | iniciar sesión, cerrar sesión |
| logged in / logged out | conectado / desconectado | — |
| manage / management | gestionar / gestión | administrar, administración |
| overview | resumen / vista general | overview |
| plugin | plugin | complemento, extensión |
| settings | ajustes | configuración (salvo contexto técnico) |
| tag | etiqueta | tag |
| template | plantilla | template |
| thumbnail | miniatura | thumbnail |
| upload | subir | cargar |
| username | nombre de usuario | usuario (ambiguo) |

## Plurals in .po

```
msgid "%d comment"
msgid_plural "%d comments"
msgstr[0] "%d comentario"
msgstr[1] "%d comentarios"
```
Spanish: `nplurals=2; plural=(n != 1);` — singular for n=1, plural for
the rest.

## Common mistakes

| Mistake | Fix |
|-------|-----------|
| Translating `%s` or variables | Copy exactly from `msgid` |
| `Gestionar Ajustes` | `Gestionar ajustes` |
| Using "usted" in imperatives | `configura`, `añade`, `haz clic` |
| "plugin" → "complemento" | always `plugin` |
| Skipping the space before `%s` | Respect the `msgid`'s spacing |
| `WordPress` → `Wordpress` | always `WordPress` with capital P |

## ⚠️ IMPORTANT — Output after editing the .po

**NEVER** show a summary of changes in the console. The diff is already
visible. Zero text explaining what was changed.

## GlotPress context

- Translations come in as **suggested** — a GTE approves them
- The language pack is generated automatically once the *Stable (latest
  release)* sub-project reaches **90%**
- Don't generate `.mo` or JSON — WordPress.org distributes them from its
  CDN
- The updated `.po` is imported at `translate.wordpress.org` → plugin
  project → `es_ES` → Import
