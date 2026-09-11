## Context

P2-3063 (L3) first slice: a read-only statement field for the selected TOC node, in the P25 Contributors & Partners ToC detail (`multiple-wps-content`). The data already arrives in the control-list response (`outcome_statement`), so this is a display-only change.

**Goals:** show the selected node's statement read-only, with a level-dynamic label and an info tooltip, between the HLO/Outcome dropdown and the KPI field. Keep 2025 and the reuse contexts (IPSR / bilateral / share-request) unchanged.

**Non-Goals:** no backend/save; no Indicator Typology, radio, or Centers/SP/W3 behavior (separate slices/tickets); no change to the No scenario.

## Decisions

**D1 — Read it from `outcome_statement`, not a new request.**
The control list the front already loads (`findTocResultByConfigV2`) carries `outcome_statement` per node since Juan David's enrichment (`df27cc55a`). We look up the selected node by `toc_result_id` in the list matching the chosen `toc_level_id` (1 output / 2 outcome / 3 eoi) — the exact pattern `updateSelectedIndicatorData()` already uses. Fallback to `description` (the raw source field) for safety.

**D2 — Reuse `app-pr-field-header` for the read-only display.**
`app-pr-field-header [label] [description] [tooltip] [showDescriptionLabel]="false"` already renders a label + a grey read-only box + the info-icon tooltip (the tooltip input was added in P2-3061). This matches the mockup exactly and avoids a bespoke component. Project design line: PrimeNG + custom-fields, `material-icons-round` + `pTooltip`.

**D3 — Dynamic label from the level name.**
`hloStatementLabel = secondFieldLabel() + ' Statement'`. `secondFieldLabel()` already resolves the chosen level's display name (`High Level Output` / `Intermediate Outcome` / `2030 Outcome`), so the label tracks the selection without a hardcoded map.

**D4 — Gate by `isCP2026()` + Yes + node selected.**
`@if (isCP2026() && !isUnplanned && activeTab?.toc_result_id && hloStatementValue())`. 2025 and non-2026 reuse contexts never render it; in 2026 it appears only once the user has picked a node and a statement exists.

## Risks / Trade-offs

- [Component excluded from Jest coverage] → gate = build + visual before/after on 2026 (statement shows) and 2025 (no statement). Verified via Playwright on a served prod build.
- [`outcome_statement` empty for some nodes] → the `hloStatementValue()` guard hides the field rather than showing an empty grey box.

## Open Questions

- **OQ1:** Should the field also render in read-only/review surfaces (PDF, review drawer) for 2026? Out of scope here; revisit if QA flags it.
