# Proposal — P2-3141: Search Bar for KPIs at the AoW level

**Jira ticket:** [P2-3141](https://cgiarmel.atlassian.net/browse/P2-3141) — Enhancement, Medium priority.
**Scope type:** **Frontend-only** (Angular client). No backend changes required — the AoW indicators data is already fully loaded client-side and filtering happens in memory.

## Why

Some Science Programs have hundreds of KPIs/indicators with very similar statements at the Area of Work (AoW) level. Today the only way to locate the indicator to report against is scrolling through the grouped table (`AowHloTableComponent`), which is slow and error-prone — users may pick the wrong indicator. A search bar lets users find the correct indicator quickly and confidently (acceptance criteria of P2-3141).

## What Changes

- Add a **search bar at the AoW level** in the Results Framework Reporting module (`entity-aow` → `EntityAowAowComponent` page), above the HLO/Outcomes indicators table.
- Typing filters the grouped PrimeNG table (`AowHloTableComponent`) **by indicator statement (KPI), by indicator typology and by group title (HLO/Outcome `result_title`)**: only matching indicators remain visible; groups with no matching indicators are hidden.
- The filter applies to both **High-Level Outputs** and **Outcomes** tabs (they share the same table component and page-level search state), and to the **2030 Outcomes** view (same `AowHloTableComponent` with `tableType="2030-outcomes"`).
- Clearing the search restores the full table.
- Reuses the existing search UX pattern from the `outcome-indicator` module (global `.search_input` pill style + indicator filter pipe), keeping the UI consistent with the rest of PRMS.

## Capabilities

### New Capabilities
- `aow-indicator-search`: search/filter behavior for indicators in the AoW-level tables (search input placement, matching rules, group visibility, empty-state, reset behavior across tabs and AoW navigation).

### Modified Capabilities
<!-- none — no existing spec under openspec/specs/ covers the entity-aow tables -->

## Impact

- **Client (modified):**
  - `src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/entity-aow-aow.component.html|ts` — host the search bar (or the table component, per design.md).
  - `src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/aow-hlo-table.component.ts|html` — filtered data source + empty state.
  - `src/app/pages/result-framework-reporting/pages/entity-aow/services/entity-aow.service.ts` — search text signal (shared across tabs).
- **Client (reused, read-only reference):** `src/app/pages/outcome-indicator/pipes/filter-indicator-by-search.pipe.ts`, global `.search_input` style in `src/styles.scss`.
- **Server:** none. Endpoints `GET_TocResultsByAowId` / `GET_2030Outcomes` unchanged.
- **SDD baseline:** aligns with `docs/system-design/design.md` (consistent search/filter UX, material-icons-round) and `docs/detailed-design/detailed-design.md` (results-framework-reporting module, client-side signals architecture). No module spec exists yet under `docs/specs/` for results-framework-reporting; this change documents behavior at the OpenSpec level.
- **QA:** design.md + specs will spell out testable flows so QA (Cami) can derive test cases (explicit request from Ángel).
