# Tasks

All paths are relative to `onecgiar-pr-client/`. **FRONTEND ONLY** — no task below modifies server
code, runs a migration, or changes git state.

## 0. Pre-flight (do not skip — two of these are traps that cost a whole session)

- [x] 0.1 Confirm the target file. The Overview tab is `src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/`, **not** `pages/entity-details/` (retired and unrouted, see `src/app/shared/routing/routing-data.ts:597`). Editing `entity-details/` has zero runtime effect.
- [x] 0.2 Run `git status --porcelain src/` and confirm the parallel workflow has not started editing `program-overview/`, `dashboard-lab.component.ts` or `dashboard-lab.component.html`. If it has, stop and coordinate.
- [x] 0.3 Re-read the live design's `showOverview` block from `../.design-snapshots/PRMS-Reporting.dc.html` (currently lines 1219-1333) with `sed -n`, never by loading the whole file. Confirm the six cards and their spans still match design.md.
- [x] 0.4 Checked. `programme-results/` HAS landed with a category filter (`onCategoryChange`, `filter.selectedCategory`), BUT it has **no URL entry point** — the filter is only ever set from its own dropdown, never from a query param, and adding one means editing `pages/programme-results/**`, which is out of the permitted file set. So 5.3 kept the rows disabled. Recorded in P2-3408.
- [x] 0.5 Confirm the data on prtest is still as design.md records: `GET api/results/by-program-and-centers?programId=SP02` returns `initiative_role_id` as a **string** and roles `'1' Primary submitter` / `'2' Contributor`. Read the token with `grep`/`cut`; never print it.

## 1. Token

- [x] 1.1 Add `--pr-chart-2-muted: #8b7cc4;` to the Charts block of `src/styles/colors.scss` (after `--pr-chart-4`), with the comment from design.md D4 recording the 3.52:1 measurement and the NON-TEXT-USE-ONLY warning.

## 2. Remove the three cards (P2-3298, P2-3299, P2-3300)

- [x] 2.1 `program-overview.component.html` — delete the `Reporting pace` card (currently `:56-112`), the `Needs attention` card (`:165-193`) and the `Impact so far` card (`:195-251`).
- [x] 2.2 `program-overview.component.ts` — delete `PaceSeries`, `CHART_W`, `CHART_H`, `CHART_BASE`, `CHART_TOP_PAD`, `round1`, the `paceSeries` input, `paceMetrics`, `paceHeadline`, `paceSub`, `paceChart`.
- [x] 2.3 `program-overview.component.ts` — delete `AttentionKind`, `AttentionRow`, `ATTENTION_STYLE`, the `attention` input, `attentionIcon`, `attentionColor`, and every now-unused `@ng-icons/lucide` import and `provideIcons` entry. Drop the `NgIcon` import entirely if no icon survives.
- [x] 2.4 `program-overview.component.ts` — delete `CountryRow`, the `countries` input, `countriesReached`, `countriesMax`, `countryWidth`.
- [x] 2.5 Both computeds deleted, plus the now-dead `CHART_COLORS`, `WEEK_MS`, `NOT_STARTED_STATUS_ID` and two type imports. **DEVIATION:** `reportingPhases`/`phasesSE` are now written-but-never-read, and were deliberately KEPT (retagged with a removal note) rather than deleted — removing them means editing `ngOnInit`/`ngOnDestroy`, and the coordinator required the `dashboard-lab.component.ts` footprint stay minimal because a parallel workflow owns that file. Reported as residual debt.
- [x] 2.6 `dashboard-lab.component.html:1163-1170` — remove the `[paceSeries]`, `[attention]` bindings (and confirm `[countries]` was never bound).
- [x] 2.7 Update the component's header doc comment: it currently documents the old four-row grid and cites `PRMS-Shell.dc.html:753-891`. Repoint it at the current design block and the new order.

## 3. Own results — horizontal bars (P2-3303)

