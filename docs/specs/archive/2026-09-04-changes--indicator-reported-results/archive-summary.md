# Archive Summary — Indicator "Reported results" table

**Outcome:** Shipped. The Reporting-table row menu's **View reported results** now opens the indicator drawer on a third tab that lists every contributing result as a sortable table (Code · Result · Category · Status · Contribution · Phase) with a way into each result, a header strip reconciled against the row's ACHIEVED figure, an opt-in `scope=all` server parameter that shows the whole pipeline, and a drawer that widens to fit. Live on SP01: 6 rows with real type names, phase names and status pills; empty state on a virgin indicator. 5/5 tasks PASS, 0 rework rounds.

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/indicator-reported-results/` · Prefix `IRR` |
| Archive Date | 2026-09-04 |
| Archived from branch | `qa-development-2026` (default pin `master`) — shared-file syncs recorded pending |
| Type / Depth / Approval Mode | Change · Standard · `pre-approved` |
| Final Status | **Complete** — 5/5 `[x]`, Reviewer PASS ×4 on first attempt, T-5 live check PASS |
| Module | `result-framework-reporting` — client `pages/dashboard-lab/components/indicator-drawer`; server `results-framework-reporting` query `get-existing-result-contributors` |

## 2. Requirements Delivered

| ID | Behaviour | Delivered by | Evidence |
|---|---|---|---|
| `IRR-R-1` | Menu action lands on the *Reported results* tab; host `initialTab` wins | `onReportingOpenAchieved` → `'results'`; `TAB_CHROME` | `dashboard-lab.irr-wiring.spec.ts`, drawer DOM tests; live read A |
| `IRR-R-2`, 2.1, 2.4, 2.5 | Seven-column table, pill pairs, `—` for null, 2-line clamp + `title` | `app-pr-table` block in the drawer, local `STATUS_TOKENS` | 22 DOM `it`s (T-3); CT computed colours (T-4) |
| `IRR-R-2.2`, `2.3` | Category from server `result_type_name`; phase name via `PhasesService` | mapper + `toReportedResultRow` | mapper spec; view-model spec; live read A (`Innovation development`, `Reporting 2026`) |
| `IRR-R-3`, `3.1`, `3.2` | `scope=all` population, default unchanged, one request per open | loader status sets, handler normalisation, `loadExisting('all')` | 118 server tests (`In([1,2,3,5,6])` / `In([2,6])`); live read A shows Editing rows |
| `IRR-R-4`, `4.1` | Strip + disclosure when Σ ≠ ACHIEVED | `contributionSum`, `stripTitle()` | exact-string DOM tests; live strip `6 results reported · Σ contribution 5 of target 1` + disclosure |
| `IRR-R-5` | Row click / Enter / Space / Open result → Result Detail with `?phase`; Copy link absolute + toast | `openResult`, `copyLink` (CDK Clipboard, `PrToastService`) | DOM tests asserting exact commands/URL/toast key |
| `IRR-R-6`, `6.1` | Sort via `prSortableColumn` + `aria-sort`; search above 8 rows | table header, `showSearch` | DOM tests; CT `aria-sort` read |
| `IRR-R-7` | Skeleton / empty + CTA → Report / error + Retry / 404 = empty | `loadError`, `retryLoad` | DOM tests; live read B (empty state) |
| `IRR-R-8`, `8.1` | Width floor 760 (clamped), restore, drag wins; cards below 640 | tab effect (`untracked` width), `tableLayout` | Jest ×8 + Cypress CT 6/6 twice (520 → 760 → 520, 680 clamp, cards at 600) |
| `IRR-R-9` | Info tab keeps Target/split; card list moved | template | AC-8 DOM test |
| `IRR-R-10` | Table semantics, focusable rows, menu roles, title/icon | template | DOM + CT (`th[scope="col"]` ×7) |
| `IRR-R-11` (SHOULD), `IRR-R-12` (MAY) | Status split line; ctrl/cmd/middle-click new tab | delivered in T-3 | DOM tests; live split `4 editing · 1 quality assessed · 1 approved` |
| `IRR-AC-1..8` | — | — | AC-3 server; AC-1/2/4/5/6/8 Jest; AC-7 Cypress CT; live SP01 |

## 3. Files Changed

| File | What |
|---|---|
| `onecgiar-pr-server/src/api/results-framework-reporting/{controller,service}.ts` + `application/queries/get-existing-result-contributors/*` (+ 6 specs) | optional `scope` (`reviewed` default \| `all`), status sets from `ResultStatusData` members, `obj_result_type` select, `result_type_id`/`result_type_name` in the mapper |
| `onecgiar-pr-client/src/app/shared/services/api/results-api.service.ts` (+ spec) | `GET_ExistingResultsContributors(…, scope?)` appends `&scope=` only when given |
| `…/dashboard-lab/components/indicator-drawer/indicator-drawer.component.{ts,html,scss,spec.ts}` | third tab, view model, table, strip, row actions, search, states, width floor, card fallback, local `STATUS_TOKENS` and `.pr-row-menu` copies |
| `…/indicator-drawer/indicator-drawer.reported-results.cy.ts` (new) | real-Chromium gate for AC-7 + pill colours + `aria-sort` |
| `…/dashboard-lab/dashboard-lab.component.ts` + new `dashboard-lab.irr-wiring.spec.ts` | tab union widened; `onReportingOpenAchieved` → `'results'` |
| `…/indicator-drawer/CLAUDE.md`, `…/dashboard-lab/CLAUDE.md` | folder guides re-stamped (three tabs, `scope=all`, floor, reset list) |
| `docs/specs/changes/indicator-reported-results/mockup/reported-results-drawer.html` | intent sketch used as visual reference |

Commits on `qa-development-2026`: `ca6e9b78a` (spec) · `2fb2c64f9` T-1 · `4a1db18f1` T-2 · `5c36fbe77` T-3 · `a2269fbdd` T-4 · `4600745b9` T-5 · `📝 docs(specs)` log commits (`b1e90b5de`, `7be97b91a`, `4bc5c7fdb`, `fa3f06a90`, `e5eca7757`).

## 4. Test Evidence

| Gate | Result |
|---|---|
| `IRR-TEST-1` server unit | 6 suites / 118 tests green (loader status sets, mapper null-safety, handler normalisation, controller forwarding) |
| `IRR-TEST-2` client unit + DOM | drawer suite 59 tests; `dashboard-lab` tree 25 suites / 914 tests green; API spec URL assertions green |
| `IRR-TEST-3` Cypress CT | 6/6 on two consecutive runs, measurement file byte-identical (two documented harness errors printed, non-blocking) |
| Lint / build | `npx ng lint --quiet` clean; server eslint clean; `ng build --configuration development` clean |
| `IRR-TEST-4` live | see §5 |

**`test-report.md` absent — accepted.** The spec's four test gates ran inside the tasks with Reviewer-audited evidence; no separate `/akili-test` pass (pragmatic mode, standing feedback 2026-09-02).

## 5. Validation Summary

**`validation-report.md` absent — accepted.** T-5's live SP01 read in the authenticated Orca browser served as the validation gate: indicator `7297::46::AOW01` → drawer opened on *Reported results* at the 760 px floor, 6 rows with server type names, phase names, correct pill pairs (`in-progress` for Editing, `approved` for Quality Assessed), contribution `1`×5 / `—`×1, strip `6 results reported · Σ contribution 5 of target 1` with the disclosure title, split line; virgin indicator `10939::1279::AOW01` → empty state + CTA. Assumptions A-1/A-2 confirmed on real data. No FAIL. One WARN-class finding: see §6 first row.

## 6. Accepted Warnings / Follow-Ups

| Item | Owner / where |
|---|---|
| **Approved (6) and Pending Review (5) results render in the grey not-started pill** — `STATUS_TOKENS` (verbatim copy of the Results-tab map, as design §6.2 mandated) covers only 1/2/3. Spec-conformant (IRR-R-2.1 fallback) and identical to the Results tab, but it dulls the pipeline this tab exists to show; confirmed live on `#8970` | `/akili-quick` extending the map in both copies (or a `docs/ux-ui/design.md` §7 decision on the pairs) |
| Bilateral-review routing branch not reproduced — rows always open Result Detail (IRR-DD-4) | accepted gap |
| Fourth copy of the pill pairs and a copy of `.pr-row-menu` rules (drawer) | extraction PR into `shared/` |
| `cypress/results/` (CT measurement file) is untracked, not ignored | add to `.gitignore` |
| Window resize while on the tab can leave `width()` above the new clamp (pre-existing drag behaviour) | design §13 gap if it bites |
| Test-LOC budget: ≈1 100 test LOC vs ≈450 estimated; source ≈480 vs ≈320 (R-11/R-12 delivered, card branch rebuilt with pill + kebab) | kaizen |
| IRR-R-4.1 second reason class ("other phases") has no wording and the payload cannot distinguish it — single sentence used | spec wording gap, recorded |

## 7. Supersessions to record

None of the archived specs' decisions are overturned; this spec extends `mass-reporting-flow`'s drawer (still the single surface for Target and Reported results) and borrows `programme-results`' column vocabulary and pill pairs. No TRD ADR affected.

## 8. Historical Notes

- Proposal (2026-09-03) with a self-contained HTML mockup; OQ-1 resolved as "show the pipeline behind an opt-in param", OQ-2 as "server supplies the type name".
- Judgment-day ran **inline** (both blind-judge spawns and retries failed on Orca pane creation) and still caught the `Draft (8)` status omission before execution.
- Execution 2026-09-03/04: 5 tasks, 1 attempt each, ≈2 h 20 m of Leader time plus a usage-limit pause. The T-4 Reviewer needed four spawns (one usage-limit death, two pane timeouts, then the user chose retry and it ran). Every Reviewer agent and Implementer pane was closed at task end at the user's request.
- A second session kept committing in this checkout throughout; diffs and commits were scoped by explicit pathspec and nothing was swept this time.
