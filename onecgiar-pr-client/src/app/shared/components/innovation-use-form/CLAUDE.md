# innovation-use-form

**Verified:** 2026-08-31 · branch performance-refactor · b224c27e4

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
  `ApiService.dataControlSE.currentResultSignal()?.phase_year` (fallback
  `dataControlSE.reportingCurrentPhase.phaseYear`) owns the phase year.
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
- ⚠️ **Fail open on unresolved state.** `isScalingStudiesQuestionHidden()` returns `false` when
  `phase_year` isn't resolved yet (in-flight load); hiding a question by mistake is worse than
  showing it one render too long.
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
  rename + tooltip) · **P2-3535** (scaling-studies retired at every level, 2026+, Innovation Use only).

## Pending / Coming soon
- P2-3426 (with Ángel) will say whether the same retirement applies to IPSR step 1 / step 4 and to
  the bilateral `type-innovation-use` form. Until then those stay untouched.
