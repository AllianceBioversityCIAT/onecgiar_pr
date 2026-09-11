## Context

The client is Angular 21 + PrimeNG 21 (193 `.ts` importers, 120 templates), styled via SCSS with `--pr-*` tokens and a large generated `.m-N`/`.mx-N` margin-utility family in `styles.scss`. The build uses the esbuild `@angular/build:application` builder; global styles are an SCSS array in `angular.json`.

Spartan UI = headless primitives (`@spartan-ng/brain`) + copy-in Helm components styled with **Tailwind 4 CSS-first config** (`@import 'tailwindcss'`, `@layer`, CSS `@theme` tokens) + CVA/clsx/tailwind-merge. The Spartan CLI `init` schematic wires Tailwind + the `@spartan-ng/brain/hlm-tailwind-preset.css` + design tokens.

**The coexistence problem (the entire risk of this change):** Tailwind's default global stylesheet includes **preflight** — an aggressive base reset (buttons, borders, headings, margins) that would restyle PrimeNG's components across all 120 templates. Spartan's documented setup imports `tailwindcss/preflight.css layer(base)`. We must set this up so preflight does **not** reset PrimeNG.

## Goals / Non-Goals

**Goals:**
- Tailwind 4 + Spartan installed; app builds green on Angular 21.
- PrimeNG renders **unchanged** — no preflight bleed. Verified on a PrimeNG-heavy screen.
- One Helm component (`hlm-button`) renders correctly, proving the pipeline end-to-end.
- Setup is reversible and additive (no PrimeNG edits).

**Non-Goals:**
- No component migrated off PrimeNG; no PrimeNG removal.
- No `tw-` prefix yet, no deletion of the `.m-N` utilities (those collide with Tailwind's `m-*` — deferred; the pilot avoids margin utilities so the clash doesn't surface yet).
- No Angular 22.

## Decisions

- **Run `ng g @spartan-ng/cli:init`, then correct the preflight wiring by hand.** The schematic installs deps + tokens + preset fast; we then edit the generated Tailwind entry to **omit the global `tailwindcss/preflight.css` import** (or wrap Spartan/Tailwind in a scoped `@layer` that PrimeNG's later-loaded styles override). Rationale: let the tool do the boilerplate, then own the one line that matters for coexistence. Alternative (fully manual Tailwind setup) rejected — more error-prone, same end state.
- **Load Tailwind via PostCSS (`@tailwindcss/postcss` + `.postcssrc.json`), Tailwind entry as a CSS file added to the `angular.json` styles array AFTER PrimeNG/PRMS SCSS.** Order matters: PRMS styles load, then Tailwind utilities — utilities are opt-in classes, so they don't touch un-classed PrimeNG DOM. No preflight = no reset.
- **`@layer` strategy:** use `@layer theme, base, components, utilities;` but only import `tailwindcss/theme.css` (tokens), `tailwindcss/utilities.css` (opt-in classes), and `@spartan-ng/brain/hlm-tailwind-preset.css`. **Skip `tailwindcss/preflight.css`.** PrimeNG + PRMS keep their unlayered (higher-priority) styles. Spartan Helm components bring their own utility classes, which is fine — they only apply where used.
- **Pilot placement:** render `<button hlmBtn>` behind a dev-only flag / a scratch route or an existing non-critical dev surface, purely to confirm rendering. Removed or kept as a tiny demo per QA. No user-facing production screen changes.
- **Install with `--legacy-peer-deps`** (consistent with the Angular 21 upgrade; the latent `@typescript-eslint` vs TS-5.9 peer warning is eslint-only).

## Risks / Trade-offs

- **Preflight bleeds into PrimeNG → global visual regression** → Mitigation: do NOT import preflight globally; build + smoke a PrimeNG-heavy screen (Result Detail, a p-table, a p-dialog, buttons) before declaring done. This is the #1 acceptance check.
- **Tailwind `m-*`/`p-*` utilities collide with the project's generated `.m-N` classes** → Not triggered yet: the pilot uses no margin/padding utilities. The prefix decision + `.m-N` removal is a later change; flagged, not solved here.
- **SCSS + Tailwind PostCSS pipeline friction** (project is SCSS-first; Tailwind 4 is CSS-first) → Mitigation: keep the Tailwind entry as a dedicated `.css` file in the styles array, not mixed into existing `.scss`; PostCSS processes it independently.
- **Spartan CLI schematic edits more than expected** (angular.json, styles, tsconfig paths) → Mitigation: review the schematic diff; revert anything beyond deps + Tailwind entry + tokens; keep the change surface minimal.
- **Bundle size / build time** grows with Tailwind → acceptable for foundation; monitor.

## Migration Plan

1. `npm i -D @spartan-ng/cli --legacy-peer-deps`.
2. `ng g @spartan-ng/cli:init` — review the diff.
3. Edit the generated Tailwind CSS entry: remove the global `preflight.css` import (keep theme + utilities + hlm preset). Wire the entry into `angular.json` styles AFTER the PRMS SCSS.
4. `npm run build:dev` — must stay green.
5. `ng g @spartan-ng/cli:ui button` — add the Helm button; render `<button hlmBtn>Pilot</button>` on a dev surface.
6. `npm start` — smoke: (a) PrimeNG screens look identical to before (no reset), (b) the Spartan button renders styled.
7. Document coexistence config + the preflight decision in a QA doc; commit.
8. Rollback = revert this change's commit (additive; PrimeNG untouched).

## Open Questions

- **Keep or remove the pilot button** after verification? Default: keep a tiny gated demo until the first real component migration, then remove.
- **`tw-` prefix vs deleting `.m-N`** — deferred to the first migration change; not decided here.
