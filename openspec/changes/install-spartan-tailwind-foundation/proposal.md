## Why

With the client now on **Angular 21** (change `upgrade-angular-19-to-22`), Spartan UI is finally installable (`@spartan-ng/brain@1.1.0` peers Angular `>=21 <23` + Tailwind `>=4`). This change lays the **foundation** for the strategic migration off PrimeNG onto Spartan UI + Tailwind: it installs and configures Tailwind 4 + Spartan so both libraries **coexist** with PrimeNG, and proves the setup with one pilot component — **without removing or altering any PrimeNG usage**. It is the prerequisite for the later per-component migration changes.

Scope note: **frontend-only** (`onecgiar-pr-client`), on branch `angular-upgrade-19-22` (Spartan depends on the not-yet-integrated Angular 21 upgrade, so it rides the same branch). No backend change. No dedicated Jira ticket — `front-redesign` initiative.

## What Changes

- Install **Tailwind CSS 4** + the Angular PostCSS integration, and **Spartan** (`@spartan-ng/brain` + `@spartan-ng/cli`, Helm components copied in on demand).
- Configure Tailwind so it **coexists with PrimeNG without visual regressions**: the global Tailwind **preflight (base reset) is NOT applied app-wide** (it would reset PrimeNG's 120 templates). Tailwind utilities + the Spartan `hlm` preset are wired via the CSS `@layer` mechanism so PrimeNG's existing styles win.
- Add the Spartan brain Tailwind preset (`@spartan-ng/brain/hlm-tailwind-preset.css`) and the Spartan CSS design tokens.
- **Pilot:** generate one Helm component (`hlm-button`) and render it on a throwaway/dev-only spot to prove Spartan renders correctly alongside PrimeNG. No production surface changes.
- **PrimeNG untouched:** zero changes to any PrimeNG import, component, or template. Both libraries live side by side.
- Out of scope (explicitly): migrating any component from PrimeNG to Spartan, removing PrimeNG, the Tailwind `tw-` prefix decision, deleting the project's `.m-N` utility classes, Angular 22.

## Capabilities

### New Capabilities
- `spartan-tailwind-foundation`: the coexistence contract — Tailwind 4 + Spartan installed and configured so that (a) the app still builds, (b) PrimeNG renders unchanged (no preflight reset), and (c) a Spartan `hlm` component renders correctly. This is the platform other migration changes build on.

### Modified Capabilities
<!-- None — no existing spec behavior changes; pure additive foundation. -->

## Impact

- **Code:** `onecgiar-pr-client/package.json` (+ Tailwind/Spartan deps), `.postcssrc.json` (new), `tailwind.config` / CSS token file (new), `src/styles.scss` or a new Tailwind entry, `angular.json` (styles wiring if needed), `components.json` (Spartan, created on first `ui`), one new `hlm-button` component folder.
- **Dependencies (new):** `tailwindcss@4`, `@tailwindcss/postcss`, `@spartan-ng/brain`, `@spartan-ng/cli` (dev), `tw-animate-css`, `clsx`, `class-variance-authority`, `tailwind-merge`. `@angular/cdk@21` already present.
- **PrimeNG:** unaffected — still installed, still the app's UI library. Coexistence is the whole point.
- **Risk:** Tailwind preflight bleeding into PrimeNG (mitigated: preflight not applied globally). Verified by building + smoke-testing a PrimeNG-heavy screen before/after.
- **Follow-ups (separate changes):** per-component PrimeNG→Spartan migration; later PrimeNG removal + Angular 22; bump `@typescript-eslint` to a TS-5.9-compatible version (latent peer warning from the Angular 21 upgrade).
