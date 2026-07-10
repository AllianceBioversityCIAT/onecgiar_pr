## 1. Pre-flight (verify before editing)

- [x] 1.1 Confirmed the backend already exposes the statement: live `GET /v2/toc/result/11030/initiative/50/level/{1,2,3}?planned=true` returns `outcome_statement` (and `description`) per node, for all levels. Enrichment from commit `df27cc55a` (Juan David). No backend dependency.
- [x] 1.2 Confirmed the level→name mapping from `/v2/toc/level/get/all`: `1 = High Level Output`, `2 = Intermediate Outcome`, `3 = 2030 Outcome`.
- [x] 1.3 Confirmed placement in the mockup: read-only statement sits between the HLO/Outcome dropdown and the KPI Statement/description field.

## 2. Statement field (multiple-wps-content)

- [x] 2.1 `multiple-wps-content.component.ts`: add `selectedTocNode` computed (find node by `toc_result_id` in the list matching `toc_level_id`, mirroring `updateSelectedIndicatorData`).
- [x] 2.2 Add `hloStatementValue` (`outcome_statement ?? description ?? ''`), `hloStatementLabel` (`secondFieldLabel() + ' Statement'`), `hloStatementTooltip` (`'Maps to TOC: Output or Outcome statement'`, 2026 only).
- [x] 2.3 `multiple-wps-content.component.html`: insert an `app-pr-field-header` read-only block (label + description box + tooltip) between the dropdown and the KPI field, gated `@if (isCP2026() && !isUnplanned && activeTab?.toc_result_id && hloStatementValue())`.

## 3. Verify

- [x] 3.1 `build:dev` passes — no template/compile errors.
- [x] 3.2 On a 2026 P25 result (code 8562) with ToC = Yes and a node selected: the field shows `"High Level Output Statement:"` with the node's statement read-only and the ⓘ tooltip — verified on a served prod build via Playwright (screenshot in `.local-screenshots/`).
- [ ] 3.3 QA: confirm the label switches correctly for Intermediate Outcome (level 2) and 2030 Outcome (level 3), and that phase 2025 shows no statement field.
- [ ] 3.4 QA: confirm the field is hidden in the No scenario and when no node is selected.
