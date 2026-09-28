# notification-item

## What it is
One row in the notifications list (Notifications → Requests → Received / Sent). For a pending,
non-Sent request it offers **two independent, coexisting ways to decide it** (CRD-DD-10, pivot
2026-09-25): the row's Accept/Decline buttons keep their original popup flow, and clicking the row
body opens a right-side detail drawer (`app-contribution-request-drawer`) with its own flow. They
are never visible together, and neither one is "the new one" that replaced the other.

## The two flows (CRD-DD-10)
- **Popups (row buttons, unchanged since before this spec).** Decline opens the reject-confirm
  `app-pr-dialog` (`showConfirmRejectDialog`). Accept: ToC-carried → PATCH immediately; bilateral →
  the "Map to your Theory of Change?" prompt (`showTocPromptDialog`) → "Map it" opens the mapping
  step (`showTocMappingDialog`, `openTocMappingStep()`); legacy → `<app-share-request-modal>`. The
  inline `toc_review` block (P2-3085) stays below the row, always expanded, independent of either
  flow.
- **Drawer (row body click, or Enter/Space on the row itself — `openDrawer('details')`).** Its own
  inline decline confirmation (`drawerMode() === 'confirm-decline'`), an Align section for
  bilateral requests projected via `[crdAlign]`, and a single "Accept contribution" button
  (`onDrawerAccept()`). See `../contribution-request-drawer/CLAUDE.md`.
- **Mutual exclusion:** `openDrawer()` sets all three popup signals to `false`. The popup path
  never opens the drawer directly — the shared `acceptOrReject()` `finalize` only resets the
  drawer to closed/`'decide'` (it calls `closeDrawer()` on every PATCH, popup or drawer alike), it
  never sets `drawerOpen` to `true`.
- Both flows end at the same `acceptOrReject(isAccept, withTocMapping?)` → one PATCH.

## Drawer ownership
`notification-item` owns **all** decision state for the drawer path: `drawerOpen`, `drawerMode`,
`drawerFocusAlign`, `tocInitiative`, `tocMappingConsumed`, busy/blocked derivations. The drawer
component is purely presentational — it renders inputs and emits outputs, makes no API calls, and
has `[crdAlign]` content projected into it. Do not move decision logic into the drawer component.

## DD-6 trap: close-before-refetch, twice
- **Instance reuse.** `@for … track $index` reuses this component instance across a refetch —
  after `requestEvent.emit()` the "same" row may render a **different** notification.
  `acceptOrReject()`'s `finalize` calls `closeDrawer()` **first**, before resetting the three popup
  signals or emitting `requestEvent`. Reordering `finalize` would let the drawer stay open across
  the swap and show the wrong request.
- **The late `closed` event.** The real `BrnDialog` (under `hlm-sheet`) emits `closed`
  asynchronously, after the exit animation, for a **programmatic** close too (not only ✕/scrim/
  Escape). `onDrawerClosedSignal()` guards it: a no-op once `drawerOpen()` is already `false`, so
  the late event never runs `closeDrawer()` a second time. Known gap: if the drawer is reopened
  within the exit-animation window, the earlier late `closed` can close the new drawer — checked
  in CRD-T-6. Never delete this guard to "simplify" the `(closed)` binding.

## Hydration (CRD-DD-3)
- **Popup path:** `openTocMappingStep()` calls `hydrateGlobalTocState()` on open, and never sets
  `tocHydrated`. If the user then answers the planned-result question, `onTocPlannedResultChange()`
  hydrates **again** (it only checks its own `tocHydrated` flag, popup or drawer). Harmless —
  hydration just rewrites the same global fields — but it is a real double call, not a doc slip.
- **Drawer path:** hydration is deferred to the **first** planned-result answer
  (`onTocPlannedResultChange()`); `openDrawer()` never hydrates. Viewing the drawer has no global
  side effects.

