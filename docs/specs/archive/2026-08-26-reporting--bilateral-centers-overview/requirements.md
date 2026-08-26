# Module Spec — `requirements.md`

## 1. Module / Feature

- **Module:** `bilateral` / `results-framework-reporting`
- **Sub-feature:** `centers-overview` (Overview of Centers with Reported W3/Bilateral Results)
- **Owner:** Antigravity AI / Reporting PMU
- **Status:** approved
- **Ticket(s):** P2-3302 follow-up
- **Approval Mode:** auto-approved (pre-approved mode: user instructed "quiero que tu tomes la desicion de diseño")

---

## 2. Context

In the Science Program Overview dashboard (`/result-framework-reporting/entity-details/:entityId/overview`), Card 5 previously displayed a static summary of bilateral counts titled "Bilateral contributions" (Tagged, Primary, Contributor, plus an inert "COMING SOON" review status stub).

This spec replaces that figure with a granular, actionable breakdown by CGIAR Center: **"Centers with reported W3/bilateral results"**. This aligns with the visual design of Cards 2 & 3 ("W1/W2 results by indicator category" and "W3/Bilateral results by indicator category"), presenting each Center with a horizontal bar indicator and its corresponding count of reported bilateral results.

---

## 3. In Scope / Out of Scope

### In scope
- Renaming Card 5's heading in `<app-program-overview>` to **`Centers with reported W3/bilateral results`**.
- Computing the reactive aggregation in `DashboardLabComponent` from `bilateralRows()` by Center (`lead_center`), ordered descending by count.
- Rendering a horizontal progress bar for each Center normalized against the maximum center count (`centersMax`).
- Displaying an empty state message when no centers have reported bilateral results for the program.
- Updating unit tests in `program-overview.component.spec.ts` and `dashboard-lab.component.spec.ts`.

### Out of scope
- Modifying backend endpoints or database schemas (existing `GET /api/results/by-program-and-centers` payload is sufficient).
- Modifying the dedicated **Bilateral Results** review table.
- Changing cards 1, 2, 3, 4, or 6.

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| **Science Program Lead / Submitter** | Can immediately see on their Overview dashboard which CGIAR Centers are actively reporting W3/bilateral results for their Program. |
| **PMU / Portfolio Lead** | Instant visibility over institutional contributions by Center without navigating to the sub-tables. |

---

## 5. Functional Requirements

### `BIL-R-CEN-1`: Card Heading & Subtitle
The Program Overview tab SHALL display Card 5 with the title `"Centers with reported W3/bilateral results"`.

#### Scenario 1: Approved heading order
- GIVEN the user navigates to `/result-framework-reporting/entity-details/:entityId/overview`
- WHEN `<app-program-overview>` renders the 6 overview cards
- THEN the 5th card heading text MUST be `"Centers with reported W3/bilateral results"`
- BUT it must NOT contain `"Bilateral contributions"`.

---

### `BIL-R-CEN-2`: Center Aggregation and Ranking
The system SHALL aggregate the program's bilateral rows by their reporting Center (`lead_center`), ranking them descending by result count with alphabetical tie-breaking.

#### Scenario 1: Multiple centers reporting results
- GIVEN bilateral results for `SP04` containing:
  - 45 results for `"CIAT"`
  - 32 results for `"IRRI"`
  - 4 results for `"CIMMYT"`
  - 4 results for `"CIP"`
- WHEN the `overviewBilateralCenters` signal evaluates
- THEN it SHALL return 4 items in this exact order:
  1. `"CIAT"` with count `45`
  2. `"IRRI"` with count `32`
  3. `"CIMMYT"` with count `4`
  4. `"CIP"` with count `4`
- AND the maximum count (`centersMax`) SHALL evaluate to `45`.

#### Scenario 2: Unspecified or missing center
- GIVEN a bilateral result where `lead_center` is `"Not specified"` or missing
- WHEN aggregating results
- THEN it SHALL group them under `"Not specified"`, placed in the sorted rank according to its count.

---

### `BIL-R-CEN-3`: Visual Track & Progress Bar
Each Center row SHALL render:
- The Center acronym / label (truncated if longer than container, with full text on `title` attribute)
- A horizontal progress track using `--pr-border-divider` background and `--pr-chart-2` fill
- The width percentage calculated as `(center.count / centersMax) * 100`%
- The numeric count right-aligned in monospace/figure typography.

#### Scenario 1: Track width calculation
- GIVEN the maximum center count is `50`
- WHEN rendering a Center with `25` results
- THEN the inner bar width SHALL be `50%`.

---

### `BIL-R-CEN-4`: Empty State Handling
When no bilateral results exist for the program (empty list), Card 5 SHALL render an empty state message.

#### Scenario 1: No bilateral results
- GIVEN a Science Program with 0 bilateral results
- WHEN `<app-program-overview>` renders Card 5
- THEN it SHALL display `"No centers have reported bilateral results for this program yet."`
- AND it MUST NOT render any bar rows or error out dividing by zero.

---

### `BIL-R-CEN-DEL-1`: Removal of Legacy Role Counts & Coming Soon Stub
The three legacy static role counts (*"Results where this program is tagged"*, *"Where this program is the primary science program"*, *"Where this program is a contributor"*) and the disabled review-status stub (*"Of those where this program is primary — COMING SOON"*) SHALL be completely removed.

---

## 6. Non-Functional Requirements

- **`BIL-NFR-PERF`**: Purely reactive client-side computation with zero additional HTTP requests.
- **`BIL-NFR-A11Y`**: Every bar row SHALL include an `aria-label` formatted as `"<Center>: <count> result"` or `"<Center>: <count> results"`.
- **`BIL-NFR-RESPONSIVE`**: Conforms to the 12-column grid (`col-span-6 max-[1180px]:col-span-12`), wrapping seamlessly on smaller screens.

---

## 7. Requirement ID Index

| ID | Title | Priority |
|---|---|---|
| `BIL-R-CEN-1` | Card Heading & Subtitle | High |
| `BIL-R-CEN-2` | Center Aggregation and Ranking | High |
| `BIL-R-CEN-3` | Visual Track & Progress Bar | High |
| `BIL-R-CEN-4` | Empty State Handling | Medium |
| `BIL-R-CEN-DEL-1` | Removal of Legacy Role Counts & Stub | High |
