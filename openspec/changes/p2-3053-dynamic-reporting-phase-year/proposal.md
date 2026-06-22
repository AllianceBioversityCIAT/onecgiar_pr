## Why

In the Reporting-by-ToC interface (Areas of Work / HLO indicator views) the reporting-phase year is **hardcoded as the literal "2025"** in templates, so after the 2026 phase opened the UI still shows "Reporting Phase 2025" / "Expected target 2025" while 2026 is the active phase. This is the bug reported in **P2-3053** (child of P2-3012, *Open Phase Step 1*), reporter Santiago Sánchez.

The active reporting phase already resolves correctly to 2026 elsewhere via `DataControlService.reportingCurrentPhase.phaseYear` (loaded from `GET_versioning(OPEN, REPORTING)`). The fix binds the hardcoded labels to that value.

**Scope: frontend-only, BASIC only.** Confirmed with Yeck. The broader nomenclature requests in the ticket description (Indicator name → HLO title; KPI statement / typology / targets; entry-point pathway sub-text; the `achieved_in_2024` field which is backend; "all P/A" rollout) are **out of scope** here and have been tagged to Santiago Sánchez + Ángel Jarrín in a Jira comment as clarifications to define separately.

## What Changes

- Replace the hardcoded `Reporting Phase 2025` text with the active phase year (`reportingCurrentPhase.phaseYear`) in:
  - `entity-aow-aow.component.html` (2 occurrences — High-Level Outputs + Intermediate Outcomes tabs)
  - `entity-aow-2030.component.html` (1 occurrence — 2030 Outcomes)
- Make the `aow-hlo-table` column title `Expected target 2025` dynamic (`Expected target {{ phaseYear }}`). This component is shared by all three views, so the fix covers HLO, Intermediate Outcomes and 2030 Outcomes.
- Replace the 3 hardcoded "2025" mentions in the `aow-hlo-create-modal` description text with the dynamic year.
- Update the affected unit specs (`aow-hlo-table.component.spec.ts`).

## Capabilities

### New Capabilities
- `reporting-phase-year-display`: The Reporting-by-ToC views (HLO, Intermediate Outcomes, 2030 Outcomes) display the active reporting-phase year dynamically, never a hardcoded year.

### Modified Capabilities
- (none)

## Impact

- **Client only** (`onecgiar-pr-client`):
  - `pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/entity-aow-aow.component.html`
  - `pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-2030/entity-aow-2030.component.html`
  - `pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/aow-hlo-table.component.ts` (+ `.spec.ts`)
  - `pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/aow-hlo-create-modal.component.html`
- **No backend changes.** Year source is the already-loaded `reportingCurrentPhase.phaseYear`.
- No API contract changes, no migrations.
- **Explicitly NOT touched:** `outcome-indicator-home.component.html` "2022-2024" (intentional P25 baseline); `indicator-details` "2024" / `achieved_in_2024` (backend field, tagged as separate scope).
- SDD baseline: fits `docs/system-design/design.md` (Result Framework reporting views). Related ticket: parent P2-3012.
