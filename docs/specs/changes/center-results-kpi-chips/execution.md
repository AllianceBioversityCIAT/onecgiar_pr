# Execution Log — Center results parity + KPI category chips (`CRK`)

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/center-results-kpi-chips` |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` (no commits by agents — user go-ahead required) |
| Started | 2026-10-20 |
| Leader | Claude Opus 5.5 (T1) · Implementer/Reviewer via `.claude/agents/akili-*` wrappers |
| Budget | 6 tasks · ~380 LOC · ≤ 2 review rounds/task |

## Task Execution History

### CRK-T-1 — Server: categorise Other output / Other outcome KPIs

- **Final status:** PASS (attempt 1 of 3) · **Date:** 2026-10-20
- **Skills / effort:** `nestjs-expert`, `tdd` · effort `high` (one level above T2 default: payload values change for 3 endpoints; review = full)
- **Execution order note:** T-1/T-2/T-3 are file-independent, but run serially — machine rule allows one Jest run at a time.
- **Requirements covered:** CRK-R-5 (incl. BUT no re-label of specific types; AND IT MUST not categorise other `custom` names), design §5, CRK-DD-0.

#### Attempt 1

- **Files changed:**
  - `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts` (+17/-2) — module constant `CUSTOM_OTHER_KPI_CASE_BRANCHES` (`type_value = 'custom' AND LOWER(TRIM(type_name)) LIKE 'other output%'` → 8, `'other outcome%'` → 4), interpolated after the `THEN 7` branch and before `ELSE NULL` in both the `result_type_id` CASE and the `result_type_name` subselect CASE.
  - `…/aow-bilateral.repository.spec.ts` (+131) — `describe('CRK-R-5 …')`, 8 cases: both copies carry both branches in order; no custom branch precedes a specific LIKE; guard count + no bare `other%`; name via `result_type` join; SQL captured from `findIntermediateOutcomes`, `find2030Outcomes`, `findByCompositeCode`.
- **Implementer verification:**
  - Red (before impl, `-t "CRK-R-5"`): 8 failed / 83 skipped (branches absent, guard match null, endpoint captures failing).
  - Green: `cd onecgiar-pr-server && npx jest --maxWorkers=2 --testPathPattern=aow-bilateral.repository.spec` → `Tests: 91 passed, 91 total`.
  - Lint: `npx eslint <2 files> --quiet` → exit 0 (prettier autofix on the two files only).
  - Disqualifier not triggered: the three KPI endpoints all go through `fetchAndGroupTocResults` → `buildTocQuery`.
- **Implementer `Not Done / Assumptions` (verbatim, adjudicated):**
  - "Run-time evidence is SQL-text only (the spec mocks `dataSource.query`). No real MySQL execution against the 17 / 5 SP12 counts." → **Not task scope**: tasks.md CRK-T-1 Disqualifier assigns DB behaviour to CRK-T-6. Forward pointer recorded below.
  - "confirm `result_type` rows 8 and 4 carry those names (this repo cannot verify it)" → Reviewer found the seed migrations name them `'Other output'` / `'Other outcome'`; live DB check → CRK-T-6 forward pointer.
  - Free RAM was 4.3 GB at run time (threshold 4 GB) — informational.
- **Reviewer verdict:** `STATUS: PASS` — both copies carry the branches after the last specific branch and before `ELSE NULL`, guarded by `type_value = 'custom'` + `LOWER(TRIM(`; glossary prefixes cover all §3 variants and exclude `other` / ` Other Outpuit` / `Other quantitative measure …`; client keys `'Other output'`/`'Other outcome'` (`reporting-quick-typology.util.ts` L18-19, `matchTypology` case-sensitive on trimmed name) match seed names in `1665720566708-insertResultLevelType.ts` L62/L74 and `ResultTypeEnum` 4/8; assertions are falsifier-sensitive; `indicator-type-mapping.constant.ts` untouched.
- **ADVISORY (4R, non-gating):**
  - Risk: live `result_type` names for ids 4/8 inferred from seed migrations, not checked on PRTest/prod — a rename would zero the chips again. Deferred to CRK-T-6.
  - Readability: tasks.md CRK-T-1 "Consumers" names `findWorkPackagesByProgram`, which does not use `buildTocQuery`; the AoW KPI endpoint is `findByCompositeCode` (tested). Spec-text drift only, no code change.
  - Reliability: `LOWER()` redundant under MySQL default ci collation; harmless, keeps the rule correct under a cs collation.

