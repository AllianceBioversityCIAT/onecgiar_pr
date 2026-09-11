# Proposal: Overview Charts Deep-Linking Filters (Funding Source, Phase, Status, Category)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/overview-drilldown-filters` |
| Slug | `overview-drilldown-filters` — derived from free-text argument |
| Type | Bug |
| Approval Mode | gated |
| Status | Proposed |
| Date | 2026-09-02 |
| Author | Antigravity (T1 Architect) |
| Depends on | none (branches cleanly off current `qa-development-2026`) |
| Parallel-safe | yes |

## 2. Intent

Ensure that every clickable chart, tile, sector, and matrix cell on the Science Program Overview tab deep-links to the Results tab with the complete and exact set of filter parameters representing that element:
1. **Funding source (`origin`)**: `'W1/W2'` for W1/W2 charts, `'W3/Bilaterals'` for Bilateral charts.
2. **Phase (`phase`)**: the effective overview phase (explicitly selected or active cycle).
3. **Status (`status`)**: the status represented by the clicked slice/tile (e.g. Editing, Submitted, etc.).
4. **Category (`category`)**: the result type represented by the clicked row/radar/bar (e.g. Knowledge product, Policy change, etc.).
5. **Center (`center`)**: the center represented by bilateral center bars (e.g. IITA, CIAT, etc.).

When a user clicks on an overview figure (e.g. the "12 In progress" count on the W1/W2 Reporting Status card), the Results tab must show exactly that population (12 results), rather than contaminating the view with other funding sources or phases (showing 23 results).

## 3. Bug Diagnosis

### Observed Symptom
- On the Overview tab for SP04 (e.g. `.../entity-details/SP04/overview`), the "W1/W2 Reporting Status" card displays **14 results** total: 12 In progress (Editing) and 2 Submitted.
- Clicking the "12" metric tile (or the Donut segment) navigates to the Results tab: `.../results?status=Editing`.
- The Results tab displays **23 results** (12 W1/W2 + 11 W3/Bilaterals) because the `Funding source` filter is missing and stays empty.
- Clicking on cells or bars in the "W1/W2 results by category and status" matrix also navigates with `{ category, status }` without filtering `Funding source: W1/W2`.
- Overview chart clicks also rely on implicit phase fallback rather than explicitly propagating the active overview phase.

### Reproduction Steps
1. Navigate to `http://qa-development-2026.orca.localhost:50196/result-framework-reporting/entity-details/SP04/overview`.
2. Locate the "W1/W2 Reporting Status" card showing `In progress: 12 (86%)`.
3. Click the `In progress: 12` tile or donut segment.
4. Observe the redirected URL: `.../results?status=Editing`.
5. Expected:
   - URL includes `origin=W1%2FW2` (or mapped funding source) and `phase=Reporting%202026`.
   - Results tab chips show `Funding source: W1/W2`, `Phase: Reporting 2026`, and `Status: Editing`.
   - Result count matches the card: **12 results**.
6. Actual:
   - URL has only `status=Editing`.
   - Result count shows **23 results** (mixes W1/W2 and W3/Bilaterals).

### Root Cause (Confirmed)
1. **W1/W2 Reporting Status card (`dashboard-lab.component.ts:1491`)**:
   ```ts
   const linkOf = (statusId: number, count: number): OverviewLink | null => (count > 0 ? { status: statusNameOf(statusId) } : null);
   ```
   Omits `origin: 'W1/W2'`.
2. **W1/W2 Category × Status Matrix (`dashboard-lab.component.ts:1976`)**:
   ```ts
   link: c === 3 ? null : { category: item.resultTypeName, status: cols[c] }
   ```
   Omits `origin: 'W1/W2'`.
3. **Overview Link Handler (`dashboard-lab.component.ts:2199-2209`)**:
   ```ts
   onOverviewLink(link: OverviewLink): void {
     // ...
     (Object.keys(link) as (keyof OverviewLink)[]).forEach(dimension => { ... });
     this.router.navigate(['/result-framework-reporting/entity-details', code, 'results'], { queryParams });
   }
   ```
   If `link.phase` is omitted, the navigation does not specify `phase` in the query params. While the Results tab defaults to the overview phase, explicitly passing `phase` guarantees the link is fully deterministic and bookmarkable.

### Impact & Scope
- All overview cards linking to Results:
  - W1/W2 Reporting Status (donut + tiles).
  - W1/W2 Category × Status matrix (bars + heatmap).
  - W3/Bilateral charts (categories, centers, status donut, center × category matrix).
- Prevents cross-funding-source contamination and guarantees exact count parity between Overview figures and Results drilldown.

