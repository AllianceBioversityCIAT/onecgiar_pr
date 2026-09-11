# Module Spec — Design: Reporting AoW & HLO JIRA-Style Hierarchy

- **Module:** `results-framework-reporting`
- **Feature:** `reporting-aow-jira-hierarchy`
- **Owner:** Frontend Engineering / Design Team
- **Status:** `in-review`
- **Approval Mode:** `gated`
- **Branch:** `qa-development-2026`
- **Requirements Reference:** [`docs/specs/changes/reporting-aow-jira-hierarchy/requirements.md`](./requirements.md)
- **PRD Reference:** `docs/prd.md` (G1, G2, US-S1, US-Q1, AC-1, AC-6)
- **UX/UI Reference:** `docs/ux-ui/design.md` (§7 Design Tokens, §8 Components, §9 Visual Polish)
- **TRD Reference:** `docs/trd/trd.md` (§5 Frontend Architecture, Workflow W1)

---

## 1. Summary

This design establishes a clean, high-density, and structured UX/UI for the Theory of Change Area of Work (AoW) and High-Level Output (HLO) sections in the PRMS Reporting tab, drawing direct inspiration from **JIRA Product Discovery List Views** (`mockup/jira-product-discovery-list.png`) and JIRA Backlog work-item hierarchies.

It removes the redundant section title `Report results linked to the program's 2026 ToC` from the sticky band (freeing ~50px of vertical space), consolidates cluttered HLO header metrics into an aligned tabular grid (eliminating duplicate `2 KPIs` / `2 indicators` text), introduces JIRA-style semantic left-edge status stripes and status pills on indicator rows, streamlines bulky in-card filters into a single-line quick-filter bar (height ≤ 32px), and unifies the presentation layer between the `All AOWs` (`tocView=aows`) overview and the `By AOW` (`tocView=byAow`) focused view.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system
- **Client Components Touched:**
  1. `ReportingProgramBandComponent` (`reporting-program-band/`): Removal of redundant section heading.
  2. `ReportingAowTableComponent` (`reporting-aow-table/`): AoW card header metrics, compact quick-filters, HLO accordion bar refactor, and indicator row JIRA status stripe.
  3. `DashboardLabComponent` (`dashboard-lab.component.html` & `.ts`): By-AOW view styling and HLO badge standardization.
- **Server Modules Touched:** None (zero API or database changes).
- **External Integrations Touched:** None.

### 2.2 Component Hierarchy & Information Architecture
```text
DashboardLabComponent (rfrView === 'planned')
 ├── ReportingProgramBandComponent (sticky toolbar & program identity)
 │     └── [KPI Metrics Cards] (Total, Reported, Progress, Evidence)
 │         └── (Redundant "Report results linked..." heading REMOVED)
 │
 ├── [View A: tocView === 'aows']
 │     └── ReportingAowTableComponent (viewMode === 'grouped')
 │           └── AoW Card (Level 1: Epic / Group Container)
 │                 ├── AoW Header (Badge, Title, Progress bar, [By AOW] action)
 │                 ├── Quick-Filters Bar (Level 1.5: Compact Center & Type chips ≤ 32px)
 │                 └── HLO Accordion Section (Level 2: Work Package)
 │                       ├── HLO Header Bar (Badge `HLO4`, Title, Tabular Metrics, Count `[ N ]`)
 │                       └── Indicator Rows (Level 3: JIRA-Style Work Items)
 │                             ├── Left Status Stripe (3px: Emerald, Purple, Violet, Slate)
 │                             ├── Target Icon + Description + Inline Chips (Type, Center)
 │                             └── Tabular Metrics (Target, Achieved, Status Badge, Progress, Actions)
 │
 └── [View B: tocView === 'byAow']
       ├── AoW Context Banner
       ├── Quick-Filters Bar (Same compact styling)
       └── HLO Accordion Section (Identical Level 2 & Level 3 structure as View A)
```

---

## 3. Data Model Changes

No changes to entities, migrations, or database schema. The existing `ReportingAowGroup`, `ReportingHloBand`, `ReportingHloGroup`, and `ReportingIndicator` structures provide all necessary data points.

---

## 4. API Surface

