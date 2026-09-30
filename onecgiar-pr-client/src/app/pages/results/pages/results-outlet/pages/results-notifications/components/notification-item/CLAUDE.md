# notification-item

## What it is
One row in the notifications list (Notifications → Requests → Received / Sent). For a pending,
non-Sent request it offers **two independent, coexisting ways to decide it** (CRD-DD-10, pivot
2026-09-25): the row's Accept/Decline buttons keep their original popup flow, and clicking the row
body opens a right-side detail drawer (`app-contribution-request-drawer`) with its own flow. They
are never visible together, and neither one is "the new one" that replaced the other.

## NOTIF-T-5: every row is now clickable, not just pending ones
`rowMode` (getter) decides what a click opens: `isPending` (unchanged, CRD-DD-10) → `'decide'`;
anything else — a resolved Received row (status 2/3), any Sent row, or an `isUpdateSource` row
(`notification?.source === 'update'`, the shape `buildUnifiedList()`/NOTIF-T-1 tags) — → `'view'`.
`openDrawer(entry)` reads `rowMode`, not `entry`, to pick the real mode; `entry` only still matters
inside `'decide'` (`'align'` vs plain `'details'` vs `'confirm-decline'`). A `'view'`-mode open never
seeds `tocInitiative` (Align is `decide`/`confirm-decline`-only, see the `[crdAlign]` gate below) and
carries no footer (drawer's own `mode !== 'view'` guard, `NOTIF-T-4`, closed scope).

- **`onRowActivate()`** is the row's single click/keyboard entry point now (`onRowSpaceKeydown()`
  delegates to it): if the drawer is already open, it closes it (`NOTIF-R-11` toggle); otherwise it
  opens via `openDrawer('details')`. `role="button"`/`tabindex="0"` are unconditional now — every
  row kind is interactive.
- **Updates-shaped rows** (`isUpdateSource`) have no `request_status_id` to switch on — the template
  has a dedicated `@if (isUpdateSource) { … } @else { @switch (request_status_id) { … } }` branch,
  rendered via `getResultNotificationTextParts()`/`resolveNotificationType()` (reused, not
  reimplemented — no new labels invented, `NOTIF-DD-3`). **Updated post-`NOTIF-T-6`:** this branch is
  now live — `results-notifications.component` (the sole surviving host, see "Where it is used"
  below) feeds real `isUpdateSource` rows through the unified list's `origin: 'update'` tag.
- **Chip taxonomy (`NOTIF-R-3`/`NOTIF-DD-3`):** `rowTypeChipLabel` — `"Contribution request"` for
  every request-source row, the resolved `NotificationType` for every update-source row (`null`,
  chip omitted, if the type can't be resolved — never a fabricated label).
- **Status indicator (`NOTIF-R-5`, item 2 of the task):** `rowStatusLabel` — "Needs your decision" /
  "For your information" (a `statusResolved` label was removed as dead code, rework attempt 2 —
  resolved rows never reach this getter's rendering path, they show the pre-existing
  Accepted/Declined chip instead). **No longer rendered at the row level** — `NOTIF-T-12` (rework
  attempt 1) removed the `.notification_badges` status chip because it didn't match the reference
  image; the template has no status element any more. `rowStatusLabel` now only feeds
  `drawerViewFields()`'s `status` field, which `NOTIF-T-14` (a parallel task this same rework round)
  renders inside the drawer's `view`-mode metadata grid instead (first row, "the most important
  thing to know at a glance" — see `contribution-request-drawer.component.ts`'s
  `ContributionRequestDrawerViewFields.status` / `viewMetadataRows`). See the copy file's docstring
  (`contribution-request-drawer.copy.ts`, `notificationItem` section) for the same history.
- **`[crdAlign]` gate:** the projected Align block now also requires
  `drawerMode() === 'decide' || drawerMode() === 'confirm-decline'`, on top of the pre-existing
  `isBilateralResult && tocInitiative` check — defense in depth, since `tocInitiative` is already
  never seeded outside `decide` mode by the rewritten `openDrawer()`.
- **`drawerReviewRowsForMode()` (rework, attempt 2):** the method actually bound to the drawer's
  `[reviewRows]` input — NOT `drawerReviewTables()` directly. `drawerReviewTables()` still returns a
  single all-dash 7-field table when `tocReview` is empty (`CRD-R-4`, unchanged, still needed by
  `decide`/`confirm-decline` so the footer always has something to show). `drawerReviewRowsForMode()`
  wraps it: in `view` mode with no real `tocReview` data it returns `[]` instead, so the drawer's own
  `@if (mode() !== 'view' || reviewRows().length)` guard (`NOTIF-T-4`) hides the whole "Where it
  contributes" section rather than rendering a fabricated-looking dash table for every Updates row
  and every resolved/Sent request without a ToC mapping (`NOTIF-R-5`/`NOTIF-AC-7`).
- **Click-target correctness (`NOTIF-AC-2`/`NOTIF-AC-3`):** the result-title `<a>` in the resolved-row
  templates (case 2/3) did **not** call `$event.stopPropagation()` before this task — harmless while
  those rows were inert, a real bug once they became clickable. Fixed; don't remove it.

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
- **Instance reuse — updated post-`NOTIF-T-6`.** The retired `received-requests`/`sent-requests`
  pages tracked `@for … track $index`, which could reuse this instance across a refetch even for a
  genuinely different notification. The surviving host, `results-notifications.component.html`,
  tracks by `trackNotificationKey(item)` (`${origin}-${share_result_request_id ?? notification_id}`)
  — stable and unique per notification, so a *different* notification always gets a *new* instance.
  Instance reuse today only happens for the **same** notification re-rendering with refreshed data
  (e.g. after `requestEvent.emit()` triggers a refetch and the row's own `@Input()` updates in
  place) — the trap below is about that case, not about two different notifications colliding.
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

