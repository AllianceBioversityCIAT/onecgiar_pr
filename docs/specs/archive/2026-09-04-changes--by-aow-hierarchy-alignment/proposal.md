# Proposal — 3-Level Visual Hierarchy & ToC Taxonomy Alignment in "By AOW" View

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/by-aow-hierarchy-alignment` |
| Slug | `by-aow-hierarchy-alignment` — derived from user request to align the By-AOW view with the 3-level hierarchy and restore HLO # taxonomy badges |
| Type | Change |
| Approval Mode | gated |
| Depends on | none |
| Parallel-safe | yes (touches presentation, parsing helpers, and DOM scaffolding in `dashboard-lab`; no server, no DB migrations, no shared API contracts) |
| Requested by | Juan Carlos Cadavid — 2026-09-04 |
| Baseline consulted | `docs/prd.md`, `docs/ux-ui/design.md` §7 Design tokens · §8 Components · §9 Responsive, `docs/trd/trd.md`, `onecgiar-pr-client/CLAUDE.md`, `dashboard-lab/CLAUDE.md`, `reporting-aow-table/CLAUDE.md` |
| Kaizen lessons applied | `KZ-changes--reporting-aow-hierarchy-1` (institutional ToC nomenclature `HLO`, `OC`, `I-OC` over generic names), `KZ-changes--reporting-aow-jira-hierarchy-1` (template JIT verification at every mutation), `KZ-changes--reporting-aow-jira-hierarchy-2` (protect event contracts and interactive button isolation) |
| Model | T1 Architect phase |

---

## Intent

Harmonize the visual hierarchy and ToC taxonomy of the **"By AOW"** view (`dashboard-lab.component.html` lines 1682–1940) with the newly established **3-Level Card-in-Card** architectural design system already active in `reporting-aow-table`:

1. **Restore Semantic ToC Taxonomy Badges:** Extract numeric and institutional ToC codes (e.g. `1.1:` → `[HLO 1.1]`, `2.1` → `[OC 2.1]`, `3.5` → `[I-OC 3.5]`) in `dashboard-lab.component.ts` so every Level 2 group proudly displays its formal ToC identifier rather than unlabelled plain text.
2. **Level 2 HLO Sub-Card Enclosure:** Replace the flat, unbordered button in By-AOW with an autonomous sub-card container (`rounded-xl border border-slate-200/90 bg-white shadow-2xs`), surface contrast gradient header, rotating chevron in a white button box, and a right-aligned micro-KPI cluster (`TARGET`, `ACHIEVED`, count pill, `QA% / PREL%`).
3. **Level 3 Indented Indicator Scaffolding:** Replace the floating unindented card list with an indented tree scaffolding container (24px left indent `pl-4 sm:pl-6`, left tree guideline `border-l-4 border-indigo-500/40 bg-indigo-50/10`), a contextual column sub-header (`INDICATOR TITLE & TAXONOMY | TARGET | ACHIEVED | STATUS | PROGRESS | ACTION`), and indicator rows with concentric bullseye icons 🎯, JIRA status stripes, and clean track alignment.
4. **Preserve By-AOW Contextual Features:** Maintain 100% of By-AOW specific functionality, including the AoW context banner with session reporting tiles, AI narrative panel triggers, *Copy link* deeplinking (`highlightedKpiId`), *Next pending* flow, and the report drawer opener.

---

## Problem / Current Behavior

While the main **Reporting** tab (`app-reporting-aow-table`) now features a polished 3-level visual hierarchy, navigating into **"By AOW"** (`plannedBrowseView() === 'byAow'`) drops the user into an older, unaligned interface:

1. **Missing HLO # Taxonomy Badges:**
   - HLO groups like `"Agronomic and farm management scientific data and analytics"` appear with **zero code badge**.
   - **Root Cause:** In `dashboard-lab.component.ts`, `cleanHloCode()` only matches tokens starting with `HLO`, `HL`, `IO`, `EOI`, `I-OC`, or `OC`. When titles use raw numeric prefixes like `"1.1:"` or `"1.1 Agronomic..."`, `cleanHloCode` returns empty string `""`, suppressing the `@if (cleanHloCode(...))` badge entirely. Furthermore, `dashboard-lab` lacks the `hloTaxonomy` helper to prefix the formal institutional label (`HLO`, `OC`, `IO`).
2. **Lack of Level 2 Surface Enclosure:**
   - In By-AOW, the HLO header is a plain un-enclosed row (`pr-by-aow-row`) that lacks the container visual identity (`rounded-xl shadow-2xs`) and gradient surface contrast.
3. **Un-indented Level 3 Indicator Cards (No Visual Parent-Child Tree):**
   - When an HLO is expanded, child indicators render as full-width separate white cards with no indentation, no vertical guide line, and no column alignment.
   - Users lose visual context of which HLO encloses the indicators when scrolling through multiple items.
4. **Visual Inconsistency Across Views:**
   - A user browsing in the main Reporting table sees crisp track columns, bullseye icons, and unified status stripes, but switching into By-AOW switches to completely different card layouts, breaking visual coherence.

---

## Proposed Outcome

1. **Taxonomy & Code Parser Alignment:**
   - Extend `cleanHloCode` in `dashboard-lab.component.ts` to support numeric prefixes (e.g. `1.1`, `1.1:`, `2.4.1`).
   - Add `hloTaxonomy(hlo: any, section?: any)` helper in `dashboard-lab.component.ts` to resolve institutional ToC taxonomy (`HLO`, `OC`, `I-OC`, `IO`) adhering strictly to Kaizen lesson `KZ-changes--reporting-aow-hierarchy-1`.
2. **Level 2: HLO Sub-Card Enclosure in By-AOW:**
   - Each group in `plannedByAowSections()` renders as an autonomous sub-card:
     - Outer container: `rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden`.
     - Header bar: `bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 border-b border-slate-200/80` with hover transition and keyboard focus ring.
     - Rotating chevron in subtle white button box (`h-6 w-6 rounded-md bg-white border border-slate-200/80 text-indigo-700 shadow-2xs`).
     - Semantic taxonomy badge: `pr-hlo-code` with `bg-indigo-100/80 text-indigo-800 border border-indigo-200/70 font-mono text-[11px] font-bold` displaying `[HLO 1.1]` or `[OC 2.1]`.
     - Right zone micro-KPIs: bold Target sum (`TARGET`), emerald Achieved sum (`ACHIEVED`), rounded pill badge (`N indicators`), and QA / Prel % labels.
3. **Level 3: Indented Indicator Scaffolding in By-AOW:**
   - Inside the expanded collapse container:
     - Indented wrapper: `pl-4 sm:pl-6 border-l-4 border-indigo-500/40 bg-indigo-50/10`.
     - Contextual column sub-header: `h-7 text-[10px] uppercase tracking-wider text-slate-400 font-bold` with columns `INDICATOR TITLE & TAXONOMY | TARGET | ACHIEVED | STATUS | PROGRESS | ACTION`.
     - Child indicator rows: aligned into consistent grid tracks, featuring concentric bullseye target icons 🎯, JIRA status left-border stripes, center acronym chips, progress percentage bars, deeplink copy buttons, and `Report` CTA buttons.
4. **Preserved Integrations & Event Isolation:**
   - All By-AOW specific reactive bindings (`isPlannedHloExpanded`, `togglePlannedHlo`, `isByAowSectionAllExpanded`, `openReportAside`, `copyKpiLink`, `highlightedKpiId`, `nextPendingAfter`) function without alteration.
   - Interactive buttons invoke `$event.stopPropagation()` to isolate events (`KZ-changes--reporting-aow-jira-hierarchy-2`).

---

## Scope

- **Frontend Client:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.ts`:
    - Update `cleanHloCode` to match numeric patterns (`1.1`, `1.1:`).
    - Add `hloTaxonomy` helper method for semantic taxonomy determination (`HLO`, `OC`, `IO`).
    - Add helper or row adapter if needed to harmonize indicator row track rendering in By-AOW.
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.html`:
    - Refactor By-AOW section (lines 1682–1940) to implement the 3-Level Card-in-Card structure, Level 2 HLO sub-card with gradient header & taxonomy badge, and Level 3 indented scaffolding with contextual column sub-header.
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.scss`:
    - Ensure By-AOW track styles, tree guideline classes, and padding match `reporting-aow-table`.
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.spec.ts`:
    - Add test specs verifying `cleanHloCode` with numeric prefixes, `hloTaxonomy` output, sub-card enclosure rendering, badge display in By-AOW, indented container presence, and event isolation.
- **Documentation:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/CLAUDE.md`: Update By-AOW documentation to reflect 3-level visual hierarchy alignment.

