# innovation-use-form

**Verified:** 2026-11-25 · INC-169264 (IU26-T-12, PR-2: optional "Of which NEW" per current-use row, W1/W2 2026 only); prior: 2026-11-25 · INC-169264 (IU26-T-5/T-6, changes/innovation-use-2026-total-and-new-users, PR-1): the §4 Current Use Update block is rewritten for 2026 (no New users / cumulative / mismatch; previous use by category; totals grid; guidance; 2026 labels); prior: 2026-11-25 · fix/result-detail-required-counter (P2-4125): marcador «at least one actor, organization or other measure» en el bloque de uso actual; prior: 2026-11-18 · INC-168062 (INA-T-6) · changes/innovation-use-nature-all-actors: follow-up questions shown on every actor row (scope vs mandatory, nature question, W3 shown not blocking); prior: 2026-11-12 · qa-development-2026-ss · bugfix/innovation-use-youth-required IUY-T-2 (INC-167167: empty Youth keeps Non-youth empty + hint, both grids; `validateYouth` now derives on the edited row); 2026-11-11 · changes/innovation-use-w3-hide-2030 IWH-T-1 (INC-168060: 2030 block hidden for W3/Bilaterals); quick/innovation-use-actors-sentence-ipsr (INC-168060 feedback: `narrativeActors` P25 sentence now depends on `isIpsr` — IPSR step 1 keeps "by end of 2030" (scaling ambition), Innovation Use keeps the reporting-year sentence; `isIpsr` is a static host input, so the `computed` reading it is safe); 2026-11-10 · quick/innovation-use-actors-sentence (INC-168060: P25 actors narrative now asks for actual users in the reporting year, not the 2030 projection); quick/remove-farmer-helper-note (Nicoleta: italic helper note under Q-b removed, `helper` key dropped); prior: 2026-11-03 · T-7 findings (re-click Households restores the grid; unsaved Households "How many" required); IFC-T-7 fixes (Individuals keeps a hand-set single total; Q-b gap); IFC-T-4 (changes/innovation-use-farmer-count-nature): Farmers follow-up block, gate and Households coupling (uncommitted); prior: 2026-10-20 · yzuniga/p2-3985-bilateral-current-use-update · P2-3985: the Current Use Update rules moved to `shared/utils/current-use-update.util.ts` (shared with the bilateral form); prior: 2026-09-11 · branch performance-refactor · 5791b85b9

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
  — the Innovation Use result section (`isIpsr` defaults to `false`). It also renders for results with `source_name = 'W3/Bilaterals'`, so a change here is a W3 change (root AGENTS.md §6).
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
- **W3 gate (INC-168060, IWH):** `hides2030Projection` (`!isIpsr && currentResultSignal().source_name === 'W3/Bilaterals'`) wraps the whole 2030 Use Projection block (`.html` radio through justification) in `@if (!hides2030Projection)`; display only, `body` 2030 keys are never touched, and it fails toward showing the block while `source_name` is unknown. The block already sits inside `isP25() && !isIpsr`, so IPSR never renders it.
- **Youth required (IUY, INC-167167):** on `isFarmerFollowUpResult()` rows an empty Youth (`null`/`undefined`/`''`) leaves Non-youth `null` (never `total - null` = the total) and `showYouthRequiredHint(actor, gender)` paints `youthRequiredCopy.hint` under that Non-youth, both grids; IPSR, 2025 and W3 keep the old derivation. The server mirrors it: `summary.service.getInnovationUse` returns `null` Non-youth and `validation_innovation_use_P25` keeps the section red until Youth is filled (0 is valid). ⚠️ `validateYouth`'s clamp/"cannot be greater" branch still writes `body.innovatonUse.actors[i]` even from the 2030 grid; only the Non-youth derivation moved to `actorItem`. ⚠️ The hint is an amber "Action needed" alert BELOW the Women/Men row (`.youth-required-hint`, `role="status"`, `lucideInfo` via `NgIcon` in the module + `provideIcons` on the component; copy `label`/`text`/`emphasis` in `innovation-use-youth-required.copy.ts`; Santiago mock-up 2026-11-12), NOT `.explanation_message`: that class is an absolute violet overlay over the whole Women/Men row (`z-index: 2`, pointer-events on), meant for the 3 s "cannot be greater" flash. Made persistent, it covered the Youth input and swallowed its clicks (PRTest, 2026-11-12).
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

## Any-of rule of the current-use block (P2-4125)

The live green check (`validation_innovation_use_P25`, REVIEW D13 in the server's
`qa-catalog/definitions/sections/innovation-use.ts`) keeps the section red until, with "This is yet to be
determined" off, at least one active actor, organization or other measure exists. The three list headers are
`[required]="false"`, so nothing told the bottom bar: it said "Section complete" while the rail stayed grey.
- Hidden `appFeedbackValidation` marker right above the "Actors" header, fenced `isP25() && !isIpsr` (the
  function is per PORTFOLIO, so here the portfolio axis is the right one, unlike the phase-year gates above).
