# Accessibility checklist (braves-audit)

> Condensed from antislop-human (MIT, Miqdad Badjuber; see the root LICENSE).

Each check: what to look for in the code, and the fix to report. Tag
every finding `a11y:`.

## Contrast

- **Low-contrast text.** WCAG AA: 4.5:1 for normal text, 3:1 for large
  text (24px+, or 18.66px+ bold). Grey-on-grey is the most common false
  "passes AA" claim: compute every pairing with the contrast script whose
  path you were given, never by eye.
- **Semi-transparent colours** (`#0008`, `rgba(…, .5)`): blend onto the
  real background first, then check the result. `hsl()`/`oklch()` tokens:
  convert to hex first.
- **Text over a photo or gradient.** Contrast is local; check the worst
  spot the text crosses. Fix: a scrim or a solid block.
- **Non-text contrast.** Button edges, input borders, icons, focus rings,
  chart segments and hover/selected states need 3:1 against their
  neighbours (WCAG 1.4.11).

## Keyboard and focus

- `outline: none` / `outline: 0` with no `:focus-visible` replacement.
- Hover-only menus, click-only dropdowns, drag-and-drop with no keyboard
  path. Everything works with Tab and Enter/Space; dialogs close on Escape.
- DOM order that doesn't match visual order; `tabindex` > 0; interactive
  controls with `tabindex="-1"` outside a roving-tabindex widget or
  focus trap. Fine: skip-link targets and error summaries that only
  receive focus from code. Long pages with no skip link.
- Focus ring invisible, hover-only, or under 3:1 in any shipped theme.

## Semantics and names

- `<div onClick>`, `<span onClick>`, `<a>` without `href`, `<a href="#">`
  for actions. Actions are `<button type="button">`, navigation is a
  real `<a href>`; custom controls need a `role`, state attributes and
  keyboard support.
- Icon-only buttons with no `aria-label` or `.sr-only` text; icon not
  `aria-hidden="true"`.
- Placeholder as the only label, or `<label>` not tied to its input.
- Whole documents only: missing `<html lang>`, no `<main>`/landmarks,
  skipped heading levels, generic `<title>`.

## States and feedback

- Status shown by colour alone (red border, green chip). Pair it with
  text or an icon; error text says what to do.
- Data views missing the empty, loading or error state, or a spinner
  with no text.
- Controls with no distinct hover/active/disabled style; disabled
  controls still clickable (prefer `disabled`, else `aria-disabled` plus
  a guard in code).

## Zoom, mobile and motion

- Fixed pixel font sizes or `overflow: hidden` that clips text at 200%
  zoom (WCAG 1.4.4); `user-scalable=no` / `maximum-scale=1`.
- Bottom-of-screen inputs the on-screen keyboard covers.
- Parallax, autoplay carousels or big entrance animations that ignore
  `prefers-reduced-motion`; anything moving over 5 s with no pause.

## Limits

A Lighthouse score never proves conformance, and reading code doesn't
replace a screen-reader test: recommend one when the project ships to
the public.
