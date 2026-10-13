# Design — Primary SP card only after Submit for review (regression)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/primary-notify-on-submit-regression` |
| Depth | Lite · Bug Mode |
| Approval Mode | gated |
| Status | approved |
| Implements | `PNR-R-1`, `PNR-R-2`, `PNR-R-3`, `PNR-NFR-1..3` |
| Skills | `nestjs-expert`, `tdd` (Skill Map: server work) |

## 2. Executive Summary

Two server-only changes. **(1)** The Received inbox's history query stops matching `primary` rows whose result is in a preparation status (1, 7, 8). **(2)** Both submit paths stamp the active primary row's `requested_date` with the submit time inside their existing transaction, so the card sorts as new. No schema, API shape, client or ownership change.

## 3. Architecture Overview

| Premise | Evidence | Status |
|---|---|---|
| `PNR-P-1` The card is the history (`done`) row: `transferPrimary` writes `primary` + ACCEPTED (2) | `primary-program-request.service.ts:822-845` | verified |
| `PNR-P-2` `done` = `request_status_id IN (2,3)`, scoped by `shared_inititiative_id` (or unscoped for role 1), no result-status condition | `share-result-request.service.ts` `buildWhereReceivedConditions` | verified |
| `PNR-P-3` `done` is keyset-paged by (`requested_date` DESC, id DESC); `applyKeysetCursor` maps over a where-**array** (OR), so extra entries stay paginated correctly | `fetchThreeBucketsScoped`, `shared/utils/keyset-cursor.util.ts` | verified |
| `PNR-P-4` Since `1b97a9385` no code creates a pending (1) `primary` row (`request()` has no caller); pending primary rows are legacy only, and `PRA-R-3` deliberately keeps them actionable while Editing | grep of `request(` callers; `primary-review-not-accept/requirements.md` PRA-R-3 | verified |
| `PNR-P-5` Pop-up, bell count and `seen-all` read only `pendingOwner`/`pendingShared` | `share-result-request.service.ts:694, 796, 983` | verified |
| `PNR-P-6` Submit paths to Pending Review: in-app `BilateralCenterService.submitForReview` (first submit + in-app resubmit) and API `BilateralResubmissionService.commitResubmission`; both run one transaction | `bilateral-center.service.ts:2439`, `bilateral-resubmission.service.ts` `commitResubmission` | verified |
| `PNR-P-7` `primary` rows always have `is_map_to_toc = false` → only the first `done` entry (and the admin entry) can match them | `transferPrimary` insert | verified |

Flow after the fix:

```
Create / pick SP (Editing)  → transferPrimary → ACCEPTED primary row  ──X hidden (status 1)
Submit for review           → tx: status 5 + stamp requested_date=now ──► card under "Today"
Reject (7)                  → row unchanged                            ──X hidden while correcting
Resubmit (in-app or API)    → tx: status 5 + stamp requested_date=now ──► card under "Today"
```

## 4. Extended Directory Structure

| File | Change |
|---|---|
| `onecgiar-pr-server/src/api/results/share-result-request/share-result-request.service.ts` | `buildWhereReceivedConditions` → `done` entries split (DD-1) |
| `onecgiar-pr-server/src/api/results/share-result-request/services/primary-program-request.service.ts` | New `stampPrimaryCardSubmitted(resultId, manager)` (DD-2) |
| `onecgiar-pr-server/src/api/bilateral/services/bilateral-center.service.ts` | `submitForReview` calls it inside the tx, after the ownerless transfer |
| `onecgiar-pr-server/src/api/bilateral/services/bilateral-resubmission.service.ts` | Writers port gains the same stamp; `commitResubmission` calls it inside the tx |
| `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts` | Wires the new writer to `PrimaryProgramRequestService` where the port is built |
| Co-located `*.spec.ts` of the four files | Regression + positive tests |

## 5. Data Model

No schema change, no migration. Rows written: `share_result_request.requested_date` of the single active `primary` row of the submitted result. Existing prod rows need no script (`PNR-R-1` "Existing production rows") — the filter is read-side.

