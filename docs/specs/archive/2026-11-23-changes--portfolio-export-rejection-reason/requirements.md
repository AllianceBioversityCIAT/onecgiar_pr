# Requirements — Rejection reason in the Portfolio Overview Excel export

> **Answer first:** the Results detail Excel of the Portfolio Overview gains two columns after **Status**: **Rejection reason** and **Rejected by**. For every row whose status is Rejected they hold the latest REJECT entry of `result_review_history` (comment + P/A code). Every other row reads `—`. The on-screen table does not change.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-export-rejection-reason` |
| Module | `results-framework-reporting` (server) · `pages/result-framework-reporting/pages/portfolio-overview` (client) |
| Type | Change |
| Deliverable | software |
| Depth | Standard (additive API field + export change) |
| Approval Mode | gated |
| Requirement prefix | `PER` |
| Source | `proposal.md` (Nicoleta email, 2026-11-17) |
| Extends | archived `2026-10-16-changes--portfolio-overview-revamp--filtered-detail-export` (FDE-R-8 export) and `…--global-filters` (GLF `result-dimensions`) |
| Status | approved (2026-11-17, user: Continue) |
| Date | 2026-11-17 |

**Decisions carried from the proposal**

| Item | Decision | Source |
|---|---|---|
| OQ-1 Excel only? | Excel only; on-screen table unchanged | proposal default; user did not change it (2026-11-17) |
| OQ-2 "Rejected by"? | Included (P/A official code) | proposal default; user did not change it (2026-11-17) |
| OQ-3 Rejected rows with no stored reason | PROD: version 6 = 165 rejected / 0 without reason; version 8 = 5 / 0 | user's read query in DBeaver, PRMSPROD, 2026-11-17 (screenshot). Proposal context, re-checked as PER-T-4 |

## 2. Executive Summary

PMU sees `Status = Rejected` in the export but not why. The reason already exists: every REJECT writes `result_review_history.comment` (required on the review path — `results.service.ts:4366-4373`; built from the decline justification on the primary-SP path — `primary-program-request.service.ts:1171-1180`). The change carries that text into the export.

## 3. Glossary

| Term | Meaning |
|---|---|
| REJECT entry | A `result_review_history` row with `action = 'REJECT'` |
| Latest REJECT entry | For one result, the REJECT entry with the greatest `created_at`; ties broken by the greatest `id` (same order as the P2-3157 history view, `result-review-history.repository.ts:76`) |
| Rejected row | A detail row whose status label is `Rejected` (status slot `rejected`, `portfolio-status-slot.ts:18`) |
| Dimensions map | `GET api/results-framework-reporting/portfolio/result-dimensions` response (admin only) |

## 4. System Context & Scope

Today:

- The export has 13 columns, `Code … Phase, Link`; nothing explains a rejection — `results-detail.rows.ts:161-175`.
- The Link column is turned into a hyperlink by **position** (`cellNumber: 13`) — `results-detail.component.ts:144`.
- The dimensions map is version-scoped and restricted to Admin — `results-framework-reporting.controller.ts:431-433`.
- Rows of the page come from `GET_AllResultsWithUseRole` (shared with other pages) — `portfolio-overview.service.ts:495`. Out of scope to change.

| In scope | Out of scope |
|---|---|
| Latest REJECT entry per Rejected result of the version, added to the dimensions map | Full review history (APPROVE / UPDATE / RESUBMIT entries) |
| Two export columns | On-screen table, search, sort, filters |
| Server + client unit tests | How a rejection is saved; migrations |
| | `/api/bilateral/*` (unchanged — read-only admin dashboard, not the W3 form; AGENTS.md §6) |

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| PMU / portfolio lead (Nicoleta) | Reads why each P/A rejected a result, in the file she already exports |
| Platform admin | Same page, same access |
| Result submitter, QA reviewer, bilateral consumers | Nothing |

## 6. Functional Requirements

### Requirement PER-R-1: Latest rejection per rejected result in the dimensions map (MUST)

The dimensions map SHALL return, for each active result of the resolved version whose current status is Rejected (7) and whose type is not 10/11, its latest REJECT entry: result id, the P/A official code of that entry, and its comment.

#### Scenario PER-S-1.1: Rejected twice

- GIVEN result 101 in the version, status Rejected, with REJECT entries "A" (2026-05-01, SP06) and "B" (2026-06-01, SP09)
- WHEN the dimensions map is requested for that version
- THEN result 101 appears once, with `SP09` and "B"
- BUT it must NOT appear twice, or carry "A"

#### Scenario PER-S-1.2: Rejected, then resubmitted

- GIVEN result 102 has a REJECT entry and its current status is Pending Review (5)
- WHEN the dimensions map is requested
- THEN result 102 has no rejection entry
- AND IT MUST NOT carry the old reason

#### Scenario PER-S-1.3: Same timestamp

- GIVEN two REJECT entries for result 103 with the same `created_at`
- WHEN the dimensions map is requested
- THEN the entry with the greater `id` is returned

#### Scenario PER-S-1.4: No P/A on the entry

- GIVEN a REJECT entry whose `initiative_id` is NULL or matches no initiative
- WHEN the dimensions map is requested
- THEN the entry is still returned, with the P/A code empty (null)

#### Scenario PER-S-1.5: Other versions

- GIVEN a Rejected result in another version
- WHEN the map is requested for version V
- THEN that result is not returned

### Requirement PER-R-2: Access and shape stay as they are (MUST)

The dimensions endpoint SHALL keep its Admin-only restriction and every existing field unchanged; the new field is additive. Errors SHALL keep the current behavior: no SQL text or comment text in the response body or the log.

#### Scenario PER-S-2.1: Existing fields

- GIVEN any version
- WHEN the map is requested
- THEN `versionId`, `phaseName`, `projectLinks`, `centerLinks`, `projects`, `centers`, `w3ProjectIds` hold the same values as before the change

#### Scenario PER-S-2.2: Query failure

- GIVEN the rejection query fails
- WHEN the map is requested
- THEN the response is the existing generic 500 message
- BUT it must NOT contain SQL or any comment text

### Requirement PER-R-3: Two export columns (MUST)

The Excel export SHALL have 15 columns in this order: `Code, Title, Type, Level, P/A, Source, Status, Rejection reason, Rejected by, Origin, Lead Center, Contributing Centers, Projects, Phase, Link`.

#### Scenario PER-S-3.1: Rejected row with an entry

- GIVEN a Rejected row whose result has an entry `[id, 'SP06', 'Not aligned with ToC']` and the map is ready
- WHEN the user exports
- THEN `Rejection reason` = `Not aligned with ToC` and `Rejected by` = `SP06`
- AND IT MUST keep the comment text unchanged (no truncation; line breaks kept)

#### Scenario PER-S-3.2: Not a Rejected row

- GIVEN a row with any status other than Rejected (even if the map holds an entry for its id)
- WHEN the user exports
- THEN both cells read `—`

#### Scenario PER-S-3.3: Rejected row, no entry

- GIVEN a Rejected row, map ready, no entry for its id
- WHEN the user exports
- THEN both cells read `Not recorded`

#### Scenario PER-S-3.4: Rejected row, entry with no P/A

- GIVEN a Rejected row whose entry has a null P/A code and a comment
- WHEN the user exports
- THEN `Rejection reason` = the comment and `Rejected by` = `Not recorded`

#### Scenario PER-S-3.5: Map not ready

- GIVEN the map status is loading or error
- WHEN the user exports a Rejected row
- THEN both cells read `Unavailable` (same rule as Contributing Centers / Projects, FDE S-3.1)
- AND a non-Rejected row still reads `—`

### Requirement PER-R-4: Link stays a hyperlink in its own column (MUST)

The `Link` column SHALL remain the only hyperlinked column, in position 15.

#### Scenario PER-S-4.1: Columns shift

- GIVEN the two new columns are inserted before Link
- WHEN the user exports
- THEN the hyperlink is on the `Link` cell
- BUT it must NOT overwrite another column (today's hard-coded `cellNumber: 13` would land on `Projects`)

### Requirement PER-R-5: On-screen table unchanged (MUST)

The Results detail table on screen SHALL show the same columns, search, sort and paging as before.

#### Scenario PER-S-5.1

- GIVEN the page is loaded
- WHEN the user views or searches the table
- THEN no Rejection column appears, and search still matches code and title only

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | One extra read query on the dimensions call, scoped by version and status 7; the map request MUST NOT gain a second round trip from the client |
| Security | Admin-only, as today; `.cursorrules` — no comment text, SQL or params in logs |
| Privacy | Only the P/A code is exported; no reviewer name or email |
| Backwards compatibility | Additive field on an internal admin endpoint; no change to `/api/bilateral/*` or `bilateral-result-summaries.en.md` |
| Internationalization | Column headers sit beside the existing English export headers in `results-detail.rows.ts`. That is the FDE convention for this file, not `internationalization/` |

## 8. Defect classes and their gates

| Defect class | Gate | Automated? |
|---|---|---|
| Wrong entry chosen (older reject, resubmitted result, other version, ties) | Server repo spec on the SQL predicates and the service mapping. Mocked SQL can't prove semantics, so the **substitute** is PER-T-4: a read-only PROD query whose count must equal the Rejected count of the version | Partly. Semantics need the human check at the HITL pause |
| Column order / cell values / `—` vs `Not recorded` vs `Unavailable` | Client `results-detail.rows.spec.ts` | Yes |
| Hyperlink on the wrong column | Component spec: link cellNumber = position of `Link` in the header list | Yes for the argument. The rendered `.xlsx` is checked by opening the real file in PER-T-4 |
| Type mismatch on the new DTO / interface field | `npx tsc --noEmit -p tsconfig.app.json` (client) and the server build. Jest strips types | Yes |
| Comment text leaking to logs | Service spec: error path logs only the code | Yes |

## 9. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| PER-R-1 | Latest rejection per rejected result in the map | MUST |
| PER-R-2 | Access and shape stay as they are | MUST |
| PER-R-3 | Two export columns | MUST |
| PER-R-4 | Link stays a hyperlink in its own column | MUST |
| PER-R-5 | On-screen table unchanged | MUST |
