# type-innovation-use (bilateral)

**Verified:** 2026-09-14 · P2-3424 AC4 — dropdown moved onto the shared QA catalogue (was P2-3428 worktree implementation, 2026-09-09)

## What it is
Section 5 of the W3/bilateral result creator when the type is **Innovation Use**. Shows the MDS fields
always, and hides the rest of the pooled-funding form behind **"Complete full metadata"**.
Stories: P2-3428 (build), P2-3424 (link to a QA'd Innovation Development), P2-3331 (QA twin),
P2-3556 (load gate), P2-3390 (the three Investment tables).

## Contract
- No `@Input`/`@Output`: all state travels through services.
- `BilateralCreationService.currentResultId()` — which result; `reportingYear()` — the phase gate.
- `BilateralMdsTrackerService.setSectionFields('type-specific', …)` — four entries:
  `use-actors`, `use-measures`, `use-level`, `use-investment`. The last one is the W3/bilateral-project
  table only; Submit is gated on `overallStatus() === 'complete'`.
- `BilateralAutoSaveService.schedulePayload('typeSpecific', …)` — autosave, 800 ms debounce.
- Load flag: `loaded = signal<boolean | null>(null)` — `null` in flight, `true` loaded, `false` failed.
  **Every write is gated on `=== true`** at the single choke point `queueTypeSave()`.
- `BilateralExpandableStateService` — remembers the toggle per result + section.
- `InnovationControlListService.useLevelsList` — catalog `{ id, level, name, definition }`. ⚠️ the form
  stores the **`id`** and the gates read the **`level`** → `useLevelNumber`.
- `QaInnovationDevelopmentResultsService.options()` — catalog for P2-3424's dropdown. **The same
  service W1/W2 reads** (`innovation-use-info`), so the two routes cannot offer different lists for
  the same question. `load()` is idempotent; this section calls it from `ngOnInit` when the 2026 gate
  is open.
- Endpoints: `GET/PATCH /api/results/summary/innovation-use/{get|create}/result/:id` via
  `BilateralApiService.GET_innovationUse` / `PATCH_innovationUse`. **The same endpoint serves the legacy
  W1/W2 Innovation Use form** (`results-api.service.ts:460`), so every contract change must be additive
  for that side too.

## Where it is used
- `../section-type-specific.component.html` — the Innovation Use branch of the type switch.

## Traps (⚠️ = already broke something)
- ⚠️ **NOTHING may be saved until `loaded() === true`** (P2-3556). `body` is built as `{}`, so a form that
  never loaded is indistinguishable from a form the user emptied — and `buildPayload()` sends `?? null` /
  `?? []` for every key. `loadData()` had no error handler and the interceptor rethrows every failed
  response (`shared/interceptors/general-interceptor.service.ts:81-83`), so `next` never ran, the form
  painted blank with no warning, and the first keystroke autosaved a wipe. What the empty body does on the
  server, key by key:
  - `innov_use_to_be_determined`, `innovation_use_level_id` → `?? null`, NULLED
    (`api/results/summary/summary.service.ts:104-106`, `:121-123`, `:138-139`).
  - `has_scaling_studies`, `innov_use_2030_to_be_determined`, `readiness_level_explanation`,
    `has_innovation_link` → written whenever the key is present, and it always is → NULLED (`:185-201`).
  - `scaling_studies_urls: []` → `shouldSync` is true for any present key, and the sync de-activates every
    stored row and re-inserts nothing → **every study link deleted** (`:228-245`).
  - `innovatonUse.actors` / `.organization` / `.measures` → **safe**: each writer is guarded on `?.length`
    with **no `else`** (`api/results/summary/innovation_dev.service.ts:158`, `:259`, `:323`). This is where
    the section differs from Policy Change and Capacity Sharing, whose `institutions` `else` branch
    de-activates every stored organization.
  - `linked_results: []` → safe, but only by guard order: the sync needs `has_innovation_link` to be `true`,
    or a `false` retracting a stored `true` (`:273-291`), and an unloaded body sends `null`.
  `null` blocks too: the GET takes **94-159 ms** on prtest (measured 2-Sep-2026) against an 800 ms debounce.
  A new write path MUST go through `queueTypeSave()`, never straight to `schedulePayload`.
- ⚠️ **This GET never answers 404 for "no row yet"** — unlike Policy Change. `getInnovationUse` assembles its
  skeleton with `innUseExists?.x ?? null` and returns 200 either way (`summary.service.ts:301-374`); measured
  on prtest, `…/get/result/999999` → `200` with every key null and the three lists empty. So there is no
  status to whitelist here: every error that reaches the handler really is one, and none of them may write.
- ⚠️ **A failed load shows `app-alert-status status="error"` and disables Save** — the widget the section
  already had. It renders on `=== false` only (a naive `!loaded()` flashes on every open), and sits at the
  TOP of the field list, not beside the MDS note row, which is halfway down this template.
- ⚠️ **The spec's `build()` runs the first change detection**, so `ngOnInit` fires and the default GET mock
  leaves the component `loaded`. Without it every save assertion in the file passes on a component that
  never initialized — which is exactly what it did before P2-3556.
- ⚠️ **Investment is per entity, not one total. P2-3428 makes only W3/bilateral-project investment MDS.**
  The always-visible `investment_bilateral` table requires every active project to have a positive amount
  or explicit `This is yet to be determined`; it is published as `use-investment`. CGIAR Programs and
  partners remain optional under Full Metadata. Server-side `InnovationUseMdsValidator` repeats this rule
  on `submit-for-review`, so direct requests cannot bypass the UI. The same legacy summary writer keys
  bilateral rows by `results_by_projects` and forces `non_pooled_projetct_id = null`. 🛑 **Never send the
  legacy `*_expected_investment` keys from here** — their writer resolves the `non_pooled_project`
  catalogue and drops every bilateral row without an error.
- ⚠️ **The backend already persists everything but the investment (P2-3424).** The DTO
  (`api/results/summary/dto/create-innovation-use.dto.ts`) declares `has_scaling_studies`,
  `scaling_studies_urls`, `innov_use_2030_to_be_determined`, `readiness_level_explanation`,
  `has_innovation_link` and `linked_results`. The controller still has **no `ValidationPipe`**, so an
  undeclared key is lost silently — declare it in the DTO before adding it to the payload.
- ⚠️ **`linked_result` is a SHARED table** with the P22 "Links to results" section. It is only touched when
  the question is answered **Yes** (stores the selection) or when a stored **Yes becomes No** (clears it). A
  "No" that was never a "Yes" touches nothing — otherwise the first autosave would wipe that other section.
- ⚠️ **MySQL returns `tinyint` as `1`/`0` and the radios bind `true`/`false`.** `normalizeStoredBoolean()`
  covers `innov_use_to_be_determined` (P2-3533 — it was missing, and it gates the whole Actors block),
  `has_scaling_studies`, `innov_use_2030_to_be_determined` and `has_innovation_link`.
- 🛑 **The old note here said `status_id` is not in P2-3424's dropdown catalog. That was FALSE, and it
  cost the AC.** `getResultsForInnovUse` (`result.repository.ts:3079` — the line number in the old note
  was stale too) selects `r.status_id` and already filters `IN (2, 6)`. So the client-side filter that
  the note declared inert was doing real work: it demanded `status_id === 2` and silently dropped every
  **Approved (6)** result — which is exactly what a bilateral Innovation Development is. AC4 asks for the
  QA'd Innovation Developments of the previous phase and the dropdown was missing them.
  The fix was not a better filter: this section now reads the shared `QaInnovationDevelopmentResultsService`
  (the W1/W2 catalogue, owned by P2-3422), which resolves phase, statuses and de-duplication server-side.
  **Do not reintroduce a client-side status filter here** — a spec guards it.
- ⚠️ **A link saved earlier survives a catalogue that no longer lists it.** The getter prepends the stored
  id as an option labelled `(linked result outside the QA'd list)`. Without it the select paints empty and
  the next autosave wipes a link the user never touched (AC8/AC9). Same fallback as the W1/W2 twin.
- ⚠️ **`optionLabel="display"` is load-bearing.** `app-pr-select` type-aheads on `optionLabel` and nothing
  else, so `optionLabel="title"` made the Innovation ID unsearchable while AC4 asks for search by **both**
  id and title. `display` is precomputed by the service as `[result_code] - [title]`.
- ⚠️ **PHASE ≠ PORTFOLIO.** P2-3424's gate is `reportingYear() >= 2026` (local constant
  `INNOVATION_LINK_MIN_PHASE_YEAR`), **not** `isP25()`: prtest holds 2025-phase results inside the P25
  portfolio and a portfolio gate would switch the field on for them.