### Fix Strategy
- Add `origin: 'W1/W2'` to all W1/W2 `OverviewLink` factories.
- Update `onOverviewLink` to automatically attach the effective overview phase when not explicitly defined in the link payload.
- Verify all W3/Bilateral `OverviewLink` instances preserve `origin: BILATERAL_ORIGIN`.
- Add regression tests covering all overview links and their query parameters.

## 4. Proposed Outcome

1. Clicking any W1/W2 card element (Donut, status tile, category bar, heatmap cell) passes `origin: 'W1/W2'`.
2. Every overview link includes the active overview `phase`.
3. Clicking an element with count $N$ shows exactly $N$ results on the Results tab.
4. Comprehensive unit tests covering `onOverviewLink`, `overviewStatusSegments`, `overviewW12Heatmap`, and bilateral chart link generators.

## 5. Scope

- **In Scope**:
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.ts`:
    - `buildOverviewStatusSegments`: include `origin: 'W1/W2'`.
    - `overviewW12Heatmap`: include `origin: 'W1/W2'`.
    - `onOverviewLink`: inject effective overview phase into `queryParams` if not already present.
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.spec.ts`:
    - Test that `onOverviewLink` passes `origin`, `phase`, `status`, `category`, and `center`.
    - Test that W1/W2 status segments emit `origin: 'W1/W2'`.
    - Test that W1/W2 heatmap cells emit `origin: 'W1/W2'`.
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/`:
    - Ensure chart click handlers preserve and emit the complete `OverviewLink`.
- **Out of Scope**:
  - Backend API changes (the filtering parameters are already fully supported by the client and server).
  - Redesign of charts or layouts.

## 6. Non-Goals

- Changing the visual design of Overview charts.
- Altering the backend results queries.

## 7. Affected Users, Systems, And Specs

- Users viewing Science Program Overview dashboards and navigating to Results.
- Specs: `changes/sp-overview-echarts`, `changes/overview-phase-filter`.

## 8. Visual Reference

- **Source**: User screenshots
- **Location**:
  - Screenshot 1: Overview W1/W2 Reporting Status with 12 In progress (`/var/folders/g8/8wqxv48d60737hm79glkxx0w0000gn/T/orca-paste-1788381979629-b0a420cb-a051-489a-9013-34a9aaa79dc3.png`)
  - Screenshot 2: Results tab showing 23 results due to missing funding source filter (`/var/folders/g8/8wqxv48d60737hm79glkxx0w0000gn/T/orca-paste-1788382009895-56e1fb5f-e37f-4700-9457-c70ebf8ad48e.png`)

## 9. Approach Options

| Option | Description | Trade-offs | Verdict |
|---|---|---|---|
| **A. Complete Link Metadata at Emission + Fallback Phase in `onOverviewLink`** | Populate `origin: 'W1/W2'` directly in `buildOverviewStatusSegments` and `overviewW12Heatmap`; in `onOverviewLink`, ensure effective phase is injected into query params if absent. | Clean, self-contained, keeps overview models semantically accurate and URLs explicit. | ✅ **Recommended** |
| **B. Infer Origin only inside `onOverviewLink` based on caller context** | Do not modify segment models; inspect caller or guess origin inside `onOverviewLink`. | Fragile, couples navigation handler to internal component layout details, prone to regression. | ❌ Rejected |

## 10. Recommended Approach

Implement **Option A**:
1. Update `buildOverviewStatusSegments` to attach `origin: 'W1/W2'` to each segment's `link`.
2. Update `overviewW12Heatmap` to attach `origin: 'W1/W2'` to each valid cell's `link`.
3. In `onOverviewLink`, verify that `phase` is set; if not present on `link.phase`, resolve the effective overview phase and set `queryParams.phase`.
4. Run full unit and regression suites to ensure 100% test coverage.

## 11. Risks, Dependencies, And Open Questions

- **Risk**: Existing tests expecting `{ status: '...' }` without `origin` will need their expectations updated to `{ origin: 'W1/W2', status: '...' }`. This is desirable because it enforces the contract.
- **Dependency**: None.
- **Open Questions**: None.

## 12. Success Criteria

1. Clicking on `In progress: 12` on the W1/W2 card navigates to Results with `status=Editing`, `origin=W1/W2`, and the effective phase; the Results tab displays exactly 12 results.
2. Clicking on any cell/bar in the W1/W2 category matrix navigates with `origin=W1/W2`, `category=...`, and `status=...`.
3. Bilateral chart clicks continue to navigate with `origin=W3/Bilaterals` and their respective dimensions.
4. All unit tests in `dashboard-lab` and `programme-results` pass.

## 13. Next Step

```text
/akili-specify bugfix/overview-drilldown-filters
```
