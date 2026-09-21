# Proposal — Landing Page Planned KPIs and Replicated vs New Results Breakdown

## 1. Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/result-framework-reporting/home-planned-kpis-breakdown` |
| **Slug** | `home-planned-kpis-breakdown` — derived from free-text argument (URL `http://qa-development-2026.orca.localhost:61856/result-framework-reporting/home` and client feedback from Nicoleta) |
| **Type** | Change |
| **Approval Mode** | gated (default) |
| **Date** | 2026-09-21 |
| **Requester** | Client feedback via Nicoleta (with UI screenshot from QA environment) |
| **Depends on** | none |
| **Parallel-safe** | yes |
| **Module** | `result-framework-reporting` |

---

## 2. Intent

On the Result Framework Reporting home / landing page (`/result-framework-reporting/home`), each Science Program / Accelerator card currently shows only the total reported results for the phase (e.g., `208 results this phase`) and their workflow statuses (`208 Editing`).

Our client Nicoleta requested:
1. Display the **2026 planned KPIs (as per the Theory of Change / ToC)** on each program card (e.g. `454 planned KPIs` for Breeding for Tomorrow).
2. Clarify that the results currently available in the 2026 reporting phase are **replicated innovations** from previous reporting phases.
3. Provide a clear breakdown of **new results vs. updated/replicated results** from previous phases (e.g., `208 replicated · 0 new`).

This change ensures portfolio and program leads immediately understand the baseline context: which results are continuations of past innovations vs. newly created results, and how the total relates to the planned ToC KPI commitments for 2026.

---

## 3. Problem / Current Behavior

| Surface | Today (confirmed in code, 2026-09-21) |
|---|---|
| **Landing Card Stat** | `result-framework-reporting-card-item.component.html:35-39`: Displays only `totalResults` and the phrase `"results this phase"`. No planned KPI target or ToC denominator is shown. |
| **Card Status Breakdown** | `result-framework-reporting-card-item.component.html:42-63`: Displays a horizontal status bar and status chips (`208 Editing`), but provides no distinction between results newly reported in 2026 and results replicated from previous phases. |
| **Replication Context** | In Phase 2026, innovations from previous phases (2024–2025) were cloned via the phase-transition replication workflow (`result.is_replicated = 1`). Users looking at the card see `208 results this phase` without realizing all 208 were pre-populated from past phases, creating ambiguity about current reporting progress. |
| **Client Interface** | `SPProgress` interface (`SP-progress.interface.ts:1-22`): Holds `totalResults`, `progress`, and `versions[].statuses[]`. It does not expose `plannedKpis`, `replicatedResults`, or `newResults`. |
| **Server Progress Query** | `results.service.ts:1962-1966`: Calls `AllResultsByRoleUserAndInitiativeFiltered()`, which already projects `r.is_replicated` (`result.repository.ts:734`), but `buildScienceProgramBuckets()` (`results.service.ts:1785-1823`) only tallies `totalResults` and `status_id`. It drops `is_replicated`. |
| **ToC Planned Target Query** | `results.service.ts:1984`: Calls `calculateInitiativeProgress(initiative.official_code, activeYearValue)`, which invokes `_tocResultsRepository.getIndicatorContributions(initiativeCode, year)` (`results.service.ts:1580`). That query retrieves all planned ToC indicators with targets for the year, but the service extracts only the average progress percentage and discards the indicator count / planned KPI total (`indicatorContributions.size`). |

---

## 4. Proposed Outcome

1. **Planned ToC KPIs displayed on each card:**
   - Each program card surfaces the planned KPI count for the active reporting phase (2026) derived from the ToC commitments (e.g., `454 planned KPIs`).
   - A contextual tooltip explains that these are committed targets in the Theory of Change for the phase.

2. **Replication Transparency & Origin Breakdown:**
   - Below or beside the total results, a clear, structured breakdown indicates how many results are **replicated from previous phases** (ongoing innovations) vs. **new results** created in this phase (e.g., `208 replicated · 0 new`).
   - An informative tooltip or subtle badge clarifies: *"Results currently available are replicated from previous reporting phases for updating. New results will appear as they are reported."*

3. **Polished, Compact & Responsive UX/UI:**
   - Follows the PRMS design system in `docs/ux-ui/design.md`: uses official design tokens (`--pr-color-secondary-400`, `text-brand-400`, `bg-brand-25/50`, `material-icons-round`, `prTooltip`).
   - Respects the page-wide **Compact View** toggle (`ResultFrameworkReportingHomeService.compactView`): cleanly condenses in compact mode and displays full details in expanded mode without card overflow or awkward text wrapping.

---

## 5. Scope

