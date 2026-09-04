# Module Spec: `bugfix/overview-drilldown-filters` — Requirements

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/overview-drilldown-filters` |
| Module | `results` / `dashboard-lab` (Overview Tab) |
| Sub-feature | Overview Charts Deep-Linking Filters |
| Type | Bug |
| Approval Mode | gated |
| Status | draft |
| Date | 2026-09-02 |
| Author | Antigravity (T1 Architect) |
| Source | User report with screenshots (`orca-paste-1788381979629` / `orca-paste-1788382009895`) |
| Related Specs | `archive/2026-08-28-bugfix--w12-overview-phase-origin-alignment`, `archive/2026-08-27-changes--sp-overview-echarts` |

---

## 2. Context

In the Science Program Overview tab (`/result-framework-reporting/entity-details/:entityId/overview`), interactive charts, status tiles, donut sectors, and category matrices allow users to click on reporting figures to drill down into the Results tab (`/result-framework-reporting/entity-details/:entityId/results`).

Currently, clicking elements in the **W1/W2 Reporting Status** card or the **W1/W2 results by category and status** matrix navigates to the Results tab with `{ status }` or `{ category, status }`, but **without** filtering by funding source (`origin: 'W1/W2'`) and without explicitly propagating the active Overview phase. Consequently, clicking on "12 In progress" on the W1/W2 card displays 23 results on the Results tab (12 W1/W2 + 11 W3/Bilaterals).

This spec corrects deep-link emission across all Overview interactive elements so that the target Results tab is filtered by the exact dimensions representing the clicked figure: Funding source (`origin`), Phase (`phase`), Status (`status`), Category (`category`), and Center (`center`).

---

## 3. In Scope / Out of Scope

### In Scope
- **W1/W2 Status Segments (`buildOverviewStatusSegments`)**: Every segment link includes `origin: 'W1/W2'` along with its status.
- **W1/W2 Category × Status Matrix (`overviewW12Heatmap`)**: Every clickable cell link includes `origin: 'W1/W2'`, `category`, and `status`.
- **Overview Link Router (`onOverviewLink`)**: If an emitted `OverviewLink` does not already specify `phase`, it automatically attaches the active/effective Overview phase to `queryParams.phase`.
- **Bilateral Charts Audit**: Ensure all bilateral charts continue to emit `origin: 'W3/Bilaterals'` alongside their specific dimensions (`category`, `center`, `status`).
- **Automated Regression Tests**: Mandatory tests in `dashboard-lab.component.spec.ts` verifying that clicking W1/W2 segments, heatmap cells, and bilateral charts emits the complete filter tuple.

### Out of Scope
- Server/backend query modifications (the Results tab and API already support `origin`, `phase`, `status`, `category`, and `center`).
- Changing the layout, styling, or visualization types of the Overview charts.

---

## 4. Defect Classes and Gates

| Defect Class | Example Risk | Verification Gate |
|---|---|---|
| **Dimension Omission** | Link emits status but omits `origin` or `phase` | Unit tests asserting exact properties on emitted `OverviewLink` and resulting `queryParams`. |
| **Cross-origin Contamination** | W1/W2 card displays bilateral results on drilldown | Test verifying that `origin: 'W1/W2'` is always present on W1/W2 elements. |
| **Phase Desynchronization** | Overview phase is 2025, but Results tab navigates without phase, falling back to 2026 | Test verifying `onOverviewLink` attaches the effective Overview phase to navigation `queryParams`. |

---

## 5. Functional Requirements (Bug Mode)

### ODF-R-1: W1/W2 Reporting Status Deep-Links MUST Include Funding Source
The system MUST include `origin: 'W1/W2'` in the `OverviewLink` for every segment and sector in the W1/W2 Reporting Status card.

#### Scenario: Clicking "In progress" tile on W1/W2 status card
- **GIVEN** an SP (e.g. SP04) with 12 W1/W2 In progress results and 11 W3/Bilateral In progress results
- **WHEN** the user clicks on the "In progress: 12" tile or donut sector on the W1/W2 Reporting Status card
- **THEN** the emitted `OverviewLink` contains `{ origin: 'W1/W2', status: 'Editing' }`
- **AND** the router navigates to `/results` with query parameters `status=Editing&origin=W1/W2` (and the effective `phase`)
- **AND IT MUST** show exactly the 12 W1/W2 results on the Results tab, excluding all 11 W3/Bilateral results.

---

### ODF-R-2: W1/W2 Category × Status Matrix Deep-Links MUST Include Funding Source
The system MUST include `origin: 'W1/W2'` in the `OverviewLink` for every clickable cell and bar in the "W1/W2 results by category and status" matrix.

#### Scenario: Clicking a category × status cell in the W1/W2 matrix
- **GIVEN** a row with `category: 'Knowledge product'` and column `status: 'Editing'`
- **WHEN** the user clicks on the cell or bar in the W1/W2 matrix
- **THEN** the emitted `OverviewLink` contains `{ origin: 'W1/W2', category: 'Knowledge product', status: 'Editing' }`
- **AND** the router navigates to `/results` with `origin=W1/W2&category=Knowledge+product&status=Editing`
- **BUT it must NOT** omit the `origin` dimension
- **AND IT MUST** leave column 3 ("Other") non-clickable (`link: null`), as it aggregates multiple heterogeneous statuses.

---

### ODF-R-3: Overview Navigation MUST Propagate Effective Phase
When `onOverviewLink(link)` is triggered, the system MUST ensure the target navigation includes `phase` set to the effective Overview phase (either from explicit overview selection or the active reporting phase).

#### Scenario: Overview link without explicit phase in link object
- **GIVEN** the user is viewing Overview with effective phase "Reporting 2026"
- **WHEN** a chart element emits `{ origin: 'W1/W2', status: 'Editing' }` without an explicit `phase` property
- **THEN** `onOverviewLink` injects `phase: 'Reporting 2026'` into the navigation `queryParams`
- **AND** the URL navigates to `/results?origin=W1%2FW2&status=Editing&phase=Reporting%202026`.

#### Scenario: Overview link with explicit phase already provided
- **GIVEN** a chart element explicitly includes `phase: 'Reporting 2024'` in its `OverviewLink`
- **WHEN** `onOverviewLink` is called
- **THEN** `onOverviewLink` honors `link.phase` and navigates with `phase=Reporting%202024`.

---

### ODF-R-4: Bilateral Overview Deep-Links MUST Preserve Bilateral Origin
The system MUST continue to include `origin: 'W3/Bilaterals'` for all bilateral chart links (categories, centers, status donut, center × category matrix) and include the effective Overview `phase`.

#### Scenario: Clicking a bilateral category bar
- **GIVEN** the bilateral categories chart with category "Capacity sharing for development"
- **WHEN** the user clicks on the bar or table row
- **THEN** the emitted `OverviewLink` contains `{ origin: 'W3/Bilaterals', category: 'Capacity sharing for development' }`
- **AND** the navigation `queryParams` includes `origin=W3/Bilaterals`, `category=Capacity+sharing+for+development`, and `phase`.

---

## 6. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `ODF-AC-1` | SP04 Overview with 12 W1/W2 editing results and 11 bilateral editing results | User clicks on W1/W2 "In progress: 12" tile | Navigates to `/results` with `origin=W1/W2&status=Editing&phase=...`, displaying exactly 12 results. |
| `ODF-AC-2` | W1/W2 category × status matrix | User clicks on cell with category `Knowledge product` and status `Submitted` | Navigates to `/results` with `origin=W1/W2&category=Knowledge+product&status=Submitted&phase=...`. |
| `ODF-AC-3` | Bilateral center bar for `IITA` | User clicks on `IITA` | Navigates to `/results` with `origin=W3/Bilaterals&center=IITA&phase=...`. |
| `ODF-AC-4` | Any chart element clicked while viewing Overview phase "Reporting 2024" | User clicks element | Navigation `queryParams` carries `phase=Reporting 2024`. |

---

## 7. Mandatory Regression Tests

1. `dashboard-lab.component.spec.ts`:
   - Verify `overviewStatusSegments` links carry `{ origin: 'W1/W2', status: ... }`.
   - Verify `overviewW12Heatmap` cells carry `{ origin: 'W1/W2', category: ..., status: ... }`.
   - Verify `onOverviewLink` adds `phase` from the effective Overview phase when `link.phase` is absent.
   - Verify `onOverviewLink` preserves `origin: 'W3/Bilaterals'` from bilateral charts.
