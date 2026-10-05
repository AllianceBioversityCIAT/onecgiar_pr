# Bell Quick Inbox — Design

## Document Control

| Field | Value |
|---|---|
| Spec | `notifications/bell-quick-inbox` |
| Requirements | `requirements.md` (`BELL-R-1`..`R-14`) |
| Depth | Standard |
| Approval Mode | gated |
| Status | approved (Santiago Sanchez, 2026-10-05) |
| Date | 2026-10-05 |
| Research | Explore scout, 2026-10-05 (findings cited inline as file:line) |
| Proposal alignment | Option A kept (client-only, reuse decision PATCH, hand-off for rich steps). **One deviation:** the bell gets its **own phase-agnostic pending state** instead of reading the inbox's pending sets — those are phase-filtered (`BELL-DD-1`). |

## 1. Summary

The client-only redesign of the bell:
- **Data.** `ResultsNotificationsService` gains a bell-owned, phase-agnostic snapshot of pending received requests and unread updates. It is fetched from the two endpoints the inbox already uses, with no `version_id`.
- **Badge.** The count is a computed signal over that snapshot.
- **Popover.** It renders the snapshot sorted and capped, and stops consuming it on close.
- **Decisions.** Rows offer Accept/Decline:
  - One-click paths PATCH directly through a decision helper shared with `notification-item`.
  - Rich paths hand off to the inbox through a new `request`/`action` deep link. That link makes the matching `notification-item` row run its existing handler.

The main trade-off is one extra pending fetch per source, to get a count that does not depend on the inbox's filters.

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| `BELL-P-1` | `GET request/get/received?scope=pending` without `version_id` returns pending rows of **all** phases, unpaginated | `share-result-request.service.ts:519-522, 619-620, 909-919` | Scout quoted: phase condition only added when `versionId !== undefined`; pending fetched with no `take` | verified | Count would be phase-scoped; need a server change (new spec) |
| `BELL-P-2` | `GET notification/updates?scope=pending` without `version_id` returns all unread (`read:false`) updates incl. AI-job and Center-notice rows, unpaginated | `notification.service.ts:733-737, 772-849` | Scout quoted the `version_id` spread and the three `read:false` queries without `take` | verified | Same as P-1 |
| `BELL-P-3` | The inbox's own pending sets are phase-filtered (default = active reporting phase) | `results-notifications.service.ts:618-625`, `results-api.service.ts:797` | Scout: `getAllPhases` sets `phaseFilter` to active phase; `version_id` sent when truthy | verified | `BELL-DD-1` could collapse into plain selectors over the inbox sets |
| `BELL-P-4` | Decision = `PATCH request/update` (`PATCH_updateRequest(body, isP25)`) with `{result_request, result_toc_result:{planned_result:null,result_toc_results:[]}, request_status_id: 2|3}` for one-click accept and non-primary decline | `notification-item.component.ts:1264-1278` | Scout quoted payload builder | verified | Shared helper must take more inputs |
| `BELL-P-5` | Row Accept/Decline eligibility = `request_status_id===1`, not Sent, not update source, and `!invalidateRequest()` (busy, `platformIsClosed`, `isQAed`, non-admin & result not in current phase & `status_id != 3`); no client-side initiative check | `notification-item.component.ts:514-528, 1222-1224`; `.html:126, 259, 280-296` | Scout quoted getters/template | verified | Bell eligibility diverges from inbox — `BELL-R-5` "same eligibility" broken |
| `BELL-P-6` | No existing deep link opens a specific request's drawer/dialog in the inbox; `openDrawer()` is per-row and only called internally | `results-notifications.component.ts:350-386`; `notification-item.component.ts:441-453, 675-695` | Scout: query params read are only `phase`, `init`, `search` | verified | Hand-off would reuse an existing link instead of `BELL-DD-4` |
| `BELL-P-7` | `header-panel` is not rendered anywhere; `shell-topbar` is the only live bell (`app.component.html:40`) | template grep | Scout: no `<app-header-panel` in any `.html`; not declared in `app.module.ts` | verified | Would need R-11 parity in a second component |
| `BELL-P-8` | Inbox row decisions end in `requestEvent` → `refreshAllNotifications()` → `refreshSource('received'/'sent'/'updates')` | `results-notifications.component.html:361-406`, `.ts:307-312`; service `:438-448` | Scout quoted bindings | verified | Bell would need its own hook on the row |
| `BELL-P-9` | Received pending rows from the inbox endpoint have the shape `pop-up-notification-item` already renders for requests (`obj_requested_by`, `obj_shared_inititiative`, `obj_owner_initiative`, `obj_result`, `is_map_to_toc`) — the old pop-up endpoint used the same `getRequest` relations | `share-result-request.service.ts` `getReceivedResultRequestPopUp` vs received path | Not verified field-by-field | **assumed** | `BELL-T-3` adds an adapter; see §13 |
| `BELL-P-10` | Request rows carry a stable id usable in a URL (`share_result_request_id` or `id`) | entity / payload | Not verified | **assumed** | `BELL-T-5` picks whichever id field the payload carries; see §13 |

