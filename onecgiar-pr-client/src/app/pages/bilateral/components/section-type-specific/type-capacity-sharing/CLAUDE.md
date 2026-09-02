# type-capacity-sharing (bilateral)

**Verified:** 2026-09-02 · branch performance-refactor · 2de8884cd

## What it is
Section 5 of the bilateral form: Capacity Sharing for Development. Shows the **MDS** (3 mandatory
fields) and hides the rest of the pooled-funding form behind the **Complete full metadata** button.

## Contract
- Endpoints: **the same ones pooled funding's summary uses** —
  `GET/PATCH results/summary/capacity-developent/(get|create)/result/:id` (the server's own typo) via
  `BilateralApiService.GET_capacityDevelopment` / `PATCH_capacityDevelopment`, plus the catalogues
  `GET_capdevsDeliveryMethod` and `GET_capdevsTerms`. No bilateral-specific endpoint.
- State: `body` is the server's `CapdevDto`; `capdevTermId1` / `capdevTermId2` are local UI state for
  the term cascade, reconciled into `body.capdev_term_id` by `syncCapdevTermId()`. Payload is `{ ...body }`.
- Saving goes through `BilateralAutoSaveService.schedulePayload('typeSpecific', …, { statusKey:
  'type-specific' })`. `PATCH_capacityDevelopment` on `BilateralApiService` has **no other caller** in
  the client, and `patchByEndpoint`'s `typeSpecific` case throws
  (`../../../services/bilateral-auto-save.service.ts:427`), so `queueTypeSave()` is provably the only
  route to that endpoint from this app.
- Load flag: `loaded = signal<boolean | null>(null)` — `null` in flight, `true` loaded, `false` failed.
  **Every write is gated on `=== true`** in `queueTypeSave()`.
- Green check: `BilateralMdsTrackerService.setSectionFields('type-specific', …)`. **Three items only**:
  `people-trained`, `delivery-method`, `length-of-training`.
- Toggle: `BilateralExpandableStateService.get/setShowAllFields(resultId, 'type-specific')`.
- Catalogues: `InstitutionsService.institutionsList`, already loaded in root.

## Where it is used
- `../section-type-specific.component.html` — rendered when the result type is Capacity Sharing.

## Traps (⚠️ = already broke something)
- ⚠️ **NOTHING may be saved until `loaded() === true`** (P2-3556). The P2-3355 error handler already
  emptied `body` and published the checklist, but it did **not** stop the form from autosaving that
  empty body — and the server reads an empty capacity-sharing payload as a **deletion**:
  the four participant counts are written as `female_using || 0` and friends
  (`onecgiar-pr-server/src/api/results/summary/summary.service.ts:405-408` update branch, `:420-424`
  insert branch), so an **absent** key is stored as **0**; and `institutions` absent (or `[]`) takes
  the `else` branch of `saveCapacityDevelopents` (`:433`, `:460-467`) which calls
  `updateGenericIstitutions(resultId, [], 3, …)`, running `upDateAllInactiveRBI` —
  `set is_active = 0 … where result_id = ? and institution_roles_id = ?`
  (`results_by_institutions/result_by_intitutions.repository.ts:606-650`) — de-activating **every
  stored organization**. The interceptor rethrows every failed response
  (`shared/interceptors/general-interceptor.service.ts:81-83`), so the form painted blank with no
  warning and the first keystroke autosaved that deletion. `null` blocks for the same reason: the GET
  takes 240-620 ms on prtest against an 800 ms debounce. Add a new write path and it MUST go through
  `queueTypeSave()`, never straight to `schedulePayload`.
- ⚠️ **This GET never answers 404, so every error reaching the handler really is one.**
  `getCapacityDevelopents` returns **200 with a null skeleton** when no row exists
  (`summary.service.ts:495-521`; measured on prtest 2-Sep-2026,
  `…/capacity-developent/get/result/999999` → `200 {"result_capacity_development_id":null,…}`), which
  is why `loaded` is set to `false` unconditionally on error. The sibling Policy Change section is the
  opposite — 404 there is the normal state of a new result — so do **not** copy either handler across
  without re-reading the server.
- 🛑 **`institutions` cannot be protected by omitting it — absent and `[]` are the SAME thing to the
  server** (`if (institutions?.length)` … `else` deletes all). Unlike Innovation Development's
  `reference_materials` (P2-3557), there is no "leave the column alone" value for this key, so the
  load gate is the only defence. Never filter or drop it either: `institutions: []` is exactly how
  `onAttendanceChange` persists "not on behalf of an organization", and a test pins that.
- ⚠️ **A failed load shows `app-alert-status status="error"` and disables Save** — reusing the widget
  the section already had for its MDS note. Rendered on `=== false` only: a naive `!loaded()` would
  flash the error on every open while the GET is merely in flight. It sits at the **top** of
  `.tsf-fields`, above the fields it explains — this section's MDS note is halfway down the form, so
  an error next to it would only be read after scrolling past every blank field.
- ⚠️ **The spec's `build()` runs the first change detection**, so `ngOnInit` fires and the default GET
  mock leaves the component `loaded`. Before P2-3556 it did not, which meant the save-flow, cascade
  and attendance assertions were exercising a component that had never initialized; with the gate in
  place such a test can save nothing and passes for the wrong reason.
- ⚠️ **The checklist is published on EVERY outcome, failure included** (P2-3355). Registering it only
  on success left the section with an empty field list, which renders as "0/0 fields" — read as
  "nothing required here" rather than as incomplete. A successful load can only ever read 0/3 .. 3/3.
- ⚠️ **Nothing outside the MDS may enter `setSectionFields` with `filled: false`.** The tracker
  computes `complete` as `filledFields === totalFields`; a fourth empty item leaves the section amber
  forever and **disables Submit** (`overallStatus() === 'complete'`). That is what
  `is_attending_for_organization` used to do (P2-3382) and what the three separate gender counts did
  (P2-3348) — the four counts render as OPTIONAL, so **one grouped item** satisfied by any single
  count is the rule. `0 != null` is true, so a zero counts as answered.
- ⚠️ **`is_attending_for_organization` arrives as a MySQL tinyint (`0`/`1`, sometimes as a string).**
  `normalizeAttendanceValue()` maps it to a real boolean before binding, or the radio shows nothing.
- ⚠️ **Term id 4 is a parent bucket disambiguated by a sub-term (1 or 2); term 3 stands alone.**
  `GET_capdevsTerms` is split by two `splice(0, 2)` calls — first two rows are the SUB-terms, next two
  are the terms. The order of those two lines is load-bearing.
- ⚠️ **A null `currentResultId()` leaves `loaded` at `null`**, so Save stays disabled. `loadData()`
  returns early and there is nothing to save against anyway; the section only renders inside a result.

## Pending / Coming soon
- Read-only mode for Pending Review / Approved / Rejected: **not implemented**, and no bilateral
  section has it — the read-only infrastructure does not exist in the bilateral flow.
