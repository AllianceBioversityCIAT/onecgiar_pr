# Design — Portfolio Overview: remove rankings, clarify the status section

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/remove-rankings-status-copy/` |
| Parent Spec | `changes/portfolio-overview-revamp` (family #2 since the 2026-10-14 reorder — runs **after** `changes/portfolio-overview-kpi-breakdown`) |
| Depth | Lite |
| Requirements | `requirements.md` (PRC-1..5, PRC-N1..N4), approved 2026-10-14 |
| Review | Judgment Day → `judgment.md`: round 1 findings JD-1..JD-11 applied (rev 2); scoped re-judgment 0 critical, its suggestions applied (rev 2.1). **APPROVED** |
| Precondition | 🛑 The family #2→#1 work (`kpi-breakdown`) is **committed** before execution starts. It has uncommitted edits in `service.ts/.spec.ts`, `component.html/.ts/.spec.ts` and `tests/mocks/spartanBrainMock.ts`, all of which this spec touches (JD-10) |
| Status | rev 2.1 — awaiting user approval |

## 2. Executive Summary

The change is client-only and almost all deletion, in three slices.

| Slice | Files | Requirements |
|---|---|---|
| A — Program ranking out | `portfolio-overview.component.{html,ts,spec.ts}`, `portfolio-overview.charts{,.spec}.ts`, `services/portfolio-overview.service{,.spec}.ts` | PRC-1, N1 |
| B — Center ranking out | `components/centers-block/centers-block.{component.html,component.ts,component.spec.ts,charts.ts,charts.spec.ts}`, `internationalization/portfolio-centers-block.copy.ts` | PRC-2, N1 |
| C — Status section copy + guide link + Rejected hint | `portfolio-overview.component.{html,ts,spec.ts}`, `portfolio-overview.charts{,.spec}.ts`, new `internationalization/portfolio-overview.copy.ts`, new `shared/constants/portfolio-links.constants.ts`, `tests/mocks/spartanBrainMock.ts` | PRC-3, 4, 5, N3 |

**File overlap (JD-3):** A and C share five files: `component.html/.ts/.spec.ts` and `charts.ts/.spec.ts`. They run **serially, A then C**. B shares no file with A or C and can run in parallel with A.

There is no server change, no new request, and no data-model change (PRC-N2).

## 3. Architecture Overview

The page structure is unchanged: `PortfolioOverviewComponent` + `PortfolioOverviewService` (one payload, `computed`s), with `PortfolioCentersBlockComponent` as an independent block that has its own data path. This spec removes leaves from that tree. In the Centers block it also renames two bindings that were named after the ranking but serve the surviving detail chart.

## 4. Directory Structure (touched)

```
onecgiar-pr-client/
├── tests/mocks/spartanBrainMock.ts                        (BrnTooltip mock gains its inputs)
└── src/app/
    ├── shared/constants/portfolio-links.constants.ts      (new — STATUS_GUIDE_URL)
    ├── internationalization/
    │   ├── portfolio-overview.copy.ts                     (new — only the strings this spec adds)
    │   └── portfolio-centers-block.copy.ts                (remove ranking keys)
    └── pages/result-framework-reporting/pages/portfolio-overview/
        ├── portfolio-overview.component.{html,ts,spec.ts}
        ├── portfolio-overview.charts{,.spec}.ts
        ├── services/portfolio-overview.service{,.spec}.ts
        ├── components/centers-block/centers-block.{component.html,component.ts,component.spec.ts,charts.ts,charts.spec.ts}
        └── CLAUDE.md
