## Context

Branch `front-redesign-fields` is finishing the app-wide PrimeNG → Spartan/native migration (`onecgiar-pr-client/docs/refactor-angular21-spartan-migration.md` §9). Leaf controls (CHANGE 1) and form controls (CHANGE 2) are already done, committed and pushed; `custom-fields/` is already 0-PrimeNG. This change removes the **remaining heavy PrimeNG surface** — dialogs, tables, toasts, overlays, buttons and a handful of misc form controls — so the app can uninstall `primeng` + `@ncstate/sat-popover` and bump to **Angular 22** (currently blocked because `primeng@22` is only RC).

Current state of the surface (scan): `p-dialog` ×36, `p-table` ×22 (+ `p-sortIcon` ×30, `pSortableColumn` ×30, `p-paginator`, `p-columnFilter`, `pRowToggler` ×3), `p-button` ×25 + `pButton` ×13, `p-toast` ×9, `p-popover` ×5, `p-overlaybadge` ×3, `p-drawer` ×3, `p-toggleswitch` ×3, `p-inputNumber` ×3, `p-datepicker` ×2, `p-password` ×2, `p-chart` ×2, `p-splitbutton` ×1, plus two special selects deferred from CHANGE 2.

**Data flow (representative, table + dialog):** API (`results-api.service.ts`, `HTTP_METHOD_descriptiveName`, custom `auth` header) → feature service / signal store → component field → template. Tables bind a component array to `[value]` and render rows; sorting/pagination/filtering happen client-side inside PrimeNG today. Dialogs bind `[(visible)]` (two-way) to a component boolean, often toggled by a service or `@Output`. Toasts go through a shared `MessageService` (`globalUserNotification`) with `messageService.add({key, severity, ...})` call sites scattered across features. Preserving these bindings is the whole game — **behavior must not change, only the rendering layer.**

**Constraints:** frontend-only (server read-only); no CD loop (the `hlmInput` §6 lesson — brain host-directives + an `effect(classes())` on a form-heavy page caused an infinite change-detection loop with no console error); minimal incremental changes over rewriting working logic; commit + Playwright-verify per batch.

## Goals / Non-Goals

**Goals:**
- Remove every heavy PrimeNG usage **outside `custom-fields/`**, replacing with Spartan `hlm-*` (installed via Spartan CLI under `src/app/spartan/`, `@spartan/*` aliases) or the existing PRMS custom components where they already fit.
- Preserve current behavior exactly: dialog open/close/modal/focus, table sort/paginate/filter/row-expand, toast call sites, whole-object `ngModel`, `[(visible)]` two-way, `(onHide)` handlers.
- Reach **0 `<p-*>` / `pXxx`** so `primeng`, `@primeng/themes` and `@ncstate/sat-popover` can be uninstalled, unblocking the Angular 21 → 22 bump.
- Unblock the deferred `column-filter` multiselect (14th) by migrating the table's `p-columnFilter` to `app-pr-filter-multiselect`.

**Non-Goals:**
- Anything inside `custom-fields/` (already 0-PrimeNG).
- The Angular 22 bump itself — a separate change (`upgrade-angular-19-to-22`) that runs **after** this reaches 0 PrimeNG.
- The parallel global-CSS → Tailwind track (coordinated but independent).
- Any backend change, redesign of screens, or new features — this is a like-for-like rendering swap.

## Decisions

**1. Official Spartan `hlm-*` for components with no PRMS equivalent; reuse custom where it exists.**
Decided by Yeck. Dialog, table, switch, toast, popover have no PRMS custom twin → install the official Spartan component with the CLI (`ng g @spartan-ng/cli:ui <name>`), same pattern as `hlmInput` (`src/app/spartan/…`, `@spartan/*` tsconfig path). Buttons reuse `app-pr-button` where it fits, else `hlm-button`. Selects reuse `app-pr-select` / `app-pr-filter-multiselect`.
*Alternative rejected:* hand-roll every replacement with CDK Overlay/Table directly — more control but far more code to write and test for 36 dialogs + 22 tables; Spartan already wraps CDK correctly.

**2. Guard against the CD loop up front, not after it bites.**
For each heavy hlm component, verify on a **form-heavy page** (Result Detail → General Information — the screen that surfaced the `hlmInput` loop) before rolling it out broadly. If a component loops (page freezes, **no console error** = pure loop), reduce it to a static/lightweight variant (strip brain host-directives + the `effect(classes())`, keep only static classes), exactly as done for `hlmInput` (fix `64d68f283`).
*Alternative rejected:* adopt hlm components as-is everywhere and fix loops reactively — the loop is silent and load-bearing screens would ship broken.

**3. Migrate per-area, build + Playwright-verify between batches — never a big-bang table/dialog swap.**
`p-dialog` and `p-table` are load-bearing across dozens of screens. Order of attack (cheapest/safest → riskiest): buttons → misc form controls (switch/number/date/password/splitbutton) → overlays → dialogs → tables → toasts/charts → special selects → finish line. Do one representative table **end-to-end** (sort/paginate/filter/expand verified) before the rest.
*Alternative rejected:* migrate by PrimeNG component-type globally in one pass — a broken `hlm-table` contract would break 22 screens at once with no safe rollback point.

