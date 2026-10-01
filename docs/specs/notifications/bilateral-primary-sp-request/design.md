# Bilateral Primary Science Program Request — Design

## 0. Document Control

| Field | Value |
|---|---|
| **Linked** | `requirements.md` (PSR-R-1..17), `proposal.md`, `mockup/` |
| **Depth** | Full |
| **Status** | approved (Santiago Sanchez, 2026-09-30) |
| **Date** | 2026-09-30 |
| **Reversion challenge** | run 2026-09-30 (one Explore reviewer, question "what does removing this break?"); outcomes recorded under DD-2, DD-3, DD-4, DD-9 |

---

## 1. Summary

The pending primary SP is stored as a **`share_result_request` row of a new kind (`primary`)**. The owner row (`results_by_inititiatives`, role 1) is written **only on accept**. A new server service owns the lifecycle: request, accept, decline cascade, cancel. The three creation paths call it instead of writing role 1. On accept it runs the side effects that used to happen at assignment time: the ToC seed and the contributor release. The existing `PATCH results/request/update` endpoint branches on the request kind. The client reuses `inbox-revamp`'s row and drawer with two new row variants and adds an on-hold / sent-back banner to the Project Information card.

## 1A. Premise Ledger

| # | Premise | Source | Status | If false |
|---|---|---|---|---|
| `PSR-P-1` | Pending requests reach Recipients through the Requests pipeline (`getReceivedResultRequest` / `…PopUp`), which filters on `obj_result.is_active` only, **not** on role 1 | `share-result-request.service.ts:542-588` | verified | The primary row would be invisible for ownerless results; needs its own query |
| `PSR-P-2` | `is_map_to_toc = false` routes a pending request to users of `shared_inititiative_id`; role-1 (app admin) users see every pending request | same, L572-588 | verified | Routing column must be different for primary requests |
| `PSR-P-3` | `populateInitiativeAndTocFromProgramCode` has exactly one caller (`promoteDraft`); the API ingest writes role 1 via `processToc` → `upsertResultInitiative` | reversion challenge; `bilateral.service.ts:1623`, `bilateral-ai.service.ts:804` | verified | Ingest would change behavior (out of scope) |
| `PSR-P-4` | `createResultHeader` lives in `bilateral-center.service.ts:407` (role-1 write L464-477, then `syncContributingPrograms` L479-491) | reversion challenge | verified | — |
| `PSR-P-5` | `assertSubmittable` blocks submit/AI-QA with no owner (`bilateral-center.service.ts:396-404`) | reversion challenge | verified | Must add the guard |
| `PSR-P-6` | Result notifications (`notification.service.ts:431, 617, 630, 706`) inner-join role 1, so any notification about an ownerless result is hidden | reversion challenge | verified | — (drives DD-7) |
| `PSR-P-7` | SP alignments = `clarisa_project_mappings` rows of the lead project with code, allocation > 0, status Confirmed | `bilateral-projects.service.ts:401-414` | verified | Alignment count / "other SP" wrong |
| `PSR-P-8` | Platform admin = `role_by_user` role 1 with initiative/action_area/center all null | `RoleByUser.repository.ts:20-43` | verified | Admin recipients wrong |
| `PSR-P-9` | `share_result_request.owner_initiative_id` is NOT NULL | entity | verified | — (drives DD-5 migration) |
| `PSR-P-10` | Client row Accept/Decline both call `acceptOrReject` → `PATCH {api\|v2/api}/results/request/update` with `request_status_id: 2\|3` | `notification-item.component.ts:845`, `results-api.service.ts:833` | verified | New endpoint needed |

---

## 2. Architecture Overview

### 2.1 Where it lives