## Wording + chip sizing (NOTIF-T-16, 2026-09-30 — user-driven correction)
Two small style fixes from the user's reference markup:
- **Case (3) footer caption is now "Declined by X"**, not "Rejected by X" — matches the "Decline"
  button label and the "Declined" decision chip that sits right next to it in the same footer row;
  "Rejected" was the last place on the row still using the older word. Case (2)'s "Accepted by X"
  was already correct and is unchanged.
- **`.notification_type_chip`/`.notification_funding_chip` now pin `font-size: 11px` and
  `font-weight: 600`** — `hlmBadge`'s own base classes size chip text via `text-xs` (a rem-based
  Tailwind utility, 9px at this project's 12px root — see the client CLAUDE.md's "root font-size
  trap") and `font-medium` (500), both smaller/lighter than the reference. `!important` needed:
  Angular's emulated encapsulation gives the component-scoped selector an attribute-selector edge
  over the bare Tailwind utility class in most cases, but this pins it defensively rather than
  relying on load order. `.notification_meta_row`/`.notification_badges` gap widened 6px → 8px to
  match the reference's single-flex-row `gap: 8px` (the two divs stay separate — `.notification_badges`
  wraps the two chips, `.notification_date` wraps the level/type text + timestamp — only the gap
  values changed, not the DOM structure).

## Row layout: 3 stacked lines (NOTIF-T-15, 2026-09-30 — user-driven correction)
Each row is now a 2-column flex (`.notification_content`: avatar + `.notification_content_body`,
`align-items: flex-start`) where the body is itself a 3-line stack, not a row of siblings:
1. The message sentence (`<p class="notification_content_body_text...">`).
2. `.notification_meta_row` — type chip, funding badge, level/type text, and the timestamp, all
   inline WITH EACH OTHER on this one row, but the row as a whole sits BELOW line 1.
3. Either `.notification_content_actions_buttons` (pending rows) or `.notification_content_footer_row`
   (resolved rows — wraps the "Accepted/Declined by X · date" caption together with the colored
   decision chip, both previously loose siblings at the very end of the old flat row). The
   Updates-row branch has only lines 1–2 (no buttons/decision state).

Content/wording is unchanged from before this task — only the DOM nesting/CSS moved. Don't flatten
this back into one row: the earlier flat-row layout (`NOTIF-T-10`'s original design, superseded here)
was explicitly rejected by the user across two rounds of visual feedback.

## Row interactivity (CRD-R-1, extended by NOTIF-T-5)
Every row now gets `role="button"`, `tabindex="0"` and the click/keydown handlers (`isPending` used
to gate this; NOTIF-T-5 made every row kind interactive, opening in `decide` or `view` per `rowMode`
— see the NOTIF-T-5 section above). Every inner control (result link, bilateral link,
Accept/Decline) calls `$event.stopPropagation()`. Space uses `onRowSpaceKeydown()` (needs
`preventDefault()`, which an inline binding can't do); it and the inline `(keydown.enter)` binding
only fire `onRowActivate()` when `event.target === event.currentTarget`, so Enter/Space on a focused
nested control never bubbles into a second open.

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
  (`FilterNotificationBy*Pipe`, `GroupNotificationsByRecencyPipe`) — imported by
  `results-notifications.module.ts` (the sole surviving consumer post-`NOTIF-T-6`). It also imports
  the standalone `ContributionRequestDrawerComponent` and keeps `PrDialogComponent` (CRD-T-7 restored
  it).
- Inputs: `notification`, `isSent`. Output: `requestEvent` — emitted in `finalize`, **after** the
  `next` handler, and the refetch may rebind this instance to a different notification (see the
  DD-6 trap above).
- The decision is recorded by `ResultsApiService.PATCH_updateRequest(body, isP25Request)` →
  `PATCH {api|v2/api}/results/request/update`. The optional ToC mapping rides the SAME accept PATCH
  (`acceptOrReject(true, true)`), from either flow.
- `openTocMappingModal()` (legacy flow, from `mapAndAccept()`) **accepts nothing**: it hydrates
  global state and sets `dataControlSE.showShareRequest = true` (modal at `app.component.html:63`).

## Where it is used
- **Updated post-`NOTIF-T-6` (Pivot, `NOTIF-DD-6`):** the old routed `requests/pages/received/`,
  `requests/pages/sent/`, and `updates/` pages are **retired** — their list-rendering responsibility
  moved into the single surviving host below.
- `.../results-notifications/results-notifications.component.html` — the sole host now. Renders one
  `<app-notification-item>` per unified-list row (`@for … track trackNotificationKey(item)`),
  passing `[isSent]="isSentRow(item)"` computed from the row's `origin`/`needsDecision` tags
  (`NOTIF-T-1`/`T-6`) — not a per-page `[isSent]` literal like the retired pages used.

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

**Verified:** 2026-09-30 · qa-development-2026-ss · NOTIF-T-16 ("Declined by" wording + chip font-size/weight/gap fixes, ad-hoc user style feedback; supersedes NOTIF-T-15's stamp above which still stands, just re-stamped here)
