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
  chip omitted, if the type can't be resolved — never a fabricated label). **WCT-T-5
  (`w1w2-center-tagged`, WCT-R-6/DD-5) exception:** an update-source row whose resolved type is
  `RESULT_CENTER_TAGGED` shows `NOTIFICATION_CENTER_TAGGED_COPY.chipLabel` ("CG Center tagged")
  instead of the raw type name, and `rowTypeChipColorClass` pairs it with the green
  `--pr-status-approved-bg/-fg` tokens. **WPT-T-4 (`w1w2-project-tagged`, WPT-R-6/DD-5) exception,
  same mechanism:** an update-source row whose resolved type is `RESULT_BILATERAL_PROJECT_TAGGED`
  shows `NOTIFICATION_PROJECT_TAGGED_COPY.chipLabel` ("Bilateral project tagged") paired with the
  amber `--pr-status-in-progress-bg/-fg` tokens. Every OTHER update type (not CG Center tagged, not
  Bilateral project tagged) still gets the raw type name and the violet
  `--pr-color-primary-50/-400` pair. Request-row chips are untouched — the `isUpdateSource` branch
  is checked first in both getters, before the `isPrimaryRequest` ternary. Same WCT-T-5: these
  rows' sentence also renders `lead` (the owner Science Program code) in its own `<b>`, immediately
  before `parts.prefix` — see `getResultNotificationTextParts()`'s `RESULT_CENTER_TAGGED` case in
  `notification-type.constants.ts` for where `lead` comes from.
- **WPT-T-4 (`w1w2-project-tagged`, design.md §8.2-§8.4, WPT-R-2/DD-3/DD-5): `segments` replace
  `lead`/`prefix` for the enriched/legacy-bare `RESULT_BILATERAL_PROJECT_TAGGED` shape.** The
  template checks `parts.segments` FIRST, before the `lead`/`prefix` blocks — when present, it loops
  the array instead (`<b>` only for each `emphasize: true` piece, plain text otherwise), never
  rendering `lead`/`prefix` for that row. This is the one shape that needs more than one bolded
  mid-sentence token (the owner SP code, the project code, and the Center label are each their own
  segment) — `lead` alone can only bold a single leading token. The loop is written as a single
  tight line with **no whitespace between segments or control-flow blocks**, plus an explicit
  trailing `{{ ' ' }}` right before the result-link `<a>` — Angular's default whitespace handling
  collapses a blank-line gap between block-closing `}` and the next element to nothing (verified by
  diffing rendered `innerHTML`), so without that explicit space token the sentence runs straight
  into the link (`"...to result9341"`). A composed/legacy sentence (BCT or pre-fix) or empty text
  never sets `segments` — those rows fall through to the pre-existing `lead`/`prefix` rendering,
  unchanged. See `getResultNotificationTextParts()`'s `RESULT_BILATERAL_PROJECT_TAGGED` case in
  `notification-type.constants.ts` for where `segments` comes from.
- **Status indicator (`NOTIF-R-5`, item 2 of the task):** `rowStatusLabel` — "Needs your decision" /
  "For your information" (a `statusResolved` label was removed as dead code, rework attempt 2 —
  resolved rows never reach this getter's rendering path, they show the pre-existing
  Accepted/Declined chip instead). **No longer rendered at the row level** — `NOTIF-T-12` (rework
  attempt 1) removed the `.notification_badges` status chip because it didn't match the reference
  image; the template has no status element any more. `rowStatusLabel` now feeds `chips()`'s first
  entry (`DSP-T-4`, design.md §6.2 — moved from the retired `drawerViewFields()`'s `status` field /
  `view`-mode metadata grid, which `DSP-T-4` removed outright; see the copy file's docstring and
  `../notification-detail-content/CLAUDE.md`'s "Header title, chips row, RESULT grid" section).
- **`[crdAlign]` gate:** the projected Align block now also requires
  `drawerMode() === 'decide' || drawerMode() === 'confirm-decline'`, on top of the pre-existing
  `isBilateralResult && tocInitiative` check — defense in depth, since `tocInitiative` is already
  never seeded outside `decide` mode by the rewritten `openDrawer()`.
- **DSP-T-8 rework attempt 2:** the `[crdAlign]` slot's own inner `h3`/`p` (the former
  `copy.sections.align`/`copy.align.hint`) is deleted — `notification-detail-content`'s "MAP TO YOUR
  THEORY OF CHANGE" heading (its own `CLAUDE.md`) now frames the slot alone, not on top of a second
  heading. `copy.align.hint`'s wording moved to `copy.toc.helper`, which that heading renders.
- **`drawerReviewRowsForMode()` (rework, attempt 2):** the method actually bound to the drawer's
  `[reviewRows]` input — NOT `drawerReviewTables()` directly. `drawerReviewTables()` still returns a
  single all-dash 7-field table when `tocReview` is empty (`CRD-R-4`, unchanged, still needed by
  `decide`/`confirm-decline` so the footer always has something to show). `drawerReviewRowsForMode()`
  wraps it: in `view` mode with no real `tocReview` data it returns `[]` instead, so the content
  component's own `@if (mode() !== 'view' || reviewRows().length)` guard (`NOTIF-T-4`, moved to
  `notification-detail-content` by DSP-T-3) hides the whole "Where it
  contributes" section rather than rendering a fabricated-looking dash table for every Updates row
  and every resolved/Sent request without a ToC mapping (`NOTIF-R-5`/`NOTIF-AC-7`).
- **Click-target correctness (`NOTIF-AC-2`/`NOTIF-AC-3`):** the result-title `<a>` in the resolved-row
  templates (case 2/3) did **not** call `$event.stopPropagation()` before this task — harmless while
  those rows were inert, a real bug once they became clickable. Fixed; don't remove it.