#### Decisions / issues

- None beyond the adjudication above.

#### Forward pointers → CRK-T-6

- Verify on PRTest that SP12 chips read `Other Output 17` / `Other Outcome 5` (DB behaviour, not proven by SQL-text spec).
- Verify `result_type` rows 4 / 8 are named exactly `Other outcome` / `Other output` (client match is case-sensitive).

- **Final verification:** scoped server spec 91/91 green; lint clean.

### CRK-T-2 — Client: chip counts ignore category, hide zero chips

- **Final status:** PASS (attempt 1 of 3) · **Date:** 2026-10-20
- **Skills / effort:** `angular-developer`, `tdd` · effort `medium` (T2 default; well-specified task)
- **Gate:** user said "continua hasta que termines" (2026-10-20) → continue/pause gates auto-pass through CRK-T-5; CRK-T-6 still pauses (needs commit + merge + deploy, user go-ahead).
- **Requirements covered:** CRK-R-6, CRK-R-7 (Type = HLO; selecting a chip keeps the others incl. BUT cards show only selected; Type removes the active category), CRK-DD-1, CRK-DD-2.

#### Attempt 1

- **Files changed** (under `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/`):
  - `dashboard-lab.component.ts` — `reportingGroups` body → private `buildReportingGroups(applyCategory)`; `reportingGroups` = build(true); new `reportingGroupsForCounts` = build(false); `reportingTypologyCounts` iterates the latter. `applyCategory` feeds only `noTypology`; Type/Target/Section untouched.
  - `components/reporting-quick-typology-filters/reporting-quick-typology.util.ts` — `buildQuickTypologyChips` keeps a chip iff `matchKey === 'all' || active || count > 0`.
  - `…/reporting-quick-typology.util.spec.ts` (+3 cases), `dashboard-lab.crk-chips.spec.ts` (new, 3 cases).
  - Existing specs edited (adjudicated by Reviewer as allowed, none assert `reportingGroups` output): `dashboard-lab.component.spec.ts` (+1 spy on `reportingGroupsForCounts`, no assertion edited); `dashboard-lab.kcr-reconciliation.spec.ts` ~L621 counts `all` 1 → 2 (R-7 reverses "counts follow Category"); `reporting-program-band.component.spec.ts` 4 chip tests (zero chips now hidden; key `kp` → `'Knowledge product'`, the old key matched no chip).