---

## Non-Goals

- No server-side changes (NestJS, TypeORM, migrations, database queries remain untouched).
- No changes to `reporting-aow-table` (already completed and verified in `changes/reporting-aow-hierarchy`).
- No changes to the top AoW banner metrics, session reporting counter, or narrative panel drawer logic.
- No changes to data fetching or filtering pipelines (`plannedByAowSections`, `indicatorsForAow`).

---

## Affected Users, Systems, And Specs

| Entity | Impact |
|---|---|
| **Science Program Users / Center Reporters** | Seamless visual experience when clicking "By AOW" from the main reporting table; instant recognition of HLO numbers (`HLO 1.1`) and clear tree indentation for indicators. |
| **`dashboard-lab` Component** | By-AOW view upgraded to modern 3-level Card-in-Card design with enhanced ToC taxonomy badge parsing. |
| **`changes/reporting-aow-hierarchy` (sibling spec)** | Serves as the direct design reference and architectural benchmark. |

---

## Visual Reference

- **Source:** User screenshots from active application + Direct sibling component reference (`reporting-aow-table`).
- **Location:**
  - Current By-AOW Collapsed (missing badges & flat): [`docs/specs/changes/by-aow-hierarchy-alignment/visual/current-by-aow-collapsed.png`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/changes/by-aow-hierarchy-alignment/visual/current-by-aow-collapsed.png)
  - Current By-AOW Expanded (unindented separate cards): [`docs/specs/changes/by-aow-hierarchy-alignment/visual/current-by-aow-expanded.png`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/changes/by-aow-hierarchy-alignment/visual/current-by-aow-expanded.png)
  - Reference Target View (Reporting tab 3-level hierarchy): [`docs/specs/changes/by-aow-hierarchy-alignment/visual/reporting-table-reference.png`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/changes/by-aow-hierarchy-alignment/visual/reporting-table-reference.png)
