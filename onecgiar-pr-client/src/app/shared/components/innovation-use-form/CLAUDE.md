# innovation-use-form

**Verified:** 2026-09-02 · branch performance-refactor · 300d9b560

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
- ⚠️ **The evidence for the increment (field 4) is NOT built.** It goes in the existing Evidence
  section behind one more marker (Yeck's Q3), and it is blocked by a real defect: the phase rollover
  drops 8 of the 14 evidence markers (`W-20260903-12`), so the trail would break on that side while
  the figure stayed perfect.

## Children without their own file
| Component | What it does | Trap |
|---|---|---|
| `components/` | local sub-blocks of the form | Keep them dumb; the phase gates live in the parent. |

## Tickets that shaped this folder
- P2-3199 · P2-3294 (scaling-studies hidden from level 6, 2026+) · P2-3295 ("2030 Use Projection"
  rename + tooltip) · **P2-3535** (scaling-studies retired at every level, 2026+, Innovation Use
  only) · **P2-3558** (the phase gate no longer falls back to the open reporting phase).

## Pending / Coming soon
- P2-3426 (with Ángel) will say whether the same retirement applies to IPSR step 1 / step 4 and to
  the bilateral `type-innovation-use` form. Until then those stay untouched.
