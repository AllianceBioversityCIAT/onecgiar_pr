## Why

The PRMS client is being moved off **PrimeNG** onto native/Tailwind + a few Spartan primitives so we can eventually drop `primeng` + `@ncstate/sat-popover` and upgrade to **Angular 22** (blocked today by PrimeNG — see `docs/refactor-angular21-spartan-migration.md` §5, §9). The `custom-fields/` folder is already 0-PrimeNG. This change removes the **low-risk leaf/visual PrimeNG usages** from the rest of the app, reusing the native primitives already built during the custom-fields migration. Selects, tables, dialogs and drawers are explicitly **out of scope** (they carry API-mismatch / architecture decisions and get their own later changes).

## What Changes

- **Tooltip:** Generalize the existing `PrTooltipDirective` (today only in `custom-fields.module.ts` / `pr-button`) into an app-wide-importable shared module, then replace all **63** `pTooltip` / `[pTooltip]` usages across **36** templates with `[prTooltip]` (`prTooltipPosition`, `prTooltipStyleClass`). If any usage relies on options the directive lacks (`escape`, `showDelay`/`hideDelay`), extend the directive — do not silently drop behavior. Drop `TooltipModule` imports where no longer used.
- **Checkbox:** Replace the **12** bare `<p-checkbox>` usages (outside custom-fields) with native `<input type="checkbox" class="pr-native-check">` (primitive already in the global `custom-fields.scss`). Handle both `[binary]` and `[value]`/group checkboxes; preserve `ngModel` / `(onChange)` behavior via `(ngModelChange)`. Drop `CheckboxModule` imports where unused.
- **Remaining leaf visuals:** `p-chip` ×2, `p-avatar` ×2, `p-progressBar` ×1, `p-progressSpinner` ×1 → native + Tailwind / global-CSS equivalents. Drop their PrimeNG module imports.
- **Already completed and committed on-branch (formalized here for traceability):** `p-message` ×8 → `app-alert-status` (`MessageModule` dropped from 6 modules); `p-skeleton` ×51 → global `.pr-skeleton` div + shimmer in `styles.scss` (`SkeletonModule` dropped from 16 modules/standalone components).
- No consumer-facing behavior change: every swap is facade-preserving. **No `@spartan-ng/brain` host-directives** (they caused an infinite change-detection loop in `hlmInput` — §6).

## Capabilities

### New Capabilities
- `primeng-free-leaf-controls`: The app's leaf/visual UI controls (tooltip, checkbox, chip, avatar, progress indicators, inline message, skeleton) render **without PrimeNG**, using native elements + shared PRMS primitives, with behavior and appearance preserved.

### Modified Capabilities
<!-- None: no existing spec's requirements change. -->

## Impact

- **Templates:** ~40+ `.html` files outside `custom-fields/` (36 for tooltip + checkbox/chip/avatar/progress sites).
- **Modules:** `PrTooltipDirective` promoted to a shared module; `TooltipModule`, `CheckboxModule`, `ChipModule`, `AvatarModule`, `ProgressBar`/`ProgressSpinner` module imports removed where unused. (`MessageModule` / `SkeletonModule` already removed.)
- **Global styles:** `custom-fields.scss` (already hosts `.pr-native-check`, `.pr-tooltip`) and `styles.scss` (already hosts `.pr-skeleton`); add small chip/avatar/progress styles as needed.
- **Dependencies:** reduces the PrimeNG surface toward full removal; no new runtime deps.
- **Verification:** `npm run build:dev` green + Playwright navigation of affected screens with **no new console errors**; Jest for any touched specs.
- **Out of scope:** `p-select`/`p-multiselect` (CHANGE 2), `p-table`/`p-dialog`/`p-drawer`/`p-chart`/`p-toast` (CHANGE 3).
