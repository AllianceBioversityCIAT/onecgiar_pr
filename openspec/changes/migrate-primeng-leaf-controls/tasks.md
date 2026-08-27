## 1. Already completed (formalized for traceability)

- [x] 1.1 `p-message` ×8 → `<app-alert-status>` (5 files); `MessageModule` dropped from 6 modules
- [x] 1.2 `p-skeleton` ×51 → global `.pr-skeleton` div + shimmer in `styles.scss` (10 files); `SkeletonModule` dropped from 16 modules/standalone components
- [x] 1.3 Verified in browser: `app-alert-status` renders, `.pr-skeleton` style + shimmer apply, 0 leftover, no new console errors

## 2. Tooltip — promote PrTooltipDirective app-wide

- [x] 2.1 Audit the 63 `pTooltip`/`[pTooltip]` usages (36 files): options in use = `tooltipDisabled` ×3, `showDelay` ×1, `[escape]="false"` ×1 (HTML), `positionTop="-5"` ×2 (cosmetic, dropped)
- [x] 2.2 Extend `PrTooltipDirective` with `prTooltipDisabled` + `prTooltipShowDelay`; HTML content already handled via innerHTML
- [x] 2.3 Move `PrTooltipDirective` to `shared/directives/` + `PrTooltipDirectiveModule`; re-exported from `CustomFieldsModule` for app-wide reach; still works in `pr-button`
- [x] 2.4 Wire the directive into the 9 modules/standalone components not covered by `CustomFieldsModule` (whats-new, result-framework-reporting, dynamic-panel-menu, phase-detail, …)
- [x] 2.5 Replaced all 63 `pTooltip`/`[pTooltip]` → `[prTooltip]` (+ position/styleClass/disabled/showDelay) across 36 files; build green
- [x] 2.6 Removed `TooltipModule` from 34 files

## 3. Checkbox — bare p-checkbox → native

- [x] 3.1 Classified the 12 `<p-checkbox>`: 7 binary vs 5 `[value]`/group (all in IPSR step-n2 complementary-innovation)
- [x] 3.2 Migrated the **7 binary** checkboxes → `<input type="checkbox" class="pr-native-check">` (ngModel / [ngModel]+ngModelChange preserved)
- [x] 3.3 Migrated the **5 group/value checkboxes** (IPSR step-n2) with a new `PrCheckboxValueAccessorDirective` (`shared/directives`) — an array-membership `ControlValueAccessor` for a native checkbox, so `[value]` + `[(ngModel)]` keep identical semantics; Angular selects the custom accessor over the built-in boolean one. `item-options` `(click)` → `(ngModelChange)` so bridge handlers see post-toggle state deterministically. `CheckboxModule` removed from all 5 remaining files. Unit spec: 3/3 pass (membership add/remove + writeValue).

## 4. Remaining leaf visuals

- [x] 4.1 `p-chip` ×2 → native pill (`<span class="pr-chip">` + global style); `ChipModule` dropped
- [x] 4.2 `p-avatar` ×2 → native circle (`<span class="pr-avatar">` + global style); `AvatarModule` dropped
- [x] 4.3 `p-progressBar` ×1 → `<div class="pr-progress-bar-indeterminate">` (global CSS); `ProgressBarModule` dropped
- [x] 4.4 `p-progressSpinner` ×1 → `<span class="pr-spinner">` (CSS spinner); `ProgressSpinnerModule` dropped

## 5. Verification

- [x] 5.1 `npm run build:dev` green after all swaps
- [x] 5.2 0 remaining `pTooltip`/`p-chip`/`p-avatar`/`p-progress*`; only the 5 deferred group `p-checkbox` remain; no dangling PrimeNG module imports (removed `Tooltip`/`TooltipModule`/`Chip`/`Avatar`/`ProgressBar`/`ProgressSpinner` where unused)
- [x] 5.3 Playwright (prtest): 0 leftover PrimeNG widgets on results-list; native checkboxes render; `[prTooltip]` works app-wide (tooltip on body, `secondary-400`, cleared on leave); only pre-existing auth-seed console errors, no new ones, no CD loop
- [x] 5.4 Jest for touched specs: 35 pass (header-panel, dynamic-notion-block, dynamic-panel-menu). 1 suite (results-list-filters) fails only on the pre-existing `@spartan/input` Jest alias-resolution issue (part of the upgrade change's 33-test drift, not this change)