## 2. Architecture Overview

### 2.1 Where this lives in the system

| Unit | Change |
|---|---|
| `results-notifications.service.ts` | **+ bell state** (`bellReceived`, `bellUpdates` signals, `bellLoading`, `bellError`), `refreshBell()`, computed `bellItems` (sorted, decisions first) and `bellCount`; **+ `decideRequest(row, isAccept)`** using the shared body helper; `refreshSource()` for `received`/`updates` and `readUpdatesNotifications` path also call `refreshBell()`. |
| `utils/request-decision.ts` (new, in `results-notifications/utils/`) | Pure: `buildDecisionBody(row, isAccept, opts)`, `isDecidable(row, ctx)` (the `invalidateRequest` predicate minus busy flags), `classifyRequest(row)` → `'one-click' | 'step' `, `declineMode(row)` → `'inline' | 'justify'`. |
| `notification-item.component.ts` | `acceptOrReject` builds its body via `buildDecisionBody` (parity by construction); `invalidateRequest()` delegates its non-busy part to `isDecidable`. **+ input `autoAction: 'accept' | 'decline' | null`** run once after init. |
| `results-notifications.component.ts/.html` | Reads `request` + `action` query params; passes `autoAction` to the matching row; clears the params after use. |
| `pop-up-notification-item` | + Accept / Decline buttons, inline confirm, busy and error state; emits `decided`/`handoff`. |
| `shell-topbar` | Reads `bellItems`/`bellCount`; renders cap + "+N more", loading, error, empty; calls `refreshBell()` on open; **removes** the clear-on-close + `last-pop-up-viewed` PATCH. |
| `app.component.ts` | Boot: `refreshBell()` replaces `get_updates_pop_up_notifications()`. |

### 2.2 Sequence

```
Boot ─► refreshBell() ─► GET received?scope=pending (no version) ┐
                       └► GET updates?scope=pending  (no version) ┴► bellReceived/bellUpdates ─► bellCount ─► badge

Open popover ─► render bellItems (cached) ─► refreshBell() in background

Accept (one-click) ─► decideRequest() ─► PATCH request/update ─► ok: drop row locally, refreshBell(), refreshSource('received') if inbox loaded
                                                             └► err: row error, count unchanged (409 → stale message + refresh)
Accept (step) / Decline (primary) ─► close popover ─► navigate inbox ?phase=<row phase>&request=<id>&action=accept|decline
                                     ─► inbox loads ─► matching row receives autoAction ─► existing onAcceptContribution()/onDeclineClick()
Decline (non-primary) ─► inline confirm ─► decideRequest(row,false)
Click update row ─► existing navigation + markAsRead ─► refreshBell()
Inbox decision ─► requestEvent ─► refreshAllNotifications ─► refreshSource(...) ─► refreshBell()
```

## 3. Data Model Changes

None. No migration. `users.last_pop_up_viewed` and `notification/updates-pop-up` stay; the bell stops using them (`BELL-R-12`).

## 4. API Surface

No new or changed endpoints. The client reuses `GET_allRequest({scope:'pending'})`, `GET_requestUpdates({scope:'pending'})`, `PATCH_updateRequest`, `PATCH_readNotification`, with `versionId` deliberately omitted for the bell. No bilateral/platform-report payload impact.

## 5. Server Workflow / Business Rules

Unchanged. Business rules stay server-side (who receives what, approval chain, 409 stale-request guard, primary decline 400 on missing justification).

## 6. Frontend Plan

### 6.1 Routes

Inbox route unchanged; it accepts two more query params: `request=<request id>`, `action=accept|decline`. Unknown/absent id → no-op (normal inbox). Params are removed (`replaceUrl`) after being consumed so a reload/back does not re-trigger.

### 6.2 Components & services

**Bell item model.** The bell keeps raw rows. Each one is tagged on the way in as `kind: 'decision' | 'update'`. Ordering and the cap are in `bellItems`:
- decisions first
- then by `requested_date` for decisions, `created_date` for updates
- newest first

The template does `slice(0, 10)`. "+N more" = `bellCount − 10`.

