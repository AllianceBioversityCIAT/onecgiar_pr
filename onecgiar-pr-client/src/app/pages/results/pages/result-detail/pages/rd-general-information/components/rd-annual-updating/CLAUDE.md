# rd-annual-updating

**Verified:** 2026-08-31 · branch performance-refactor · 4ffec6d4a

## What it is
The "Annual updating" block at the very top of General Information. It asks whether the innovation
is still active / still receiving investment, and when the answer is "no" it collects the reasons
(checkbox list, plus a free-text box for the "Other" reason).

## Contract
- `@Input() generalInfoBody: GeneralInfoBody` — two-way bound to `is_discontinued` (the stored
  answer) and `discontinued_options[]` (the reasons). The component never persists; the parent saves.
- `@Input() isPhaseOpen = false` — mirrors the parent's phase gate.
- `usesStatusTriggerWording: boolean` (readonly) — P2-3292 wording switch, resolved **once at
  construction**, same as `options` always was.
- `headerLabel` / `options` — derived from `usesStatusTriggerWording`.
- `annualUpdatingEditable` getter = `isPhaseOpen && rolesSE.access?.canDdit`; feeds every
  `[isStatic]` / `[disabled]` in the template (P2-2923).
- Endpoint: `GET_globalNarratives('updated_innodev_guidance')` via `ResultsApiService`, in `ngOnInit`,
  fills `alertText` (the blue info note shown when the answer is "active").
- State owner: `DataControlService.currentResult` is the source of truth for result type and phase year.

## Where it is used
- `rd-general-information.component.html:1` — rendered only when `generalInfoBody.is_replicated`
  is known, which is what makes the construction-time resolution safe.
- Declared in `rd-general-information.module.ts:22` (the component itself is standalone).

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
- A `phase_year` arriving as a string is treated as a bad payload and falls back to the legacy
  wording (`typeof === 'number'` guard). Do not "fix" that with `Number()`.
- `usesStatusTriggerWording` is a field, not a getter: a test must seed
  `DataControlService.currentResult` **before** `TestBed.createComponent` (see the spec's `buildFor`).
- Rendering a second fixture in this spec requires destroying the shared `beforeEach` one first —
  it is still attached to `ApplicationRef` and seeding `currentResult` flips its outer `*ngIf`
  mid-tick (NG0100).
- The outer `*ngIf` limits the whole block to result types **7** (Innovation Development) and
  **2** (Innovation Use). Only type 7 ever gets the 2026 wording.

## Pending / Coming soon
- Nothing disabled here. P2-3292's merge/split link is a separate step and is not in this component.
