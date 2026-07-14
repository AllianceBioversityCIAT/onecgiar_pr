# Continuation notes (read first)

**Branch:** `front-redesign-fields` (everything committed + pushed as of this note).
**Master context:** `onecgiar-pr-client/docs/refactor-angular21-spartan-migration.md` §9 + project memory `project_angular_upgrade_spartan`.
**Gate per change:** `npm run build:dev` green + Playwright smoke of affected screens (token via `.env` USER_TOKEN → localStorage; runtime-unlock read-only role via `window.ng.getComponent(el).rolesSE.readOnly=false` + `ng.applyChanges`). No commit/push tasks here (Yeck does releases; but on this feature branch we DO commit+push per batch with his standing OK).
**Hard rule:** no infinite CD loop (the `hlmInput` §6 lesson) — if an hlm component loops on form-heavy pages, reduce it to a lightweight static variant.
**Already DONE (context, not to redo):** custom-fields 0-PrimeNG; CHANGE 1 (tooltip/checkbox/chip/avatar/progress/message/skeleton); CHANGE 2 (7/9 p-select→app-pr-select w/ showClear+whole-object; 13/14 p-multiselect→new app-pr-filter-multiselect; 5 search inputs→hlmInput+.pr-search-box); dead RadioButtonModule swept; containers.scss→Tailwind.

## 1. Setup — install Spartan components

- [x] 1.1 Verify Spartan CLI works (`ng g @spartan-ng/cli:ui <name>` — `hlmInput` was added this way; `components.json` exists). Install the needed hlm components under `src/app/spartan/` with `@spartan/*` aliases. **DONE** — CLI 1.1.0 works.
- [ ] 1.2 Install/adopt: `hlm-button`, then dialog (`hlm-dialog`/`brn-dialog`), table (`hlm-table`), switch (`hlm-switch`), and a toast solution. Add tsconfig `paths` per component like `@spartan/input`.
  - **`hlm-button` DONE** (`@spartan/button`, `src/app/spartan/button/`, tsconfig path added). It's a `button[hlmBtn]` directive (variants: default/outline/secondary/ghost/destructive/link; sizes: default/sm/lg/icon/icon-sm/icon-xs…). **Look decision (Yeck):** keep shadcn default tokens (slate) — do NOT remap to PRMS indigo. So hlm-buttons render shadcn-styled; app-pr-button stays indigo → two looks coexist during the gradual redesign (accepted).
  - Dialog/table/switch/toast: still pending.

## 2. Buttons (p-button ×25 + pButton ×13)