| Layer | Unit | Role |
|---|---|---|
| Server | **new** `PrimaryProgramRequestService` in `api/results/share-result-request/services/` | Lifecycle: `request`, `accept`, `decline`, `cancelPending`, `releaseContributors`, `stateFor(result)` |
| Server | `ShareResultRequestService.updateResultRequestByUser(V2)` | Branches: `request_type = 'primary'` → `PrimaryProgramRequestService`; otherwise today's path |
| Server | `BilateralCenterService.createResultHeader`, `.updatePrimaryAssignment`, `.syncContributingPrograms`, `.assertSubmittable`, `.getResultInitiativeId` | Call the service; guards |
| Server | `BilateralAiService.promoteDraft` / `BilateralService.populateInitiativeAndTocFromProgramCode` | Request instead of role-1 + ToC seed |
| Server | `ResultsService._updateTocMapping` | Null-owner guard; bilateral drafts not converted here |
| Server | `NotificationService` | 3 new Center-facing types + an ownerless read path |
| Server | `RoleByUserRepository` | `getPlatformAdminUserIds()` |
| Server | `VersioningService` | Skip on-hold results |
| Client | `notification-item` (+ `notification-type.constants`, copy) | Primary / bilateral-contributor row variants; Center-notice rows |
| Client | `contribution-request-drawer` | Kind-aware header + labels |
| Client | `section-zero-dashboard` | On-hold / sent-back banner; picker enabled when sent back |
| Client | ToC section host | Disabled with a notice while there's no owner |

### 2.2 Lifecycle

| Event | Request rows | Owner (role 1) | Side effects |
|---|---|---|---|
| Create result with SP09 (AI Create / manual) | new `primary` → SP09, status 1 | none | Contributors saved as drafts, owner null (DD-5). No notification row; the request **is** the inbox item |
| Center re-picks SP12 (on hold / sent back) | pending SP09 → `is_active=false`; declined rows of the round → `is_active=false`; new `primary` → SP12 | none | — |
| Center re-picks on a result **with** an owner (swap) | new `primary` → SP12 | **SP09 stays owner** until SP12 accepts | Submit blocked while pending (DD-9) |
| SP accepts | `primary` → status 2, approved_by/date | write/reactivate role 1 for the SP; on swap, deactivate the old owner | Moved from `updatePrimaryAssignment`: role-2 cleanup, request cleanup, ToC clear (swap only), then **ToC seed** + **release contributors** + Center notice *accepted* |
| SP declines, 2 alignments, other not yet declined this round | `primary` → status 3 (kept active); new `primary` → other SP | none | Remove the other SP from contributor drafts; Center notice *moved* |
| SP declines, otherwise | `primary` → status 3 (kept active) | none (swap: the old owner stays) | Center notice *declined*; result sent back |

**Round:** the set of active `primary` rows since the Center's last pick. A pick deactivates the previous round, so "the other SP already declined this round" is a lookup among active status-3 `primary` rows.

---

## 3. Data Model

### 3.1 Entities

| Entity | Change |
|---|---|
| `ShareResultRequest` | `+ request_type` enum(`contribution`,`primary`) NOT NULL default `contribution`; `owner_initiative_id` becomes **nullable** |
| `NotificationType` catalog | `+ 3 rows`: `Primary Program Request Accepted`, `Primary Program Request Declined`, `Primary Program Request Moved` |
| (no change) | `results_by_inititiatives`, `Result` (no new result status) |

**Primary row shape:** `request_type='primary'`, `shared_inititiative_id = owner_initiative_id = requested SP`, `requester_initiative_id = null`, `is_map_to_toc = false`, `request_status_id = 1`, `requested_by = Center user`.

### 3.2 Migration
One migration: add `request_type` (default backfills every existing row as `contribution`), relax `owner_initiative_id` to NULL, insert the 3 notification types. `down` reverses all three (the `down` for NOT NULL first deletes or nulls-guards `primary` rows). `npm run migration:check` must pass.

### 3.3 CLARISA
Read-only use of `clarisa_project_mappings` (P-7). No sync change.

---

## 4. API Surface