- `isCurrentUseGroupComplete()`: tbd ticked, or an active row with a value (actor type / organization type /
  measure unit or quantity). An empty row from "Add actor" does not count.
- The marker sits inside the `@if` that hides the lists when tbd is ticked, so ticking it drops the marker too.
- ⚠️ The "Current core innovation use…" card itself still paints green (its radio has a value), even with the
  group empty. Not changed: that card is `app-pr-radio-button`, shared app-wide.

## Follow-up questions block (IFC `changes/innovation-use-farmer-count-nature` + INA `changes/innovation-use-nature-all-actors`)

Under the "Actor type" select of every active row, in BOTH blocks (current use + 2030), one `<ng-template
#farmerFollowUp>` (end of the `.html`, via `ngTemplateOutlet`) draws two parts inside `data-testid="iu-follow-up"`: the
Farmers part (`iu-farmer-follow-up`: title + Q-a households / individual actors, Farmers rows only) and the nature part
(`iu-nature-follow-up`: Q-b information received / innovation applied, any row with a type, no title). Copy, codes and the Farmers id live in
`farmer-follow-up.ts` — **verbatim from `docs/specs/changes/.../mockup/farmer-follow-up-questions.png`, pinned
string by string in the spec; never paraphrase** (QA reads it back). The mock-up's italic helper note ("If your
numbers include both groups…") was removed on Nicoleta's request (2026-11-10) — do not restore it. The mock-up's developer note ("Single choice.
Stored as ...") is NOT copy and is never rendered.

- 🛑 **Scope vs mandatory (INA-DD-5/6).** `isFollowUpScope()` = where the questions are SHOWN: `!isIpsr` + `isPhaseYearAtLeast(2026)`,
  any `source_name` (W1/W2 and W3/Bilaterals). `isFollowUpMandatory()` = where they are REQUIRED (`[required]` on both cards):
  the scope minus W3/Bilaterals, which shows them editable and never blocking (INA-R-20; the 2030 block stays hidden by IWH).
  Row gates: `isFarmerFollowUpRow` (scope + `is_active !== false` + `actor_type_id == 1`) = title + Q-a; `isNatureFollowUpRow`
  (scope + active + a type selected) = Q-b. Phase year and `source_name` come from `currentResultSignal()`. Never `isP25()` (IFC-DD-5). Unknown year = no block.
- ⚠️ **`isFarmerFollowUpResult()` (scope minus W3) is now read ONLY by the youth rules** (`validateYouth`, `showYouthRequiredHint`).
  It must not gain readers (design P-9): a follow-up question gated on it would silently drop W3.
- `removeOther()` returns `[]` inside the scope: every type can repeat (INA-R-9), rows of one type are told apart by their nature
  answer, each Q-b radio group named by `farmerRowKey(actorItem)`. Outside it (2025, IPSR, unknown phase) the one-row rule stays (only "Other" twice).
- **Households** (`onCountUnitChange`) reuses the single-total path: sets `sex_and_age_disaggregation = true`, wipes the
  grid with `cleanActor` (only when the row actually changes shape — a typed single total survives), and
  `isHouseholdsRow()` hides the "does not apply" tick. **Individuals** puts the grid back ONLY when the previous
  answer was Households; ⚠️ a row the reporter put on a single total by hand keeps its `how_many` and tick (IFC-T-7:
  the unconditional version wiped a stored total on the first answer).
- Households re-clicked (unit -> null) restores the grid like Individuals; an unsaved Households row's "How many" is `[required]` via `isHouseholdsRow` (every other unsaved field keeps `!!result_actors_id`).
- Advisory (INA-R-20): on W3 a Farmers row answered "Households" now collapses to a single total (grid and "does not apply"
  tick hidden), because `isHouseholdsRow` reads the scope, not `isFollowUpMandatory()`.
- `onActorTypeChange` (select `ngModelChange`) clears only `count_unit` away from Farmers (INA-R-8): `use_nature` applies to
  every type and is kept. A Households row gets its grid back; rows that never had the keys get none (IPSR payloads unchanged).
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
- Specs, in `innovation-use-form.component.spec.ts`, run per block: the `Farmers follow-up (IFC-T-4)` describe and the
  `nature question on every row (INA-T-6)` one (every row, W3 shown not blocking, repeatable types).
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
  places provide that service today (IU26: and any other spec mocking `FieldsManagerService` that feeds `innovation-use-info` now needs it too): two describes in `innovation-use-form.component.spec.ts`, the
  `zoneless` spec, and `innovation-use-info.component.spec.ts` — that last one bit after the fact:
  its own suite was green and only the full run caught it.
