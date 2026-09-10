# Proposal — 3-Level Visual Hierarchy Refinement in Reporting AoW Table

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/reporting-aow-hierarchy` |
| Slug | `reporting-aow-hierarchy` — derived from free-text argument "procede" in context of AoW / HLO / Indicator hierarchy refinement |
| Type | Change |
| Approval Mode | gated |
| Depends on | none |
| Parallel-safe | yes (touches only presentation and CSS/DOM scaffolding in `reporting-aow-table`; no server, no migrations, no API contracts) |
| Requested by | Juan Carlos Cadavid — 2026-09-04 |
| Baseline consulted | `docs/prd.md`, `docs/ux-ui/design.md` §7 Design tokens · §8 Components · §9 Responsive, `docs/trd/trd.md`, `onecgiar-pr-client/CLAUDE.md`, `reporting-aow-table/CLAUDE.md` |
| Kaizen lessons applied | `KZ-changes--reporting-aow-jira-hierarchy-1` (template JIT compilation verification at every mutation), `KZ-changes--reporting-aow-jira-hierarchy-2` (protect public event contracts: `openRow`, `reportRow`, `openTarget`, `openAchieved`, `copyLink`) |
| Model | T1 Architect phase |

---

## Intent

Establish an unmistakable, 3-level visual hierarchy in the Result Framework Reporting AoW table (`reporting-aow-table.component.html`), distinguishing:
- **Level 1: Area of Work (AOW)** — Macro context container.
- **Level 2: High Level Outputs (HLO) / Outcomes / Intermediate Outcomes (IO)** — Meso grouping layer (work package / objective level).
- **Level 3: Indicators / Results** — Micro atomic reportable items.

Replace the current flat, single-plane alignment with a **Card-in-Card Nested Scaffolding** architectural pattern, distinct surface elevations, semantic taxonomy badges, and intentional child indentation.

---

## Problem / Current Behavior

Currently, all three levels in the grouped AoW view blend into a single visual plane:
1. **Flat Grid Syndrome:** Both HLO rows (`1.1: Agronomic and farm management...`) and Indicator rows share the exact same width, left padding (`px-[24px]`), and similar row heights.
2. **Violation of Gestalt's Law of Common Region:** HLO headers look like "just another row in the table" with a purple left border (`border-l-[3px]`), rather than reading as a **parent container** that encloses its child indicators.
3. **Disorientation on Scroll:** When scrolling through 10+ indicators, users lose track of which HLO they are viewing because the indicators lack structural nesting or indentation under the parent.
4. **Taxonomic Ambiguity:**
   - AoW has a purple badge (`AOW01`).
   - HLO only displays raw numbers without an explicit category badge (`1.1: ...`).
   - Indicators display purple badges (`Number of innovations (innovation development)`), visually clashing with the AoW badge and active filter pills.
5. **Dual-Persona Friction:** Program Leads / PMU (who need meso-level aggregate metrics: Target, Achieved, QA%) and Center Focal Points (who need micro-level indicator reporting) both encounter an undifferentiated "wall of text".

---

## Proposed Outcome

1. **Layer 1: Area of Work (AOW) — Shell Card:**
   - Outer card with `rounded-[14px]`, clean border, distinct brand header (`AOW01` purple chip, 52px compact header, global progress bar, By-AOW navigation button).
   - In-card quick-breakdown toolbar (Centers, Types) positioned as the macro controller.

2. **Layer 2: HLO / Outcome / IO — Meso Grouping Sub-Card:**
   - Presented as a distinct **nested section container / sub-card**:
     - Background surface tint (`bg-slate-50/90` or `bg-[#F8FAFC]`) creating an immediate visual boundary.
     - Semantic taxonomy badge: `[OUTPUT 1.1]` or `[OUTCOME 1.1]` using an indigo/slate palette (`bg-indigo-50 text-indigo-700 border-indigo-200/80 font-mono`) to distinguish from AoW purple and center chips.
     - Consolidated micro-KPI metrics on the right: Target total, Achieved total, KPI count badge (`32 KPIs`), QA/Prel % formatted cleanly.
     - Distinct collapsed/expanded state with smooth chevron rotation and left accent indicator.

3. **Layer 3: Indicators / Results — Micro Atomic Items:**
   - **Visual Nesting & Indentation:** Indicators are indented (`pl-[20px]` to `pl-[24px]`) inside an inset white container with a subtle vertical tree guide (`border-l-2 border-slate-200`).
   - **Contextual Sub-header:** The column header (`INDICATOR | TARGET | ACHIEVED | STATUS | PROGRESS | ACTION`) sits inside the indented child container with a compact, subtle styling (`h-[28px]`, `text-[10px]`, `text-slate-400 font-semibold uppercase`).
   - **Lightweight Row Details:** Clean typography (`text-[13px] text-slate-900 font-medium`), neutral center badges (`CIAT`, `IITA`), and refined `Report` button styling.

4. **100% Contract & Accessibility Preservation:**
   - All existing outputs (`openRow`, `reportRow`, `openTarget`, `openAchieved`, `copyLink`) remain untouched.
   - Full keyboard navigation (`Enter`, `Space`) and ARIA roles (`aria-expanded`, `button`) preserved verbatim.

---

## Scope

- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/`
  - `reporting-aow-table.component.html` — HLO accordion structure, sub-card enclosure, indicator nesting.
  - `reporting-aow-table.component.scss` — Scaffolding CSS, tree-line guide, surface tints, responsive tracks.
  - `reporting-aow-table.component.ts` — Any helper methods for taxonomy label rendering (e.g. distinguishing Output vs. Outcome tags if needed).
  - `reporting-aow-table.component.spec.ts` — Update and extend unit tests verifying DOM hierarchy, nesting, and click/event bindings.
- Documentation:
  - `reporting-aow-table/CLAUDE.md` — Document the 3-level hierarchy layout contract.

---

## Non-Goals

- No server-side or database changes (no TypeORM, no migrations, no API schema modifications).
- No changes to the flat table view (`viewMode() === 'flat'`).
- No modifications to data calculation logic (Target sums, Achieved sums, and QA percentages remain identical).
- No alteration of the public API event contracts.

---

## Affected Users, Systems, And Specs

| Entity | Impact |
|---|---|
| **Science Program Leads / PMU** | Instant scanning of HLO aggregates and work package progress without expanding every row. |
| **Center Focal Points / Researchers** | Clear spatial wayfinding: always know which HLO/AoW an indicator belongs to during reporting. |
| **`reporting-aow-table`** | Component template and SCSS updated with Card-in-Card scaffolding and indentation. |
| **`changes/reporting-aow-jira-hierarchy` (archived)** | Predecessor spec whose lessons (`KZ-changes--reporting-aow-jira-hierarchy-1` and `-2`) directly inform this execution. |

---

## Visual Reference

- **Source:** User screenshot + Generated Interactive HTML Mockup (`docs/specs/changes/reporting-aow-hierarchy/mockup/index.html`).
- **Location:** 
  - Interactive Mockup: [`docs/specs/changes/reporting-aow-hierarchy/mockup/index.html`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/changes/reporting-aow-hierarchy/mockup/index.html)
  - Proposed View Render: [`docs/specs/changes/reporting-aow-hierarchy/mockup/mockup-preview.png`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/changes/reporting-aow-hierarchy/mockup/mockup-preview.png)
  - Current Flat Capture: [`docs/specs/changes/reporting-aow-hierarchy/visual-reference/current-flat-hierarchy.png`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/changes/reporting-aow-hierarchy/visual-reference/current-flat-hierarchy.png)
- **Notes:** Full interactive mockup demonstrates the 3-level Card-in-Card architecture, the semantic `[OUTPUT 1.1]` badge, surface elevation contrast, 24px indicator indentation with left tree-line guide, and toggleable view for side-by-side comparison.

---

## Requirement Delta Preview

### ADDED Requirements
- `RAH-R-1`: HLO/Outcome header rendered with distinct surface background (`bg-slate-50/90` or `var(--pr-surface-subtle)`) and a dedicated semantic taxonomy pill (`[OUTPUT X.Y]` or `[OUTCOME X.Y]`).
- `RAH-R-2`: Indicators enclosed in a nested container with 20px–24px visual indentation and a subtle left tree-guide line (`border-l-2 border-slate-200/80`).
- `RAH-R-3`: Column header (`INDICATOR | TARGET | ACHIEVED...`) scoped inside the nested child container rather than spanning full card width.

### MODIFIED Requirements
- `RAH-R-4`: HLO row metrics updated from raw tabular numbers to styled micro-KPI summary blocks.
- `RAH-R-5`: Spacing and vertical dividers adjusted to prevent visual collisions across responsive breakpoints (≥900px desktop grid and <900px stacked).

### REMOVED Requirements
- None.

---

## Approach Options

| Option | Description | Trade-offs | Decision |
|---|---|---|---|
| **Option 1: Nested Card-in-Card Scaffolding (Recommended)** | Enclose each HLO and its indicators in a distinct sub-card with tinted header, indented child container, and tree-guide border. | Requires precise grid alignment for table tracks; delivers maximum Gestalt clarity and modern SaaS craft (Linear/Jira/GitHub style). | **Recommended** |
| **Option 2: Indentation with Tree Connector Only** | Keep existing flat card background, add 24px left margin and an SVG/CSS tree branch connector to indicator rows. | Simpler DOM diff, but lacks surface elevation; when scrolled deep, the parent HLO still gets lost without card framing. | Alternate |
| **Option 3: Pure Typographic & Color Styling** | Only change font-size and background color of the HLO row without changing indentation or DOM structure. | Minimal effort, but fails to solve the core UX problem (user still perceives a continuous flat table). | Rejected |

---

## Recommended Approach

**Option 1 (Nested Card-in-Card Scaffolding)**:
1. Wrap each HLO group in a dedicated sub-card structure within the expanded AoW body.
2. Style the HLO header bar with a subtle slate surface tint, semantic taxonomy badge (`OUTPUT` / `OUTCOME`), and micro-KPI metric cards on the right.
3. Indent the indicator container by 20–24px with a clean left border guideline (`border-l-2 border-slate-200`), cleanly hosting the contextual column headers and atomic indicator rows.
4. Verify responsiveness and ensure zero regressions across all 114+ unit tests and public event handlers.

---

## Risks, Dependencies, And Open Questions

- **Risk 1 (Horizontal Column Alignment):** Indenting indicator rows by 24px could shift columns relative to the HLO header if both attempt to align to the same top-level grid tracks.
  * *Mitigation:* The HLO header has its own balanced layout (Identity left, micro-KPIs right), while the indicator table maintains its self-contained 10-track grid (`$pr-reporting-tracks`) inside the indented container.
- **Risk 2 (JIT Template Parse Errors in Deep Control Flow):** Applying template changes across nested `@for`, `@if`, and `@let` blocks can trigger Angular compiler syntax issues.
  * *Mitigation:* Apply Kaizen lesson `KZ-changes--reporting-aow-jira-hierarchy-1`: execute `npx jest --testPathPattern="reporting-aow-table"` immediately after each template edit.
- **Risk 3 (Event Bubbling / Public Contract Breakage):** Adding wrapper containers must not capture or drop click events for `openRow`, `reportRow`, `openTarget`, `openAchieved`, and `copyLink`.
  * *Mitigation:* Apply Kaizen lesson `KZ-changes--reporting-aow-jira-hierarchy-2`: preserve exact event bindings and verify with existing automated test suite.

---

## Success Criteria

- [ ] **SC-1 (Visual Hierarchy):** Distinct 3-level visual separation clearly identifiable: AoW (macro shell) → HLO (meso sub-card) → Indicator (micro indented row).
- [ ] **SC-2 (Nesting Scaffolding):** Indicators visually indented by 20–24px under HLO with a subtle vertical guide line.
- [ ] **SC-3 (Taxonomy Badges):** Explicit semantic pill displayed for HLO/Outcomes.
- [ ] **SC-4 (Test Integrity):** 100% of existing tests in `reporting-aow-table.component.spec.ts` (and whole suite) pass.
- [ ] **SC-5 (Lint & Type Safety):** Clean `ng lint` with 0 errors.
- [ ] **SC-6 (Accessibility):** Keyboard navigation (`Tab`, `Enter`, `Space`) and ARIA attributes remain fully operational.

---

## Next Step

Run:

```text
/akili-specify changes/reporting-aow-hierarchy
```
