# Tasks — "Bilateral review" tab in the Science Program shell

## 1. Scope of this task list

- **Module / feature:** `result-framework-reporting` → SP shell tab **Bilateral review** (`BRT`)
- **Linked spec:** `requirements.md` + `design.md` (same folder); `proposal.md`
- **Approval Mode:** pre-approved (owner, 2026-09-07) — routine gates auto-pass and are logged; HALT / Pivot / budget tripwire / FATAL_FAIL / destructive actions still stop
- **Execution limits (owner mandate, `feedback-pragmatic-akili-execution`):** ≤ 1 Reviewer round per task (a second FAIL escalates); targeted `npx jest <path>` only; `npx ng lint --quiet`; `ng build --configuration development` only for tasks that touch routing/DI/global templates (T-1, T-6); plain-language progress line at every task boundary with elapsed/remaining minutes; offer the cut once T-5 is green
- **Budget (design §14):** 8 tasks · ~1,200 added source LOC (≈ 600 net) · ~1,900 test LOC · tripwire at ~1,500 **added** source LOC or any third attempt
- **Owner / driver:** PRMS product owner / AKILI Leader
- **Status:** done (all 8 tasks PASS, 2026-09-07; owner real-page sign-off pending)

---

## 2. Pre-flight checklist

Ticked by the Leader at execution start (items 1–4 were satisfied during `/akili-specify` on 2026-09-07; the hook forbids pre-ticking without `execution.md`).

- [ ] `requirements.md` approved (2026-09-07, pre-approved gate logged in its Document Control).
- [ ] `design.md` approved after judgment-day one pass (`judgment.md`).
- [ ] Open questions resolved (BRT-OQ-1…4 in `requirements.md` §13).
- [ ] No CLARISA / migration dependency (client-only change).
- [ ] No conflicting in-flight spec touching `reporting-program-band` or `routing-data.ts` (check `docs/specs/changes/` and `git log --since=7.days -- <paths>`; `project-shared-worktree-commit-sweeps`).
- [ ] Dev server age + DB reachability checked before any real-page evidence (`project-orca-agent-spawn-and-stale-dev-server`).

---

## 3. Task list

### `BRT-T-1` — Band: fifth tab, path, badge, explainer