**4. Toasts: adapt call sites to the new API, keep the shared entry point.**
`p-toast` ×9 all funnel through the shared `MessageService` `globalUserNotification`. Replace with a Spartan toast (sonner) or a small PRMS toast service, but **keep a single `add(...)`-shaped entry point** so the ~9 scattered `messageService.add({key, ...})` call sites change minimally (adapter, not rewrite).
*Alternative rejected:* rewrite each call site to a new bespoke API — multiplies the blast radius across unrelated features.

**5. Special selects extend the existing custom, they don't fork a new one.**
`search-user-select` (live AD server search) → extend `app-pr-select` with a `searchChange` output + `loading` input + custom empty message, wiring its `userSearchService.searchUsers` debounce (min 3 chars). `manage-user-modal` (bare inline row select) → `app-pr-select`, verifying the field-header renders acceptably inline (else a headerless variant). Whole-object `ngModel` is already supported by `app-pr-select`.
*Alternative rejected:* keep two more bespoke dropdowns — diverges from the consolidation already done in CHANGE 2 and leaves PrimeNG selects behind.

**6. `p-chart` stays Chart.js, `p-overlaybadge` becomes a plain span.**
`p-chart` ×2 is a thin PrimeNG wrapper over Chart.js which the app already depends on → use Chart.js / ng2-charts directly. `p-overlaybadge` ×3 is cosmetic → a small absolutely-positioned `<span>` badge, no library.

## Risks / Trade-offs

- **[Silent CD loop on form-heavy pages]** → Verify each heavy hlm component on Result Detail General Information first; reduce to static-class variant if it loops (`hlmInput` precedent). No component rolls out app-wide before that check.
- **[Table contract is the biggest lift — sort/paginate/filter/row-expand across 22 tables]** → One table migrated + verified end-to-end before touching the rest; `build:dev` between batches; keep client-side sort/paginate semantics identical.
- **[Toast API drift breaks scattered call sites]** → Preserve a single `add(...)`-shaped entry point; grep all `messageService.add` / `globalUserNotification` call sites and confirm each still fires (success + error paths).
- **[Dialog two-way `[(visible)]` / `(onHide)` regressions]** → Preserve the exact input/output contract; Playwright-verify open/close/backdrop/focus on representative dialogs per batch.
- **[Partial state leaves the app un-buildable mid-migration]** → Each batch is independently buildable + committed+pushed on the feature branch; PrimeNG modules removed **only after** their usages are gone in that area.
- **[sat-popover removal coupled to popover migration]** → Replace `@ncstate/sat-popover` with CDK Overlay / Spartan popover **before** uninstalling it; uninstall is the last step, not mid-flight.

## Migration Plan

1. **Setup** — verify Spartan CLI + `components.json`; install `hlm-button`, dialog, table, switch, toast under `src/app/spartan/` with `@spartan/*` paths.
2. **Buttons** → `hlm-button`/`app-pr-button`; drop `ButtonModule`/`pRipple` where unused.
3. **Misc form controls** → switch/number/date/password/splitbutton (native or hlm), `[(ngModel)]` preserved.
4. **Overlays** → popover, overlaybadge (span), drawer (mirror the existing hand-rolled `.custom-drawer` in bilateral results).
5. **Dialogs** (×36) → per-area batches, build + Playwright between.
6. **Tables** (×22) → one end-to-end first, then by area; unblock `column-filter`.
7. **Toasts + charts** → shared toast service adapter; Chart.js direct.
8. **Special selects** → extend `app-pr-select`.
9. **Finish line** → confirm 0 `<p-*>`/`pXxx` outside `custom-fields/`; strip `primeng/*` imports + `MessageService`/`providePrimeNG`/theme from `app.module.ts`; uninstall `primeng`/`@primeng/themes`/`sat-popover`; then hand off to the Angular 22 bump; fix the 33 pre-existing Jest failures (add `@spartan/*` `moduleNameMapper`).

**Rollback:** each batch is an isolated commit on `front-redesign-fields`; revert a batch commit to restore that area's PrimeNG rendering. Nothing merges to `staging`/`master` until Yeck runs the release, so production is never mid-migration.

## Open Questions

- **Toast:** Spartan sonner vs. a tiny bespoke PRMS toast service — decide when we reach §7 based on how cleanly sonner maps to the `{key, severity}` call sites.
- **`manage-user-modal` inline select:** does `app-pr-select`'s field-header render acceptably inline in a table row, or is a headerless variant needed? Resolve during §8.2.
- **Drawer:** reuse the bilateral `.custom-drawer` pattern for all 3, or adopt an hlm sheet? Decide at §4.3 by how different the 3 usages are.
