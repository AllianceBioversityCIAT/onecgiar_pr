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
