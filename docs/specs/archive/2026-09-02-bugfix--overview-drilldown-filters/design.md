# Module Spec: `bugfix/overview-drilldown-filters` — Design

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/overview-drilldown-filters` |
| Module | `results` / `dashboard-lab` (Overview Tab) |
| Type | Bug |
| Approval Mode | gated |
| Status | draft |
| Date | 2026-09-02 |
| Author | Antigravity (T1 Architect) |
| Requirements | [`requirements.md`](./requirements.md) |
| Proposal | [`proposal.md`](./proposal.md) |

---

## 2. Summary

This design defines how `DashboardLabComponent` ensures end-to-end dimension fidelity when deep-linking from interactive Overview cards to the Results tab. It enriches the `OverviewLink` payload factory functions to include `origin: 'W1/W2'` for all W1/W2 visualizations, and augments `onOverviewLink` to explicitly inject the active Overview phase into the target route's `queryParams`.

---

## 3. Architecture Overview

### 3.1 Touch Points
- **Client Components**:
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.component.ts`
- **Client Services / Helpers**:
  - `PROGRAMME_RESULTS_QUERY_PARAM_MAP` in `programme-results-query-params.ts`
  - `ResultFrameworkReportingHomeService` (overview phase signals)
- **Server**: No changes required.
- **Database / Migrations**: None.

### 3.2 Interaction Flow

```text
[Overview User]
   │
   ├─► Clicks on W1/W2 Segment / Sector / Heatmap Cell / Bilateral Chart
   │     │
   │     ▼
   │   [ProgramOverviewComponent.emitLink(link)]
   │     │ (emits output `openResults` with complete OverviewLink)
   │     ▼
   │   [DashboardLabComponent.onOverviewLink(link)]
   │     │
   │     ├── 1. Reads dimensions from `link`: status, origin, category, center
   │     ├── 2. Resolves effective phase if not in `link`:
   │     │      homeSE.overviewSelectedPhase() || activeReportingPhase
   │     ├── 3. Maps to query params via PROGRAMME_RESULTS_QUERY_PARAM_MAP
   │     │
   │     ▼
   │   [Router.navigate(['.../results'], { queryParams })]
   │     │
   ▼     ▼
[ProgrammeResultsComponent]
   │
   └── Reads queryParams → hydrates filters (Phase, Funding Source, Status, Category)
         └── Table displays exact filtered population matching the clicked figure
```

---

## 4. Shared Contracts & Data Models

The existing `OverviewLink` interface in `program-overview.component.ts`:
- `status?: string`
- `category?: string`
- `origin?: string`
- `center?: string`
- `phase?: string`

No schema modifications are necessary; all needed fields are already valid properties of `OverviewLink` and mapped in `PROGRAMME_RESULTS_QUERY_PARAM_MAP`.

---

## 5. Design Decisions

### ODF-DD-1: Explicit Origin in W1/W2 Segment and Matrix Factories
- **Decision**: In `buildOverviewStatusSegments`, every segment's `link` MUST specify `origin: 'W1/W2'` whenever count > 0. In `overviewW12Heatmap`, every non-other cell link MUST specify `origin: 'W1/W2'` along with `category` and `status`.
- **Rationale**: The visual card explicitly represents W1/W2 results ("W1/W2 Reporting Status", "W1/W2 results by category and status"). Emitting without `origin` makes the link semantically incomplete, allowing the Results tab to query across all funding sources.
- **Alternatives Rejected**: Injecting `origin: 'W1/W2'` globally inside `onOverviewLink`. Rejected because `onOverviewLink` also handles bilateral charts (which require `origin: 'W3/Bilaterals'`); inferring origin at the router level is brittle and introduces hidden coupling.

### ODF-DD-2: Effective Phase Injection in `onOverviewLink`
- **Decision**: In `onOverviewLink`, if `link.phase` is undefined or null, resolve the current effective phase from the Overview state (`homeSE.overviewSelectedPhase()` or the active version/reporting phase) and assign it to `queryParams.phase`.
- **Rationale**: Ensures the deep-link URL is self-contained, bookmarkable, and guaranteed to match the reporting cycle the user was viewing on the Overview, even if the user later changes browser tabs or shares the link.

### ODF-DD-3: Strict Preservation of Bilateral Link Contracts
- **Decision**: Retain `origin: BILATERAL_ORIGIN` (`'W3/Bilaterals'`) across all bilateral chart link factories (`bilateralCategories`, `bilateralCenters`, `bilateralStatusSegments`, and `overviewBilateralHeatmap`).
- **Rationale**: Prevents any regression in existing bilateral drilldown flows while ensuring they also benefit from explicit phase propagation (`ODF-DD-2`).

---

## 6. Challenge Reversions

- **Check**: Does this design revert or remove any existing behavior, guard, or fallback?
- **Result**: No. It strictly adds missing dimension properties (`origin`, `phase`) to `OverviewLink` and navigation params. Column 3 (`Other`) in the W1/W2 heatmap remains non-clickable (`link: null`), preserving existing intentional constraints.

---

## 7. Budget & Sizing

| Metric | Target / Estimate |
|---|---|
| **Depth** | Lite (Bug Mode) |
| **Expected Tasks** | 3 tasks |
| **Expected LOC** | ~60–90 LOC (changes + regression tests) |
| **Expected Review Rounds** | 1 round |

---

## 8. Verification Strategy

- **Automated Regression Suite**:
  - `dashboard-lab.component.spec.ts`:
    - Test `buildOverviewStatusSegments` produces links containing `{ origin: 'W1/W2', status: ... }`.
    - Test `overviewW12Heatmap` produces cells containing `{ origin: 'W1/W2', category: ..., status: ... }`.
    - Test `onOverviewLink` passes all dimensions including `origin`, `status`, `category`, and `phase`.
    - Test bilateral charts preserve `origin: 'W3/Bilaterals'` and gain `phase`.
