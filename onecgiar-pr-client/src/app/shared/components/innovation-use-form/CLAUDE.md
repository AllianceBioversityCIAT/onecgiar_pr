# innovation-use-form

**Verified:** 2026-11-10 · qa-development-2026-ss · quick/remove-farmer-helper-note (Nicoleta: italic helper note under Q-b removed, `helper` key dropped); prior: 2026-11-03 · T-7 findings (re-click Households restores the grid; unsaved Households "How many" required); IFC-T-7 fixes (Individuals keeps a hand-set single total; Q-b gap); IFC-T-4 (changes/innovation-use-farmer-count-nature): Farmers follow-up block, gate and Households coupling (uncommitted); prior: 2026-10-20 · yzuniga/p2-3985-bilateral-current-use-update · P2-3985: the Current Use Update rules moved to `shared/utils/current-use-update.util.ts` (shared with the bilateral form); prior: 2026-09-11 · branch performance-refactor · 5791b85b9

## What it is
The shared Innovation Use questionnaire: use level (0-9), narrative/actors blocks, the
"2030 Use Projection" block and the scaling-studies question. One template, two hosts.

## Contract
- `@Input() body` — the host's payload object (`InnovationUseInfoBody` or `IpsrStep1Body`).
- `@Input() saving: boolean` — read-only/disabled state while the host is persisting.
- `@Input() isIpsr: boolean = false` — **host discriminator**, not a portfolio/phase flag. `true`
  only from IPSR Innovation Package step 1. It gates the header block (`.html:1`), the P25-only
  block (`.html:287`) and the P2-3535 scaling-studies retirement (`.ts` → `isScalingStudiesQuestionHidden()`).
- State: `InnovationControlListService.useLevelsList` owns the use-level catalogue;
  `ApiService.dataControlSE.currentResultSignal()?.phase_year` owns the phase year, resolved by the
  private `currentResultPhaseYear()` / `isPhaseYearAtLeast()` pair — **no fallback to
  `reportingCurrentPhase.phaseYear`** (P2-3558).
- No endpoints of its own — every host saves its own body.

## Where it is used
- `src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-use-info/innovation-use-info.component.html:2`
  — the Innovation Use result section (`isIpsr` defaults to `false`).
- `src/app/pages/ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n1/step-n1.component.html:26`
  — IPSR Innovation Package step 1, with `[isIpsr]="true"`.

## Traps (⚠️ = already broke something)
- ⚠️ **Phase year, never portfolio.** Every "2026 onwards" gate here compares `phase_year` against a
  threshold. `isP25()`/`isP22()` are the PORTFOLIO axis and prtest holds 2025-phase results inside
  P25 — a portfolio gate silently rewrites those older forms (repo rule 9).
- ⚠️ **The template is shared, so a change here reaches IPSR step 1 for free.** Any scope limited to
  the Innovation Use section must be fenced with `!isIpsr`. P2-3535 is fenced that way on purpose:
  IPSR step 1 keeps the older P2-3294 level-6 rule until P2-3426 is republished.
- ⚠️ **The scaling-studies question is DOM-unreachable from the IPSR host.** It lives inside
  `@if (isP25() && !isIpsr)` (`.html:287`), so `[isIpsr]="true"` paints no radio in any phase and
  the `isIpsr` level-6 branch of `isScalingStudiesQuestionHidden()` is dead in this template. It is
  kept and unit-tested because P2-3426 may re-enable that branch; do not read a passing unit test on
  it as proof that IPSR step 1 shows the question.
- ⚠️ **Fail towards the LEGACY form on unresolved state.** `isScalingStudiesQuestionHidden()`
  returns `false` when the result's own `phase_year` isn't resolved yet (in-flight load, or a
  non-404 `GET_resultById` failure that leaves `currentResultSignal` at `{}` for good). 🛑 Do NOT
  reintroduce `?? dataControlSE.reportingCurrentPhase?.phaseYear`: that is the OPEN reporting phase
  (2026 today), not this result's phase, so it turned the documented fail-open into a fail-closed
  and hid the question on legacy results — 1516 results sit in the 2025 phase against 353 in 2026
  (measured 2 Sep 2026). Fixed in P2-3558; reference shape is
  `FieldsManagerService.isPhaseYearAtLeast` (commit `8afb574f3`, eight sibling gates).
- **"Remove" never means delete the data** (epic P2-3243). Retiring a question is UI-only:
  `has_scaling_studies` and `result_scaling_study_urls` stay in the model, the DTO and the DB, and
  2025-phase results keep rendering the stored answer.
- Server-side green check `validation_innovation_use_P25` still requires `has_scaling_studies` when
  `readiness_level >= 6`. Until P2-3494 (Juan David Delgado) lands, a 2026 result at level 6-9 can
  never turn green — a UI-only retirement does not fix that.
- `getUseLevelIndex()` returns `-1` (not `0`) when the level is unset or the catalogue hasn't loaded.
  Comparisons must tolerate `-1`.
