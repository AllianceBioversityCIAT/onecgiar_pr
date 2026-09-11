## Why

Continuation of the app-wide PrimeNG → Spartan/native migration on branch `front-redesign-fields` (see `onecgiar-pr-client/docs/refactor-angular21-spartan-migration.md` §9). Leaf controls (CHANGE 1) and most form controls (selects/multiselects/inputs — CHANGE 2) are **already done, committed and pushed**. This change covers the **remaining heavy PrimeNG usages** plus a few special cases, to reach **0 PrimeNG → Angular 22**.

**Decision already made by Yeck:** use **official Spartan UI (`hlm-*`) components** for the components that have no PRMS custom equivalent (dialog, table, toast, button, etc.). Install them with the Spartan CLI. Brain host-directives are acceptable ("no hay lío") BUT watch for the infinite change-detection loop that hit `hlmInput` (§6) — if a heavy hlm component loops on form-heavy pages, reduce it to a static/lightweight variant like we did for `hlmInput`. Reuse PRMS custom components where they already exist. **Behavior must be preserved; only the UI may change.**

## What Changes

Migrate the remaining PrimeNG surface (all OUTSIDE `custom-fields/`, which is already 0-PrimeNG):

- **Buttons:** `p-button` ×25 + `pButton` ×13 → Spartan `hlm-button` (or the existing `app-pr-button` where it fits).
- **Dialogs:** `p-dialog` ×36 → Spartan `hlm-dialog` / `brn-dialog` (CDK overlay). Preserve `[visible]` two-way, header/footer, modal, close behavior.
- **Tables:** `p-table` ×22 (+ `p-sortIcon` ×30, `pSortableColumn` ×30, `p-paginator`, `p-columnFilter`, `pRowToggler` ×3) → Spartan `hlm-table` (CDK table). This is the biggest lift — sorting, pagination, filtering, row expansion. Also unblocks `column-filter` (the 14th multiselect, currently deferred).
- **Toasts:** `p-toast` ×9 (MessageService) → Spartan `hlm-toast`/sonner or a small custom toast service.
- **Overlays:** `p-popover` ×5, `p-overlaybadge`/`p-overlayBadge` ×3, `p-drawer` ×3 → Spartan equivalents / CDK Overlay.
- **Misc form controls:** `p-toggleswitch` ×3 → `hlm-switch`; `p-datepicker` ×2 → `hlm` datepicker / native; `p-inputNumber` ×3 → native number `hlmInput`; `p-password` ×2 (login) → native input + toggle; `p-splitbutton` ×1.
- **Charts:** `p-chart` ×2 → keep Chart.js directly (ng2-charts) or a light wrapper.
- **Two special selects (deferred from CHANGE 2):**
  - `search-user-select` — live server-side AD search (`userSearchService.searchUsers` on keyup, min 3 chars, loading + empty states). Extend `app-pr-select` with a `searchChange` output + `loading` input + custom empty message, OR keep it a focused custom dropdown. Whole-object `ngModel` already supported.
  - `manage-user-modal` — a bare inline `p-select` in a table row (no field-header). Use `app-pr-select` (verify the header renders acceptably inline) or a headerless variant.
- After each area: remove the now-unused PrimeNG module imports; final goal is uninstalling `primeng` + `@ncstate/sat-popover` and bumping to **Angular 22**.

## Capabilities

### New Capabilities
- `primeng-free-heavy-components`: The app's dialogs, tables, toasts, overlays, buttons and remaining form controls render without PrimeNG, using Spartan `hlm-*` (or reused PRMS components), with behavior preserved.

### Modified Capabilities
<!-- None yet; add delta specs if a requirement changes. -->

## Impact

- **Large surface:** ~150+ PrimeNG usages across dozens of files; dominated by `p-dialog` and `p-table`.
- **New deps:** Spartan `hlm-*` components installed via CLI (`ng g @spartan-ng/cli:ui <name>`), living under `src/app/spartan/` (alias `@spartan/*`), like `hlmInput` already does.
- **Risk:** heavy components (table/dialog) are load-bearing across many screens — migrate per-area, `npm run build:dev` between batches, and Playwright-verify representative screens (no new console errors, no CD loop). Do NOT rush untested table/dialog swaps.
- **Parallel track:** a separate effort migrates global custom CSS classes → Tailwind (containers.scss done; ongoing). Keep those coordinated but independent.
- **Out of scope:** anything in `custom-fields/` (already clean); the Angular 22 bump itself (comes after 0 PrimeNG).
