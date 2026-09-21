# Result Framework Reporting — Landing Page Planned KPIs & Results Breakdown — `requirements.md`

## 1. Document Control

| Field | Value |
|---|---|
| **Module** | `result-framework-reporting` |
| **Sub-feature** | Home / Landing Page Program Cards (`result-framework-reporting-card-item`) |
| **Prefix** | `RFR` |
| **Status** | `draft` |
| **Depth** | Standard |
| **Approval Mode** | gated |
| **Date** | 2026-09-21 |
| **Requester** | Client feedback via Nicoleta (with UI screenshot from QA environment) |
| **Ticket(s)** | none provided |

---

## 2. Executive Summary

On the Result Framework Reporting landing page (`/result-framework-reporting/home`), each Science Program and Accelerator card (`app-result-framework-reporting-card-item`) currently shows only the total reported results for the active reporting phase (e.g. `208 results this phase`) and their workflow statuses (`208 Editing`). 

In Phase 2026, all initial results were automatically replicated from previous reporting phases (2024–2025) through the phase-transition replication engine (`result.is_replicated = 1`). Consequently, users cannot tell that these 208 results represent ongoing innovations awaiting updates rather than newly reported achievements. Furthermore, users cannot see how these results relate to the planned Theory of Change (ToC) KPI commitments for 2026.

This specification establishes requirements to:
1. Display the **2026 planned ToC KPIs** for each Science Program on its landing card (e.g. `454 planned KPIs`).
2. Disclose that currently available results in the phase are **replicated innovations** from previous cycles.
3. Provide a structured origin breakdown of **replicated results vs. new results** (e.g. `208 replicated · 0 new`).
4. Ensure clean responsive layout and seamless integration with the existing **Compact View** toggle.

---

## 3. Glossary

| Term | Definition |
|---|---|
| **Science Program (SP)** | Major thematic research unit of the 2025–2030 OneCGIAR portfolio (e.g. SP01 Breeding for Tomorrow, SP02 Sustainable Farming). |
| **Planned KPI** | A target indicator committed in the Science Program's Theory of Change (ToC) for the active reporting year (2026). |
| **Replicated Result** | An innovation result (`result_type_id` in 7, 2, etc.) cloned into the 2026 reporting phase from previous cycles with `is_replicated = 1` for continuation/reporting. |
| **New Result** | A result created directly during the current reporting phase (`is_replicated = 0` or `NULL`). |
| **Compact View** | User preference toggled on `/result-framework-reporting/home` that collapses chart details and card metadata to display minimal numbers. |

---

## 4. System Context & Scope

### Context
- **Screen:** `/result-framework-reporting/home` — `ResultFrameworkReportingHomeComponent`.
- **Target Components:** `ResultFrameworkReportingCardItemComponent` (`app-result-framework-reporting-card-item`).
- **Server Endpoint:** `GET /api/results-framework-reporting/get/science-programs/progress` (handled by `ResultsService.getScienceProgramProgress`).
- **Constitutional Alignment:**
  - `docs/prd.md`: Refines **US-P1** (phase-aware dashboard), **G1** (reporting completeness and ToC alignment tracking).
  - `docs/ux-ui/design.md`: Adheres to §7 design tokens (`--pr-color-secondary-400`, `text-brand-400`, `bg-brand-25/50`, `material-icons-round`, `prTooltip`) and §6 card grid patterns.
  - Previous Spec: `docs/specs/archive/2026-09-03-bugfix--kpi-count-reconciliation` (KCR-DD-2: planned KPI universe).

### In Scope
- Extending `ScienceProgramProgressDto` and `SPProgress` to include `plannedKpis`, `replicatedResults`, and `newResults`.
- Populating `replicatedResults` and `newResults` from `r.is_replicated` in `ResultsService.buildScienceProgramBuckets()`.
- Extracting `plannedKpis` count from `_tocResultsRepository.getIndicatorContributions()` in `calculateInitiativeProgress()` with zero additional database roundtrips.
- Rendering the planned ToC KPIs badge/metric in each program card with an explanatory tooltip.
- Rendering the origin breakdown (`N replicated · M new`) with distinct icons and an informative tooltip explaining replication.
- Supporting both expanded and compact view modes cleanly at all supported card widths (minimum 315px).
- Automated unit and integration tests across client and server.

