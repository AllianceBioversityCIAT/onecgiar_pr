# Requirements — Portfolio Overview: filtered results detail + Excel export

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/filtered-detail-export/` |
| Parent Spec | `changes/portfolio-overview-revamp` (family #9, last child) |
| Depends on | #6 `global-filters`: **not done** (requirements + design approved 2026-10-16, `tasks.md` draft). ⚠️ This spec is written against #6's approved design; execution waits until #6 is committed |
| Module | Client only: `result-framework-reporting` › `portfolio-overview` (new `components/results-detail/`, service, page) |
| Type | Change |
| Depth | **Standard**: client-only, no endpoint, no migration; reuses #6's state |
| Approval Mode | gated |
| Status | approved (2026-10-16, Phase 1 gate; FDE-OQ-1..3 at defaults) |
| Source | [`proposal.md`](./proposal.md), Option A; OQ-1, OQ-2 resolved at their defaults (2026-10-15) |
| Requirement prefix | `FDE` |
| PRD | `US-P1` (PMU tracks progress and shares figures) |

## 2. Executive Summary

The stakeholder asked for *"the list of details, exportable"* under the dashboard's filters.

This spec adds a **Results detail** section at the bottom of `/portfolio-overview`:

- It lists **exactly the rows behind the row-driven figures** (KPI deck, status, typology), under #6's global filters. Its count always equals the KPI total.
- It is paginated (25 per page), sortable, and searchable by code or title.
- **Export to Excel** downloads every row that currently matches, not only the visible page.

No server change: the rows are already in memory, and #6's dimensions map supplies projects and Centers.

## 3. Glossary

| Term | Meaning here |
|---|---|
| Filtered rows | #6's `filteredRows()`: page rows matching the global filters |
| Listed rows | Filtered rows that also match the section's own text search |
| Detail list | The new table |
| Dimensions map | #6's endpoint answer: result → projects, result → Centers (lead + contributing), plus labels |
| Partial | `isPartial()`: the server holds more rows than the page fetched (20,000 cap) |

## 4. Scope

**In**
- The Results detail section: header with count, search, sortable paginated table, Export to Excel button.
- Columns from the page rows and from the dimensions map.
- Link from each result code to its result detail page.
- Empty, loading, no-match and partial states.
- Copy, page `CLAUDE.md`, scoped Jest.

**Out**
- Any server endpoint or query change.
- Rows of the CGIAR Centers block and the W3/Bilateral projects block (own aggregates).
- CSV / PDF; per-section exports.
- Creator name or email in the list or the file (proposal R-3).
- Saving column choices.

> **Discovery vs proposal:** the proposal mentioned an existing `exportToExcel()` of the programme matrix on this page. It no longer exists (removed with the earlier revamp children), so there is nothing to keep side by side.

## 5. Personas

Admin / PMU readers of `/portfolio-overview` (`CheckAdminGuard`). They check figures and share them as spreadsheets.

## 6. Functional Requirements

### FDE-R-1 — The section

The page SHALL show a **Results detail** section as the last section of the page, below the W3/Bilateral projects block. Its header SHALL show the title, the count "N results", the search field and the **Export to Excel** button.

It SHALL render only when the page shows figures (same condition as the KPI deck), never in the page loading, error or phase-empty states.

### FDE-R-2 — The list is the filtered rows

The listed rows SHALL be exactly the filtered rows (before the section's search). The count SHALL equal the KPI deck total under every selection. Each result SHALL appear once per page row, as in the figures.

#### Scenario S-2.1: Reconciles with the deck
- GIVEN Program = {SP02} and Status = {Editing}, and the KPI total reads 377
- THEN the section reads "377 results"
- AND paging through it shows 377 rows in total
- BUT a row outside the filters must NOT appear

#### Scenario S-2.2: Clear all
- WHEN the user clears every filter
- THEN the count equals the unfiltered KPI total

#### Scenario S-2.3: Discontinued follow the filter
- GIVEN no Status filter
- THEN Discontinued results are listed
- AND with Status = {Editing}, they are not

### FDE-R-3 — Columns

The table SHALL show these columns, in this order:

| Column | Value | Empty value |
|---|---|---|
| Code | Result code, as a link (FDE-R-6) | — |
| Title | Result title, truncated to 2 lines on screen, full text on hover and in the file | — |
| Type | Result type | "—" |
| Level | Output / Outcome / Impact, same mapping as the typology block | "Unclassified" |
| P/A | P/A code | "—" |
| Source | W1/W2 or W3/Bilateral | — |
| Status | Status label as the status section names it | — |
| Origin | New or Replicated | — |
| Lead Center | Lead Center acronym | "—" |
| Contributing Centers | Centers from the dimensions map other than the lead, by acronym, A→Z, comma-separated | "—" |
| Projects | Linked projects' short names, A→Z, comma-separated | "—" |
| Phase | Phase name | — |

#### Scenario S-3.1: Dimensions map not ready
- GIVEN the dimensions map is loading or failed
- THEN Contributing Centers and Projects show "Unavailable" in every row
- AND the other columns render
- BUT they must NOT show "—" (which would claim "none")

### FDE-R-4 — Sort

Every column header except Contributing Centers and Projects SHALL be sortable, ascending then descending. The default SHALL be Code descending (newest first). Sorting SHALL apply to all listed rows, not only the visible page, and SHALL return to page 1.

#### Scenario S-4.1
- GIVEN 377 listed rows on 16 pages
- WHEN the user sorts by Title ascending
- THEN page 1 shows the 25 alphabetically first titles of all 377
- AND the header exposes the sort direction to assistive technology

### FDE-R-5 — Search

A text field SHALL narrow the listed rows to those whose code or title contains the text (case-insensitive, trimmed). The count SHALL read "M of N results" while a search is active. The search SHALL return to page 1 and SHALL NOT change any figure, chip, or the URL.

#### Scenario S-5.1
- GIVEN 377 filtered rows, 12 with "drought" in the title
- WHEN the user types "drought"
- THEN the count reads "12 of 377 results"
- AND the KPI total still reads 377
- BUT a search with no hits shows "No results match this search" with a **Clear search** action, not the page's no-match panel

### FDE-R-6 — Open a result

The result code SHALL link to the result detail page of that result in its phase, opening in a new tab (`noopener`).

### FDE-R-7 — Pagination

The table SHALL render one page of 25 rows. Previous / next and the "x–y of M" range SHALL be shown. The page SHALL reset to 1 when the filters, the search or the sort change.

The table MUST NOT render more than one page of rows at a time.

### FDE-R-8 — Export to Excel

The button SHALL download an `.xlsx` with **every listed row** (filters + search, in the current sort), not only the visible page.

- Columns: the FDE-R-3 columns with the full title, plus a final **Link** column holding the absolute result URL as a hyperlink.
- File name: `PRMS_portfolio_results_<phase>_<YYYY-MM-DD>.xlsx`, with `_partial` before the extension when partial (FDE-R-10).
- While the file builds, the button SHALL show a busy state and SHALL NOT start a second export.
- The button SHALL be disabled when there are 0 listed rows.
- A failure SHALL show the existing PRMS error alert and re-enable the button.

#### Scenario S-8.1: Whole list, not the page
- GIVEN 377 listed rows, page 3 visible
- WHEN the user exports
- THEN the file has 1 header row + 377 data rows
- AND IT MUST contain no creator name or email column

#### Scenario S-8.2: Map unavailable
- GIVEN the dimensions map failed
- THEN the file's Contributing Centers and Projects cells read "Unavailable"

### FDE-R-9 — Filter states

| Page state (#6) | Section shows |
|---|---|
| Filters pending (Project/Center selected, map loading) | Skeleton rows; export disabled |
| No match (0 filtered rows) | Hidden; #6's no-match panel covers the page |
| Rows | The table |

### FDE-R-10 — Partial data

When `isPartial()` is true, the section SHALL show one line, *"Showing the first N results the page loaded; the export has the same rows."*, and the file name SHALL carry `_partial`.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Rendering | One page of rows in the DOM at a time (FDE-R-7) |
| Sort / search time | ≤ 100 ms on 20,000 rows (Chrome performance panel, median of 5) |
| Export time | Measured at HITL on the largest real phase; the UI shows the busy state the whole time. A spread > 2× the median over 3 runs is reported, not taken as evidence |
| Accessibility | WCAG 2.1 AA. Sort buttons in the headers with `aria-sort`; search labelled; count in a polite live region; pagination buttons named; link text = code with an "opens in new tab" hint |
| Responsive | At 375 px the table scrolls horizontally **inside** its container; no page-level horizontal scroll at 375 / 768 / 1280 |
| Design rules (client `CLAUDE.md` §5) | Spartan primitives where installed (button, input, skeleton, tooltip), Tailwind-first, `var(--pr-*)` tokens, `font-mono tabular-nums` for codes and counts |
| Copy | All strings in `portfolio-overview.copy.ts` |
| Privacy | No creator, email or token in the list, the file or logs (`.cursorrules`) |
| Folder docs | `portfolio-overview/CLAUDE.md` updated and re-stamped in the same commit |

## 8. Defect classes → the gate that catches each

| Defect class | Gate |
|---|---|
| List disagrees with the figures (reads `rows()` instead of `filteredRows()`) | Client Jest on the service/component: for a selection, listed count = `kpiTotals` total (S-2.1) |
| Sort or search applied to the page only | Client Jest with > 25 fixture rows (S-4.1, S-5.1) |
| Export carries only the visible page, wrong columns, or creator data | Client Jest spying `ExportTablesService.exportExcel`: row count, column keys, no creator key (S-8.1) |
| Projects / Centers columns claim "none" while the map is missing | Client Jest with a pending and a failing map (S-3.1, S-8.2) |
| Wrong result link | Client Jest on the href |
| Double export, button stuck after failure | Client Jest on the busy flag with a rejecting export |
| File really opens in Excel with links | **No automated gate** (jsdom cannot open xlsx). Manual download at HITL |
| Layout at 375 / 768 / 1280, title clamp, focus order | **jsdom cannot lay out.** Browser check at HITL (read-only; export is read-only and safe) |
| Sort/search/export time | **No automated gate.** Measured at HITL (§7) |

## 9. Dependencies & Assumptions

- **D-1:** #6 delivers `filteredRows()`, `filtersPending()`, `filteredTotal()`, the dimensions map state and index, and widens `RawResult` with `id`, `title`, `result_level_name`. This spec adds `result_code` (already on the wire, `result.repository.ts:707`).
- **A-1:** `version_id` on the row is the phase for the result-detail link (`?phase=`), as in `programme-results.service.ts:105`.
- **A-2:** Contributing Centers = the map's Centers for the result minus the row's lead Center. The lead comes from the row (acronym); the map gives codes and acronyms, so the subtraction is by acronym.

## 10. Open Questions

| ID | Question | Default applied |
|---|---|---|
| FDE-OQ-1 | Does the export follow the section's search, or ignore it? | Follows it: "what you see, all pages" (FDE-R-8). Clearing the search exports the whole filtered list |
| FDE-OQ-2 | Default sort | Code descending (newest first) |
| FDE-OQ-3 | Page size | 25, fixed (proposal) |

## 11. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| FDE-R-1 | Section | SHALL |
| FDE-R-2 | List = filtered rows | SHALL |
| FDE-R-3 | Columns | SHALL |
| FDE-R-4 | Sort | SHALL |
| FDE-R-5 | Search | SHALL |
| FDE-R-6 | Open a result | SHALL |
| FDE-R-7 | Pagination | SHALL / MUST NOT |
| FDE-R-8 | Export to Excel | SHALL |
| FDE-R-9 | Filter states | SHALL |
| FDE-R-10 | Partial data | SHALL |