## Row interactivity (CRD-R-1)
Only a pending, non-Sent row (`isPending`) gets `role="button"`, `tabindex="0"` and the
click/keydown handlers. Every inner control (result link, bilateral link, Accept/Decline) calls
`$event.stopPropagation()`. Space uses `onRowSpaceKeydown()` (needs `preventDefault()` plus the
`isPending` guard, which an inline binding can't combine); it and the inline `(keydown.enter)`
binding only fire `openDrawer()` when `event.target === event.currentTarget`, so Enter/Space on a
focused nested control never bubbles into a second open.

## Jest caveat
`tests/mocks/spartanBrainMock.ts` doesn't host-bind `disabled` through `BrnButton` — a `[disabled]`
binding on a Helm button never reaches the native attribute in a Jest DOM query, on any Helm/Brn
button in this folder (row or drawer). Assert through the real `BrnButton`/`HlmButtonImports`, or
through the handler guard itself (e.g. `onClearTocMappingActivate()`), never `nativeElement.disabled`.

## Dormant entry mode
`openDrawer('align')` and `drawerFocusAlign` exist and are exercised only by specs — no template
call routes there today (CRD-DD-10 superseded CRD-DD-7, which would have). Don't remove it as "dead
code" without checking design.md CRD-DD-10's consequences note first.

## Contract
- `notification-item.module.ts` registers this folder's sibling filter pipes
  (`FilterNotificationBy*Pipe`, `GroupNotificationsByRecencyPipe`) — why `received-requests`/
  `sent-requests` import it even without using the component. It also imports the standalone
  `ContributionRequestDrawerComponent` and keeps `PrDialogComponent` (CRD-T-7 restored it).
- Inputs: `notification`, `isSent`. Output: `requestEvent` — emitted in `finalize`, **after** the
  `next` handler, and the refetch may rebind this instance to a different notification (see the
  DD-6 trap above).
- The decision is recorded by `ResultsApiService.PATCH_updateRequest(body, isP25Request)` →
  `PATCH {api|v2/api}/results/request/update`. The optional ToC mapping rides the SAME accept PATCH
  (`acceptOrReject(true, true)`), from either flow.
- `openTocMappingModal()` (legacy flow, from `mapAndAccept()`) **accepts nothing**: it hydrates
  global state and sets `dataControlSE.showShareRequest = true` (modal at `app.component.html:63`).

## Where it is used
- `.../requests/pages/received/received.component.html` — with buttons.
- `.../requests/pages/sent/sent.component.html` — `[isSent]="true"`, no buttons.

## Traps (⚠️ = already broke something)
- ⚠️ **`is_map_to_toc` is the request KIND, not "already mapped".** Stamped at creation; bilateral
  requests are always born `false`. Misreading it as "already mapped" caused P2-3187.
- ⚠️ **The accept PATCH tolerates a missing ToC only by accident** — the plain accept sends an
  explicit inert payload (`{ planned_result: null, result_toc_results: [] }`). Do not remove it.
- ⚠️ **Never reopen `<app-share-request-modal>` as the AC4 step**, in either flow — its ToC control
  is `[hidden]` for bilateral, and completing it fires a second `request_status_id: 2` PATCH.
- ⚠️ `invalidateRequest()` disables buttons and the drawer's footer alike for non-admins when the
  request's phase differs from the current one. On prtest every pending bilateral request sits in
  closed phase 34 — needs an admin account or an open-phase request.
- ⚠️ **Closing any popup, or the drawer, records NOTHING** (CRD-R-9). Never auto-accept on close.
- `source_name` is **derived** server-side, not a column; if that mapping changes, `acceptsWithoutToc`
  silently falls back to the legacy flow.

## Prior touch history (condensed)
- **CRD-T-7** (pivot, 2026-09-25): restored the popups/inline block from `HEAD` alongside the
  drawer — CRD-DD-10 superseded CRD-DD-7/CRD-DD-9.
- **CRD-T-1..T-4**: built the drawer and row-body open/keyboard handling.
- **NOTIF-T-10/T-9/T-7**: row restyle history (flat row, avatar shape, decision chip).

## Not verified
- CRD-P-3/P-4 (real CDK focus trap/restore, real portal projection) are gated on `CRD-T-6`'s manual
  browser pass, not this doc.

**Verified:** 2026-09-25 · qa-development-2026-ss · 485847996