No changes to API endpoints or DTOs. Client consumes existing endpoints:
- `GET /api/results/toc-results?initiativeId={id}&phase={phase}`
- `GET /api/results/all-indicators-overview?initiativeId={id}&phase={phase}`

---

## 5. Server Workflow / Business Rules

No server-side workflow changes. The existing workflows (W1 Result Reporting, W2 QA Review) remain unaffected.

---

## 6. Frontend Plan

### 6.1 Program Band Refactor (`ReportingProgramBandComponent`)
- In `reporting-program-band.component.html`, remove the section heading block:
  ```html
  <!-- REMOVE lines 749-755: -->
  <div class="px-[32px] pt-[24px] pb-[8px]">
    <h2 class="m-0 text-[20px] font-bold leading-[1.35] tracking-[-0.01em] text-[var(--pr-text-heading)]">
      {{ reportingHeading() }}
    </h2>
  </div>
  ```
- Reclaims ~50px of vertical space, allowing AoW cards and the top filter bar to sit immediately below the KPI summary tiles.

### 6.2 HLO Header Redesign (`ReportingAowTableComponent` & `DashboardLabComponent`)
- Standardize the HLO code badge:
  - Add helper `cleanHloCode(raw: string): string` extracting clean HLO token (e.g. `HLO4` from `HLO4.AOW1.IO1` or from the HLO key).
  - Render an inline badge `pr-hlo-code` with purple background (`bg-purple-100 text-[var(--pr-color-primary-700)] border border-purple-200/70 font-mono text-[11px] font-bold rounded-[5px] px-[6px] py-[1px]`).
- Typography alignment (`h4` token per `docs/ux-ui/design.md` §7):
  - HLO title styled with `text-[14px] font-bold leading-[1.35] tracking-[-0.01em] text-[var(--pr-text-heading)] min-w-0 truncate`.
- Consolidate metrics into a structured tabular flex layout:
  - Left: Chevron + `HLO4` badge + Title (truncate with `min-w-0`).
  - Right: Tabular metrics cluster:
    - `Target: X` (label in `text-[9.5px] uppercase tracking-wider text-[var(--pr-text-muted)]`, value bold)
    - `Achieved: Y` (value in `font-bold tabular-nums text-[var(--pr-color-green-500)]`)
    - `QA: %` / `Prel: %` (percentages with tooltip)
    - Indicator count badge `[ N ]` (font-semibold, rounded-full, px-[8px] py-[2px] text-[11px]).
  - REMOVE the redundant trailing subtitle `N indicators`.
- **Responsive Degradation Ladder (RAJ-R-6):**
  - Viewports ≥ 1200px: Full display including achievement coverage text (`N of M indicators`).
  - Viewports 900px–1199px: Achievement coverage text drops to `hidden` / `sr-only`; Target, Achieved, QA/Prel, and Count badge remain visible.
  - Viewports < 900px: QA/Prel percentages collapse to `max-[899px]:sr-only` (accessible to screen readers); Target and Achieved remain visible alongside count badge, avoiding horizontal overflow.

### 6.3 Indicator Row JIRA Polish (`#indicatorRow` template)
- Add a 3px semantic left border mapped to PRMS color tokens (`docs/ux-ui/design.md` §7):
  - `pr-reporting-row` gets `border-l-[3px]` dynamically set by status:
    - `achieved` → `border-l-[var(--pr-color-green-500)]`
    - `overachieved` → `border-l-purple-500`
    - `in-progress` → `border-l-[var(--pr-color-primary-500)]`
    - `not-started` → `border-l-[var(--pr-border-strong)]`
