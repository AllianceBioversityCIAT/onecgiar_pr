# notification-detail-content

**What this owns:** the presentational BODY of the right-side detail panel — header sentence,
RESULT card, "Where it contributes" / `view`-mode metadata grid, the projected `[crdAlign]` slot,
and the `decide`/`confirm-decline`/`view` footer. It holds no decision state and makes no API
calls — `notification-item` owns all of that (see its `CLAUDE.md`). Relocated out of
`../contribution-request-drawer/` (DSP-T-3, `notifications/detail-side-panel`), which is now a thin
sheet shell: this component is projected into it via `<ng-content />`, wrapped by `notification-item`
in `<ng-template #detailTpl>` + `ngTemplateOutlet` so the SAME template instance can later be
portaled into the wide-screen `<aside>` (a later task) without duplicating any markup.

## Inputs / outputs
- Inputs: `headingId` (required — the `h2` id the shell's `aria-labelledby` must point at, unique
  per row), `mode` (`'decide' | 'confirm-decline' | 'view'`), `headerParts`, `resultCode`,
  `resultTitle`, `reviewRows`, `acceptDisabled`, `declineDisabled`, `acceptBusy`, `declineBusy`,
  `blockedReason`, `acceptHelper`, `focusAlign`, `viewFields` (NOTIF-T-4, `view` mode only),
  `acceptLabel`, `showAlignSlot`.
