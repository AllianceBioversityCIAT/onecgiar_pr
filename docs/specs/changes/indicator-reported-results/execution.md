# Execution Log — Indicator "Reported results" table (`changes/indicator-reported-results`)

## Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/changes/indicator-reported-results/` (`requirements.md`, `design.md`, `tasks.md`) |
| Approval Mode | `pre-approved` — continue/pause gates auto-pass on PASS; HALT / Pivot / tripwire always stop |
| Execution limits | ≤ 1 Reviewer round per task · budget 5 tasks / ≈ 320 src + ≈ 450 test LOC (trip > 1 000) · targeted `npx jest <path>` only · cut offered after T-3 |
| Leader | Claude Fable 5.1 (T1) |
| Implementer / Reviewer | `.claude/agents/akili-implementer.md` / `akili-reviewer.md` wrappers; author ≠ auditor on every task |
| Pre-flight | no in-flight spec edits `indicator-drawer/*` (checked 2026-09-03). `docs/specs/changes/sp-guided-tour-driverjs` is in execution by another session in this checkout and edits `reporting-program-band/*` and `dashboard-lab.component.html` — no file overlap with this spec (T-2 touches `dashboard-lab.component.ts` only); concurrency handled by explicit-pathspec diffs/commits. Environment: Orca pane creation timed out for the judgment-day judges earlier this session; T-1 spawn succeeded |
| Started | 2026-09-03 |

## Task Execution History

### `IRR-T-1` — Server: `scope` param and `result_type_name` on `existing-result-contributors` — **PASS** (2026-09-03, 1 attempt)

| Field | Value |
|---|---|
| Implementer | `akili-implementer` wrapper (`sonnet`), effort medium, skills `nestjs-expert` + `tdd` |
| Reviewer | `akili-reviewer` wrapper (`opus`), lens checklist mode |
| Files (12, +395/−6, all under `src/api/results-framework-reporting/`) | `existing-result-contributors.types.ts` (`ExistingResultContributorsScope`, `obj_result_type?`), `get-existing-result-contributors.query.ts` (`scope?`), `.handler.ts` (`scope === 'all' ? 'all' : 'reviewed'`), `existing-result-contributors-loader.service.ts` (`REVIEWED_SCOPE_STATUS_IDS` / `ALL_SCOPE_STATUS_IDS` from `ResultStatusData` members; `obj_result_type: { id, name }` in relations + select), `existing-result-contributors.mapper.ts` (`result_type_id`, `result_type_name` null-safe), controller (`@Query('scope')` + `@ApiQuery enum`), service (pass-through) + 6 spec files extended |
| Verification | `npx jest …/get-existing-result-contributors …/results-framework-reporting.service.spec.ts …/results-framework-reporting.controller.spec.ts --silent` → **6 suites / 118 tests passed**; `npx eslint "src/api/results-framework-reporting/**/*.ts" --quiet` → 0 problems |
| Evidence detail | `scope` omitted / `reviewed` / `foo` → `status_id: In([2, 6])`; `all` → `In([1, 2, 3, 5, 6])` with 4/7/8 asserted absent; mapper with `obj_result_type` → `result_type_name 'Knowledge product'`, without → `null` (never digits); existing two-arg loader test untouched and green; controller spec's one arity assertion extended (`…, undefined`) + forwarding test added |
| Requirements covered | IRR-R-2.2 (server), IRR-R-3 (filter), IRR-R-3.1, IRR-AC-3; scenario *Endpoint default unchanged* (all clauses); *The table shows the pipeline* → omit Discontinued/Rejected/Draft |

**Decisions (Reviewer agreed):** `result_type_id` read from the already-selected raw FK `obj_results.result_type_id`, not `obj_result_type.id` — more robust when the join misses; `result_type_name` still degrades to `null`.

**Reviewer PASS summary:** `scope` implemented end-to-end exactly per design §4.1/§5 with behavioural tests asserting the concrete `In([...])` per scope; no assertion removed or weakened; Swagger documented; all files inside the module.

**ADVISORY (4R — recorded, no rework):** *Reliability:* specs assert TypeORM `FindOperator` internals (`_type`/`_value`) — `toEqual(In([...]))` would survive an upgrade. *Readability:* `query.scope?: string` could be `string | ExistingResultContributorsScope`. *Test hygiene:* controller forwarding test does not await the handler promise.

