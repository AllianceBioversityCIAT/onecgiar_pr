## Context

The Reporting-by-ToC views render a phase header and an HLO indicator table. The phase year is written as the literal string `2025` in the templates and in the shared table's column config, so opening the 2026 phase did not update them. The active phase year is already available app-wide via `DataControlService.reportingCurrentPhase.phaseYear` (set in `getCurrentPhases()` from `GET_versioning(OPEN, REPORTING)`), and is reached in components through the `ApiService` aggregator (`api.dataControlSE.reportingCurrentPhase.phaseYear`).

## Goals / Non-Goals

**Goals:**
- The phase header and target-column year in the three Reporting-by-ToC views show the active phase year dynamically.
- No hardcoded year remains in the affected templates/configs.

**Non-Goals:**
- No nomenclature changes (Indicator name → HLO title, KPI statement, typology, targets) — separate scope, tagged to Santi + Ángel.
- No change to `indicator-details` "2024" label or the backend `achieved_in_2024` field.
- No change to the `outcome-indicator-home` "2022-2024" baseline text.
- No "all P/A" rollout beyond what these shared components already cover.

## Decisions

**Decision 1 — Bind to `reportingCurrentPhase.phaseYear` (single existing source).**
Use the already-loaded value rather than re-deriving the year. The header bindings become `Reporting Phase {{ api.dataControlSE.reportingCurrentPhase.phaseYear }}`. Rationale: one source of truth, already correct (2026); avoids the fragility of re-querying.

**Decision 2 — Shared table column made dynamic via the component's API reference.**
`aow-hlo-table.component.ts` defines the columns array with `'Expected target 2025'`. Build that title from `phaseYear` (e.g., a getter or computed columns reading `this.api.dataControlSE.reportingCurrentPhase.phaseYear`). Because the component is shared by HLO / Intermediate Outcomes / 2030 Outcomes, the single fix covers all three.

**Decision 3 — Guard against a null phase year.**
`phaseYear` can be null briefly before `getCurrentPhases()` resolves. The binding must degrade gracefully (e.g., show "Reporting Phase" with no trailing year, or wait for the value) rather than render "Reporting Phase null". Confirm the phase is loaded on these routes before relying on it.

## Risks / Trade-offs

- [`phaseYear` null on first paint → "Reporting Phase null"] → guard the binding (omit the year until loaded).
- [Specs assert the literal "Expected target 2025"] → update the specs to assert the dynamic value with a mocked `reportingCurrentPhase.phaseYear`.
- [Other hardcoded years exist nearby (indicator-details 2024, baseline 2022-2024)] → explicitly left untouched per scope; documented in the proposal and Jira comment so they are not "accidentally fixed".

## Migration Plan

Pure frontend, no migrations. Deploy with the client build. Rollback = revert the commit.

## Open Questions

- None blocking for the basic scope. The nomenclature/backend items are tracked in the Jira comment tagged to Santi + Ángel.
