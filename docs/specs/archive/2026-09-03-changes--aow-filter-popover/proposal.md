# Module Spec Proposal — AoW In-Card Filter Overflow & Indicator Row Compaction

- **Module:** `results-framework-reporting`
- **Feature:** `aow-filter-popover`
- **Type:** Change
- **Approval Mode:** `gated`
- **Spec Path:** `docs/specs/changes/aow-filter-popover/`
- **Branch:** `qa-development-2026`

---

## 1. Intent

Refine the Area of Work (AoW) expanded indicators view in Results Framework Reporting into a clean, compact, enterprise-grade interface. This proposal addresses three interconnected UX/UI issues identified by the user:
1. **Responsive in-card filter overflow:** Replace the crammed horizontal button list with the Top-N + `[ ⠚ Filter ]` popover pattern.
2. **Row typography and element sizing:** Scale down oversized indicator titles, Target/Achieved figures, and Report CTA to standard enterprise table proportions.
3. **Action column cleanup:** Permanently remove the transient `Next pending` button from the grouped indicator row.

---

## 2. Problem / Current Behavior

### A. In-Card Filters Squeezed / Crammed ("Apeñuscamiento")
In `ReportingAowTableComponent` and the By-AoW view, all Centers and Types buttons are rendered in a single flat row:
- When an AoW has 8 Centers and 4 Types, 14+ buttons compete for space.
- On viewports <1280px or laptop screens, buttons get crammed against each other, text truncates awkwardly, or a clumsy horizontal scrollbar appears.

### B. Oversized Indicator Row Elements
In `#indicatorRow`:
- **Title:** `text-[13.5px] font-semibold leading-[1.4]`, producing heavy blocks of text.
- **Target & Achieved:** `text-[15px] font-bold` with separate `10px` uppercase labels, creating large vertical blocks.
- **Report Button:** `height: 32px; font-size: 14px;` (`.pr-row-action`) styled as a primary page action rather than a compact table row action.
- **Row Height:** `min-height: 58px; padding: 10px 20px 10px 32px;`, showing fewer rows on screen than desired.

### C. Inconsistent "Next Pending" Action
A transient `Next pending` button appears only on the last-reported indicator row, shifting the row's action layout unexpectedly and bloating row height.

---

## 3. Proposed Outcome

### 1. In-Card Filter Overflow Popover ("Salir algunos y el resto en Filter")
- **Centers:** Always show `All (total)` + top **3** centers with the highest indicator count.
- **Types:** Always show `All Types` + top **2** types.
- **`[ ⠚ Filter ]` Button:** Sleek white button with funnel icon (`lucideFilter` or Material `filter_list`) positioned at the end of the strip.
- **Dropdown Popover:** Clicking `[ ⠚ Filter ]` displays a floating menu cleanly listing remaining Centers and Types with their counts.
- **Active State:** If an overflow filter is selected, `[ ⠚ Filter ]` reflects the active selection.
- **Responsive Sizing:** Adapts cleanly down to 768px without horizontal overflow.

### 2. Scaled-Down, Compact Indicator Row
- **Indicator Title:** `text-[12.5px] font-medium leading-[1.35] text-[var(--pr-text-heading)]`.
- **Target / Achieved Numbers:** `text-[13px] font-bold tabular-nums` with a subtle `text-[9px]` label below.
- **Report Button:** Compact table action: `h-[26px] px-[10px] text-[11px] font-medium rounded-[6px]`.
- **Icon Actions (`[ 🔗 ]` and `[ ⋯ ]`):** Compacted to `26px × 26px`.
- **Status Pill:** `h-[22px] px-[7px] text-[10.5px] font-semibold`.
- **Row Height:** Compacted to `min-height: 48px; padding: 8px 16px 8px 24px;` (gaining ~20% more visible rows).

### 3. Removal of "Next Pending" Button
- Completely remove the `Next pending` / `All pending KPIs reported` block from `#indicatorRow` in `ReportingAowTableComponent`.
- The action group is uniformly composed across all rows: `[ 🔗 ]` + `[ Report ]` + `[ ⋯ ]`.

---

## 4. Scope

- **Files to Edit:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.scss`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.spec.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.spec.ts`

---

## 5. Non-Goals

- Do NOT remove indicator reporting capabilities, modal drawers, or permissions.
- Do NOT alter the global top toolbar search/filter controls.

---

## 6. Visual Reference

- `docs/specs/changes/aow-filter-popover/mockup/crammed-filter-buttons.png` (Current crammed filters)
- `docs/specs/changes/aow-filter-popover/mockup/jira-toolbar-filter-button-reference.png` (Target Filter button reference)
- `docs/specs/changes/aow-filter-popover/mockup/indicator-row-oversized-elements.png` (Oversized title, target, achieved, report button)
- `docs/specs/changes/aow-filter-popover/mockup/next-pending-button-to-remove.png` (Next pending button to remove)

---

## 7. Requirement Delta Preview

### ADDED
- Slicing and overflow derivation for Centers and Types in AoW cards.
- In-card `[ ⠚ Filter ]` button with popover dropdown.
- Active overflow indicator badge.

### MODIFIED
- `#indicatorRow` element sizes: title `12.5px`, target/achieved `13px`, report button `26px`, row height `48px`.
- Quick filter container: non-overflowing fixed height bar.

### REMOVED
- `Next pending` button in `#indicatorRow`.
- Inline rendering of unlimited filter chips in a single unconstrained row.

---

## 8. Success Criteria

1. In any AoW card with >3 centers or >2 types, at most 3 centers + 2 types + 1 `[ ⠚ Filter ]` button are displayed.
2. `[ ⠚ Filter ]` button opens the popover with remaining centers and types; selecting any updates results immediately.
3. Indicator rows render with compact 48px height, 12.5px title, 13px numbers, and 26px Report button.
4. "Next pending" button is completely absent from all indicator rows.
5. 100% of unit tests pass with zero regressions.

---

## 9. Next Step

```text
/akili-specify changes/aow-filter-popover
```