- ⚠️ **The use-level ladder is mandatory but was INVISIBLE as such** (P2-3655). `innovation_use_level_id`
  has counted towards the bottom bar all along, through the `appFeedbackValidation` marker at
  `.html:389-392` — but `app-pr-range-level` painted no border, no asterisk and no empty state, so an
  unanswered ladder looked identical to an answered one and "1 field missing" pointed at a field the
  reporter could not find. Fixed by the component's own opt-in `[required]` input (`.html:386`), which
  renders a `*` marker in `--pr-field-required-fg` while the value is null. 🛑 That marker is **purely
  visual**: it emits no `.pr-field.mandatory` / `.pr-input.mandatory`, because this field is already
  counted once by the directive above — adding those classes would turn "1 field missing" into "2".

## Farmers follow-up block (IFC, `changes/innovation-use-farmer-count-nature`)

Under the "Actor type" select of every **Farmers** row, in BOTH blocks (current use + 2030), one `<ng-template
#farmerFollowUp>` (end of the `.html`, rendered through `ngTemplateOutlet`) asks Q-a (households / individual
actors) and Q-b (information received / innovation applied). Copy, codes and the Farmers id live in
`farmer-follow-up.ts` — **verbatim from `docs/specs/changes/.../mockup/farmer-follow-up-questions.png`, pinned
string by string in the spec; never paraphrase** (QA reads it back). The mock-up's italic helper note ("If your
numbers include both groups…") was removed on Nicoleta's request (2026-11-10) — do not restore it. The mock-up's developer note ("Single choice.
Stored as ...") is NOT copy and is never rendered.

- 🛑 **Gate = `isFarmerFollowUpRow(actor)`**: `!isIpsr` + `isPhaseYearAtLeast(2026)` + `source_name !== 'W3/Bilaterals'`
  + `actor_type_id == 1` + `is_active !== false`. Phase year and `source_name` both come from `currentResultSignal()`
  (same `GET results/get/:id` row). Never `isP25()` (IFC-DD-5). Unknown year = no block.
- `removeOther()` stops disabling Farmers when `isFarmerFollowUpResult()` (second Farmers row = split received/applied).
  Every other type, and every out-of-scope result, keeps the one-row rule.
- **Households** (`onCountUnitChange`) reuses the single-total path: sets `sex_and_age_disaggregation = true`, wipes the
  grid with `cleanActor` (only when the row actually changes shape — a typed single total survives), and
  `isHouseholdsRow()` hides the "does not apply" tick. **Individuals** puts the grid back ONLY when the previous
  answer was Households; ⚠️ a row the reporter put on a single total by hand keeps its `how_many` and tick (IFC-T-7:
  the unconditional version wiped a stored total on the first answer).
- Households re-clicked (unit -> null) restores the grid like Individuals; an unsaved Households row's "How many" is `[required]` via `isHouseholdsRow` (every other unsaved field keeps `!!result_actors_id`).
- `onActorTypeChange` (select `ngModelChange`) clears both answers away from Farmers; it never adds keys to rows that
  never had them (IPSR payloads unchanged).
- ⚠️ **`app-pr-radio-button` cannot draw an option description** (plain `{{ label }}` only). Q-b uses it with
  `[hideOptions]="true"` for the field card / REQUIRED pill / `.pr-field.mandatory` marker (what the mandatory scan
  counts) and draws its own options with the shared `pr-native-radio` class. No Spartan radio-group is installed under
  `src/app/spartan/` (adding one = helm files + tsconfig/jest paths + `spartanBrainMock` stubs).
- ⚠️ **Payload:** the host (`innovation-use-info.saveSectionWith`) sends `count_unit` + `use_nature` on EVERY actor row
  (`null` when unanswered): the server's existing-row save writes the whole actor, so omitting them blanks the stored
  answers. Exact lowercase codes; anything else is stored as NULL. The `Actor` model of BOTH `Ipsr-step-1-body.model.ts`
  and `innovationDevInfoBody.ts` declares the two fields (TS2339 trap above).