## The two flows (CRD-DD-10)
- **Popups (row buttons, unchanged since before this spec).** Decline opens the reject-confirm
  `app-pr-dialog` (`showConfirmRejectDialog`) — **except for `isPrimaryRequest`**, which opens
  `app-primary-decline-justification-dialog` (`showPrimaryDeclineDialog`) instead, via
  `onDeclineClick()` (`PDR-T-4`, see its own section below). Accept: ToC-carried → PATCH
  immediately; bilateral → the "Map to your Theory of Change?" prompt (`showTocPromptDialog`) →
  "Map it" opens the mapping step (`showTocMappingDialog`, `openTocMappingStep()`); legacy →
  `<app-share-request-modal>`. The inline `toc_review` block (P2-3085) stays below the row, always
  expanded, independent of either flow.
- **Drawer (row body click, or Enter/Space on the row itself — `openDrawer('details')`).** Its own
  inline decline confirmation (`drawerMode() === 'confirm-decline'`) — **except for
  `isPrimaryRequest`**, whose drawer Decline (`onDrawerDeclineClicked()`) closes the drawer and
  opens the same `showPrimaryDeclineDialog` instead (`PDR-T-4`) — an Align section for bilateral
  requests projected via `[crdAlign]`, and a single "Accept contribution" button
  (`onDrawerAccept()`). See `../contribution-request-drawer/CLAUDE.md`.
- **Mutual exclusion:** `openDrawer()` sets all four popup signals (incl. `showPrimaryDeclineDialog`)
  to `false`. The popup path never opens the drawer directly — the shared `acceptOrReject()`
  `finalize` only resets the drawer to closed/`'decide'` (it calls `closeDrawer()` on every PATCH,
  popup or drawer alike), it never sets `drawerOpen` to `true`.
- Both flows end at the same `acceptOrReject(isAccept, withTocMapping?, justification?)` → one
  PATCH (`justification` only for a primary decline, `PDR-T-4`).

## PDR-T-4: primary Decline asks for a justification (`notifications/primary-decline-rejects-result`)

> **SUPERSEDED for the UI by `PRA-T-2`: no primary Decline entry point is reachable any more (row button hidden, drawer `[showDecline]=false`, `?action=decline` link only consumed). `showPrimaryDeclineDialog`, `onDeclineClick()`'s primary branch and `onPrimaryDeclineConfirm()` stay as dead code (design §8.1). Kept for history.**
Both primary Decline entry points — the row button (`onDeclineClick()`) and the drawer footer
(`onDrawerDeclineClicked()`) — open `app-primary-decline-justification-dialog`
(`showPrimaryDeclineDialog`, PDR-T-3) instead of today's yes/no popups, **only** when
`isPrimaryRequest`. Every other row kind (contributor, W1/W2) is untouched byte-for-byte
(`PDR-R-2`) — both methods fall through to the pre-existing `showConfirmRejectDialog.set(true)` /
`drawerMode.set('confirm-decline')` lines.
- **Drawer closes first.** `onDrawerDeclineClicked()` calls `closeDrawer()` before opening the
  dialog, so a primary decline never stacks the dialog on top of an open drawer (design.md §8.2).
- **Confirm → `acceptOrReject(false, false, justification)`.** **BELL-T-1 (`notifications/bell-quick-inbox`):**
  the body itself — including the `justification` gate — is now built by
  `../../utils/request-decision.ts::buildDecisionBody(row, isAccept, opts)`, not inline in this
  method. It only puts `justification` on the body when `!isAccept && isPrimaryRequest(row)` —
  gated on the row kind, not merely "an `opts.justification` was passed" — so a stray caller can
  never smuggle the key into a contributor/W1W2 body. `acceptOrReject()` still owns the ToC-mapping
  override (`withTocMapping && isAccept` → `this.buildTocMappingPayload()`), since that payload reads
  this row's interactively-seeded `tocInitiative` — component state the pure util cannot see.