- [x] 3.1 `dashboard-lab.component.ts` — in `overviewCategories` (`~:943-955`), remove `.slice(0, 4)`. Keep the `count > 0` filter and the descending sort. Leave the existing `Innovation Use(IPSR)` exclusion in `groupedSummaries()` untouched (design.md Open Question 4).
- [x] 3.2 `program-overview.component.ts` — replace `categoryHeight` with a width method: `categoryWidth(bar) => (bar.count / categoriesMax()) * 100`, keeping `categoriesMax`'s `Math.max(..., 1)` guard. Compute the max in a `computed()`; never divide in the template.
- [x] 3.3 `program-overview.component.html` — build the `Results by indicator category` card as `col-span-6`, placed immediately after `About this program`. Copy the row idiom from the old AoW block (`:125-133`): track `h-[8px] overflow-hidden rounded-full bg-[var(--pr-border-divider)]`, fill `block h-[8px] rounded-full bg-[var(--pr-chart-2)]` with `[style.width.%]="categoryWidth(bar)"`. Label `truncate max-w-[180px] text-[13px]` with `[title]="bar.name"`; count `pr-figure-sm min-w-[32px] text-right text-[14px] font-semibold`. Row min-height 36px, `gap-[12px]`.
- [x] 3.4 Add the empty state: one 14px line, no taller than 160px, per UI-RULES rule 5.
- [x] 3.5 `program-overview.component.html` — change `Reporting status` from `col-span-8` to `col-span-12` and move it below the two category cards.

## 4. Bilateral data (P2-3302)

- [x] 4.1 `src/app/pages/result-framework-reporting/pages/bilateral-results/components/results-review-table/components/result-review-drawer/result-review-drawer.interfaces.ts:5-19` — add `initiative_role_id?: string | number;` and `initiative_role_name?: string;` to `ResultToReview`. The backend already sends both (`results.service.ts:3251-3252`); this is a declaration-only change.
- [x] 4.2 `program-overview.component.ts` — add `BilateralRoleRow { key; label; count }` and reuse `CategoryBar` for the bilateral categories. Add `bilateralRoles` and `bilateralCategories` inputs plus a `bilateralCategoryWidth()` method (same max-normalised maths as 3.2, its own denominator).
- [x] 4.3 Added `bilateralRows` + `overviewBilateralRoles` + `overviewBilateralCategories` + `loadBilateralRows()`, gated on the overview view. **DEVIATION from the reuse plan:** `BilateralResultsService.refreshAllResultsForCounts()` early-returns unless `centers()` is populated, which only the bilateral page does — on the Overview tab it would have loaded nothing, so there was no first request to reuse. `dashboard-lab` therefore calls `GET_ResultToReview(code)` itself and keeps the rows in its own signal, avoiding cross-writes into shared bilateral state. Ids compared as strings; contributor label derived from `initiative_role_name`.
- [x] 4.4 `dashboard-lab.component.html:1163-1170` — bind `[bilateralRoles]` and `[bilateralCategories]`.

## 5. Bilateral cards (P2-3302) + the disabled controls

- [x] 5.1 `program-overview.component.html` — build `Bilateral results by indicator category` as `col-span-6`, identical row markup to 3.3 but fill `bg-[var(--pr-chart-2-muted)]`. Include the design's subtitle "Bilateral results where this program is the primary contributor" (13px, `--pr-text-muted`) and the empty state "No bilateral results are linked to this program yet."
- [x] 5.2 `program-overview.component.html` — build `Bilateral contributions` as `col-span-6`: role rows at min-height 48px with `border-t border-[var(--pr-border-divider)]`, label 14px, count `pr-figure` 16px semibold right-aligned. Then the `Of those where this program is primary` sub-block behind a `border-t` — **rendered but disabled**, with a visible `Coming soon` chip (design.md D5).
- [x] 5.3 Make the category rows `<button type="button">` matching the design's hover, but `disabled` with one `Coming soon` chip beside each category card heading — **unless** task 0.4 found a landed destination, in which case wire `(click)` to it and omit the chip (design.md D6).
- [x] 5.4 A11y pass: `aria-hidden="true"` on every track and fill; `[attr.aria-label]` on each row giving category and count; focus-visible styling that includes a **solid** outline, not the translucent violet halo alone (design.md D9).
- [x] 5.5 Grep the touched templates for raw hex (`#[0-9A-Fa-f]{6}`) and confirm zero hits — the old `bg-[#F3F2F7]` countries track must be gone, not copied forward.

