## Context

`GET /api/results-framework-reporting/toc-results?program=&areaOfWork=` returns, for one AoW, both the ToC nodes linked to that AoW and the ones linked to none. The server distinguishes them with the `is_aow` boolean added in commit `3620284f3` (`aow-bilateral.repository.ts`): the SELECT projects `(wp.toc_id IS NOT NULL) AS is_aow`, `groupTocRows` maps it with `Boolean(row.is_aow)`, and the grouped list is sorted so `is_aow: false` comes last.

The client already renders that list through a single `AowHloTableComponent` instance per tab. Two earlier changes live in that same component and must keep working: the search filter (P2-3141) and the pre-expanded groups.

## Goals / Non-Goals

**Goals**
- Separate program-level Intermediate Outcomes from AoW-exclusive ones on the Outcomes tab, and tag them.
- Explain, on `/aow/unplanned`, what those entries are.
- Keep the change additive: no existing behaviour altered.

**Non-Goals**
- Tagging non-exclusive **OUTPUT** nodes on the High-Level Outputs tab. The same criterion applies and the flag is already there, but the request covers Outcomes only. Deliberately out of scope, not a technical limitation.
- Re-deriving the rule client-side. The flag is the single source of truth.
- Porting to `origin/performance-refactor`. Tracked separately (see Risks).

## Decisions

### 1. Two `computed` lists on the service, not a mutation

`tocResultsOutcomesExclusiveByAowId` and `tocResultsOutcomesNonExclusiveByAowId` derive from the existing `tocResultsOutcomesByAowId` signal. The source signal is never mutated or re-fetched, so the tab counters keep reporting the unfiltered total and `getTocResultsByAowId` is untouched.

**A missing `is_aow` counts as exclusive** (`item?.is_aow !== false`). Until the server deploy lands, or against any older payload, the page renders exactly as it does today — the feature degrades to the current single list instead of moving every Outcome into the "not exclusive" section.

### 2. A new `tableType` instead of a new component

`AowHloTableComponent` already switches its data source on `tableType`. Adding `'outcomes-non-exclusive'` reuses the whole table — columns, status chips, action buttons, expand behaviour, and the P2-3141 search filter — for free, because `filteredTableData` and `expandedRowKeys` both derive from `tableData()`.

### 3. Three new inputs, because the component hosts shared UI

The search box **and** the Report-Result modal / View-Results drawer / Target-Details drawer live inside this component's template but are driven by root-singleton service signals. A second instance would therefore render a second search input writing the same signal, and a second copy of each dialog the moment its flag flips.

- `showSearch` — `false` on the second instance. The single remaining input still filters both tables, since both read `searchText`.
- `renderOverlays` — hosts the dialogs. Bound to `!exclusive.length`, so the overlays always exist exactly once: normally on the main table, and on the second table when the main one is hidden. Without that binding, an AoW with only non-exclusive Outcomes would render zero overlays and the Report-result button would do nothing.
- `instanceId` — suffixes the table and `<th>` ids, which are hardcoded and would otherwise duplicate. HTML-validity and a11y only.

### 4. Hide the main table only when it would be empty AND the section is not

If every Outcome of an AoW is program-level, the main table would render `There are no Intermediate Outcomes indicators found.` directly above a populated section. It is hidden in that case. When both lists are empty the main table stays, so the tab keeps its normal empty state instead of a blank panel.

### 5. Hardcoded English copy

There is no `term` pipe usage anywhere under `pages/result-framework-reporting/`; every string in this tree is a template or TS literal, including the P2-3052 banner. `TerminologyService` is a 7-key P22↔P25 vocabulary switch, not a string catalog, and this copy does not vary by portfolio. Following the surrounding code.

### 6. Info tone, not warning

The P2-3052 yellow banner already sits above the tabs. A second yellow block would read as two equal-severity warnings, so the new note and the tag use the blue `--pr-color-blue-*` tokens.

## Risks / Trade-offs

- **The flag was not in prtest at implementation time.** Validated in the browser by intercepting the response and injecting `is_aow` with the exact semantics of `3620284f3` (7208/7258 → `false` for SP05). Must be re-verified against the real payload once deployed.
- **`GROUP BY` on the server does not list `wp.toc_id`.** The projected expression depends on it; under `ONLY_FULL_GROUP_BY` that can raise MySQL error 1055. It runs in the author's environment, so this is an environment-parity risk to confirm on prtest/production, not a client-side one.
- **Two near-copies of the note SCSS** (AoW page + unplanned page), matching the existing `.aow-repeated-note` precedent. Promoting one shared block to `src/styles/` is the clean follow-up, after the presentation.
- **`origin/performance-refactor` rewrote `aow-hlo-table.component.html`** onto an in-house `app-pr-group-table`. The logic ports 1:1 but that template must be re-authored, not merged. That branch also adds `dashboard-lab/`, which renders its own per-AoW Outcomes list from the same endpoint and would need the same treatment — scope to confirm with the requesters.

## Migration Plan

Frontend-only and additive; no migration, no feature flag. The `is_aow !== false` default means client and server can deploy in either order.