- **A primary decline runs its own pipe (`submitPrimaryDecline()`).** The shared
  `acceptOrReject()` pipeline's `finalize` closes the drawer and every popup unconditionally, which
  would wipe the dialog's typed text on a 400. The dedicated pipe's `finalize` instead checks
  `keepPrimaryDeclineDialogOpen` (set in the `error` handler, read after it — RxJS runs `finalize`
  after the destination's `next`/`error`) and skips the close/reset exactly on a 400, leaving
  `showPrimaryDeclineDialog` `true` and flipping `requestingReject` (the dialog's `isSaving`) back
  to `false` so the dialog's own double-click guard releases for a retry — never toggling `visible`
  itself, which would wipe the typed text (T-3's own contract). 403/409/500 behave exactly like the
  shared pipeline (close everything, 409 → `staleRequestMessage`).
- **Toast wording.** A successful primary decline shows "Request successfully declined" — the
  shared pipeline's contributor/W1W2 toast ("Request successfully rejected") is untouched.

## Drawer ownership
`notification-item` owns **all** decision state for the drawer path: `drawerOpen`, `drawerMode`,
`drawerFocusAlign`, `drawerHeadingId` (DSP-T-3, below), `tocInitiative`, `tocMappingConsumed`,
busy/blocked derivations. Neither the drawer nor the content component is anything but
presentational — they render inputs and emit outputs, make no API calls, and have `[crdAlign]`
content projected into the content component. Do not move decision logic into either one.

## DSP-T-3 (`notifications/detail-side-panel`): the drawer split into a shell + a content component
`app-contribution-request-drawer` (now a thin sheet shell — see its own `CLAUDE.md`) no longer
renders the header sentence/RESULT card/review tables/footer itself; that markup and logic moved to
`app-notification-detail-content` (own `CLAUDE.md`). This row wraps the content component in
`<ng-template #detailTpl>` and renders it inside the shell via `ngTemplateOutlet` (design.md §2.2) —
not as the shell's own body — so the SAME template instance can later be portaled to the
wide-screen `<aside>` (a later task) without touching this row's template again.
- **`drawerHeadingId`**: a per-instance id (`crd-heading-<n>`, a module-scoped counter — NOT derived
  from the notification key, so it never collides even across unrelated instances) passed to BOTH
  the content's `headingId` input (its own `h2[id]`) and the shell's `labelledBy` input, which the
  shell forwards onto `<hlm-sheet>`'s own `aria-labelledby` (attempt 2 fix: NOT `hlm-sheet-content`,
  a role-less element AT ignores — see the shell's `CLAUDE.md`) — the two must always receive the
  SAME value or the sheet panel loses its accessible name (DSP falsifier). `drawerHeadingId +
  '-desc'` is passed the same way as the shell's `describedBy` input (→ `aria-describedby`),
  matched against the content's header-sentence `p[id]`.
- **Two `closed` outputs, one handler.** The content's own ✕ button and the shell's native
  scrim/Escape/outside-click dismissal are now separate outputs on separate components — both are
  wired to `onDrawerClosedSignal()` here, so from the row's point of view nothing changed: either
  close path still reaches the same guard (see "DD-6 trap" below).
- **`[crdAlign]` projection is unchanged**: still a child of the content component in this row's
  template (not the shell), still gated the same way (`isBilateralResult && tocInitiative && mode
  in {decide, confirm-decline}`).

## DSP-T-4 (`notifications/detail-side-panel`): header restyle — `detailTitle()`, `chips()`, `resultGrid()`
Three new builders feed the content's new inputs, all read by the template in place of the retired
`drawerViewFields()`/the `view`-mode-only metadata grid (DD-6):
- **`detailTitle()`** — the panel's `h2` text. Returns `rowTypeChipLabel` (the SAME getter the row's
  own type chip reads — single source, PSR-R-11), falling back to `copy.title` when it resolves to
  `null` (an Updates row whose type can't be resolved).
- **`chips()`** — status (always present, `rowStatusLabel`), funding (`fundingWindowBadge`,
  `outlined: true`), level · type (`resultLevelTypeBadge`), date (`activityDate`, a getter: a pure
  `dd MMM yyyy` formatter over `requested_date ?? created_date` — DSP-T-9 F-2, request rows carry
  `requested_date` only — no `DatePipe`/DI). Each of the last three is omitted — never a blank chip —
  exactly like the row's own badges already do.
- **`resultGrid()`** — the RESULT card's 6 cells, always in the fixed order Reporting center → Result
  type → Primary Science Program → Contributing programs → Submitted by → Phase; a missing source
  value is `copy.dashValue`, the label is never dropped (DD-6 supersedes NOTIF-R-5/NOTIF-AC-7 for
  THIS grid only). Primary SP reads `approvalChain()`'s primary step `official_code`, falling back to
  `obj_result_by_initiatives[0]` while the chain hasn't resolved to `'ok'`; Contributing programs
  joins the chain's non-declined contributor codes with `", "` and sets `loading: true` on that one
  cell while the chain is still `'loading'` (DSP-T-2's signal, read here, not re-fetched). **Submitted
  by (DSP-T-9 Q-1, user-approved):** the chain's `submission.actor_name` when `submission.state ===
  'submitted'` — NOT the row's requester/emitter — so this cell and the APPROVAL CHAIN section never
  name different people; `dash` for `not_submitted` or a chain error; `loading: true` (same skeleton
  mechanism) while the chain is still `'loading'`.

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

## PSR-T-8: primary / bilateral contributor rows + Center notices (`bilateral-primary-sp-request`)

> **Primary-row bullets below are SUPERSEDED by `PRA-T-2` (see that section at the end): the primary row button is now "Review result", there is no primary Decline, and the chip reads "Needs your review". Kept for history.**
Two new `source:'request'` row variants, on top of the pre-existing "Contribution request"
(W1/W2 + everything else, unchanged, `PSR-DD-10`) and the 3 new Center-facing notices (plain
`Notification` rows, rendered through the existing `isUpdateSource` branch — no new template
branch needed there):
- **`isPrimaryRequest`** (`notification.request_type === 'primary'`): chip "Primary program
  request" (blue, reuses `--pr-status-submitted-bg/-fg` — no new tokens), flag icon (`pi-flag`),
  sentence "`{creatingCenterLabel}` has tagged `{responderCode}` as the primary Science Program of
  result …", row buttons "Accept as primary" / "Decline". **Bypasses ToC entirely**: `onAcceptContribution()`/
  `onDrawerAccept()` both short-circuit to `acceptOrReject(true)` before the `acceptsWithoutToc`
  check, `openDrawer()` never seeds `tocInitiative` for it, and the drawer's `[showAlignSlot]` is
  `false` — never the "Map to your Theory of Change?" prompt, even though a primary request is
  itself a bilateral result.
- **`isBilateralContributorRequest`** (`isBilateralResult && !isPrimaryRequest` — this REPLACES the
  old pre-spec generic "any bilateral row" branch outright, there is no third un-kinded bilateral
  row any more): chip "Contributor request" (violet, same `--pr-color-primary-50/-400` pair as
  before), people icon (`pi-users`), sentence "`{ownerProgramCode}`, as primary Science Program,
  has tagged `{responderCode}` as a contributing Science Program to result … on behalf of
  `{creatingCenterLabel}`", plain "Accept" / "Decline" buttons. Still goes through the ordinary
  `acceptsWithoutToc` (prompt → optional mapping) flow, unchanged.
- **`creatingCenterLabel`** — `notification.creating_center.acronym ?? .name`, falling back to
  `copy.notificationItem.unknownCenterFallback` ("the Center") when both are missing. Never an
  empty string or "()".
- **`requestKindLabel`** — single source for the row chip AND the drawer's `view`-mode
  `requestKind` field (`drawerViewFields()`), so the two can't drift (`PSR-R-11`).
- **`drawerHeader()`** branches on `isPrimaryRequest`/`isBilateralContributorRequest` FIRST (both
  return before the old W1/W2 branch); the bilateral-contributor branch uses `leadCode`/`suffix`
  (added by the drawer's own `PSR-T-9` rework) instead of `lead`, and `requesterCode` stays `''` for
  both new kinds (never a "from X" clause). A missing `owner_program_code` falls back to
  `leadCode: undefined` + `lead: copy.notificationItem.unknownProgramFallback` ("The primary Science
  Program") — never an empty bold span and never a sentence starting with the verb's leading comma.
- **Single source, row and drawer (rework attempt 2):** the row's primary/contributor sentences
  (cases 1/2/3 in the template) are built from `@let h = drawerHeader();`, reading `h.lead/leadCode/
  verb/responderCode/tail/suffix` — the exact same object and the exact same `copy.header.*`
  strings the drawer itself renders. There is no parallel hard-coded English in the row template any
  more; changing a `copy.header.*` string changes both surfaces at once.
- **Result-link routing per kind (rework attempt 2):** a bilateral CONTRIBUTOR row's result
  identity — both the row's inline span and the drawer's `onDrawerResult()` — navigates **in-app**
  via `navigateToResult()` (unchanged pre-spec behavior, `CRD-R-3`/`CRD-DD-6`). A PRIMARY row's
  result identity — both the row's `<a>` and `onDrawerResult()` — opens `resultUrl()` in a new tab
  instead, on both surfaces: `navigateToResult()` routes through `requesterCode`, which on a primary
  row resolves to the REQUESTED SP (`is_map_to_toc:false` ⇒ `requesterCode = obj_owner_initiative`,
  which the server sets equal to the requested SP for a primary row), and that SP's bilateral-review
  queue is exactly where the result must **not** appear before it accepts (requirements.md L94).
  `onDrawerResult()`'s guard is `isBilateralResult && !isPrimaryRequest`.
  **2026-10-01 fix:** the new tab no longer lands on `resultUrl()` (Result Detail does not serve
  W3/Bilaterals results). Every row `<a>` calls `onResultLinkClick()`, and for a bilateral result
  it — like `onDrawerResult()` — goes through `NotificationNavigationService.openCenterEditorInNewTab()`
  → `/bilateral/<center>/result/<code>?phase=`. The center is `creating_center.acronym`
  ("Bioversity (Alliance)"); only without it is it looked up via `get/centers/:resultId`, whose
  `acronym` is the INSTITUTION acronym ("Bioversity") — the bilateral route does not recognise
  that one and lands on an empty `/bilateral/Bioversity/home`. On failure → Result Detail. The `href` stays `resultUrl()` for middle-click and the context menu.
- **Center notices** (`Primary Program Request Accepted/Declined/Moved`, in
  `notification-type.constants.ts`): render as ONE composed sentence via the existing
  `isUpdateSource` branch/`updateTextParts` — never "The result" + suffix (that produced the
  garbled, two-subject sentence `PSR-T-7`'s review failed attempt 1 for). No buttons; count under
  "For your information" (plain `needsDecision:false` from `buildUnifiedList()`, unchanged).
- **Counting/classification:** no change needed to `build-unified-list.ts` — a primary row's
  `request_status_id`/`origin` already drive `needsDecision`/Received-Sent exactly like a
  contribution row, so the existing generic logic covers it.
- **Carried, T-9's 409 → information-toast branch**: `acceptOrReject()`'s error handler still shows
  `copy.notificationItem.staleRequestMessage` ("This request was already answered") on a 409,
  unconditionally for every row kind including these two new ones — nothing here special-cases it.

## BELL-T-5 (`notifications/bell-quick-inbox`): `autoAction` replays a row handler from the bell
`@Input() autoAction: 'accept' | 'decline' | null` + `@Output() autoActionConsumed`. The inbox
(`results-notifications.component`) sets it on the ONE `received` row whose `share_result_request_id`
matches `?request=` (`autoActionFor(item)`), after resetting program/search/facet filters and forcing
Received + All. The row (`ngOnInit` + `ngOnChanges`) runs `onAcceptContribution()` / `onDeclineClick()`
**once per hand-off** (`autoActionRan`, re-armed by `ngOnChanges` when the input goes falsy, i.e. after the inbox cleared it - so a second hand-off for the same surviving row replays; re-setting the input without clearing stays one run), only while `isPending`, then emits `autoActionConsumed` on a
microtask (emitting synchronously would let the parent clear its binding mid-CD pass: NG0100). The inbox
then clears `request`/`action` with `replaceUrl`. A no-longer-pending row opens nothing but still consumes.
Phase for the URL comes from `obj_result.obj_version.id` (the server select has no `obj_result.version_id`),
built by `../../utils/request-decision.ts::bellHandoffUrl`. jsdom proves wiring only; the real
dialog/modal after a route transition is BELL-T-6's manual pass.

## BELL-T-7 (amendment 2026-10-06): a deep link NEVER records a decision
`runAutoAction()` is gated, because a crafted/shared `?request=N&action=accept` must not PATCH anything:
- **accept** replays `onAcceptContribution()` only when `classifyAccept(row) === 'step'` (bilateral
  step -> "Map to your Theory of Change?" prompt; legacy modal-first -> `<app-share-request-modal>`;
  both only OPEN a step, the PATCH needs the user's own click). A `'one-click'` row (ToC-carried or
  primary) calls `acceptOrReject(true)` straight away, so it is NOT replayed: the param is only consumed.
- **decline** replays `onDeclineClick()` for every pending row: it only ever opens
  `showPrimaryDeclineDialog` (primary) or `showConfirmRejectDialog` (all others), never a PATCH.
- Anything else only emits `autoActionConsumed` (same microtask). Do not widen the accept gate:
  `classifyAccept` mirrors `onAcceptContribution()`'s first `if` exactly.

### BELL-T-9 (amendment 2026-10-06): ToC-carried contributions open the review step
The bell now hands off EVERY contribution's Accept (`bellAcceptMode`, only primary is one-click there),
so the replay has a third branch: `action='accept'` on a pending row with `is_map_to_toc` and not
primary -> `openDrawer('details')`. That drawer shows the carried mapping (`tocReview`) and its own
Accept (`onDrawerAccept` -> `acceptOrReject(true)`) is the user's click; opening only does a GET
(approval chain). `openTocMappingModal()` was NOT used: it seeds an EMPTY mapping for the legacy
flow, does not hydrate the carried one. Primary -> consume only. `classifyAccept` is unchanged.

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
  the standalone `ContributionRequestDrawerComponent` (DSP-T-3: now a thin shell) AND
  `NotificationDetailContentComponent` (DSP-T-3: the extracted body/footer), plus
  `PrimaryDeclineJustificationDialogComponent` and keeps `PrDialogComponent` (CRD-T-7 restored it).
- Inputs: `notification`, `isSent`, `autoAction` (BELL-T-5, below). Outputs: `autoActionConsumed`, `requestEvent` — emitted in `finalize`, **after** the
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
  closed phase 34 — needs an admin account or an open-phase request. **BELL-T-1:** the eligibility
  predicate itself (phase/admin/QA/platform-closed check) now lives in
  `../../utils/request-decision.ts::isDecidable(row, ctx)` — `invalidateRequest()` is just
  `requestingAccept || requestingReject || !isDecidable(this.notification, { isAdmin, platformIsClosed,
  currentPhaseId, ipsrCurrentPhaseId })`. The busy flags (`requestingAccept`/`requestingReject`) stay
  component-local; everything else about this trap (prtest phase 34, needs admin/open-phase) is
  unchanged.
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

## SACN-T-4: approve row gets a check icon, Approved + Rejected share "Decision update" chip (`sp-approval-center-notice`)
- **Avatar:** a NEW `isApprovedDecisionUpdateRow` getter (`resolveNotificationType(...) ===
  NotificationType.BILATERAL_RESULT_APPROVED`) adds a third branch to the Updates-row avatar box,
  between `aiJob` and the initials fallback — `<i class="pi pi-check-circle">` for Approved only.
  Rejected rows fall through to the pre-existing initials branch unchanged (SACN-R-6 "Rejected row
  chip" scenario: chip changes, icon doesn't).
- **Chip:** `rowTypeChipLabel` gains a third override (same `isUpdateSource` branch as the WCT/WPT
  overrides above), checked AFTER those two: `isBilateralReviewNotification(this.notification)`
  (from `notification-type.constants.ts`, already existed — true for Approved OR Rejected) →
  `BILATERAL_DECISION_NOTICE_COPY.chipLabel` ("Decision update", reused from
  `internationalization/bilateral-decision-notice.copy.ts` — not redeclared, per SACN-T-3's forward
  pointer). Applies to BOTH Approved and Rejected rows, and to legacy rows (no new-shape `text`) —
  the chip override reads only the resolved `NotificationType`, never the sentence shape, so
  SACN-R-7 "legacy rows keep rendering" holds for the chip even though the sentence itself is
  unparsed for a legacy row.
- **Color class — explicit neutral surface-sunken pair (rework attempt 3, design.md §8.3 AMENDED
  2026-10-02, Pivot):** attempt 1 left `rowTypeChipColorClass` unbranched for Approved/Rejected, so
  they fell into the violet `--pr-color-primary-50/-400` fallback every other unlisted update type
  gets (Reviewer finding 1: chip rendered violet, not grey). Attempt 2 fixed that by returning `''`
  — no `!important` override, so the badge's own `bg-secondary text-secondary-foreground`
  (hlm-badge.ts) would win. But in this app's theme bridge `--secondary` resolves to
  `--pr-color-primary-25` (#faf9fe, near-white), which does not read grey — design.md §8.3 was
  amended to drop the "let `--secondary` show through" approach and instead specify an explicit
  neutral pair. Fix (attempt 3): `isUpdateSource` branch's `isBilateralReviewNotification(...)`
  check (Approved OR Rejected) now returns `'!bg-[var(--pr-surface-sunken)]
  !text-[var(--pr-text)]'` — same literal-arbitrary-value pattern the WCT/WPT pairs above already
  use, pointed at `--pr-surface-sunken` (#f3f2f7, `colors.scss` L273) / `--pr-text` (dark ink). The
  global `--secondary` mapping in `styles.scss` is NOT touched. Funding chip, meta line
  (`<level> · <type> · <time ago>`), and result-link styling are still untouched (SACN-DD-5).
  Regression: `rowTypeChipColorClass (SACN-T-4 rework attempt 3, design.md §8.3 amendment)` asserts
  Approved/Rejected return the exact `!bg-[var(--pr-surface-sunken)] !text-[var(--pr-text)]` string
  (not `--pr-color-primary-50`, not `''`) while WCT/WPT keep their own distinct pairs — the spec
  checks the CLASS CHOICE only; it matches the design.md §8.3 class contract, but the actual visual
  match to the mockup is still the HITL manual check, not something a unit test can verify.
- **Drawer `requestKind` is unaffected** — it was already `null` for every `isUpdateSource` row
  before this task (see the retired `drawerViewFields()`'s own comment, since replaced by
  `detailTitle()`/`DSP-T-4`), so neither chip override feeds it; the panel shows no separate "type"
  field at all for Updates rows, Approved/Rejected included — only whatever `detailTitle()` resolves.

## DSP-T-7: routing to the panel service, lifecycle, focus
`notificationKey` (a getter, not the component instance) is the panel's key — `${notification.origin}-${share_result_request_id ?? notification_id}`, byte-identical to the page's own `trackNotificationKey()`. `openDrawer()` builds `TemplatePortal(detailTemplateRef(), vcr)` and calls `panel.open(key, portal, drawerHeadingId)` AFTER `drawerOpen.set(true)`. An `activeKey` effect resets THIS row (`resetForTakeover()`, never `closeDrawer()` — no focus move, no `panel.close()`) when another row takes over while open. `closeDrawer()` is the single seam (`finalize`, ✕/Escape, NOTIF-R-11 toggle all already flow through it) — it now also calls `panel.close(key)` and, **only when `drawerOpen()` was still `true` on entry** (never for a popup-path call where nothing was open, `CRD-DD-10`/DSP-R-13 scope), focuses `#rowInteractive`. `ngOnDestroy` calls `panel.close(key)` (no-op unless still active). The drawer's `[open]` is `drawerOpen() && !panel.isWide()` so the aside/drawer can never both show; the SHELL's own `(closed)` (narrow dismissal + the real `BrnDialog`'s post-exit-animation event) goes through `onDrawerShellClosedSignal()`, which no-ops when `panel.isWide()` is true at arrival (a resize-driven container swap, not a user close) — the content's own ✕ `(closed)` stays wired straight to `onDrawerClosedSignal()`/`closeDrawer()` unconditionally, so the docked ✕ still closes. Docked-open heading focus goes through `afterNextRender` (content `h2[id]` now has `tabindex="-1"`, `notification-detail-content`). Escape inside the aside calls `panel.requestClose()` (page template); the row's own `closedByUser$` subscription is what actually closes, via `closeDrawer()`.

## DSP-T-5 rework attempt 2: `[chain]` narrows via `@let`, not a second `approvalChain()` call
`[chain]` reads a `@let chainState` local; a second `approvalChain()` call is not narrowed under
`strictTemplates`, and only `ngc` catches it (see `src/CLAUDE.md` §21.7).

## BRS-T-7: opening the drawer marks a received pending request seen
`openDrawer()` calls `ResultsNotificationsService.markRequestSeen(this.notification)` (fire-and-forget,
never blocks, never rejects) only when `isPending` (status 1 AND `!isSent`). Sent rows and done rows do
nothing. All entry points (row click, ToC step, `runAutoAction()` ToC accept) go through `openDrawer()`,
so the gate lives there. The inbox page's "Mark all as read" is the page's job (`onMarkAllRead()` ->
`markAllBellRead()`, shown on `bellCount() > 0`), not this row's.

**Verified:** 2026-10-06 · qa-development-2026-ss · BRS-T-7 (`notifications/bell-read-state`): `openDrawer()` marks a received pending request seen via `markRequestSeen`. Prior: BELL-T-11 (`drawerAcceptLabel()` now delegates to `acceptLabelFor(row)` in `utils/request-decision.ts`, the single source shared with the bell card; it returns the explicit string ("Accept contribution" for the old `null` case), and the row template no longer needs its `?? 'Accept contribution'` fallback). Prior: BELL-T-9 (`runAutoAction()` opens the detail drawer for a ToC-carried accept, 0 PATCH; see BELL-T-9 section). Prior: BELL-T-5 attempt 2 (BELL-T-6 D-1): `ngOnChanges` re-arms `autoActionRan` when `autoAction` becomes falsy (re-hand-off on the same instance); the inbox now also reacts to same-route `queryParamMap` changes. Prior: BELL-T-7 (`notifications/bell-quick-inbox`): `runAutoAction()` gated so a link never PATCHes (see the BELL-T-7 section above); no other handler changed.

**Prior verification:** 2026-10-06 · qa-development-2026-ss · BELL-T-5 (`notifications/bell-quick-inbox`): added `autoAction`/`autoActionConsumed` (see the new BELL-T-5 section above); no change to any existing handler. Supersedes nothing below.

**Prior verification:** 2026-10-06 · qa-development-2026-ss · BELL-T-1 attempt 2 (`notifications/bell-quick-inbox`,
Reviewer FAIL — folder `CLAUDE.md` not updated): body construction and the primary-decline
`justification` gate moved from `acceptOrReject()` into `../../utils/request-decision.ts::buildDecisionBody()`;
the `invalidateRequest()` eligibility predicate moved into `isDecidable()` in that same file — see the
amended bullets under "PDR-T-4" and "Traps" above. `classifyAccept()`, `declineMode()` and `isP25()`
(also in that util) are not yet consumed here — they exist for the bell (`BELL-T-2`/`BELL-T-3`) and
are covered by `../../utils/request-decision.spec.ts`'s own table-driven parity spec, not by this
component's spec. No behavior change: `acceptOrReject`/`invalidateRequest`/`submitPrimaryDecline`/
`onAcceptContribution`/`onDrawerAccept` are unchanged in outcome, every existing spec in this folder
and `../contribution-request-drawer/` stayed green and unmodified. Supersedes nothing below — it only
adds these two bullets and this stamp.

**Verified:** 2026-10-05 · qa-development-2026-ss · DSP-T-9 fix round (`notifications/detail-side-panel`,
HITL browser pass + user decisions): `activityDate` now reads `requested_date ?? created_date` (F-2,
request rows carry `requested_date` only); `resultGrid()`'s "Submitted by" now reads the chain's
`submission.actor_name` instead of the row's requester/emitter (Q-1, see the `resultGrid()` bullet
above); `chips()` marks only status/funding `pill: true` (Q-2, rendering decided in
`notification-detail-content`). **`copy.toc.helper` reverts to the mockup's literal wording** (Q-4,
user decision overriding the DSP-T-8 stamp below's "accurate wording" choice — that stamp's
reasoning still stands as background, the user chose the mockup copy anyway). Supersedes nothing
below except the `toc.helper` string; every other fact in the DSP-T-8 stamp still holds.

**Verified:** 2026-10-05 · qa-development-2026-ss · DSP-T-8 rework attempt 2 (`notifications/detail-side-panel`,
Reviewer FAIL): deleted the `[crdAlign]` slot's own inner `h3`/`p` (`copy.sections.align`/
`copy.align.hint`) — see the new bullet under "`[crdAlign]` gate" above. `copy.toc.helper` (rendered
by `notification-detail-content`'s own heading) carries the accurate wording forward; `sections.align`
and `align.hint` are removed from the copy file (no other reference existed). Supersedes nothing
below — it only fixes the stacked-heading regression attempt 1 introduced.

**Verified:** 2026-10-05 · qa-development-2026-ss · DSP-T-7 (`notifications/detail-side-panel`): routed
to `NotificationDetailPanelService` (open/close/destroy/takeover/focus) — see the new section above.
Supersedes nothing below.

**Verified:** 2026-10-05 · qa-development-2026-ss · DSP-T-5 rework attempt 2 (`notifications/detail-side-panel`):
`[chain]` binding fixed to type-check under `ngc` (see the section above); `notification-detail-content`'s
chain step also split `name` into `code`/`name` so only the program code renders `font-mono` (design.md
§6.3 "Chain step") — see that component's own `CLAUDE.md` for the `ChainDisplayStep` contract.
Supersedes nothing below — it only fixes the `[chain]` binding attempt 1 left broken and documents it.

**Verified:** 2026-10-05 · qa-development-2026-ss · DSP-T-4 (`notifications/detail-side-panel`):
`drawerViewFields()` removed outright; `detailTitle()`/`chips()`/`resultGrid()` added (see the new
"DSP-T-4" section above) and wired into `notification-detail-content`'s `title`/`chips`/`resultGrid`
inputs. `rowTypeChipLabel`/`rowStatusLabel`/`fundingWindowBadge`/`resultLevelTypeBadge` are reused,
not reimplemented. Supersedes nothing below — it only retires `drawerViewFields()` and the pointers
to it, fixed in place above.

**Verified:** 2026-10-05 · qa-development-2026-ss · cb27be98b · DSP-T-3 attempt 2 (`notifications/detail-side-panel`):
the drawer split into a shell + `notification-detail-content` (see the "DSP-T-3" section above) —
this stamp closes the Reviewer's attempt-1 advisory that the re-stamp and 3 stale pointers (the
`viewMetadataRows` location, the `drawerReviewRowsForMode()` mode guard, the module-imports
contract line) were missing. All three are now fixed in place, above. `drawerHeadingId` also feeds
a second id, `drawerHeadingId + '-desc'`, passed as the shell's `describedBy` input (paired with the
content's header-sentence `p[id]`) — the accessible-DESCRIPTION counterpart to `labelledBy`, same
one-id-per-row contract. Supersedes nothing below — it only adds this stamp and fixes the 3
pointers; every prior stamp still stands for what it describes.

**Verified:** 2026-10-02 · qa-development-2026-ss · SACN-T-4 rework attempt 3 (post-Pivot): Approved/
Rejected chips return the neutral pair `!bg-[var(--pr-surface-sunken)] !text-[var(--pr-text)]`
(amended design §8.3) instead of the violet fallback — class contract met; visual match pending
HITL. Supersedes attempt 1's stamp below only for the color bullet; check-icon/chip-label/avatar
behavior unchanged.

**Prior verification:** 2026-10-02 · qa-development-2026-ss · SACN-T-4 (`sp-approval-center-notice`):
approve row check icon + "Decision update" chip (Approved + Rejected) — see the section above.

**Verified:** 2026-10-01 · qa-development-2026-ss · bilateral result links → center editor (see "Result-link routing per kind"). Before that: PDR-T-4 (`notifications/primary-decline-rejects-result`):
both primary Decline entry points (row `onDeclineClick()`, drawer `onDrawerDeclineClicked()`) now
open `app-primary-decline-justification-dialog` (`showPrimaryDeclineDialog`) instead of
`showConfirmRejectDialog`/`confirm-decline`, only for `isPrimaryRequest` — see the new "PDR-T-4"
section above for the full contract (own-pipe 400 handling, drawer-closes-first, justification
gating, toast wording). Contributor and W1/W2 Decline paths are untouched byte-for-byte (`PDR-R-2`,
verified by dedicated regression tests). Supersedes nothing below — it only adds the new section and
amends "The two flows" bullets; every prior stamp still stands for what it describes.

**Prior verification:** 2026-10-01 · qa-development-2026-ss · WPT-T-4 (`w1w2-project-tagged`): the inbox
Updates row for `RESULT_BILATERAL_PROJECT_TAGGED` now loops `parts.segments` (SP09/project
code/Center label each in their own `<b>`, emitter plain) instead of `lead`/`prefix`, and carries
the `NOTIFICATION_PROJECT_TAGGED_COPY.chipLabel` ("Bilateral project tagged") chip in amber
(`--pr-status-in-progress-bg/-fg`) — see the amended "Chip taxonomy" and new "WPT-T-4" bullets
above. CG Center tagged stays green, every other Updates type stays violet, request-row chips are
unaffected. Supersedes nothing below — it only adds to the "Chip taxonomy" bullet and documents the
new sentence-rendering bullet; every prior stamp still stands for what it describes.

**Prior verification:** 2026-09-30 · qa-development-2026-ss · WCT-T-5 (`w1w2-center-tagged`, attempt 2):
an update-source `RESULT_CENTER_TAGGED` row's chip now reads `NOTIFICATION_CENTER_TAGGED_COPY.chipLabel`
("CG Center tagged") with the green `--pr-status-approved-bg/-fg` pair, instead of the raw type
name/violet pair every other update row still gets — see the "Chip taxonomy" bullet above, amended
in this same stamp. The row's sentence also renders the owner SP code as `lead`, bolded ahead of
`parts.prefix` (`getResultNotificationTextParts()`'s `RESULT_CENTER_TAGGED` case,
`notification-type.constants.ts`). Request-row chips and every other update type are unchanged.
Supersedes nothing below — it only amends the "Chip taxonomy" bullet; the PSR-T-8 stamp that
follows still stands for everything else it describes.

**Prior verification:** 2026-09-30 · qa-development-2026-ss · PSR-T-8 rework attempt 2
(`bilateral-primary-sp-request`): row sentence now single-sourced from `drawerHeader()`/
`copy.header.*` (no hard-coded English left in the row template), result-link routing fixed so the
row and the drawer agree per kind (contributor → in-app `navigateToResult()`, primary →
`resultUrl()` in a new tab, both never land a pending primary row in the requested SP's review
queue), and a missing `owner_program_code` now falls back to `unknownProgramFallback` instead of an
empty bold/leading-comma sentence — see the section above; supersedes attempt 1's stamp (which
added the primary-request / bilateral-contributor row variants and the carried PSR-T-9 drawer
contract: `acceptLabel`, `showAlignSlot`, `requestKind`, `leadCode`/`suffix`), and NOTIF-T-16's stamp
below, which still stands for the wording/chip-sizing fixes.

**Prior verification:** 2026-09-30 · qa-development-2026-ss · NOTIF-T-16 ("Declined by" wording + chip font-size/weight/gap fixes, ad-hoc user style feedback; supersedes NOTIF-T-15's stamp above which still stands, just re-stamped here)

## RRC-T-9: reason line on rejection update rows
`rejectionReasonLine` (getter) delegates to `getRejectionReasonLine()` in `notification-type.constants.ts`
for `isUpdateSource` rows only: Rejected + `has_review_entry` shows "Reason: <comment>" (2-line clamp) or the
shared fallback; legacy/other types render no line. Copy in `bilateral-rejection-notice.copy.ts`.

**Verified:** 2026-10-06 · qa-development-2026-ss · RRC-T-9 (`bilateral/rejected-result-correction`): reason line added under the update-row sentence; no other row behaviour changed.

## PRA-T-2: primary rows say "Review result", never Decline (`notifications/primary-review-not-accept`)
- `onAcceptContribution()` / `onDrawerAccept()` call `reviewPrimaryResult()` for a primary row (no more `acceptOrReject(true)` for it): the existing accept PATCH, then on success **or HTTP 409** `NotificationNavigationService.completePrimaryReview(row, notifyLater)` - status 5 navigates to `reviewRequestUrl(row)` (review drawer), anything else shows `copy.notificationItem.primaryNotifyLater` and does NOT navigate. Other errors keep the generic "Error when requesting" toast. No confirm step, no "already answered" toast.
- Decline is gone for primary: the row's Decline button is not rendered (`@if (!isPrimaryRequest)`), the drawer gets `[showDecline]="!isPrimaryRequest"`, and `runAutoAction()` ignores `?action=decline` for a primary row (consumes the param only, like accept under BELL-T-7).
- Chip and `detailTitle()` read "Needs your review" (`primaryRequestChip`); the Accept label is `footer.reviewResult` via `acceptLabelFor`.
- SP code for the URL comes from `obj_shared_inititiative` on a primary row (an ownerless legacy result has no initiative yet).

**Verified:** 2026-10-07 · qa-development-2026-ss · PRA-T-2 attempt 2 (`notifications/primary-review-not-accept`): `reviewPrimaryResult()`, Decline removed for primary (row, drawer, deep link), chip "Needs your review". Supersedes the primary bullets of PSR-T-8 and PDR-T-4 above.

## Primary Pending Review: result link and CTA open the review drawer (follow-up of PRA, 2026-10-07)
- `primaryReviewUrl` (getter): for `isPrimaryRequest` with `obj_result.status_id == 5` (`primaryReviewTarget()`), `NotificationNavigationService.reviewRequestUrl(row)`; else `null` (also `null` with no SP code).
- The primary row's result `<a>` (all three status cases) uses `primaryResultHref()` as `href`; `onResultLinkClick()` and `onDrawerResult()` navigate in-app with `router.navigateByUrl(primaryReviewUrl)` when it is set, otherwise keep the center-editor-in-new-tab path. The old "a primary request is never in the requested SP's review queue" comment was stale after PRA-R-1/PRA-R-3 and was fixed.
- CTA `copy.notificationItem.validateBilateralCta` ("Click here to validate the bilateral result", `data-testid="validate-bilateral-cta"`) renders next to the link only when `primaryReviewUrl` is non-null; click goes through `onValidateCtaClick()` (in-app, modifier clicks keep the `href`). The same copy key feeds the inbox update row (`update-notification`) and the bell card (`pop-up-notification-item`) for `BILATERAL_RESULT_SUBMITTED`.

**Verified:** 2026-10-07 · qa-development-2026-ss · primary Pending Review link + validate CTA (follow-up of `notifications/primary-review-not-accept`): `primaryReviewUrl`, `primaryResultHref()`, `onValidateCtaClick()`.
