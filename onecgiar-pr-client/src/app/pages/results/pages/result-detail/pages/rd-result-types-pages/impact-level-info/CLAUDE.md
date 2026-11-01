# impact-level-info

**Verified:** 2026-11-01 · branch qa-development-2026-ss · (uncommitted) · spec `results/impact-results-reporting/result-detail-impact` IRD-T-8 rework F-2/F-3/F-4: previous-results picker type filter labels type 9 via `resultTypeFilterLabel`; a successful save bumps `SaveButtonService.savedTick` (clears field-card "Unsaved changes"); hidden `appFeedbackValidation` markers feed the bottom bar (Yes/No answered, statement within 100 words, Yes => at least one link); prior: 2026-10-31 · branch qa-development-2026-ss · `docs/specs/results/impact-results-reporting/result-detail-impact` `IRD-T-4` rework 2 (portfolio in phase labels, labelled filter groups, real-keyboard CT; copy/placement to confirm at `IRD-T-8`); prior: `IRD-T-3`

## What it is
Section of a **P25 Impact contribution** result (`result_type_id = 9`, portfolio P25 only): study type,
CGIAR contribution statement (max 100 words), "Already reported in PRMS?" and the previous results linked.
Route: `/result/result-detail/<code>/impact-level-info?phase=<id>` (entry sits right after `evidences`
in `resultDetailRouting`, not in `rdResultTypesPages` — `IRD-DD-1`). Mirrors `policy-change-info` (`IRD-DD-2`).

## Contract
- State lives in the component: `impactStudyTypeId`, `cgiarContribution`, `previouslyReported`,
  `previousResults[]`; `studyTypes` / `sectionLoading` / `loadError` / `saving` are signals.
- Endpoints (`ResultsApiService`, `{response,message,status}` envelope):
  - `GET_impactStudyTypes()` (E2) + `GET_impactLevelInfo(resultId)` (E3), loaded together with `forkJoin`.
  - `PATCH_impactLevelInfo(resultId, body)` (E4). Body is ALWAYS the four keys
    `impact_study_type_id, cgiar_contribution, previously_reported, previous_result_ids`;
    No (or unanswered) sends `previous_result_ids: []`; a blank statement goes as `null`.
- Word count is `countWords` (`shared/utils/impact-word-count.util.ts`, a port of the server's
  `count-words.ts`, `IRD-DD-3`) passed to `app-pr-textarea [wordCounterFn]`. Over 100 words blocks the save
  with an error alert; the client never sends a body the server would reject for word count.