## 6. Tests

- [x] 6.1 `program-overview.component.spec.ts:44-55` — rewrite the heading assertion to the new six headings in the new order.
- [x] 6.2 Delete the obsolete blocks: pace copy (`:135-198`), `AttentionKind` icons (`:117-133`), `countryWidth`/`categoryHeight` (`:80-85`).
- [x] 6.3 Add: `categoryWidth` returns 100 for the max row and the correct ratio for others; an all-zero series yields 0 and no `NaN`; an 8-category series renders 8 rows (proves the cap is gone).
- [x] 6.4 Add: bilateral role counts computed from a fixture using **string** ids (`'1'`/`'2'`) — this is the regression guard for the strict-equality trap.
- [x] 6.5 Add: the disabled controls render, carry `Coming soon`, and are not clickable.
- [x] 6.6 Set signal inputs with `componentRef.setInput()` — signal inputs are read-only.
- [x] 6.7 Run only the touched spec (house rule #25): `npm run test src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.component.spec.ts`. Paste the real output; never "should pass".
- [x] 6.8 Run `npm run lint:fix` on the touched files and paste the real output.

## 7. Verify in the browser

- [x] 7.1 `npm start` (client only — do **not** start the NestJS server; it needs the CGIAR VPN and is not required). Open `http://localhost:4200/result-framework-reporting/entity-details/SP02/overview`.
- [x] 7.2 Confirm the six cards in the design's order and spans; confirm Reporting pace, Needs attention and Impact so far are gone.
- [x] 7.3 Confirm SP02 shows 8 own-result categories (cap removed) and bilateral counts tagged 142 / primary 134 / contributor 8, matching the prtest figures in design.md.
- [x] 7.4 Keyboard-only pass: tab through the tab's controls, confirm the disabled rows are skipped and every focusable control shows a solid focus outline.
- [x] 7.5 Screenshot before/after to `onecgiar_pr/.local-screenshots/p2-3303-overview-breakdown-charts-*.png` (gitignored — never commit PNGs).

## 8. Documentation and follow-ups

- [x] 8.1 Write `dashboard-lab/components/program-overview/CLAUDE.md` (≤120 lines, `**Verified:** <date> · branch <branch> · <short-sha>` on line 3). It must record the routing trap from 0.1, the six-heading spec assertion, which parent computed feeds which card, and the string-vs-number role id trap. `dashboard-lab/` has no doc at all today.
- [x] 8.2 Mark `pages/entity-details/AGENTS.md` as describing a retired page, and note that `openspec/changes/guided-result-reporting-flow/design.md:5` targets it as if it were live.
- [x] 8.3 Created P2-3407 (status breakdown) and P2-3408 (row click-through) for Ángel, both under the new story P2-3406. Create the two Jira tickets for Ángel (`a.jarrin@cgiar.org`, accountId `712020:ed59efaa-46e7-439b-9dd1-702edad6bc10`) — one per `Coming soon`. Plain words, no file paths, no component names: where it is (menu → screen → control), what the user sees, why in one sentence, and an explicit "this is only a notice, you can close it". For the status-dot ticket, include Grok's objection as the question to settle: *Reporting status already shows a status legend on this tab — is this breakdown wanted at all?*
- [x] 8.4 Search Jira before creating either ticket to confirm no duplicate exists.
- [x] 8.5 Document in Jira: a short human-readable comment on each of P2-3298/3299/3300/3302/3303, plus one `Technical documentation` subtask carrying the full detail — commit hashes, real test output, the prtest figures, and explicitly what could NOT be verified (the two backend limitations in design.md, and Open Question 1 on what "tagged" means).
- [x] 8.6 Reported in the final summary and in P2-3409. Report to Yeck, for him to raise with the team: (a) `openspec/config.yaml` still says "Angular 19 SPA. PrimeNG 19"; (b) no aggregate/count endpoint exists for bilateral figures; (c) `results.service.ts:3234` mislabels a result-type name as `indicator_category`; (d) `result-review-drawer.component.ts:1100-1106` compares `initiative_role_id === 1` numerically against a string payload — a probable live bug outside this scope.