- Maintain high-density alignment & responsive rules:
  - Column 1: Left status stripe + Concentric target status mark (`pr-status-mark`).
  - Column 2: Indicator description (`min-w-0 flex-1`, clamp-2 with Show more toggle) + single-line metadata chips (`flex flex-wrap items-center gap-[6px]`):
    - Result type chip (`bg-[#6b46e51f] text-[var(--pr-color-primary-400)] rounded-full px-[8px] py-px text-[11px] font-semibold`).
    - Center acronym chip (`bg-slate-100 text-slate-700 border border-slate-200 rounded-[5px] px-[6px] py-[1px] text-[11px] font-medium`).
  - Column 3: Target value (bold tabular-nums, centered).
  - Column 4: Achieved value (bold tabular-nums, centered).
  - Column 5: Status badge (JIRA Product Discovery style pill: subtle border, rounded-[6px] or rounded-full, with status bullet and chevron `v`, e.g. `[ Achieved v ]`, `[ In Progress v ]`, `[ Not Started v ]`, `max-[768px]:hidden`).
  - Column 6: Progress column (JIRA-style mini progress track: `w-[50px] h-[6px] rounded-full bg-[var(--pr-border)]` with fill + tabular `QA %` and `Prel %` text).
  - Column 7: Actions (`[Report]` button and `[...]` overflow menu, `shrink-0`).
- **Event Signature Backward Compatibility:**
  - Strictly preserve all existing event outputs and payload contracts:
    - `openRow.emit(row: ReportingIndicator)` on row click / enter
    - `reportRow.emit(row: ReportingIndicator)` on Report button click
    - `openTarget.emit(row: ReportingIndicator)` on Target value click
    - `openAchieved.emit(row: ReportingIndicator)` on Achieved value click
    - `copyLink.emit(row: ReportingIndicator)` from row menu
  - All event signatures remain 100% backward compatible with `dashboard-lab.component.ts`.

### 6.4 Compact In-Card Quick-Filters
- In `reporting-aow-table.component.html` and `dashboard-lab.component.html`:
  - Replace the 80–110px multi-row button block with a sleek, single-line horizontal flex/scroll bar.
  - Height fixed to max 32px (`h-[32px] min-h-[32px]`).
  - Active chip: `bg-[var(--pr-color-primary-500)] text-white border-transparent font-semibold shadow-xs`.
  - Inactive chip: `bg-white text-slate-700 border-[var(--pr-border)] hover:bg-slate-50`.
  - Responsive behavior: horizontal scroll with subtle fade or flex wrap on small screens without shifting page geometry.

### 6.5 View Parity (All AOWs vs By AOW)
- Align the By-AOW template in `dashboard-lab.component.html` to reuse the exact same CSS classes, typography, HLO code badge formatting, and indicator row structure as `reporting-aow-table.component.html`.

---

## 7. Security & Authorization

- Client-side visual and layout refactoring only.
- All authorization checks (`canReportResults()`, `isReadOnly`) are preserved without change.
- No sensitive data or auth headers modified.

---

## 8. Performance & Capacity

- No new HTTP requests or data structures.
- Redundant DOM nodes removed (deleting duplicate count spans and the redundant section heading), reducing DOM tree size by ~8%.
- All signal computations (`cleanHloCode`, `visibleGroups`) are memoized and execute in < 2ms.

---

## 9. Observability

- No logging or telemetry changes. Zero secrets involved.

---

## 10. Testing Plan

### Unit Testing
1. **`ReportingProgramBandComponent`:**
   - Verify that heading `Report results linked to the program's 2026 ToC` is no longer rendered in the DOM.
   - Update `reporting-program-band.component.spec.ts` line 57 to assert that heading element is null or absent.
2. **`ReportingAowTableComponent`:**
   - Verify HLO header renders clean badge (`HLO4`) and does not render redundant `N indicators` text.
   - Verify indicator rows render the designated `border-l-*` status stripe based on `statusOf(row)` using PRMS color tokens.
   - Verify in-card quick filters render with height ≤ 32px.
   - Verify that all 5 event outputs (`openRow`, `reportRow`, `openTarget`, `openAchieved`, `copyLink`) emit with the correct indicator payload.
3. **`DashboardLabComponent` (By AOW view):**
   - Verify HLO sections in By-AOW view render with clean HLO badges matching All-AOWs view.
   - Run regression test suite `npx jest --testPathPattern="dashboard-lab"`.
4. **E2E & Responsive Checks:**
   - Verify client build: `npx ng build --configuration development`.
   - Run linter: `npx ng lint --quiet`.
   - Ensure Cypress E2E specs pass without selector breakage.

---

## 11. Design Decisions (ADRs)

