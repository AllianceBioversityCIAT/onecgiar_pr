# rd-annual-updating

**Verified:** 2026-09-29 · branch qa-development-2026-ss (`BIL-RAU-T-4`: `context` input +
`answerChange` output, so a caller with no `dataControlSE.currentResult` can drive the block);
prior: 2026-09-29 · branch qa-development-2026-ss (`BIL-RAU-T-3`: relocated from
`pages/results/pages/result-detail/pages/rd-general-information/components/rd-annual-updating/` to
`shared/components/annual-updating/` so bilateral can mount it without importing from
`pages/results/` — pure move, no behavior change, DD-1); prior: 2026-09-16 · branch
qa-development-2026-ss (SIP-T-5: wired the merge/split catalogue to the broadened,
server-searchable picker); prior: 2026-09-08 · branch performance-refactor (P2-3292 QA findings A/B:
the stored flag is a `tinyint`, not a boolean); prior: 2026-09-03

## What it is

The "Annual updating" block at the very top of General Information. It asks whether the innovation
is still active / still receiving investment, and when the answer is "no" it collects the reasons
(checkbox list, plus a free-text box for the "Other" reason). From the 2026 phase on, Innovation
Development uses the P2-3292 wording for both questions; every earlier phase and Innovation Use
render exactly as they always did.

## Contract

- `@Input() generalInfoBody: AnnualUpdatingGeneralInfoBody` — a **local structural interface**
  (`is_discontinued`, `discontinued_options`, `merge_split_targets`), not the `pages/results`
  `GeneralInfoBody` page model (moved here by `BIL-RAU-T-3` precisely so this component never
  imports from `pages/results/` — bilateral needs it too). W1/W2's `GeneralInfoBody` satisfies it
  structurally; no change to that class. Two-way bound to `is_discontinued` (the stored answer) and
  `discontinued_options[]` (the reasons). The component never persists; the parent saves.
- `@Input() isPhaseOpen = false` — mirrors the parent's phase gate; read only when `context` is
  absent (see "Context input" below).
- `usesStatusTriggerWording: boolean` — **no longer `readonly`** (`BIL-RAU-T-4`). P2-3292 wording
  switch, resolved once at construction like `options` always was, and RE-resolved by
  `ngOnChanges` the moment `context` is bound (see "Context input" below) — W1/W2, which never
  binds `context`, never triggers that re-resolution, so its construction-time value still stands.
- `headerLabel` / `options` — derived from `usesStatusTriggerWording`; also re-resolved in
  `ngOnChanges` alongside it.
- `reasonsHeaderLabel` / `reasonsHeaderHint` (readonly) — P2-3292 Step 2 prompt above the reason
  checklist. Rendered only on the 2026 branch (template gate), never on the legacy one.
- `annualUpdatingEditable` getter = `resolveEditableBase() && !lockedByDiscontinuation`, where
  `resolveEditableBase()` is `context.editable` when `context` is bound, else the original
  `isPhaseOpen && rolesSE.access?.canDdit`; feeds every `[isStatic]` / `[disabled]` in the template
  (P2-2923).
- The radio, the reason checkboxes and the "Other" description are bound `[ngModel]` +
  `(ngModelChange)="onXxx(...)"` (split from two-way `[(ngModel)]` by `BIL-RAU-T-4` so each handler
  can also emit `answerChange`) — see "Context input" below.
- Endpoint: `GET_globalNarratives('updated_innodev_guidance')` via `ResultsApiService`, in `ngOnInit`,
  fills `alertText` (the blue info note shown when the answer is "active").
- State owner: `DataControlService.currentResult` is the source of truth for result type and phase year.

## Context input (BIL-RAU-T-4)

- **`@Input() context?: AnnualUpdatingContext`** — `{ resultId, resultTypeId, phaseYear,
  storedIsDiscontinued, isAdmin, editable }`. Bilateral's substitute for
  `dataControlSE.currentResult.*`, `rolesSE.isAdmin`, `rolesSE.access.canDdit` and `isPhaseOpen`,
  all at once. W1/W2 never binds it.
- **One resolver per read, context first, current source as fallback** — `resolveResultId()`,
  `resolveIsAdmin()`, `resolveEditableBase()`, `resolveStatusTriggerWording()`'s inline reads, the
  `storedIsDiscontinued` getter, and the public `resolvedResultTypeId` getter the template's outer
  `*ngIf` reads. Every one of them checks `this.context` first and only reads `currentResult` /
  `rolesSE` when `context` is `undefined` — never a per-field "is this key present on context"
  check, which would let a caller supply a half-populated context and silently fall through to
  W1/W2 state mid-object.
