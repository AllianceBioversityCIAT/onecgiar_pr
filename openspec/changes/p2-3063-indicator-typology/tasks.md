## 1. Pre-flight (verify before editing)

- [x] 1.1 Confirmed the backend already exposes the value: live `GET /v2/toc/result/11030/initiative/50/level/1?planned=true` returns `indicator_typology` (alias of `type_value`) on each indicator (e.g. "Number of innovations (innovation development)"). Enrichment from commit `df27cc55a`. No backend dependency.
- [x] 1.2 Confirmed source in the user story P2-3036 AC4: "'Indicator Tipology': New read-only text field. The value refers to the Type field of KPI defined in TOC. … tooltip 'Maps to TOC: [Type]'."
- [x] 1.3 Confirmed placement (Excel row 13): after the KPI Statement/description dropdown, before Unit/Target/Contribution.

## 2. Indicator Typology field (multiple-wps-content)

- [x] 2.1 `multiple-wps-content.component.ts`: add `indicatorTypologyValue` computed (`selectedIndicatorData()?.indicator_typology ?? type_value ?? ''`) and `indicatorTypologyTooltip` (`'Maps to TOC: [Type]'`, 2026 only).
- [x] 2.2 `multiple-wps-content.component.html`: insert a read-only `app-pr-field-header` (label "Indicator Tipology" + value box + tooltip) right after the KPI dropdown, gated `@if (isCP2026() && indicatorTypologyValue())`.

## 3. Verify

- [x] 3.1 `build:dev` passes — no template/compile errors.
- [x] 3.2 On a 2026 P25 result (code 8562), ToC = Yes, with a KPI selected: the field shows "Indicator Tipology:" + the KPI's Type read-only + the ⓘ tooltip "Maps to TOC: [Type]" — verified on a served prod build via Playwright (screenshot in `.local-screenshots/`).
- [ ] 3.3 QA: confirm the field hides when no KPI is selected, in the No scenario, and on phase 2025.
- [ ] 3.4 Copy: confirm with Ángel whether the label should read "Tipology" (source) or "Typology" (corrected).