**Gate:** auto-approved (pre-approved mode) → continue to IRR-T-2.

### `IRR-T-2` — Client: tab shell, data path and host wiring — **PASS** (2026-09-03, 1 attempt)

| Field | Value |
|---|---|
| Implementer | `akili-implementer` wrapper, model override `opus`, effort high, skills `angular-developer` + `tdd` |
| Reviewer | `akili-reviewer` wrapper (`opus`), lens checklist mode |
| Files (7) | `results-api.service.ts` (+6/−1, optional `scope`, appended only when given) + `.spec.ts` (+17) · `indicator-drawer.component.ts` (+100/−6: `DrawerTab` + `'results'`, `ReportedResultRow` + pure `toReportedResultRow`, `reportedRows`, `loadError`, `PhasesService`, `TAB_CHROME` title/icon map, `scope=all`, 404-vs-500 split, dormant smart-default → `'results'`, reset clears `loadError`) + `.html` (+49/−15: mapped header, Info card list removed, `@case ('results')` placeholder with skeleton/error/rows/empty CTA, "See them in detail" → results) + `.spec.ts` (+243/−4) · `dashboard-lab.component.ts` (+7/−3: `manageTab`/`manageIndicator` unions, `onReportingOpenAchieved` → `'results'`) · new `dashboard-lab.irr-wiring.spec.ts` (102) |
| Verification | `npx jest …/components/indicator-drawer …/results-api.service.spec.ts …/dashboard-lab.irr-wiring.spec.ts --silent` → **3 suites / 327 tests passed**; folder sweep **25 suites / 884 tests passed**; `npx ng lint --quiet` clean; `ng build --configuration development` OK. TDD red seen per slice (wiring: `Expected "results" / Received "report"`) |
| Requirements covered | IRR-R-1, R-2.2 (client fallback), R-2.3, R-3 (request), R-3.2, R-7 (signals, 404), R-9, R-10 (title/icon), IRR-AC-1, AC-8; scenario *Menu lands on the tab* (all clauses) |

**Decisions (Reviewer adjudicated):** `version_id == null` → `—` (a literal `null` cell would violate the `—` convention; an id absent from the phase list still prints digits). On a 500, `existing()` stays `[]` beside `loadError`. Empty-state block + CTA moved onto the `results` case (design §6.2 States row places it there). The existing spec assertion gained the `'all'` third argument (IRR-R-3 makes the two-arg call wrong) — the only touched assertion.

**Reviewer PASS summary:** conforms to R-1, R-2.2/2.3, R-3, R-3.2, R-7, R-9, R-10 and design §6.1/§6.2; inside the file boundary; tests assert behaviour (exact strings, `manageTab()`, object-shaped stubs).

**ADVISORY (4R — recorded; items 1–2 carried as forward pointers to T-3, not new scope):** (1) `@for … track row.code` collides when `result_code` is absent → use `track row.id ?? row.code` when T-3 writes the table loop. (2) On a 500 the *Report*-tab preview still reads "Nothing has been reported…" — gate that copy with `loadError()` in T-3 (R-7 error state belongs to T-3). (3) No **Retry** yet — T-3 owns it per §5.

**Gate:** auto-approved (pre-approved mode) → continue to IRR-T-3.

### `IRR-T-3` — Client: the table, header strip, row actions, search and error UI — **PASS** (2026-09-03, 1 attempt)

