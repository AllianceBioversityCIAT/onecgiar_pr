# contribution-request-drawer

**What this owns:** the presentational right-side drawer for a pending Received contribution
request. It renders inputs and emits outputs; it holds no decision state and makes no API calls
— `notification-item` owns all of that (see its `CLAUDE.md`). One of two entry points into the
same decision (CRD-DD-10): the row body opens this drawer, the row's Accept/Decline buttons still
use the older popups. The two never show together.

## Inputs / outputs
- Inputs: `open`, `mode` (`'decide' | 'confirm-decline' | 'view'`), `headerParts`, `resultCode`,
  `resultTitle`, `reviewRows`, `acceptDisabled`, `declineDisabled`, `acceptBusy`, `declineBusy`,
  `blockedReason`, `acceptHelper`, `focusAlign`, `viewFields` (NOTIF-T-4, `view` mode only),
  `acceptLabel` (PSR-T-9, below), `showAlignSlot` (PSR-T-9, below).
- Outputs: `closed` (✕ / scrim / Escape **and** the late programmatic-close emission — see the
  parent's `onDrawerClosedSignal()` guard, this component never guards it itself), `resultActivated`,
  `acceptClicked`, `declineClicked`, `declineConfirmed`, `declineCancelled`.

## Kind-aware decide footer (PSR-T-9, `bilateral-primary-sp-request`)
Two additive inputs make the `decide`-footer capable of showing a primary-program-request's kind
without touching a single pre-existing test — both default to today's exact behaviour:
- **`acceptLabel: string | null` (default `null`).** When set, overrides the Accept button text;
  `null` falls back to `copy.footer.acceptContribution`, unchanged. This component never decides
  which label a given request kind gets (primary → `copy.footer.acceptAsPrimary`, bilateral
  contributor → plain "Accept", existing contribution → `acceptContribution`) — that judgment call
  belongs to whoever builds the row (`notification-item`, wired by `PSR-T-8`), matching `PSR-R-11`
  ("the drawer shows the same accept action as the row"). Stays presentational, per this file's own
  opening line.
- **`showAlignSlot: boolean` (default `true`).** Gates `<ng-content select="[crdAlign]" />` — `false`
  hides the projected Align section entirely, even if the caller still projects something into it
  (defense in depth; design.md §6.2 "No ToC 'Align' projection for primary requests"). The caller
  sets it `false` for a primary request; every existing caller that never touches it keeps seeing
  the Align block exactly as before.
- **`ContributionRequestDrawerViewFields.requestKind?: string | null`** — a new optional `view`-mode
  field (see below), same "omit, never fabricate" contract as every other field in that interface.

None of these three require decide/confirm-decline behavior changes for a caller that doesn't pass
them — the CRD zero-touch history (footer/header markup untouched, only new optional bindings).

## Header sentence: `leadCode` / `suffix` (PSR-T-9 rework attempt 2)
Attempt 1's `ContributionRequestDrawerHeaderParts` couldn't express the bilateral-contributor
sentence (design.md §6.1): a bold leading `{owner sp}` before any "from"/verb text, and an
"on behalf of {center}" tail with nowhere to go after `resultTitle`. Two more optional fields close
both gaps, each additive and `@if`-guarded:
- **`leadCode?: string`.** When set, renders `<span class="font-mono font-semibold">{{ leadCode }}</span>`
  immediately abutting `{{ h.verb }}` — **no space between them**, because the contributor verb
  carries its own leading comma (`copy.header.bilateralContributorVerb`,
  `", as primary Science Program, has tagged"`). This is why `leadCode` branches the template into
  its own `@if (h.leadCode) { … } @else { … }` rather than reusing the `requesterCode`/"from" path:
  the existing multi-line template formatting collapses to a single space between elements, which is
  exactly wrong here (measured: `"SP09 , as primary…"` before the `@else` split). The `@else` branch
  is the pre-existing `requesterCode`/`verb` markup, byte-for-byte unchanged, so every caller that
  never sets `leadCode` (all of them, pre-`PSR-T-9`) renders exactly as before.
- **`suffix?: string`.** Rendered after `resultTitle`, only when truthy — the "on behalf of {center}"
  tail (`copy.header.onBehalfOf`). `notification-item` (wired by `PSR-T-8`) builds it as
  `` `${copy.header.onBehalfOf} ${centerAcronym}` `` — this component never composes the string
  itself, it only renders what it's given (same contract as `acceptLabel` above).

Both fields are `undefined` for every kind except the bilateral-contributor row; `leadCode` and
`requesterCode` are never both set on the same `headerParts` object (the caller picks one shape per
kind), and this component doesn't enforce that — it's a caller invariant, not a drawer one.

## `view` mode (NOTIF-T-4)
A third, additive `mode` used for any resolved Received row, Sent row, or Updates row — no
Accept/Decline/confirm-decline footer at all (the `hlm-sheet-close` button in the header is
unaffected by `mode` and renders/works identically in all three modes). Header sentence and RESULT
card are reused unchanged. `viewFields` (`ContributionRequestDrawerViewFields`) feeds the
`viewMetadataRows` computed — the per-source field adapter from design.md §6.2: fixed order
(**Status** (`NOTIF-T-14`, from `notification-item`'s `rowStatusLabel` — "Needs your decision" /
"For your information", never source-gated) → **Request type** (`PSR-T-9`/`PSR-R-11`, the request's
kind — "Primary program request" / "Contributor request" / "Contribution request", resolved by the
caller, never by this component) → Result type → Phase → Primary program → Reporting
center → Submitted by), `resultType` and `reportingCenter` are skipped outright for `source: 'update'`
rows regardless of what the caller passes in (`NOTIF-P-2`: `notification/updates` never returns
either), and any field whose trimmed value is empty/undefined/null is omitted from the grid — never
rendered as a blank row (`NOTIF-R-5`/`NOTIF-AC-7`). **Known gap (`NOTIF-T-14`, 2026-09-30):** since
this grid only renders in `view` mode, and a pending Received row always opens in `decide` mode
(never `view`), `status` in practice only ever shows "For your information" — a `decide`/
`confirm-decline` panel shows no explicit status row at all (the Accept/Decline footer itself is the
only signal there). Closing this fully would require touching `decide` mode's template, which this
component's zero-touch history forbids without explicit sign-off — see `execution.md`'s `NOTIF-T-14`
entry for the Leader/user decision on record.

**Deliberate departure from `CRD-R-4`:** in `view` mode only, "Where it contributes" is hidden
entirely when `reviewRows()` is empty — no all-dash fallback table. `decide`/`confirm-decline`
still always show it (`displayReviewRows()`'s dash fallback), per `CRD-R-4`'s "never hide" rule.
Do not "fix" this back to always-show for `view` — an info-only panel with no review data has
nothing to show a dash table for.
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

**Verified:** 2026-09-30 · qa-development-2026-ss · PSR-T-9 rework attempt 2 (`bilateral-primary-sp-request`):
added `leadCode`/`suffix` to `ContributionRequestDrawerHeaderParts` (closes the Reviewer's FAIL —
the bilateral-contributor sentence couldn't be expressed before), on top of attempt 1's `acceptLabel`,
`showAlignSlot`, and the `view`-mode `requestKind` field — all additive, defaulting to today's exact
rendering; supersedes NOTIF-T-14's stamp above which still stands for everything else.
