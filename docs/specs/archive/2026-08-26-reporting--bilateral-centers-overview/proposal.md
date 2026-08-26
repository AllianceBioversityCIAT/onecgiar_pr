# Proposal: Overview of Centers with Reported W3/Bilateral Results

## 1. Document Control

| Attribute | Value |
|---|---|
| **Spec Path** | `docs/specs/reporting/bilateral-centers-overview/` |
| **Proposal File** | `docs/specs/reporting/bilateral-centers-overview/proposal.md` |
| **Type** | Change |
| **Approval Mode** | gated |
| **Derived Slug** | `reporting/bilateral-centers-overview` (derived from user prompt: "replace this figure with an overview by Center: Centers with reported w3/bilateral results") |
| **Author** | Antigravity AI |
| **Date** | 2026-08-26 |
| **Target Route** | `/result-framework-reporting/entity-details/:entityId/overview` |

---

## 2. Intent

Replace the existing **"Bilateral contributions"** card (Card 5) on the Science Program Overview tab (`dashboard-lab/components/program-overview`) with a new, actionable overview by Center: **"Centers with reported W3/bilateral results"**, displaying each CGIAR Center that has reported W3/bilateral results mapped to the current Science Program along with its respective result count.

---

## 3. Problem / Current Behavior

Currently, Card 5 in `<app-program-overview>` renders a static summary titled **"Bilateral contributions"** with 3 coarse rows and a disabled stub:
- *"Results where this program is tagged"* (e.g. 83)
- *"Where this program is the primary science program"* (e.g. 81)
- *"Where this program is a contributor"* (e.g. 2)
- *"Of those where this program is primary — COMING SOON: A breakdown by review status is not shown yet."*

**Pain Points:**
1. **Low analytical value**: Program leaders and PMU already know how many results they lead; what they urgently need to see on this dashboard is **which CGIAR Centers are contributing/reporting W3/Bilateral results** to their Science Program.
2. **Dead-end stub**: The "COMING SOON" review status breakdown occupies vertical space without providing actionable information.
3. **Inconsistency with Portfolio & Program Overview style**: Cards 2 and 3 ("W1/W2 results by indicator category" and "W3/Bilateral results by indicator category") provide rich, granular breakdowns using horizontal bar distributions, whereas Card 5 only displays redundant total counts.

---

## 4. Proposed Outcome

Transform Card 5 into:
- **Card Title**: `Centers with reported W3/bilateral results` (or `Centers with reported w3/bilateral results`)
- **Subtitle / Description**: `Centers reporting W3 and bilateral results for this program`
- **Content**: A sorted breakdown of each CGIAR Center (e.g., CIAT, CIMMYT, IRRI, IFPRI, CIP) with:
  - Center identifier / acronym and name
  - Proportional visual track (horizontal bar styled with `--pr-chart-2` / `--pr-chart-2-muted`, consistent with the bilateral category card)
  - Numeric count of reported W3/bilateral results
  - Empty state message when no centers have reported bilateral results yet (`"No centers have reported bilateral results for this program yet."`)

---

## 5. Endpoints Analysis

The user specifically requested to **"check the endpoints"**. Here is the verified technical audit:

### 5.1 Active Client Endpoint
When the user visits `/result-framework-reporting/entity-details/:entityId/overview`, `DashboardLabComponent` already triggers an overview-gated effect:
```typescript
this.api.resultsSE.GET_ResultToReview(code)
```
- **HTTP Call**: `GET /api/results/by-program-and-centers?programId=<programId>`
- **Payload Structure**:
  ```json
  {
    "response": [
      {
        "project_id": "PRJ-01",
        "project_name": "Project Alpha",
        "results": [
          {
            "id": 1234,
            "result_code": "R-1234",
            "result_title": "...",
            "indicator_category": "Innovation development",
            "status_id": "5",
            "status_name": "Pending Review",
            "lead_center": "CIAT",
            "initiative_role_id": "1",
            "initiative_role_name": "Primary"
          }
        ]
      }
    ]
  }
  ```

### 5.2 Server-Side Query (`getResultsByProgramAndCenters`)
Location: `onecgiar-pr-server/src/api/results/result.repository.ts:2749-2870`
- The query joins `results_center rc` where `(rc.is_leading_result = 1 OR rc.is_primary = 1)`.
- It already extracts `ci2.acronym AS center_name` and maps it directly to `lead_center` on every result.
- All W3/bilateral results for the program (`r.source = 'API' AND ci.official_code = ? AND r.status_id IN (5, 6, 7)`) are already fetched in this single call.

### 5.3 CLARISA Centers Catalog
Location: `onecgiar-pr-client/src/app/shared/services/global/centers.service.ts`
- `CentersService.centers()` is already instantiated and cached in memory across the app via `GET /clarisa/centers`.
- Provides full center names (`name`), acronyms (`acronym`), and codes (`code`) to enrich the acronyms from `lead_center` if needed.

### 5.4 Endpoint Conclusion
**No new backend endpoint or database migration is required.**
The existing endpoint (`GET /api/results/by-program-and-centers?programId=...`) already provides all necessary information (`lead_center` per result). The aggregation can be computed reactively via an Angular `computed()` signal in `DashboardLabComponent` (or `ProgramOverviewComponent`), matching the exact architecture of `overviewBilateralCategories`.

*(Note: If in the future non-leading contributing centers should also be counted in addition to lead centers, a minor extension to the server SQL or a dedicated summary endpoint can be introduced. For current W3/Bilateral results, `lead_center` represents the reporting center).*

---

## 6. Scope

