# contribution-request-drawer

**What this owns:** the presentational right-side drawer for a pending Received contribution
request. It renders inputs and emits outputs; it holds no decision state and makes no API calls
— `notification-item` owns all of that (see its `CLAUDE.md`). One of two entry points into the
same decision (CRD-DD-10): the row body opens this drawer, the row's Accept/Decline buttons still
use the older popups. The two never show together.

## Inputs / outputs
- Inputs: `open`, `mode` (`'decide' | 'confirm-decline'`), `headerParts`, `resultCode`,
  `resultTitle`, `reviewRows`, `acceptDisabled`, `declineDisabled`, `acceptBusy`, `declineBusy`,
  `blockedReason`, `acceptHelper`, `focusAlign`.
- Outputs: `closed` (✕ / scrim / Escape **and** the late programmatic-close emission — see the
  parent's `onDrawerClosedSignal()` guard, this component never guards it itself), `resultActivated`,
  `acceptClicked`, `declineClicked`, `declineConfirmed`, `declineCancelled`.
- `[crdAlign]` projection: `<ng-content select="[crdAlign]" />` inside the scrolling body. The
  parent projects the bilateral Align section (today's mapping controls) into it — see design.md
  CRD-DD-3. Nothing in this component knows what's inside; `focusAlign` just scrolls whatever
  matches `[crdAlign]` into view after open.

## Width override (CRD-P-9)
`hlm-sheet-content` ships `data-[side=right]:w-3/4 data-[side=right]:sm:max-w-sm`
(`hlm-sheet-content.ts:43`). Helm's `hlm()` DOES run `tailwind-merge` (`spartan/utils/src/lib/
hlm.ts`), but twMerge does not dedupe across different variants — a plain `w-[720px]` (no variant)
loses to `data-[side=right]:w-3/4` on variant specificity, not a "concatenation" or a specificity
tie. The override here beats it with `!important`: `!w-[720px] sm:!max-w-[720px] max-[639px]:!w-screen` —
the `!` is load-bearing, not decorative. Don't drop it to "clean up" the class list.

## Motion and the scrim gap
`motion-reduce:transition-none motion-reduce:animate-none` on `hlm-sheet-content`, plus
`motion-reduce:animate-none` on all three spinner icons (decline, accept, confirm-decline),
satisfy hard rule #6 (`prefers-reduced-motion` → durations to 1ms) for everything this component
controls. **The scrim itself (`hlm-sheet-overlay`)
is not reachable from here** — its fade lives in `@spartan/sheet`'s own template, one level up, and
this component has no seam to override it. If a future audit flags the scrim ignoring reduced
motion, the fix belongs in the Helm `sheet` primitive, not in this file.

## `showCloseButton=false` + its own `hlmSheetClose`
`showCloseButton` is set `false` on `hlm-sheet-content` and a hand-built `button[hlmSheetClose]` is
rendered in the header instead, with the aria label sourced from copy (`copy.closeAriaLabel`) and
project focus-ring classes. This exists because the built-in close button doesn't take an
`aria-label`; don't re-enable `showCloseButton` and delete this button, the label would silently
disappear.

## Clamp: 180 chars, gated by the toggle
`CLAMP_THRESHOLD_CHARS = 180`, checked via `needsMore(value)` (`value.trim().length > 180`) — a
heuristic on character count, not measured line height, chosen because a real 3-line overflow
check would need layout measurement this component doesn't do. **The `line-clamp-3` class is bound
via `[class.line-clamp-3]="needsMore(field.value) && !isExpanded(tableIndex, rowIndex)"`** — a
short value never gets the clamp class at all, so `isExpanded()` has no effect on it and no
Show-more toggle renders for it. Don't apply the clamp unconditionally "to be safe"; it would
visually truncate values that don't need it on lines shorter than expected at odd column widths.

## Falsifiers only partially verified until CRD-T-6
CRD-P-3 (CDK focus trap + restore) and CRD-P-4 (content projected through the sheet's real portal,
not just inline in jsdom) are **only jsdom-proven** today, against the shared
`tests/mocks/spartanBrainMock.ts` Sheet stub, which renders content inline and never exercises a
real `Dialog.open()`/`OverlayContainer`. Do not treat either premise as fully verified — the manual
browser pass at `CRD-T-6` (see `docs/specs/changes/contribution-request-drawer/tasks.md`) is the
actual gate. If `CRD-T-6` has not run since your change, treat focus behaviour as unverified.

## Copy
All fixed strings come from `CONTRIBUTION_REQUEST_DRAWER_COPY`
(`src/app/internationalization/contribution-request-drawer.copy.ts`) — title, section labels, the 7
field labels, footer button/text labels, dash value, Show more/less, close aria label. Don't
hardcode a new string here; add it to the copy file first.

## Jest caveat
Same shared-mock gap as the parent: `[disabled]` on a Helm/Brn button doesn't reach the native DOM
attribute under `tests/mocks/spartanBrainMock.ts`. This component defends against it independently
of the DOM attribute — `onAcceptActivate()` / `onDeclineActivate()` / `onConfirmDeclineActivate()`
re-check `isAcceptDisabled()`/`isDeclineDisabled()`/`declineDisabled()` before emitting, so a
"disabled" click is provably inert in both the real app and under Jest. Assert through these
handlers or through `BrnButton`, never `nativeElement.disabled`.

**Verified:** 2026-09-25 · qa-development-2026-ss · 485847996
