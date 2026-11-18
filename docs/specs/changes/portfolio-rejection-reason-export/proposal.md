# Proposal — Results detail filters and rejection reason in the Portfolio Overview export

> **Answer first:** two changes to the Results detail block at the bottom of the Portfolio Overview.
> (1) A **Filters ▾** dropdown next to **Export to Excel**, with Funding (W1/W2 · W3/Bilateral) and Status. It is a **shortcut to the same global filters** in the top bar: one selection state, and the whole page filters with it.
> (2) The Excel export gains `Rejection reason`, `Rejected by` and `Rejected on`, filled for results that are currently **Rejected**. The data is the newest `REJECT` row in `result_review_history`, served as one more array on the admin-only `portfolio/result-dimensions` endpoint (no new endpoint, no extra request).
> The export keeps its rule: exactly what is listed. So Filters → Rejected → Export gives the rejected results with their reasons.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-rejection-reason-export` |
| Slug | `portfolio-rejection-reason-export` — derived from free-text argument (SR-168253 summary) |
| Type | Change |
| Deliverable | software |
| Ticket | SR-168253 "Rejected w3/bilat results" (reported 2026-11-12; team replied 2026-11-13 promising a production release the following week) |
| Requirement source | Service-request ticket text (screenshot in session) + scope extension by the user, 2026-11-17: "incluyamos filtros en esa última tabla… botón de filtros tipo dropdown… W1/W2 o bilateral… por estados… y también lo incluimos en el export del Excel" |
| Decision log | 2026-11-17 · user chose **"Atajo a los globales"**: the table dropdown reads and writes the global Status/Funding selection; it is not a table-only filter |
| Visual source | ASCII sketch approved in session (§8). No Figma |
| Approval Mode | gated |
| Related specs | `archive/2026-10-16-changes--portfolio-overview-revamp--filtered-detail-export` (FDE-*, table + export) · `archive/2026-10-16-changes--portfolio-overview-revamp--global-filters` (GLF-*, selection + dimensions map) · `archive/2026-11-04-changes--portfolio-overview-feedback-round--funding-filter` (PFF-*, Funding dimension) · `bilateral/rejected-result-correction` (RRC, rejection notice) |
| Depends on | none |
| Parallel-safe | yes |
| Date | 2026-11-17 |

## 2. Intent

A PMU / portfolio admin wants to decide, **right where the results list is**, which results they see and export (W1/W2 vs W3/Bilateral, by status). For rejected results, they want to see **why** each one was rejected without opening every result.

## 3. Problem / Current Behavior

- The page already has global **Status** and **Funding** filters in the top bar (`services/portfolio-filters.ts:16` `FILTER_DIMENSIONS`, `:59-63` `FundingSource` = `w1w2` | `bilateral`). The Results detail table already receives the filtered rows (`portfolio-overview.component.html:376-377` `[rows]="data.filteredRows()"`).
- Those filters sit at the top of a page roughly 4,600 px long, and the table is the last block. Admins scrolled and gave up (page guide `portfolio-overview/CLAUDE.md:32`, admin report 2026-10-26). The table toolbar has only Search and Export (`components/results-detail/results-detail.component.html:14-38`).
- Funding can only tell **W1/W2** (combined) from **W3/Bilateral**. The row data has no W1-vs-W2 split (`portfolio-filters.ts:62-63` `fundingOf` reads only `source_name`).
- The Excel has 13 columns and none carries a rejection reason (`results-detail.rows.ts:161-175`, identical on `origin/master` / `staging` / `performance-refactor` / `qa-development-2026-ss`, `git grep` 2026-11-17).
- The reason is stored per decision in `result_review_history` (`action`, `comment`, `initiative_id`). Today it is only readable one result at a time through the bilateral rejection notice (`result-review-history.entity.ts:41-71`, `bilateral-rejection-notice.component.ts:68`). Legacy rows use `REJECTED` and can have a null `initiative_id` (`bilateral-review-history.interface.ts` `isRejectAction`).
- Only W3/Bilateral results reach status 7 Rejected. `UNVERIFIED — confirm at source before relying on it`

## 4. Proposed Outcome

1. A **Filters ▾** button sits between Search and Export to Excel. It opens a panel with two groups, **Funding** (W1/W2, W3/Bilateral) and **Status** (Editing, Quality Assessed, Submitted, Approved, Rejected, Discontinued), as multi-select checkboxes. The button shows the number of active values (`Filters · 2`) and offers **Clear**.
2. A tick there is the same as a tick in the top bar. Both show the same state, and KPIs, charts and the table all update together.
3. **Export to Excel** downloads what is listed, plus three columns after `Status`: `Rejection reason`, `Rejected by` (`SPxx - Name`) and `Rejected on`. They are filled only for rejected rows; other rows get `—`.

## 5. Scope

| Layer | Change |
|---|---|
| Client · `results-detail` | Filters dropdown in the toolbar. It reads `selection()` and options from the service and calls `toggleValue('funding' \| 'status', v)` / `clearDimension`. No local filter state |
| Client · `portfolio-overview.component.html` | Wire the block to the service (inputs/outputs, or inject the service, decided in design) |
| Client · `results-detail.rows.ts` | `DetailRow` + `toDetailRows` + `EXPORT_COLUMNS` / `toExportRows`: 3 new columns, `—` / `Unavailable` contract as FDE S-3.1 |
| Client · `portfolio-result-dimensions.interface.ts` | `rejections` field |
| Server · `result.repository.ts:4565`, `results-framework-reporting.service.ts:1374`, DTO, Swagger | One more query in the existing `Promise.all`, returning `rejections: [resultId, comment, initiativeCode \| null, createdAt]` |
| Copy | `PORTFOLIO_OVERVIEW_COPY.detail` new labels (EN) |
| Tests | rows spec, component spec (dropdown → `toggleValue` calls, active count, export columns asserted at the `exportExcel` sink per `KZ-…filtered-detail-export-1`), server repository/service specs |

## 6. Non-Goals

- No table-only filter state, and no second Status signal (page rule DD-7: one selection, `toggleValue` only).
- No W1 vs W2 split (the data does not support it).
- No other dimensions in the table dropdown (Program, Project, Center and Typology stay in the top bar).
- No on-screen rejection-reason column or tooltip (Excel only, see OQ-1).
- No change to `/api/bilateral/*`, so the bilateral contract doc is untouched.

## 7. Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| PMU / portfolio admin (admin-only page) | Filters next to the table, reasons in the export |
| Global filter bar | Unchanged, but now has a second entry point to the same state |
| Spec FDE (archived) | R-8 export column list 13 → 16; toolbar layout grows |
| Spec GLF (archived) | Dimensions response grows by `rejections` |
| Page guide `portfolio-overview/CLAUDE.md` | Results detail + export section, synced at archive |

## 8. Visual Reference

- Source: ASCII sketch approved in session (2026-11-17)
- Location: inline below
- Notes: reuse the visual language of the existing `app-filter-multi-select` (top bar) for checkboxes and the panel. Spartan `hlmBtn` outline, same as Export.

```text
Results detail · 312 results     [Search…] [Filters · 1 ▾] [Export to Excel]
                                            ┌──────────────────────┐
                                            │ Funding              │
                                            │ ☐ W1/W2              │
                                            │ ☐ W3/Bilateral       │
                                            │ Status               │
                                            │ ☐ Editing            │
                                            │ ☐ Quality Assessed   │
                                            │ ☐ Submitted          │
                                            │ ☐ Approved           │
                                            │ ☑ Rejected           │
                                            │ ☐ Discontinued       │
                                            │            [Clear]   │
                                            └──────────────────────┘
(same state as the top filter bar; the whole page filters)
```

## 9. Requirement Delta Preview

### ADDED Requirements

- The Results detail toolbar shows a Filters dropdown with Funding and Status multi-selects bound to the global selection. A change there updates the top bar, every block, and the table count.
- The dropdown shows the active-value count for those two dimensions, plus Clear (which clears only Funding and Status).
- The dropdown is keyboard operable (Esc closes, focus returns to the button) and announces state like the top-bar multi-selects do.
- The export adds `Rejection reason`, `Rejected by`, `Rejected on` after `Status`. For a Rejected row they come from that result's newest `REJECT`/`REJECTED` history row; a missing value is `—`; while the dimensions map is not ready they read `Unavailable`.
- `portfolio/result-dimensions` returns `rejections` for the requested version (admin-only, unchanged guard).

### MODIFIED Requirements

- FDE-R-8 export columns: 13 → 16.
- FDE toolbar: Search · **Filters** · Export.

### REMOVED Requirements

- None.

## 10. Approach Options

**Filters (the user decided: shortcut to the globals).** The remaining choice is how to build it, settled in design:

| # | Option | Pros | Cons |
|---|---|---|---|
| F-A | **One "Filters" popover** with two checkbox groups, calling the service's `toggleValue` | Matches the approved sketch, a single button | New small popover component |
| F-B | Two existing `app-filter-multi-select` (Funding ▾, Status ▾) side by side | Reuses tested code (`filter-bar/filter-multi-select.component.ts:40-50`) | Two buttons instead of one; differs from the sketch |

**Rejection data:**

| # | Option | Pros | Cons |
|---|---|---|---|
| R-A | **`rejections` on the existing `portfolio/result-dimensions`** | Request already in flight; admin guard, version handling, retry and `Unavailable` contract all exist | Endpoint named "dimensions" carries non-dimension data |
| R-B | New `portfolio/rejections` endpoint | Clean separation | Second request with its own loading, error and retry state |
| R-C | Per-row `bilateral/:id/review-history` at export | No server change | N requests on click |

## 11. Recommended Approach

**F-A + R-A.**
- F-A follows the sketch the user approved. The popover holds no filter state, so most of its logic is already covered by the service's `toggleValue` tests. If F-A grows past a small component, fall back to F-B.
- R-A adds one bounded query to an existing `Promise.all` and three columns in a pure, already-tested function.

Rejection query sketch:

```sql
SELECT r.id AS result_id, rrh.comment, ci.official_code AS initiative_code, rrh.created_at
FROM result r
JOIN result_review_history rrh ON rrh.result_id = r.id AND rrh.action IN ('REJECT','REJECTED')
LEFT JOIN clarisa_initiatives ci ON ci.id = rrh.initiative_id
WHERE r.version_id = ? AND r.is_active = 1 AND r.status_id = 7 AND r.result_type_id NOT IN (10, 11)
  AND rrh.id = (SELECT MAX(x.id) FROM result_review_history x
                WHERE x.result_id = r.id AND x.action IN ('REJECT','REJECTED'))
```

Column names and the "newest" rule are confirmed in the `/akili-specify` Premise Ledger.

## 12. Risks, Dependencies, And Open Questions

| # | Item | Handling |
|---|---|---|
| R-1 | A user expects the table dropdown to filter only the table, then sees KPIs change | User-approved behavior. A one-line hint in the panel ("Also filters the whole page") |
| R-2 | Funding interacts with blocks that are single-source by rule (Centers and Projects are `bilateral`, ToC is `w1w2`; `portfolio-filters.ts:332-336`) | No change: the existing "Not affected by" logic still applies, because the state is the same |
| R-3 | Excel cell limit of 32,767 characters on a long comment | Truncate in `toExportRows` |
| R-4 | "Newest" by `MAX(id)` vs `created_at` (the notice sorts by `created_at`, then `id`) | Mirror the notice's order if the ids are not monotonic |
| R-5 | Budget: the earlier table spec (FDE) ran about 2.5× its LOC estimate on template and a11y markup (kaizen note) | Size the popover at about 2× in `tasks.md` |
| OQ-1 | Show the rejection reason on screen too (an ⓘ tooltip on the Rejected status)? | Default **no**: the user asked for the export. Easy follow-up |
| OQ-2 | Keep `Rejected on`? | Default yes |
| OQ-3 | Resubmitted results (no longer status 7): include their last reason? | Default no |

## 13. Success Criteria

- From the table, Filters → Funding W3/Bilateral + Status Rejected → the top bar shows the same two selections, and the table count equals the KPI total.
- Export Excel then gives only those rows, each with a `Rejection reason` that matches its rejection notice.
- Clear in the dropdown removes only the Funding and Status selections.
- Server and client Jest gates are green, and client lint is clean.
- SR-168253 is answered with PRTest/PROD verification.

## 14. Next Step

```text
/akili-specify changes/portfolio-rejection-reason-export
```

Standard Change depth: one UI component and toolbar, one endpoint field, and the export columns.
