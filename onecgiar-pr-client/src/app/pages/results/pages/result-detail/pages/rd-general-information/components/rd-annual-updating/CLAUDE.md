# rd-annual-updating

**Verified:** 2026-09-03 · branch performance-refactor

## What it is
The "Annual updating" block at the very top of General Information. It asks whether the innovation
is still active / still receiving investment, and when the answer is "no" it collects the reasons
(checkbox list, plus a free-text box for the "Other" reason). From the 2026 phase on, Innovation
Development uses the P2-3292 wording for both questions; every earlier phase and Innovation Use
render exactly as they always did.

## Contract
- `@Input() generalInfoBody: GeneralInfoBody` — two-way bound to `is_discontinued` (the stored
  answer) and `discontinued_options[]` (the reasons). The component never persists; the parent saves.
- `@Input() isPhaseOpen = false` — mirrors the parent's phase gate.
- `usesStatusTriggerWording: boolean` (readonly) — P2-3292 wording switch, resolved **once at
  construction**, same as `options` always was.
- `headerLabel` / `options` — derived from `usesStatusTriggerWording`.
- `reasonsHeaderLabel` / `reasonsHeaderHint` (readonly) — P2-3292 Step 2 prompt above the reason
  checklist. Rendered only on the 2026 branch (template gate), never on the legacy one.
- `annualUpdatingEditable` getter = `isPhaseOpen && rolesSE.access?.canDdit`; feeds every
  `[isStatic]` / `[disabled]` in the template (P2-2923).
- Endpoint: `GET_globalNarratives('updated_innodev_guidance')` via `ResultsApiService`, in `ngOnInit`,
  fills `alertText` (the blue info note shown when the answer is "active").
- State owner: `DataControlService.currentResult` is the source of truth for result type and phase year.

## Where it is used
- `rd-general-information.component.html:1` — rendered only when `generalInfoBody.is_replicated`
  is known, which is what makes the construction-time resolution safe.
- Declared in `rd-general-information.module.ts:22` (the component itself is standalone).

## The reason checklist is ONE phase generation (P2-3292 Step 2)

`investment_discontinued_option` has no phase column beyond `phase_year_from`, which marks the phase
a reason was introduced for. The six original rows carry `NULL` (the base generation); the seven
2026 ones carry `2026`. The endpoint serves exactly one generation — the newest at or below the
result's phase year — so the checklist never mixes the two.

- The year travels on `GET_investmentDiscontinuedOptions(result_type_id, phase_year)` from
  `rd-general-information.component.ts`. 🛑 It comes from `FieldsManagerService.phaseYear`, **not**
  from the general-information payload that call sits inside: that endpoint answers
  `phase_year: 2025` for a result the screen shows in Reporting 2026. An unknown year sends nothing,
  which asks for the legacy catalogue.
- ⚠️ **`needsDescription()` replaced the hardcoded `investment_discontinued_option_id == 6`.** The
  2026 "Other" row is a new row with an AUTO_INCREMENT id, so under the old rule its free-text box
  would never have rendered and the reason could not have been typed at all. A row that declares
  `requires_description` wins; only a row that says nothing falls back to the id, which is how the
  legacy "Other" keeps working **without being rewritten** — flagging it would have meant an UPDATE
  on a catalogue row a 2025-phase result still renders.
- ⚠️ **The green check still only knows the legacy "Other".** `validation_innovation_dev_P22`
  requires `description` when `investment_discontinued_option_id = 6`; the 2026 "Other" row is a
  different id and nothing demands its text. That branch is in the MySQL validation function, not
  here.
- 🛑 **Steps 3 and 4 of the story are NOT built.** Merge / split has nowhere to store the link
  (`linked_result` carries no link-type discriminator), so the two reasons record *that* the
  innovation merged or split but not *with what*. The auto-lock of Step 4 is waiting on the A/B
  question published on the ticket on 31 Aug 2026.

