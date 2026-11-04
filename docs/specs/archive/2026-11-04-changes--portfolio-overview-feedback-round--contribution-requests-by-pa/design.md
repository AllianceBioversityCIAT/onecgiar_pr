# Design — Contribution requests by Program/Accelerator (CRP)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-feedback-round/contribution-requests-by-pa` |
| Requirements | [`requirements.md`](./requirements.md) (approved 2026-11-04) |
| Depth | Standard |
| Status | approved (2026-11-04) |
| Date | 2026-11-04 |
| Skills | `nestjs-expert`, `api-design-principles`, `angular-developer`, `spartan`, `tailwind-design-system` |

## 2. Executive Summary

Copy the **W3/Bilateral projects** pattern end to end: a `portfolio/contribution-requests` admin endpoint that resolves the version like its siblings, reads **one** flat list of in-phase contribution requests, and aggregates in TypeScript; a new `app-portfolio-contribution-requests-block` with its own data path, mounted after the Projects block. No schema change.

## 3. Architecture Overview

| Step | Where | What |
|---|---|---|
| 1 | Client page | Mounts the block under `@if (!data.loading())`, outside `hasFigures()`, passes `versionId`, `programs`, `notAffected` |
| 2 | Block | `GET_PortfolioContributionRequests(versionId)` — one call per version and per Retry, switch-latest |
| 3 | Controller | `GET results-framework-reporting/portfolio/contribution-requests?versionId=`; Admin role + `ValidRoleGuard`; same `versionId` coercion |
| 4 | Service | `resolveReportingVersion` → P/A seed (portfolio 3, active, entity types 22/23/24 — same as bilateral-projects) → repository facts → aggregate |
| 5 | Repository | `ShareResultRequestRepository.getPortfolioContributionRequestFacts(versionId)` — one SQL, one row per request |

## 4. Extended Directory Structure

| Path | Change |
|---|---|
| `onecgiar-pr-server/src/api/results/share-result-request/share-result-request.repository.ts` | + facts method |
| `onecgiar-pr-server/src/api/results-framework-reporting/dto/portfolio-contribution-requests.dto.ts` | new (Swagger response DTO) |
| `…/results-framework-reporting.service.ts` / `.controller.ts` | + method / + route |
| `onecgiar-pr-client/src/app/shared/interfaces/portfolio-contribution-requests.interface.ts` | new |
| `…/shared/services/api/results-api.service.ts` | + `GET_PortfolioContributionRequests` |
| `…/portfolio-overview/components/contribution-requests-block/` | new: component `.ts/.html`, `contribution-requests.format.ts` (pure) |
| `…/portfolio-overview/services/portfolio-filters.ts` | + section `contributions` |
| `…/portfolio-overview/portfolio-overview.component.{ts,html}` | mount + `contributionsNotAffected` |
| `src/internationalization/portfolio-overview.copy.ts` | + group `contributions` |
| `…/portfolio-overview/CLAUDE.md` | + section |

## 5. Data Model

No change. Read-only over `share_result_request` (+ `result`, `clarisa_initiatives`).

**Facts query rules (CRP-R-1):** `srr.is_active > 0` · `srr.request_type = 'contribution'` · `srr.request_status_id IN (1,2,3)` · `r.is_active > 0` · `r.version_id = :versionId`. Selected: request id, result id, result code, result title, requester P/A id + official code, approving P/A id + official code (left joins on `clarisa_initiatives`), status id, requested date. Parameterised, no string interpolation of the version.

## 6. API Design

`GET /api/results-framework-reporting/portfolio/contribution-requests?versionId=` — response (wrapped in the usual `{ response, message, status }`):

| Field | Meaning |
|---|---|
| `versionId`, `phaseYear` | Resolved phase |
| `totals` | `{ pending, accepted, declined }` — each request once |
| `byProgram[]` | Every seed P/A: `initiativeId`, `code`, `shortName`, `sent{pending,accepted,declined}`, `received{…}`. Unordered (client sorts) |
| `pending[]` | Status-1 requests: `requestId`, `resultCode`, `title`, `requesterCode`, `approvingCode`, `requestedDate` (ISO) |