- **`context.editable` replaces the COMBINATION `isPhaseOpen && rolesSE.access?.canDdit`, not
  either alone** — the bilateral wrapper computes one "can this reporter write right now" boolean
  and has no separate phase gate to mirror `isPhaseOpen` against.
- 🛑 **Construction-time resolution stays construction-time (DD-2) — `ngOnChanges` exists for this
  reason.** `@Input()`s land AFTER the constructor, so `usesStatusTriggerWording` / `headerLabel` /
  `options` (field initializers) can never see `context` on their first evaluation. `ngOnChanges`
  re-resolves those three whenever `changes['context']` fires, including the first time. Scoped to
  `context` specifically, so W1/W2 (which never binds it) never re-resolves and its
  construction-time value stands, unchanged (R-9). See the code comment on `usesStatusTriggerWording`
  for why `ngOnInit` was rejected as the resolution point instead.
- **`@Output() answerChange = new EventEmitter<void>()`** — emits once per mutation: the radio
  (`onAnswerChange`), a reason checkbox (`onReasonToggle`), the "Other" description
  (`onDescriptionChange`), a merge/split selection (`onTargetsChange`, already its own handler —
  the emit was added inside it), and Reopen (`reopenDiscontinuation`). Carries no payload on
  purpose: every consumer already owns `generalInfoBody` by reference (two-way binding never
  existed for `context`-driven callers — see next point), so the event is purely "something
  changed, go persist/stage it," not "here is the new value."
- 🛑 **The template split every `[(ngModel)]` on a field this component now emits for into
  `[ngModel]` + `(ngModelChange)="onXxx(...)"`.** Two-way banana-in-a-box syntax has nowhere to run
  a side effect; the split is what lets `answerChange.emit()` fire alongside the assignment without
  changing what gets assigned or when. `onTargetsChange` needed no split — its two dropdowns were
  already wired through separate `(ngModelChange)` handlers before this task.
- **Falsifier** (full cases + the conflicting-`currentResult` seeds that prove `context` actually
  wins over it): `rd-annual-updating.context.spec.ts`.
