# Spartan UI + Tailwind foundation (coexisting with PrimeNG)

Status: **installed, build-green on Angular 21**. This is the foundation for the PrimeNG → Spartan migration. PrimeNG is **untouched** and still the app's UI library — both coexist.

## What was installed

- `tailwindcss@4` + `@tailwindcss/postcss` (build), wired via `.postcssrc.json`.
- `@spartan-ng/brain` (headless primitives) + `@spartan-ng/cli` (dev, for adding Helm components).
- `clsx`, `class-variance-authority`, `tailwind-merge`, `tw-animate-css` (Helm component runtime helpers).
- `@typescript-eslint/*` bumped to `^8.63.0` (older 8.35 didn't support the TS 5.9 that Angular 21 requires — this was blocking Spartan's install schematic).

## The coexistence rule (critical — do not undo)

**Tailwind's global preflight (base reset) is intentionally NOT imported.** In `src/styles.scss`:

```scss
@use './styles/fonts.scss' as fonts; // SCSS @use MUST be the first rule
@layer theme, base, components, utilities;
@import 'tailwindcss/theme.css' layer(theme);
// @import 'tailwindcss/preflight.css' layer(base);  ← left commented ON PURPOSE
@import 'tailwindcss/utilities.css';
@import '@spartan-ng/brain/hlm-tailwind-preset.css';
```

- **Why:** preflight resets buttons/borders/headings/margins globally, which would restyle PrimeNG across all 120 templates. Leaving it out keeps PrimeNG + PRMS styles intact. Tailwind utilities stay **opt-in** (they only apply to elements that explicitly use the classes), so un-classed PrimeNG DOM is untouched.
- **SCSS gotcha:** `@use` must precede every other rule, so the fonts `@use` sits above the Tailwind `@layer`/`@import` lines.

## Adding a Spartan Helm component

The Spartan CLI `:ui` generator is interactive (prompts for a components dir and creates `components.json` on first run):

```bash
ng g @spartan-ng/cli:ui button   # then follow the prompts (e.g. libs/ui path)
```

Then use it: `import { HlmButton } from '<your-path>'` and `<button hlmBtn>…</button>`.

## Deferred (NOT done here — later changes)

- **Pilot render + runtime smoke:** confirm on `npm start` that (a) a PrimeNG-heavy screen looks identical to before (no preflight bleed), and (b) an `hlm-button` renders styled. Build-green is proven; the visual check needs the browser.
- **`tw-` prefix / `.m-N` collision:** the project generates `.m-N`/`.mx-N` margin utilities in `styles.scss` that collide with Tailwind's `m-*`. Not triggered yet (nothing uses Tailwind margin utilities). Decide the prefix (`tw-`) or delete the generated utilities in the first real migration change.
- **Component migration + PrimeNG removal:** each PrimeNG component moves to Spartan in its own change; PrimeNG is removed last, which then unblocks Angular 22.