Errors: no resolvable version → same handled error as siblings. Non-admin → guard refusal (CRP-R-5).

## 7. Backend Module Design

- **Aggregation in TS, not SQL** (DD-2): one pass over facts; a fact increments `sent[status]` of its requester P/A and `received[status]` of its approving P/A **only if that P/A is in the seed**, and `totals[status]` always once.
- A request whose P/A is outside the open portfolio still counts in `totals` and appears in `pending` with its code (it is still a request to chase).
- `ShareResultRequestModule` already exports the repository and is imported by the RFR module — no module wiring change.

## 8. Frontend / UX Component Architecture

`PortfolioContributionRequestsBlockComponent` (OnPush, signals), inputs `versionId`, `programs: ReadonlySet<string>`, `notAffected`.

| Part | Content |
|---|---|
| Header | Title "Contribution requests by Program/Accelerator", phase chip, one-line subtitle "Requests between Programs/Accelerators to contribute to a result. Pending = not answered yet." |
| KPI row | 3 small cards: Pending · Accepted · Declined (portfolio totals). Note "Totals cover the whole portfolio" when a Program filter is active |
| Table (`@spartan/table`) | Columns: P/A · Received (Pending / Accepted / Declined) · Sent (Pending / Accepted / Declined) · expand. Received first: it is who must act. Pending cells emphasised when > 0 |
| Row expand | `<button aria-expanded>` reveals that P/A's pending requests (as requester or approver): result code (link via `resultUrl`, new tab), title, from → to, requested date, days waiting |
| "All pending (N)" | One toggle under the table with the full list, oldest first |
| States | Skeleton rows · error + Retry · empty ("No contribution requests in this phase") · ready. Not-affected strip like Projects |

`contribution-requests.format.ts` (pure, unit-tested): `sortRows` (received pending desc, then code — CRP-R-6), `filterByPrograms`, `pendingFor(code)`, `daysWaiting(date, now)`.

Tokens: existing ones only (status tile colours for Pending/Accepted/Declined reuse submitted/approved/rejected slot tokens). No `%`.

## 9. Shared Contracts

`portfolio-filters.ts`: `FilterSection` gains `contributions`; `SECTION_HONOURS.contributions = ['program']`; no `SECTION_SOURCE` entry. The page calls `notAffectedBy('contributions', selection, ['funding'])` so an active Funding filter is listed as not affected (without `extra`, a source-less section treats Funding as honoured).

## 10. Design Decisions

| ID | Decision | Why / rejected |
|---|---|---|
| CRP-DD-1 | Received = `approving_inititiative_id` | It is who must act; matches Notifications. Rejected `shared_inititiative_id` (wrong side when a contributor asks the owner) |
| CRP-DD-2 | One flat SQL + TS aggregation | Hundreds of rows; mapping is unit-testable; zero-row P/As come from the seed. Rejected SQL `GROUP BY` ×2 (two sides, harder to test, still needs the seed) |
| CRP-DD-3 | Phase = result's `version_id` | A request belongs to the phase its result is reported in. Rejected `requested_date` windows (phases overlap calendar years) |
| CRP-DD-4 | Program filter client-side only | GLF-R-7: filters never refetch |
| CRP-DD-5 | Mount after Projects, before Results detail | Results detail must stay last (FDE mount rule) |
| CRP-DD-6 | No reminder button, no export | Proposal non-goals; monitoring only |

**Reversion challenge (Step 2.3):** no DD removes delivered behavior → not triggered.

## 11. Budget (tripwire)

| Measure | Expected |
|---|---|
| Tasks | 4 |
| LOC (incl. tests) | ~650 (server ~250, client ~400) |
| Review rounds | 1 per task, ≤ 2 for the block |

Matches Standard depth.
