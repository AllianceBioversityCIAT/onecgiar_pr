# Design — Portfolio Overview: filtered results detail + Excel export

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/filtered-detail-export/` |
| Requirements | [`requirements.md`](./requirements.md) (approved 2026-10-16, Phase 1 gate; FDE-OQ-1..3 at defaults) |
| Depth | Standard |
| Approval Mode | gated |
| Status | approved (2026-10-16, Phase 2 gate; user chose Continue, no Judgment Day). Implemented and archived 2026-10-16 |
| Prefix | `FDE-DD-n` decisions · `FDE-P-n` premises |
| Baseline | `docs/ux-ui/design.md` §7 (tokens), §10 (a11y) · client `CLAUDE.md` §5 |
| Kaizen | No `kaizen-log.md`. Family lessons applied: scoped Jest `--maxWorkers=2`; `CLAUDE.md` re-stamp in the same commit; browser check at 375 / 768 / 1280; `ng build` in the verification of any task that touches typed models (`KZ-bugfix--lead-center-full-catalog-1`); declare every Helm input in `spartanBrainMock` (NG0311) |
| Depends on | #6 `global-filters` design (approved). Its code is **in flight in the same checkout** (`services/portfolio-filters.ts`, `portfolio-status-slot.ts`, service edits, uncommitted) |

## 1. Summary

- **One pure file** turns filtered rows into detail rows, sorts, searches, pages and builds export rows. It is the unit-test seam.
- **One presentational component**, `components/results-detail/`, owns only view state (search, sort, page, busy) and receives everything else as inputs.
- **The page** mounts it last, gated like the figures, and feeds it #6's `filteredRows()` and map state.
- **Export** reuses `ExportTablesService.exportExcel` with a `cellsToLink` Link column.
- Native `<table>` with Tailwind (no Spartan table is installed); Spartan button, input, skeleton, tooltip.

## 1A. Premise Ledger

| # | Premise | Source | How verified | Status | If false |
|---|---|---|---|---|---|
| FDE-P-1 | Page rows carry `result_code`, `title`, `result_level_name`, `version_id` | `result.repository.ts:707-712`; `RawResult` | Read | verified | — |
| FDE-P-2 | #6 exposes `filteredRows()`, `filtersPending()`, `filteredTotal()`, `dimensions()` (status + map) and `dimensionIndex()` on `PortfolioOverviewService` | #6 `design.md` §6.3; in-flight `portfolio-filters.ts` (`DimensionIndex`, `buildDimensionIndex`) | Read | verified (design) / in flight (code) | Re-read #6's final service at T-1 start and adapt names; no behaviour change |
| FDE-P-3 | `levelOf(type)` (typology) and `resolveStatusSlot(row)` + `PORTFOLIO_STATUS_SLOTS` give the same Level and Status labels as the sections above | `typology.aggregate.ts:62`, `portfolio-status-slot.ts:8, 25` | Read | verified | — |
| FDE-P-4 | `is_replicated` arrives as tinyint, string or boolean; `Number(x) === 1` is the family's normalizer | `centers-block.aggregate.ts:51-55` | Read | verified | — |
| FDE-P-5 | `exportExcel` catches its own errors, shows the PRMS alert, and **does not rethrow**; it maps `null`/`undefined` to "Not provided". **Corrected 2026-10-16 (T-2 Reviewer):** it saves via `saveAsExcelFile`, which appends `_<epoch×10>.xlsx` to the given name (`:520-558`) | `export-tables.service.ts:29-70`, `:520-558` | Read | verified (corrected) | Busy flag resets in `finally` (DD-6); our cells are never null (DD-3); the exact name needs FDE-DD-9 |
| FDE-P-6 | Installed Spartan Helm has no table or pagination (`badge button checkbox command dialog input … skeleton tabs tooltip`) | `src/app/spartan/` | Read | verified | DD-5 |
| FDE-P-7 | The map's Center labels carry `code` and `acronym`; the row's lead is an acronym | #6 design §4.1, GLF-P-2 | Read | verified (design) | Contributing = map acronyms minus lead acronym (A-2) |
| FDE-P-8 | Result detail route: `/result/result-detail/<code>/general-information?phase=<version_id>` | `indicator-drawer.component.spec.ts:876`, `programme-results.service.ts:105` | Read | verified | — |

## 2. Architecture Overview

| Layer | Path | Change |
|---|---|---|
| Pure logic | `portfolio-overview/components/results-detail/results-detail.rows.ts` (new) | `toDetailRows`, `searchRows`, `sortRows`, `pageOf`, `toExportRows`, `exportFileName`, `resultUrl` |
| Component | `…/results-detail/results-detail.component.{ts,html}` (new) | View state + template |
| Service | `services/portfolio-overview.service.ts` | `RawResult` gains `result_code` (only field #6 does not add) |
| Page | `portfolio-overview.component.{ts,html}` | Mount after the projects block, inside the figures gate |
| Copy | `internationalization/portfolio-overview.copy.ts` | New `detail` group |
| Docs | `portfolio-overview/CLAUDE.md` | New section, re-stamp |

### Flow

1. #6 recomputes `filteredRows()` on any filter change.
2. The page passes `filteredRows()`, the map state, `isPartial()`, `fetchedCount()` and `phaseName()` to the component.
3. A computed builds detail rows once per input change; search → sort → page are computeds over it.
4. Export takes the searched + sorted list (all pages) → export rows → `exportExcel`.

## 3. Data Model

No entities, no migration, no endpoint.

**Detail row** (client-only view model): `id`, `code` (number for sort, string for display), `title`, `type`, `level` (label), `program`, `source`, `status` (slot label), `origin` (New / Replicated), `leadCenter`, `contributingCenters` (string), `projects` (string), `phase`, `versionId` (as built: the URL is derived by `resultUrl(code, versionId, origin)` for both screen and file; synced at archive 2026-10-16).

## 4. API Surface

None. Reads #6's existing endpoint state only.

## 5. Frontend Plan

### 5.1 Pure logic — `results-detail.rows.ts`

| Export | Responsibility | Req |
|---|---|---|
| `toDetailRows(rows, mapState, labels)` | One detail row per page row, same order and multiplicity (no dedupe). Level via `levelOf` + `TYPOLOGY_LEVEL_LABELS`; status via `resolveStatusSlot` + `PORTFOLIO_STATUS_SLOTS`; origin via `Number(is_replicated) === 1`. Empty fields → "—" except Level → "Unclassified". Map not ready → both map columns "Unavailable" | R-2, R-3, S-3.1 |
| `searchRows(rows, text)` | Trimmed, case-insensitive `includes` on code string and title. Empty text → same array | R-5 |
| `sortRows(rows, key, dir)` | Stable sort on a copy. Code compares numerically; text columns with one shared `Intl.Collator` (`numeric: true, sensitivity: 'base'`) | R-4 |
| `pageOf(rows, page, size)` | Clamped page slice + `{ from, to, total, pages }` | R-7 |
| `toExportRows(rows)` | Plain objects, keys in R-3 order + `Link`; full title; **no creator fields exist on the view model** | R-8, S-8.1 |
| `exportFileName(phase, date, partial)` | `PRMS_portfolio_results_<phase-slug>_<YYYY-MM-DD>[_partial].xlsx`; phase slug = phase name with non `[A-Za-z0-9-]` → `_` | R-8, R-10 |
| `resultUrl(code, versionId, origin)` | Absolute URL per FDE-P-8 | R-6 |

### 5.2 Component — `results-detail.component`

| Item | Design |
|---|---|
| Inputs | `rows: RawResult[]`, `pending: boolean`, `dimensionsStatus`, `dimensionsMap` (`PortfolioResultDimensions | null`; labels built once by `buildDetailLabels`), `partial: boolean`, `fetchedCount: number`, `phaseName: string` (as built, synced at archive) |
| View state | `search` signal, `sort` signal (`{ key: 'code', dir: 'desc' }` default, FDE-OQ-2), `page` as a `linkedSignal` that resets to 1 when `rows`, `search` or `sort` change (R-7), `exporting` signal |
| Header | Title, count in an `aria-live="polite"` region ("N results" / "M of N results"), Spartan input (labelled) for search, Spartan button for export (disabled when 0 listed or exporting or pending; busy spinner + text while exporting) |
| Table | Native `<table>` in an `overflow-x-auto` container. Sortable headers are `<button>`s inside `<th aria-sort>`. Title cell clamps to 2 lines with the full text in a Spartan tooltip. Code cell = `<a target="_blank" rel="noopener noreferrer">` + sr-only "opens in new tab" |
| Footer | "x–y of M" + Previous / Next Spartan buttons with accessible names; disabled at the ends |
| States | `pending` → 5 skeleton rows; 0 after search → "No results match this search" + Clear search; partial line above the table |
| Export | `exporting.set(true)` → `await exportExcel(toExportRows(sortRows(searchRows(all))), fileName, wscols, [{ cellNumber: 13, cellKey: 'Link' }], { exactFileName: true })` → `finally exporting.set(false)` (FDE-DD-9) |

### 5.3 Page

- In its own `@if (hasFigures() && …)` block after `<app-portfolio-projects-block>` (as built: Centers and Projects sit outside `hasFigures()`, WPS-DD-7; synced at archive): render `<app-portfolio-results-detail>` when `data.filteredTotal() > 0` or `data.filtersPending()`. With 0 filtered rows and nothing pending it is not rendered (R-9: #6's no-match panel covers).
- Inputs bound to the service signals from FDE-P-2.

### 5.4 Tokens

Surface `var(--pr-surface-card)`, borders `var(--pr-border…)`, header text `var(--pr-text-muted)`, link `var(--pr-color-primary-700)`. Codes and counts `font-mono tabular-nums`. No new colours.

## 6. Design Decisions

| ID | Decision | Why | Rejected |
|---|---|---|---|
| FDE-DD-1 | Pure functions in one file; component holds view state only | Same seam pattern as #4 (`typology.aggregate.ts`) and #6 (`portfolio-filters.ts`); jsdom-free tests for sort/search/export | Logic in the component (harder to test, mixes UI) |
| FDE-DD-2 | Component takes **inputs**, not the service | Presentational and testable with plain arrays; #6's bar reads the service because it mutates it — this one only reads | Inject the service (couples tests to #6 internals) |
| FDE-DD-3 | Empty cells are explicit strings ("—", "Unclassified", "Unavailable") | Keeps "none" and "unknown" distinct (S-3.1) and stops `exportExcel` writing "Not provided" | Leave null (wrong word in the file) |
| FDE-DD-4 | Level / status / origin reuse the sections' helpers (`levelOf`, `resolveStatusSlot`, family normalizer) | The list must read like the figures above it (R-2) | Use `result_level_name` from the wire (can differ from the typology map for unmapped types) |
| FDE-DD-5 | Native table + Tailwind; Spartan for button, input, skeleton, tooltip | No Spartan table/pagination installed (P-6); the projects block already uses a native table; adding Helm components widens scope | `npx ng g @spartan-ng/cli:ui table` (new dependency surface for one table) |
| FDE-DD-6 | Busy flag reset in `finally`, export button disabled while busy | `exportExcel` swallows errors (P-5) | Rely on a rejection that never comes |
| FDE-DD-7 | Export = search + sort applied, all pages | FDE-OQ-1 default: "what you see, all pages" | Ignore search (surprising when the user just narrowed it) |
| FDE-DD-9 | Additive optional `{ exactFileName: true }` on `ExportTablesService.exportExcel` → `saveAsExcelFile`: save the name as given, no suffix or extension added (pivot 2026-10-16, user-approved) | R-8 file name; the service otherwise appends `_<timestamp>.xlsx` (P-5 corrected). Existing callers pass nothing and are unchanged | Accept the service naming (loses the readable date, changes R-8) |
| FDE-DD-8 | Page as `linkedSignal` over rows/search/sort | Angular 21 idiom for "reset when the source changes", no effects | `effect()` writing a signal (discouraged) |

**Reversion challenge (Step 2.3):** no decision removes or disables shipped behaviour. The only edit to existing code is additive (`RawResult.result_code`, a new mount point). Not triggered.

## 7. Risks

| Risk | Mitigation |
|---|---|
| #6 renames a signal before it is committed | T-1 starts by re-reading #6's final service (P-2) |
| Same checkout as #6's in-flight work | Execute only after #6 is committed; stage by explicit path |
| Export of 20k rows blocks the main thread for seconds | Busy state; measured at HITL; a Web Worker is out of scope unless the measure is unacceptable |
| Collator sort of 20k rows on each click | One collator instance; measured at HITL (≤ 100 ms target) |

## 8. Budget (tripwire for `/akili-execute`)

| Measure | Expected |
|---|---|
| Tasks | 4 (3 code + 1 HITL browser check) |
| LOC | ≈ 520 (≈ 230 production + ≈ 290 tests), plus copy and `CLAUDE.md` |
| Review rounds | ≤ 5 (one per code task + up to 2 reworks) |

Matches the Standard depth.
