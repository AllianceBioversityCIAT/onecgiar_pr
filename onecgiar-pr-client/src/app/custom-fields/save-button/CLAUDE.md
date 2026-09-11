# save-button

**Verified:** 2026-09-11 · branch performance-refactor · b0a177160

## What it is
The floating bar at the bottom of every result form: the Save button, its "N alerts" missing-fields
panel, and the PDF export menu grouped beside it. One component, mounted by ~21 sections.

## Contract
- Inputs: `text` (label), `disabled` (consumer-side veto, NOT an in-flight state), `editable`
  (explicit override that shows the bar regardless of role).
- Output: `clickSave` — emitted once per click; the in-flight guard lives in `onClickSave()`.
- State owned elsewhere: `SaveButtonService.isSaving()` (spinner + label), `RolesService.readOnly`
  (whether the bar exists at all), `DataControlService.fieldFeedbackList()` (the alerts panel),
  `PdfService.enabled()/menuOpen()` (the PDF group).

## Visibility rule — read this before changing the `*ngIf`
`save-button.component.html:1` gates the whole bar on `pdfSE.enabled() || !rolesSE.readOnly || editable`,
and `:27` gates the Save half again on `!rolesSE.readOnly || editable`. The PDF menu is therefore
reachable in read-only; Save is not.

## `SaveButtonService.saveAndSettle` — how a caller learns whether the save worked
Added for P2-3659 / P2-3654 (`Next` in the result-detail wizard has to save the open section before
it navigates). It runs the handler and resolves `saved` / `failed` / `not-started`.
- `isSaving()` alone cannot answer it: one shared flag goes up and back down on success AND on
  failure. The outcome is tracked by a counter of SETTLED saves plus the last result.
- `not-started` is a real, expected answer: a handler can return on its own guard or open a
  confirmation modal, and three of the eleven sections reach the network asynchronously (evidences
  uploads files first, innovation-dev-info awaits its evidence call, innovation-use re-reads the
  stored link). 🛑 A caller must treat it as "carry on as before", never as a failure.
- Windows: 1000 ms for the request to start, 500 ms of spinner-down grace before giving up.
  Evidences raises and lowers the spinner by hand around its uploads — that grace is why it does
  not hold the caller for the full 60 s save timeout.
- One settle per pipe, first answer wins: the success toast is raised after the outcome is recorded
  and `show()` touches the DOM, so a throw there must not turn an accepted save into `failed`.

## Traps (⚠️ = already broke something)
- ⚠️ **`RolesService.readOnly` starts TRUE and is lowered only after an async role resolution.**
  It was a plain property until 01-Sep-2026, so under zoneless change detection that write scheduled
  no render pass and **an editor got no Save button at all** — reported as intermittent, because any
  unrelated HTTP response repainted the view and made it appear. Fixed in P2-3322 by making the flag
  signal-backed (`shared/services/global/roles.service.ts`); the public API is still a plain boolean.
  🛑 Do not turn it back into a plain field.
- ⚠️ **The repaint that hides this class of bug is global and easy to miss:**
  `shared/interceptors/general-interceptor.service.ts:26` calls `viewRefreshSE.schedule()` in the
  `finalize` of *every* HTTP request. It is a safety net, not a guarantee — never rely on it to make
  a view update.
- ⚠️ **A test that asserts on the flag instead of the DOM passes with the bug present.** That is why
  the defect survived a green CI for days. `save-button.contract.cy.ts` asserts on `.fixed_button`
  existing; keep it that way.
- `becomes clickable again when the consumer lifts [disabled]` is **still `it.skip`** and is a
  *different* root cause (the host's own `disabled` input assigned as a plain field), not the
  `readOnly` one. An earlier note wrongly said they shared a cause. It needs its own change.
- `[disabled]` only greys the button and blocks the emit; it does not hide the bar.

## Where it is used
- ~21 result-form sections mount it with no `[editable]`, so they depend entirely on `readOnly`
  falling in time — which is exactly the path the trap above describes.

## Tests
- `save-button.contract.cy.ts` — Cypress component tests, the real DOM. 18 passing, 1 skipped.
- `save-button.component.spec.ts` / `save-button.service.spec.ts` — Jest.
