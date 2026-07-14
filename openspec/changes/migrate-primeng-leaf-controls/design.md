## Context

The PRMS client (Angular 21, branch `front-redesign-fields`) is mid-migration off PrimeNG (goal: 0 PrimeNG → Angular 22). `custom-fields/` is already 0-PrimeNG and produced reusable native primitives: `.pr-native-check`, `.pr-native-radio`, `hlmInput`, `PrTooltipDirective`, `.pr-tooltip`, `.pr-skeleton`, and the `app-alert-status` component. This change applies those primitives to the **low-risk leaf usages** in the rest of the app. Full surface outside `custom-fields/` at start: ~87 files / ~290 PrimeNG usages; this change targets the safe subset only.

Hard constraint learned earlier: **no `@spartan-ng/brain` host-directives** on high-frequency elements — the brain `classes()` effect + field-control directives drove an infinite change-detection loop that froze form-heavy pages (`hlmInput`, resolved by reducing it to a static-class directive — see migration doc §6).

## Goals / Non-Goals

**Goals:**
- Remove `pTooltip`, `p-checkbox`, `p-chip`, `p-avatar`, `p-progressBar`, `p-progressSpinner` from templates outside `custom-fields/`, reusing existing primitives.
- Make `PrTooltipDirective` importable app-wide.
- Preserve appearance and behavior exactly (facade-preserving).
- Reduce imported PrimeNG modules toward full removal.

**Non-Goals:**
- `p-select` / `p-multiselect` (CHANGE 2 — needs a per-usage audit of bridge logic / hacks and the custom `app-pr-select` fit).
- `p-table`, `p-dialog`, `p-drawer`, `p-chart`, `p-toast`, `p-popover`, `p-overlayBadge` (CHANGE 3 — greenfield CDK/Spartan architecture).
- Adopting Spartan `hlm-*` components here.
- Angular 22 upgrade itself.

## Decisions

**1. `PrTooltipDirective` → standalone, exported from a small shared module.**
Today it's declared in `CustomFieldsModule`. Rather than force every consumer to import `CustomFieldsModule`, make the directive `standalone: true` and export it from a lightweight `SharedDirectivesModule` (or import the standalone directive directly per module). Rationale: 36 templates live across many feature modules; a single shared surface avoids scattering PrimeNG-era `TooltipModule` with a PRMS one. Alternative considered: leave it in `CustomFieldsModule` — rejected (couples unrelated modules to the whole custom-fields surface).

**2. Native checkbox primitive for bare checkboxes.**
Reuse `.pr-native-check` (native `<input type="checkbox">`) already proven in `pr-checkbox`/`pr-multi-select`. For `[value]`/group checkboxes, bind `ngModel` to the same model the PrimeNG checkbox used; map `(onChange)` → `(ngModelChange)`. Alternative considered: Spartan `hlm-checkbox` — rejected (brain host-directive loop risk; no benefit over the native primitive).

**3. Chip / avatar / progress → native + Tailwind/global CSS.**
These are purely visual and few (2/2/1/1). Replace with a `<span>`/`<div>` styled by a small global class (chip pill, avatar circle, progress bar/spinner) mirroring the current look. Alternative: build components — rejected (overkill for ≤2 instances each).

**4. Verify by build + browser navigation, not inference.**
Each sub-step ends with `npm run build:dev` and a Playwright pass over the affected screens checking for new console errors and (for form-heavy pages) no CD loop. This mirrors how the custom-fields + p-message + p-skeleton work was verified.

## Risks / Trade-offs

- **Tooltip option gaps** (`escape`, `showDelay`/`hideDelay`, HTML content) → audit the 63 usages first; extend `PrTooltipDirective` to cover any option in real use before mass-replacing. Default `[prTooltip]` treats text as plain; keep the existing `innerHTML` handling for HTML tooltips.
- **`click`-to-hide on non-button hosts** → `PrTooltipDirective` currently hides on click (fine for buttons). On non-interactive hosts this is harmless but confirm it doesn't suppress a legitimate tooltip-on-focus case.
- **Group checkbox semantics** (`[value]` membership vs binary boolean) → get each `p-checkbox`'s model shape right per-site; a wrong mapping silently corrupts selection. Verify each in the browser.
- **36-template tooltip sweep volume** → mechanical but broad; do it in reviewable batches with a build between batches so a regression is localized.
- **Static `style` + `[style]` object coexistence** (already used by skeletons) → Angular 21 merges them; keep relying on that, spot-check visually.

## Migration Plan

1. Promote `PrTooltipDirective` to standalone + shared module; wire it into the modules of the 36 tooltip templates.
2. Sweep `pTooltip`/`[pTooltip]` → `[prTooltip]` in batches; `build:dev` between batches; drop unused `TooltipModule`.
3. Migrate `p-checkbox` ×12 → `.pr-native-check`; drop unused `CheckboxModule`.
4. Migrate `p-chip`/`p-avatar`/`p-progress*`; drop their modules.
5. Full `build:dev` + Playwright navigation of representative affected screens (tooltip-heavy toolbar, a checkbox form, a progress/skeleton view). Confirm no new console errors, no loop.
6. Jest for any touched specs.

Rollback: each sub-step is an isolated template/module edit on a feature branch; revert the offending commit. No data or API surface touched.

## Open Questions

- Is a dedicated `SharedDirectivesModule` preferred, or import the standalone `PrTooltipDirective` directly in each consuming module? (Leaning shared module for one import site.)
- Do any tooltip usages require rich HTML / delays that meaningfully change the directive's contract? (Resolved during the audit in step 1.)
