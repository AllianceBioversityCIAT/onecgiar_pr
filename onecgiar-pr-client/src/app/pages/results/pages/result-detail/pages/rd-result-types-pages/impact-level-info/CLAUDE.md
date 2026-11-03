# impact-level-info

**Verified:** 2026-11-03 · branch qa-development-2026-ss · (uncommitted) · spec `results/impact-results-reporting/impact-previous-results-dropdown` IPD-T-2 (page wired to the inline dropdown + selected list; dialog removed); prior: 2026-11-01 · branch qa-development-2026-ss · (uncommitted) · spec `results/impact-results-reporting/result-detail-impact` IRD-T-8 rework F-5/F-7 (picker Escape closes only an open filter dropdown; study-type definitions only in the field description); prior: IRD-T-8 rework F-2/F-3/F-4: previous-results picker type filter labels type 9 via `resultTypeFilterLabel`; a successful save bumps `SaveButtonService.savedTick` (clears field-card "Unsaved changes"); hidden `appFeedbackValidation` markers feed the bottom bar (Yes/No answered, statement within 100 words, Yes => at least one link); prior: 2026-10-31 · branch qa-development-2026-ss · `docs/specs/results/impact-results-reporting/result-detail-impact` `IRD-T-4` rework 2 (portfolio in phase labels, labelled filter groups, real-keyboard CT; copy/placement to confirm at `IRD-T-8`); prior: `IRD-T-3`

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
  the dropdown field (the focused button is destroyed with its row).
- Dirty tracking snapshots `buildBody()` (the save shape), so `''` vs `null` statements are not "dirty".
- `canDeactivate: [UnsavedChangesGuard]` lives on the INNER route in `impact-level-info-routing.module.ts`;
  the component implements `hasUnsavedChanges()` / `saveSection()`.
- Read-only: the `pr-*` fields render as text on their own; the dropdown field and the Remove buttons are hidden by `readOnly`.

## Previous-results dropdown (`IPD-T-1/T-2`, `components/previous-results-picker/`)
- Inline, controlled, standalone `app-previous-results-picker` (no dialog, no `HlmDialogService`). Page binds
  `[resultId]`, `[selection]="previousResults"` and `(selectionChange)="onSelectionChange($event)"`; every pick /
  Clear selection emits the WHOLE next array and the page replaces `previousResults` with a new one (never mutate
  in place: the dirty check compares `buildBody()`). Nothing is stored until the section Save. Read-only: no
  dropdown, no remove buttons, the "Results selected (N)" list still renders.
- Below the field: "Results selected (N)" + one line per result with a remove icon button
  (`aria-label="Remove result <code>"`, `data-cy="impact-remove-result"`). `removePreviousResult` renders, then
  focuses the next remove button, else the previous, else the dropdown field via `picker.focusField()`
  (`@ViewChild(PreviousResultsPickerComponent)`). Field header: `app-pr-field-header` "Please select a result" (required).
- Picker internals: first open triggers E5 + filter catalogs; one request per typing burst (300 ms debounce),
  `switchMap` drops stale responses; filters reset to page 1; params carry `excludeResultId` and `limit: 20`.
  Portfolio segment comes from `GET_versioning(ALL, REPORTING)` rows (`obj_portfolio`), types from `GET_resultTypes()`.
- Keyboard / Escape closing the panel and focus return are proven in `impact-level-info.picker.cy.ts` (rewritten in IPD-T-3).

## IRD-T-8 rework (F-2, F-3, F-4)

- F-2: picker type options use `resultTypeFilterLabel(id, name)` (type 9 reads `Impact result / Impact contribution`; value unchanged).
- F-3: `performSave` success tap does `saveButtonSE.savedTick.update(n => n + 1)`; field cards clear their chip on it. Failure does not bump.
- F-4: `SectionBottomBarComponent` counts `.pr-field.mandatory:not(.complete)`. `app-pr-yes-or-not` renders no marker and `app-pr-textarea` ignores the word limit, so hidden `appFeedbackValidation` divs report: Yes/No answered, statement not over `maxWords`, and (only when Yes) `previousResults.length > 0` (label "Please select a result"). Module imports `FeedbackValidationDirectiveModule`.
- F-5: superseded by IPD-T-1: the dialog is gone; the inline picker closes its panel on Escape and returns focus to its field.
- F-7: study-type definitions appear once, in the select's description (`studyTypeDescription`); the repeated line under the select (`selectedDefinition`, `impact-study-definition`) was removed.