- Rounding is safe by construction: non-youth is the remainder, so the halves always add to the
  total whatever the parity (7 → 4 + 3).

## §4 — the Current Use Update block (P2-3537, rewritten for 2026 by IU26)

Rendered above the header / "to be determined" question (IU26-R-3), and only when phase >= 2026,
not IPSR, and `body.current_use_previous` is not null. It shows **regardless of "to be determined"**.

| Piece | Where it comes from |
|---|---|
| Previous reported use, by category | `current_use_previous` (`total_actors`, `total_organizations`, `measures[{unit, quantity}]`) via `previousUseByCategory()`; a category without data is omitted. Heading `previousUseHeading()` ("for reference only") |
| Narrative | `body.use_expansion_narrative`, label "Brief narrative on how use changed in {year}", 100-word cap |
| Totals grid | `currentUseTotals()`, read-only, never stored, `data-testid="iu-totals"`, 4 cols / 2 on narrow; hidden when TBD or when no rows |
| Guidance block | `currentUseGuidance()` (`data-testid="iu-guidance"`), above the rows |

- 🛑 **There is no "New users added", no cumulative total and no mismatch error any more (2026).** `onNewUsersAddedChange`,
  `currentUseDifference`, `hasCurrentUseMismatch`, `currentUseMismatchMessage` and `actorsTotal` were deleted. The body key
  `new_users_added` is never sent for 2026 (see `innovation-use-info`). The cumulative arithmetic survives only as pre-2026
  history in git; do not restore it for 2026.
- 🥇 **`current_use_previous === null` still means the block is ABSENT.** What changed is the server rule: it is now null only
  when actors, organizations and measures are ALL empty, so an orgs-only previous phase shows the block (IU26-R-3).
- **Gate:** `isCurrentUse2026()` = `!isIpsr && fieldsManagerSE.isInnovationUseAgeFallback2026()` (phase year, never portfolio).
  It also drives `howManyLabel()` ("How many – total") / `quantityLabel()` ("Quantity – total"), the 2026 narrative label,
  and dropping the word "expected" from the organizations/other-use description (2026 current use only; IPSR, 2030 and 2025 keep it).
- **2026 question label:** `FieldsManagerService` field `innovation-use` label comes from `CURRENT_USE_UPDATE_COPY.question2026(year)`
  ("Innovation use in {year} supported by evidence (calculated from the categories below)") with an empty description
  (no "Depending…") in 2026; older phases keep the old label. Only the Innovation Use form reads that key, so IPSR step 1 is untouched.
- **Totals:** `totalsByCategory()` in `shared/utils/current-use-update.util.ts`; current-use rows only (never the 2030 projection),
  active rows only; Households = `count_unit === 'households'`, every other actor row counts as individuals; measure units group by
  trimmed lower-case text; disaggregated rows use Women + Men, "does not apply" rows use their typed `how_many`.
- **A reported 0 is not asserted any more:** completion is `isCurrentUseNarrativeComplete()` (narrative present and within 100 words).
- **Strings:** all new copy lives in `CURRENT_USE_UPDATE_COPY` (`internationalization/current-use-update.copy.ts`, IU26-DD-10), shared with the
  W3 form. Change a rule or a string there, not here.
- **"Of which NEW" (IU26-T-12, R-11):** one optional `new_users` number per current-use row (actors: "Of which NEW users (optional)"; orgs and measures: "Of which NEW (optional)"), never the 2030 rows and never women/men/youth. Gate `isNewUsersEnabled()` = `isCurrentUse2026()` and `source_name !== 'W3/Bilaterals'` (W3 results reach this form through `innovation-use-info`; IPSR is excluded by `isCurrentUse2026`). Over-total check = `newUsersExceedsTotal` in the util against the SAME total the server uses (actors: single-total row -> `how_many`, otherwise Women + Men, fallback `how_many`; orgs `how_many`; measures `quantity`); blank is valid, 0 is valid. The invalid row paints `aria-invalid="true"` through the new opt-in `markInvalid` / `describedBy` inputs of `app-pr-input` (number box) plus a `role="alert"` message in `--pr-danger` (#b91c1c); one `appFeedbackValidation` marker (`isNewUsersComplete()`) keeps the section incomplete so Submit stays blocked. Each total tile carries "Of which new: N" or "not available" (`newUsersByCategory`, sum of the answered rows; no answered row = not available). The guidance gets the NEW sentence only through `guidance(year, true)`; W3 reads the copy without it. The host sends `new_users` as a number/null only on rows that carry the key.
- ⚠️ **Historical (pre-2026 / PR-2):** the P2-3537 §4 reconciliation (previous + new = cumulative, mismatch error) and the evidence-for-the-increment
  question (never built, blocked by the evidence-marker rollover defect W-20260903-12) are not part of the 2026 form.

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
