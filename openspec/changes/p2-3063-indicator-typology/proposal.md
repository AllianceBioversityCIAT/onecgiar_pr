## Why

P2-3036 Level 3 (subtask **P2-3063**), second read-only slice. The 2026 Contributors & Partners redesign (Excel rows 13–14 + user story AC4) adds a **read-only** field showing the **Type of the selected KPI** as defined in the TOC ("Indicator Tipology"). Like the HLO/Outcome Statement field, the data is **already exposed by the backend**: Juan David's enrichment (`df27cc55a`) surfaces `indicator_typology` (alias of `type_value`) on every indicator returned by `findTocResultByConfigV2` — the same list the front already uses for the KPI dropdown. No backend dependency remains.

## What Changes

In `multiple-wps-content` (the ToC detail of the P25 Contributors & Partners section), in the **Yes** scenario, right after the KPI Statement/description dropdown and before the Contribution-to-indicator-target block:

1. **New read-only field** "Indicator Tipology" (Excel row 13). Value = `indicator_typology` (fallback `type_value`) of the selected indicator, already held in `selectedIndicatorData()`.
2. **Info tooltip (ⓘ)** on the label (Excel row 14): `"Maps to TOC: [Type]"`, reusing the `app-pr-field-header [tooltip]` pattern (P2-3061).

Gated by `isCP2026()` and shown only once an indicator is selected (so its type exists). Phase 2025 and the IPSR / bilateral / share-request reuse contexts are unaffected.

Label copy `"Indicator Tipology"` is taken verbatim from the Excel/user story (the project's copy-verbatim convention). The spelling "Tipology" looks like a source typo and is flagged for Ángel; correcting it is a one-line follow-up if confirmed.

Explicitly **NOT** in this change: the mandatory "financial resources" radio (rows 22–23), Centers/Science Program/W3 behavior (P2-2998 / P2-2929 / P2-3001), and any backend/save change.

## Capabilities

### New Capabilities
- `toc-contributors-typology`: read-only display of the selected KPI's TOC Type in the P25 Contributors & Partners ToC detail, with an info-icon tooltip, gated to the 2026 redesign.

## Impact

- **Files (client):**
  - `multiple-wps-content.component.ts` — computeds `indicatorTypologyValue`, `indicatorTypologyTooltip`.
  - `multiple-wps-content.component.html` — read-only `app-pr-field-header` block after the KPI dropdown.
- **No** API/DTO/entity/routing/backend changes — `indicator_typology` already ships in the control-list response.
- **Risk:** low — read-only display reusing a shared component and the existing `selectedIndicatorData()`; gated by `isCP2026()`; tree excluded from Jest coverage → gate = build + visual.
