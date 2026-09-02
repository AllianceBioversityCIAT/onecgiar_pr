# type-innovation-dev (bilateral)

**Verified:** 2026-09-02 · branch performance-refactor · 2de8884cd

## What it is
Section 5 of the bilateral form: Innovation Development. Shows the **MDS** (3 mandatory fields) and
hides the rest of the pooled-funding form behind the **Complete full metadata** button (P2-3391,
QA-verified via P2-3327).

## Contract
- Endpoint: **the same one pooled funding's summary uses** —
  `GET/PATCH results/summary/innovation-dev/(get|create)/result/:id` via
  `BilateralApiService.GET_innovationDev` / `PATCH_innovationDev`. There is no bilateral-specific one.
- State: `body` is the server's `CreateInnovationDevDto`. Saving goes through
  `BilateralAutoSaveService.schedulePayload('typeSpecific', …, { statusKey: 'type-specific' })`.
- Green check: `BilateralMdsTrackerService.setSectionFields('type-specific', …)`. **Three items only**:
  `nature`, `developers`, `readiness`. Everything else is full metadata and does not count.
- Toggle: `BilateralExpandableStateService.get/setShowAllFields(resultId, 'type-specific')` — the
  open/closed state survives navigation between sections.
- Catalogues: `InnovationControlListService` (`typeList`, `characteristicsList`,
  `readinessLevelsList`), already loaded in root.
- Phase: `BilateralCreationService.reportingYear()` — the result's own phase year, used by the gate below.

## Where it is used
- `../section-type-specific.component.html` — rendered when the result type is Innovation Development.

## Traps (⚠️ = already broke something)
- ⚠️ **Nothing outside the MDS may enter `setSectionFields` with `filled: false`.** The tracker
  computes `complete` as `filledFields === totalFields`; a fourth empty item leaves the section amber
  forever and **disables Submit** (`overallStatus() === 'complete'`). Same fall P2-3348, Capacity
  Sharing and Policy Change already took.
- ⚠️ **The Short title 10-word ceiling (P2-3340) is still alive even though the field is no longer MDS.**
  It is reported as an `invalid` item **only when exceeded**, with `filled: true`, so it blocks Submit
  with a reason without touching the percentage. Listing it unconditionally breaks AC9.
- ⚠️ **`SCALING_STUDIES_READINESS_THRESHOLD = 17` is a CLARISA ID, not the number 6.** Readiness
  level 6 is row 17 of `readinessLevelsList`. Pooled funding says the same thing a different way with
  `getReadinessLevelIndex() >= 6`, which is the array index.
- ⚠️ **The scaling-studies question is gated on the PHASE YEAR, and `isP25()` must never be used for it.**
  `showScalingStudies` returns false from `ReportingDesignYear.InnovationDevFormReduction` (2026) on, at
  **every** readiness level (P2-3265); below that it falls back to the old level rule
  (`isReadyForScalingStudies`). The P25 portfolio also holds 2025-phase results, so a portfolio gate
  would strip the question from a 2025 result — which the epic's governing note (Ángel Jarrín,
  23-Aug-2026) forbids absolutely. An unresolved phase year counts as the current phase and hides it.
- ⚠️ **`reference_materials` is OMITTED from the payload when `body` holds no array — never sent as `[]`**
  (P2-3557). The server returns early only for `null`/`undefined`
  (`results/summary/innovation_dev.service.ts:99-101`) and de-activates every stored evidence of type 4
  that any other value — `[]` included — leaves out (`:110-125`). `?? []` therefore deleted the stored
  links whenever `body` never loaded: `loadData()` has **no error handler** and the GET answers a
  server-side exception with HTTP 500, which the interceptor rethrows, so `body` stays `{}` and the
  first keystroke autosaved a wipe. A present array — `[]` from deleting the last row included — is
  still sent, so real deletions still persist. Same fix as the pooled-funding form (`0fca46d3a`,
  P2-3550 AC4). `scaling_studies_urls` needs no such guard: its writer only runs on a truthy
  `.length` (`summary.service.ts:710-731`).
- ⚠️ **The other keys are still `?? null`, so a save after a failed GET blanks them** (short title,
  developers, readiness…). Out of P2-3557's scope and not fixed here; it needs `loadData()` to refuse
  to autosave until the body has actually loaded.
- ⚠️ **Hiding the question does NOT remove the fields from the payload, on purpose.** The PO's note is
  explicit that "Remove" never means delete the data, so `buildPayload` still sends
  `has_scaling_studies` and `scaling_studies_urls`; a value written in an earlier phase must never be
  blanked by a save from the 2026 form. A test pins this.
- ⚠️ **The green check does NOT read `has_scaling_studies` for Innovation Development.** The only
  MySQL function that reads it is `validation_innovation_use_P25` (Innovation **Use**). That is why
  this surface could ship while the W1/W2 half of P2-3265 stays blocked on P2-3494 — do not assume the
  two move together.
- ⚠️ **The spec's `creation` mock must carry `reportingYear`.** `showScalingStudies` calls it, and a
  missing key fails every test in the file as `is not a function`.
- ⚠️ **The MDS note goes at the very top in this section**, while Capacity Sharing and Policy Change
  paint it after their MDS fields. Deliberate: P2-3391 AC1 and P2-3327 AC2 say "at the top".

## Missing from the pooled-funding form (and why)
The three blocks driven by the **questionnaire** (`result_questions`) cannot be mounted today:
| Pooled-funding block | Why it is absent |
|---|---|
| `gesi-innovation-assessment` + `scale-impact-analysis` | P2-3290 (`Open`) replaces them with 2 structured questions |
| `intellectual-property-rights` | P2-3272 (`Open`) consolidates 4 questions into 1 |
| `innovation-team-diversity` | P2-3291 (`Open`) restructures the hierarchy |
| `anticipated-innovation-user`, `megatrends` | **Removed** by P2-3263/P2-3264 — do not revive them |

It would also need things outside this folder: a `GET result-questions/innovation-development/:id` in
`bilateral-api.service.ts`, and reusing components that live in `pages/results/.../innovation-dev-info/`
(declared in an NgModule, not standalone).

## Pending / Coming soon
- AC11 (read-only in Pending Review / Approved / Rejected): **not implemented**, and no bilateral
  section has it — the read-only infrastructure does not exist in the bilateral flow.
- "Investment (USD)" is three `Not available yet` rows — a placeholder inherited from `app-estimates`.
