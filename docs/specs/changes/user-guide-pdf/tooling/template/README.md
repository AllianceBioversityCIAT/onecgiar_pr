# `template/guide.html` — placeholder contract (UG-T-11 → UG-T-12)

This file is the full placeholder contract for `guide.html`. It lives here — not as a nested
HTML comment inside `guide.html` — because HTML comments do not nest: the first `-->` anywhere
inside an opened comment closes it unconditionally. A previous attempt at this task put a
6-item, `<section>`-shaped example (with its own `<!-- 01 -->`-style inner markers) inside one
`<head>`-level comment; the first inner `-->` closed the outer comment early and everything
after it was parsed as live document content, in `<head>`, silently corrupting the DOM (stray
empty sections, duplicate ids, a stray unclosed `<h2>`, a live `<img>`, a live `{{GLOSSARY}}`
placeholder rendered twice). See `execution.md` for the full incident writeup.

**Rule going forward: no `-->` sequence may appear anywhere inside `guide.html`'s own contract
comment.** If you need to illustrate HTML structure, do it here in Markdown, or in prose without
comment syntax.

## Placeholders

Exactly 5 mustache placeholders exist in `guide.html`. `assemble.ts` (UG-T-12) MUST replace
every one of them — a leftover `{{...}}` anywhere in the assembled output fails UG-T-12's own
DoD.

### `{{TOKENS_CSS}}`

- **Location:** inside the `:root { ... }` block of the `<style id="ug-design-tokens">` tag in
  `guide.html`'s `<head>`, on its own line.
- **Replace with:** the 6 `--key: value;` declarations read from `tokens.json` (produced by
  `tooling/src/tokens.ts`, `design.md` `UG-DD-2`), in this exact order (see `TokensJson` in
  `tooling/src/tokens.ts`):
  1. `--pr-color-primary-300: <value>;`
  2. `--pr-color-primary-400: <value>;`
  3. `--pr-color-secondary-400: <value>;`
  4. `--pr-color-orange-500: <value>;`
  5. `--font-manrope: <value>;`
  6. `--font-jetbrains-mono: <value>;`
- `guide.css` (and `guide.html`) reference ONLY these 6 custom properties for every brand
  color/font — never a hardcoded hex or font-family literal.

### `{{BUILD_DATE}}`

- **Location:** cover, `.ug-cover__date`.
- **Replace with:** a plain text build/version date stamp (`UG-R-20`), e.g. `Built 2026-09-15`.

### `{{INTRO}}`

- **Location:** `<section id="intro">`, inside `.ug-prose`.
- **Replace with:** the rendered HTML body of `content/intro.md`.

### `{{SECTIONS}}`

- **Location:** `<main class="ug-sections" id="sections">`.
- **Replace with:** the 6 rendered section blocks, concatenated in this exact order. `UG-T-13`
  asserts 6 `<h2>` inside `#sections`, in this order, at structural-gate time:

  1. `<section class="ug-section" id="section-landing">` — Landing Page
  2. `<section class="ug-section" id="section-overview">` — Overview Dashboard
  3. `<section class="ug-section" id="section-reporting">` — Reporting Page
  4. `<section class="ug-section" id="section-results-center">` — Results Center
  5. `<section class="ug-section" id="section-notifications">` — Notifications
  6. `<section class="ug-section" id="section-innovation-packages">` — Innovation Packages

  These `id`s MUST match the TOC `href`s in `guide.html`'s `<nav id="toc">` verbatim — the TOC
  is already wired to them.

  Each `<section>` MUST contain, in this order:
  1. `<header class="ug-section__header">` with a `<span class="ug-section__eyebrow">` (e.g.
     "01 · Landing Page") and one `<h2>` — the section's own visible title.
  2. Prose (`<div class="ug-prose">...</div>`) — the section's narrative.
  3. One annotated screenshot: `<figure class="ug-figure">` containing an `<img>` (with a
     required, non-empty `alt`, per `UG-R-12`) and a `<figcaption class="ug-caption">`.
     Optionally include the route path as `<code class="ug-mono ug-route">/the/path</code>`
     inside the figcaption — `.ug-mono` is already styled for it.

### `{{GLOSSARY}}`

- **Location:** `<section id="glossary">`, inside `.ug-glossary` (a `<dl>`).
- **Replace with:** `<dt>` (term) / `<dd>` (definition + `<cite>` source + accessed-on date)
  pairs, one per curated glossary entry.

## Heading-count contract (for `UG-T-13`)

The fully assembled document has **9 `<h2>` elements total**: intro (1), TOC (1), the 6
`#sections` headings (6), glossary (1). `UG-T-13`'s structural gate counts **exactly 6 `<h2>`
inside `#sections`** — the other 3 (intro/TOC/glossary) are outside that container and must not
be counted toward the 6.

## Token bridge (`--ug-*` neutrals)

The `--ug-*` custom properties defaulted in `guide.html`'s inline `<style id="ug-design-tokens">`
block (`--ug-color-page-bg`, `--ug-color-surface-alt`, `--ug-color-ink`,
`--ug-color-ink-muted`, `--ug-color-border`, `--ug-color-on-chrome`,
`--ug-color-on-chrome-muted`, `--ug-color-shadow`, `--ug-color-chrome-start`,
`--ug-color-chrome-end`) are NOT part of `tokens.json` (`UG-T-5`'s `TokensJson`). Two of them —
`--ug-color-ink` and `--ug-color-ink-muted` — are derived from the real
`--pr-color-secondary-400` token (`colors.scss`'s "neutral ink" custom property), never a
hand-copied hex, per `UG-R-4`/`UG-DD-2`. The rest have no counterpart custom property in
`colors.scss` and are legitimate template-only neutrals (page background, borders, chrome
gradient stops, shadow tint). `assemble.ts` MAY override any `--ug-*` value but is not required
to for this spec.
