# Contribution Request Drawer — Design

> **Pivot 2026-09-25 (CRD-DD-10):** the three popups and the inline ToC block are **kept** for the row buttons. The drawer is an additional flow from the row body. Statements below that the popups "are deleted" are superseded.
>
> **Answer first:** each `notification-item` owns its own drawer. A new presentational `app-contribution-request-drawer`, built on Spartan `hlm-sheet` (right side, 720px), renders the header, Result card, "Where it contributes" and the footer. The bilateral Align section is projected into it by `notification-item`, which keeps every piece of decision state and logic it has today. Nothing server-side changes. The three popups and the inline ToC block are deleted, and their behaviour moves into drawer states.

**Status:** approved (Santiago Sanchez, 2026-09-25) · Type: Change · Approval Mode: gated · Depth: Standard

## 1. Summary

- **What:** a right-side detail drawer for pending Received contribution requests (`requirements.md` CRD-R-1..R-11).
- **Shape:** client only. One new component + one copy file, edits to `notification-item` (template, a handful of signals and methods, its spec, its `CLAUDE.md`), one line of row wiring. No API, DTO, payload or route change.
- **Main trade-off:** the drawer lives **per row** (inside `notification-item`), not once in the list. This avoids moving ~15 fields of decision state and the P2-3187 logic into a new service. The cost is that a drawer's lifetime is tied to a list instance that is reused under `track $index`. DD-6 handles that.