### Client (`onecgiar-pr-client`)
- `SPProgress` / `Version` interface (`SP-progress.interface.ts`): Add optional `plannedKpis?: number`, `replicatedResults?: number`, `newResults?: number`.
- `ResultFrameworkReportingCardItemComponent` (`result-framework-reporting-card-item.component.html`, `.ts`, `.scss`):
  - Add planned KPIs metric and tooltip.
  - Add origin breakdown row (`replicated` vs `new`) with clean icons and explanatory tooltip.
  - Adjust compact view transitions and spacing.
- Unit tests (`result-framework-reporting-card-item.component.spec.ts`):
  - Verify rendering of planned KPIs when present.
  - Verify breakdown of replicated vs new results.
  - Verify fallback behavior when planned KPIs are null/0 or no results exist.

### Server (`onecgiar-pr-server`)
- `ScienceProgramProgressDto` / `VersionProgressDto` (`science-program-progress.dto.ts`): Expose `plannedKpis`, `replicatedResults`, `newResults`.
- `ResultsService.getScienceProgramProgress` / `buildScienceProgramBuckets` (`results.service.ts`):
  - In `buildScienceProgramBuckets()`, count `replicatedResults` (where `row.is_replicated` is truthy) and `newResults` (where `row.is_replicated` is falsy).
  - In `calculateInitiativeProgress()`, return the planned indicator count alongside progress percentage, or attach the planned KPI count to `progressMap` so it hydrates into `ScienceProgramProgressDto`.
- Unit tests (`results.service.spec.ts`, `results.controller.spec.ts`):
  - Verify that `getScienceProgramProgress` includes `plannedKpis`, `replicatedResults`, and `newResults` in the response envelope.

---

## 6. Non-Goals

- Changing the Theory of Change indicator calculation formula or the definition of ToC progress.
- Modifying the result replication engine or altering `result.is_replicated` values in the database.
- Redesigning the full landing page layout, hero section, 3D galaxy view, or right-hand sidebar.
- Altering the "My CGIAR Centers" cards (`app-result-framework-reporting-center-card-item`), which have a different reporting structure and purpose.

---

## 7. Affected Users, Systems, And Specs

| Surface | Impact |
|---|---|
| **Science Program / Accelerator Leads** | Can see at a glance their total planned ToC commitments (KPIs) and distinguish between continuing/replicated innovations and new results. |
| **PMU / Portfolio Reviewers** | Clarifies that the hundreds of initial results in 2026 are not new submissions, but replicated items undergoing review/editing. |
| **Client API Service** | Consumes additive fields `plannedKpis`, `replicatedResults`, `newResults` in `GET_ScienceProgramsProgress()`. Fully backward compatible. |
| **Related Specs** | `docs/specs/archive/2026-09-03-bugfix--kpi-count-reconciliation/` (KCR-DD-2: planned KPI universe & zero-target rules). |

---

## 8. Visual Reference

- **Source:** User screenshot from client Nicoleta.
- **Location:** `docs/specs/result-framework-reporting/home-planned-kpis-breakdown/evidence/client-nicoleta-feedback.png`
- **Notes:** Nicoleta's note asks:
  > *"Would it be possible to show here (landing page) the 2026 planned KPIs (as per the ToC) and also mention that the results available there currently are from replicated innovations? Would be great to have a breakdown by new results vs. updated results from previous phases.*
  > *Something like this:*
  > *Breeding for Tomorrow: 454 planned KPIs; 208 results this phase (replicated from previous reporting phases); 0 new results"*

---

## 9. Requirement Delta Preview

### ADDED Requirements
- **RFR-KPI-1:** The Science Program progress endpoint shall return `plannedKpis` representing the total planned ToC indicators with targets for the reporting phase/year.
- **RFR-KPI-2:** The Science Program progress endpoint shall return `replicatedResults` and `newResults` counts per initiative.
- **RFR-KPI-3:** The program card on `/result-framework-reporting/home` shall render the planned KPIs count with an explanatory badge or subtitle.
- **RFR-KPI-4:** The program card shall render a breakdown of replicated vs new results with informative tooltips explaining the replication origin.

### MODIFIED Requirements
- **RFR-CARD-1:** The results count display in `result-framework-reporting-card-item` is updated from a single total results line to a structured summary combining reported results, origin breakdown (replicated vs new), and planned KPIs.

### REMOVED Requirements
- None.

---

## 10. Approach Options

### UX/UI Card Layout Options

