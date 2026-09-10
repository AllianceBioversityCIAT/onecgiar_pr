# notification-item

**Verified:** 2026-09-04 · branch feat/p2-3484-sp-review-closure (P2-3187 AC4 built, deterministic v1/v2 routing)

## What it is
One card in the notifications list (Notifications → Requests → Received / Sent). It shows a
contribution request and, unless `[isSent]="true"`, the **Accept contribution** / **Decline
contribution** buttons. For bilateral requests the Accept button opens the **optional ToC step**
(P2-3187 AC4, Option A): a prompt ("Not now" / "Map it") and, behind "Map it", an in-card mapping
dialog reusing `app-cp-multiple-wps` with `forceP25` — the same composition the bilateral review
drawer ships.

## Contract
- Inputs: `notification` (raw row from `GET /api/results/request/get/received|sent`), `isSent`.
- Output: `requestEvent` — the parent refetches the list. Emitted in `finalize`, i.e. **after** the
  `next` handler, and it destroys this instance (`@for … track $index`).
- The decision is recorded by `ResultsApiService.PATCH_updateRequest(body, isP25)` →
  `PATCH {api|v2/api}/results/request/update`. Since 2026-09-04 `isP25` comes from
  `isP25Request` (the request's own `obj_version.obj_portfolio.acronym`), **not** from
  `FieldsManagerService.isP25()` — deterministic, safe now that the server's V2 method emits the
  lead-centre decision notification too (P2-3188 parity).
- **The optional mapping rides the SAME accept PATCH** (`acceptOrReject(true, true)` →
  `buildTocMappingPayload()`): `approveRequest`/`approveRequestV2` call
  `mapWorkPackagesToInitiative*`, which writes the contributor's `result_toc_result` rows, and
  `saveIndicatorsForPrimarySubmitter` finds those rows by `(results_id, initiative_id,
  toc_result_id)` — which is why every tab carries the CONTRIBUTOR's `initiative_id` and the
  notification's `result_id` as `results_id`. One PATCH total; no post-accept save endpoint exists
  or is needed.
- `openTocMappingModal()` (legacy non-bilateral flow) **accepts nothing**: it hydrates global state
  and sets `dataControlSE.showShareRequest = true`; the modal lives at `app.component.html:63`.
  The shared hydration now lives in `hydrateGlobalTocState()`, also used by `openTocMappingStep()`
  because `app-cp-multiple-wps` resolves the result id from `dataControlSE.currentNotification` and
  the level from `currentResultSignal`.

## Where it is used
- `.../results-notifications/pages/requests/pages/received/received.component.html` — with buttons.
- `.../results-notifications/pages/requests/pages/sent/sent.component.html` — `[isSent]="true"`, no buttons.

## Traps (⚠️ = already broke something)
- ⚠️ **`is_map_to_toc` does NOT mean "already mapped to a ToC".** It is the request KIND, stamped at
  creation: `true` = the ToC mapping travelled WITH the request (server
  `share-result-request.service.ts`, from `createTocShareResult.isToc`, which only
  `share-request-modal onRequest()` ever sends); `false` = no mapping came with it. **Bilateral
  requests are always born `false`** (server `results.service.ts`, `_updateContributingInitiatives`).
  Reading it as "already mapped" is the mistake that caused P2-3187.
- ⚠️ **The accept PATCH tolerates a missing ToC only by accident.** The server dereferences
  `result_toc_result.result_toc_results` in `approveRequest`/`approveRequestV2` whenever
  `is_map_to_toc` is `false`; without that field it throws a TypeError that the same method's
  `try/catch` swallows — after the status was already persisted. That is why the plain accept sends
  an explicit inert payload (`{ planned_result: null, result_toc_results: [] }`). Do not remove it.
- ⚠️ **Do NOT reopen `<app-share-request-modal>` as the AC4 step.** Its ToC control is `[hidden]`
  for bilateral (P2-2498), completing it fires a **second** `request_status_id: 2` PATCH, and
  answering "Yes" dead-ends on `validateAcceptOrReject`. AC4 was built as an IN-CARD dialog with a
  single PATCH precisely to avoid all three; the spec test
  `never opens the legacy share-request modal…` locks it.
- ⚠️ `invalidateRequest()` is true while `requestingAccept` is true, and `finalize` runs **after**
  `next`: anything called from the `next` handler cannot go through `mapAndAccept()`.
- ⚠️ **`invalidateRequest()` disables BOTH buttons** for non-admins when
  `obj_result.obj_version.id != reportingCurrentPhase.phaseId` and `obj_result.status_id != 3`. On
  prtest every pending bilateral request sits in the closed phase 34 → a non-admin cannot accept any
  of them. Pre-existing: QA needs a bilateral request in the open phase, or an admin account.
- ⚠️ **`isTocMappingComplete()` mirrors the review drawer's `validateIsToCCompleted`:** planned
  mappings also demand the indicator (`toc_results_indicator_id`). If the selected node has no
  indicators to offer, "Accept with mapping" stays disabled — "Skip and accept" is the deliberate
  escape hatch (AC3/AC5), so never remove it.
- ⚠️ **Closing either AC4 dialog records NOTHING** — the request stays pending on purpose. The
  accept only exists once a PATCH fires; do not "helpfully" auto-accept on close.
- `source_name` is a **derived** field in the server's `getRequest()`
  (`source === 'Result' ? 'W1/W2' : 'W3/Bilaterals'`), not a column. If that mapping changes,
  `acceptsWithoutToc` silently falls back to the legacy flow.
- The mapping dialog passes `[hidden]="true"` to `app-cp-multiple-wps` — that input only hides the
  multi-tab strip (one mapping per accept, same as the review drawer), not the form.

## History
- **2026-09-04 (P2-3187 closure):** AC4 built as Option A (prompt + in-card mapping step, single
  PATCH); endpoint version derived from the request portfolio; server V2 gained the P2-3188
  lead-centre notification, removing the reason the deterministic fix was reverted on 2026-08-27.
- **2026-08-27:** bilateral accept stopped opening the (empty) mapping modal; inert ToC payload
  added; AC4 deliberately deferred pending the Option A/B product decision.