- **Implementer verification:**
  - Red: util 2/3 new cases failed (hidden chip, active-zero); crk-chips "selecting a chip keeps the other counts" failed (IU dropped, all 3 vs 2); 2 crk cases pin existing behaviour.
  - Green: `npx jest --maxWorkers=2 --no-coverage --testPathPattern="reporting-quick-typology|dashboard-lab"` → 49 suites / 1604 tests passed. `--findRelatedTests dashboard-lab.component.ts reporting-quick-typology.util.ts` → 42 suites / 1864 tests passed.
  - Lint: `ESLINT_USE_FLAT_CONFIG=false npx eslint <touched> --quiet` → exit 0 (task's plain `npx eslint` fails: client has `.eslintrc.json`, no flat config).
- **Reviewer verdict:** `STATUS: PASS` — `applyCategory` only gates `noTypology` (L3726); Target (L3732) and Type/Section (L3737-3747) never read it; edited specs are count/rendering assertions mandated by R-6/R-7; "Type removes the active category" covered by util active-zero case + crk Type=hlo case; single consumer of `buildQuickTypologyChips` iterates with `track chip.id`, no index/length reliance. `matchKey === 'all'` vs design's `id === 'all'` — equivalent for Total.
- **ADVISORY (4R, non-gating):**
  - Readability: `dashboard-lab.kcr-reconciliation.spec.ts` L595 title still says "follows the Type and Category filters"; suggest "…follows the Type filter; ignores Category (CRK-R-7)".
  - Readability: inline comment `dashboard-lab.component.ts` L3729-3730 ("every surface below (chips, …) reads the already-filtered rows") is stale for chips.

#### Pending doc item (not in tasks.md — record only)

- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/CLAUDE.md` still says `reportingGroups()` feeds the chips / Target "same stage as Category"; needs a `reportingGroupsForCounts` note. Folder guide → shared-file discipline: apply at `/akili-archive` or on `staging`, not by this run.

- **Final verification:** scoped client specs green (1604 + related 1864); lint clean.

### CRK-T-3 — Client: `groupCenterResults` pure util

- **Final status:** PASS (attempt 1 of 3) · **Date:** 2026-10-20 · auto-continued (user "continua hasta que termines")
- **Skills / effort:** `angular-developer`, `tdd` · effort `medium`
- **Requirements covered:** CRK-R-1 (merge / BUT not different codes), CRK-R-4 (newest-version fields), CRK-R-2 normalizer, CRK-DD-3.
- **Note:** Implementer ran in parallel with the CRK-T-2 Reviewer (Reviewer runs no tests → one Jest run at a time held).

#### Attempt 1

- **Files changed (new):** `onecgiar-pr-client/src/app/pages/bilateral/bilateral-result-grouping.ts` (`BilateralCenterResultGroup = BilateralCenterResult & { versions }`, `groupCenterResults(rows)`, `isReplicatedRow(row)`), `…/bilateral-result-grouping.spec.ts` (13 tests).
- **Implementer verification:** red = suite failed on missing module (new file); green `npx jest --maxWorkers=2 --no-coverage --testPathPattern=bilateral-result-grouping` → 1 suite / 13 tests passed; lint `ESLINT_USE_FLAT_CONFIG=false npx eslint <2 files> --quiet` clean.
- **Implementer `Not Done / Assumptions` (verbatim, adjudicated):** "`version_id` … is the phase id. I assumed it increases with the phase year, and I did not verify that against the server or real data." → **Spec-conformant** (design CRK-DD-3 prescribes "`version_id` desc"); Reviewer confirmed. Real-data check → CRK-T-6 forward pointer.
- **Reviewer verdict:** `STATUS: PASS` — all falsifier cases covered (spec L23-74); newest-version spread; Map preserves first-appearance order; no input mutation; type usable by T-4.
- **ADVISORY (4R, non-gating):** Reliability — other client phase orderings sort by `phase_year`, not id (`bilateral-overview.component.ts:538`, `overview-controls.component.ts:154`, `dashboard-lab.component.ts:1608`, `centers-block.component.ts:221`). If T-6 shows mis-ordering, revise DD-3 in a later spec revision.

#### Forward pointers → CRK-T-6

- On PRTest (IITA, 2025 + 2026), confirm the 2026 version of a replicated code stacks above 2025 (validates `version_id` desc ≈ phase-year desc).

- **Final verification:** 13/13 green; lint clean.

### CRK-T-4 — Client: grouped rows + badge in center Results table

- **Skills / effort:** `angular-developer`, `tdd` · attempt 1 effort `high` (full review: row interaction + keyboard + focus); attempt 2 bumped to `xhigh`.
- **Requirements covered:** CRK-R-1, CRK-R-2, CRK-R-4, CRK-DD-3, CRK-DD-4.

#### Attempt 1 — FAIL

- **Files changed:** `bilateral-results-list.component.ts` (+`groupedResults`, `totalCount`/`totalLoaded` on groups, `versionPhaseLabel`, `isReplicated`, `PrTooltipDirectiveModule`), `.html` (table on `groupedResults()`, per-version `.rc-line` stacked in every cell with click/Enter → `openResult(version)`, `tabindex=0` on first-column lines only, `.rc-phase-tag` when >1 version, `rc-badge-replicated` + tooltip before title, `tr` click/tabindex removed, `isFocused(row)`, justification trigger `(keydown.enter)` stopPropagation, row "⋯" menu bound to `latest = row.versions[0]`), `.scss` (`.rc-line`, `.rc-phase-tag`, local `.rc-badge-replicated`), `.spec.ts` (+161, 12 tests).
- **Implementer verification:** red `-t CRK` → 10 failed / 89 skipped / 2 passed; green whole file 101/101; `--findRelatedTests` component.ts → 21 suites / 818 tests passed; lint (ts files) exit 0. Disqualifier (sorting) not triggered: `pr-table` `resolve()` reads `row[field]` (pr-table.component.ts:221-225).
- **Implementer `Not Done / Assumptions`:** (a) row menu acts on newest version; (b) stacked-line layout → CRK-T-6; padding clicks no longer open; (c) `bilateral-results-list/CLAUDE.md` describes row click → pending doc item.
- **Reviewer verdict (verbatim issue):** `STATUS: FAIL`
  1. **Discovered Issue:** Every menu action (Open, Update, PDF, Copy link, Delete) is bound to `latest` (component.html:403, 496-562). With both phases selected, the 2025 version of 9878 has no PDF, Copy link or Delete (admin, or status 1 per `canDeleteResult`, component.ts:1391). Before CRK each version was its own flat row with its own menu, so this removes something users could do. The exemplar renders one menu button per version in the action cell (results-list.component.html:390-404, `@for (subResult of result['results'])` → `toggleMenu($event, subResult)`).
     **Violated Rule:** design.md §6.2 L77 "`isFocused`, justification modal and any per-row action already take a `BilateralCenterResult` → pass the version, not the group". tasks.md CRK-T-4 Consumers ("called with a version"). requirements.md CRK-R-1 "Scenario: open a specific version" (same target as today for that `result_code` + `version_id`). Binding every version's actions to the newest one breaks all three.
     **Remediation Suggestion:** In `td.rc-td--action`, loop over `row.versions` and render one trigger plus its cdk overlay per version, stacked like the cells (`rc-line`). Bind each to that version. `rowKey`/`openMenuKey` are already keyed by version, so per-version open state works as is. Each trigger needs its own `cdkOverlayOrigin` template ref inside the loop. Add a test: open the 2025 line's menu and assert `pdfHref`, `copyLink` and `deleteResult` receive `version_id: 35`.
- **Leader adjudication:** FAIL upheld — in scope (design §6.2 names per-row actions explicitly).

#### Attempt 2 — PASS

- **Effort:** `xhigh` (bumped one level after FAIL). Same Implementer resumed with the verbatim FAIL report + attempt history.
- **Files changed (delta):** `.html` — `@let latest` removed; `td.rc-td--action` loops `row.versions`, one `div.rc-action-line` per version with its own `#rowMenuTrigger` `cdkOverlayOrigin` + `cdkConnectedOverlay`; all menu actions bound to that version; trigger 28px + aria-label "More actions for <phase>" when >1 version, else 32px "More actions"; badge `aria-label="Previously reported in an earlier phase"`. `.scss` — `.rc-action-line`. `.spec.ts` — +5 tests (per-version triggers; 2025 menu → version 35 for PDF href `?phase=35`, copyLink, deleteResult, openResult; 2026 → `9878|36`; Enter on history trigger does not open result, click opens justification v36; badge aria-label).
- **Implementer verification:** red by mutation (action loop `row.versions.slice(0, 1)` = newest-only) with `-t "row .⋯. menu"` → 2 failed / 103 skipped / 1 passed; mutation reverted (Leader grep: no `slice` in html). Green whole file 106/106; `--findRelatedTests` component.ts → 21 suites / 823 tests passed; lint (ts) exit 0.
- **Reviewer verdict:** `STATUS: PASS` — trigger template refs scoped per @for iteration; open state keyed by `rowKey` (`code|version_id`); every action receives the version; single-version rows unchanged (32px); tests fail on newest-only mutation.
- **ADVISORY (4R, non-gating):**
  - Risk/UI: 28px stacked triggers vs `.rc-line` alignment needs a real browser → CRK-T-6.
  - Design tokens: pre-existing literal `bg-[#f3f2f7]` hover on trigger (carried, not new).
  - (from attempt 1, still open) Design §6.2 says "each line `tabindex=0`"; implementation puts one tab stop per version on the first-column line only — **recorded deviation**, judged better a11y (no N×columns tab stops), every version still keyboard-openable.

#### Decisions / issues

- Row "⋯" menu per version (FAIL 1 resolution) — matches Result Center exemplar.
- Pending doc item: `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/CLAUDE.md` still describes row-level click and a single row menu → apply at `/akili-archive` / on `staging` (shared-file discipline).

#### Forward pointers → CRK-T-6

- Stacked lines (cells + 28px action triggers) aligned across columns on IITA 2025 + 2026.
- Badge tooltip reachable (hover) and aria-label present.

- **Final status:** PASS on attempt 2 of 3 · **Date:** 2026-10-20 · review rounds 2 (= budget ceiling ≤ 2, not exceeded).
- **Final verification:** 106/106 file; related 823/823; lint clean.

### CRK-T-5 — Client: Indicator category filter in center popover

- **Final status:** PASS (attempt 1 of 3) · **Date:** 2026-10-20 · auto-continued
- **Skills / effort:** `angular-developer`, `tdd` · effort `medium`. Same Implementer as T-4 resumed (same files, serialized).
- **Requirements covered:** CRK-R-3 (filter + chip + URL + Clear all; missing-id scenario), CRK-DD-5.

#### Attempt 1

- **Files changed:** `bilateral-results-list.component.ts` (`BilateralFilterChipDimension` + `'type'`; `categoryOptions` from `results()` sorted by label; `categorySelectOptions` + missing ids "Type <id>"; `activeChips` "Category: <label>"; `removeTypeFilter`; `onTypeFilterChange` → `typeFilter` + `syncUrlParams`; `clearChip` case), `.html` ("Indicator category" `app-pr-filter-multiselect` after "Created by"), `.spec.ts` (+9 tests; PMF-T-1 label-order assertion now includes 'Indicator category' after 'Created by' — mandated by DD-5).
- **Disqualifier:** not triggered — `type` (`BILATERAL_TYPE_QUERY_PARAM`) is result-type ids everywhere (Overview chart click, deep link, `overview-controls` L383).
- **Implementer verification:** red 9 failed / 106 passed / 115; green 115/115; `--findRelatedTests` component.ts → 21 suites / 832 tests passed; lint exit 0.
- **Reviewer verdict:** `STATUS: PASS` — options from loaded rows; wiring mirrors `onCreatedByFilterChange`; badge = `activeChips().length` so it counts the chip; Clear all pre-existing reset (L1162); contract untouched; tests assert DOM, URL and filtered-empty state.
- **ADVISORY (4R, non-gating):** Reliability — blank `result_type` → label "Type <id>", first row decides label; harmless while server labels are consistent.
- **Final verification:** 115/115; related 832/832; lint clean.

### CRK-T-6 — Rollout: PRTest smoke

- **Status:** pending — **paused for user**: requires commit (user go-ahead), merge `qa-development-2026-ss` → `performance-refactor` in the user's checkout, ~30 min deploy, then read-only browser smoke.
- **Forward pointers carried (from T-1, T-3, T-4):**
  - SP12 chips `Other Output 17` / `Other Outcome 5`, Total 249 (re-read pill counts in DOM first).
  - `result_type` rows 4 / 8 named exactly `Other outcome` / `Other output` (case-sensitive client match).
  - Type = High level output → no outcome chip with count > 0; selecting a chip keeps others.
  - IITA 2025 + 2026: replicated code on one row, 2026 version stacked above 2025 (validates `version_id` desc).
  - Stacked cell lines and 28px action triggers aligned; badge tooltip on hover + aria-label.
  - Verify the deployed bundle is the merged commit before treating the smoke as evidence.

## Pending items (not applied by this run)

- Folder guides to update (shared-file discipline → `/akili-archive` or on `staging`): `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/CLAUDE.md` (`reportingGroupsForCounts`), `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/CLAUDE.md` (per-version lines/menus, category filter).
- tasks.md CRK-T-1 "Consumers" names `findWorkPackagesByProgram` (does not use `buildTocQuery`); AoW KPI endpoint is `findByCompositeCode`.
- Lint command in tasks.md (`npx eslint`) fails on the client (no flat config) → use `ESLINT_USE_FLAT_CONFIG=false npx eslint …`.
- Optional cleanups: kcr-reconciliation spec title L595; stale comment `dashboard-lab.component.ts` L3729-3730.
- CodeGraph re-index (`codegraph sync`) pending after merge.

## Budget check

- Tasks 6 (as estimated). Review rounds: T-4 used 2 (= ceiling), others 1. LOC: over the ~380 estimate, mostly tests and the template re-indent from the T-4 stacked cells (html +184/−85 is mostly moved lines); production logic is within scope. No tripwire escalation: no extra tasks and no extra review rounds; the LOC overrun is the template move.

### CRK-T-6 — PRTest smoke, partial run (2026-10-20, Claude in Chrome, read-only)

- **Bundle check:** the deployed `bilateral-results-list.component-*.js` chunk contains `brl-version-phase` / `rc-action-line` → the CRK commit is live. Only the Phase filter chip was toggled; no write buttons.
- **Scope of this run (user request):** the IITA grouping check and the stacked-line alignment check. SP12/SP11 chips are not checked yet.
- **IITA, phases 2025 + 2026 (Lead, W3), "Showing 233 of 324":** ✅ PASS. 13 replicated codes on the first page (8370, 8338, 8337, 8334, 8333, 8327, 8310, 8295, 8289, 8288, 8281, 8279, 8270) render as one row with 2 lines each. 2026 is the first line (validates `version_id` desc), and "Previously reported" appears only on line 0 (the 2026 version). No result code is repeated on the page.
- **Alignment:** ❌ FAIL (layout defects that jsdom could not catch):
  1. In the Status cell, the 2025 line is **40px** tall versus 28px everywhere else, because the history icon (`brl_justification_trigger`) wraps under the status badge. Cells use `vertical-align: middle`, so the lines of the other columns drift: the first lines are 10px apart and the second lines 6px apart across columns (8338: row 83px).
  2. Lines in the Role cell are 24px versus 28px.
  3. The phase tag is truncated: "Reporting 2026 - P25" needs 108px but the Code cell only has 98px, so both lines read "Reporting 202…" and cannot be told apart.
- **Screenshot:** `C:\Users\santiagosanchez\AppData\Local\Temp\claude-chrome-screenshots-B8dEs7\screenshot-1792546834874-0.png`
- **Status:** CRK-T-6 stays open. The alignment defects need a fix to CRK-T-4's template/scss (user decision pending).

### CRK-T-4a — Layout fix from the CRK-T-6 smoke (user-approved 2026-10-20)

- **Origin:** CRK-T-6 alignment FAIL (see above). The user approved the fix in chat ("si hazlo"). It is a rework of CRK-T-4's template/scss, not a new feature.
- **Final status:** PASS on attempt 2 of 3. Effort: `high` for attempt 1, `xhigh` for attempt 2.
- **Attempt 1, FAIL.**
  - Changes: (a) tbody `td` uses `vertical-align: top` (skeleton rows stay `middle`) and padding goes from 6px to 8px; (b) `.rc-status-wrap` gets `nowrap`, trigger `flex: none`; (c) `.rc-line` becomes flex with `min-height: 28px`; (d) the code line shows `versionPhaseShortLabel` (the phase year), with the full label in `title`/`aria-label`.
  - Tests: 116/116; related tests 833/833; lint exit 0. There was no red run (the spec was updated after the code).
  - Reviewer FAIL: with `nowrap`, the history icon overflows the 120px Status column (~125px of content against 96px) and is hidden by `overflow: hidden`, which makes the P2-3157 review-history dialog unreachable by mouse. Suggested fix: let the badge ellipsize and/or widen the column to ~140px.
- **Attempt 2, PASS.**
  - Status default width raised to **156px**, based on the Leader's PRTest measurement: "Pending Review" 107px + gap 4px + trigger 16px + padding 24px = 151px minimum. Only user-resized widths persist (`customWidths`), so no storage-key bump is needed.
  - The badge gets `title=status_name`. `.rc-status-wrap .status_tag` gets `display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis`, so the icon is never clipped in narrower resized columns.
  - The duplicate `.rc-status-wrap` blocks were merged. Tests 116/116; lint exit 0.
  - Reviewer PASS: `statusClass()` emits `status_tag`; the nested rule wins on specificity; the flex chain constrains the wrapper; the merged block has no regression.
- **ADVISORY:** all rows are now 44px instead of 40px (accepted). Width and ellipsis can only be measured in a browser, so the PRTest re-measure should also cover a column resized down to minPx 100.
- **Next:** re-measure on PRTest after deploy (line tops equal across columns; Status line 28px; phase tag "2026"/"2025" readable).

### CRK-T-6 — PRTest re-measure after CRK-T-4a (2026-10-21, Claude in Chrome, read-only)

- **Deploy:** `8d4864552` was deployed by run 39535773605 (success). The later run 39642986339 (merge `fe1b32006`, other specs) failed in `publish images` on `npm ci` ECONNRESET, a network problem. Every check job passed. It was re-run with `--failed` at the user's request, and the rerun succeeded including the Jenkins deploy.
- **IITA, phases 2025 + 2026 (Lead, W3), 13 two-version rows:** ✅ PASS.
  - Line tops are spread by **0px** across columns, for both line 1 and line 2.
  - Every line is **28px** (Role and Status included). Two-version rows are 74–75px; single rows are 49px.
  - The phase tag reads `2026` / `2025`, and its title is `Reporting 2026 - P25` / `Reporting 2025 - P25`.
  - The history icon stays inside the Status cell.
- **Status column at the 156px default (renders 188px):** none of the 25 icons is hidden, nothing is truncated, and the status line is 28px. ✅
- **Simulated minPx 100 (inline style on th/td):** none of the 40 icons is hidden, "Pending Review" ellipsizes, and the line stays 28px. ✅
- **Correction (user, 2026-10-21):** the `pr.bilateralResults.columnWidths.v1 = {"status":100}` entry was the **user's own** column resize, not a side effect of the simulation. The Leader removed it while checking the default, so the user's saved width is gone and the column is back at 156px. The default-width measurements were taken after that removal (25 icons, none hidden, nothing truncated). The 100px case is covered by the simulated minPx run above (40 icons, none hidden). On reload with the user's 100px, "Pending Review" ellipsized as designed. The earlier note that widths are persisted from a measured resize is withdrawn.
- **Screenshot:** `C:\Users\santiagosanchez\AppData\Local\Temp\claude-chrome-screenshots-B8dEs7\screenshot-1792605207826-1.jpg` (taken during the 100px simulation, so the "Pending…" ellipsis in it is the minPx case).

### CRK-T-6 — SP12 / SP11 chips (2026-10-21, Claude in Chrome, read-only: only filters and chips were clicked)

- **SP12, no filters:** Total 249 · KP 106 · ID 62 · PC 2 · IU 6 · CS 50 · **Other Output 17** · **Other Outcome 5**. ✅ CRK-R-5 matches the baseline exactly, and Total is unchanged at 249. The client match is case-sensitive, so these counts also confirm that `result_type` ids 8 and 4 resolve to exactly "Other output" and "Other outcome".
- **SP12, Other Output chip active:** cards show 17 KPIs (AOW02 Action Lab 5 + AOW04 Enabling Environment 12). The other 7 chips stay visible with their counts. ✅ CRK-R-7 "selecting a chip keeps the others" and the BUT clause (cards filtered).
- **SP12 Type filter:** ✅ CRK-R-7.
  - High level output: Total 235 · KP 106 · ID 62 · CS 50 · OOP 17 (outputs only).
  - Outcome: Total 10 · PC 2 · IU 4 · OOC 3 (outcomes only).
  - Intermediate outcome: Total 0, Total chip only.
  - 2030 outcome: Total 4 · IU 2 · OOC 2.
  - The four types add up: 235 + 10 + 0 + 4 = 249.
- **SP12, Other Outcome active, then Type = High level output:** the Other Outcome chip stays visible at count 0 and active. ✅ "Type removes the active category" (CRK-R-6 exception).
- **SP11 (original report), no filters:** Total 22 · KP 3 · CS 5 · **Other Output 8** · **Other Outcome 4**. Zero chips (ID, PC, IU) are hidden. ✅ CRK-R-6.
- **SP11, Other Output chip active:** AOW01 shows HLO 1.1.2 "CapSha pilots" (indicator pill "Other Outputs"). ✅
- **SP11 per-AoW types (`typeCountsOf`, read via `ng.getComponent`):** "Other output" is listed in AoW 1 (2), AoW 2 (4) and AoW 3 (2), which sums to 8 = chip. "Other outcome" is listed too. ✅ CRK-R-5 "AoW TYPES row lists Other output".
- **Screenshots:** `C:\Users\santiagosanchez\AppData\Local\Temp\claude-chrome-screenshots-B8dEs7\screenshot-1792605685455-2.jpg` (SP12 Other Output), `…\screenshot-1792606261476-3.jpg` (SP11 CapSha pilots).

**CRK-T-6 final status: PASS.** Every falsifier in tasks.md CRK-T-6 was checked on the deployed bundle: SP12 17/5/249; Type = HLO shows no outcome chip; IITA replicated codes show as one row; stacked lines aligned after CRK-T-4a.