- ⚠️ **"Innovation Use to be Determined" reads backwards:** `=== true` means the use is still to be
  determined → no actor is requested and the Actors MDS item counts as satisfied (AC4). The actors block
  renders on `=== false` only.
- ⚠️ **Raising the use level to 6+ makes `onUseLevelChange()` CLEAR `has_scaling_studies` and
  `scaling_studies_urls`.** The question disappears from 6 up, and without the clear a "Yes" plus three URLs
  kept being saved behind a control the user can no longer see or correct.
- ⚠️ **`showScalingStudies` has NO `level >= 0` guard, on purpose.** `useLevelNumber` is `-1` before a level
  is picked and `-1 < 6` is `true`, so the question shows by default and hides only from 6 up (P2-3428 AC13 /
  P2-3294, confirmed by the PO 26-Aug-2026). W1/W2 applies the same ceiling
  (`innovation-use-form.component.html:338`) but behind a 2026 phase gate; **there is no phase gate here**
  because bilateral only exists from 2026 onwards. Deliberate divergence — do not "align" it.
- The whole spec uses `overrideTemplate`, so the HTML is not compiled in Jest: template facts are asserted by
  reading the `.html` file as text, and copy that QA quotes lives in a constant (`MDS_INFO_NOTE`,
  `LOAD_ERROR_NOTE`).