### Out of Scope
- Modifying the replication engine, phase transitions, or altering `result.is_replicated` values in the database.
- Modifying "My CGIAR Centers" cards (`app-result-framework-reporting-center-card-item`), which do not track ToC commitments.
- Modifying the 3D Galaxy view (`app-result-framework-reporting-galaxy`) or right-rail insights widget.

---

## 5. Stakeholders & Personas

| Persona | Motivation & Impact |
|---|---|
| **Science Program / Accelerator Lead** | Needs to immediately see their program's planned ToC commitment (KPI denominator) and track how many results are continuations vs new outputs. |
| **Result Submitter** | Needs clarity on why their program already has 200+ results in editing state upon opening the 2026 phase. |
| **PMU / Portfolio Reviewer** | Needs to distinguish between legacy replicated innovations undergoing updating and brand new 2026 initiatives during portfolio review. |

---

## 6. Functional Requirements

### Required (MUST)

#### RFR-R-1: Planned ToC KPIs Metric Display
Each Science Program and Accelerator card MUST display the total count of planned KPIs committed in the Theory of Change for the active reporting phase/year.

##### Scenario: Program card renders planned KPIs
- GIVEN a Science Program with 454 planned ToC indicators for 2026
- WHEN the user visits `/result-framework-reporting/home`
- THEN the program card SHALL display `454 planned KPIs`
- AND hovering or focusing on the badge SHALL display a tooltip: `Planned KPIs committed in the Theory of Change for 2026`
- BUT if a program has no planned ToC KPIs (`0` or `null`), it SHALL display `— planned KPIs` or hide the planned metric gracefully without leaving empty layout gaps.

#### RFR-R-2: Replicated vs. New Results Breakdown
Each card MUST display a clear breakdown separating results replicated from previous phases from new results created in the current phase.

##### Scenario: Full replication breakdown
- GIVEN a Science Program with 208 total results in 2026, where all 208 have `is_replicated = true` and 0 have `is_replicated = false`
- WHEN the card renders in expanded view
- THEN it SHALL display `208 results this phase`
- AND directly beneath or beside it, it SHALL display `208 replicated · 0 new`
- AND the replicated item SHALL display an icon denoting continuation (e.g. `sync` or `history`)
- AND the new item SHALL display an icon denoting addition (e.g. `add_circle`)
- AND IT MUST satisfy the arithmetic invariant: `replicatedResults + newResults === totalResults`.

#### RFR-R-3: Replication Context Tooltip
The card MUST provide accessible explanatory text clarifying what "replicated" means in the context of the 2026 reporting cycle.

##### Scenario: User checks replication explanation
- GIVEN a card displaying replicated results
- WHEN the user hovers over or focuses the replication info indicator (`info` icon or tooltip)
- THEN an informative tooltip SHALL display: `Results currently available are replicated from previous reporting phases for continuation and updating in 2026. New results will appear as they are reported.`

#### RFR-R-4: Compact View Responsiveness
The planned KPI and breakdown elements MUST adapt seamlessly when the user toggles **Compact View**.

##### Scenario: Compact view active
- GIVEN the user has enabled Compact View (`ResultFrameworkReportingHomeService.compactView() === true`)
- WHEN the program card renders
- THEN the detailed origin sub-row and status chips SHALL collapse
- AND the card SHALL display the condensed primary metrics: `[Total Results] results · [Planned KPIs] planned KPIs`
- AND the card layout SHALL NOT overflow, clip, or produce horizontal scrollbars.

#### RFR-R-5: API Contract Enhancement (Additive & Zero-Extra-Query)
The endpoint `GET /api/results-framework-reporting/get/science-programs/progress` MUST return additive fields `plannedKpis`, `replicatedResults`, and `newResults` for each initiative.

##### Scenario: API response payload
- GIVEN an authenticated request to `GET /api/results-framework-reporting/get/science-programs/progress`
- WHEN the server constructs `ScienceProgramProgressDto`
- THEN each program item SHALL contain:
  - `plannedKpis`: integer representing planned ToC indicator count for the year
  - `replicatedResults`: integer count of results where `r.is_replicated` is truthy
  - `newResults`: integer count of results where `r.is_replicated` is falsy
