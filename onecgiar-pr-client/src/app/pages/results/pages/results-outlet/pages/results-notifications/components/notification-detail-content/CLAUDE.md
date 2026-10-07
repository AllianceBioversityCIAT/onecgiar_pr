# notification-detail-content

**What this owns:** the presentational BODY of the right-side detail panel — title, chips row,
header sentence, RESULT card + grid, APPROVAL CHAIN, "Where it contributes", the "MAP TO YOUR
THEORY OF CHANGE"-framed `[crdAlign]` slot (DSP-T-8), and the pinned `decide`/`confirm-decline`/
`view` footer. No decision state, no API calls — `notification-item` owns that (its own `CLAUDE.md`).
Relocated out of `../contribution-request-drawer/` (DSP-T-3, now a thin shell): projected via
`<ng-content />`, wrapped by `notification-item` in `<ng-template #detailTpl>` + `ngTemplateOutlet`
so the SAME instance can later be portaled into the wide-screen `<aside>`.

## Inputs / outputs
- Inputs: `headingId` (required — the `h2` id the shell's `aria-labelledby` must point at, unique
  per row), `mode` (`'decide' | 'confirm-decline' | 'view'`), `title`, `chips` (DSP-T-4), `headerParts`,
  `resultCode`, `resultTitle`, `resultGrid` (DSP-T-4), `chain` (DSP-T-5, below), `reviewRows`,
  `acceptDisabled`, `declineDisabled`, `acceptBusy`, `declineBusy`, `blockedReason`, `acceptHelper`,
  `focusAlign`, `acceptLabel`, `showAlignSlot`.
