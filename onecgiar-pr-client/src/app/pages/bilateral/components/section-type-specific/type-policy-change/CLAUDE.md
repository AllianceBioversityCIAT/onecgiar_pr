# type-policy-change (bilateral)

**Verified:** 2026-09-02 · branch performance-refactor · 2de8884cd

## What it is
Section 5 of the bilateral form: Policy Change. Shows the **MDS** (3 mandatory fields) and hides the
rest of the pooled-funding form behind the **Complete full metadata** button.

## Contract
- Endpoints: **the same ones pooled funding's summary uses** —
  `GET/PATCH results/summary/policy-changes/(get|create)/result/:id` via
  `BilateralApiService.GET_policyChanges` / `PATCH_policyChanges`, plus
  `GET results/questions/policy-change/:id` (`GET_policyChangesQuestions`). No bilateral-specific one.
- State: `body` is the server's `PolicyChangesDto`; `questions` holds the questionnaire and
  `relatedTo` its selected option id. The payload is `{ ...body, ...questions }`.
- Saving goes through `BilateralAutoSaveService.schedulePayload('typeSpecific', …, { statusKey:
  'type-specific' })`. `PATCH_policyChanges` on `BilateralApiService` has **no other caller** in the
  client, and `patchByEndpoint`'s `typeSpecific` case throws (`../../../services/bilateral-auto-save.service.ts:427`),
  so `queueTypeSave()` is provably the only route to that endpoint from this app.
- Load flag: `loaded = signal<boolean | null>(null)` — `null` in flight, `true` loaded (**404 counts
  as loaded**, see the traps), `false` failed. **Every write is gated on `=== true`** in `queueTypeSave()`.
- Green check: `BilateralMdsTrackerService.setSectionFields('type-specific', …)`. **Three items only**:
  `policy-type`, `policy-stage`, `policy-institutions`.
- Toggle: `BilateralExpandableStateService.get/setShowAllFields(resultId, 'type-specific')`.
- Catalogues: `PolicyControlListService` (`policyTypesList`, `policyStages`), `InstitutionsService`.

## Where it is used
- `../section-type-specific.component.html` — rendered when the result type is Policy Change.

## Traps (⚠️ = already broke something)
- 🛑 **This GET answers HTTP 404, not 200, for a result that has no `results_policy_changes` row yet.**
  `getPolicyChanges` throws `{ status: 404, message: 'Results Innovations Dev not found' }`
  (`onecgiar-pr-server/src/api/results/summary/summary.service.ts:1104-1110`) and the controller's
  `ResponseInterceptor` copies that field onto the real HTTP status
  (`shared/Interceptors/Return-data.interceptor.ts:46`). Measured on prtest 2-Sep-2026:
  `GET summary/policy-changes/get/result/999999` → `404 {"response":{}}`. So **404 is the ordinary
  state of every brand-new policy change** and `loaded` is set to `true` for it — an empty body is
  then the truth. Treating it as a failed fetch would disable Save forever on a new result and make
  the section impossible to complete. Its two sibling sections both answer 200 with a null skeleton
  instead; do not copy their error handler here verbatim.
- ⚠️ **NOTHING may be saved until `loaded() === true`** (P2-3556). `body` is built as `{}`, so a form
  that never loaded is indistinguishable from a form the user emptied — and the server reads an empty
  body as a **deletion**: `institutions` absent (or `[]`) takes the `else` branch of
  `savePolicyChanges` (`summary.service.ts:1021`, `:1048-1054`) which calls
  `updateGenericIstitutions(resultId, [], 4, …)`, running `upDateAllInactiveRBI` —
  `set is_active = 0 … where result_id = ? and institution_roles_id = ?`
  (`results_by_institutions/result_by_intitutions.repository.ts:606-650`) — and de-activating **every
  stored implementing organization**; `amount` absent becomes `amount || null` (`:996`). `loadData()`
  had no error handler at all and the interceptor rethrows
  (`shared/interceptors/general-interceptor.service.ts:81-83`), so the form painted blank with no
  warning and the first keystroke autosaved that deletion. `null` blocks for the same reason: the GET
  takes 180-280 ms on prtest against an 800 ms debounce. Add a new write path and it MUST go through
  `queueTypeSave()`, never straight to `schedulePayload`.
- 🛑 **`institutions` cannot be protected by omitting it — absent and `[]` are the SAME thing to the
  server** (`if (institutions?.length)` … `else` deletes all). Unlike Innovation Development's
  `reference_materials` (P2-3557), there is no "leave the column alone" value for this key, so the
  load gate is the only defence. Never filter or drop it either: `institutions: []` is exactly how a
  user's removal of the last organization persists, and a test pins that.
- ✅ **`optionsWithAnswers` needs no guard**: its writer is `for (const answer of optionsWithAnswers ?? [])`
  (`summary.service.ts:1057`), a no-op when absent or empty.
- ⚠️ **A failed load shows `app-alert-status status="error"` and disables Save** — reusing the widget
  the section already had for its MDS note. Rendered on `=== false` only: a naive `!loaded()` would
  flash the error on every open while the GET is merely in flight, and a 404 is not an error. It sits
  at the **top** of `.tsf-fields`, above the fields it explains — this section's MDS note is halfway
  down the form, so an error next to it would only be read after scrolling past every blank field.
- ⚠️ **The spec's `build()` runs the first change detection**, so `ngOnInit` fires and the default GET
  mock leaves the component `loaded`. Before P2-3556 it did not, which meant the save-flow assertions
  were exercising a component that had never initialized; with the gate in place such a test can save
  nothing and passes for the wrong reason.
- ⚠️ **Nothing outside the MDS may enter `setSectionFields` with `filled: false`.** The tracker
  computes `complete` as `filledFields === totalFields`; a fourth empty item leaves the section amber
  forever and **disables Submit** (`overallStatus() === 'complete'`). That is exactly what the
  related-to question used to do (P2-3382/P2-3388) — it is full metadata and must never be tracked.
- ⚠️ **The MDS tracker's stage item is labelled `Stage`, matching the template, not "Policy stage"**
  (P2-3383). The AC calls it "Stage in policy process"; renaming the visible field is P2-3377.
- ⚠️ **The related-to question sits inside the full-metadata toggle but OUTSIDE the `policy_type_id == 1`
  gate.** That gate is AC6 and covers only USD amount and Status; nesting the question under it hid it
  for policy types 2 and 3.
- ⚠️ **If the questions GET fails the section still saves** — `optionsWithAnswers` is then absent, which
  the server ignores, so no data is lost. But `onRelatedToChange` silently does nothing (the `forEach`
  runs on `undefined`), so the user's answer is dropped without a warning. Out of scope for P2-3556
  (lost edit, not data loss) and not fixed.
- ⚠️ **A null `currentResultId()` leaves `loaded` at `null`**, so Save stays disabled. `loadData()`
  returns early and there is nothing to save against anyway; the section only renders inside a result.

## Pending / Coming soon
- Read-only mode for Pending Review / Approved / Rejected: **not implemented**, and no bilateral
  section has it — the read-only infrastructure does not exist in the bilateral flow.