| Endpoint | Change |
|---|---|
| `PATCH {api\|v2/api}/results/request/update` | Same DTO. Server loads the request; `primary` → `PrimaryProgramRequestService.accept/decline` with authorization `PSR-R-8`; response envelope unchanged + `request_type` |
| `GET` received/sent/pop-up requests | Rows gain `request_type`, `creating_center` {acronym, name}, and for bilateral contributor rows `owner_program_code` (primary SP code) for the sentence |
| Bilateral center result initiative/header read (`getResultInitiativeId` consumer) | Gains `primary_request`: `{ state: 'none' \| 'pending' \| 'sent_back' \| 'accepted', program_code, declined_by_codes[] }` |
| `PATCH api/bilateral/center/primary-assignment/:resultId` | Now **creates a request**; response `tocCleared` replaced by `primary_request` state (client updated in the same PR) |
| `POST center/create-header`, `POST center/ai/drafts/:id/promote` | Same contract; the response is unchanged (no primary in it today, P-4 / challenge) |

**Errors:** 403 not a Recipient; 409 request no longer pending (already decided/cancelled); 400 SP not an alignment (`PSR-R-3`, existing message). No internals leaked.

---

## 5. Server Workflow / Business Rules

1. **request(result, sp, user):** validate alignment (P-7) → cancel the active round if the Center is re-picking → insert the `primary` row. Never throws to the caller (logged); on failure the result is left sent back (`PSR-R-1` failure scenario).
2. **accept(requestId, user):** one transaction; lock the row (pessimistic write); if status ≠ 1 → 409 (idempotency, concurrency). Authorize (member of SP or platform admin). Write role 1 (swap: deactivate the old owner and run the old swap side effects from `updatePrimaryAssignment` L317-381). Seed ToC stub for the SP (moved from `populateInitiativeAndTocFromProgramCode` L4779-4797). `releaseContributors`. After commit: Center notice *accepted*.
3. **decline(requestId, user):** transaction + lock + authorize. Status 3. Count alignments. If exactly 2 and the other SP has no active declined `primary` row → `request(other)` + remove the other from contributor drafts + notice *moved*. Else → notice *declined* (sent back; swap: the old owner stays).
4. **releaseContributors(result):** for every active status-4 contribution row of the result with `shared ≠ owner`: set `owner_initiative_id`, status 1, and run today's per-request emails (`share-result-request.service.ts:310-425`). Idempotent: only status-4 rows are touched.
5. **syncContributingPrograms:** exclude the pending/owner SP; save drafts with `owner_initiative_id = owner ?? null`; **if an owner exists, call `releaseContributors` after saving** (`PSR-R-12`, "saved after accept").
6. **_updateTocMapping (review approval):** guard a null `initSubmitter`. Replace the old draft→pending `resultRequest` conversion with `releaseContributors(resultId)`: status-4 rows only, idempotent, fills the owner and sends the same emails. Rows already released are not touched (no duplicates), while API-ingest and pre-feature results, which still carry status-4 drafts, are released as before (`PSR-R-13`, amended 2026-09-30, Pivot PSR-T-6).
7. **assertSubmittable:** also blocks when any `primary` row is pending (swap case).
8. **Recipients** for the Center notices: users of the lead Center (existing `resolveLeadCenterCode` + center-user lookup used by `emitContributionDecisionNotification`, L1160-1249).

---

## 6. Frontend Plan

### 6.1 Rows (mockups)

| Variant | When | Icon | Sentence parts | Chip | Buttons |
|---|---|---|---|---|---|
| Primary request | `request_type='primary'` | flag | `{center}` · "has tagged" · **`{sp}`** · "as the primary Science Program of result" · link `{code} - {title}` | "Primary program request" (blue pill) | "Accept as primary" / "Decline" |
| Bilateral contributor request | `request_type='contribution'` and result source Bilateral | people | **`{owner sp}`** · ", as primary Science Program, has tagged" · **`{sp}`** · "as a contributing Science Program to result" · link · "on behalf of `{center}`" | "Contributor request" (violet pill) | "Accept" / "Decline" |
| Existing contribution request | everything else | unchanged | unchanged | "Contribution request" | "Accept contribution" / "Decline" |
| Center notice (3 types) | Updates rows of the new types | per `inbox-revamp` | "`{sp}` accepted to be the primary Science Program of result …" / "`{sp}` declined … Pick another primary Science Program" / "`{sp}` declined …; the request was moved to `{sp2}`" | type label | none |