## 6. API Design

No endpoint or response-shape change. `GET` received-requests returns fewer `done` rows for results in preparation; same envelope, same `doneMeta`.

## 7. Backend Module Design

**Inbox (`PNR-R-1`, `PNR-R-3`).** The non-admin `done` OR-list today has 2 entries: (A) `shared_inititiative_id IN inits, is_map_to_toc=false` and (B) the map-to-ToC entry. A becomes two entries: **A1** = A + `request_type = contribution`; **A2** = A + `request_type = primary` + `obj_result.status_id NOT IN (1,7,8)`, keeping whatever `obj_result` already carries (`is_active`, merged `version_id`). B is untouched (`PNR-P-7`). The admin entry is split the same way. The preparation set is one named constant next to the builder, built from `ResultStatusData` values (no bare numbers).

**Stamp at submit (`PNR-R-2`, `PNR-NFR-1`).** `stampPrimaryCardSubmitted(resultId, manager)`: with the caller's manager, update the active `primary` row of the result (status ACCEPTED) setting `requested_date` to now. Zero rows affected is **not** an error (pre-PSR legacy results have no primary row); it logs one ids-only debug line. Query errors propagate so the caller's transaction rolls back. It does not touch `aprovaed_date` / `approved_by` (the "Accepted by" footer keeps its original meaning).

- `submitForReview`: called inside the existing transaction, **after** the ownerless `transferPrimary` branch, for every submit (first and resubmit).
- `commitResubmission`: called inside its transaction after the CAS (and after the optional transfer), via a new `ResubmissionWritersPort` member, so the port stays the only way that service reaches other modules.

## 8. Frontend / UX Component Architecture

None. The client already renders whatever rows the inbox returns; grouping ("Today") derives from `requested_date`.

## 9. Shared Contracts or Package Extensions

`ResubmissionWritersPort` gains one member (internal interface; test doubles in `bilateral-resubmission.service.spec.ts` must add it).

## 10. Design Decisions

| ID | Decision | Rejected alternative | Why |
|---|---|---|---|
| `PNR-DD-1` | Filter only the `done` (history) bucket; leave pending buckets alone | Also filter pending primary rows | `PNR-P-4`: no new pending primary rows exist; legacy ones are intentionally actionable while Editing (`PRA-R-3`). Touching pending would also hit bell count, pop-up and `seen-all` (`PNR-P-5`) for no gain |
| `PNR-DD-2` | Stamp `requested_date` at submit | Insert the row only at submit (proposal Option B) | `stateFor` / Section 0 banner read the ACCEPTED row; moving it breaks them and leaves prod rows to clean |
| `PNR-DD-3` | Preparation set = Editing 1, Rejected 7, Draft 8 | Only 1 and 8 | Requirements decision (OQ-1): the Center is still working on a Rejected result; the card returns at resubmit |
| `PNR-DD-4` | Split entries with `request_type` instead of a raw SQL `NOT (primary AND status)` | QueryBuilder rewrite of the bucket | Keeps the find-options + keyset helper path intact (`PNR-P-3`); smallest diff |

**Reversion challenge (Step 2.3) — `PNR-DD-3` hides an already-visible card while a result is Rejected.** *What does removing it break?* (a) The SP loses the card as a shortcut to the result during correction — the result is not reviewable then anyway, and the bilateral review page still lists it. (b) `PRA-R-3` "request already closed → open drawer" needs a visible stale row — not reachable while hidden, reachable again after resubmit. (c) Keyset paging: a row that disappears between page loads may shift positions — no duplicate/skip because the cursor is value-based, not offset-based. No concrete breakage left unaddressed.

## 11. Budget (Step 2.4)

| Measure | Estimate |
|---|---|
| Tasks | 2 |
| LOC | ~45 production + ~180 tests |
| Review rounds | 1 |

Matches Lite. `/akili-execute` escalates if it exceeds 3 tasks, ~90 production LOC, or 2 review rounds.