| Option | Description | Trade-offs |
|---|---|---|
| **Option A — Dual-Stat Header with Origin Pills (Recommended)** | Displays a clean two-column metric row above the status bar: **Left:** `208 Results reported` with sub-pills `208 replicated · 0 new` and info tooltip. **Right:** `454 Planned KPIs` with a ToC badge. In compact mode, the origin pills and status bar collapse, leaving just `454 KPIs · 208 Results`. | **Pros:** High visual hierarchy; immediately presents both key numbers without clutter; respects the design system; fits perfectly within 315px card width. **Cons:** Minor card height increase (~20px) in expanded mode. |
| **Option B — Subtext Subtitle + Inline Breakdown** | Keeps the large `208 results this phase` heading, adds an inline row: `454 planned KPIs (ToC)` and `208 replicated from previous phases · 0 new`. | **Pros:** Minimal layout change. **Cons:** Text-heavy, looks like an unstyled sentence; harder to scan across a grid of 9+ cards. |
| **Option C — Distinct Metric Chips alongside Status Chips** | Leaves the top count as `208 results this phase`, and adds `454 Planned KPIs`, `208 Replicated`, `0 New` as colored chips in the bottom metadata area next to `Editing`. | **Pros:** Keeps all metadata in the footer. **Cons:** Mixes workflow status (`Editing`, `QAed`) with result origin (`Replicated`, `New`) and planning targets (`Planned KPIs`), causing visual and cognitive confusion. |

### Backend Data Strategy Options

| Option | Description | Trade-offs |
|---|---|---|
| **Option 1 — Leverage Existing `calculateInitiativeProgress` Data (Recommended)** | `calculateInitiativeProgress` already queries `_tocResultsRepository.getIndicatorContributions(initiativeCode, year)` for every initiative. We simply extract the planned indicator count (`indicatorContributions.size`) and return it alongside progress. For `replicatedResults` / `newResults`, tally `row.is_replicated` directly in `buildScienceProgramBuckets()`. | **Pros:** **Zero additional DB queries**; sub-millisecond overhead; uses existing live connections. |
| **Option 2 — Separate Dedicated Query for Planned KPIs** | Write a separate `SELECT COUNT(*) FROM toc_results_indicators...` query for each program. | **Pros:** Decoupled. **Cons:** Adds N extra database roundtrips to an already heavy endpoint. Rejected. |

---

## 11. Recommended Approach

**Option A (Dual-Stat Header with Origin Pills) + Option 1 (Zero-extra DB query).**

- In the card template:
  1. **Top Metric Row:**
     - Left: **208** `results reported`
     - Right: **454** `planned KPIs` with ToC flag icon.
  2. **Origin Sub-row:**
     - `208 replicated` (history icon) · `0 new` (add icon) + info tooltip explaining that replicated results represent innovations cloned from previous reporting phases for updating.
  3. **Workflow Status:**
     - Preserves the existing segmented progress bar and status chips (`208 Editing`, `1 QAed`, etc.).
  4. **Compact View:**
     - When compact view is toggled, hides the breakdown chips and status bar, keeping clean summary numbers.

---

## 12. Risks, Dependencies, And Open Questions

| Kind | Item | Severity | Mitigation |
|---|---|---|---|
| Risk | **Divergence between Planned KPI counts**: If zero-target indicators are excluded in some views but included in others (precedent in `bugfix/kpi-count-reconciliation`). | Medium | Clarify whether `plannedKpis` on the landing card includes or excludes zero-target indicators. The ToC repository's `getIndicatorContributions` provides the authoritative count. |
| Risk | **Performance on `GET_ScienceProgramsProgress`**: The home page loads progress for all Science Programs on mount. | Low | Option 1 introduces zero new DB calls; data is already in memory during the existing loop. |
| OQ-1 | Should the planned KPI count also link to the program's ToC overview tab (`/result-framework-reporting/entity-details/:code`)? | Low | The entire card is already clickable and navigates to the entity details. |
| OQ-2 | For programs with 0 planned KPIs in ToC (e.g. newly initialized initiatives or non-ToC projects), should the card display `0 planned KPIs` or `—`? | Low | Recommend displaying `—` or hiding the planned KPI pill if ToC data is not available. |

---

## 13. Success Criteria

1. On `/result-framework-reporting/home`, each Science Program and Accelerator card displays its planned ToC KPIs count for 2026 alongside total reported results.
2. The card displays a clear breakdown distinguishing replicated results (continuations from previous phases) from newly created results.
3. An informative tooltip explains the replication context so users know why results are already present in editing state.
4. The visual styling complies with PRMS design tokens, maintains high readability at 315px card width, and responds properly to the Compact View toggle.
5. Server tests (`results.service.spec.ts`, `results.controller.spec.ts`) and client tests (`result-framework-reporting-card-item.component.spec.ts`) pass cleanly.

---

## 14. Next Step

```text
/akili-specify docs/specs/result-framework-reporting/home-planned-kpis-breakdown
```