- Shared parts, from `inbox-revamp`: 3-line layout (`NOTIF-T-15`), funding badge, level · type text, relative time, and the left accent bar for pending rows.
- **Tokens:** existing only. Blue pill uses the existing info/brand-blue token pair; violet pill uses `--pr-color-primary-50/-400` (as `NOTIF-T-13`). **No new tokens.**
- **Icons:** from the icon set already used in the inbox. The implementer confirms the flag and people glyphs exist in it.

### 6.2 Drawer
`decide` mode reads the kind: header sentence and Accept label per the table above. `view` mode shows the kind in the Status/metadata grid. Accept calls the same `acceptOrReject`. No ToC "Align" projection for primary requests.

### 6.3 Center side
- `section-zero-dashboard` banner reads `primary_request.state`. **pending:** "Awaiting {sp} acceptance as primary Science Program" (picker disabled). **sent back:** "Declined by {sp}. Pick another primary Science Program" (picker enabled; SPs that already declined this round are marked).
- ToC section: while there's no owner, show a notice ("Available once the primary Science Program accepts") instead of the form.
- Submit button: already disabled by the server guard; show the reason from the banner.
- States: loading uses the existing skeleton; errors use the existing toast. The 409 on a stale accept shows "This request was already answered" and refreshes the list.

### 6.4 i18n
New copy in `internationalization/contribution-request-drawer.copy.ts` (rows) and the bilateral copy file (banner).

---

## 7. Security & Authorization
Accept/decline authorized server-side: the actor must have an active `role_by_user` row on the requested SP or be a platform admin (`PSR-R-8`, AC-3). The `auth` header is unchanged. Logs carry ids only (request id, result id, SP id), with no names or emails.

## 8. Performance
One extra indexed lookup per creation. The inbox rows already join the result and initiatives; `creating_center` / `owner_program_code` come from the existing enrichment pass (`enrichBucketsOnce`), not per row. No N+1.

## 9. Observability
`Logger` lines for request/accept/decline/cancel/move/release, with ids and outcome only. Failed side effects (notice, email) are logged as warnings and never thrown.

## 10. Testing Plan

| Area | Tests |
|---|---|
| `PrimaryProgramRequestService` | table-driven decline cascade (1 / 2 / 3 alignments × other-already-declined), idempotent accept (409), concurrency (second decide after first), authorization (other SP 403, admin OK), swap (old owner kept until accept), release idempotency |
| Creation paths | createResultHeader, promoteDraft, updatePrimaryAssignment: no role-1 row + one pending `primary` row; failure path leaves the result sent back |
| Guards (regression, red before) | `_updateTocMapping` null owner; `syncContributingPrograms` null owner; `assertSubmittable` pending; versioning skip |
| Specs to update (challenge list) | `bilateral-center.service.spec.ts` (`updatePrimaryAssignment` L1832-2100, owner mocks), `bilateral-ai.service.spec.ts` L88/L1365-1379, `bilateral-center.controller.spec.ts:147-148`, approval-path specs |
| Client | `notification-item` sentence/chip/button per variant + W1/W2 regression; drawer kind labels; section-zero banner states |
| Manual | visual check vs mockups (HITL); staging end-to-end with real roles |

## 11. Backwards Compatibility & Rollout
- Existing rows: `contribution` kind, no behavior change. Results that already have an owner: untouched until the Center re-picks (then swap).
- API ingest unchanged (P-3).
- Rollback: revert the PRs; the migration `down` drops the column and types. Any `primary` rows are converted first: accepted → no-op (role 1 already written); pending → deleted, which leaves those results ownerless. The runbook says to list them before rollback.

---

## 12. Design Decisions

### `PSR-DD-1` — Pending primary lives in `share_result_request` (Option A)
Rejected B (a flagged role-1 row: every SP query must learn to exclude it) and C (a new result status that collides with the QA lifecycle). A gives "doesn't count as the SP's" by construction and reuses the Requests pipeline (P-1, P-2).

