# Proposal — Rejection reason in the Portfolio Overview Excel export

> **Answer first:** add a **Rejection reason** column (plus who rejected it) to the Excel that the Results detail table of the Portfolio Overview exports. The text already exists in `result_review_history.comment`; the server adds it to the admin-only `portfolio/result-dimensions` payload as one more `[resultId, …]` list, and the client writes it into the export. No migration, no change to `/api/bilateral/*`.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-export-rejection-reason` |
| Slug | `portfolio-export-rejection-reason` — derived from free-text argument (Nicoleta's email) |
| Type | Change |
| Deliverable | software |
| Approval Mode | gated |
| Requirement source | Email from Nicoleta (PMU), pasted by the user 2026-11-17. No Jira ticket given |
| Visual source | None — one extra spreadsheet column, no screen layout change |
| Related specs | archived `2026-10-16-changes--portfolio-overview-revamp--filtered-detail-export` (FDE: defines the table and the export), archived `…--global-filters` (GLF: defines `result-dimensions`) |
| Depends on | none |
| Parallel-safe | yes |
| Date | 2026-11-17 |

## 2. Intent

> "In the portfolio overview dashboard, please include in the Excel table at the bottom of the page the reasons for rejection of a result. I noticed a few results rejected by the P/A and would like to know why." — Nicoleta

PMU must see **why** a P/A rejected a result without opening each one.

## 3. Problem / Current Behavior

| # | Today | Source |
|---|---|---|
| P-1 | The export has 13 columns (Code … Phase, Link). Status reads `Rejected`, but nothing says why | `results-detail.rows.ts:161-175` (`EXPORT_COLUMNS`) |
| P-2 | The justification is stored: a Science Program review **Reject** writes `result_review_history` with `action = REJECT`, `comment = justification` (required), `initiative_id` = the reviewing P/A | `results.service.ts:4366-4373` (required check), `:4416-4422` (insert) |
| P-3 | A second path also writes REJECT: a P/A declining to be primary Science Program; the comment is prefixed `"<SP code> declined to be the primary Science Program of this result: …"` | `primary-program-request.service.ts:1171-1180` |
| P-4 | The reason is only readable one result at a time (`getReviewHistoryByResultId`, P2-3157 view) | `result-review-history.repository.ts:46-84` |
| P-5 | Page rows come from `GET_AllResultsWithUseRole` (shared with other pages); the export's per-result extras come from `GET portfolio/result-dimensions`, which is Admin-only and version-scoped | `portfolio-overview.service.ts:495,531`; controller `results-framework-reporting.controller.ts:431-433` |
| P-6 | Every Rejected result in PROD has a REJECT entry (v6: 165/165, v8: 5/5) | user's PROD read query, DBeaver, 2026-11-17 |

## 4. Proposed Outcome

When PMU exports the Results detail table, each row whose status is **Rejected** shows:

- **Rejection reason** — the comment of that result's **latest** REJECT entry.
- **Rejected by** — the P/A official code of that entry (e.g. `SP06`).

Rows that are not Rejected leave both cells as `—`. A Rejected row with no stored reason reads `Not recorded` (keeps "none" distinct from "unknown", FDE-DD-3 style).

## 5. Scope

| In | Out |
|---|---|
| Server: one read query for the latest REJECT per result of the version; new field on the `result-dimensions` DTO | New tables, migrations, or edits to how rejection is saved |
| Client: 2 export columns, mapped in `toExportRows` | Changing the on-screen table (see Option C / OQ-1) |
| Unit tests for the query mapping and the export rows | Showing the full review history (UPDATE/APPROVE entries) |

## 6. Non-Goals

- Not a new filter ("rejected with reason X").
- Not exposing the reviewer's name or email in the Excel (only the P/A code).
- No change to `/api/bilateral/*`: this is a read-only admin dashboard, not the W3/Bilateral form. The PR will state that the bilateral payload is unchanged (AGENTS.md §6 rule).

## 7. Affected Users, Systems, And Specs

| Item | Impact |
|---|---|
| PMU / Admin (only role on this page) | Gets the reasons in the export |
| `results-framework-reporting` service + `result.repository.ts` (`getPortfolioResultDimensions`) | One extra query + field |
| `portfolio-result-dimensions.dto.ts` + client interface | New field |
| `results-detail.rows.ts` (`DetailRow`, `toExportRows`, `EXPORT_COLUMNS`) + specs | 2 columns |
| `results-detail.component.ts` (`EXPORT_WSCOLS` width) | Reason column wide (60) |

## 8. Visual Reference

- Source: None
- Location: —
- Notes: spreadsheet-only change; the export layout is defined by FDE (`EXPORT_COLUMNS`).

## 9. Requirement Delta Preview

### ADDED Requirements

- The `result-dimensions` response carries, per result of the version whose current status is Rejected, its latest REJECT entry: `[resultId, initiativeCode, comment]`.
- The Excel export has two new columns after **Status**: `Rejection reason`, `Rejected by`.

### MODIFIED Requirements

- FDE-R-8 export columns go from 13 to 15. While the map is not ready, the new cells read `Unavailable`, like Contributing Centers and Projects (FDE S-3.1).

### REMOVED Requirements

- None.

## 10. Approach Options

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. Extend `result-dimensions`** (recommended) | One `SELECT` of the latest REJECT per result in the version, joined to `clarisa_initiatives`; returned as positional triples | Same admin-only, version-scoped endpoint the export already waits on; one query; no shared endpoint touched | Payload grows by the size of the reasons (only Rejected rows — small) |
| B. Add `rejection_reason` to `GET_AllResultsWithUseRole` | Join in the shared results-list query | Reason arrives with the row | That query feeds many pages and all roles; heavier blast radius and wider data exposure |
| C. Option A + show it on screen | Also add a column/tooltip in the table | Visible without exporting | Nicoleta asked for the Excel only; the table is already 12 columns wide at 1280px |

## 11. Recommended Approach

**Option A.** It is the smallest safe path: the endpoint is already Admin-only, version-scoped, and loaded before export is enabled; the reason is plain text already stored; nothing about how results are rejected changes. Option C can follow as a separate quick change if Nicoleta wants it on screen.

## 12. Risks, Dependencies, And Open Questions

| ID | Item |
|---|---|
| R-1 | A result rejected, resubmitted, and rejected again → only the latest reason is shown. Mitigated by "latest REJECT by `created_at DESC, id DESC`", same order as the P2-3157 view |
| R-2 | A result rejected then resubmitted (now Pending Review) must not show an old reason → filter on current status = Rejected (7) |
| R-3 | Long comments: Excel cell limit is 32,767 chars; justifications are far below that. Newlines kept as-is |
| OQ-1 | Excel only, or also visible in the on-screen table? (default: Excel only, as asked) |
| OQ-2 | Is "Rejected by" (P/A code) wanted, or only the reason? (default: both — she said "rejected by the P/A") |
| OQ-3 | **Resolved 2026-11-17** (user's PROD read query): v6 = 165 rejected / 0 without reason; v8 = 5 / 0. `Not recorded` stays only as a guard |

## 13. Success Criteria

- Exporting the current phase gives one `Rejection reason` per Rejected row, equal to its latest REJECT comment in `result_review_history`.
- Non-rejected rows show `—`; Rejected rows without a stored reason show `Not recorded`.
- `result-dimensions` stays Admin-only; no migration; `/api/bilateral/*` unchanged.
- Touched Jest specs (server repository/service, client `results-detail.rows.spec.ts`) green.

## 14. Next Step

```text
/akili-specify changes/portfolio-export-rejection-reason
```