- Q-b radiogroup carries `-mt-[27px]`: the hidden-options card still leaves its bottom margin + empty `.pr-field`
  padding + block gap (41px vs Q-a's 10px, measured IFC-T-7). Re-measure if `app-field-card` spacing changes.
- Specs: the `Farmers follow-up (IFC-T-4)` describe in `innovation-use-form.component.spec.ts`, run per block.
- Not provable in jsdom: placement and visual likeness to the mock-up (IFC-T-7 visual check).

## Section 7 of P2-3537 — the age-only fallback and the 50/50 split

From the 2026 phase, the **Current use** actor rows offer a second tick, `Age disaggregation not
available`, next to the existing `Sex and age disaggregation does not apply`. Ticking it splits youth
/ non-youth 50/50 from the Women and Men totals and **stamps that the system did it**.

| Field | Meaning |
|---|---|
| `age_disaggregation_not_available` | the reporter's answer for THIS row. `null` ≠ `false` |
| `youth_split_applied_by_system` | the youth figures were computed, not reported |

- 🥇 **`youth_split_applied_by_system` is the point of the whole section.** The story requires any
  downstream report or export to tell a system estimate from a reported figure. 🛑 Do NOT try to
  derive it by comparing `women_youth` against half of `women`: a reporter whose real split happens
  to be half — a common, round answer — would be recorded as an estimate.
- **Unticking clears the halves AND the stamp.** Leaving the computed values behind would turn an
  estimate into what reads as the reporter's own answer, which is the confusion the stamp prevents.
- **Ticking "sex and age" wipes both**, since that one switches sex AND age off; keeping the age-only
  answer alongside it would send the server a contradiction. `cleanActor` does it, and a spec pins it.
- 🛑 **Not offered inside IPSR**, gated explicitly through `!isIpsr` and not by omission — this
  template is shared with Innovation Package step 1, which the story does not cover. Same lesson
  P2-3295 left on this component.
- ⚠️ **The `Actor` model that types this template is `Ipsr-step-1-body.model.ts`, not the
  Innovation Development one** — `@Input() body` is an `IpsrStep1Body`. Declaring the two new
  properties only in `innovationDevInfoBody.ts` still fails the build with `TS2339`, which is exactly
  what happened while building this (and what caused two red Jenkins builds on 2 Sep, in that same
  file). `tsc --noEmit` and Jest both pass on that mistake; only `npm run build` catches it.
- ⚠️ **Every spec that renders this component needs `isInnovationUseAgeFallback2026` in its
  `FieldsManagerService` mock** — the template calls the gate on each render, so a mock without it
  throws before any assertion runs, **even in specs that have nothing to do with this block**. Four
  places provide that service today: two describes in `innovation-use-form.component.spec.ts`, the
  `zoneless` spec, and `innovation-use-info.component.spec.ts` — that last one bit after the fact:
  its own suite was green and only the full run caught it.
- Rounding is safe by construction: non-youth is the remainder, so the halves always add to the
  total whatever the parity (7 → 4 + 3).

## §4 — the Current Use Update block (P2-3537)

Rendered immediately above the actor-type fields, and only when **all three** hold: phase ≥ 2026,
not IPSR, and `body.current_use_previous` is not null.

| Field | Where it comes from |
|---|---|
| Previous reported use | `current_use_previous.total_actors`, read from the previous phase by the server |
| New users added | typed by the reporter, `body.new_users_added` |
| Total cumulative use | **calculated**, `previous + new`. Never typed |
| Narrative | `body.use_expansion_narrative`, 100-word cap |

- 🥇 **`current_use_previous === null` means the block is ABSENT, not empty.** The server sends null
  both for a first report and for a previous phase that reported organisations but no actors.
  Rendering it in the second case would show a reconciliation against zero actors that nothing the
  reporter does can fix — they could never submit (Yeck, 3 Sep 2026). Two specs pin it.
- 🥇 **`actorsTotal()` counts ACTORS only.** Not organisations, not other measures — Yeck's Q4
  decision, so next year's "previous use" stays a figure whose meaning can be read. A spec fails if
  organisations ever get folded in.
- **A reported 0 is a valid answer** and still requires the narrative (§5: use was verified and did
  not grow). Completion therefore tests "answered", never "greater than zero" — a spec fails on the
  stricter version.
- The mismatch error is driven off a **getter**, which is what gives §5's "the error appears as soon
  as the totals diverge, not only on submit" for free.
- Deleted actor rows (`is_active === false`) are excluded from the sum.
- **P2-3985** — the arithmetic, the completion rule and the mismatch message live in
  `shared/utils/current-use-update.util.ts` (copy in `internationalization/current-use-update.copy.ts`),
  shared with the W3/bilateral `type-innovation-use`. This component keeps its own gate and its own
  `actorsTotal()`; the methods delegate in one line. Change a rule there, not here.
- ⚠️ **The evidence for the increment (field 4) is NOT built.** It goes in the existing Evidence
  section behind one more marker (Yeck's Q3), and it is blocked by a real defect: the phase rollover
  drops 8 of the 14 evidence markers (`W-20260903-12`), so the trail would break on that side while
  the figure stayed perfect.

## Children without their own file
| Component | What it does | Trap |
|---|---|---|
| `components/estimates` (`app-estimates-cgiar`) | the three "Investment (USD)" tables over `body.investment_programs` / `investment_bilateral` / `investment_partners` | ⚠️ **STANDALONE since P2-3390** and imported by the two bilateral sections (`pages/bilateral/.../type-innovation-use`, `type-innovation-dev`) — a change here reaches them too. It owns no catalogue and no add-row button: one row per entity the server sends. `InnovationUseFormModule` imports and re-exports it, so W1/W2 is unchanged. |
| `components/studies-link` | local sub-block of the form | Keep it dumb; the phase gates live in the parent. |

## Tickets that shaped this folder
- P2-3199 · P2-3294 (scaling-studies hidden from level 6, 2026+) · P2-3295 ("2030 Use Projection"
  rename + tooltip) · **P2-3535** (scaling-studies retired at every level, 2026+, Innovation Use
  only) · **P2-3558** (the phase gate no longer falls back to the open reporting phase).

## Pending / Coming soon
- P2-3426 (with Ángel) will say whether the same retirement applies to IPSR step 1 / step 4 and to
  the bilateral `type-innovation-use` form. Until then those stay untouched.
