# type-innovation-use (bilateral)

**Verified:** 2026-09-09 · branch feat/P2-3390-bilateral-investment-tables · 7d0215b13

## What it is
Section 5 of the W3/bilateral result creator when the type is **Innovation Use**. Shows the MDS fields
always, and hides the rest of the pooled-funding form behind **"Complete full metadata"**.
Stories: P2-3428 (build), P2-3424 (link to a QA'd Innovation Development), P2-3331 (QA twin),
P2-3556 (load gate), P2-3390 (the three Investment tables).

## Contract
- No `@Input`/`@Output`: all state travels through services.
- `BilateralCreationService.currentResultId()` — which result; `reportingYear()` — the phase gate.
- `BilateralMdsTrackerService.setSectionFields('type-specific', …)` — **three entries and only three**:
  `use-actors`, `use-measures`, `use-level`. ⚠️ The story's fourth MDS field, `use-investment`, is
  reported in the full metadata and is **NOT published here** — see the trap below. Submit is gated on
  `overallStatus() === 'complete'`, so every extra entry silently raises the bar.
- `BilateralAutoSaveService.schedulePayload('typeSpecific', …)` — autosave, 800 ms debounce.
- Load flag: `loaded = signal<boolean | null>(null)` — `null` in flight, `true` loaded, `false` failed.
  **Every write is gated on `=== true`** at the single choke point `queueTypeSave()`.
- `BilateralExpandableStateService` — remembers the toggle per result + section.
- `InnovationControlListService.useLevelsList` — catalog `{ id, level, name, definition }`. ⚠️ the form
  stores the **`id`** and the gates read the **`level`** → `useLevelNumber`.
- `InnovationUseResultsService.resultsList` — catalog for P2-3424's dropdown (reused from W1/W2).
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
- ⚠️ **Investment is THREE TABLES in the full metadata, optional, and outside the MDS (P2-3390,
  9-Sep-2026).** It replaced the single disabled `Coming soon` amount that sat in the MDS block until
  8-Sep: `investment_bilateral_usd` had no column anywhere and the legacy endpoint dropped it in silence,
  and the amount is per ENTITY, not one total. The section now renders `app-estimates-cgiar` — the same
  component W1/W2 uses — over `investment_programs` / `investment_bilateral` / `investment_partners`, one
  row per entity already linked to the result. **Still not published to the tracker**, now by PO decision
  (Juan David Delgado): optional, and AC16 forbids anything behind the toggle from counting — publishing it
  would raise the bar Submit is gated on. Server side the writer is `ResultInvestmentService`
  (`api/results/result_budget`), reached by this same legacy endpoint; it keys project rows by
  `results_by_projects` and forces `non_pooled_projetct_id = null`. 🛑 **Never send the legacy
  `*_expected_investment` keys from here** — their writer resolves the `non_pooled_project` catalogue and
  drops every bilateral row without an error. Diverges from **P2-3126 AC1** and from QA's "mandatory"
  recommendation on purpose. Locks: `AC8 / P2-3390 — renders the three investment tables…`,
  `P2-3390 — sends the three investment arrays…` and `does NOT publish use-investment…`.
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
- ⚠️ **`status_id` is not in P2-3424's dropdown catalog.** `getResultsForInnovUse`
  (`result.repository.ts:2645`) selects `id, acronym, phase_year, result_code, name, title` — no status. So
  `isLinkableInnovationDevelopment()` lets an option through when the field is absent; filtering strictly
  would leave the dropdown permanently empty. Assumption: **"QA'd" = `status_id = 2`**, declared by the PO
  (Ángel Jarrín, 23-Aug-2026 on P2-3424) and still awaiting business confirmation.
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

## Pending / Coming soon
- **2030 Use Projection**: only "This is yet to be determined" was built; fields redefined by **P2-3295**.
- **Read-only mode (AC17)**: not implemented and not verified in this section.
- **Making investment mandatory / part of the green check**: would require touching the
  `validation_innovation_use_P25` MySQL function, applied by hand per environment. Out of P2-3390.