- **Not covered here (owned by T-9, the wrapper's own test suite)**: the rendered radio and the
  NG0103 merge/split loop under a REAL context-driven mount — jsdom cannot see either, same
  limitation the merge/split NG0103 notes above already document for the W1/W2 path.

## Where it is used

- `pages/results/pages/result-detail/pages/rd-general-information/rd-general-information.component.html:1`
  — rendered only when `generalInfoBody.is_replicated` is known, which is what makes the
  construction-time resolution safe.
- Declared in `pages/results/pages/result-detail/pages/rd-general-information/rd-general-information.module.ts`
  (the component itself is standalone).

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
- ✅ **Steps 3 and 4 ARE built** (this line said otherwise until 8-Sep-2026). Merge / split stores the
  link in its own table, `result_innovation_merge_split` — NOT in `linked_result`, which has no
  link-type discriminator and whose links the Innovation Use form deactivates on save. Step 4's
  auto-lock is the section above.

## Step 4 — the auto-lock, and why it has an escape (P2-3292)

From the 2026 phase, an Innovation Development result **stored** as inactive locks this block: the
answer, the reason checklist and the "Other" text all go read-only. An administrator does not lock,
and sees a **Reopen this innovation** button that sets the answer back to active and clears every
ticked reason (the parent still owns the save).

- 🛑 **The administrator escape is load-bearing, not a nicety.** `P2-2923` was raised by QA precisely
  because people who closed an innovation by mistake were trapped with no way back — which is why
  `is_discontinued` deliberately does NOT lock result types 7 and 2 in `CurrentResultService`.
  Locking with no way out puts that trap back on purpose. Decision: Yeck, 3 Sep 2026.
- 🥇 **`lockedByDiscontinuation` reads the STORED flag** — `context.storedIsDiscontinued` when
  `context` is bound (BIL-RAU-T-4), else `dataControlSE.currentResult.is_discontinued` — never
  `generalInfoBody.is_discontinued`, which is the value being edited. Reading the form would
  lock the block the instant somebody picked "No" — before confirming — and they could never tick a
  single reason. A spec pins that case (`rd-annual-updating.context.spec.ts` for the `context` path).
- 🛑 **The lock has to close TWO doors.** `[isStatic]` is the escape hatch that forces editability
  despite the global read-only, so `[disabled]` alone does nothing while `annualUpdatingEditable` is
  true. Both are wired, and a spec pins that the hatch closes.
- **Nobody is left in front of a dead form**: a locked reporter gets a notice naming who to ask. The
  notice is hidden from the administrator, who has the button instead.
- ⚠️ **It is a UI lock only.** The server applies no guard to the section-save endpoints (verified
  3 Sep 2026: `results.controller.ts` carries no `@UseGuards`, and `saveGeneralInformation` never
  reads `status_id`, `is_discontinued` or the phase), so a crafted PATCH still goes through. Making
  it a real lock is server work and is not in this story.
- 🛑 **Do NOT implement this as one more write to `rolesSE.readOnly` inside `CurrentResultService`.**
  That switch is followed by the async continuation of `validateReadOnly`, whose last write sets
  `readOnly = false` for any member of the result's initiative — so a lock assigned there can be
  silently overwritten. This is a derived getter for that reason (same shape as `showAiReview`).

## Traps (⚠️ = already broke something)

- 🛑 **`is_discontinued` arrives as the NUMBER 1, not `true`** — it is a MySQL `tinyint(1)`, and both
  `GET .../get/general-information/result/:id` and `GET .../results/get/:id` answer `1` / `0`
  (measured on prtest 8-Sep-2026, result 6432). This broke TWO things at once and QA reported them
  as separate findings on 7-Sep:
  - the Yes/No radio rendered **blank** on every reload of a discontinued result, because
    `app-pr-radio-button` matches its `optionValue` (`false` / `true`) by identity and `1 === true`
    is false. Everything around it kept working — the ticked reason, the merge/split targets, the
    DISCONTINUED badge — because they are all read with **truthiness**, which `1` satisfies. That
    asymmetry is the fingerprint of this defect.
  - `lockedByDiscontinuation` and `canReopenDiscontinuation` compared `=== true`, so on a real
    discontinued result the lock never closed and the reopen button never rendered, for either role.
  Both now go through `toNullableBoolean` (`shared/utils/nullable-boolean.util.ts`); the parent
  normalises the payload once, this component normalises the stored flag it reads from
  `currentResult`. 🥇 The call sites keep `=== true` on purpose: `null` (never answered) must not lock.
- ⚠️ **A fixture that seeds a boolean cannot see it.** Every Step 4 spec seeded
  `is_discontinued: true` and all of them were green while the defect was live in production — the
  same shape as the length pin replaced in P2-3603. The `the stored flag arrives as a MySQL tinyint`
  describe feeds `1` / `0` / `null` and is the guard that can actually fail.
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

## Merge/split catalogue search (SIP-T-5)

`searchMergeSplitCatalogue(term)` wires `(searchTextChange)` on both `app-pr-multi-select`
instances to `GET_mergeSplitTargetInnovations(resultId, term)` (server-side search, `SIP-T-3`).

- 🛑 **Deliberately not gated by `mergeSplitCatalogueRequested`** — that flag exists only to stop
  the initial `loadMergeSplitCatalogue()` firing twice; reusing it here would make every search
  after the first a silent no-op.
- **Selection-preserving merge**: a candidate the search response drops but that is still
  referenced by `generalInfoBody.merge_split_targets` (either transition type) is carried over
  from the previous catalogue, so narrowing the search can never make an already-picked target
  vanish from what the dropdown can display.
- **Reference stability**: `mergeSplitCatalogue` is only reassigned a new array reference when its
  content actually changed (id-by-index compare) — same discipline as `selectedTargets()` /
  `selectionCache`, applied to the catalogue array itself.
- Both fetches share one label-mapping helper (`mapMergeSplitCandidates`), so `loadMergeSplitCatalogue`
  and `searchMergeSplitCatalogue` never drift on the `"code - title"` label rule.
- The two dropdown `description` strings no longer say "quality-assessed" (`SIP-R-4`/`SIP-AC-4`:
  eligibility is now any active, non-discontinued Innovation Development result). Kept identical
  between merge and split, as before.

## Pending / Coming soon

Nothing is disabled here. What is still missing from P2-3292, and who owns it:
| Piece | Owner | Why not here |
|---|---|---|
| The seven 2026 reason **texts** | Juan David Delgado | Rows of `investment_discontinued_option`; the table has no phase axis, so they must be new rows, never an `UPDATE` (see the pre-plan on P2-3292, 1-Sep). |
| Green check rule | Juan David Delgado | MySQL `validation_<section>_<portfolio>` + `validate_sections_mapped_batch`. |