- **Notes:** The target view demonstrates the exact styling to reproduce in By-AOW: `[HLO 1.1]` badge, surface gradient header, 24px left indent, vertical tree guide (`border-l-4 border-indigo-500/40`), and contextual column subheader.

---

## Requirement Delta Preview

### ADDED Requirements
- `BHA-R-1 (Taxonomy Badges)`: Level 2 HLO and Outcome group headers in By-AOW MUST display formal ToC taxonomy badges (e.g. `[HLO 1.1]`, `[OC 2.1]`, `[I-OC 3.5]`) parsed from title prefixes or metadata.
- `BHA-R-2 (Level 2 Sub-Card Enclosure)`: Each HLO/Outcome group in By-AOW MUST be enclosed in an autonomous `rounded-xl border border-slate-200/90 bg-white shadow-2xs` container with a surface-contrast gradient header.
- `BHA-R-3 (Level 3 Indented Scaffolding)`: Expanded child indicators in By-AOW MUST be nested within an indented container (`pl-4 sm:pl-6`) with a left vertical guide line (`border-l-4 border-indigo-500/40 bg-indigo-50/10`).
- `BHA-R-4 (Contextual Column Sub-Header)`: The expanded indicator list in By-AOW MUST feature a compact column sub-header (`INDICATOR TITLE & TAXONOMY | TARGET | ACHIEVED | STATUS | PROGRESS | ACTION`).

### MODIFIED Requirements
- `BHA-R-5 (Indicator Row Track Layout)`: By-AOW indicator rows updated to share the track alignment, concentric bullseye icon 🎯, JIRA status stripes, and clean action layout with `reporting-aow-table`.

