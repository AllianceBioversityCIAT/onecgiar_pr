# notification-item

**Verified:** 2026-08-27 · branch performance-refactor · 3ca36ff51

## What it is
One card in the notifications list (Notifications → Requests → Received / Sent). It shows a
contribution request and, unless `[isSent]="true"`, the **Accept contribution** / **Decline
contribution** buttons.

## Contract
- Inputs: `notification` (raw row from `GET /api/results/request/get/received|sent`), `isSent`.
- Output: `requestEvent` — the parent refetches the list. Emitted in `finalize`, i.e. **after** the
  `next` handler, and it destroys this instance (`@for … track $index`).
- The decision is recorded by `ResultsApiService.PATCH_updateRequest(body, isP25)` →
  `PATCH {api|v2/api}/results/request/update`.
- `openTocMappingModal()` **accepts nothing**: it only hydrates global state
  (`dataControlSE.currentResult`/`currentResultSignal`, `resultLevelSE`, `retrieveModalSE`,
  `resultsSE.currentResultId`, `dataControlSE.currentNotification`, `shareRequestModalSE.shareRequestBody`)
  and sets `dataControlSE.showShareRequest = true`. The modal itself lives at `app.component.html:63`,
  which is why it survives the list refresh.

## Where it is used
- `.../results-notifications/pages/requests/pages/received/received.component.html` — with buttons.
- `.../results-notifications/pages/requests/pages/sent/sent.component.html` — `[isSent]="true"`, no buttons.

## Traps (⚠️ = already broke something)
- ⚠️ **`is_map_to_toc` does NOT mean "already mapped to a ToC".** It is the request KIND, stamped at
  creation: `true` = the ToC mapping travelled WITH the request (server
  `share-result-request.service.ts:253`, from `createTocShareResult.isToc`, which only
  `share-request-modal onRequest()` ever sends); `false` = no mapping came with it. **Bilateral
  requests are always born `false`** (server `results.service.ts:4320`, `_updateContributingInitiatives`).
  Reading it as "already mapped" is the mistake that caused P2-3187.
- ⚠️ **The accept PATCH tolerates a missing ToC only by accident.** The server dereferences
  `result_toc_result.result_toc_results` in `approveRequest`/`approveRequestV2` whenever
  `is_map_to_toc` is `false`; without that field it throws a TypeError that the same method's
  `try/catch` swallows — after the status was already persisted. That is why the client sends an
  explicit inert payload (`{ planned_result: null, result_toc_results: [] }`). Do not remove it.
- ⚠️ **Do NOT reopen the modal after accepting.** It looks like the obvious way to finish AC4 of
  P2-3187 and it is a triple trap: the step would render **empty** (see the `[hidden]` trap below),
  completing it fires a **second** PATCH with `request_status_id: 2`, and answering "Yes" to the
  alignment question leaves the user **stuck** — `validateAcceptOrReject` then demands a
  `toc_result_id` that no visible control can fill. A test locks this on purpose
  (`does NOT open any follow-up step after accepting`). Built and withdrawn on 2026-08-27 after an
  adversarial review.
- ⚠️ `invalidateRequest()` is true while `requestingAccept` is true, and `finalize` runs **after**
  `next`: anything called from the `next` handler cannot go through `mapAndAccept()`.
- ⚠️ **The optional modal shows NO ToC fields for bilateral.** `share-request-modal.component.html:74`
  carries `[hidden]="isBilateralResult"` on `<app-cp-multiple-wps>` (a deliberate P2-2498 decision,
  commit `652144b4e`) and `<app-toc-initiative-out>` is gated on `!isP25()`. Bilateral requests are
  P25 → all that is left is a disabled select and the Yes/No alignment question. A requirement gap for
  AC4, not a code bug.
- ⚠️ **`invalidateRequest()` disables BOTH buttons** for non-admins when
  `obj_result.obj_version.id != reportingCurrentPhase.phaseId` and `obj_result.status_id != 3`. On
  prtest every pending bilateral request sits in the closed phase 34 → a non-admin cannot accept any of
  them. Pre-existing: QA needs a bilateral request in the open phase, or an admin account.
- ⚠️ **The endpoint version (v1/v2) comes from dirty global state, and fixing it breaks notifications.**
  `fieldsManagerSE.isP25()` reads `dataControlSE.currentResultSignal()?.portfolio`, which **nothing on
  this screen sets** (it starts as `signal({})`) — except `openTocMappingModal()`. Consequence: the
  direct accept lands on **v1** in a fresh session and on v2 if the user had already opened a P25
  result; the **decline never goes through the modal** (`html:272` calls `acceptOrReject(false)`
  directly), so it always lands on v1. And **only v1 emits the lead-centre decision notification**
  (`share-result-request.service.ts:1053`, `emitContributionDecisionNotification`; the V2 method does
  not have it). 🛑 Deriving it from the notification's portfolio was tried on 2026-08-27 and
  **reverted**: it would have routed every P25 DECLINE to v2 and silently stopped that notification
  reaching the lead centre. Whether the lead centre should receive it is a product decision (P2-3188),
  not a technical fix. Recorded in P2-3187.
- `source_name` is a **derived** field in the server's `getRequest()`
  (`source === 'Result' ? 'W1/W2' : 'W3/Bilaterals'`), not a column. If that mapping changes,
  `acceptsWithoutToc` silently falls back to the legacy flow.

## Pending / Coming soon
- **AC4 of P2-3187 is NOT built**, deliberately: where the optional ToC mapping step lives for a P25
  bilateral (the current modal has no fields). A product question — not invented here.
- Which endpoint version accept/decline should use, and whether the lead centre should get the decision
  notification (P2-3188). Today it is accidental; see the `isP25()` trap.