**Count.** `bellCount = bellReceived.length + bellUpdates.length`.
- Every received pending row counts (`request_status_id === 1` is guaranteed by the pending scope).
- Rows that are pending but not decidable right now (out of phase, QA'ed, platform closed) **still count**, exactly as the inbox lists them under "Needs your decision" (`BELL-R-11`). Their buttons render disabled, with the same tooltip the inbox uses.

**Branch routing (popover).**

| Row | Accept | Decline |
|---|---|---|
| `is_map_to_toc` true | inline PATCH | inline confirm → PATCH |
| primary (`request_type==='primary'`) | inline PATCH | hand-off → justification dialog |
| bilateral (`source_name==='W3/Bilaterals'`), not primary, not carried | hand-off → "Map to ToC?" prompt | inline confirm → PATCH |
| legacy (none of the above) | hand-off → `mapAndAccept` modal | inline confirm → PATCH |

**Inline decision lifecycle.**
- The row-local busy flag disables both buttons.
- On success: the row is removed from `bellReceived` optimistically, a success toast shows (the same `alertsFe` copy as the inbox), `refreshBell()` runs, and `refreshSource('received')` runs only if the inbox has loaded (`phaseFilter` set).
- On a 409: the existing stale-request message shows, then `refreshBell()` runs.
- On any other error: an inline error line shows, the buttons re-enable, and nothing is removed.

**Freshness.** `refreshBell()` is idempotent with a generation guard, the same pattern as `sourceGen`, so a late response cannot overwrite a newer one. The popover open handler calls it without awaiting.

**Popover states.**

| State | Condition | Shows |
|---|---|---|
| Loading | `bellLoading` and no data yet | loading |
| Error | `bellError` | an error line + "See all" (the badge keeps its last value) |
| Empty | `bellCount === 0` | empty copy |
| List | otherwise | the list |

### 6.3 Design system usage

Spartan Helm buttons (`hlmBtn` size `sm`; Accept = default/brand, Decline = outline) and the existing `pr-topbar-badge`. Row layout reuses the `inbox-revamp` row-card tokens (`bg-brand-50 text-brand-700` type pill). Badge text `99+`. Popover width stays the current `pr-topbar-panel--notif`; rows wrap text, actions on their own line. Dark mode via existing tokens.

### 6.4 Real-time / notification UX

No sockets (dormant). Freshness model: boot + popover open + after any decision/read (`BELL-R-4`). The dormant socket handler that `unshift`s into `updatesPopUpData` is left untouched (dead path).

## 7. Security & Authorization

No change: the bell reads only what the existing pending endpoints return for the token, and decides through the same PATCH with the server's guards. Client eligibility (`isDecidable`) is UX only, as today.

## 8. Performance & Capacity

- **One extra pending fetch per source.** Boot already fetched `updates` pending; the bell adds `received` pending and fetches with no phase. Both lists are unpaginated.
- **Admin cost.** Admins get every pending request globally (`BELL-OQ-1`). That list can be hundreds of rows, about the same order the inbox loads for an admin today.
- **Open stays fast.** Rendering is capped at 10 rows, and the refresh on open runs in the background.

## 9. Observability

No new logging. Errors use the existing `console.error`/toast patterns; no tokens logged (`.cursorrules`).

## 10. Testing Plan

| Area | Tests (Jest, scoped, `--maxWorkers=2`) |
|---|---|
| `request-decision.ts` | Table-driven: 4 row kinds × accept/decline → `one-click/step`, `inline/justify`; `buildDecisionBody` parity with the pre-refactor `notification-item` body; `isDecidable` cases (admin, out of phase, `status_id 3`, QA'ed, closed). |
| Service bell state | Count = both lists; no `version_id` sent; ordering + cap; generation guard; `refreshSource('received')` triggers `refreshBell`; decision success/409/error paths. |
| `pop-up-notification-item` | Buttons only on decision rows; disabled when not decidable; double click → 1 PATCH; confirm/cancel; hand-off emits with correct action; body click doesn't decide. |
| `shell-topbar` | Badge `5`, `99+`, hidden at 0, aria label; open/close keeps rows & count; open calls `refreshBell`; no `PATCH_handlePopUpViewed`; loading/error/empty states. |
| Inbox hand-off | Query params → matching row gets `autoAction`; params cleared; unknown id no-op. |
| `notification-item` | `autoAction` runs `onAcceptContribution`/`onDeclineClick` exactly once; existing specs green (body parity). |
| Manual (HITL at `/akili-validate`) | Popover visual in light/dark, 400px wrapping, hand-off opening the right prompt/dialog in the real app. |

## 11. Backwards Compatibility & Migration Plan

- Inbox behavior is unchanged except for the optional query params.
- `notification-item`'s body builder moves into a pure helper. The existing specs plus a parity test guard it.
- Rollback = revert the client commits. There is no data or API change.

## 12. Design Decisions

### BELL-DD-1 — Bell owns a phase-agnostic snapshot

- **Context.** `BELL-R-1` requires the count to be independent of inbox filters, and the inbox's pending sets are phase-filtered (`BELL-P-3`).
- **Decision.** The bell gets separate signals, fetched with `versionId` omitted (`BELL-P-1/P-2`).
- **Alternatives.**
  - Reading the inbox sets: rejected, because the count would change with the phase filter.
  - A new server count endpoint: rejected, because it adds backend scope for no extra benefit.
- **Consequences.** The same row can live in both states. Parity is kept by refreshing the bell whenever a received or updates source refreshes (`BELL-R-11`).

### BELL-DD-2 — One decision body, two callers

- **Context.** Re-implementing the PATCH body in the bell risks drift from `notification-item`.
- **Decision.** Extract `buildDecisionBody` and `isDecidable` into a pure util that both use.
- **Alternatives.**
  - Copying the body into the bell: rejected, because of drift.
  - Extracting all four branches (proposal Option B): rejected, because it is too large.
- **Consequences.** `notification-item` gets a small refactor. The parity test is mandatory.

### BELL-DD-3 — Hand-off for rich steps, never a mini-version in the popover

- **Context.** The ToC prompt/mapping (`app-cp-multiple-wps`), the legacy modal and the primary justification dialog carry business rules: P2-3187 and `PDR-T-4`.
- **Decision.** The popover only performs one-click accept and confirm-decline. Everything else navigates to the inbox and replays the row's existing handler.
- **Consequences.** Some decisions still navigate, which the user approved via OQ-2.

### BELL-DD-4 — Deep link `request` + `action` replays the row handler

- **Context.** There is no existing deep link (`BELL-P-6`), and the drawer and dialogs are per-row.
- **Decision.**
  - The inbox reads `request`/`action` and sets `autoAction` on the matching `notification-item`.
  - The row calls `onAcceptContribution()` or `onDeclineClick()` once.
  - The bell also passes `phase=<row's version id>`, so the row is inside the inbox's phase filter.
  - The params are cleared afterwards.
- **Alternatives.** A service signal: rejected, because it does not survive navigation timing and is not reload-safe.
- **Consequences.**
  - If filters hide the row (search, init), nothing happens. The bell sends no `init`/`search`, so only the stored service filters could interfere, and the hand-off resets them.

### BELL-DD-5 — Retire the "consume on close" behavior *(reversion)*

- **Context.**
  - `handleClosePopUp()` empties `updatesPopUpData` and PATCHes `last-pop-up-viewed` (`shell-topbar.component.ts:275-279`).
  - `BELL-R-2` and `BELL-R-12` remove this behavior.
- **Decision.**
  - The shell no longer calls `handleClosePopUp`/`get_updates_pop_up_notifications`.
  - The legacy service members stay (dead `header-panel` and the dormant socket still reference them). Their cleanup is a follow-up.
- **Reversion challenge ("what does removing this break?").**
  - (a) Users lose the "new since last open" signal. The user explicitly accepted this (OQ-3).
  - (b) P2-3157 AC1 ("incrementing the unread badge") still holds: a new unread update raises `bellCount`.
  - (c) The old popup's received branch was scoped to the active phase (`getReceivedResultRequestPopUp` → `$_findActivePhase`). The new count includes other phases, so counts can be larger. This is intended (`BELL-R-1`).
  - (d) `header-panel.component.ts` still compiles, because the service members are kept.
  - **Result:** no unaddressed breakage.

## Budget (tripwire for `/akili-execute`)

| Metric | Expected |
|---|---|
| Tasks | 6 |
| LOC (prod + tests) | ~650 (prod ~280, tests ~370) |
| Review rounds | 1–2 per task; `BELL-T-1` and `BELL-T-5` most likely 2 |

## 13. Open Gaps & Follow-ups

- `BELL-P-9` (assumed): verify that received-pending rows render in `pop-up-notification-item` without an adapter. This is the first step of `BELL-T-3`.
- `BELL-P-10` (assumed): confirm the request id field name. This is the first step of `BELL-T-5`.
- `BELL-OQ-1`: what admins should count. The default is "same as the inbox".
- Follow-up (not this spec): delete the dead `header-panel`, `updatesPopUpData`, `handlePopUpNotificationLastViewed`, the `updates-pop-up` endpoint and the `last_pop_up_viewed` column. `src/CLAUDE.md` §2.1 is stale about `header-panel`.
- Follow-up: the Decline button in `notification-item` lacks `[disabled]` (it relies on `globalDisabled`). This is pre-existing, so it is not fixed here; the bell's own buttons use real `disabled`.
