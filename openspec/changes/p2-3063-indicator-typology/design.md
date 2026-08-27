## Context

P2-3063 (L3) second read-only slice: an "Indicator Tipology" field showing the Type of the selected KPI as defined in the TOC, in the P25 Contributors & Partners ToC detail (`multiple-wps-content`). The value already arrives on the selected indicator (`indicator_typology`), so this is a display-only change mirroring the HLO/Outcome Statement field.

**Goals:** show the selected KPI's Type read-only, with an info tooltip, after the KPI dropdown. Keep 2025 and the reuse contexts unchanged.

**Non-Goals:** no backend/save; no other L3 fields/behaviors.

## Decisions

**D1 — Read it from `indicator_typology` on the selected indicator.**
`selectedIndicatorData()` already holds the indicator the user picked (set by `updateSelectedIndicatorData()`). Its `indicator_typology` (alias of `type_value`, both shipped by Juan David's enrichment `df27cc55a`) is the TOC Type. Fallback to `type_value` for safety. No new request.

**D2 — Reuse `app-pr-field-header` read-only + tooltip.**
Same pattern as the Statement field and the KPI tooltip (P2-3061): `[label] [description] [tooltip] [showDescriptionLabel]="false"`. Project design line: custom-fields + PrimeNG.

**D3 — Gate by `isCP2026()` + value present.**
`@if (isCP2026() && indicatorTypologyValue())`. The value is only set once an indicator is selected, so the field appears together with the indicator-dependent blocks and never as an empty box. 2025/non-2026 reuse contexts never render it.

**D4 — Copy verbatim.**
Label "Indicator Tipology" is taken literally from the Excel/user story, matching the project's copy-verbatim convention (cf. P2-3061). The likely typo ("Tipology" → "Typology") is flagged to Ángel rather than silently corrected.

## Risks / Trade-offs

- [Component excluded from Jest coverage] → gate = build + visual. Verified via Playwright on a served prod build (label + value + tooltip).
- [Label typo] → kept verbatim; one-line change if Ángel confirms the correction.

## Open Questions

- **OQ1:** "Tipology" vs "Typology" — pending Ángel's confirmation.