- Outputs: `closed` (THIS component's own ✕ button only — the shell has its OWN separate `closed`
  for the sheet's native scrim/Escape/outside-click; the caller wires both to the same handler),
  `resultActivated`, `acceptClicked`, `declineClicked`, `declineConfirmed`, `declineCancelled`.

## Accessible name AND description (DSP-T-3 attempt 2, Reviewer FAIL issue 1)
This component owns both ids the shell forwards to `<hlm-sheet>`:
- The `h2[id]="headingId()"` — the accessible NAME (`aria-labelledby`).
- The header-sentence `p[id]="headingId() + '-desc'"` (`data-testid="crd-header-sentence"`) — the
  accessible DESCRIPTION (`aria-describedby`). This id is always present (the `<p>` always renders,
  even with no `headerParts()`), so the shell never points `aria-describedby` at a non-existent id.

Attempt 1 bound `[attr.aria-labelledby]` on the SHELL's `hlm-sheet-content` — a role-less element AT
ignores, so the panel had no real accessible name even though a jsdom test on that wrong node
passed. Fixed: the shell now binds `[aria-labelledby]`/`[aria-describedby]` directly on `<hlm-sheet>`
(`BrnDialog`'s own aliased inputs, which flow into the CDK dialog's `role="dialog"` config) — see
the shell's `CLAUDE.md`. This component's only job is to keep rendering both ids on elements that
exist whenever it is mounted; it does not know or care which container (sheet or, later, `<aside>`)
is pointing at them.

## Why a plain `h2[id]` + hand-built close button, not `hlmSheetTitle`/`hlmSheetClose` (DSP-P-9)
`HlmSheetTitle`/`HlmSheetDescription`/`HlmSheetClose` (`@spartan/sheet`) each `hostDirectives` a
`Brn*` equivalent, and every one of those Brn directives injects its own private `_brnDialogRef` in
its constructor — only provided inside the dialog's own portal/content registration, i.e. only when
the directive's host element IS the sheet's own registered content, not merely something projected
INTO it. Since this component is a separate Angular component, instantiated via `ngTemplateOutlet`
and (later) portaled to a plain `<aside>` that is never a dialog at all, those directives cannot be
relied on here. The close button is a hand-built `button` wired straight to this component's own
`closed` output — no `hlmSheetClose`, no dependency on a dialog ref that may not exist for this
component's host element.

## Kind-aware decide footer (PSR-T-9) and header sentence `leadCode`/`suffix`
Three additive, all-default-to-today's-behaviour inputs/fields let the footer and sentence express a
primary/bilateral-contributor request without touching any pre-existing caller:
- **`acceptLabel: string | null`** (default `null` → `copy.footer.acceptContribution`). The caller
  (`notification-item`) picks the label per request kind; this component stays presentational.
- **`showAlignSlot: boolean`** (default `true`). `false` hides `<ng-content select="[crdAlign]" />`
  even if something is projected into it (defense in depth for a primary request).
- **`ContributionRequestDrawerViewFields.requestKind?`** — same "omit, never fabricate" contract as
  every other `view`-mode field.
- **`headerParts.leadCode`/`.suffix`** — a bold leading `{owner sp}` abutting the verb (no space; the
  verb's own copy carries its leading comma), and an "on behalf of {center}" tail after
  `resultTitle`. Both `undefined` for every kind except the bilateral-contributor row; the caller
  never sets `leadCode` and `requesterCode` on the same object.

## `view` mode (NOTIF-T-4)
A third, additive `mode` for a resolved Received/Sent/Updates row — no footer at all (the close
button is unaffected). `viewFields` feeds `viewMetadataRows` — the per-source field adapter
(design.md §6.2): fixed order (Status → Request type → Result type → Phase → Primary program →
Reporting center → Submitted by); `resultType`/`reportingCenter` are skipped for `source: 'update'`
(`NOTIF-P-2`); any empty/blank field is omitted, never rendered blank (`NOTIF-R-5`/`NOTIF-AC-7`).

**Deliberate departure from `CRD-R-4`:** in `view` mode only, "Where it contributes" is hidden
entirely when `reviewRows()` is empty — no all-dash fallback table. `decide`/`confirm-decline` still
always show it (`displayReviewRows()`'s dash fallback).

`[crdAlign]` projection (`<ng-content select="[crdAlign]" />`, inside the scrolling body): the
parent projects the bilateral Align section into it. Nothing in this component knows what's inside;
`focusAlign` just scrolls whatever matches `[crdAlign]` into view after render.

## Width / motion / showCloseButton / `:host { display: contents; }`
CRD-P-9 (width override), the motion-reduce classes, and `showCloseButton=false` all live on the
SHELL's own `hlm-sheet-content` (`../contribution-request-drawer/CLAUDE.md`) — not here. `:host`
stays `display: contents` so this component's header/body/footer behave as direct flex children of
whatever flex-column container renders it (today the shell's `hlm-sheet-content`; tomorrow a plain
`<aside>`) — don't remove it.

## Clamp: 180 chars, gated by the toggle
`CLAMP_THRESHOLD_CHARS = 180`, via `needsMore(value)` (`value.trim().length > 180`) — a character
heuristic, not measured line height. `[class.line-clamp-3]` only applies when `needsMore()` is true,
so a short value never gets the clamp class and no Show-more toggle renders for it.

## Copy
All fixed strings come from `CONTRIBUTION_REQUEST_DRAWER_COPY`
(`src/app/internationalization/contribution-request-drawer.copy.ts`). Don't hardcode a new string
here; add it to the copy file first.

## Jest caveat
Same shared-mock gap as the shell/row: `[disabled]` on a Helm/Brn button doesn't reach the native
DOM attribute under `tests/mocks/spartanBrainMock.ts`. This component defends against it
independently of the DOM attribute — `onAcceptActivate()`/`onDeclineActivate()`/
`onConfirmDeclineActivate()` re-check the disabled getters before emitting. Assert through these
handlers or through `BrnButton`, never `nativeElement.disabled`.

## Falsifiers only partially verified until a manual browser pass
CRD-P-4/DSP-P-10 (content rendered through the sheet's real portal, `ngTemplateOutlet` re-parenting
into a REAL CDK overlay) are only jsdom-proven today — see the manual browser pass this spec's
Leader runs separately (`docs/specs/notifications/detail-side-panel/tasks.md` DSP-T-3's own DoD).
Do not treat either premise as fully verified without that pass.

**Verified:** 2026-10-05 · qa-development-2026-ss · cb27be98b · DSP-T-3 attempt 2 (`notifications/detail-side-panel`):
added the `headingId() + '-desc'` id on the header-sentence `p` (accessible DESCRIPTION) alongside
the pre-existing `h2[id]` (accessible NAME) — see the new section above; both now exist on real
elements whenever this component mounts, closing the Reviewer's attempt-1 FAIL (the shell bound the
wrong element). Supersedes nothing below — extracted from `contribution-request-drawer` (CRD-T-1..T-4,
PSR-T-8/T-9, NOTIF-T-4/T-5/T-14, PDR-T-4 history preserved in the shell's own `CLAUDE.md`); this
file is the sole owner of that body/footer contract going forward.
