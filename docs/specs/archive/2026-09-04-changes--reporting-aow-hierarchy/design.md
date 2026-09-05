# Design Spec — 3-Level Visual Hierarchy Refinement in Reporting AoW Table

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/reporting-aow-hierarchy` |
| Feature Name | 3-Level Visual Hierarchy Refinement (`reporting-aow-table`) |
| Module Code | `RAH` |
| Type | Change |
| Depth | Standard |
| Approval Mode | gated |
| Status | in-review |
| Requirements Reference | [`docs/specs/changes/reporting-aow-hierarchy/requirements.md`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/changes/reporting-aow-hierarchy/requirements.md) |
| Visual Mockup Reference | [`docs/specs/changes/reporting-aow-hierarchy/mockup/index.html`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/changes/reporting-aow-hierarchy/mockup/index.html) · [`mockup-preview.png`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/changes/reporting-aow-hierarchy/mockup/mockup-preview.png) |
| Target Package | `onecgiar-pr-client` |
| Kaizen Lessons Applied | `KZ-changes--reporting-aow-jira-hierarchy-1` (template JIT compilation verification at every mutation), `KZ-changes--reporting-aow-jira-hierarchy-2` (protect public event contracts) |

---

## 1. Summary

This design defines the technical implementation of the 3-level visual hierarchy in the `ReportingAowTableComponent` (`pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/`).

The solution transforms the flat, single-plane presentation into a structured **Card-in-Card Nested Scaffolding** architecture:
- **Level 1 (AOW):** Outer card container with 14px radius, clear identity header, and toolbar integration.
- **Level 2 (HLO/Outcome/IO):** Autonomous sub-card with a distinct surface tint (`bg-slate-50/90`), semantic taxonomy pill (`[OUTPUT X.Y]` or `[OUTCOME X.Y]`), and micro-KPI metric cards.
- **Level 3 (Indicators):** 20px–24px indented child region supported by a vertical tree guideline (`border-l-4 border-indigo-500/40`), hosting a scoped contextual column header and atomic indicator rows.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system
- **Package:** `onecgiar-pr-client`
- **Component:** `src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/`
- **Templates & Styles:**
  - `reporting-aow-table.component.html` (DOM restructuring and container encapsulation)
  - `reporting-aow-table.component.scss` (Grid track alignment, tree line guidelines, surface elevation)
  - `reporting-aow-table.component.ts` (View model taxonomy helpers and open/closed state management)
  - `reporting-aow-table.component.spec.ts` (Unit test assertions verifying DOM structure and event outputs)
- **Host Component:** `DashboardLabComponent` consumes `ReportingAowTableComponent` without interface modifications.

### 2.2 Component Hierarchy & Containment Tree
```
[Section: Level 1 - AoW Outer Card] (rounded-2xl, border-slate-200)
  ├── [Button: AoW Header Bar] (AOW01 chip, Title, Progress Bar, By-AOW Button)
  ├── [Div: In-Card Quick Breakdown Toolbar] (Centers, Types)
  └── [Div: Expanded Content Area]
        ├── [Div: Band Label / Eyebrow] ("HIGH LEVEL OUTPUTS", Collapse all)
        └── [Div: Level 2 - HLO Sub-Card Container] (rounded-xl, border-slate-200, shadow-2xs)
              ├── [Button: HLO Header Bar] (Surface tint, Semantic [OUTPUT 1.1] chip, Title, Micro-KPIs)
              └── [Div: Level 3 - Indented Inset Container] (pl-6, border-l-4 border-indigo-500/40)
                    ├── [Div: Scoped Column Sub-Header] (h-7, compact uppercase labels)
                    └── [Div: Indicator Rows] (concentric bullseye, title, metadata badges, actions)
