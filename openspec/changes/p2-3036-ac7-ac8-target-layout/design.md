## Context

All edits live in `multiple-wps-content.component.html` (P25 Contributors & Partners → Yes scenario). Current structure (Yes, indicator selected):
1. KPI/Indicator select (lines 82-93)
2. `@if (isCP2026() && indicatorTypologyValue())` → "Indicator Tipology" read-only (96-103)
3. `@if (activeTab.indicators[0].related_node_id)` block (105-122): "Contribution to indicator target" header → info note → `<div *ngIf="selectedIndicatorData()">` with Unit of measurement + Target (109-112) → `<input placeholder="Enter target" [(ngModel)]="...contributing_indicator">` (113-120)
4. `@if (!hidden)` → "Explanation of how the result aligns..." textarea (125-143)

The 2026 redesign is gated by `isCP2026()` (`FieldsManagerService.isContributorsPartners2026`). The Indicator Tipology field already only renders in 2026. Unit/Target/Contribution/Explanation currently render in both phases.

## Goals / Non-Goals

**Goals:** apply AC7 (reorder read-only data, mandatory contribution + asterisk, placeholder) and AC8 (hide explanation) in the 2026 Yes scenario only; keep 2025 byte-for-byte unchanged.

**Non-Goals:** no backend; no server completeness/green-check change; no change to the No scenario; AC9 (geographic) not included.

## Decisions

**D1 — Reorder via phase-split, not a single move.** To keep 2025 identical, the Unit/Target display is duplicated by phase: a new `@if (isCP2026() && selectedIndicatorData())` block placed right after the Indicator Tipology field renders Unit/Target for 2026; the existing inline Unit/Target div inside the `related_node_id` block is gated with `@if (!isCP2026())` so it only shows for 2025. Net: 2026 = grouped under Tipology; 2025 = original position.

**D2 — Mandatory = asterisk + client feedback, not backend.** Set the contribution field-header `[required]="isCP2026()"` for the red asterisk. To make it a scannable mandatory field (the section's `someMandatoryFieldIncomplete...` DOM scan looks for `.pr-field.mandatory:not(.complete)`), add a hidden `<div appFeedbackValidation labelText="Contribution to indicator target" [isComplete]="...">` gated by `isCP2026()`, mirroring the P2-2960 pattern, since the input is a bare `<input>` not an `app-pr-select`. Completeness on `contributing_indicator` having a value. Server green-check is out of scope.

**D3 — Placeholder by phase.** `[placeholder]="isCP2026() ? 'Add here contribution to target' : 'Enter target'"` on the input — keeps 2025 text intact.

**D4 — Hide explanation in 2026.** Change `@if (!hidden)` to `@if (!hidden && !isCP2026())`. The block is already Yes-scoped (inside `!isUnplanned`), so this hides it for the 2026 Yes scenario while leaving 2025 (and the `hidden` parent control) untouched.

## Risks / Trade-offs

- [Duplicated Unit/Target markup (one per phase)] → Small, read-only interpolation; acceptable to guarantee 2025 stays identical. Same pattern the redesign already uses for copy.
- [Mandatory feedback wiring] → If `appFeedbackValidation` proves unnecessary for AC7 (asterisk-only intent), the hidden div can be dropped; confirm intended strictness. Asterisk via `[required]` is the guaranteed visible part.
- [No unit tests] → component excluded from coverage; verify via `build:dev` + visual on a 2026 result (new layout, asterisk, placeholder, no explanation) and a 2025 result (unchanged).