- A quantitative measure only counts for the MDS with **both unit AND quantity** (AC6).

- **P2-3785 (4b) — actors use the POOLED meaning of `sex_and_age_disaggregation`**: ticked (`true`) =
  the breakdown does NOT apply, only "How many". The old "Sex and age disaggregated data available?"
  Yes/No saved "Yes" as that same `true`, the opposite of every other reader. Rows saved before the fix
  still carry the inverted answer (no backfill yet); unticking keeps their Women/Men so they are not wiped.
  "Age disaggregation not available" persists through the legacy writer only when the key travels.
- **P2-3428 — 2030 Use Projection** (full metadata, optional, not MDS): `body.innovation_use_2030`
  `{ actors, organization, measures }`, stored under `section_id = 2` — the same key the W1/W2 v2
  endpoint uses — through the legacy summary endpoint (`SummaryService.saveInnovationUse` →
  `InnoDevService.saveAnticipatedInnoUser(…, 2)`). "This is yet to be determined" retires the section-2
  rows server-side. Copy (title, guidance note link, question, tooltip) comes from
  `internationalization/innovation-use-2030-projection.copy.ts`, shared with W1/W2. The annual-review
  part of P2-3295 is deliberately absent: bilateral results are never rolled over.
  ⚠️ Current-use lookups by type/unit now skip section-2 rows, and the legacy GET splits them out; before
  this, a section-2 row would have shown up (and been re-saved) as current use.

## Pending / Coming soon
- **Read-only mode (AC17)**: not implemented and not verified in this section.
- **P25/W1-W2 validation functions** are intentionally out of scope; the bilateral UI and server submit
  gate implement P2-3428 independently.
