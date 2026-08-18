## Why

P2-3036 Level 3 (subtask **P2-3063**), first slice. The 2026 Contributors & Partners redesign (Excel row 9 + mockup) adds a **read-only** field that shows the **statement** of the selected TOC node (High Level Output / Intermediate Outcome / 2030 Outcome). This is the lowest-risk L3 piece because the data is **already exposed by the backend** — Juan David's TOC control-list enrichment (commit `df27cc55a`) maps the TOC board `description` to `outcome_statement` on every node returned by `findTocResultByConfigV2` (the same list the front already uses for the Level / Outcome / Indicator dropdowns). No backend dependency remains for this field.

## What Changes

In `multiple-wps-content` (the ToC detail of the P25 Contributors & Partners section), in the **Yes** scenario, after the HLO/Outcome dropdown and before the KPI Statement/description field:

1. **New read-only field** showing the selected node's statement (Excel row 9). Value = `outcome_statement` of the node whose `toc_result_id` matches the user's selection, found in the list that matches the chosen level (1 = output, 2 = outcome, 3 = eoi) — mirroring the existing `updateSelectedIndicatorData()` lookup.
2. **Dynamic label** per level: `High Level Output Statement` / `Intermediate Outcome Statement` / `2030 Outcome Statement` (derived from the level name + " Statement").
3. **Info tooltip (ⓘ)** on the label (Excel row 10): `"Maps to TOC: Output or Outcome statement"`, reusing the `app-pr-field-header [tooltip]` pattern added in P2-3061.

Gated by `isCP2026()` so phase 2025 and the IPSR / bilateral / share-request reuse contexts are unaffected.

Explicitly **NOT** in this change:
- Indicator Typology read-only field + its tooltip (Excel rows 13–14) — next L3 slice.
- The mandatory "financial resources" radio (rows 22–23), and all Centers / Science Program / W3 behavior (their own tickets P2-2998 / P2-2929 / P2-3001).
- Any backend or save change (GET/PATCH stays with Juan David).

## Capabilities

### New Capabilities
- `toc-contributors-statement`: read-only display of the selected TOC node's statement in the P25 Contributors & Partners ToC detail, with a level-dynamic label and an info-icon tooltip, gated to the 2026 redesign.

## Impact

- **Files (client):**
  - `multiple-wps-content.component.ts` — computeds `selectedTocNode`, `hloStatementLabel`, `hloStatementValue`, `hloStatementTooltip`.
  - `multiple-wps-content.component.html` — new `app-pr-field-header` read-only block between the HLO/Outcome dropdown and the KPI field.
- **No** API/DTO/entity/routing/backend changes — `outcome_statement` already ships in the control-list response.
- **Risk:** low — read-only display reusing an existing shared component and an existing node lookup; gated by `isCP2026()`; tree excluded from Jest coverage → gate = build + visual before/after.
