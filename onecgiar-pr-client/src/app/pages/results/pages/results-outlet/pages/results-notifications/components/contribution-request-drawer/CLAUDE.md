# contribution-request-drawer

**DSP-T-3 (`notifications/detail-side-panel`) reduced this to a thin sheet SHELL.** Everything the
shell used to own on its own (body/footer inputs, outputs, markup, logic — header sentence, RESULT
card, review tables, footer, `[crdAlign]`, focus-scroll, `needsMore`/expand, the width override,
motion-reduce classes, clamp, copy, Jest caveat) MOVED to `../notification-detail-content/` — read
**its** `CLAUDE.md` for all of that, now projected in here via `<ng-content />`. This file documents
only what the shell itself still owns, below.

## What the shell owns now (DSP-T-3, attempt 2 fix)
- **Inputs:** `open` (unchanged, CRD-R-9 — the parent owns this state), `labelledBy` and
  `describedBy` — the ids of the projected content's own `h2[id]` and header-sentence `p[id]`
  (`../notification-detail-content/`), forwarded onto **`<hlm-sheet>` itself** as
  `[aria-labelledby]`/`[aria-describedby]` (`BrnDialog`'s own aliased inputs — `HlmSheet extends
  BrnSheet extends BrnDialog`). These flow straight into the CDK dialog's `role="dialog"` container
  config (`spartan-ng-brain-dialog.mjs`'s `_options()`/`open()`, L212-213/L318-319).
  - **Attempt 1 bound these as `[attr.aria-labelledby]` on `hlm-sheet-content` instead** — a
    role-less element AT ignores, so the panel had no real accessible name in a browser even though
    a jsdom test on that wrong node passed. Fixed in attempt 2; don't regress this back onto
    `hlm-sheet-content`.
  - `describedBy` defaults to `null` (no description) rather than letting the CDK dialog fall back
    to its own `brn-dialog-description-<id>` default — that id is never set by anything here, so
    leaving `ariaDescribedBy` `undefined` would point at a non-existent node.
- **Output:** `closed` — ONLY the sheet's own built-in scrim/Escape/outside-click dismissal. The
  content's own ✕ button emits ITS OWN separate `closed` output (see
  `notification-detail-content`'s `CLAUDE.md`) — `notification-item` wires BOTH to the same handler
  (`onDrawerClosedSignal()`), so from the row's point of view nothing changed: either close path
  still reaches it. This component's own late-`closed`-after-programmatic-close caveat still applies
  to ITS `closed` output only.
- **Markup:** `hlm-sheet` + `hlm-sheet-content` (`*hlmSheetPortal`, `showCloseButton=false`, the
  720px width override and motion-reduce classes — CRD-P-9 / CRD-T-1 issue 2, unchanged, still live
  on `hlm-sheet-content`) wrapping a single `<ng-content />`. No header/body/footer markup of its own.
- **Public selector is unchanged** (design.md §11) — every existing `<app-contribution-request-drawer>`
  caller still compiles; only its inputs/outputs changed (consumers must now also pass `labelledBy`/
  `describedBy` and wire the content's own `closed`, see `notification-item`'s usage).

One of two entry points into the same decision (CRD-DD-10): the row body opens this drawer, the
row's Accept/Decline buttons still use the older popups. The two never show together — unaffected
by DSP-T-3.

## Why `hlmSheetTitle`/`hlmSheetDescription`/`hlmSheetClose` are gone (DSP-P-9, confirmed)
Those three directives each inject their own private Brn dialog ref (confirmed from
`@spartan-ng/brain`'s own type declarations — see `notification-detail-content/CLAUDE.md` for the
full evidence), which only resolves for a component registered as the sheet's OWN portal content —
not guaranteed for the separate `notification-detail-content` component merely projected into it,
and never true once the same template instance is portaled to a plain `<aside>` (a later task, not
a dialog at all). Fixed by setting the accessible name/description via `<hlm-sheet>`'s own
`aria-labelledby`/`aria-describedby` inputs (above) and moving the close button into the content
component with its own output.

## Shared Jest mock (`tests/mocks/spartanBrainMock.ts`)
The `BrnSheet` stub carries `@Input('aria-labelledby') ariaLabelledBy` / `@Input('aria-describedby')
ariaDescribedBy` (additive, Leader-approved — the mock is outside this task's file list but shared
by every `@spartan-ng/brain/*` consumer in the client). Assert the forwarded value via
`By.directive(HlmSheet)`, never via a DOM attribute query — `HlmSheet` is a real component in this
app (`src/app/spartan/sheet`), only the Brain layer underneath it is mocked.

**Verified:** 2026-10-05 · qa-development-2026-ss · cb27be98b · DSP-T-3 attempt 2 (`notifications/detail-side-panel`):
fixed Reviewer FAIL issue 1 — `labelledBy`/`describedBy` now bind `<hlm-sheet>`'s own
`aria-labelledby`/`aria-describedby` inputs instead of an attribute on `hlm-sheet-content`. Replaces
the pre-DSP-T-3 body/footer history that used to live in this file (superseded content/history
removed per Leader DoD — see `../notification-detail-content/CLAUDE.md` for the current, maintained
contract of everything this shell no longer owns).
