# Design — CGIAR Centers block: remove "Progress by Center"

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/remove-centers-progress/` |
| Parent Spec | `changes/portfolio-overview-revamp` (family #7; runs before #3) |
| Depth | Lite |
| Requirements | `requirements.md` (RCP-1..5, RCP-N1..N5), approved 2026-10-15 |
| Status | approved (2026-10-15, Phase 2 gate) |

## 2. Executive Summary

This change is client-only and lives in one folder plus one copy file. Most of it is deletion. The only addition is that the error recovery the table used to hold moves into the Reporting status card: a partial note and a single "Retry failed Centers" button. The data path, the aggregation (`centers-block.aggregate.ts`) and the KPI, donut and tile computeds do not change, which is what keeps RCP-2's numbers identical.

## 3. Architecture Overview

`PortfolioCentersBlockComponent` is unchanged as a unit. It still resolves the phase, loads the catalogue, makes one `GET_bilateralCenterResults` call per Center, keeps per-Center row states and derives `centerTotals` → KPIs, segments and the donut. This change only removes the per-Center *presentation* branch: the table, the chart, search and sort.

## 4. Directory Structure (touched)

```
onecgiar-pr-client/src/app/
├── internationalization/portfolio-centers-block.copy.ts        (remove detail keys, reword partial, add retry label)
└── pages/result-framework-reporting/pages/portfolio-overview/
    ├── components/centers-block/
    │   ├── centers-block.component.{html,ts,spec.ts}
    │   └── centers-block.charts{,.spec}.ts                     (remove the 2 detail builders)
    └── CLAUDE.md