### In-Scope
1. **Frontend Template Update**:
   - In `program-overview.component.html`, replace Card 5's markup (the 3 role counts and the coming soon stub) with the new Centers breakdown.
   - Update Card 5 title to `Centers with reported W3/bilateral results`.
2. **Frontend Component & Data Flow**:
   - In `dashboard-lab.component.ts`, create a `computed()` signal `overviewBilateralCenters` that aggregates `this.bilateralRows()` by `lead_center`.
   - In `program-overview.component.ts`, replace `bilateralRoles` input with `bilateralCenters` input.
3. **Unit & Component Testing**:
   - Update `program-overview.component.spec.ts` (6 card headings assertion and specific card 5 test cases).
   - Update `dashboard-lab.component.spec.ts` to test the new aggregation computed signal.

### Non-Goals
- Changing the behavior or endpoints of the dedicated **Bilateral Results** review table.
- Modifying other overview cards (Cards 1, 2, 3, 4, 6).
- Creating new backend tables or database migrations.

---

## 7. Affected Users, Systems, And Specs

| Entity | Impact |
|---|---|
| **Science Program Leads / Submitters** | Can immediately see which CGIAR Centers are reporting bilateral results into their Science Program directly from the Overview screen. |
| **PMU & Portfolio Managers** | Faster accountability and visibility over Center participation. |
| **Affected Components** | `ProgramOverviewComponent`, `DashboardLabComponent`. |
| **Related Specs** | `docs/specs/quick/quick-log.md` (recent title changes). |

---

## 8. Visual Reference

- **Source**: User attached screenshot (`/var/folders/g8/8wqxv48d60737hm79glkxx0w0000gn/T/orca-paste-1787760992347-91ae439d-a768-4ec1-9e32-10abe9898198.png`)
- **Current Figure**: Card titled "Bilateral contributions" with 3 count rows (Tagged, Primary, Contributor) and "Of those where this program is primary COMING SOON".
- **Target Style**: Follows the existing horizontal bar chart pattern established in Card 3 ("W3/Bilateral results by indicator category") and Portfolio Overview ("Bilateral results by Program").

---

## 9. Requirement Delta Preview

### ADDED Requirements
- **R-CEN-1**: The Program Overview tab SHALL display a card titled `"Centers with reported W3/bilateral results"`.
- **R-CEN-2**: The card SHALL list each unique Center that reported W3/bilateral results for the selected Science Program, displaying:
  - Center acronym (and optional full name on hover / title)
  - Horizontal bar indicating relative volume
  - Total count of reported results
- **R-CEN-3**: Centers SHALL be sorted in descending order by result count, with alphabetical tie-breaking.
- **R-CEN-4**: When no results are reported, an empty state message SHALL be displayed: `"No centers have reported bilateral results for this program yet."`

### REMOVED Requirements
- **R-CEN-DEL-1**: The 3 static role counts (*"Results where this program is tagged"*, *"Where this program is the primary science program"*, *"Where this program is a contributor"*) are removed.
- **R-CEN-DEL-2**: The inert footer *"Of those where this program is primary COMING SOON"* is removed.

---

## 10. Approach Options

### Option 1: Client-Side Reactive Aggregation via Existing Endpoint (Recommended)
- **Mechanism**: Compute `overviewBilateralCenters` in `DashboardLabComponent` from `this.bilateralRows()`, which is already fetched on the Overview tab via `GET /api/results/by-program-and-centers?programId=<code>`.
- **Pros**:
  - Zero backend changes; zero new network requests; zero risk of server-side regressions.
  - Reuses existing proven data pipeline (`ResultToReview.lead_center`).
  - Instant loading since data is already in memory.
  - Matches the design token and pattern of `overviewBilateralCategories`.
- **Cons**: Only counts `lead_center`. (This matches how the sidebar in the Bilateral Results tab currently calculates centers with results).

### Option 2: New Dedicated Server Aggregation Endpoint
- **Mechanism**: Add `GET /api/results/bilateral-centers-summary?programId=<code>` in `results.controller.ts` that runs a SQL `GROUP BY rc.center_id`.
- **Pros**: Offloads sorting and grouping to MySQL.
- **Cons**: Requires changes to server controller, service, repository, tests, and makes an additional HTTP request on page load, slowing down the Overview tab.

### Recommendation
**Option 1** is strongly recommended. It is lean, fast, requires no backend changes, and adheres strictly to the existing pattern used by other cards on this tab.

---

## 11. Risks, Dependencies, And Open Questions

### Risks & Mitigations
- **Centers without acronym**: In rare cases where `lead_center` is `"Not specified"`, group them under `"Other / Not specified"` or filter if empty.
- **Card height & overflow**: If a program has results from 10+ Centers, the card could become excessively tall.
  - *Mitigation*: Set a clean max height with scroll, or display the top centers with a toggle if needed (consistent with portfolio overview).

### Open Questions for User
1. **Card Title**: Would you prefer **"Centers with reported W3/bilateral results"** or **"Centers with reported w3/bilateral results"**?
2. **Center Filtering**: Should clicking on a Center row navigate or switch to the **Bilateral Results** tab filtered by that Center, or remain informational (display-only) for now?

---

## 12. Success Criteria

1. Card 5 in the Program Overview displays the new title and lists Centers with their reported W3/bilateral result counts.
2. The old "Bilateral contributions" 3-row layout and "COMING SOON" text are completely removed.
3. Unit tests in `program-overview.component.spec.ts` and `dashboard-lab.component.spec.ts` pass 100%.
4. Zero regressions on the other 5 cards or the Bilateral Results tab.

---

## 13. Next Step

Upon review and approval of this proposal, proceed to:
```bash
/akili-specify reporting/bilateral-centers-overview
```