```

---

## 3. Directory Structure

The change is strictly contained within existing client files:

```text
onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/
├── reporting-aow-table.component.html       # Updated DOM structure for sub-card and indented indicators
├── reporting-aow-table.component.scss       # Scaffolding classes, tree guidelines, responsive track adjustments
├── reporting-aow-table.component.ts         # Taxonomy helper methods (e.g. taxonomyBadge(hlo))
├── reporting-aow-table.component.spec.ts   # Structural and regression test updates
└── CLAUDE.md                                # Updated component documentation
```

---

## 4. State & Data Model

No changes to external APIs or parent inputs. The component uses its existing Signal-driven models:
- `visibleGroups`: Computed signal of AoW groups.
- `bandsOf(group)`: Decomposes group indicators into logical bands (High Level Outputs vs Outcomes vs Intermediate Outcomes).
- `isOpen(key, defaultVal)`: Tracks open/collapsed state for AoW keys (`aow::<code\>`) and HLO keys (`hlo.key`).

### Helper Taxonomy Resolution
To support `RAH-R-2` (Semantic Taxonomy Badges), a lightweight helper method `hloTaxonomy(hlo: BandGroup): { type: 'OUTPUT' | 'OUTCOME' | 'IO', code: string }` resolves the node type from `hlo.code` or parent band metadata:
- Codes matching `^\d+\.\d+` or categorized under High Level Outputs resolve to `OUTPUT`.
- Codes categorized under Outcomes resolve to `OUTCOME`.
- Codes categorized under Intermediate Outcomes resolve to `IO`.

---

## 5. Frontend & UX Component Architecture

### 5.1 Level 2 HLO Sub-Card Enclosure
Instead of rendering the HLO header as an un-enclosed table row, each HLO group is wrapped in an autonomous card container:
- **Card wrapper:** `rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden`.
- **Header Bar:** Flex container with subtle surface gradient (`from-slate-50 via-indigo-50/30 to-slate-50`) and bottom divider.
- **Left Identity:** Square rotating chevron button, semantic taxonomy chip (`bg-indigo-100 text-indigo-800 border-indigo-200/70 font-mono font-bold`), and truncated title (`text-[13.5px] font-bold text-slate-900`).
- **Right Metrics:** Grouped mini-dashboard:
  - Target: Extrabold 14px text with uppercase micro-label.
  - Achieved: Extrabold 14px emerald text with uppercase micro-label.
  - Count: Pill badge with `X indicators` in soft slate/white.
  - QA/Prel: Tabular percentages with micro-labels.

### 5.2 Level 3 Visual Indentation and Tree Scaffolding
- **Indentation:** The indicator wrapper inside the HLO card applies `pl-6` (24px) padding.
- **Tree Guideline:** A left border accent (`border-l-4 border-indigo-500/40`) provides immediate Gestalt enclosure connecting child rows to the HLO header.
- **Column Sub-Header:** Styled as a compact bar (`h-7 bg-slate-50/50 border-b text-[10px] text-slate-400 font-bold uppercase tracking-wider`) sharing the indicator grid tracks.
- **Indicator Rows:** White card background with subtle hover (`hover:bg-slate-50/80`), preserving the 10-track layout (`pr-grid-row`), bullseye icon, and interactive controls.

### 5.3 Responsive Behavior (<900px)
- On desktop (≥900px): Full 10-track tabular layout with aligned columns.
- On mobile / tablet (<900px): Non-critical secondary labels (e.g. text labels next to figures) collapse to maintain touch-target comfort and prevent horizontal clipping.

---

## 6. Design Tokens & Visual Specs

| Token / Style | Usage | Source / Value |
|---|---|---|
| `--pr-surface-card` | AoW and Indicator row background | `#ffffff` |
| `--pr-surface-subtle` | HLO Header surface tint | `#f8fafc` / `slate-50` |
| `--pr-color-primary-500` | Brand primary accent | `#5733c4` |
| Indigo Taxonomy Chip | HLO `[OUTPUT X.Y]` badge | `bg-indigo-100/80 text-indigo-800 border-indigo-200/70` |
| Tree Guideline Accent | Indicator left scaffolding border | `border-indigo-500/40` |
| Neutral Badges | Center indicators (e.g. `IITA`, `CIAT`) | `bg-slate-100 text-slate-700 border-slate-200` |
| Type Badges | Indicator category pill | `bg-purple-50 text-purple-700 border-purple-100` |

---

## 7. Event Contracts & Public Interface

The public interface of `ReportingAowTableComponent` remains strictly intact:
- `@Output() openRow = new EventEmitter<ReportingRowModel>();`
- `@Output() reportRow = new EventEmitter<ReportingRowModel>();`
- `@Output() copyLink = new EventEmitter<ReportingRowModel>();`
- `@Output() openTarget = new EventEmitter<ReportingRowModel>();`
- `@Output() openAchieved = new EventEmitter<ReportingRowModel>();`
- `@Output() openAow = new EventEmitter<string>();`

Every interactive action button inside the new nested indicator container continues to invoke `emitAndStop(...)` to ensure clicks do not trigger unintentional row selection or accordion toggling.

---

## 8. Design Decisions

### `RAH-DD-1`: Sub-Card Framing over Flat Table Borders
- **Problem:** Flat horizontal borders between HLOs and indicators blend into an undifferentiated grid.
- **Decision:** Wrap each HLO group and its child indicators in a distinct `rounded-xl border border-slate-200` sub-card container.
- **Alternatives Considered:** 
  - *Option B (Indentation without sub-card):* Rejected because deep scrolling still loses parent context without card enclosure.
  - *Option C (Color tinting only):* Rejected as it fails Gestalt Law of Common Region.

### `RAH-DD-2`: Semantic Taxonomy Badges over Raw Numeric Codes
- **Problem:** Showing only `1.1:` causes users to wonder whether the item is an Output, Outcome, or Work Package, while colliding with AoW codes.
- **Decision:** Display explicit badges (`OUTPUT 1.1`, `OUTCOME 1.2`) with monospace typography and distinct indigo styling.

### `RAH-DD-3`: Inset Tree Guideline with 24px Indentation
- **Problem:** Having indicators at the exact same left margin as the HLO makes them appear as siblings rather than children.
- **Decision:** Indent indicator rows by 24px (`pl-6`) and anchor them with an accent left border (`border-l-4 border-indigo-500/40`).

---

## 9. Sizing Budget & Tripwire

- **Expected Tasks:** 3 executable tasks (`RAH-T-1`, `RAH-T-2`, `RAH-T-3`).
- **Expected LOC Diff:** ~120 to ~160 LOC.
- **Expected Review Rounds:** 1 round.
- **Tripwire:** If implementation requires modifying external components or exceeding 4 tasks, stop and escalate.

