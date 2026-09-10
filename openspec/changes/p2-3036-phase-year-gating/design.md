## Context

`rd-contributors-and-partners` (P25) is selected purely by `portfolioAcronym === 'P25'` in `routing-data.ts` — never by phase year. A P25 result reported in 2025 and the same portfolio's 2026 result both load this component. The app already exposes the data needed to distinguish them:
- `DataControlService.currentResultSignal()?.phase_year` — the viewed result's reporting-phase year.
- `DataControlService.reportingCurrentPhase.phaseYear` — the active reporting phase year.
- `FieldsManagerService` already centralizes portfolio gating (`isP25`/`isP22`) off `currentResultSignal()`.

## Goals / Non-Goals

**Goals:** make the 2026 redesign apply only to phase 2026+; keep 2025 identical to before; centralize the threshold so 2027+ is a one-line change.

**Non-Goals:** no change to portfolio gating; no backend; no rework of unrelated phase logic (P2-3053/P2-3009 stay as they are).

## Decisions

**D1 — Centralize the threshold in an enum.** `ReportingDesignYear.ContributorsPartnersRedesign = 2026`. A single named constant beats scattered `>= 2026` literals and documents *why* 2026. Future redesigns add a new member.

**D2 — One helper on `FieldsManagerService`.** `isContributorsPartners2026 = computed(() => (currentResult.phase_year ?? reportingCurrentPhase.phaseYear) >= ReportingDesignYear.ContributorsPartnersRedesign)`. Placed next to `isP25` because it's the same "which layout/fields" concern, and both components already inject `FieldsManagerService`. Reactive via the signal.

**D3 — Constant threshold, not "is active phase".** Gating on `phase_year >= 2026` (constant) — NOT on `phase_year === activePhaseYear`. The redesign launched in 2026 and must persist for 2026 results even after 2027 opens; an "active phase" comparison would wrongly revert 2026 results to legacy when 2027 becomes active.

**D4 — Legacy copy restored verbatim from git.** The 2025 strings/markup are copied exactly from commit `a089bffe6` (pre-L1), guaranteeing 2025 is unchanged. Gated copy lives in `computed` text getters per component (e.g. `tocQuestionLabel`, `contributionTargetNote`) to keep templates readable and avoid duplicating long `app-alert-status` blocks.

**D5 — Structural gates inline.** Submitter: `@if (!isCP2026()) { …legacy block… }`. Level/HLO visibility: `… && (isCP2026() ? !isUnplanned : true)` (legacy keeps its original condition). `maxWords`: `isCP2026() ? 50 : 30`.

## Risks / Trade-offs

- [`phase_year` undefined before result loads → defaults to legacy] → Mitigated by the `reportingCurrentPhase.phaseYear` fallback; in practice the section renders after the result loads, so the result's own year is present.
- [Two copies of each text now exist] → Acceptable; the legacy copy is frozen and the new copy is the live one. Centralizing both in computed getters keeps them in one place per component.
- [No unit tests] → component excluded from coverage; gate is build + visual on a 2026 result (new UI, verified) and a 2025 result (legacy UI).

## Open Questions

- **OQ1:** Confirm with the team whether any portfolio/phase other than "P25 + year < 2026" should also receive the legacy view. Current assumption: P25 + phase_year < 2026 → legacy; P25 + >= 2026 → new. P22 is unaffected (different component).