## Traps (⚠️ = already broke something)
- ⚠️ **The 2026 label is a question, so it must pass `[useColon]="false"`.** `app-pr-field-header`
  appends `':'` to every label unless told otherwise (`pr-field-header.component.html:8`, and
  `useColon` defaults to `true` at `pr-field-header.component.ts:18`). The block shipped reading
  "Is this innovation active and receiving investment?:" — question mark then colon. The template
  now passes `[useColon]="!usesStatusTriggerWording"`, so the colon disappears only in the 2026
  branch and the legacy label keeps it verbatim. Repo convention for any question-shaped label:
  `megatrends.component.html:4`, `stage-assessment.component.html:12`, `estimates.component.html:9`,
  `innovation-links.component.html:6`, `innovation-team-diversity.component.html:2`.
- ⚠️ **Asserting on `headerLabel` cannot see the colon.** Twelve class-field tests passed while the
  defect above was live; only a rendered-DOM read caught it. Keep the
  `as rendered in the DOM` describe in the spec — it is the guard.
- ⚠️ **The 2026 gate is the PHASE YEAR, never the portfolio.** prtest holds phase-2025 results
  inside portfolio P25, so `isP25()` would reword the block for those too and break epic P2-3243's
  rule that earlier phases render exactly as they do today. `resolveStatusTriggerWording()` compares
  `currentResult.phase_year` (falling back to the open phase) against a **local** 2025/2026 constant
  — deliberately not added to `ReportingDesignYear`.
- ⚠️ **The open-phase fallback here now DIVERGES from `FieldsManagerService` (P2-3558).** The eight
  `*2026` gates in that service dropped their `?? reportingCurrentPhase?.phaseYear` fallback, because
  it resolves to the OPEN phase (2026) and therefore rendered the NEW form over a result whose own
  year had not arrived — 1516 phase-2025 results against 353 phase-2026 in prtest. This component
  still has the fallback: it reads `dataControlSE.currentResult` (the plain object, a different
  source from the signal) and its own reachability was not measured under P2-3558, so it was left
  unchanged rather than changed unverified. **Do not copy this shape into a new gate** — the
  reference is `FieldsManagerService.isPhaseYearAtLeast`.
- A `phase_year` arriving as a string is treated as a bad payload and falls back to the legacy
  wording (`typeof === 'number'` guard). Do not "fix" that with `Number()`.
- `usesStatusTriggerWording` is a field, not a getter: a test must seed
  `DataControlService.currentResult` **before** `TestBed.createComponent` (see the spec's `buildFor`).
- Rendering a second fixture in this spec requires destroying the shared `beforeEach` one first —
  it is still attached to `ApplicationRef` and seeding `currentResult` flips its outer `*ngIf`
  mid-tick (NG0100).
- The outer `*ngIf` limits the whole block to result types **7** (Innovation Development) and
  **2** (Innovation Use). Only type 7 ever gets the 2026 wording.
- ⚠️ **Step 1 left the reason checklist with no prompt on the 2026 branch.** Up to 2025 the lead-in
  is part of the second radio label ("...investment was discontinued, because:"); Step 1 replaced
  that label with a bare "No", so the checklist rendered headless. The Step 2 prompt
  (`rd-annual-updating.component.html:34-43`) fills that gap and is gated on
  `usesStatusTriggerWording` for exactly this reason — adding it to the legacy branch would print
  the lead-in twice on 2025 results.
- The Step 2 hint passes `[showDescriptionLabel]="false"`, otherwise `app-pr-field-header` prefixes
  it with a bold `Description:` chip (`pr-field-header.component.ts:26-28`).

## Pending / Coming soon
Nothing is disabled here. What is still missing from P2-3292, and who owns it:
| Piece | Owner | Why not here |
|---|---|---|
| The seven 2026 reason **texts** | Juan David Delgado | Rows of `investment_discontinued_option`; the table has no phase axis, so they must be new rows, never an `UPDATE` (see the pre-plan on P2-3292, 1-Sep). |
| Step 3 merge / split links | Juan David Delgado | `linked_result` has no link-type discriminator, and no portfolio-wide QA'd innovation endpoint exists. |
| Step 4 auto-lock / view-only | blocked on business | A/B question published on P2-3292 on 31-Aug (can a mistaken discontinuation be reopened?). Locking undoes the P2-2923 fix, so it waits for the answer. |
| Green check rule | Juan David Delgado | MySQL `validation_<section>_<portfolio>` + `validate_sections_mapped_batch`. |