- **Status:** [x] PASS 2026-09-07 (attempt 2, see `execution.md`)
- **Type:** `client`
- **Description:** Extend `reporting-program-band`: `activeTab` union gains `'bilateral-review'`; `bilateralReviewPath` computed; new anchor between Results and My results cloned from the My results anchor (`material-icons-round` `fact_check`, label "Bilateral review", `queryParamsHandling="preserve"`, `aria-current`); badge from an injected `BilateralReviewCountService` (`ensure(programCode())` in an effect, shown when `> 0`, `aria-label` "N pending review"); `activeTabInfo` case (`.ts:503-532`) with the explainer copy; the tour ternary at `.ts:266-283` gains the branch; widen `SpTabId` + `SP_TAB_LABELS` in `dashboard-lab/services/reporting-guide.service.ts:6-13` (tab **not** added to tour steps). Create `services/bilateral-review-count.service.ts` (root; `count`, `ensure` memoized per code via one `GET_ResultToReview(code)`, `setFromRows`, `refresh`; pending = rows with `status_id == 5`, loose equality) in the new `pages/bilateral-review/services/` folder. Both band specs gain one `useValue` stub for the service and new `it` blocks only. **No change inside the `@if (showToolbar())` block.**
- **Implements:** `BRT-R-1` (tab + label), `BRT-R-2`, `BRT-R-3`, `BRT-R-5`, `BRT-R-19`, `BRT-AC-1`, `BRT-AC-2`, `BRT-AC-3`, `BRT-AC-16`; scenario "Sibling tabs unchanged" (all clauses)
- **Design refs:** §6.2 Band changes, `BRT-DD-2`
- **Files (expected):** `…/reporting-program-band/reporting-program-band.component.{ts,html,spec.ts}`, `…/reporting-program-band/reporting-program-band.favorites.spec.ts`, `…/dashboard-lab/services/reporting-guide.service.{ts,spec.ts}`, `…/pages/bilateral-review/services/bilateral-review-count.service.{ts,spec.ts}`, `…/pages/bilateral-review/bilateral-review.copy.ts`
- **Depends on:** — · **Blocks:** T-3, T-6
- **Estimate:** S
- **Skills:** `angular-developer`
- **Tests:** band spec: DOM order of the five `nav a` labels equals `Overview, Reporting, Results, Bilateral review, My results`; href of the new anchor ends with `/bilateral-review`; badge renders `3` with a stubbed count of 3 and is absent with 0/null; `activeTab='bilateral-review'` sets `aria-current` on it only; existing band spec cases untouched and green; count service spec: memoized (`ensure` twice → one request), `setFromRows` overrides without a request, `refresh` re-requests, pending derived with loose equality (`"5"` counts), malformed response → `null`; guide service spec: `SP_TAB_LABELS['bilateral-review']` present, tour steps unchanged.
- **Verification:** `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band src/app/pages/result-framework-reporting/pages/dashboard-lab/services src/app/pages/result-framework-reporting/pages/bilateral-review/services --silent`; `npx ng lint --quiet`; `git diff` of the band html shows no hunk between the `@if (showToolbar())` line and its closing brace (FAIL input: any hunk inside that range).
- **Disqualifiers:** a green run in which either band spec was edited beyond one provider stub and new `it` blocks is not evidence of BRT-R-5; the order assertion must read DOM order, not an array in the component.
- **Done when:** all of the above green; a screenshot of the Reporting tab at 1536 CSS px in the Orca browser shows five tabs and an unchanged toolbar (HITL look #1, KZ-MWB-2).

### `BRT-T-2` — Relocate drawer and service; shared access rule

- **Status:** [x] PASS 2026-09-07 (attempt 1, see `execution.md`)
- **Type:** `client`
- **Description:** `git mv` `pages/bilateral-results/bilateral-results.service.{ts,spec.ts}` → `pages/bilateral-review/services/`, and `pages/bilateral-results/components/results-review-table/components/result-review-drawer/` (drawer, its five content components, its AGENTS.md) → `pages/bilateral-review/components/result-review-drawer/`. Re-point the **four** cross-folder importers (`results-list.component.ts:14-17`, `notification-item.component.ts:8`, `programme-results.component.ts:43-45`, `dashboard-lab.component.ts:73` + `dashboard-lab.component.spec.ts:18` + `dashboard-lab.scope.spec.ts:18`) and every intra-folder import. Remove service members only after `grep` proves no importer outside the legacy shell uses them (candidates: `centers`, `currentCenterSelected`, `selectedCenterCode`, `selectCenter`, `allResultsForCounts`, `pendingCountByAcronym`, `totalPendingCount`, `centerAcronymsWithResults`, `centersToShowInSidebar`, `refreshAllResultsForCounts`); keep everything the importers use. Create `bilateral-review-access.service.ts` (root; `isProgramMember(code)` = admin OR `myInitiativesList` membership) and make the drawer's `canEditInDrawer` (`result-review-drawer.component.ts:178-186`) = `isAdmin || (statusId == 5 && isProgramMember(entityId))` — **keep the status guard**; `canEditDataStandards` unchanged. Do not delete the legacy shell yet (T-6).
- **Implements:** `BRT-R-14`, `BRT-R-18` (relocation + cross-folder clauses), scenario "Non-reviewer sees the queue read-only" (drawer clause "must NOT show approve/reject controls")
- **Design refs:** §6.2 services, `BRT-DD-4`
- **Files (expected):** moved paths above; `results-list.component.ts`, `notification-item.component.ts`, `programme-results.component.ts`, `dashboard-lab.component.ts` + two specs; `bilateral-review-access.service.{ts,spec.ts}`
- **Depends on:** — · **Blocks:** T-3, T-6
- **Estimate:** S
- **Skills:** `angular-developer`
- **Tests:** relocated drawer + service specs pass unchanged from the new path; access service spec: admin → true; member of `SP02` → true for `SP02`, false for `SP03`; guest → false; drawer spec: member + `status_id 6` row → `canEditInDrawer` false and approve/reject absent; member + `status_id 5` → true; non-member → false.
- **Verification:** `npx jest src/app/pages/result-framework-reporting/pages/bilateral-review src/app/pages/result-framework-reporting/pages/programme-results src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.spec.ts src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.scope.spec.ts src/app/pages/results/pages/results-outlet/pages/results-list src/app/pages/results/pages/results-outlet/pages/results-notifications --silent`; `grep -rn "pages/bilateral-results" onecgiar-pr-client/src --include='*.ts' --include='*.html'` returns only the legacy shell's own files (FAIL input: any hit outside `pages/bilateral-results/`).
- **Disqualifiers:** specs "passing" because they were skipped or their assertions were loosened; a `git status` showing copies instead of renames (history must follow the files).
- **Done when:** moves are renames in git, all listed suites green, grep clean.

### `BRT-T-3` — Page shell: band mount, toolbar, status chips, KPI strip, URL sync

- **Status:** [x] PASS 2026-09-07 (attempt 2, see `execution.md`; HITL look #2 deferred to the T-6 gate)
- **Type:** `client`
- **Description:** Create `BilateralReviewComponent` (standalone, OnPush, signals) at `pages/bilateral-review/`: route param → `programCode`; programme name/cycle resolved as `my-work-board.component.ts:291-298`; band mounted as `my-work-board.component.html:46-59` (`activeTab="bilateral-review"`, `showToolbar=false`, `frameLocked`, `scrollHost`, `canReport`, `canReportEmerging`, `whereToReport`, `reportEmerging`); single `GET_ResultToReview(code)` (no `centerIds`) into the relocated service, then `BilateralReviewCountService.setFromRows(code, rows)`; `CentersService.getData()` once → `{ code → acronym }` map (the `center` query param holds CLARISA center **codes** as the legacy `?center=` did; options labeled by acronym; rows matched on `lead_center` / `acronym`); own toolbar inside `#workArea` (search + match count, Filter popover with Center / Bilateral project / Indicator category `app-pr-filter-multiselect` + Clear filters, Only pending, Expand all / Collapse all, Grouped / All results) copied from the band's blocks **with the band's icons** (Lucide `ng-icon` for search and expand-all), popover open/close/Escape/outside-click owned by the page after `my-work-board.component.ts` `toggleFilterPopover`; status chips `All · Pending review · Approved · Rejected` with counts and `aria-pressed`; `BilateralReviewKpisComponent` (four cards; Pending card is a toggle with `aria-pressed` + active style); computed pipeline per design §6.2 (`searchFiltered` → `chipCounts`/`kpis` → `visibleRows` → `groups`); URL ⇄ state effects with keys `search, status, center, project, category, view` (`bilateral-review.query-params.ts`); loading (skeleton KPI cards + rows), empty, filtered-empty (Clear filters), error (retry) states. Table area renders a placeholder list of `visibleRows` (T-4 replaces it). No native `disabled` anywhere (KZ-REH-2).
- **Implements:** `BRT-R-1` (route reachability with T-6), `BRT-R-4`, `BRT-R-6`, `BRT-R-7`, `BRT-R-8`, `BRT-R-9`, `BRT-R-15`, `BRT-R-20`, `BRT-R-31`, `BRT-R-32` (KPI/toolbar wrap), `BRT-AC-4`, `BRT-AC-5`, `BRT-AC-6`, `BRT-AC-7`, `BRT-AC-10`, `BRT-AC-15` (tabs → toolbar → chips → KPI order)
- **Design refs:** §6.2 page component, toolbar, chips, KPIs; §6.3; `BRT-DD-1`
- **Files (expected):** `bilateral-review.component.{ts,html,spec.ts}`, `bilateral-review.query-params.ts`, `bilateral-review.copy.ts`, `components/bilateral-review-kpis/*`
- **Depends on:** T-1, T-2 · **Blocks:** T-4, T-5, T-7
- **Estimate:** L
- **Skills:** `angular-developer`, `frontend-design`
- **Tests:** the AC-4 fixture (2 projects · 3 centers · 7 rows: 3 pending incl. one Contributor-role row · 2 approved · 1 rejected · 1 Editing): KPI values 2/3/3/3 with sublabel "2 approved · 1 rejected"; chip counts All 7 · Pending 3 · Approved 2 · Rejected 1; Editing row gets a neutral chip; Pending card toggle ⇄ chip; search `desira` keeps only DESIRA rows and sets match count; `?center=<code of CIP>` hydrates the filter and shows CIP; Center filter + badge 1 + Clear filters; URL hydration of all six keys and write-back with `replaceUrl` (spy on `router.navigate`); Only pending sets `status=pending`; `setFromRows` called with the loaded rows and the count service reads 3 (AC-19); no element with a native `disabled` attribute in the rendered toolbar/chips.
- **Verification:** `npx jest src/app/pages/result-framework-reporting/pages/bilateral-review --silent`; `npx ng lint --quiet`. FAIL inputs: a fixture where two counters coincide must be rejected by the Reviewer (KZ-KCR fixture rule); swapping `replaceUrl` to `false` must fail the write-back test.
- **Disqualifiers:** counts asserted against the component's own computed rather than rendered text; a chip test that passes with the filter no-op'd.
- **Done when:** suites green; **HITL look #2** in the Orca browser at 1536 and 840 CSS px (owner compares against `reference/target-reporting-tab-new-look.png`; corrections fold into T-4/T-5 before they start).

### `BRT-T-4` — Grouped / flat results table

- **Status:** [x] PASS 2026-09-07 (attempt 3; H2-1 folded, see `execution.md`)
- **Type:** `client`
- **Description:** `BilateralReviewTableComponent`: grouped view on `PrGroupTableComponent` as the legacy table (`groupRowsBy='project_name'`, **`dataKey='project_name'`**, `expandedRowKeys` seeded with every `project_name` and re-seeded on `expandAllNonce`; templates `prTableHeader`, `prTableGroupHeader` with `prRowToggler` + `aria-expanded`, **`prTableExpandedRow`** iterating `item.results` through a shared row `ng-template`, `prTableEmpty`, `prTableLoading`); group header = `project_name` as delivered, distinct lead centers, `N results · M pending`; row columns per BRT-R-11 with status chip tones by loose-equality `status_id` (5 amber, 6 green, 7 red, else neutral with `status_name`), Contributor tag, action **Review** / **See** (`edit` / `visibility`) gated by `canReview` input; **flat view = a plain `<table>` in the same component** reusing the header and row template over `flatRows` sorted by `submission_date` desc (page-sorted); real `table/thead/tbody` sizing via `<col>` / `min-w-*` cells (no CSS grid); wrapper `overflow-x-auto`. Replace T-3's placeholder.
- **Implements:** `BRT-R-10`, `BRT-R-11`, `BRT-R-12`, `BRT-R-30`, `BRT-R-32` (table scroll clause), `BRT-AC-8`, `BRT-AC-15` (group headers → row actions order); scenario "Non-reviewer" (action reads See)
- **Design refs:** §6.2 table, §6.3, `BRT-DD-3`
- **Files (expected):** `components/bilateral-review-table/bilateral-review-table.component.{ts,html,spec.ts}`; `bilateral-review.component.html` (host)
- **Depends on:** T-3 · **Blocks:** T-5, T-7
- **Estimate:** M
- **Skills:** `angular-developer`, `frontend-design`
- **Tests:** groups render with header counts from the AC-4 fixture; toggling one group header collapses **only** that group (FAIL input for a wrong `dataKey`: with two groups, one toggle must not collapse both); group with zero visible rows hidden; Expand all / Collapse all toggles all groups (assert rendered rows, not state); action label/icon by `status_id` × `canReview`; flat view has no group headers and rows sorted desc by `submission_date`; status chip class by id incl. neutral for `Editing`.
- **Verification:** `npx jest src/app/pages/result-framework-reporting/pages/bilateral-review/components/bilateral-review-table --silent`; `npx ng lint --quiet`. FAIL input: a row with `status_id` as the string `"5"` must still read Pending (loose equality parity, legacy gotcha 5).
- **Disqualifiers:** expand/collapse asserted on a signal instead of DOM row count; a test that never renders a non-5/6/7 status.
- **Done when:** suite green; corrections from HITL look #2 applied.

### `BRT-T-5` — Drawer wiring, decision propagation, deep-linked open

- **Status:** [x] PASS 2026-09-07 (attempt 3 final: `@if` around the drawer mount for H4-1; attempts 1–2 PASS; H3-1 SCSS fix; see `execution.md`)
- **Type:** `client`
- **Description:** Host the relocated drawer in the page (`visible` / `resultToReview` models); row action opens it; `decisionMade` → re-fetch the list (which calls `setFromRows`, so the badge follows without a second request); rows, chip counts, KPI cards and badge update in place (component instance preserved, filters and URL untouched); deep-link effect from `results-review-table.component.ts:134-160` ported (opens once `tableResults` is non-empty, falls back to `{ id, result_code }`, clears `reviewResult`/`reviewResultId` with `replaceUrl`); in-flight decision guards the Review button with `aria-disabled` + `title`.
- **Implements:** `BRT-R-13`, `BRT-R-21`, `BRT-AC-9`, `BRT-AC-17`; scenario "Reviewer approves from the new tab" (all clauses incl. "must NOT reload", "payload unchanged")
- **Design refs:** §2.2 flow, §6.2, §6.4
- **Files (expected):** `bilateral-review.component.{ts,html,spec.ts}`
- **Depends on:** T-2, T-4 · **Blocks:** T-7
- **Estimate:** M
- **Skills:** `angular-developer`
- **Tests:** drawer stub emits `decisionMade` → exactly one list re-fetch and `setFromRows` called with the new rows (badge 3 → 2 when the approved row was pending, AC-19); the `ComponentRef` instance is the same before/after; search/status signals unchanged; URL not navigated except the drawer's own param clearing; deep link with a code in the list opens that row; with a code absent and an id present opens the minimal object; both params removed with `replaceUrl`; the decision payload sent by the (real) drawer spec remains `{ decision, justification }` (existing drawer spec).
- **Verification:** `npx jest src/app/pages/result-framework-reporting/pages/bilateral-review --silent`. FAIL input: removing the `setFromRows` call must fail the badge test; removing `replaceUrl` must fail the param-clearing test.
- **Disqualifiers:** a propagation test that re-creates the component fixture between decision and assertion.
- **Done when:** green; **cut point** — the owner may stop here with the feature usable (T-6 is required before merge, T-7/T-8 are quality).

### `BRT-T-6` — Routing, redirect, link producers, Smart Back, legacy deletion

- **Status:** [x] PASS 2026-09-07 (attempt 3; attempts 2–3 docs-only, see `execution.md`)
- **Type:** `client`
- **Description:** Add the `bilateral-review` route (`rfrView: 'bilateral-review'`, sidebar width 300, `loadComponent`); turn `results-review` into `redirectTo: 'entity-details/:entityId/bilateral-review'` (`pathMatch: 'full'`) and drop the `BilateralResultsComponent` import; update the **five** producers (`results-list.component.ts:682`, `programme-results.component.ts:1433`, `pop-up-notification-item.component.ts:107`, `notification-item.component.ts:366`, `update-notification.component.html:7`) and the **four** spec files that hard-code the old string (`results-list.component.spec.ts:951,1023`, `programme-results.component.spec.ts:1654,1716,1723`, `pop-up-notification-item.component.spec.ts:207`, `smart-navigation.service.spec.ts:73,261,315`); add `isBilateralReviewTab(url)` to `smart-navigation.service.ts` and use it in `isReportingTab`'s exclusion (do not add to known origins); add `'bilateral-review'` to the `returnTab` whitelist at `dashboard-lab.component.ts:755` and `:866` (BRT-R-22) and have the page send `returnTab: 'bilateral-review'` on the emerging hop; delete `pages/bilateral-results/` (shell, breadcrumb, `indicators-sidebar`, `results-review-filters`, `results-review-container`, `results-review-table`, page AGENTS.md) and update the doc references (`src/CLAUDE.md:168`, `pages/result-framework-reporting/AGENTS.md`, `README.md`).
- **Implements:** `BRT-R-1` (route), `BRT-R-16`, `BRT-R-17`, `BRT-R-18` (deletion clause), `BRT-R-22`, `BRT-AC-11`, `BRT-AC-12`, `BRT-AC-13`, `BRT-AC-18`, `BRT-AC-20`; scenario "Old link keeps working" (all clauses)
- **Design refs:** §6.1, `BRT-DD-5`, `BRT-DD-6`
- **Files (expected):** `shared/routing/routing-data.ts`, `shared/services/smart-navigation.service.{ts,spec.ts}`, the five producers + four specs, `dashboard-lab.component.{ts,spec.ts}` (returnTab), `bilateral-review.component.ts` (hop), deletions, guides
- **Depends on:** T-1, T-2, T-3 · **Blocks:** T-7, T-8
- **Estimate:** M
- **Skills:** `angular-developer`
- **Tests:** `RouterTestingHarness`: navigating to `/result-framework-reporting/entity-details/SP13/results-review?center=12&search=x` ends at `/…/SP13/bilateral-review?center=12&search=x` and instantiates `BilateralReviewComponent`; producer specs assert the new path; smart-navigation spec: `isReportingTab('…/SP02/bilateral-review')` false, `isReportingTab('…/SP02')` true, existing cases green; dashboard-lab spec: `returnTab=bilateral-review` navigates to the tab (AC-20).
- **Verification:** `npx jest src/app/shared/services/smart-navigation.service.spec.ts src/app/shared/components/header-panel src/app/pages/results/pages/results-outlet --silent`; `grep -rn "results-review" onecgiar-pr-client/src onecgiar-pr-server/src --include='*.ts' --include='*.html' | grep -v "pages/entity-details/"` returns only the redirect route line and the `isBilateralReviewTab` doc comment (FAIL input: any other hit; `pages/entity-details/` is unrouted dead code, excluded by AC-12); `test ! -d onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-results`; `npx ng build --configuration development` 0 errors.
- **Disqualifiers:** a redirect test that asserts only the final URL without asserting the query string; a build that "passes" with the legacy folder still present.
- **Done when:** grep clean, build clean, listed suites green.

### `BRT-T-7` — Layout gate (Cypress CT) and accessibility pass

- **Status:** [x] PASS 2026-09-07 (attempt 2, RED probe recorded, see `execution.md`)
- **Type:** `tests`
- **Description:** Cypress CT for `BilateralReviewComponent` with the T-3 fixture at effective 840 and 1536 CSS px: KPI strip 2×2 vs 1×4; `document.documentElement.scrollWidth <= clientWidth`; chips wrap without clipping; table wrapper scrolls horizontally; clicking the group toggler node (not the row center, KZ-MWB-3) collapses its rows; keyboard order tabs → toolbar → chips → KPI → group headers → row actions; `axe` run on the rendered page (text-on-solid). Run the CT once against a FAIL input (a fixed `min-width: 2000px` column) and record RED.
- **Implements:** `BRT-AC-14`, `BRT-AC-15`, `BRT-R-32`; defect classes "layout" and "contrast (solid)" from `requirements.md` §11
- **Design refs:** §6.3, §10
- **Files (expected):** `pages/bilateral-review/bilateral-review.cy.ts`
- **Depends on:** T-3, T-4, T-5, T-6 · **Blocks:** T-8
- **Estimate:** M
- **Skills:** `angular-developer`, `playwright-cli` (only if CT is unavailable locally; then a real-page check in the Orca browser substitutes and is recorded as such)
- **Verification:** `npx cypress run --component --spec <file>` green after the RED run is recorded in `execution.md`. FAIL input as described.
- **Disqualifiers:** a CT that never went RED on the FAIL input; viewport assertions that ignore the ×1.2 root zoom (`project-orca-browser-real-page-checks`).
- **Done when:** both viewports green, RED evidence recorded, `axe` violations 0 (gradient contrast recorded as HITL-only).

### `BRT-T-8` — Module guide, final real-page look, spec bookkeeping

- **Status:** [x] PASS 2026-09-07 (attempt 2; Leader final look done, owner sign-off pending; see `execution.md`)
- **Type:** `docs`
- **Description:** Write `pages/bilateral-review/CLAUDE.md` (routes, query-param contract, state, endpoints, gotchas inherited from the legacy guide that still apply: loose `status_id` equality, client-side filtering, deep-link drawer); update the drawer AGENTS.md path references; final HITL look #3 across the five tabs on SP02 and a center-heavy program; record follow-ups from design §13 in `execution.md`; mark `requirements.md` status `shipped` on archive.
- **Implements:** BRT-R-5 evidence (five tabs unchanged), defect class "visual parity" (HITL)
- **Design refs:** §13, §14
- **Files (expected):** `pages/bilateral-review/CLAUDE.md`, drawer `AGENTS.md`, `execution.md`
- **Depends on:** T-6, T-7 · **Blocks:** —
- **Estimate:** S
- **Skills:** `cognitive-doc-design`
- **Verification:** owner confirms the look; `npx ng lint --quiet`; guide ≤ 150 lines.
- **Disqualifiers:** a guide that restates the legacy page's sidebar/drawer-filter behavior.
- **Done when:** owner sign-off recorded.

---

## 4. Dependency graph

```
BRT-T-1 (band + count service)      BRT-T-2 (relocate + access rule)
        └──────────────┬──────────────────┘
                       ▼
               BRT-T-3 (page shell, toolbar, chips, KPIs, URL sync)  ── HITL look #2
                       ├──────────────► BRT-T-6 (routing, redirect, links, deletion)
                       ▼
               BRT-T-4 (grouped/flat table)
                       ▼
               BRT-T-5 (drawer + propagation + deep link)  ── cut point
                       ▼
               BRT-T-7 (CT layout gate)  ◄── T-6
                       ▼
               BRT-T-8 (guide, final look)
```

Parallel-safe: T-1 ∥ T-2 (disjoint files). T-6 may run in parallel with T-4/T-5 once T-3 is green (it touches routing/producers, not the page). Everything else is serial.

---

## 5. Requirement and scenario coverage

| Requirement / scenario clause | Owning task |
|---|---|
| R-1 tab+label / route | T-1 / T-6 |
| R-2, R-3, R-5, R-19 | T-1 |
| R-4, R-6, R-7, R-8, R-9, R-15, R-20, R-31 | T-3 |
| R-10, R-11, R-12, R-30 | T-4 |
| R-13, R-21 | T-5 |
| R-14 | T-2 |
| R-16, R-17, R-22 | T-6 |
| R-18 relocation + cross-folder / deletion | T-2 / T-6 |
| R-32 KPI+toolbar wrap / table scroll / body no-scroll gate | T-3 / T-4 / T-7 |
| R-40 (MAY) | not owned (deferred) |
| AC-1, 2, 3, 16 | T-1 |
| AC-4, 5, 6, 7, 10 | T-3 |
| AC-8 | T-4 |
| AC-9, 17 | T-5 |
| AC-11, 12, 13, 18, 20 | T-6 |
| AC-19 (badge == KPI, before and after a decision) | T-3 / T-5 |
| AC-14, 15 | T-7 (order across tabs/toolbar/chips/KPI: T-3; headers/actions: T-4) |
| Scenario "approves": THEN/AND/BUT no reload/AND payload unchanged | T-5 |
| Scenario "siblings unchanged": THEN/BUT no template edits/AND specs untouched | T-1 |
| Scenario "old link": THEN/BUT no legacy or 404/AND URL readable | T-6 |
| Scenario "non-reviewer": THEN See / BUT drawer controls / AND badge | T-4 / T-2 / T-1 |

---

## 6. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `BRT-TEST-1` | unit (client) | R-2, R-3, R-5, R-19, AC-1/2/3/16 | `reporting-program-band.component.spec.ts`, `bilateral-review-count.service.spec.ts` |
| `BRT-TEST-2` | unit (client) | R-14, R-18, non-reviewer drawer clause | `bilateral-review-access.service.spec.ts`, relocated drawer/service specs |
| `BRT-TEST-3` | unit (client) | R-4, R-6…R-9, R-15, R-31, AC-4/5/6/7/10 | `bilateral-review.component.spec.ts`, `bilateral-review-kpis.component.spec.ts` |
| `BRT-TEST-4` | unit (client) | R-10…R-12, R-30, AC-8 | `bilateral-review-table.component.spec.ts` |
| `BRT-TEST-5` | unit (client) | R-13, R-21, AC-9/17 | `bilateral-review.component.spec.ts` |
| `BRT-TEST-6` | unit (client) | R-16, R-17, R-22, AC-11/12/18/20 | `smart-navigation.service.spec.ts`, producer specs, routing harness spec |
| `BRT-TEST-7` | cypress CT | R-32, AC-14/15 | `bilateral-review.cy.ts` |
| HITL | manual | visual parity, gradient contrast | Orca browser looks #1–#3 |

Client coverage stays above 50/60/60/60 (deleted legacy specs replaced one-for-one or better).

---

## 7. Rollout & verification

- [ ] Single PR against `qa-development-2026` (see §9), commits `✨ feat(bilateral-review) [SPEC:changes/sp-bilateral-review-tab]: …`, refactor/fix emojis where apt.
- [ ] CI green (lint, Jest, build, SonarCloud); no migration involved.
- [ ] Manual QA on the test environment: SP02 and SP13 five-tab check, approve/reject round-trip, a notification deep link, an old `/results-review` bookmark.

---

## 8. Cleanup & follow-ups

- [ ] Spec status → `shipped`; `/akili-archive` kaizen entry.
- [ ] Follow-ups from design §13: Smart Back origin promotion; delete unrouted `EntityDetailsComponent` + banner (`/akili-quick`); phase scoping decision.
- [ ] Pending default-branch applies: none from this branch (no shared-file edits).

---

## 9. PR strategy

Estimated ~1,200 added source (≈ 600 net) + ~1,900 test LOC exceeds the ~400 LOC single-PR guideline, but the change is one user-visible feature whose halves (band tab, page, redirect, deletion) are not independently shippable: a band tab without the route 404s, a route without the deletion leaves two review pages. **Recommendation: one PR**, with the description ordered for review empathy: (1) `routing-data.ts` + band diff first, (2) the page component, (3) relocations shown as renames, (4) deletions last; explicitly out of scope: drawer internals, server. If the owner prefers two PRs, split as PR-A = T-1 + T-2 + T-6 (band, relocation, routing, deletion; legacy page temporarily replaced by a redirect to the not-yet-rich tab) and PR-B = T-3 … T-8; PR-A must not merge without PR-B in the same release.

---

## 10. Roll-back plan

1. Revert the PR (single commit range; renames revert cleanly).
2. No migration, no API change, no feature flag.
3. Verify `/results-review` renders the legacy page again and the band shows four tabs.

---

## Required cross-references

- `requirements.md`, `design.md`, `proposal.md`, `judgment.md` (same folder).
- `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md`.
- `.agents/model-routing.md` (skills: `angular-developer`, `frontend-design`, `cognitive-doc-design`; Tester on a model ≠ Implementer).