- The green check is NOT computed here. The interceptor reloads it after any successful PATCH on a
  `/result/result-detail/` route (E4's URL is not in `notValidateList`); the spec proves it with the real
  `GeneralInterceptorService`.

## Behaviour that is easy to break
- ⚠️ **Load failure (E2 or E3) must NOT render the form.** An empty form would read as "nothing saved" and
  a Save would overwrite stored values. `loadError` hides the form, shows the banner and disables save;
  `saveSection()` returns `false` without calling E4, and no snapshot exists so the leave guard stays quiet.
- ⚠️ **A 400 keeps the input.** The error handler only shows the server message (string or list joined);
  it never rehydrates. Success rehydrates from the E4 response and snapshots inside the success `tap`.
- ⚠️ **Yes -> No with links asks first, and the revert must reach the CONTROL.** `app-pr-yes-or-not` writes
  "No" into itself and ngModel BEFORE emitting `selectOptionEvent`; resetting only the model is invisible
  (the `[ngModel]` binding value is unchanged, so ngModel never calls `writeValue`) and leaves the toggle on
  "No" over a Yes model. `onPreviouslyReportedChange(false)` therefore sets the model to `true` AND calls
  `writeValue(true)` on the `@ViewChild(PrYesOrNotComponent)`; the confirm callback (DOM listener, hence
  `markForCheck`) sets No, clears links and calls `writeValue(false)` the same way. Cancel changes nothing.
  Spec clicks the real "No" `.choice` and asserts the `.yes` class.
- **Accessibility (IRD-NFR-1).** The shared `pr-word-counter` is not live and stays untouched (21 consumers);
  the page adds an `sr-only` `role="status" aria-live="polite"` span ("N of 100 words", server count). After
  Remove, `removePreviousResult` renders, then focuses the next row's Remove button, else the previous, else
  "Add results" (the focused button is destroyed with its row).
- Dirty tracking snapshots `buildBody()` (the save shape), so `''` vs `null` statements are not "dirty".
- `canDeactivate: [UnsavedChangesGuard]` lives on the INNER route in `impact-level-info-routing.module.ts`;
  the component implements `hasUnsavedChanges()` / `saveSection()`.
- Read-only: the `pr-*` fields render as text on their own; Add/Remove buttons are hidden by `readOnly`.

## Previous-results picker (`IRD-T-4`, `components/previous-results-picker/`)
- Standalone `app-previous-results-picker`, opened by `openPreviousResultsPicker()` through `HlmDialogService.open(...,
  { context })`. ⚠️ The service cannot bind `@Input()`s: the picker reads `{ resultId, initialSelection }` from
  `injectBrnDialogContext` (null under Jest, where `@spartan-ng/brain` is a stub — the spec mocks it). CDK gives
  focus trap, autofocus, Escape and focus restore to "Add results" (the button persists); proven by
  `impact-level-info.picker.cy.ts` (1280 + 900 px, no horizontal scroll).
- Working selection is a copy; the dialog closes with the array on Done and `undefined` on Cancel/Escape. The page
  list is replaced only on Done (`previousResults` is never touched while open — do not call `removePreviousResult` then).
- One request per typing burst (`debounceTime(300)` + `distinctUntilChanged`), `switchMap` on every load (stale
  responses dropped), filters/new query reset to page 1; params always carry `excludeResultId` and `limit: 20`.
- Filters: "Phase / portfolio" = `GET_versioning(ALL, REPORTING)`; each option is labelled by `phaseOptionLabel()`
  (`P25 · Reporting 2025 - (Open)`, from the row's `obj_portfolio.acronym`; plain label when absent). Only
  `versionId` (the phase `id`) is sent, never `portfolioId`. Each filter sits in a `role="group"` with
  `aria-labelledby` on its visible label (the shared selects' triggers are bare `<a tabindex>` with no name).
  Result type = `GET_resultTypes()` (`GET api/results/types/all`, every active `result_type`,
  added in `results-api.service.ts`; `GET_TypeByResultLevel` was NOT used: it is level-grouped and unverified for 9/10/11).
- Keyboard (IRD-NFR-1) is proven with REAL key presses (`cypress-real-events`, `/// <reference types="cypress-real-events" />`
  needed in the spec) in `impact-level-info.picker.cy.ts`: search -> Tab -> phase trigger -> Tab -> its search box ->
  type -> Enter (needs exactly ONE matching option) -> Tab to a type checkbox -> Space -> Tab to Add -> Enter -> Tab
  to Done -> Enter. ⚠️ Shared-component gaps (not edited here): `app-pr-filter-select` options are non-focusable
  `<div (click)>`, so a phase can be chosen by keyboard only by narrowing the search to one option; and its `pick()`
  blurs focus to `<body>` (Tab then resumes from the old position; use `document.activeElement`, not `cy.focused()`).
- `[disabled]` on `hlmBtn` goes through `BrnButton` (stub under Jest): specs assert `hasPrev()/hasNext()` instead.

## Pending
- Study-type definitions are listed in the select description AND shown under the selected option; guide
  placement and exact copy are confirmed at the `IRD-T-8` HITL pause.

## IRD-T-8 rework (F-2, F-3, F-4)

- F-2: picker type options use `resultTypeFilterLabel(id, name)` (type 9 reads `Impact result / Impact contribution`; value unchanged).
- F-3: `performSave` success tap does `saveButtonSE.savedTick.update(n => n + 1)`; field cards clear their chip on it. Failure does not bump.
- F-4: `SectionBottomBarComponent` counts `.pr-field.mandatory:not(.complete)`. `app-pr-yes-or-not` renders no marker and `app-pr-textarea` ignores the word limit, so hidden `appFeedbackValidation` divs report: Yes/No answered, statement not over `maxWords`, and (only when Yes) `previousResults.length > 0`. Module imports `FeedbackValidationDirectiveModule`.