```

## 5–7. Data Model / API / Backend

No change.

## 8. Frontend Design

Code locations below are given by **symbol or test name, not line number**, because the family #2 commit shifts lines (JD-2).

### 8.1 Slice A — Program ranking card (PRC-1)

**Delete from the source files:**

| File | What to delete |
|---|---|
| Template | The "Science Programs Output Ranking & Analysis" card and the "Skeleton Science Programs Output Ranking" placeholder |
| `component.ts` | `analysisViewMode`, `setAnalysisViewMode`, `activeAnalysisOption`, `activeAnalysisTable`, the five `programRanking*` computeds, `onRankingChartClick`, and their imports |
| `charts.ts` | `programRankingOption`, `programRankingTable`, `programRankingVerticalOption`, `programRankingHeatmapOption`, `programRankingHeatmapTable` |
| `charts.ts` | The `horizontal` / `vertical` / `heatmap` keys of `PROGRAM_AXIS_LABEL_MAX_CHARS` (JD-5) |
| `service.ts` | The `programRankingRows` computed and the `ProgramRankingRow` interface |

Keep in `charts.ts`: `matrix`, `truncatedProgramAxisLabelConfig` and `truncateProgramAxisLabel`, because the matrix chart uses them. Keep in the service: `programmeRows()` and `categories()`, which feed the matrix.

**Specs (JD-1, JD-2):**

| Spec file | Change |
|---|---|
| `portfolio-overview.charts.spec.ts` | Delete `describe('programRankingOption & programRankingTable (POV-R-4)')` and its nested blocks (option, table, vertical, heatmap), plus the now-unused `programRanking*` and `ProgramRankingRow` imports |
| `portfolio-overview.charts.spec.ts` | The `truncateProgramAxisLabel` case that reads `PROGRAM_AXIS_LABEL_MAX_CHARS.vertical` now reads `.matrix` |
| `portfolio-overview.component.spec.ts` | The chart-count test expects **2** charts, not 3. Its titles array becomes `[<new status title>, 'Status Pipeline']` |
| `portfolio-overview.component.spec.ts` | Delete the analysis-mode tests (`analysisViewMode` / `activeAnalysisOption` / `programRanking*`). Remove the `onRankingChartClick` assertion from `it('handles interactive clicks on charts and table cells')` |
| `services/portfolio-overview.service.spec.ts` | Delete `describe('Program Ranking Rows (POV-R-4)')` |
| `services/portfolio-overview.service.spec.ts` | Remove the `programRankingRows` expectation from the **empty-state** test |
| `services/portfolio-overview.service.spec.ts` | Remove the `programRankingRows()` read and the `rankings.length` toBe 13 assertion from the **20k-row performance** test |

### 8.2 Slice B — Center ranking card (PRC-2)

**Template:** delete the "Ranking" card (title, hint, three-mode switcher, chart).

**Component:** delete `rankingMode`, `rankingOption`, and the imports `HEATMAP_RAMP_TOKENS`, `RankingMode`, `buildHeatmapOption` and `buildRankingOption`.

**Renamed, not deleted.** These feed the Progress by Center chart view:
- `rankingTable` → `detailTable`. Its caption changes from `copy.rankingCentersTitle` to `copy.detailCentersTitle`.
- `rankingHeight` → `detailHeight`. The formula becomes `max(260, rows × 26 + 60)` px, with no mode term. That equals the value under the old default `horizontal` mode, so the height a reader sees does not change.

**Charts module.** Delete `buildRankingOption`, its private helper `rankRows` (JD-4), `buildHeatmapOption`, `HEATMAP_RAMP_TOKENS` and `RankingMode`. Simplify `statusIdFromChartEvent` to read `data.statusId` only:
- Drop the `seriesId` branch, which served only ranking series. The detail chart binds no `chartClick`.
- Update its docstring.
- Drop the `seriesId` spec cases.

**Copy.** Delete `rankingCentersTitle`, `rankingHint`, `modeHorizontal`, `modeVertical` and `modeHeatmap`. Both judges verified that only the ranking card uses them; the detail switcher uses `tableView` / `chartView`.

**Comments (JD-4).** Remove "ranking" from the template header comment, the component docblock ("ranking (three modes)") and the charts header comment.

**What "highlight in Progress by Center" means (JD-11).** The PRC-2 clause is satisfied by the **table view** (the default): a selected status highlights its column header and its cells. Outside Progress by Center, the donut also fades the other slices. The chart view (`buildShareOption`) never reflected the selected status, and it still does not; this spec does not change that.

**Specs:**

| Spec file | Change |
|---|---|
| `centers-block.charts.spec.ts` | Delete the ranking and heatmap cases and the `seriesId` cases |
| `centers-block.component.spec.ts` | Add a ranking-removal test: no element with `data-testid="ranking-modes"` |
| `centers-block.component.spec.ts` | Add a chart-view test. After `detailMode.set('chart')` (JD-S1, adopted), the **detail** chart receives `detailTable()` and a height ≥ 260px. The block renders two `app-pr-viz-chart` (the donut first), so select the detail one by position or by a `data-testid` added to it |
| `centers-block.component.spec.ts` | Add a highlight test. After toggling a status, its table column carries the highlight class |

### 8.3 Slice C — Status section (PRC-3, 4, 5)

**Copy (JD-7).** The new `internationalization/portfolio-overview.copy.ts` holds **only the strings this spec adds or changes**: title, subtitle, table caption, guide-link label, its new-tab suffix and the Rejected hint. It follows the shape of `portfolio-centers-block.copy.ts` (an `as const` object). The rest of the page's template copy is not migrated, which keeps the scope down.

| Key | Value |
|---|---|
| `statusTitle` | Portfolio Results Reporting Status |
| `statusSubtitle` | All W1/W2 and W3/Bilateral results reported in this phase, by status |
| `statusTableCaption` | Portfolio Results Reporting Status breakdown |
| `statusGuideLink` | What do these statuses mean? |
| `opensInNewTab` | (opens in a new tab) |
| `rejectedHint` | Applies to W3/Bilateral results only |

Where each string is used:
- **Template:** `<h2>` = `statusTitle`; subtitle = `statusSubtitle`; donut `chartTitle` = `statusTitle`.
- **`charts.ts`:** `portfolioStatusDonutTable(segments)` gains a second parameter, `caption`, and stops hardcoding `'Portfolio reporting status breakdown'`. The `statusDonutTable` computed in the component passes `copy.statusTableCaption`. The `charts.spec.ts` callers pass a caption (RJ NEW-1).

**Guide link (PRC-4, JD-8).**
- **Constant:** `shared/constants/portfolio-links.constants.ts` exports `STATUS_GUIDE_URL: string = ''`. It is typed `string` so strict templates do not narrow it to `never`.
- **Component field:** the component exposes `statusGuideUrl = STATUS_GUIDE_URL`, a plain field, so a spec can assign it.
- **Placement and markup:** an inline link on the same line as the subtitle, after the subtitle text. Visible text is `statusGuideLink`, followed by a 13px `lucideExternalLink` icon (`aria-hidden`) and an sr-only `opensInNewTab`. It uses `target="_blank"` and `rel="noopener noreferrer"`.
- **Styling:** neutral muted text; underline and `--pr-color-primary-700` on hover and focus; visible focus ring. There is no violet at rest (UI rule 7).
- **Render rule:** `@if (statusGuideUrl)`.
- **Icon:** register `lucideExternalLink` in the component's `provideIcons`.

**Rejected hint (PRC-5, JD-6).**
- The status-tile `<button>` gets `hlmTooltip`, bound to the tile's hint, with `[tooltipDisabled]="!hint"`, so the other tiles render no empty tooltip.
- The hint is looked up from a component-side map keyed by segment key (`{ rejected: copy.rejectedHint }`). It stays out of `STATUS_SEGMENT_DEFINITIONS` (DD-4).
- When a hint exists, an sr-only `<span>` inside the button carries the same text, so assistive technology gets it without hover.
- Import `HlmTooltip` (`@spartan/tooltip`) into the standalone component. Confirm its contract with the Spartan MCP.
- **Jest:** extend the `BrnTooltip` mock in `tests/mocks/spartanBrainMock.ts` with the inputs `HlmTooltip` re-exposes through `hostDirectives` (`brnTooltip`, `position`, `hideDelay`, `showDelay`, `tooltipDisabled`). This follows the existing `BrnSeparator` mock pattern and avoids NG0311. Extending the shared mock is preferred over a per-spec stub because the same failure would hit any future spec.

**Specs (JD-8):**

| Spec file | Change |
|---|---|
| `portfolio-overview.component.spec.ts` | Update the title, subtitle and donut-`chartTitle` assertions to the copy constants |
| `portfolio-overview.component.spec.ts` | New: `statusTotal() === kpis().totalResults` on the same fixture (PRC-3 `AND IT MUST`) |
| `portfolio-overview.component.spec.ts` | New: link **absent** with the default empty URL |
| `portfolio-overview.component.spec.ts` | New: link **present**, with `href`, `target` and `rel`, after assigning `statusGuideUrl` and calling `detectChanges` |
| `portfolio-overview.component.spec.ts` | New: the Rejected tile contains the sr-only hint; another tile (Editing) does not |
| `portfolio-overview.component.spec.ts` | New: clicking the Rejected tile still toggles `selectedStatusFilter` |
| `portfolio-overview.charts.spec.ts` | The caption assertion uses the new caption |

### 8.4 Folder doc (PRC-N4)

Update `portfolio-overview/CLAUDE.md` as follows:
- Re-stamp `Verified:`.
- Fix "What this owns", which still mentions a "bilateral summary".
- Add a short **Removed on purpose** note: the Program and Center rankings are gone because of the stakeholder "competition" feedback (2026-10-14). Do not re-add them.
- Record `STATUS_GUIDE_URL` and the pending OQ-1.
- Record the `BrnTooltip` mock rule next to the existing `BrnSeparator` one.

## 9. Shared Contracts

Two new files, each with a single export: `portfolio-links.constants.ts` and `portfolio-overview.copy.ts`. The `BrnTooltip` mock gains inputs. Interfaces are unchanged, apart from the deletion of `ProgramRankingRow`.

## 10. Design Decisions

| ID | Decision | Rejected alternative | Why |
|---|---|---|---|
| DD-1 | Delete the ranking code rather than hide it behind a flag | `@if (false)` / feature flag | Stakeholders asked for removal. Dead computeds would still run on every payload change, and PRC-N1 forbids it. Git history is the rollback |
| DD-2 | Rename `rankingTable`/`rankingHeight` to `detail*` and keep them | Inline them into the detail binding | They have one surviving consumer. The rename stops a ranking caption from leaking into the a11y table |
| DD-3 | Hide the guide link when there is no URL | Show it disabled / "coming soon" | Never ship a dead control (same reasoning as the P2-3304 drill-downs) |
| DD-4 | Keep the Rejected hint in the component, not in `STATUS_SEGMENT_DEFINITIONS` | Add a `hint` field to the service definitions | Presentation only; it keeps the service diff to the A-slice deletion |
| DD-5 | New strings go to `internationalization/portfolio-overview.copy.ts`; existing template copy stays | Migrate the whole page's copy / waive the rule | Meets client CLAUDE.md §5/§10 for everything this spec writes without growing scope (JD-7) |
| DD-6 | Extend the shared `BrnTooltip` mock | Per-spec `overrideComponent` stub | One fix for every future tooltip spec; matches the `BrnSeparator` precedent (JD-6) |

### Reversion challenge (Step 2.3) — "what does removing this break?"

| Removed | What could break | Addressed by |
|---|---|---|
| Center ranking computeds | The Progress by Center chart view binds `rankingTable()` / `rankingHeight()` | DD-2: rename and keep; chart-view spec |
| Center `rankingMode` | `rankingHeight` reads it | The formula is fixed at the horizontal value, which is the default the user saw |
| The `seriesId` branch of `statusIdFromChartEvent` | Any non-ranking chart that emits `status-N` series ids | The only other `chartClick` binding is the donut, which uses `data.statusId`; the detail chart binds no click |
| Main `onRankingChartClick` (Program → Results Center) | Loss of that path | Matrix rows already link each Program to Results Center |
| Program heatmap | The Program × category view is lost | The matrix "Chart" view still shows it |
| Ranking skeleton | Layout jump on load | Removed together with its card |
| `PROGRAM_AXIS_LABEL_MAX_CHARS` keys | The `truncateProgramAxisLabel` spec | The spec moves to `matrix` |

Both judges confirmed every claim in this table (`judgment.md`).

## 11. Budget (tripwire for `/akili-execute`)

| Metric | Estimate |
|---|---|
| Tasks | 3 (A, B, C) + 1 browser check at the HITL pause |
| LOC | ≈ −950 removed / +170 added (JD-9: the chart builders alone are about 340 lines; additions are mostly the ~9 new tests) |
| Review rounds | 1 |

Depth stays Lite, because the bulk is deletion. **Tripwire:** stop and escalate if execution needs more than 4 tasks or adds more than 220 LOC.

## 12. Risks

| Risk | Mitigation |
|---|---|
| Overlap with the uncommitted family work on the same files | Precondition in §1: that work must be committed first. If it is not, stop the execution |
| `tsc` misses template references | `npm run build:dev` (template typecheck) gates slices A, B and C |
| The tooltip mock change affects other specs | Only inputs are added, with no behaviour. `pop-up-notification-item` stubs `HlmTooltip` itself, so it does not exercise the mock; the new portfolio-overview component spec is the real check (RJ NEW-2) |