### `RAJ-DD-1` — Removal of Redundant Heading `Report results linked to the program's 2026 ToC`
- **Context:** The user already selected the "Reporting" tab and program band. The full-width title `Report results linked to the program's 2026 ToC` consumes ~50px of vertical space above the AoW cards.
- **Decision:** Remove the heading completely from `ReportingProgramBandComponent`.
- **Alternatives Considered:**
  - *Keep as smaller subtitle:* Rejected; still takes vertical space and restates the obvious context.
  - *Move into the AoW card:* Rejected; AoWs already state their research theme.
- **Consequences & Reversion Challenge:** Breaks test `it('renders the section heading for Reporting')` in `reporting-program-band.component.spec.ts`. Must update test to assert heading is absent.

### `RAJ-DD-2` — Clean HLO Code Badge Extraction
- **Context:** The backend payload supplies complex keys like `HLO4.AOW1.IO1` in By-AOW and raw keys in All-AOWs.
- **Decision:** Implement a clean helper function to extract the standard HLO prefix (e.g. `HLO4` or `HLO-04`) and display it in a styled monospace chip.
- **Alternatives Considered:**
  - *Display full string `HLO4.AOW1.IO1`:* Rejected; visually noisy and clutters the title line.
  - *Omit code entirely:* Rejected; users need the official HLO identifier to cross-reference with ToC documents.

### `RAJ-DD-3` — Consolidation of HLO Header Metrics into Tabular Cluster
- **Context:** Previous layout rendered `TARGET: 2`, `ACHIEVED: 0`, `2 KPIs`, `QA 0%`, `PREL 0%`, and `2 indicators` in a jumble of inconsistent font sizes and weights.
- **Decision:** Consolidate into a structured right-aligned tabular cluster: `Target: X`, `Achieved: Y`, `QA: %`, `Prel: %`, and a single count badge `[ N ]`. Delete duplicate `2 indicators` text.
- **Consequences:** Clean visual scanning; eliminates cognitive ambiguity between "KPIs" and "indicators".

### `RAJ-DD-4` — JIRA-Style Left Status Stripe on Indicator Rows
- **Context:** JIRA Backlog items use semantic left colored borders to convey status immediately without requiring the user to read status pills.
- **Decision:** Add `border-l-[3px]` with semantic colors (Emerald = Achieved, Purple = Overachieved, Violet = In Progress, Slate = Not Started) to each indicator row.
- **Consequences:** Immediate visual scanability of work completion across long lists.

### `RAJ-DD-5` — Compact Single-Row Quick-Filters
- **Context:** The previous in-card filter cloud took 80–110px with multiple rows of buttons.
- **Decision:** Restyle into a single-line horizontal bar of compact chips (max height 32px).
- **Consequences:** Drastically saves vertical space while preserving rapid one-click filtering by Center and Type.

---

## 12. Reversion Challenge (Step 2.3)

| Design Decision | Behavior Reverted | What Does Removing This Break? | Resolution / Mitigation |
|---|---|---|---|
| **`RAJ-DD-1`** | Removes `Report results linked to the program's 2026 ToC` from the program band. | Breaks test in `reporting-program-band.component.spec.ts:57` that asserts the heading text exists. | Update test assertion to verify heading is removed from DOM. No business logic broken. |
| **`RAJ-DD-3`** | Removes `N indicators` subtitle from HLO header. | Any test expecting the exact string "indicators" in HLO header. | Update test to check for clean count badge `[ N ]` instead of redundant string. |

---

## 13. Sizing & Budget (Step 2.4)

- **Declared Depth:** Standard
- **Expected Tasks:** 3 tasks
  - `RAJ-T-1`: Remove redundant heading from program band & update tests (~25 LOC).
  - `RAJ-T-2`: Refactor HLO headers, metrics consolidation, and in-card quick filters in `ReportingAowTableComponent` (~150 LOC).
  - `RAJ-T-3`: Indicator row JIRA status stripes & By-AOW view parity in `DashboardLabComponent` (~110 LOC).
- **Expected LOC:** ~285 LOC modified
- **Expected Review Rounds:** 3 review rounds (1 per task)
- **Budget Assessment:** Fits `Standard` depth perfectly.

---

## 14. Next Step

After approval of this design, proceed to Phase 3:

```bash
tasks.md generation
```
