# Continuation notes (read first)

**Branch:** `front-redesign-fields` (everything committed + pushed as of this note).
**Master context:** `onecgiar-pr-client/docs/refactor-angular21-spartan-migration.md` §9 + project memory `project_angular_upgrade_spartan`.
**Gate per change:** `npm run build:dev` green + Playwright smoke of affected screens (token via `.env` USER_TOKEN → localStorage; runtime-unlock read-only role via `window.ng.getComponent(el).rolesSE.readOnly=false` + `ng.applyChanges`). No commit/push tasks here (Yeck does releases; but on this feature branch we DO commit+push per batch with his standing OK).
**Hard rule:** no infinite CD loop (the `hlmInput` §6 lesson) — if an hlm component loops on form-heavy pages, reduce it to a lightweight static variant.
**Already DONE (context, not to redo):** custom-fields 0-PrimeNG; CHANGE 1 (tooltip/checkbox/chip/avatar/progress/message/skeleton); CHANGE 2 (7/9 p-select→app-pr-select w/ showClear+whole-object; 13/14 p-multiselect→new app-pr-filter-multiselect; 5 search inputs→hlmInput+.pr-search-box); dead RadioButtonModule swept; containers.scss→Tailwind.

## 1. Setup — install Spartan components

- [ ] 1.1 Verify Spartan CLI works (`ng g @spartan-ng/cli:ui <name>` — `hlmInput` was added this way; `components.json` exists). Install the needed hlm components under `src/app/spartan/` with `@spartan/*` aliases.
- [ ] 1.2 Install/adopt: `hlm-button`, then dialog (`hlm-dialog`/`brn-dialog`), table (`hlm-table`), switch (`hlm-switch`), and a toast solution. Add tsconfig `paths` per component like `@spartan/input`.

## 2. Buttons (p-button ×25 + pButton ×13)

- [ ] 2.1 Migrate `p-button`/`pButton` → `hlm-button` (or `app-pr-button` where it already fits). Map icon/label/severity/loading/disabled.
- [ ] 2.2 Drop `ButtonModule`/`primeng/button` imports where unused; drop `pRipple` (×3).

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
