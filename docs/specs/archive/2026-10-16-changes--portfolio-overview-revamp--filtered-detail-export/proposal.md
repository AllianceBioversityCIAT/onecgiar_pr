# Proposal — Filtered results detail list with Excel export (stakeholder item 11)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/filtered-detail-export/` |
| Slug | `filtered-detail-export` — derived from free-text argument ("Falta implementar desde el 9 en adelante, puedes hacer el propose del 9, 10 y 11?" + stakeholder email "RE: Reporting monitoring dashboard", 2026-10) |
| Type | Change |
| Approval Mode | gated |
| Author | santiago.sanchez@cgiar.org |
| Date | 2026-10-15 |
| Module | client `result-framework-reporting` › `portfolio-overview` (server only via #6's payload change) |
| Depends on | `changes/portfolio-overview-revamp/global-filters` (family #6) |
| Parallel-safe | no |
| Parent Spec | `changes/portfolio-overview-revamp` (family #9, last) |

## 2. Intent

The stakeholder asked: *"At the bottom of the dashboard, based on the filters set up by the user, it would be great to have the list of details, exportable for further analysis/checks."*

Add a **Results detail** list at the bottom of `/portfolio-overview`. It shows exactly the rows behind every figure above it, under the current global filters, and offers one-click **Export to Excel** of the whole filtered list.

## 3. Problem / Current Behavior

- The page already holds every open-phase row in memory: `PortfolioOverviewService.rows()`, from one `GET_AllResultsWithUseRole` call with `limit 20000`.
  - The row has the fields a detail list needs: `result_code`, `title`, `result_type`, `result_level_name`, `submitter` (P/A), `source_name` (W1/W2 or W3), `status_name` / `status_id`, `is_replicated`, `lead_center`, `phase_name`.
  - The client type `RawResult` (`services/portfolio-overview.service.ts:15-29`) declares only a subset of them.
- Nothing lists these rows on the page. The only export, `exportToExcel()` (`portfolio-overview.component.ts:460-506`), exports the **aggregated** programme matrix, not the results.
- Global filters do not exist yet (#6). Until they do, "based on the filters" can only mean "all open-phase results".
- Project and contributing Center columns depend on #6 adding them to the payload.

## 4. Proposed Outcome

```
Results detail  ·  1 284 results match the filters             [ Export to Excel ⤓ ]
┌──────┬───────────────────────┬────────┬─────────┬──────┬──────────┬─────────┬────────────┬──────────┐
│ Code │ Title                 │ Type   │ Level   │ P/A  │ Source   │ Status  │ New/Repl.  │ Lead Ctr │ …Projects
├──────┼───────────────────────┼────────┼─────────┼──────┼──────────┼─────────┼────────────┼──────────┤
│ 8123 │ Drought-tolerant …    │ Innov. │ Output  │ SP02 │ W3/Bilat │ Editing │ Replicated │ IRRI     │
└──────┴───────────────────────┴────────┴─────────┴──────┴──────────┴─────────┴────────────┴──────────┘
  ‹ 1 2 3 … 52 ›   25 / page                          (code opens the result in a new tab)
```

## 5. Scope

- Add a `filteredRows()` computed. Its single source is the same filtered set that #6 feeds to every chart, so the list and the figures cannot disagree.
- New `components/results-detail/` with:
  - A paginated, sortable table (25 rows per page). The page holds up to 20k rows, so render one page, never all of them.
  - A text search on code and title.
  - Link from the code to the result detail.
- **Export to Excel:** `ExportTablesService.exportExcel()` (`shared/services/export-tables.service.ts:29`) with the **whole filtered list**, not just the visible page. The file name carries the phase and the date.
- Columns:

  | Group | Columns |
  |---|---|
  | Base | Code, Title, Type, Level, P/A, Source, Status, New/Replicated, Lead Center, Phase |
  | From #6 | Projects, Contributing Centers |
  | Excel only | A link column to the result |

- Copy file, scoped specs, and a `CLAUDE.md` section.

## 6. Non-Goals

- No server endpoint. The list reuses rows already in memory.
- No per-section exports (the existing matrix export stays as is).
- No CSV or PDF; Excel only, as in the rest of PRMS.
- Rows from the Centers block (#3, #7) and the projects block (#8) are not included: those blocks are aggregates with their own data paths.

## 7. Affected Users, Systems, And Specs

- **Users:** Admin / PMU readers who check figures and share them.
- **Client:**
  - `portfolio-overview.component.html/.ts` (mount point)
  - `services/portfolio-overview.service.ts` (widen `RawResult`, expose `filteredRows`)
  - New `components/results-detail/`
  - `ExportTablesService` (reused)
- **Specs:**
  - #6 `global-filters`: the filtered set and the project/center fields
  - `bugfix/portfolio-overview-partial-counts`: the partial banner must also cover the list

## 8. Visual Reference

- Source: none from the stakeholder (text request only).
- Location: ASCII outline in §4. The table reuses the page's existing table styling and Spartan primitives (memory: visual changes use Spartan).
- Notes: optional HTML mockup under `mockup/` before `/akili-specify`.

## 9. Requirement Delta Preview

### ADDED
- A "Results detail" table at the bottom of the page, driven by the global filters, paginated, sortable and searchable.
- "Export to Excel" of the full filtered list.

### MODIFIED
- `RawResult` declares the extra fields it already receives (`title`, `result_level_name`, `lead_center`, …).

### REMOVED
- none

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. Client-side list over the in-memory filtered rows** | §5 | No new server work; list == figures by construction | Bounded by the 20k fetch (already guarded by `isPartial()`) |
| B. Server-paginated endpoint with the filters as query params | New endpoint | Scales past 20k | Duplicates #6's filter logic on the server; list and figures could diverge |
| C. Link to Results Center with the filters as query params | Reuse the existing list | No new table | Results Center has no P/A + project + Center filter combination and is not phase-scoped like this page; the export would differ |

## 11. Recommended Approach

**Option A.** The page already owns the rows and #6 owns the filtering, so the list is a view over `filteredRows()`. It is the only option where *"the list of details"* is guaranteed to be the rows behind the numbers.

## 12. Risks, Dependencies, And Open Questions

| ID | Item | Proposed default / action |
|---|---|---|
| D-1 | Needs #6 (filtered set + project/center fields) | Last child of the family. If #6 slips, it can ship earlier over unfiltered rows, with the project columns added later. Decide at specify time |
| OQ-1 | Which columns does the stakeholder need in the Excel? | Default: the set in §5. Confirm with Nicoleta; columns are cheap to add later |
| OQ-2 | Should Discontinued results appear in the list? | Default: yes, if the status filter allows them. The list mirrors the figures |
| R-1 | `isPartial()`: with more than 20k results, the export would be silently truncated | Reuse the partial banner. The export button's tooltip and the file's first row state "partial" when `isPartial()` is true |
| R-2 | Exporting 20k rows with exceljs on the main thread can freeze the UI for a few seconds | Show a busy state on the button; measure with real prod volume. Memory: never click write buttons in browser checks, but export is read-only and safe |
| R-3 | `.cursorrules` / privacy: the export carries creator names only if we add them | Keep creator name and email out of the default columns |


> **Resolved 2026-10-15:** the user delegated every open question to the recommended default ("haz lo que mejor recomiendes") and approved the proposal. Each `Proposed default` above is now the decision.

## 13. Success Criteria

- Under any filter combination, the list's row count equals the filtered KPI total (`kpis().total`).
- The exported file has exactly that many data rows and the columns in §5.
- The table renders one page at a time. Sorting, search and paging work over the full filtered set.
- Scoped Jest is green.

## 14. Next Step

```text
/akili-specify changes/portfolio-overview-revamp/filtered-detail-export
```

Run it after #6 `global-filters` is done.
