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
- **Replace with:** the 16 rendered section blocks, concatenated in this exact order (`BG-T-13`
  — this guide has 16 body sections and 17 captures, not the W1/W2-era 1:1 pairing of 6 and 6).
  `UG-T-13` asserts 16 `<h2>` inside `#sections`, in this order, at structural-gate time:

  1. `<section class="ug-section" id="section-workspace">` — The Bilateral Workspace
  2. `<section class="ug-section" id="section-finding-your-project">` — Finding Your Project
  3. `<section class="ug-section" id="section-starting-a-result">` — Starting a Result
  4. `<section class="ug-section" id="section-choosing-how-to-report">` — Choosing How to Report
  5. `<section class="ug-section" id="section-manual-form">` — The Manual Form
  6. `<section class="ug-section" id="section-editor-at-a-glance">` — The Editor at a Glance
  7. `<section class="ug-section" id="section-overview">` — Overview
  8. `<section class="ug-section" id="section-general-information">` — General Information
  9. `<section class="ug-section" id="section-contributors-partners">` — Contributors & Partners
  10. `<section class="ug-section" id="section-geographic-location">` — Geographic Location
  11. `<section class="ug-section" id="section-evidence">` — Evidence
  12. `<section class="ug-section" id="section-type-specific-details">` — Type-Specific Details
  13. `<section class="ug-section" id="section-saving-your-work">` — Saving Your Work
  14. `<section class="ug-section" id="section-quality-check-submit">` — The AI Quality Check and Submit for Review
  15. `<section class="ug-section" id="section-ai-assisted-drafts">` — The AI-Assisted Path and AI Draft Results
  16. `<section class="ug-section" id="section-result-statuses">` — Result Statuses

  These `id`s MUST match the TOC `href`s in `guide.html`'s `<nav id="toc">` verbatim — the TOC
  is already wired to them. Each TOC row's `<span class="ug-toc__num">` MUST also match the
  numeral its target section prints in its own `.ug-section__eyebrow` (`02 · …` → `02`); a row
  pointing at an unnumbered block (the glossary, whose eyebrow reads "Reference") MUST carry no
  digits at all. `verify-structure` derives both expectations from the sections themselves — it
  holds no numeral table of its own.

  The TOC also MUST fit on one printed page. It is 17 rows today, and `guide.css`'s
  `.ug-toc__item a` vertical padding is sized against the `@page` content box with exactly that
  margin — adding an 18th row means re-deriving it (the formula is in that rule's comment).

  Each `<section>` MUST contain, in this order:
  1. `<header class="ug-section__header">` with a `<span class="ug-section__eyebrow">` (e.g.
     "02 · The Bilateral Workspace") and one `<h2>` — the section's own visible title.
  2. Prose (`<div class="ug-prose">...</div>`) — the section's narrative.
  3. **Zero or more** annotated screenshots (`BG-T-13`): each is a `<figure class="ug-figure">`
     containing an `<img>` (with a required, non-empty `alt`, per `UG-R-12`) and a
     `<figcaption class="ug-caption">`. A section may carry two figures ("Finding Your Project",
     "The Manual Form") or none ("The Editor at a Glance") — `assemble.ts`'s `SectionMeta.figures`
     is `FigureMeta[]`, not the W1/W2-era one-capture-per-section pairing. Optionally include the
     route path as `<code class="ug-mono ug-route">/the/path</code>` inside each figcaption —
     `.ug-mono` is already styled for it.

### `{{GLOSSARY}}`

- **Location:** `<section id="glossary">`, inside `.ug-glossary` (a `<dl>`).
- **Replace with:** `<dt>` (term) / `<dd>` (definition + `<cite>` source + accessed-on date)
  pairs, one per curated glossary entry. `assemble.ts` wraps each `<dt>`/`<dd>` pair in
  `<div class="ug-glossary__entry">` (still a valid child of the outer `<dl>`) so `guide.css` can
  keep a term and its definition on the same printed page — see `guide.css`'s
  `.ug-glossary__entry` comment for the orphaned-term rationale.

## Heading-count contract (for `UG-T-13`)

The fully assembled document has **19 `<h2>` elements total**: intro (1), TOC (1), the 16
`#sections` headings (16), glossary (1). `UG-T-13`'s structural gate counts **exactly 16 `<h2>`
inside `#sections`** — the other 3 (intro/TOC/glossary) are outside that container and must not
be counted toward the 16.

## `routes.config.json` — `annotations[]` (`UG-T-17`, `UG-DD-7`, `UG-R-21`)

Each route MAY carry `annotations: CalloutSpec[]` (2-5 entries, `UG-T-18` authors the real
content) — the labelled feature callouts drawn on that route's screenshot, in addition to (or
instead of) the single silent click-target ring `UG-R-3` always required. Shape (see
`tooling/src/annotate.ts`'s exported `CalloutSpec`):

```json
{
  "selector": "css or Playwright locator string — MUST resolve to exactly 1 element",
  "label": "reader-facing text, <= 5 words, U.S. English (UG-R-21)",
  "role": "primary | feature",
  "placement": "left | right | above | below (optional, defaults to \"right\")"
}
```

- `role: "primary"` gets the existing 4px ring and should be the section's main click target
  (labelled too, per `UG-R-21`); `role: "feature"` gets a 3px ring — both are the same orange
  token, only the ring weight differs.
- `placement` is which side of the target the label chip is drawn on; `annotate.ts` auto-flips it
  to the opposite side (then tries the remaining sides, then nudges along the free axis) when the
  requested side would fall outside the captured frame or would cover another callout's target or
  an already-placed chip.
- **When a route has no `annotations` field at all** (or an empty array), `capture.ts` synthesizes
  a single fallback entry — `{ selector: route.clickTarget, role: "primary", label: "" }` — so
  that route renders exactly as it always has: one ring, no chip, no connector. Labels are content
  and always live here, never hardcoded in `annotate.ts`/`capture.ts`.
- Every `selector` in `annotations` (not just the legacy top-level `clickTarget`) is checked live
  against `count() === 1` before capture; a route with 0 or 2+ matches for any entry fails the
  build loudly, naming the route id, that entry's `label`, and its `selector`.

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
