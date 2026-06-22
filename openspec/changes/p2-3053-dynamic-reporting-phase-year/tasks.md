## 1. Make the phase header dynamic

- [x] 1.1 In `entity-aow-aow.component.html`, replace both `Reporting Phase 2025` with `Reporting Phase {{ <phaseYear binding> }}` (guard against null so it doesn't render "null")
- [x] 1.2 In `entity-aow-2030.component.html`, replace `Reporting Phase 2025` with the same dynamic binding
- [x] 1.3 Confirm the components expose the phase year (via `api.dataControlSE.reportingCurrentPhase.phaseYear` or an injected getter); add the accessor if missing

## 2. Make the target column dynamic

- [x] 2.1 In `aow-hlo-table.component.ts`, build the `Expected target <year>` column title from `reportingCurrentPhase.phaseYear` instead of the literal `'Expected target 2025'` (getter/computed so it updates when the phase loads)
- [x] 2.2 Confirm the shared component covers all three views (outputs / outcomes / 2030-outcomes) — single change, three views

## 3. Make the modal description dynamic

- [x] 3.1 In `aow-hlo-create-modal.component.html`, replace the 3 hardcoded "2025" mentions in the description with the dynamic phase year

## 4. Tests

- [x] 4.1 Update `aow-hlo-table.component.spec.ts` (asserts `'Expected target 2025'`) to mock `reportingCurrentPhase.phaseYear` and assert the dynamic title
- [x] 4.2 Add/adjust a test that the header/column reflect the mocked active year, and that a null year degrades gracefully
- [x] 4.3 Run the affected specs; ensure green

## 6. Entry-point cards (clarified by Santi 2026-06-22)

- [x] 6.1 In `entity-details.component.html`, card "Reporting by Theory of Change" → label "Results planned in your {{ year }} ToC" (dynamic year) + a question-circle tooltip "Report results as planned theory of change"
- [x] 6.2 Card "Reporting by Result Category" → label "Report Emerging results" + a question-circle info note (hover) "Report achievements that were not originally included in the {{ year }} Theory of Change, but emerged as valuable results during the year."
- [x] 6.3 Ensure TooltipModule is available in the component; use `pi pi-question-circle` + `pTooltip`

## 7. Table header renames (clarified by Santi)

- [x] 7.1 In `aow-hlo-table.component.ts` columnOrder: Indicator name → "KPI statement"; Type → "Indicator typology"; "Expected target {year}" → "{year} target" (keep dynamic); Actual achieved → "Achieved target"; Status unchanged
- [x] 7.2 Update `aow-hlo-table.component.spec.ts` assertions for the renamed headers

## 5. Verify & guardrails

- [x] 5.1 Build/compile clean (template bindings valid)
- [x] 5.2 Confirm NOT touched: `indicator-details` "2024"/`achieved_in_2024`, `outcome-indicator-home` "2022-2024" baseline
- [x] 5.3 grep the result-framework-reporting views to confirm no remaining hardcoded "Reporting Phase 2025" / "Expected target 2025"
- [ ] 5.4 Manual check if possible (or note pending: needs login)