Links: `requirements.md` (same folder) · `docs/prd.md` US-S3 · `docs/ux-ui/design.md` (drawer-for-review rule) · `docs/trd/trd.md` Notification module, W4 · `onecgiar-pr-client/CLAUDE.md` §5 hard UI rules.

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| CRD-P-1 | `toc_contribution_review` is only populated for `is_map_to_toc` requests | `onecgiar-pr-server/src/api/results/share-result-request/share-result-request.service.ts` | ~L648-705: `if (!request?.is_map_to_toc) return request;`, no field added | `verified` | Bilateral/legacy tables would show data; CRD-R-4 still holds (renders whatever arrives) |
| CRD-P-2 | `@spartan/sheet` is generated and aliased for build and Jest | `tsconfig.json` L30, `package.json` L162 | Both aliases present; `src/app/spartan/sheet/src/lib/` has 10 files | `verified` | T-1 adds the aliases first |
| CRD-P-3 | `hlm-sheet` (a `BrnDialog` underneath) can be opened and closed from a signal, emits on close by Escape/scrim/✕, traps focus and restores it to the opener | `hlm-sheet.ts` (extends `BrnSheet`, provides `BrnDialog`) + `@spartan-ng/brain` fesm2022 source (`spartan-ng-brain-dialog.mjs`, `spartan-ng-brain-sheet.mjs`) | **jsdom half only** (CRD-T-1 spec, `contribution-request-drawer.component.spec.ts`, run against `tests/mocks/spartanBrainMock.ts`'s Sheet stubs — a mock, not the real CDK Dialog): `[state]="open() ? 'open' : 'closed'"` opens/closes the panel; the built-in ✕, the scrim (`hlm-sheet-overlay`) and Escape each emit `closed` exactly once. **Not exercised at all, mock or real**: focus trap (focus held inside the panel) and focus restore to the opener — CRD-DD-2's own disqualifier names focus restore explicitly, and no test in this task drives focus. Also not recorded until this pass: the real `closed` output also fires on *programmatic* close (`[state]` flipping to `'closed'`), asynchronously after the exit animation (`spartan-ng-brain-dialog.mjs` L349-378, `_finishClose` awaits `waitForAnimations` before calling `_cdkDialogRef.close()`) — the mock's `close()` is synchronous and only reached from ✕/scrim/Escape, so this path is untested. A source read of the real `BrnDialog`/`BrnSheet` supports that the mechanism exists (a `state` input, an `effect()`, `restoreFocus`/`autoFocus` CDK defaults) but reading source is not running it — it is not verification | `partially verified — jsdom half proven; portal / focus trap+restore assumed, gate = CRD-T-6` | Fallback in DD-2: copy the hand-rolled `bilateral-create-drawer` shell (5th copy) and add focus handling |
| CRD-P-4 | `<ng-content>` projected into the drawer component renders correctly inside the sheet's portal-rendered content | Angular content projection + `BrnSheetContent` template; `@spartan-ng/brain` fesm2022 source | **jsdom half only**: the CRD-T-1 spec projects `<div crdAlign>` into `[crdAlign]` and asserts it renders inside the drawer's scrolling body — but only queries `fixture.nativeElement`, never `document.body`, because `@spartan-ng/brain` is globally mocked under Jest (`tests/mocks/spartanBrainMock.ts`) and the mock renders content inline, not through a real `Dialog.open()`/`OverlayContainer`. **The falsifier this premise is actually named for — the projected node found in a `document.body` portal — was not exercised and cannot be, under this harness.** A source read of `BrnDialogContent`/`BrnDialogService.open()` (captures the `TemplateRef`, hands it to CDK `Dialog.open()`, attached via a `TemplatePortal`) is supporting evidence that the real mechanism should work, not a substitute for seeing it happen | `partially verified — jsdom half proven; portal / focus trap+restore assumed, gate = CRD-T-6` | Pass `tocInitiative` + callbacks as inputs and render the Align markup inside the drawer component (DD-1 alt B) |
| CRD-P-5 | The ToC widget's dropdowns (`app-cp-multiple-wps` → `pr-select`, `:focus-within` lists) are not clipped by the sheet body's `overflow-y: auto` | `custom-fields/pr-select` renders inline, not in an overlay | Not checked — CRD-T-1 does not render the Align section (CRD-T-2/T-3) | `assumed` | Give the Align block `position: relative; z-index` and enough bottom padding, as today's mapping dialog does (`z-index: 1; position: relative`) |
| CRD-P-6 | `requestEvent` is emitted in `finalize` after `next`, and the list re-renders with `track $index`, so the instance is reused for a different notification | `received-requests.component.html` L29/L45/L61; `notification-item.component.ts` L415-423 | Read both | `verified` | DD-6 would be unnecessary, but harmless |
| CRD-P-7 | Spec tests coupled to the removed popups are the P2-3187 block (L472-739, ~10 tests) and `NOTIF-T-7` "still opens showTocPromptDialog" (L854) | `notification-item.component.spec.ts` | `grep` of `it(` titles | `verified` | More rewrites in T-5 |
| CRD-P-8 | `showConfirmRejectDialog` in `result-review-drawer` is an unrelated, same-named field | `result-review-drawer.component.ts` L225 | Read | `verified` | n/a (not touched) |
| CRD-P-9 | `hlm-sheet-content` adds `w-3/4 sm:max-w-sm`, and Helm classes are concatenated, not merged. **Corrected 2026-09-25 (CRD-T-5 review):** the real base classes are `data-[side=right]:w-3/4 data-[side=right]:sm:max-w-sm`. `hlm()` runs `twMerge`, but twMerge does not dedupe across variants, and the data-attribute variant wins on specificity. So the conclusion stands: a `!` override is required | `hlm-sheet-content.ts` L42; `src/CLAUDE.md` §21.7 | Read, **and jsdom-proven** (CRD-T-1 spec): `!w-[720px] sm:!max-w-[720px] max-[639px]:!w-screen` on `hlm-sheet-content` is present in the rendered class list alongside the base `w-3/4 sm:max-w-sm` (concatenated, per the linked docs spec example: `class="w-[400px] sm:w-[540px] sm:max-w-none"` on `hlm-sheet-content` is the documented pattern for overriding the default size) | `verified` | The width override is not needed |

## 2. Architecture Overview

### 2.1 Where this lives

- **Server:** none.
- **Client:** `pages/results/pages/results-outlet/pages/results-notifications/`
  - `components/notification-item/` (edited)
  - `components/contribution-request-drawer/` (new)
  - `pages/requests/pages/received-requests/` (no change: the drawer is inside the item)
- **i18n:** `src/app/internationalization/contribution-request-drawer.copy.ts` (new).
- **Integrations:** none new. Still `ResultsApiService.PATCH_updateRequest`.

### 2.2 Primary flows

```
[Received row (pending)] --click / Enter / Space--> notification-item.openDrawer('details')
     └─ drawerOpen = true, drawerMode = 'decide', seed tocInitiative (bilateral, local only)
[Drawer]
  ├─ Result card ──> resultUrl() new tab | (bilateral) closeDrawer() → navigateToResult()
  ├─ Align (bilateral) ── first planned-result answer → hydrateGlobalTocState() → widget mounts
  ├─ Accept ──> onDrawerAccept()
  │     ├─ ToC-carried ........ acceptOrReject(true)
  │     ├─ bilateral untouched  acceptOrReject(true)          (inert payload)
  │     ├─ bilateral complete . acceptOrReject(true, true)    (mapping payload)
  │     ├─ bilateral incomplete disabled
  │     └─ legacy ............. closeDrawer() → mapAndAccept() → <app-share-request-modal>
  ├─ Decline ──> drawerMode = 'confirm-decline' ── Confirm → acceptOrReject(false) | Cancel → 'decide'
  └─ ✕ / scrim / Escape ──> closeDrawer() (records nothing)
acceptOrReject finalize: closeDrawer() → reset busy flags → requestEvent.emit() → parent refetch
[Row buttons]  (amended 2026-09-25, CRD-DD-10) unchanged from before this spec:
               Accept: ToC-carried → acceptOrReject(true) · legacy → mapAndAccept() · bilateral → openTocMappingStep() → prompt / mapping dialogs
               Decline: showConfirmRejectDialog → reject-confirm dialog
[openDrawer]   resets the three dialog signals; nothing inside the drawer sets them
```

## 3. Data Model Changes

None. No entity, migration or CLARISA change.

## 4. API Surface

None. `PATCH {api|v2/api}/results/request/update` keeps its body (`result_request`, `result_toc_result`, `request_status_id`) and its routing by `isP25Request`. `buildTocMappingPayload()` is unchanged. Bilateral/platform-report: not touched.

## 5. Server Workflow / Business Rules

Unchanged. The client-side rules moved, not altered:

| Rule | Where it stays |
|---|---|
| Inert ToC payload on plain accept/decline (P2-3187 AC3) | `acceptOrReject()`, untouched |
| Mapping rides the same accept PATCH (AC4) | `acceptOrReject(true, true)` + `buildTocMappingPayload()`, untouched |
| Completeness of a mapping | `isTocMappingComplete()`, untouched |
| Decision blocked | `invalidateRequest()`, untouched |
| Legacy modal-first flow | `mapAndAccept()` → `openTocMappingModal()`, untouched, now preceded by `closeDrawer()` |

## 6. Frontend Plan

### 6.1 Routes / modules

- No route change.
- `NotificationItemModule` imports the new standalone `ContributionRequestDrawerComponent`. It drops `PrDialogComponent` once no dialog remains in the template (T-4 checks for other usages in the module first).

### 6.2 Components & state

**`app-contribution-request-drawer`** (new, standalone, OnPush, signals, `inject()`, hard rule #22). Presentational only: no API calls, no global services.

| Input | Meaning |
|---|---|
| `open` | Whether the sheet is shown |
| `mode` | `'decide'` or `'confirm-decline'` (footer state) |
| `headerParts` | Pre-built sentence pieces: `{ lead, requesterCode, verb, responderCode?, tail, resultCode, resultTitle }` (built in `notification-item`, reusing `requesterCode`/`responderCode`) |
| `resultCode`, `resultTitle` | Result card |
| `reviewRows` | Array of tables; each table = 7 `{ label, value, mono }`. Empty review → one all-dash table. Built by a pure helper in `notification-item` from `tocReview` + `tocTypologyOf()` |
| `acceptDisabled`, `declineDisabled`, `acceptBusy`, `declineBusy` | Footer state |
| `blockedReason` | `string \| null`, shown as the footer reason line |
| `acceptHelper` | `string \| null`, "Complete the mapping or clear it…" |
| `focusAlign` | When true, scroll the projected Align slot into view after open |

| Output | Fires on |
|---|---|
| `closed` | ✕, scrim, Escape (the sheet's close signal) |
| `resultActivated` | Result card activated |
| `acceptClicked`, `declineClicked`, `declineConfirmed`, `declineCancelled` | Footer buttons |

Projection: `<ng-content select="[crdAlign]">` in the body, after "Where it contributes".

**`notification-item`** (edited). New state:

| Member | Purpose |
|---|---|
| `drawerOpen = signal(false)` | Sheet visibility |
| `drawerMode = signal<'decide' \| 'confirm-decline'>('decide')` | Footer state |
| `drawerFocusAlign = signal(false)` | Row-Accept-bilateral entry |
| `isPending` getter | `request_status_id === 1 && !isSent`: gates row interactivity |
| `isTocMappingTouched()` | `tocInitiative?.planned_result` is not null/undefined |
| `openDrawer(entry: 'details' \| 'align' \| 'confirm-decline')` | Sets mode/focus; for bilateral seeds `tocInitiative` locally (the object built by today's `openTocMappingStep()`, minus the global hydration and the dialog signals) |
| `closeDrawer()` | Hides the sheet, resets mode and focus flag, discards `tocInitiative` (CRD-R-9) |
| `onDrawerAccept()` | The decision table in §2.2 / CRD-R-6 |
| `clearTocMapping()` | Re-seeds an untouched `tocInitiative` + remount toggle |
| `drawerReviewTables()`, `drawerHeader()` | Pure builders for the drawer inputs |

Changed members:
- `onTocPlannedResultChange()`: on the first answer it calls `hydrateGlobalTocState()`, then keeps its reset/remount logic.
- `onAcceptContribution()` (row Accept): ~~the bilateral branch becomes `openDrawer('align')`~~. Superseded by CRD-DD-10: it keeps the pre-spec `openTocMappingStep()` branch.
- `acceptOrReject()` `finalize`: calls `closeDrawer()` first. ~~It drops the three dialog `set(false)` calls.~~ This is superseded by CRD-DD-10: the resets stay.

Removed members: none after the 2026-09-25 pivot (CRD-DD-10). `showConfirmRejectDialog`, `showTocPromptDialog`, `showTocMappingDialog` and `openTocMappingStep()` stay for the row popups. `openTocMappingStep()` and `openDrawer()` share `seedTocInitiative()`. Global hydration happens on open for the popup path (as before) and on the first answer for the drawer path. `onAcceptContribution()` keeps its pre-spec bilateral branch. `acceptOrReject` `finalize` runs `closeDrawer()` first and still resets the three dialog signals.

Row template (status 1 block only): the `.notification` wrapper gets `role="button"`, `tabindex="0"`, an `aria-label` with the result code, `(click)` / `(keydown.enter)` / `(keydown.space)` → `openDrawer('details')`, and `cursor-pointer`. The inner link, bilateral link and the two buttons call `$event.stopPropagation()`. Status 2/3 blocks get none of this. *(Amended 2026-09-25.)* The `toc_review` block and the three `<app-pr-dialog>` elements **stay** (CRD-DD-10).

### 6.3 Design system usage (mockup → tokens)

Primitive: `hlm-sheet` + `hlm-sheet-content` (side `right`), `hlm-sheet-header`/`footer`/`title`/`description`. The built-in close button stays (`showCloseButton`), aria label from copy. Buttons: `app-pr-button` stays in the row. The drawer footer uses Helm `hlmBtn` (`outline` for Decline/Cancel, default brand for Accept / Confirm decline). One brand button per state (hard rule #1).

Width: `hlm-sheet-content` class `!w-[720px] sm:!max-w-[720px] max-[639px]:!w-screen`, which overrides the concatenated `w-3/4 sm:max-w-sm` (CRD-P-9).

| Mockup var | Token / utility |
|---|---|
| `--surface-raised` (panel) | `bg-surface-card` (`--pr-surface-card`) |
| `--surface-2` (Result card) | `bg-surface-subtle` |
| `--border` / `--border-strong` (hover) | `border-[var(--pr-border)]` / `hover:border-[var(--pr-border-strong)]` |
| `--surface-4` (dividers, header/footer borders) | `border-[var(--pr-border-divider)]` |
| `--text` (title, result title) | `text-ink-heading` |
| `--text-2` (values) | `text-ink-body` |
| `--text-3` (labels, sentence) | `text-ink-secondary` |
| `--text-muted` (section labels, dash) | `text-ink-muted` |
| `--accent` (result code) | `text-brand-300` |

Type (px only, hard rule #20): title `text-[16px] font-bold tracking-[-0.01em]`; sentence `text-[13px] leading-[1.5]`, codes `font-mono font-semibold`; section label `text-[11px] font-semibold uppercase tracking-[0.08em]`; field label `text-[13px] font-medium`; value `text-[14px] leading-[1.5]`; buttons `text-[14px]`, height `min-h-[36px]`.

Layout: header `px-6 py-5` with bottom divider; body `flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-6` (the only scroll, hard rule #3); footer `px-6 py-4` with top divider. Field table: `grid grid-cols-[200px_minmax(0,1fr)] gap-4 px-[18px] py-3`, rows split by a divider, last row none. Under 640px the grid collapses to one column (label above value). Long values: `line-clamp-3` + inline "Show more" toggle per cell (hard rule #16). Mono + `tabular-nums` for Target / Contribution target (hard rule #13; left-aligned as in the mockup, a table-less label/value list, not a figure column).

A11y: sheet title bound as the panel's accessible name; CDK focus trap + restore (CRD-P-3); visible `--pr-focus-ring` on row, Result card, toggles and buttons; reason/helper lines tied to the buttons with `aria-describedby`; `prefers-reduced-motion` → sheet animation durations to 1ms.

i18n: `CONTRIBUTION_REQUEST_DRAWER_COPY` in the new copy file (title, section labels, the 7 field labels, Align heading/hint, Clear mapping, Accept contribution, Decline, confirmation text, Cancel, Confirm decline, helper, blocked generic text, close aria label, row aria label template, Show more/less). The QA reason reuses the existing string, moved into the copy file. Toast texts stay where they are (unchanged behaviour).

### 6.4 Real-time / notification UX

None. The Pusher/socket behaviour is untouched. The parent refetch after a decision is unchanged.

## 7. Security & Authorization

No new endpoint, no new data. Authorization is still the server's on `PATCH .../request/update` plus the client's `invalidateRequest()` gating (unchanged). No logging added (`.cursorrules`); the existing `console.error(err)` in `acceptOrReject` is left as is.

## 8. Performance & Capacity

The sheet content renders only while open (`@if`/Brn portal), so N rows cost nothing extra. The review tables are built only when the drawer opens (computed on open, not per change detection of every row).

## 9. Observability

None added. Behaviour-neutral for server metrics.

## 10. Testing Plan

- **Jest (drawer component):** renders header parts, 7 labels, dash fallback, several tables; footer states per `mode`; outputs fire; reason/helper lines. Covers D-2 (drawer side), D-8 by review.
- **Jest (notification-item):** row interactivity gating (pending vs decided vs sent); stopPropagation on inner controls; `onDrawerAccept` table (PATCH spy: count, status, payload, `isP25` arg); incomplete-mapping gating + Clear mapping; decline confirm/cancel; `closeDrawer()` called before `requestEvent` on success **and** error; legacy path closes the drawer before `showShareRequest = true`; bilateral Result card closes before `navigateToResult`; `hydrateGlobalTocState` not called on open, called on first answer. Covers D-1, D-3, D-4, D-5.
- **Rewrites:** the P2-3187 block and the L854 test are rewritten to the drawer equivalents, keeping each guarantee (AC1/AC3/AC4/AC5/AC6, portfolio routing, "never opens the legacy share-request modal", "closing records nothing", closed-platform and phase blocks).
- **Manual (HITL at `/akili-validate`, T6 visual):** D-6 layout vs the two screenshots (720px, sticky regions, one scroll, clamp, ToC dropdowns not clipped — CRD-P-5), D-7 focus trap/restore and Escape inside an open `pr-select`. Needs an admin account or an open-phase bilateral request.
- Only the touched specs run: `npx jest --testPathPattern="notification-item|contribution-request-drawer" --silent --reporters=summary --no-coverage`.

## 11. Backwards Compatibility & Migration Plan

No data or API migration. UX migration: users who knew the popups get the same steps inside the drawer. Rollback = revert the PR (no flags, no data).

## 12. Design Decisions

### CRD-DD-1: The drawer lives per row, inside `notification-item`

- **Context:** all decision state (`requestingAccept/Reject`, `tocInitiative`, `tocMappingConsumed`) and the P2-3187 logic live per row today.
- **Decision:** each `notification-item` owns one closed drawer; opening is user-driven, so at most one is open.
- **Alternatives:** (A) one drawer in `received-requests` fed by a selected notification: the state and all P2-3187 methods move to a new service. That is a large refactor of hard-won, trap-laden code. Rejected. (B) Drawer component renders the Align markup itself from `tocInitiative` inputs: kept as the fallback if CRD-P-4 fails.
- **Consequences:** coupled to instance reuse under `track $index`, handled by DD-6.

### CRD-DD-2: Spartan `hlm-sheet`, not a fifth hand-rolled shell

- **Context:** the client guide mandates Spartan for UI. Four hand-rolled drawers exist, with known debt (raw rgba, no focus trap, 24px ✕).
- **Decision:** `hlm-sheet` side right, which brings the CDK dialog focus trap, Escape and restore.
- **Alternatives:** copy `bilateral-create-drawer` (consistent with the four, but adds a fifth debt copy without a focus trap); extract `shared/pr-drawer` (out of scope).
- **Consequences:** first consumer of `@spartan/sheet` in the repo. T-1 is a spike that proves CRD-P-3/P-4/P-9 before the rest is built. **Disqualifier:** if controlled open/close or focus restore cannot be made to work, fall back to the hand-rolled shell and record it here.

### CRD-DD-3: The Align section is today's mapping, moved inline, bilateral only

- **Context:** proposal OQ-3 resolved to "keep today's flow". Only bilateral requests have the optional mapping step today; ToC-carried requests already carry it and legacy requests use the share-request modal.
- **Decision:** project the planned-result question + `app-cp-multiple-wps` (single tab, `forceP25`, contributor initiative) into the drawer for bilateral requests. The global hydration is deferred from "open" to "first answer", so just viewing a request has no global side effects.
- **Alternatives:** the mockup's single "Select an indicator" dropdown (deferred); showing Align for every kind (would invent a mapping path the server doesn't support for ToC-carried/legacy).
- **Consequences:** a deliberate deviation from the mockup, recorded in `onecgiar-pr-client/docs/DESIGN-DEVIATIONS.md` (T-4).

### CRD-DD-4: One "Accept contribution" button replaces "Not now" / "Map it" / "Skip and accept" / "Accept with mapping"

- **Context:** the mockup has one Accept button; the old flow had four buttons across two dialogs.
- **Decision:** untouched mapping → plain accept; complete → accept with mapping; touched and incomplete → disabled with helper + Clear mapping.
- **Reversion challenge — "what does removing the four buttons break?"**
  1. "Skip and accept" was the escape hatch from an unfinishable mapping (AC3/AC5). **Addressed:** Clear mapping returns to untouched, which makes Accept a plain accept. Test in T-3.
  2. An incomplete mapping could be silently dropped by a single button. **Addressed:** the incomplete state disables Accept instead of guessing.
  3. The prompt made the mapping discoverable. **Improves:** the section is always visible in the drawer.
  4. Tests assert the dialogs. **Addressed:** rewritten in T-5 with the same guarantees.

### CRD-DD-5: Decline confirmation becomes an inline footer state

- **Context:** hard rule #2 forbids a dialog over the drawer; the mockup has no confirmation at all.
- **Decision:** keep a confirmation step (it exists today and protects an irreversible decision), as a footer mode.
- **Reversion challenge — "what does removing the reject dialog break?"** (1) The dialog restated the request sentence; the drawer header already shows it. (2) The dialog's Confirm was disabled on `invalidateRequest() || requestingReject`; the inline Confirm keeps the same condition. (3) The dialog title said "DECLINE" for bilateral and "REJECT" otherwise; the inline copy uses "Decline" for both, matching the mockup and the row button (NOTIF-T-10 already chose "Decline"). No remaining breakage.

### CRD-DD-6: Close the drawer before anything that re-renders or stacks

- **Context:** CRD-P-6 — after `requestEvent` the parent refetches and `track $index` reuses the instance for a different notification; separately, the legacy modal and the bilateral review drawer are other overlays.
- **Decision:** `closeDrawer()` runs first in `acceptOrReject`'s `finalize` (success and error), before `mapAndAccept()` on the legacy path, and before `navigateToResult()` from the Result card.
- **Alternatives:** keep the drawer open on error for a retry (rejected: the refetch still fires in `finalize` and would swap the request under the open drawer); track by id in the parent (out of scope, and it would not cover the overlay-stacking cases).

### CRD-DD-7: Row Accept/Decline stay; they route into the drawer where a popup was used — **SUPERSEDED by CRD-DD-10 (2026-09-25)**

- **Context:** the mockup keeps row actions; the proposal's Option C (drawer-only) was not requested.
- **Decision:** row Accept is unchanged for ToC-carried and legacy requests; for bilateral it opens the drawer on Align. Row Decline opens the drawer in confirm mode.
- **Reversion challenge — "what does replacing the row's bilateral prompt with the drawer break?"** One click path moves: the "Not now — just accept" one-click plain accept from the prompt becomes open drawer → Accept, the same two clicks. No capability lost.

### CRD-DD-10: The drawer flow and the popup flow coexist (pivot, 2026-09-25)

- **Context:** after CRD-T-4 shipped the drawer-only flow, the product owner (Santiago Sanchez) asked to keep the popups so users keep the flow they already know. His words: *"si entra al drawer pues se seguirá el flujo del drawer, sino pues seguimos con los pop-ups"*. He also chose to keep the inline ToC block.
- **Decision:** the row buttons and the inline block behave exactly as before this spec (the popups are restored from `HEAD`). The row body opens the drawer, whose own flow is unchanged (inline decline confirmation, Align, one Accept contribution). The two flows share the NI decision state, but only one is ever active: `openDrawer()` clears the dialog signals, and no drawer path sets them.
- **Supersedes:** CRD-DD-7 (row buttons route into the drawer) and CRD-DD-9 (inline block removed). CRD-DD-4 and CRD-DD-5 now apply inside the drawer only.
- **Consequences:** `PrDialogComponent` stays in `NotificationItemModule`. The P2-3187 popup tests are restored alongside the drawer tests. Two UIs reach the same `acceptOrReject()` contract, which is unchanged. The drawer's `'align'` / `'confirm-decline'` entry modes have no caller from the row. Task CRD-T-7 implements this.

### CRD-DD-9: The inline `toc_review` block is removed from the row — **SUPERSEDED by CRD-DD-10 (2026-09-25)**

- **Context:** the P2-3085 block shows the ToC fields below ToC-carried rows, always expanded. The drawer's "Where it contributes" now shows the same data (CRD-R-4).
- **Decision:** delete the block (CRD-R-11). `tocReview` and `tocTypologyOf()` stay; the drawer builder uses them.
- **Reversion challenge — "what does removing the inline block break?"** (1) The fields now take one click to see instead of zero. Accepted: it is the mockup's intent and the user's request. (2) Code and tests: `grep toc_review` over `src/` and `cypress/` (2026-09-25) finds no reference outside `notification-item.component.html`; the getter tests (spec L407-470) test `tocReview`/`tocTypologyOf()`, which stay. No remaining breakage.

### CRD-DD-8: Copy centralized in a feature copy file

- **Decision:** `contribution-request-drawer.copy.ts`, following `bilateral-manual-create.copy.ts`. Tests import the same constant.

## 13. Open Gaps & Follow-ups

- Follow-up spec: single "Select an indicator" dropdown and multi-item mapping (proposal OQ-3).
- CRD-P-3/P-4/P-5 are proven in T-1 (spike) and by the manual check at validate.
- Pre-existing, not fixed: phase-34 lock for non-admins on prtest (see `notification-item/CLAUDE.md`).
- Four hand-rolled drawers remain; this spec does not migrate them.

## 14. Budget (tripwire for `/akili-execute`)

| Measure | Expected |
|---|---|
| Tasks | 6 |
| LOC (added + removed, incl. tests and docs) | ~ +650 / −260 (production ~ +300 / −180; tests ~ +300 / −80; docs ~ +50) |
| Review rounds | ≤ 2 per task; 1 expected for T-6 (docs) |

Depth check: Standard matches (6 tasks, one package, no contract change). No re-sizing.