- AND the calculation MUST NOT execute additional database queries per initiative beyond the existing `calculateInitiativeProgress` and result repository calls.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | Response time of `GET /api/results-framework-reporting/get/science-programs/progress` MUST NOT increase by more than 10ms (zero extra DB roundtrips). |
| **Accessibility** | All tooltip triggers, icons, and status badges MUST meet WCAG 2.1 AA keyboard focus (`tabindex="0"`, `aria-label`, visible outline). |
| **Responsive Geometry** | Cards MUST render without horizontal clipping, text truncation, or overflow down to a container width of `315px`. |
| **Backwards Compatibility** | New API payload fields MUST be purely additive; existing consumers ignoring them MUST experience zero disruption. |
| **Visual Consistency** | Colors and typography MUST strictly use `--pr-color-secondary-400`, `text-brand-400`, `text-[var(--pr-color-accents-5)]`, and `material-icons-round` per `docs/ux-ui/design.md`. |

---

## 8. Defect Classes & Verification Gates

| Defect Class | How it could manifest | Verification Gate |
|---|---|---|
| **Count / Arithmetic Divergence** | `replicatedResults + newResults != totalResults` or planned KPIs mismatch. | Automated Jest tests verifying count arithmetic across server and client fixtures. |
| **Layout / Overflow Defect** | Text wrapping causes card height jumping, clipping, or breaks the 3-column grid at `315px`. | Rendered measurement spec test in Jest at 315px width + manual review at HITL pause. |
| **Compact View State Leak** | Detailed badges remain visible or leave whitespace when Compact View is toggled. | Component tests checking DOM presence when `compactView` signal flips `true` / `false`. |
| **Zero-Target KPI Distortion** | Count includes obsolete indicators or displays `0` when indicators exist. | Unit test verifying that `plannedKpis` reflects active indicators for the reporting year. |

---

## 9. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `RFR-AC-1` | SP01 (Breeding for Tomorrow) with 454 planned ToC KPIs and 208 replicated results | The landing page loads | Card displays `454 planned KPIs`, `208 results this phase`, and `208 replicated · 0 new`. |
| `RFR-AC-2` | A user hovering the replication breakdown | Mouse enters the replication indicator | Tooltip displays explanatory copy regarding previous phase replication. |
| `RFR-AC-3` | A program with 5 new results and 100 replicated results | Card renders | Breakdown shows `100 replicated · 5 new` and `totalResults` equals 105. |
| `RFR-AC-4` | The user clicks "Compact view" | Compact view activates | Origin pills and status bar collapse, displaying condensed summary metrics cleanly. |
| `RFR-AC-5` | A program with no ToC data (`plannedKpis` is null or 0) | Card renders | Displays `— planned KPIs` or hides the planned badge without breaking layout. |
| `RFR-AC-6` | `GET /api/results-framework-reporting/get/science-programs/progress` is called | Response returned | `mySciencePrograms` and `otherSciencePrograms` items include valid `plannedKpis`, `replicatedResults`, and `newResults`. |

---

## 10. Dependencies & Assumptions

- **Upstream Dependencies:**
  - `_tocResultsRepository.getIndicatorContributions()` in `onecgiar-pr-server`: returns active indicator targets for the year.
  - `AllResultsByRoleUserAndInitiativeFiltered()` in `onecgiar-pr-server`: projects `r.is_replicated`.
- **Downstream Consumers:**
  - `ResultFrameworkReportingHomeComponent` and `ResultFrameworkReportingCardItemComponent`.
- **Assumptions:**
  - Every replicated result has `is_replicated = 1` in the database; results created manually during Phase 2026 have `is_replicated = 0` or `NULL`.

---

## 11. Requirement ID Index

- `RFR-R-1`: Planned ToC KPIs Metric Display
- `RFR-R-2`: Replicated vs. New Results Breakdown
- `RFR-R-3`: Replication Context Tooltip
- `RFR-R-4`: Compact View Responsiveness
- `RFR-R-5`: API Contract Enhancement (Additive & Zero-Extra-Query)
- `RFR-AC-1` to `RFR-AC-6`: Acceptance Criteria
