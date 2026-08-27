# Proposal — Intermediate Outcome Target Tooltip

## 1. Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/results/intermediate-outcome-aow-visibility/target-tooltip` |
| **Parent Spec** | `docs/specs/results/intermediate-outcome-aow-visibility/` |
| **Type** | Trivial |
| **Approval Mode** | gated (default) |
| **Date** | 2026-08-26 |
| **Requester** | santiago.sanchez@cgiar.org (chat request, no Jira ticket) |

## 2. Intent

Add a tooltip to the **target value** shown on every indicator row inside the **Intermediate outcomes** card of the Reporting tab (`entity-details/:program?tocView=aows`), telling the user the number is not exclusive to any single Area of Work.

## 3. Problem / Current Behavior

The Reporting tab renders Intermediate Outcomes as one program-level card, sibling to the per-AoW cards (`dashboard-lab.component.ts` `reportingGroups()`, deliberate design decision — see family.md). Each row shows a bare `Target` figure (`reporting-aow-table.component.html`, `indicatorRow` template, item 4, ~line 492) with no indication that this figure is a cross-cutting value, not something scoped to one AoW. A user who lands on this card from an AoW-filtered view can misread the number as "the target for this AoW."

## 4. Proposed Outcome

The Target figure/label in the Intermediate outcomes card carries a tooltip (via the existing `prTooltip` directive, already used elsewhere in this same template for `Achieved` and the status mark) reading:

> "This target is not exclusive to that AoW."

Wording note: the user's requested phrase was *"the target is not exclusive to that AOW when viewed within an AoW"* — tightened above for the tooltip's small footprint; final copy is confirmed in Approach Options below.

## 5. Scope

- `reporting-aow-table.component.ts` / `.html` — add a `prTooltip` binding to the Target cell (`indicatorRow` ng-template) that only renders when the row belongs to the `intermediate` bucket (`group.kind === 'intermediate'`, see `reportingGroups()`).
- No change to the `flat` (All indicators) view target cell — out of scope per user's answer ("solo para la parte de Intermediate Outcomes"); revisit only if the user later asks for the flat table too.
- No change to the legacy `entity-aow-aow` / `aow-hlo-table` flow (P22-era route) — it already has its own "Not exclusive to this AoW" chip at the group-header level (see Risks).

## 6. Non-Goals

- Not touching the AoW selector at result creation (child spec `aow-selector`).
- Not adding this tooltip to HLO or 2030 Outcomes rows — both are legitimately scoped to one bucket (AoW or a single program-level 2030 card) and the ambiguity does not apply.
- Not restyling the Target cell beyond adding the tooltip trigger.

## 7. Affected Users, Systems, And Specs

- **Users**: Reporting phase submitters and PMU leads viewing the Reporting tab's Intermediate outcomes card.
- **Code**: `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/` (`.ts`, `.html`, `CLAUDE.md` re-stamp per convention).
- **Specs**: none pre-existing under `docs/specs/` for this component; this creates the first.

## 8. Visual Reference

- Source: User-provided screenshot (Reporting tab, Intermediate outcomes card, `tocView=aows`).
- Location: not persisted as a file — described inline; matches the live `reporting-aow-table.component.html` `indicatorRow` template exactly (badge "INTERMEDIATE", progress bar, Target/Achieved figures, Report button).
- Notes: no separate mockup needed — the tooltip is additive to an existing, already-implemented row.

## 9. Requirement Delta Preview

### ADDED Requirements
- Hovering/focusing the Target figure on an Intermediate Outcome row shows a tooltip clarifying the value is not AoW-exclusive.

### MODIFIED Requirements
- None (purely additive).

### REMOVED Requirements
- None.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A. `prTooltip` on the Target button (recommended)** | Bind `[prTooltip]="isIntermediate(row) ? intermediateTargetTooltip : ''"` on the same `<button>` that already wraps the Target figure, mirroring the existing `achievedTooltip(row)` pattern one cell over. | Zero new dependencies, consistent with the row's existing tooltip pattern, one-line template change + one small `.ts` helper. |
| **B. Static info icon next to "Target" label** | Add a small `ⓘ` next to the "Target" caption with its own tooltip. | More visually explicit, but adds a DOM node to every row in a dense table and duplicates the info-icon pattern already used at the card-header level (`isInfoOpen`/`toggleInfo`) — inconsistent affordance for the same fact. |

**Recommended: Option A.** It reuses an established pattern in the exact same row (`achievedTooltip`) and needs no new UI chrome.

## 11. Risks, Dependencies, And Open Questions

- **Risk — copy consistency**: the legacy `entity-aow-aow` flow already ships a similar message ("This Intermediate Outcome is not assigned to a single Area of Work, so it appears under all of them.") as a group-level chip. Recommend keeping tooltip copy short and NOT verbatim-identical, since it explains the **target number**, not the **outcome's AoW membership** — a subtly different fact. Confirm exact final copy at `/akili-specify`.
- **Open question**: should the tooltip also appear in the "All indicators" flat table view for Intermediate Outcome rows? User said scope is Intermediate Outcomes only; the flat table mixes all buckets in one table, so this needs a `group.kind`-equivalent per-row flag there too if extended later.

## 12. Success Criteria

- Hovering (or focusing, for keyboard users) the Target value on any row inside the Intermediate outcomes card shows the tooltip text.
- No tooltip appears on Target cells in AoW (HLO/Outcome) or 2030 Outcomes cards.
- `npx ng lint --quiet` and the component's Jest spec stay green; no Cypress impact (no `custom-fields/` touched).

## 13. Next Step

This is a one-line, additive, copy-only UI change using an existing directive (`prTooltip`) already wired in this exact template — it fits the Trivial fast-track.

```text
/akili-quick intermediate-outcome-target-tooltip
```