### REMOVED Requirements
- None.

---

## Approach Options

| Option | Description | Trade-offs | Decision |
|---|---|---|---|
| **Option 1: In-Place Template & Helper Alignment (Recommended)** | Update `dashboard-lab.component.html` and `.ts` directly using the shared design tokens, taxonomy helper, and indented scaffolding. | Direct, lowest risk of regression for By-AOW specific features (banner, narrative panel, deeplink highlight, next pending). Preserves all existing host reactive signals. | **Recommended** |
| **Option 2: Embed `app-reporting-aow-table` inside By-AOW** | Refactor By-AOW to pass a single synthesized AoW group to `reporting-aow-table`. | High coupling; `reporting-aow-table` is designed for the full multi-AoW Reporting tab and lacks By-AOW's specific banner/narrative/session bindings. | Rejected |
| **Option 3: Cosmetic CSS Only** | Only add border and background to existing By-AOW rows without taxonomy parsing or tree indentation. | Fails to resolve missing HLO codes and fails to provide true parent-child visual hierarchy. | Rejected |

---

## Recommended Approach

**Option 1 (In-Place Template & Helper Alignment)**:
1. Extend `cleanHloCode` and introduce `hloTaxonomy` in `dashboard-lab.component.ts` (adhering to `KZ-changes--reporting-aow-hierarchy-1`).
2. Upgrade By-AOW HLO group template to Level 2 Sub-Card enclosure (`rounded-xl border border-slate-200/90 bg-white shadow-2xs`) with gradient header and consolidated micro-KPIs.
3. Enclose By-AOW child indicators in Level 3 indented scaffolding with 24px left indent, indigo tree guideline, and contextual column subheader.
4. Verify with Jest unit tests in `dashboard-lab.component.spec.ts` and ensure zero lint warnings.

---

## Risks, Dependencies, And Open Questions

- **Risk 1 (By-AOW Deeplinking & Highlighting):** By-AOW supports deep links to specific KPIs via `tocView=byAow&tocAow=...&kpi=...` which sets `highlightedKpiId`.
  * *Mitigation:* Ensure `[id]="kpiDomId(ind)"` and `highlightedKpiId()` outline styling are preserved verbatim on the indicator row container.
- **Risk 2 (Interactive Event Isolation):** Action buttons inside the indicator row (*Report*, *Copy link*) must not trigger row expansion or misrouted navigation.
  * *Mitigation:* Apply Kaizen lesson `KZ-changes--reporting-aow-jira-hierarchy-2` by ensuring `$event.stopPropagation()` is invoked on all action controls.
- **Risk 3 (Template JIT Parsing):** Nested `@for` loops in By-AOW template must remain syntactically sound.
  * *Mitigation:* Apply Kaizen lesson `KZ-changes--reporting-aow-jira-hierarchy-1`: run `npx jest --testPathPattern="dashboard-lab.component.spec.ts"` immediately after template modifications.

---

## Success Criteria

- [ ] **SC-1 (HLO # Badges Rendered):** By-AOW HLO headers display semantic taxonomy badges (e.g. `[HLO 1.1]`, `[OC 2.1]`) with high-contrast badge styling.
- [ ] **SC-2 (Level 2 Sub-Card Container):** HLO groups render in autonomous `rounded-xl border border-slate-200/90 bg-white shadow-2xs` cards with gradient headers and micro-KPIs.
- [ ] **SC-3 (Level 3 Indented Scaffolding):** Expanded child indicators are indented by 24px with an indigo tree guide line (`border-l-4 border-indigo-500/40`) and a contextual column sub-header.
- [ ] **SC-4 (Feature Preservation):** *Report* button, *Copy link*, *Highlighting*, *Next pending*, and the top AoW banner continue to function seamlessly.
- [ ] **SC-5 (Automated Test Pass):** 100% of unit tests in `dashboard-lab.component.spec.ts` pass without regression.
- [ ] **SC-6 (Clean Lint):** `npx ng lint --quiet` runs clean with 0 errors.

---

## Next Step

Run:

```text
/akili-specify changes/by-aow-hierarchy-alignment
```