### `PSR-DD-2` — Creation paths stop writing role 1 *(reversion)*
`createResultHeader`, `promoteDraft` → `populateInitiativeAndTocFromProgramCode`, and `updatePrimaryAssignment` create a request instead.
**Challenge outcome:** removal breaks ToC read/save (`getTocState`, `saveTocMapping` 404), submit/AI-QA (`assertSubmittable`), `getResultInitiativeId` (section-zero shows nothing), contributor exclusion and owner in `syncContributingPrograms`, and ownerless notifications. **Addressed:** ToC section notice (§6.3); submit block is intended (`PSR-R-15`); `primary_request` state added to the read (§4); DD-5; DD-7. The ingest path is untouched (P-3).

### `PSR-DD-3` — ToC seed moves to accept *(reversion)*
The stub ToC row (L4779-4797) is keyed on the primary SP, so it can only be written once the SP is known and accepted. **Challenge:** the follow-up steps in `promoteDraft` (L810-842) don't read role 1, so moving it is safe.

### `PSR-DD-4` — Swap on accept for results that already have an owner *(reversion challenge finding)*
Deactivating the old owner at request time would break a working result on every item in DD-2. **Decision:** the old owner stays until the new SP accepts. `updatePrimaryAssignment`'s cleanups (L317-381) run at accept. `assertSubmittable` blocks submit while a swap is pending. The `tocCleared` response field is replaced (§4).

### `PSR-DD-5` — `owner_initiative_id` nullable for drafts
Contributor drafts saved while there's no owner keep `owner = null`; `releaseContributors` fills it. Rejected: storing the pending SP as the owner. That value goes stale on every move or cancel and would need a rewrite each time.

### `PSR-DD-6` — Branch inside the existing decide endpoint
Rejected a new endpoint. The client, the drawer and the admin visibility already use `results/request/update`; a branch on `request_type` keeps one call site. Both `V1` and `V2` handlers branch.

### `PSR-DD-7` — Center notices get an ownerless read path
The new notice types are read by a query without the role-1 condition, merged like `findBilateralAiJobFinishedNotifications` (P-6), so "declined / sent back" is visible even though the result has no owner.

### `PSR-DD-8` — Round-based "other SP" rule
Auto-move goes to the other alignment only if it has no active declined `primary` row. A Center pick starts a new round (deactivates old rows). This prevents SP09 ↔ SP12 ping-pong (`PSR-R-7` both-decline).

### `PSR-DD-9` — Review approval releases remaining drafts via `releaseContributors` *(reversion; amended 2026-09-30)*
**Challenge outcome:** at approval, `updateResultByInitiative(..., pendingIds)` deactivates role-2 rows that have no request behind them, and `resultRequest` sends the contributor emails. **Addressed:** `releaseContributors` repeats both (owner fill + emails) at accept or save, so by approval time no status-4 bilateral drafts remain, and the approval path sees the same state it sees today for released requests. A null-owner guard covers the edge.
**Amendment (2026-09-30, Pivot Record PSR-T-6, approved by the user):** the premise "no status-4 bilateral drafts remain by approval time" is false for API-ingest results (P-3: born in Pending Review with the owner already set) and for results in flight at deploy. Approval therefore calls `releaseContributors(resultId)` in place of the old conversion. Being status-4-only, it is a no-op for released rows and a release for the others. Rejected: removing the conversion (ingest and legacy regression), and keeping the old conversion for legacy results only (two code paths).

### `PSR-DD-10` — Contributor wording only for bilateral rows
W1/W2 contribution rows keep `inbox-revamp`'s wording (`NOTIF-T-12`).

---

## 13. Budget (tripwire for `/akili-execute`)

| Metric | Estimate |
|---|---|
| Tasks | 11 |
| LOC (incl. tests) | ~1,600–2,000 (server ~1,100, client ~600) |
| Review rounds | 2 for the lifecycle service and creation-path tasks; 1 for the rest |

The estimate matches Full depth. **PR split recommended:** PR 1 server (migration + lifecycle + paths + guards), PR 2 client.

## 14. Open Gaps & Follow-ups
- Rollback leaves pending results ownerless; the runbook lists them (§11).
- Visual fidelity vs mockups: HITL check only.
- Phase replication of shares joins role 1 (`share-result-request.repository.ts:31-63`), so a pending primary is not carried to the next phase. It is covered by `PSR-R-16` (skip + log); carrying it forward is a possible follow-up.
