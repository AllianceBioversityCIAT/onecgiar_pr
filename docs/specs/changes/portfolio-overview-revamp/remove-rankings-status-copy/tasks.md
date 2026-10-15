# Tasks — Portfolio Overview: remove rankings, clarify the status section

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/remove-rankings-status-copy/` |
| Depth | Lite |
| Approval Mode | gated (requirements and design rev 2.1 approved 2026-10-14; Judgment Day APPROVED) |
| Budget | 3 tasks + 1 human check · ≈ −950 / +170 LOC · 1 review round · tripwire: more than 4 tasks or more than 220 added LOC (`design.md` §11) |
| Precondition | 🛑 `changes/portfolio-overview-kpi-breakdown` is **committed**. `git status` shows no changes under `portfolio-overview/` or in `tests/mocks/spartanBrainMock.ts` before T-A starts. Otherwise, HALT |

**Machine rule for every task:**
- Jest runs **always** with `--maxWorkers=2` and is scoped with `--testPathPattern`.
- Only one test run at a time on the machine.
- ESLint runs only on the touched files.
- No `ng lint` of the whole project.
- No commit without the user's explicit OK.

**Paths:** `PO` = `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview`, `CB` = `PO/components/centers-block`.

**Order:** T-A and T-B are parallel-safe (no shared file). T-C runs after T-A (5 shared files). T-H comes last.

## Clause ownership

| Requirement clause | Owner |
|---|---|
| PRC-1: no Program ranking card or switcher | T-A |
| PRC-1: Progress by science program follows the status section directly | T-A (chart-count/titles test), T-H (visual) |
| PRC-1 BUT: the matrix card is not removed or changed | T-A (existing matrix specs stay green, untouched) |
| PRC-1 AND IT MUST: no skeleton for the removed card | T-A |
| PRC-2: no Center ranking card; order KPI → status → Progress by Center | T-B |
| PRC-2 BUT: the Progress by Center chart view still renders, with the a11y table and growing height | T-B |
| PRC-2 AND IT MUST: status filter still highlights its column in the table view | T-B |
| PRC-3: new title and subtitle naming both streams | T-C |
| PRC-3 BUT: counts, percentages, donut and tile filter unchanged | T-C (existing `statusSegments` specs untouched and green) |
| PRC-3 AND IT MUST: donut total = Total portfolio results KPI | T-C |
| PRC-4: link opens in a new tab when a URL is set | T-C |
| PRC-4: no link when the URL is unset | T-C |
| PRC-4 AND IT MUST: the URL is configured in one place | T-C (`portfolio-links.constants.ts`) |
| PRC-5: Rejected tile hint (tooltip + accessible text) | T-C |
| PRC-5 BUT: the tile click behaviour is unchanged | T-C |
| PRC-N1: no dead code | T-A, T-B (the grep in each Verify step) |
| PRC-N2: no new request, no server change | T-A, T-B, T-C (the diff has no `api.`/`http` additions) |
| PRC-N3: new strings in `internationalization/` | T-C |
| PRC-N4: folder CLAUDE.md updated and re-stamped | T-C |
| Defect class: layout gap or orphan wrapper (no automated check) | T-H |

---

## [x] T-A — Remove the Science Programs output ranking (slice A)

| Field | Value |
|---|---|
| Status | [x] done (PASS 2026-10-14) |
| Size | M (≈ −600 / +5 LOC) |
| Depends on | Precondition |
| Requirements | PRC-1, PRC-N1, PRC-N2 |
| Design | §8.1, DD-1, reversion table |
| Skills | `angular-developer` |

**Scope:**
- `PO/portfolio-overview.component.html`: delete the "Science Programs Output Ranking & Analysis" card and the "Skeleton Science Programs Output Ranking" block.
- `PO/portfolio-overview.component.ts`: delete `analysisViewMode`, `setAnalysisViewMode`, `activeAnalysisOption`, `activeAnalysisTable`, the 5 `programRanking*` computeds, `onRankingChartClick`, and the unused imports.
- `PO/portfolio-overview.charts.ts`: delete the 5 `programRanking*` builders and the `horizontal`/`vertical`/`heatmap` keys of `PROGRAM_AXIS_LABEL_MAX_CHARS`. **Keep** `matrix`, `truncatedProgramAxisLabelConfig` and `truncateProgramAxisLabel`.
- `PO/services/portfolio-overview.service.ts`: delete `programRankingRows` and `ProgramRankingRow`. Nothing else in this file changes.

**Spec edits (by name):**
- `charts.spec.ts`:
  - Delete `describe('programRankingOption & programRankingTable (POV-R-4)')` and the now-unused imports.
  - The `truncateProgramAxisLabel` case reads `.matrix`.
- `component.spec.ts`:
  - The chart-count test expects 2 charts, with titles `['Portfolio reporting status', 'Status Pipeline']`. The old title stays until T-C.
  - Delete the analysis-mode tests.
  - Remove the `onRankingChartClick` assertion from `it('handles interactive clicks on charts and table cells')`.
- `service.spec.ts`:
  - Delete `describe('Program Ranking Rows (POV-R-4)')`.
  - Remove the `programRankingRows` expectation in the empty-state test.
  - Remove the `rankings` read and `toBe(13)` in the 20k-row performance test.

**Verify:**
1. `cd onecgiar-pr-client && npx jest --testPathPattern="portfolio-overview\.(component|charts)\.spec|portfolio-overview\.service\.spec" --maxWorkers=2 --silent --reporters=summary --no-coverage`
2. `npm run build:dev` (typechecks the templates)
3. `npx eslint <touched files> --quiet`
4. Dead-code grep: `grep -rn -E "programRanking|ProgramRankingRow|analysisViewMode|onRankingChartClick|activeAnalysis" src/` → **0 hits**

**Fail input:** leaving `onRankingChartClick` bound in the template while deleting the method makes `build:dev` fail, even though `tsc` passes. Deleting `truncatedProgramAxisLabelConfig` breaks the matrix-chart spec.

**Disqualifier:**
- A green Jest run without `build:dev` is not evidence, because jsdom specs do not typecheck templates.
- A matrix spec edited to make it pass means PRC-1's BUT clause was broken. Report it; do not count it as green.

**Done:** the 4 verify steps pass, no matrix spec was edited, and the `service.ts` diff only removes lines.

---

## [x] T-B — Remove the CGIAR Centers ranking (slice B)

| Field | Value |
|---|---|
| Status | [x] done (PASS 2026-10-14) |
| Size | M (≈ −300 / +45 LOC) |
| Depends on | Precondition (parallel-safe with T-A) |
| Requirements | PRC-2, PRC-N1, PRC-N2 |
| Design | §8.2, DD-2, reversion table |
| Skills | `angular-developer` |

**Scope:**
- `CB/centers-block.component.html`:
  - Delete the Ranking card (`data-testid="ranking-modes"` and its chart).
  - Point the detail chart at `detailTable()` / `detailHeight()`.
  - Add `data-testid="centers-detail-chart"` to the detail `app-pr-viz-chart`.
  - Remove "ranking" from the header comment.
- `CB/centers-block.component.ts`:
  - Delete `rankingMode`, `rankingOption` and the imports `HEATMAP_RAMP_TOKENS`, `RankingMode`, `buildHeatmapOption` and `buildRankingOption`.
  - Rename `rankingTable` → `detailTable`, with caption `copy.detailCentersTitle`.
  - Rename `rankingHeight` → `detailHeight` = `max(260, rows × 26 + 60)` px.
  - Update the docblock.
- `CB/centers-block.charts.ts`:
  - Delete `buildRankingOption`, `rankRows`, `buildHeatmapOption`, `HEATMAP_RAMP_TOKENS` and `RankingMode`.
  - `statusIdFromChartEvent` reads `data.statusId` only; drop the `seriesId` branch and update its docstring.
  - Update the header comment.
- `internationalization/portfolio-centers-block.copy.ts`: delete `rankingCentersTitle`, `rankingHint`, `modeHorizontal`, `modeVertical` and `modeHeatmap`.

**Spec edits:**
- `CB/centers-block.charts.spec.ts`: delete the ranking, heatmap and `seriesId` cases.
- `CB/centers-block.component.spec.ts`: add three tests:
  1. No `[data-testid="ranking-modes"]` is rendered.
  2. After `detailMode.set('chart')`, `[data-testid="centers-detail-chart"]` receives `detailTable()` (caption = `detailCentersTitle`) and a height ≥ 260px.
  3. After `toggleStatus(id)` in the default table view, that status column carries the highlight class.

**Verify:**
1. `npx jest --testPathPattern="centers-block" --maxWorkers=2 --silent --reporters=summary --no-coverage`
2. `npm run build:dev`
3. `npx eslint <touched files> --quiet`
4. Dead-code grep: `grep -rn -E "rankingMode|rankingOption|rankingTable|rankingHeight|buildRankingOption|buildHeatmapOption|HEATMAP_RAMP_TOKENS|RankingMode|rankRows|rankingCentersTitle|rankingHint|modeHorizontal|modeVertical|modeHeatmap" src/` → **0 hits**

**Fail input:**
- Deleting `rankingTable` instead of renaming it breaks `build:dev` (the detail binding).
- Keeping `copy.rankingCentersTitle` as the caption makes test 2 fail.
- Computing the height with a vertical term of 0 makes the ≥ 260 test fail for a fixture with more than 8 Centers. Use a fixture with ≥ 10 Centers so the height comes out above 260 and the test cannot pass on the floor value alone.

**Disqualifier:**
- If test 2 passes with a fixture of fewer than 8 Centers, it only proves the 260 floor, not the formula. Re-run it with ≥ 10 Centers.
- A presence-only assertion (the chart exists) does not prove PRC-2's BUT clause. The binding values must be asserted.

**Done:** the 4 verify steps pass and the three new tests are green with the ≥ 10-Center fixture.

---

## [x] T-C — Status section: copy, guide link, Rejected hint (slice C)

| Field | Value |
|---|---|
| Status | [x] done (PASS 2026-10-14) |
| Size | M (≈ −10 / +120 LOC) |
| Depends on | T-A (shares html, component.ts/spec and charts.ts/spec) |
| Requirements | PRC-3, PRC-4, PRC-5, PRC-N2, PRC-N3, PRC-N4 |
| Design | §8.3, §8.4, DD-3..DD-6 |
| Skills | `angular-developer`, `spartan` (tooltip contract via Spartan MCP), `tailwind-design-system` |

**Scope:**
- New `src/app/internationalization/portfolio-overview.copy.ts`: the 6 keys in design §8.3.
- New `src/app/shared/constants/portfolio-links.constants.ts`: `export const STATUS_GUIDE_URL: string = ''`.
- `PO/portfolio-overview.component.html`:
  - Status `<h2>`, subtitle and donut `chartTitle` come from the copy file.
  - Add the guide link under `@if (statusGuideUrl)`: inline after the subtitle; `lucideExternalLink` (`aria-hidden`); an sr-only `opensInNewTab`; `target="_blank"` and `rel="noopener noreferrer"`; neutral at rest, `--pr-color-primary-700` plus underline on hover/focus; a visible focus ring.
  - Status tile `<button>`: add `hlmTooltip` + `[tooltipDisabled]="!hint"`, and an sr-only `<span>` when a hint exists.
- `PO/portfolio-overview.component.ts`:
  - Add `copy`, `statusGuideUrl = STATUS_GUIDE_URL` and the `statusHints` map `{ rejected: copy.rejectedHint }`.
  - Import `HlmTooltip`.
  - Add `lucideExternalLink` to `provideIcons`.
  - `statusDonutTable` passes `copy.statusTableCaption`.
- `PO/portfolio-overview.charts.ts`: change the signature to `portfolioStatusDonutTable(segments, caption)`; no hardcoded caption.
- `onecgiar-pr-client/tests/mocks/spartanBrainMock.ts`: the `BrnTooltip` mock declares the inputs `brnTooltip`, `position`, `hideDelay`, `showDelay` and `tooltipDisabled`, following the `BrnSeparator` pattern.
- `PO/CLAUDE.md` (design §8.4):
  - Re-stamp `Verified:`.
  - Fix "What this owns".
  - Add a "Removed on purpose" note covering both rankings.
  - Record `STATUS_GUIDE_URL` and pending OQ-1.
  - Record the `BrnTooltip` mock rule.

**Spec edits / additions (`PO/portfolio-overview.component.spec.ts`, `PO/portfolio-overview.charts.spec.ts`):**
1. The title, subtitle, donut-`chartTitle` and chart-count titles array use the copy constants.
2. `statusTotal() === kpis().totalResults` on the same fixture.
3. With the default empty URL, no guide link is rendered.
4. After `component.statusGuideUrl = 'https://example.org/guide'` and `detectChanges()`, the link has that `href`, `target="_blank"`, a `rel` that contains `noopener`, and accessible text that includes `opensInNewTab`.
5. The Rejected tile contains the sr-only `rejectedHint`; the Editing tile does not.
6. Clicking the Rejected tile toggles `selectedStatusFilter()` to `'rejected'` and back.
7. `charts.spec`: `portfolioStatusDonutTable(segments, 'X').caption === 'X'`.

**Verify:**
1. `npx jest --testPathPattern="portfolio-overview\.(component|charts)\.spec|portfolio-overview\.service\.spec|pop-up-notification-item" --maxWorkers=2 --silent --reporters=summary --no-coverage`
2. `npm run build:dev`
3. `npx eslint <touched files> --quiet`
4. `grep -rn "Portfolio reporting status\|Aggregate progress across all Science Programs" src/` → **0 hits**

**Fail input:**
- An empty-URL render that still emits `<a href="">` makes test 3 fail.
- Typing the constant as the literal `''` makes `build:dev` fail on the narrowed template expression.
- Without the mock inputs, the component spec fails with NG0311. That is the evidence that the mock change is needed and works.

**Disqualifier:**
- Test 4 passing without `detectChanges()` after the assignment means it is reading stale DOM. It must fail when the assignment is removed.
- If the existing `statusSegments` specs had to be edited, PRC-3's BUT clause is broken. Report it; do not count it as green.

**Done:** the 4 verify steps pass, the 7 specs are green, no `statusSegments` spec was edited, and CLAUDE.md is re-stamped.

---

## [ ] T-H — Browser check at the HITL pause (human / T6)

| Field | Value |
|---|---|
| Status | [ ] pending |
| Size | XS (no code) |
| Depends on | T-A, T-B, T-C |
| Requirements | PRC-1 (order), PRC-2 (order), PRC-5 (tooltip visible), layout defect class |
| Design | §12, requirements §8 last row |

**Check:** on `/portfolio-overview`, at 1440px and at 768px:
- No ranking card is shown, and there is no gap or empty wrapper where one was.
- The status section is followed directly by Progress by science program.
- The Centers block reads KPI → Reporting status → Progress by Center.
- The Progress by Center chart view renders.
- The Rejected tooltip appears on hover and on keyboard focus.
- The new title and subtitle are shown.

**Rules (memory):**
- Confirm the served bundle matches disk before you judge anything.
- Read-only: click no write buttons, because the local stack writes to the shared prdb.

**Disqualifier:** a screenshot from a dev server you did not start, without the bundle check, is not evidence.

**Done:** the user confirms, or the screenshots are attached to `execution.md`.

---

## Summary

| Task | Δ LOC (≈) | Parallel |
|---|---|---|
| T-A | −600 / +5 | with T-B |
| T-B | −300 / +45 | with T-A |
| T-C | −10 / +120 | after T-A |
| T-H | 0 | last |
| **Total** | **≈ −910 / +170** | |