- Outputs: `closed` (THIS component's own ✕ button only — the shell has its OWN separate `closed`
  for the sheet's native scrim/Escape/outside-click; the caller wires both to the same handler),
  `resultActivated`, `acceptClicked`, `declineClicked`, `declineConfirmed`, `declineCancelled`,
  `retryChain` (DSP-T-5).

## APPROVAL CHAIN section (DSP-T-5, design.md §6.2/§6.3 "Chain step", DSP-R-8)
Renders between the RESULT card and "Where it contributes" (design "Order in the body"). `chain` is
`{state:'loading'} | {state:'ok', data: ApprovalChainDto | undefined} | {state:'error'}` — the
caller (`notification-item`) maps its own `status`-keyed `ApprovalChainState` (DSP-T-2) onto this
`state`-keyed shape inline in its template (a pure rename). `data` can be `undefined` even in the
`'ok'` state (T-2 advisory: an empty server body) — `chainHasError()` treats that like `'error'`
instead of indexing into an absent DTO. Steps render in the order the server already returns
(submission, then primary/contributors by code — no client-side resort). Icons (`check`/`ring`/`x`)
are a full precomputed `iconClass` string per step, not a `[class.*]` binding (a Tailwind
arbitrary-value class like `bg-[var(--pr-status-approved-fg)]` can't be a `[class.X]` key): filled
check = approved fg; 2px open ring = in-progress fg (pending) or not-started fg (not-submitted);
filled ✕ = rejected fg — three distinct shapes, a declined step never looks like a pending one. A
program step's subtitle is "Contributing program" only when `role==='contributor' &&
status==='pending'` (DSP-T-9 F-3 — NOT `is_viewer_program` alone, which mislabeled a viewer's
accepted/primary step); else `{actor} · {date}` (`dd MMM yyyy`) or nothing. "Your program" (brand
label) still renders for every `is_viewer_program` step. Loading/error never disable/hide the footer.

## Accessible name/description + plain `h2`/close button (DSP-T-3 attempt 2, DSP-P-9)
Owns both ids the shell forwards to `<hlm-sheet>`: `h2[id]="headingId()"` (accessible NAME) and the
header-sentence `p[id]="headingId() + '-desc'"` (accessible DESCRIPTION, always rendered). Binding
these on the SHELL's `hlm-sheet-content` instead (attempt 1) failed — a role-less element AT
ignores; fixed on `<hlm-sheet>` itself (shell's `CLAUDE.md`). No `hlmSheetTitle`/`hlmSheetClose`:
each injects its own private dialog ref, resolved only for the sheet's OWN portal content, not a
component merely projected into it — the close button is hand-built, wired to this component's own
`closed` output.

## Kind-aware decide footer (PSR-T-9) and header sentence `leadCode`/`suffix`
Additive, all-default-to-today's-behaviour inputs/fields let the footer and sentence express a
primary/bilateral-contributor request without touching any pre-existing caller: **`acceptLabel:
string | null`** (default `null` → `copy.footer.acceptContribution`, caller picks the label per
request kind); **`showAlignSlot: boolean`** (default `true`, `false` hides `<ng-content
select="[crdAlign]" />` even if projected — a primary request); **`headerParts.leadCode`/`.suffix`**
— a bold leading `{owner sp}` abutting the verb, and an "on behalf of {center}" tail after
`resultTitle`, both `undefined` outside the bilateral-contributor row.

## `view` mode (NOTIF-T-4)
A third, additive `mode` for a resolved Received/Sent/Updates row — no footer at all.

## Header title, chips row, RESULT grid (DSP-T-4 — supersedes NOTIF-T-4/T-14's `view`-mode-only grid)
`viewFields`/`viewMetadataRows` are **gone**. Three caller-owned inputs replace them, rendered in
every mode now, not just `view` (DD-6 supersedes NOTIF-R-5/NOTIF-AC-7 for THIS grid only): **`title`**
(the `h2` text, empty string falls back to `copy.title`); **`chips`** (status, funding `outlined:
true`, level · type, date — only `pill:true` chips render as an `hlmBadge` pill; others render as
plain `ink-subtle` text, DSP-T-9 Q-2; row omitted when empty); **`resultGrid`** (the RESULT card's 6
cells, fixed order Reporting center → Result type → Primary SP → Contributing programs → Submitted
by → Phase; a missing value is `copy.dashValue`, label **never** omitted; `field.loading` renders
`hlm-skeleton` on Contributing-programs AND Submitted-by while the chain hasn't resolved, DSP-T-9
Q-1). The RESULT link renders `code – title` as one inline text run, no `flex` (DSP-T-9 Q-3): the
code can never sit alone on its own line.

**Deliberate departure from `CRD-R-4`:** in `view` mode only, "Where it contributes" is hidden
entirely when `reviewRows()` is empty — no all-dash fallback table. `decide`/`confirm-decline` still
always show it (`displayReviewRows()`'s dash fallback).

`[crdAlign]` projection: `focusAlign` scrolls whatever matches `[crdAlign]` into view after render.
**DSP-T-8:** `showTocSection()` (`showAlignSlot() && mode() ∈ {decide, confirm-decline}`) now wraps
the slot with a `copy.sections.mapToToc` heading + `copy.toc.helper` text (defense in depth on the
caller's own gates; never a primary request or `view` mode) — Align controls' own logic/markup
(rendered BY `notification-item` INTO the slot) untouched. Body order (sentence → RESULT card →
APPROVAL CHAIN → "Where it contributes" → ToC) was already correct. Footer padding is now
`px-[20px] py-[14px]` (was `px-6 py-4`, design.md §6.3 Metrics) — same top divider, same `mt-auto`.

## Width / motion / showCloseButton / `:host { display: contents; }`
CRD-P-9 (width override), motion-reduce classes, `showCloseButton=false` all live on the SHELL's own
`hlm-sheet-content` (`../contribution-request-drawer/CLAUDE.md`) — not here. `:host` stays `display:
contents` so header/body/footer behave as direct flex children of the SHELL's `h-full flex flex-col`
(`hlm-sheet-content`'s `data-[side=right]:h-full`) — body's `flex-1 min-h-0 overflow-y-auto` +
footer's `mt-auto` pins the footer outside the scroll area; don't remove any of the three.

## Clamp (180 chars) and copy
`CLAMP_THRESHOLD_CHARS = 180`, via `needsMore(value)` (`value.trim().length > 180`) — a character
heuristic, not measured line height; `[class.line-clamp-3]` applies only when true. All fixed
strings come from `CONTRIBUTION_REQUEST_DRAWER_COPY` (`internationalization/contribution-request-drawer.copy.ts`).

## Jest caveat
Same shared-mock gap as the shell/row: `[disabled]` on a Helm/Brn button doesn't reach the native DOM
attribute under `tests/mocks/spartanBrainMock.ts`. This component defends independently —
`onAcceptActivate()`/`onDeclineActivate()`/`onConfirmDeclineActivate()` re-check the disabled getters
before emitting. Assert through these handlers or `BrnButton`, never `nativeElement.disabled`.

## Falsifiers only partially verified until a manual browser pass
CRD-P-4/DSP-P-10 (real CDK overlay re-parenting via `ngTemplateOutlet`) are only jsdom-proven today —
see the manual browser pass the Leader runs separately (`tasks.md` DSP-T-3's DoD). Chain step
`code`/`name` are split, not joined (DSP-T-5): `ChainDisplayStep.code` is `null` for the submission
step and `official_code` for program steps; only `code` renders `.font-mono`.

**Verified:** 2026-10-05 · qa-development-2026-ss · DSP-T-8 + DSP-T-9 fix round (`notifications/detail-side-panel`):
`showTocSection()` heading/helper, footer `px-[20px] py-[14px]` (T-8); T-9 fixes — chain subtitle
gated on `role==='contributor' && status==='pending'` (F-3), chips `pill` split (Q-2), RESULT link
one inline run (Q-3) — see the sections above.

**Verified:** 2026-10-05 · qa-development-2026-ss · DSP-T-5/T-4/T-3 attempt 2 (`notifications/detail-side-panel`,
condensed): APPROVAL CHAIN section (`chain`/`retryChain`); header restyle (`title`/`chips`/`resultGrid`,
`viewFields`/`viewMetadataRows` removed, DD-6/DD-7); `headingId() + '-desc'` accessible DESCRIPTION
alongside `h2[id]` NAME (closes attempt-1's wrong-element FAIL). Extracted from
`contribution-request-drawer` (CRD-T-1..T-4, PSR-T-8/T-9, NOTIF-T-4/T-5/T-14, PDR-T-4 history
preserved in the shell's own `CLAUDE.md`); this file is the sole owner of the body/footer contract.

- `showDecline` input (default `true`, `PRA-R-3`): `false` hides the `decide`-footer Decline button. `notification-item` passes `!isPrimaryRequest`; the confirm-decline footer is unchanged.

**Verified:** 2026-10-07 · qa-development-2026-ss · PRA-T-2 (`notifications/primary-review-not-accept`): added the `showDecline` input.