- [ ] 2.1 Migrate `p-button`/`pButton` → `hlm-button` (or `app-pr-button` where it already fits). Map icon/label/severity/loading/disabled.
  - **Batch 1 (safe/simple — DONE, build:dev green):** migrated to `app-pr-button` where the fit is exact (label + icon + click, no full-width, no custom styleClass, no projected content, not a bilateral-critical flow). Files:
    - `no-edit-container` — "Edit".
    - `indicator-details` — "Add result" (`iconsStylesClass="pi" icon="file-plus"`).
    - `indicator-results-modal` — "Clear all filters" (`colorType="secondary"`, `(onClick)`→`(click)`).
    - `notification-item` — reject-dialog "Cancel"/"Confirm" (`size="large"`→`padding="big"`; `[loading]`→`[rotating]="…" [icon]="… ? 'loop' : ''"`; `[disabled]` paired with `[ngClass]="{ globalDisabled }"` since app-pr-button `[disabled]` is opacity-only).
  - **Batch 2 (hlm-button, shadcn look — DONE, build:dev green):** migrated the "rich" buttons to `<button hlmBtn>` (real `<button>` → keeps a11y that app-pr-button's div loses). Files:
    - `results-list-filters` — "Export data" (`variant="outline" size="sm"`; `[loading]`→`[disabled]` while exporting + `pi-spinner pi-spin` icon; kept `[prTooltip]`) + full-width footer Cancel/Apply (`variant="outline"` + `class="w-full"`; dropped redundant `(keydown.enter)` — native button fires on Enter).
    - `results-review-filters` — full-width footer Cancel/Apply (same as above).
    - `ai-feedback` — thumbs up/down (`variant="ghost" size="icon"`, kept `globalDisabled`).
    - `search-user-select` — reset filter (`variant="ghost" size="icon-sm"`).
    - `aow-hlo-create-modal` — "Create and continue" (`[loading]`→`[disabled]` + spinner icon).
  - **Batch 3 (DEFERRED — scss-coupled / needs care, next session):**
    - P25 export drawer btns (`results-list-filters` :164/171) — scss `::ng-deep .p25-drawer-btn .p-button` targets the inner PrimeNG `.p-button`; migrating needs rewriting that per-component scss (Yeck's rule: don't attack per-component CSS for now).
    - `entity-aow-aow` tabs — bg/border split between pButton base + `.tab-button_inactive` custom (with `!important` hovers); risky, needs scss reconciliation.
    - `aow-hlo-table` — chevron (`pi-chevron`, maybe a p-table rowToggler — check) + 4 action buttons (`.tab-content_actions_button` only sets padding, so hlmBtn works; do next).
    - `entity-results-by-indicator-category-card` — projected content (`<span>`+`<i>`) + custom class; hlmBtn with projected content, do next.
    - `wp-home` — chevron (ghost).
  - **Bilateral-critical (SEPARATE tanda w/ own flow verification):** `result-review-drawer` (approve/reject/link/save/loading), `save-changes-justification-dialog`, `results-review-table`.
  - **Bilateral-critical (SEPARATE tanda w/ own flow verification):** `result-review-drawer` (approve/reject/link/save/loading), `save-changes-justification-dialog`, `results-review-table`.
- [ ] 2.2 Drop `ButtonModule`/`primeng/button` imports where unused; drop `pRipple` (×3). *(Do after all button usages in a module are gone — none fully cleared yet.)*

## 3. Toggleswitch / datepicker / inputNumber / password / splitbutton

- [ ] 3.1 `p-toggleswitch` ×3 → `hlm-switch` (or native styled switch). Preserve `[(ngModel)]`.
- [ ] 3.2 `p-inputNumber` ×3 → native `<input type="number" hlmInput>` (mirror the pr-input number handling).
- [ ] 3.3 `p-datepicker` ×2 → hlm datepicker or native `<input type="date">`.
- [ ] 3.4 `p-password` ×2 (login) → native input + show/hide toggle. Drop `PasswordModule`.
- [ ] 3.5 `p-splitbutton` ×1 → hlm-button + menu.

## 4. Overlays (popover / overlaybadge / drawer)

- [ ] 4.1 `p-popover` ×5 → Spartan popover (`brn-popover`/`hlm-popover`) or CDK Overlay.
- [ ] 4.2 `p-overlaybadge`/`p-overlayBadge` ×3 → native badge (small absolute-positioned span).
- [ ] 4.3 `p-drawer` ×3 → CDK Overlay / hlm sheet (note: bilateral results already has a hand-rolled `.custom-drawer` — mirror that pattern).

## 5. Dialogs (p-dialog ×36)

- [ ] 5.1 Adopt `hlm-dialog`/`brn-dialog` (CDK overlay). Preserve `[visible]` two-way, header/footer, `[modal]`, close on X / backdrop, and any `(onHide)` handlers.
- [ ] 5.2 Migrate in batches by feature area; `build:dev` between batches; Playwright-verify a couple of dialogs (open/close, focus, no loop).
- [ ] 5.3 Drop `DialogModule` imports where unused.

## 6. Tables (p-table ×22 — biggest lift)

- [ ] 6.1 Adopt `hlm-table` (CDK table). Preserve columns, `pSortableColumn`+`p-sortIcon` sorting, `p-paginator`, `p-columnFilter` (unblocks the deferred `column-filter` multiselect), `pRowToggler` row expansion.
- [ ] 6.2 Migrate one representative table end-to-end first (verify sort/paginate/filter/expand), then the rest by area.
- [ ] 6.3 Migrate `column-filter` (inside p-columnFilter) → its multiselect uses `app-pr-filter-multiselect`.
- [ ] 6.4 Drop `TableModule`/`primeng/table` imports where unused.

## 7. Toasts + charts

- [ ] 7.1 `p-toast` ×9 (MessageService `globalUserNotification`) → Spartan toast/sonner or a small PRMS toast service; keep the `messageService.add({key, ...})` call sites working (adapt to the new API).
- [ ] 7.2 `p-chart` ×2 → Chart.js directly (ng2-charts) or a light wrapper. Drop `primeng/chart`.

## 8. Special selects (deferred from CHANGE 2)

- [ ] 8.1 `search-user-select` — extend `app-pr-select` with `searchChange` output + `loading` input + custom empty message (min-chars/no-results/searching), OR keep a focused custom dropdown; wire its live `userSearchService.searchUsers` debounce. Whole-object ngModel already supported.
- [ ] 8.2 `manage-user-modal` — bare inline `p-select` → `app-pr-select` (check inline header) or a headerless variant.

## 9. Finish line

- [ ] 9.1 Confirm 0 `<p-*>` / `pXxx` outside `custom-fields/`; remove all remaining `primeng/*` imports (incl. `.spec.ts` leftovers) + `MessageService`/`providePrimeNG`/theme from `app.module.ts`.
- [ ] 9.2 Uninstall `primeng`, `@primeng/themes`, `@ncstate/sat-popover` (replace sat-popover w/ CDK Overlay first). `build:dev` green.
- [ ] 9.3 Bump Angular 21 → 22 (now unblocked). Full build + test + Playwright smoke.
- [ ] 9.4 Fix the pre-existing 33 Jest failures (Angular-21 dev-mode drift + `@spartan/input` jest alias) — add `moduleNameMapper` for `@spartan/*` in the jest config.