```

`centers-block.aggregate{,.spec}.ts` is **not touched**: `EntityOverviewRow.link` stays, because removing it would ripple into the aggregate spec for no gain (DD-3).

## 5–7. Data Model / API / Backend

No change (RCP-N2).

## 8. Frontend Design

### 8.1 Template (RCP-1, RCP-4, RCP-5)

- **Delete** the whole `Detail: table | chart` card. In the current file it is the second child of the `@else` branch, from its header comment to the closing `</div>` before `}`. This includes the mode toggle, the search box, the count chip, the chart, the table with its skeleton rows, the footer, and the `centers-partial` note.
- **Reporting status card, right column** (below the active-filter strip, where `centers-loading-note` already lives):
  - Add a `role="status"` container holding:
    - the existing still-loading note;
    - **new:** when `centersPartial()` is true and the list state is ready, the reworded `partialTotal` line and a `<button type="button">` labelled `retryFailedCenters` (`data-testid="centers-retry-failed"`). It uses the same small outline style as the existing list-error Retry button.
- **Empty catalogue (RCP-5):** when the list is `ready` and `centerRows()` is empty, the card's donut + tiles grid is replaced by one muted line with `copy.empty` (`data-testid="centers-empty"`). The KPI cards still show `0` and `0 / 0`.
- Update the template's header comment: drop "detail table with a chart view".

### 8.2 Component (RCP-3, RCP-4, RCP-N1)

**Delete:**
- **State and computeds:** `detailMode`, `search`, `sortKey`, `sortDesc`, `filteredDetail`, `detailTable`, `detailHeight`, `shareOption`, `skeletonRows`, and the `SortKey` type.
- **Handlers:** `sortBy()`, `onSearch()`, `retryCenter()`.
- **Imports and icons:** the `buildRowsTable` / `buildShareOption` imports, `NgIcon`, `provideIcons`, and the four lucide icons (only the table used `ng-icon`).
- **`CenterRowState` fields:** `fullName` and `link`, along with their assignment in `loadCenters()`.

**Change:**
- `toggleStatus()` keeps only the `selectedStatus` toggle. The two sort side-effect lines go (RCP-3 `BUT`).
- Docblock: the block now shows "KPI cards and status donut + tiles".

**Add:**
- `retryFailedCenters()`: returns early when the list state is not ready. Otherwise it calls `loadCenter()` for every row whose state is `'error'`. `loadCenter()` already flips the row to `'loading'` synchronously, so a second click finds no `'error'` rows and fires nothing. That satisfies the RCP-4 no-duplicate clause without a new flag.

**Keep:**
- `columns()`, because `tileColumns` derives from it.
- `RouterLink`, for the Results Center link in the active-filter strip.
- `retryCentersList()`, `centersPartial`, `centersLoading`, `activeState`.

### 8.3 Charts module (RCP-N1)

- Delete `buildShareOption` and `buildRowsTable`, plus any imports only they used (for example the `EChartsOption` stack typing or the `EntityOverviewRow` import, if nothing else uses it).
- Keep `buildSegments`, `buildStatusDonutOption`, `buildSegmentsTable`, `statusIdFromChartEvent`, `percentOf` and the token maps.
- Delete the `buildShareOption` / `buildRowsTable` cases from the charts spec.

### 8.4 Copy (RCP-N3)

| Action | Keys |
|---|---|
| Delete | `nameColumn`, `totalColumn`, `totalRow`, `openOverview`, `loadError`, `detailCentersTitle`, `detailHint`, `tableView`, `chartView`, `searchCenters`, `clearSearch`, `shownCount` |
| Reword | `partialTotal` → "Some Centers could not be loaded, so the totals leave them out." |
| Add | `retryFailedCenters: 'Retry failed Centers'` |
| Keep | `retry`, `centersError`, `empty`, `centersStillLoading`, and all header, KPI and status keys |

The only consumer of this copy file is `centers-block.component.ts` (verified by grep), so deleting keys cannot break another screen.

### 8.5 Specs (`centers-block.component.spec.ts`)

| Existing test | Action |
|---|---|
| "scopes the Centers to the open P25 phase, one call per Center" | Keep (RCP-2) |
| "builds one row per Center, sorted by acronym, and a total row" | Rewrite at state level: `centerRows()` sorted and totals summed; no DOM table |
| "KPI cards show…" | Keep unchanged (RCP-2 evidence) |
| "with no Centers… the table says so" | Rewrite: `centers-empty` shows `copy.empty`, and no per-Center call (RCP-5) |
| "shows an error with Retry when the Centers list cannot be loaded" | Keep |
| "a status tile filters: it sorts the table…" | Rewrite: tile pressed, active-filter link `?status=`, second tap clears; no sort assertion (RCP-3) |
| "the Centers ranking card is gone" | Keep |
| "detail chart view…", "toggling a status highlights its column…", "uses the four status columns…" (table headers), "search narrows…", "header click sorts…", "markup: the search box keeps its label" | Delete. If "uses the four status columns" asserts on tiles rather than table headers, keep it pointed at the tiles |
| "keeps the other Centers when one fails… retries only that one" | Rewrite for RCP-4: one failing Center → note + button visible; click → only that Center is re-requested; on success, the note and button disappear and the KPI total includes it |
| "ignores a second retry tap while loading" | Rewrite: two quick clicks on `centers-retry-failed` → exactly one extra request for the failed Center |
| "falls back to the name when a Center has no acronym, and skips rows without a code" | Keep at state level (assert `centerRows()`), or reduce to the code-skip half if the acronym is no longer observable |
| "markup: status colours come from the shared chart tokens" | Keep |
| "routing: the old Admin link lands on the Portfolio overview" | Keep |
| **New** | RCP-1: none of `detail-modes`, `detail-search`, `centers-table`, `centers-detail-chart` exists, and no text "Progress by Center" |
| **New** | RCP-4 `MUST NOT`: with every Center OK, there is no `centers-retry-failed` |

### 8.6 Folder doc (RCP-N4)

- Re-stamp `Verified:`.
- Centers block section: the contents are now the KPI cards and the status donut + tiles, plus the retry-failed behavior.
- "Removed on purpose": add "Progress by Center (stakeholder item 9, 2026-10-15: no planning data for W3, so no 'progress')".
- Fix the stale line "Rows and bilateral rows navigate to …", if it refers to this table.

## 9. Shared Contracts

None. `CenterRowState` is exported, but only the spec imports it, and it loses two fields.

## 10. Design Decisions

| ID | Decision | Rejected alternative | Why |
|---|---|---|---|
| DD-1 | One "Retry failed Centers" button for all failures | A per-Center retry list in the status card | Without a table, there is no per-Center row to hang a retry on. Failures are rare and transient, so one action covers them |
| DD-2 | The empty catalogue replaces the donut and tiles with a message | Keep the empty donut | An empty donut with 0% tiles reads as "data says zero", not "nothing to show" |
| DD-3 | Keep `EntityOverviewRow.link` in the aggregate | Delete it as now-unused | It is a pure helper that already has a spec. Deleting it widens the diff for no behavior gain. The ~1-line cost is accepted |
| DD-4 | Delete rather than hide (`@if (false)`) | A flag | Same as sibling `remove-rankings-status-copy` DD-1: the stakeholder asked for removal, and dead computeds would still run |

### Reversion challenge (Step 2.3): what does removing this break?

| Removed | What could break | Addressed by |
|---|---|---|
| Per-row Retry | A failed Center becomes unrecoverable, and the totals stay silently low | RCP-4 + DD-1 |
| Table empty message | An empty catalogue shows a blank-looking block | RCP-5 + DD-2 |
| Partial note (lived in the table card) | Partial totals with no warning | RCP-4: moved into the status card |
| Center name links → Center Overview | The portfolio page loses its shortcut to each Center Overview | Accepted. The Center Overview stays reachable from the W3/Bilateral module (its page header). Note it in the folder doc |
| Sort side effect in `toggleStatus` | Nothing else reads `sortKey` | Verified in §8.2: only the table read it |
| `buildShareOption` / `buildRowsTable` | Any other caller | Grep: only `centers-block.component.ts` and its charts spec |

## 11. Budget (tripwire for `/akili-execute`)

| Metric | Estimate |
|---|---|
| Tasks | 2 (code + specs; doc + browser check) |
| LOC | about −260 / +60 (net about −200) |
| Review rounds | 1 |

The estimate matches Lite depth.
