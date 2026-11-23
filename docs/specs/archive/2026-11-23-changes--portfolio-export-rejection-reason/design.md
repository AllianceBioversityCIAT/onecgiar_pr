# Design — Rejection reason in the Portfolio Overview Excel export

> **Answer first:** one more read query in `ResultRepository.getPortfolioResultDimensions` returns the latest REJECT entry of each Rejected result in the version. The service maps it to a new additive field, `rejections: [resultId, paCode | null, comment][]`. On the client, `buildDetailLabels` indexes it, `toDetailRows` resolves two new row fields, and `toExportRows` writes two columns after Status. The hyperlink column number is derived from the header list instead of the hard-coded `13`. No migration, no UI change.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-export-rejection-reason` |
| Requirements | `requirements.md` (PER-R-1..5), approved 2026-11-17 |
| Depth | Standard |
| Verified at | `2ffb3e887` (qa-development-2026-ss) |
| Architecturally significant | No: an additive field on an existing endpoint, no new module, integration or persistence change |
| Backend route | `nestjs-expert` (repository/service/DTO + Jest), `api-design-principles` (additive admin payload) |
| UI | None on screen. Spreadsheet only, so `impeccable-bridge` does not apply |

## 1A. Premise Ledger

Count: 9 verified, 1 `UNVERIFIED` (Impact Low).
Blast-radius triggers: `live-path` (user action "Export"), `consumer` (response shape, exported `EXPORT_COLUMNS` / `DetailRow` / `DetailLabels`), `shared-state` (the `labels` computed and the dimensions map are read by more than the export).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | A review Reject writes `result_review_history` with `action=REJECT`, `comment`=justification (required), `initiative_id`=the result's owner SP | location | `onecgiar-pr-server/src/api/results/results.service.ts:4366-4373` (required check), `:4387-4390` (owner), `:4416-4422` (insert) | 2ffb3e887 | DD-1 source wrong; scope changes (High) | — |
| P-2 | A primary-SP decline also writes REJECT, comment prefixed with the SP code, `initiative_id`=declining SP | location | `onecgiar-pr-server/src/api/results/share-result-request/services/primary-program-request.service.ts:1171-1180` | 2ffb3e887 | Reason text format differs; no design change (Low) | — |
| P-3 | Rejected status id is 7 on both paths | data-env | `results.service.ts:4400-4402` (`ResultStatusData.Rejected`); `primary-program-request.service.ts:1163`; client `portfolio-status-slot.ts:18` (`sid === 7`) | 2ffb3e887 | DD-2 filter wrong (High) | — |
| P-4 | `clarisa_initiatives.official_code` holds the P/A code and is already joined from `result_review_history` | location | `clarisa-initiative.entity.ts:21-24`; `result-review-history.repository.ts:63,71` | 2ffb3e887 | DD-1 join changes (Low) | — |
| P-5 | Every Rejected result in PROD has a REJECT entry (v6 165/165, v8 5/5) | data-env | `UNVERIFIED — confirm at source before relying on it`. User-stated (DBeaver screenshot, PRMSPROD, 2026-11-17) | — | `Not recorded` cells appear in the file; behavior already specified (PER-S-3.3), so no design change (Low) | PER-T-4 re-runs the count read-only on PROD; owner: user at the HITL pause |
| P-6 | **Live path:** Export button → `exportToExcel` (`results-detail.component.ts:135`) → `toExportRows(this.listed())` (`:141`) ← `listed` ← `detailRows` = `toDetailRows(rows, dimensionsStatus, labels)` (`:98`) ← `labels` = `buildDetailLabels(dimensionsMap())` (`:94-97`) ← input `[dimensionsMap]="data.dimensions().map"` (`portfolio-overview.component.html:380`) ← `dimensions.set({status:'ready', map: envelope.response})` (`portfolio-overview.service.ts:531-539`) ← `GET …/portfolio/result-dimensions` (`results-api.service.ts:1748`) → controller `:431` → `service.getPortfolioResultDimensions` (`results-framework-reporting.service.ts:1374`) → `ResultRepository.getPortfolioResultDimensions` (`result.repository.ts:4565`). The client passes `response` through whole, so a new field reaches `dimensionsMap` with no service change | live-path | file:line as listed | 2ffb3e887 | A client service mapping task would be needed (Low) | — |
| P-7 | The hyperlink is placed by position: `cellsToLink[].cellNumber` → `row.getCell(cellNumber)` (1-based exceljs). Today it is `13` | location | `results-detail.component.ts:144`; `shared/services/export-tables.service.ts:52-58` | 2ffb3e887 | DD-4 not needed (Low) | — |
| P-8 | **Consumers of the response shape / exported symbols.** Search: `grep -rln "PortfolioResultDimensions\b\|result-dimensions" onecgiar-pr-client/src onecgiar-pr-client/cypress --include=*.ts` → 11 files: `results-detail.component.ts`, `results-detail.rows.ts`, `results-detail.rows.spec.ts`, `portfolio-overview.component.spec.ts`, `portfolio-filters.ts`, `portfolio-filters.spec.ts`, `portfolio-overview.service.ts`, `portfolio-overview.service.spec.ts`, `portfolio-result-dimensions.interface.ts`, `results-api.service.ts`, `results-api.service.spec.ts`. `grep -rln "DetailRow\b\|EXPORT_COLUMNS\|toDetailRows" onecgiar-pr-client/src onecgiar-pr-client/cypress --include=*.ts` → `results-detail.component.ts`, `results-detail.rows.ts`, `results-detail.rows.spec.ts`, plus `results-list-filters.component.ts` (a false hit: its own `P25_REQUIRED_EXPORT_COLUMNS`). Server: `grep -rln "getPortfolioResultDimensions" onecgiar-pr-server/src --include=*.spec.ts` → `result.repository.spec.ts`, `results-framework-reporting.controller.spec.ts`, `results-framework-reporting.service.spec.ts`. No Cypress/E2E hit | consumer | commands as listed, repo root | 2ffb3e887 | Missed spec breaks CI (Low) | — |
| P-9 | **Pinned assertions that this change breaks:** `result.repository.spec.ts:1860` `toHaveBeenCalledTimes(4)`; `results-detail.component.spec.ts:132-133` `wscols` length 13 and `cellNumber: 13`; `results-detail.rows.spec.ts:185-203` exact 13-key list | consumer | file:line | 2ffb3e887 | Unplanned red specs (Low) | — |
| P-10 | **Shared state:** readers of `dimensionsMap` / `DetailLabels`: `results-detail.component.ts:94-98` (labels → rows → table + export), `filter-bar.component.ts:62` (its own `labels()` from the map, reads projects/centers only), `portfolio-filters.ts` (reads links and `w3ProjectIds`). None iterates the map's keys, so an extra field is inert for them | shared-state | `grep -rn "buildDetailLabels\|DetailLabels\|labels()" onecgiar-pr-client/src/app/pages/result-framework-reporting --include=*.ts --include=*.html` | 2ffb3e887 | A filter would need updating (Low) | — |

## 2. Architecture Overview

Extends GLF's dimensions map (server) and FDE's pure export rows (client). Nothing new is added beside them.

| Layer | Change | Requirement |
|---|---|---|
| `ResultRepository.getPortfolioResultDimensions` | 5th query in the same `Promise.all`: latest REJECT per Rejected result of the version | PER-R-1 |
| `ResultsFrameworkReportingService.getPortfolioResultDimensions` | Maps raw rows to `rejections` triples; error path unchanged | PER-R-1, PER-R-2 |
| `PortfolioResultDimensionsResponseDto` | New `rejections` property with Swagger description | PER-R-2 |
| Client `PortfolioResultDimensions` interface | New `rejections?: ResultRejection[]` (optional; see DD-5) | PER-R-3 |
| `results-detail.rows.ts` | `DetailLabels.rejections` map; `DetailRow.rejectionReason/rejectedBy`; 2 headers; export mapping | PER-R-3, PER-R-5 |
| `results-detail.component.ts` | Default map gains `rejections: []`; Link `cellNumber` derived; widths | PER-R-4 |

## 3. Data Model

No entity, column or migration change. It only reads `result`, `result_review_history` and `clarisa_initiatives`.

## 4. API Design

`GET api/results-framework-reporting/portfolio/result-dimensions?versionId=` (Admin, unchanged guard).

| Field | Type | Meaning |
|---|---|---|
| `rejections` (new) | array of `[resultId: number, paCode: string \| null, comment: string]` | One entry per active result of the version, type ∉ {10, 11}, `status_id = 7`, that has at least one REJECT entry; the entry is the latest (DD-2). A null comment is sent as `''` |

Bilateral / platform-report impact: **none**. `/api/bilateral/*` is untouched, and `bilateral-result-summaries.en.md` needs no change-log entry.

## 5. Server rules

1. Same version and result filters as the four existing queries: `version_id = ?`, `is_active = 1`, `result_type_id NOT IN (10, 11)`, plus `status_id = 7`.
2. Latest entry: the REJECT row for which no other REJECT row of the same result has a greater `(created_at, id)`. Written as a correlated `NOT EXISTS`, so it doesn't depend on window functions (DD-2).
3. P/A code: `LEFT JOIN clarisa_initiatives` on `initiative_id` → `official_code`, null when missing (PER-S-1.4).
4. Error path: the repository keeps `debug: false`; the service's 5xx branch logs only `error.code` (`results-framework-reporting.service.ts:1446-1451`). Comment text never reaches a log (PER-S-2.2).

## 6. Frontend Plan

- `buildDetailLabels`: adds `rejections: Map<resultId, { by: string | null; reason: string }>` from the triples.
- `toDetailRows`: for each row, if its status slot ≠ `rejected` → both `—`. If rejected and the map is not ready, or ready but without a `rejections` field → `Unavailable`. If rejected and ready with no entry → both `Not recorded`. With an entry → reason = comment (trimmed to empty check only; text kept as-is), by = code or `Not recorded` (PER-S-3.1..3.5).
- `EXPORT_COLUMNS` / `toExportRows`: insert `Rejection reason`, `Rejected by` after `Status`.
- `EXPORT_WSCOLS`: `Rejection reason` width 60, like Title/Link.
- Link hyperlink: `cellNumber = EXPORT_COLUMNS.indexOf('Link') + 1` (DD-4).
- Table template, search and sort keys: untouched (PER-R-5).

## 7. Security, Performance, Observability

| Concern | Decision |
|---|---|
| Access | Admin-only guard reused; no new route |
| Privacy | Only `official_code` is exported. No user name or email is selected |
| Performance | 170 Rejected rows in PROD today (P-5). The query is index-friendly on `result_review_history.result_id` (FK) and runs in parallel with the other four |
| Logs | No new log lines |

## 8. Design Decisions

| ID | Decision | Alternatives rejected | Req |
|---|---|---|---|
| PER-DD-1 | Carry rejections on the dimensions map | Join into `GET_AllResultsWithUseRole` (shared by many pages and roles, wider exposure); N calls to the review-history endpoint (N round trips) | PER-R-1, R-2 |
| PER-DD-2 | Latest by `(created_at DESC, id DESC)` with `NOT EXISTS`, filtered on current status 7 | Window function `ROW_NUMBER()` (depends on MySQL ≥ 8 on every env; not needed); every REJECT concatenated (noisy; not asked) | PER-S-1.1..1.3 |
| PER-DD-3 | Positional triples `[id, code, comment]` | Object array (heavier; breaks the map's pair convention, GLF) | PER-R-2 |
| PER-DD-4 | Derive the Link column number from `EXPORT_COLUMNS` | Hard-code `15` (repeats the bug class at the next insertion) | PER-R-4 |
| PER-DD-5 | Client field optional. An absent `rejections` reads as `Unavailable`, not `Not recorded` | Required field (a newer client on an older server would claim "Not recorded" for every reason) | PER-S-3.5 |

Reversion challenge (Step 2.3): none of these decisions removes behavior already delivered. Moving the Link column from 13 to 15 keeps its behavior. Not triggered.

## 9. Testing Plan

| Layer | File | What |
|---|---|---|
| Server repo | `result.repository.spec.ts` | 5 queries; the 5th SQL has `status_id = 7`, `action = 'REJECT'`, the `NOT EXISTS` tie-break on `id`, version param |
| Server service | `results-framework-reporting.service.spec.ts` | Mapping to triples (null code, null comment → `''`); existing fields unchanged; 5xx path does not log the comment |
| Client rows | `results-detail.rows.spec.ts` | 15-key order; S-3.1..3.5 |
| Client component | `results-detail.component.spec.ts` | `wscols` 15; link `cellNumber` 15 on `Link` |
| Types | `npx tsc --noEmit -p tsconfig.app.json` (client), `npm run build` (server) | — |
| Real data / file | PER-T-4 (HITL) | PROD count + opening the real `.xlsx` |

## 10. Budget (Step 2.4)

| Expected | Value |
|---|---|
| Tasks | 4 (server · client rows · client component · HITL check) |
| LOC | ~90 production + ~150 test |
| Review rounds | 4 (one per code task + 1 margin) |

Matches Standard. A tripwire for `/akili-execute`: stop and escalate if it goes over.

## 11. Rollback

Revert the commit. The field is additive and the client treats its absence as `Unavailable`, so server and client can be rolled back independently.
