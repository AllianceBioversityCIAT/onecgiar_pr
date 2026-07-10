## 1. Baseline capture (frontend)

- [ ] 1.1 On Angular 21 (clean tree), screenshot a PrimeNG-heavy screen (Result Detail: p-table, p-dialog, buttons, form fields) as the "before" reference for the no-regression check
- [ ] 1.2 Confirm `npm run build:dev` is green before installing anything

## 2. Install Tailwind + Spartan (frontend)

- [ ] 2.1 `npm i -D @spartan-ng/cli --legacy-peer-deps`
- [ ] 2.2 `ng g @spartan-ng/cli:init` — run the init schematic (Tailwind 4, PostCSS, tokens, hlm preset). Review the full diff
- [ ] 2.3 Verify `@spartan-ng/brain`, `tailwindcss@4`, `@tailwindcss/postcss`, `tw-animate-css`, `clsx`, `class-variance-authority`, `tailwind-merge` landed in package.json; `.postcssrc.json` present

## 3. Coexistence config — no PrimeNG regression (frontend)

- [ ] 3.1 In the generated Tailwind CSS entry: REMOVE the global `@import 'tailwindcss/preflight.css'` (keep theme tokens + utilities + `@spartan-ng/brain/hlm-tailwind-preset.css`)
- [ ] 3.2 Wire the Tailwind entry into `angular.json` styles AFTER the PRMS/PrimeNG SCSS (utilities load last, opt-in only)
- [ ] 3.3 Review the schematic diff; revert any unintended edits (keep surface = deps + Tailwind entry + tokens + postcss)

## 4. Pilot component (frontend)

- [ ] 4.1 `ng g @spartan-ng/cli:ui button` — add the Helm button (creates `components.json` on first run)
- [ ] 4.2 Render `<button hlmBtn>Spartan pilot</button>` on a dev-only surface (scratch route or gated demo block)

## 5. Verify — the acceptance gate (frontend)

- [ ] 5.1 `npm run build:dev` — green with Tailwind + Spartan
- [ ] 5.2 `npm start` — smoke: the PrimeNG-heavy screen looks IDENTICAL to the 1.1 baseline (no preflight reset of buttons/borders/spacing/typography)
- [ ] 5.3 `npm start` — the `hlm-button` renders with Spartan styling (not an unstyled native button)
- [ ] 5.4 Confirm `primeng` still in package.json and no PrimeNG import/template was modified (`git diff --stat`)

## 6. Documentation

- [ ] 6.1 Create `onecgiar-pr-client/docs/spartan-tailwind-foundation.md` — the coexistence config (preflight-off decision, styles order, how to add a Helm component, the deferred `tw-` prefix / `.m-N` collision note)