| Field | Value |
|---|---|
| Implementer | `akili-implementer` wrapper, model override `opus`, effort high, skills `angular-developer` + `ui-ux-pro-max` |
| Reviewer | `akili-reviewer` wrapper (`opus`), lens checklist mode |
| Files (4, +991/−21, all in `components/indicator-drawer/`) | `.ts` (+253/−4: `STATUS_TOKENS` copy + no-DRY note, `SEARCH_VISIBLE_ABOVE = 8`, `searchText`/`showSearch`/`visibleRows`, `contributionSum`/`targetValue`/`reportedCountLabel`/`stripTitle()`/`statusSplit`, `statusFg/Bg`, `sortArrow/Color`, row menu state + `@HostListener('document:click')` + `onEscape()`, `resultRoute`/`openResult`/`onRowClick`/`onRowAuxClick`/`onRowKeydown`/`resultLink`/`copyLink` (CDK `Clipboard`), `retryLoad()`; reset clears `searchText` + `openMenuKey`) · `.html` (+178/−16: `@case ('results')` = skeletons → error + Retry → strip / status split / search / `app-pr-table` → empty CTA; `<th scope="col">` ×7 with `prSortableColumn` on Code/Status/Contribution/Phase; rows `tabindex=0 role=button`; kebab `role="menu"`; Report-tab preview gated on `loadError()`) · `.scss` (+196: grid tracks per design §6.3, 44 px rows, `.irr-actions--open { z-index: 10 }`, copied `.pr-row-menu` rules with promote-to-shared note, `::ng-deep` for `pr-table`'s header skin) · `.spec.ts` (+369, 22 DOM `it`s) |
| Verification | `npx jest …/components/indicator-drawer --silent` → **51/51 passed**; `npx ng lint --quiet` clean; `ng build --configuration development` complete, zero errors. 0 removed `expect`/`it` |
| Requirements covered | IRR-R-2, R-2.1, R-2.4, R-2.5, R-4, R-4.1, R-5, R-6, R-6.1, R-7 (UI), R-10, **R-11 and R-12 (both landed)**, IRR-AC-2, AC-4, AC-5, AC-6; scenarios *The table shows the pipeline*, *A way in*, *States* — all clauses |

**Evidence detail:** full 3×6 cell `toEqual`; strip exactly `3 results reported · Σ contribution 5 of target 8`; disclosure `Achieved on the row: 3 — it counts reviewed results only; this list sums 5 across every status.` and absent when equal; null contribution → `—`, Σ 4 not 5; `status_id 99` → not-started pair; search hidden at 8 / shown at 9; `88` → `#8871` only; `zzz` → table empty template; Enter/click/Open result → `router.navigate(['/result','result-detail','8871','general-information'], { queryParams: { phase: 11 } })`; kebab click does not navigate; Copy link → `${origin}/result/result-detail/9006/general-information?phase=11` + toast `{ key: 'globalUserNotification', severity: 'success', summary: 'Result link copied' }`; ctrl/cmd-click → `window.open(…, '_blank', 'noopener')`; Escape closes menu only; 404 → empty + CTA → report; 500 → error, Retry → second call → rows.

**Decisions (Reviewer adjudicated):** (a) pill pair asserted via `statusFg/statusBg` on rendered ids + template-source binding — jsdom's `cssstyle` drops `var()` values, so a computed-style read is impossible there; **recorded gap, closed by the T-4 Cypress CT**. (b) CDK `Clipboard.copy()` as in `programme-results`. (c) R-4.1 uses the single design §6.2 sentence — the second reason class in requirements has no defined wording and the payload cannot distinguish it (spec wording gap, recorded). (d) R-11 rendered on its own line to keep the AC-2 sentence verbatim. (e) `::ng-deep` required for `pr-table`'s `thead th` skin (same as `programme-results`).

**Reviewer PASS summary:** implements IRR-T-3 as specified — grid, pills, `—` rules, exact strip + disclosure, error-before-empty with a working Retry, menu semantics, absolute Copy link + toast; only the four allowed files; every `--pr-*` token used is defined in `colors.scss`.

**ADVISORY (4R — recorded):** *Risk / real data:* `STATUS_TOKENS` (verbatim copy, as mandated) maps only 1/2/3, so **Approved (6)** and **Pending Review (5)** rows render in the grey not-started pair — spec-conformant (R-2.1 fallback, identical to the Results tab) but it dulls the pipeline R-3 wants read → **T-5 must read an Approved row's pill live and raise it as a spec gap if grey** (candidate `/akili-quick` extending the map in both copies). *Reliability of evidence:* the HTML comment claims `track row.id ?? row.code` but `PrTableComponent` tracks by `$index`; `rowKey()` only keys the menu → reword (forward pointer to T-4, which edits the template). *A11y:* `scope="col"`/`<table>` assertions are presence-only in jsdom; `display: grid` on `tr` + `role="button"` may strip row/cell roles in a real browser → **T-4's CT to read the pill computed style and one `aria-sort`/role** (forward pointer). *Readability:* no `keydown.space` test.

**Cut point reached (tasks.md §0):** the feature is usable after T-3; T-4 is layout polish behind a CT gate and T-5 is docs + live check. Continuing under pre-approved mode; stopping here is a valid choice for the user.

**Gate:** auto-approved (pre-approved mode) → continue to IRR-T-4.

### `IRR-T-4` — Client: width floor, restore, and the card fallback — **PASS** (2026-09-04, 1 Implementer attempt; Reviewer on the 4th spawn)

| Field | Value |
|---|---|
| Implementer | `akili-implementer` wrapper, model override `opus`, effort high, skill `angular-developer` — **complete**, working tree uncommitted |
| Files (5, +820/−110, all in `components/indicator-drawer/`) | `.ts` (+79: `TABLE_FLOOR = 760`, `CARD_LAYOUT_BELOW = 640`, `tableLayout`, `widthBeforeResults`, shared `widthClamp()`, tab effect reading `width()` under `untracked`, drag on the tab clears memory, reset effect clears memory) · `.html` (+282/−110, mostly re-indent: table under `@if (tableLayout())`, `@else` card stack with pill + kebab + `@empty`; `track` comment corrected — `pr-table` tracks by `$index`) · `.scss` (+29 `.irr-card`) · `.spec.ts` (+203, 8 `it`) · new `indicator-drawer.reported-results.cy.ts` (337) |
| Implementer verification | Jest `npx jest …/components/indicator-drawer --silent` → **59/59**; `dashboard-lab` tree 25 suites / 914 tests. Cypress CT (`CT_DEV_SERVER_PORT=8090 …reported-results.cy.ts`) → **6/6 on two runs**, measurement file byte-identical: aside 520 → 760 → 520 (`widthChange [760, 520]`); 900 stays 900, no emit; viewport 1000 → 680; width 600 → 3 `.irr-card`, no `<table>`; pill status 2 computed `rgb(4,120,87)`/`rgb(209,250,229)` = live `var(--pr-status-approved-*)` probe, status 99 = not-started pair; `th[scope="col"]` ×7; `aria-sort` → `ascending`. Known harness noise printed (primeicons, `ct-utils` TS2322). Lint clean |
| Implementer notes | tab effect reads `width()` under `untracked` (a drag frame must not re-trigger the floor — IRR-DD-5); CT mounts from `info` (the `report` branch instantiates the real form → unstubbed `ResultLevelService` call); reset clears `widthBeforeResults` per design (a re-armed drawer at the floor keeps 760 — flagged); folder guide → T-5; untracked `cypress/results/irr-t4-ct-measurements.json` |
| Reviewer | **not yet run.** Spawn 1 (`rev-irr-t4`) died on an account usage limit before reading; spawn 2 (`rev-irr-t4b`) and spawn 3 (`rev-irr-t4c`) failed on the harness (`Failed to create teammate pane: Timed out waiting for the Orca runtime` / `tmux: Timed out waiting for split pane handle`). Per `/akili-execute` *Runtime-failure fallback*, the Reviewer is never run by the Leader inline; escalated to the user, who chose **retry** — spawn 4 (`rev-irr-t4d`) ran and returned the verdict below |


**Reviewer PASS summary:** floor, restore, clamp and the 640 px card fallback implemented exactly per IRR-R-8/R-8.1 and design §6.2 / IRR-DD-5; AC-7 gated by a real-Chromium CT that measures rendered `offsetWidth` *change* (520 → 760 → 520, 900 untouched, 680 clamp, cards at 600), compares pill colours against a live `var()` probe with a transparent-guard, and reads `th[scope="col"]` ×7 + `aria-sort`; the `track` comment verified truthful against `pr-table.component.html:21`; five allowed files only; no new tokens.

**Decisions (Reviewer adjudicated):** `untracked` read of `width()` in the tab effect is required by IRR-DD-5 (a width-tracking effect would fight every drag frame); shared `widthClamp()` is the direct expression of "never exceed the existing clamp"; CT mounting from `info` is the scenario's own restore target; the reset effect clearing `widthBeforeResults` is the spec's consequence, not the Implementer's.

**ADVISORY (4R — recorded):** *Reliability:* the floor is computed once on tab entry — a window resize while on the tab can leave `width()` above the new clamp (pre-existing drag behaviour). *Resilience:* "drag keeps working on the tab" is proven in jsdom only. *Risk:* `cypress/results/irr-t4-ct-measurements.json` is written into an untracked directory — add `cypress/results/` to `.gitignore` (follow-up; not committed here). (Report tail truncated after a *Readability* item — not requested again; STATUS and gate content complete.)

**Gate:** auto-approved (pre-approved mode) → continue to IRR-T-5.

