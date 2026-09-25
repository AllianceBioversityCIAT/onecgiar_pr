# notification-item

**Verified:** 2026-09-25 (`NOTIF-T-10` rework, attempt 2) · branch qa-development-2026-ss —
template/CSS only, `.ts` untouched.

- Row is ONE flat flex row (`.notification_content`): avatar/icon → text column (main sentence +,
  status 2/3 only, `.notification_content_caption` below it) → timestamp → actions (case 1) or
  decision chip (case 2/3). The border-bottom row separator and `:host(:last-child)` removal live on
  the outer `.notification` (not `.notification_content`), so the `toc_review` block stays grouped
  with its own row; `.notification` carries no border/background of its own otherwise. Card look
  lives on the GROUP container in `received-requests`/`sent-requests`, not this component.
  Accept/Decline buttons read `'Accept'`/`'Decline'` (supersedes P2-3106's longer labels); their
  `::ng-deep` overrides also hide `pr-button`'s always-rendered `.filter` div (`display:none`),
  which fixed a real off-center label bug — see the `.scss` header comment for the root cause.

## What it is
One row in the notifications list (Notifications → Requests → Received / Sent). It shows a
contribution request and, unless `[isSent]="true"`, the **Accept** / **Decline** buttons
(`NOTIF-T-10`; formerly "Accept contribution"/"Decline contribution", `P2-3106`). For bilateral
requests the Accept button opens the **optional ToC step** (P2-3187 AC4, Option A): a prompt
("Not now" / "Map it") and, behind "Map it", an in-card mapping dialog reusing
`app-cp-multiple-wps` with `forceP25` — the same composition the bilateral review drawer ships.

## Contract
- **`notification-item.module.ts` is the registration home for this folder's sibling filter pipes**
  (`FilterNotificationByPhasePipe`, `FilterNotificationByInitiativePipe`,
  `FilterNotificationBySearchPipe`, `FilterNotificationByCenterPipe`,
  `FilterNotificationByBilateralProjectPipe`) plus `GroupNotificationsByRecencyPipe` — this is why
  `received-requests`/`sent-requests` import `NotificationItemModule` even though they don't use
  the component itself, only its pipe chain.
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

## Prior touch history (condensed)
- **`NOTIF-T-9`** (defect fix, avatar): individual-requester rows show initials in a CIRCLE;
  bilateral/entity rows show an icon in a ROUNDED SQUARE (8px radius) — `.notification_avatar`
  shrank 32px → 28px per the mockup. Accept/Decline buttons got `[showBackground]="false"` +
  `::ng-deep .notification_accept_btn/.notification_decline_btn .pr_button { ... !important }`
  overrides (Accept: `--pr-color-primary-300` border/white bg; Decline: `--pr-color-accents-5`
  text) — `!important` is required because a bare `::ng-deep` rule gets NO `[_ngcontent-x]` host
  attribute under emulated encapsulation and so compiles to LOWER specificity than
  `pr-button.component.scss`'s own base rules, losing the cascade without it (confirmed against
  three existing precedents in this codebase: `section-evidence`, `rd-evidences`, `sync-button`
  component `.scss` files, all using the same `!important` pattern, never a bare `::ng-deep` alone).
  `pr-button.component.*` itself never touched.
- **`NOTIF-T-7`** (row restyle + decision chip): added the leading avatar/entity icon, `font-mono`
  result code, single-line-clamped body text, and a Helm `badge` decision chip
  (`--pr-color-green-500`/`--pr-color-red-300`, `NOTIF-DD-4`) for status 2/3 — superseded in SHAPE
  by `NOTIF-T-10` above (chip now sits at row-end, not in a side column).

## History
- **2026-09-04 (P2-3187 closure):** AC4 built as Option A (prompt + in-card mapping step, single
  PATCH); endpoint version derived from the request portfolio; server V2 gained the P2-3188
  lead-centre notification, removing the reason the deterministic fix was reverted on 2026-08-27.
- **2026-08-27:** bilateral accept stopped opening the (empty) mapping modal; inert ToC payload
  added; AC4 deliberately deferred pending the Option A/B product decision.
