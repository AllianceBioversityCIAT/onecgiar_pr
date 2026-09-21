# Result Framework Reporting — Landing Page Planned KPIs & Results Breakdown — `design.md`

## 1. Summary

This design implements the client enhancement requested by Nicoleta for `/result-framework-reporting/home`: surfacing 2026 planned Theory of Change (ToC) KPIs and distinguishing replicated innovation results from new results on each Science Program card (`app-result-framework-reporting-card-item`).

The solution is split cleanly:
1. **Server (`onecgiar-pr-server`):** The progress endpoint `GET /api/results-framework-reporting/get/science-programs/progress` is enriched with three additive fields: `plannedKpis`, `replicatedResults`, and `newResults`. It leverages existing queries with **zero extra database roundtrips**.
2. **Client (`onecgiar-pr-client`):** The card component template and styling are updated to display a dual-stat metric header (results reported + planned ToC KPIs badge), an origin breakdown sub-row (`N replicated · M new`) with contextual tooltips, and seamless adaptation under the page-wide Compact View toggle.

- **Requirements Document:** [`requirements.md`](./requirements.md)
- **Authority Sources:** [`docs/prd.md`](../../prd.md) (G1, US-P1), [`docs/ux-ui/design.md`](../../ux-ui/design.md) (§6, §7), [`docs/trd/trd.md`](../../trd/trd.md).

---

## 1A. Premise Ledger

Verified: 4 · UNVERIFIED: 0 · High Impact: 0 · Low Impact: 0  
Blast-radius triggers: live-path, shared-state, consumer

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| `P-1` | `AllResultsByRoleUserAndInitiativeFiltered()` already projects `r.is_replicated` for all result rows. | `location` | `onecgiar-pr-server/src/api/results/result.repository.ts:734` (`r.is_replicated`) | `471452232` | Must add `r.is_replicated` to the select projection of the custom repository. Impact: Low. | — |
| `P-2` | `calculateInitiativeProgress()` retrieves all planned ToC indicator contributions for the initiative and reporting year into memory. | `live-path` | `onecgiar-pr-server/src/api/results/results.service.ts:1580-1583` (`this._tocResultsRepository.getIndicatorContributions(initiativeCode.toUpperCase(), year)`) | `471452232` | Must introduce a separate query to fetch planned ToC indicator counts. Impact: Low. | — |
| `P-3` | `ResultFrameworkReportingHomeService` fetches program progress via `scienceProgramIdSE.progress$` and binds it to `mySPsList`, `otherSPsList`, and `otherProjectsList`. | `shared-state` | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/result-framework-reporting-home/services/result-framework-reporting-home.service.ts:87-96` | `471452232` | Service would fail to distribute the updated progress objects to the landing page cards. Impact: High. | — |
| `P-4` | `ResultFrameworkReportingCardItemComponent` receives `item: SPProgress` as `@Input()` and renders result metrics and status breakdown. | `consumer` | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/result-framework-reporting-home/components/result-framework-reporting-card-item/result-framework-reporting-card-item.component.ts:28` | `471452232` | Card component would not have access to the extended progress properties. Impact: High. | — |

---

## 2. Architecture Overview

### 2.1 System Placement
- **Backend Module:** `ResultsModule` (`onecgiar-pr-server/src/api/results/`) and `ResultsFrameworkReportingModule` (`onecgiar-pr-server/src/api/results-framework-reporting/`).
- **Frontend Feature:** `ResultFrameworkReportingHomeModule` (`onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/result-framework-reporting-home/`).
- **Component:** `ResultFrameworkReportingCardItemComponent`.

### 2.2 Data Flow & Sequence Diagram

```text
[Browser / Landing Page]
  │
  ├──► GET /api/results-framework-reporting/get/science-programs/progress
  │       │
  │       ▼
  │   [ResultsController / ResultsService.getScienceProgramProgress]
  │       │
  │       ├── 1. Query results: AllResultsByRoleUserAndInitiativeFiltered()
  │       │      └── Projects r.is_replicated, status_id, version_id, submitter_id
  │       │
  │       ├── 2. Query ToC targets: calculateInitiativeProgress(initiativeCode, year)
  │       │      └── _tocResultsRepository.getIndicatorContributions()
  │       │      └── Extracts progress percentage AND indicator count (plannedKpis)
  │       │
  │       └── 3. Aggregate in buildScienceProgramBuckets()
  │              ├── Tally replicatedResults (where is_replicated is truthy)
  │              ├── Tally newResults (where is_replicated is falsy)
  │              └── Assign plannedKpis from ToC map
  │
  ▼
[Client Response Envelope]
  │
  ▼
[ResultFrameworkReportingHomeService.getScienceProgramsProgress()]
  │
  ▼
[ResultFrameworkReportingCardItemComponent]
  │
  ├── Renders displayName & initiative code
  ├── Renders Dual-Metric Header: [totalResults] results · [plannedKpis] planned KPIs
  ├── Renders Origin Breakdown: [replicatedResults] replicated · [newResults] new
  └── Renders Status bar & workflow chips (conditional on !compactView())
```

---

## 3. Data Model Changes

### 3.1 Database Entities & Migrations
- **Entities:** No database schema changes. `result.is_replicated` is an existing boolean column (`result.entity.ts:473`).
- **Migrations:** None required.

---

## 4. API Surface

### 4.1 Endpoint Modification

- **Method + Path:** `GET /api/results-framework-reporting/get/science-programs/progress` (and alias `GET /api/results/get/science-programs/progress`)
- **Version:** `v1` (additive fields, 100% backward-compatible)
- **Auth:** Custom header `auth: <JWT>`
- **Response DTO:** `ScienceProgramProgressResponseDto`

#### Additive Fields in `ScienceProgramProgressDto`
- `plannedKpis: number | null` — Count of planned ToC indicators with targets for the reporting year.
- `replicatedResults: number` — Count of results where `is_replicated === true` (or 1).
- `newResults: number` — Count of results where `is_replicated === false` (or 0 / null).

#### Additive Fields in `VersionProgressDto`
- `plannedKpis?: number | null`
- `replicatedResults?: number`
- `newResults?: number`

---

## 5. Server Workflow & Business Rules

### 5.1 Extracting Planned KPIs (`calculateInitiativeProgress`)
1. In `ResultsService.calculateInitiativeProgress(initiativeCode, year)`:
   - Call `this._tocResultsRepository.getIndicatorContributions(initiativeCode.toUpperCase(), year)`.
   - The returned `indicatorContributions` is a `Map<string, IndicatorContribution>`.
   - The total number of planned indicators with targets for this initiative and year is `indicatorContributions.size`.
   - Store both `progress` and `plannedKpis` in a composite map or tuple keyed by `initiative.id`.

### 5.2 Aggregating Replicated vs New Results (`buildScienceProgramBuckets`)
1. In `ResultsService.buildScienceProgramBuckets(rows, initiativesSeed, userRoles, progressMap)`:
   - Initialize `container.dto.replicatedResults = 0` and `container.dto.newResults = 0`.
   - When iterating `rows.forEach((row) => ...)`:
     - Check `row?.is_replicated`:
       - If truthy (`1`, `true`, `'1'`): increment `replicatedResults` on both the initiative container and the matching `versionContainer`.
       - If falsy (`0`, `false`, `null`, `undefined`): increment `newResults` on both the initiative container and the matching `versionContainer`.
   - Set `container.dto.plannedKpis = plannedKpisMap.get(initiativeId) ?? 0`.

---

## 6. Frontend / UX Component Architecture

### 6.1 Component & Interface Updates
- **File:** `onecgiar-pr-client/src/app/shared/interfaces/SP-progress.interface.ts`
  - Update `SPProgress`:
    - `plannedKpis?: number;`
    - `replicatedResults?: number;`
    - `newResults?: number;`
  - Update `Version`:
    - `plannedKpis?: number;`
    - `replicatedResults?: number;`
    - `newResults?: number;`

### 6.2 Visual Layout & Hierarchy in `ResultFrameworkReportingCardItemComponent`

The card footer is organized into three distinct tiers:

1. **Tier 1 — Primary Metrics Header:**
   - **Left:** Large numeric count: `totalResults` + `results this phase`.
   - **Right:** Planned KPIs pill:
     - Badge styling: `bg-brand-50 border border-brand-200/70 text-brand-400 rounded-full px-2 py-0.5 text-[11px] font-semibold`.
     - Flag icon: `<i class="material-icons-round text-[12px] text-brand-300">flag</i>`.
     - Text: `{{ item?.plannedKpis }} planned KPIs`.
     - Tooltip: `prTooltip="Planned KPIs committed in the Theory of Change for 2026"`.
     - If `plannedKpis` is null, 0, or absent: renders `— planned KPIs` or hides gracefully.

2. **Tier 2 — Origin Breakdown Row (Expanded View only):**
   - Inside `.pr-card-meta__inner`:
     - Container: `flex items-center justify-between text-xs text-[var(--pr-color-accents-5)] pt-1`.
     - Left pill cluster:
       - **Replicated Badge:** `inline-flex items-center gap-1 rounded bg-[var(--pr-color-accents-1)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--pr-color-accents-6)]`.
         Icon: `sync` (amber-600). Value: `{{ replicatedResults }} replicated`.
         Tooltip: `prTooltip="Results replicated from previous reporting phases for updating/continuation in 2026"`.
       - **New Badge:** `inline-flex items-center gap-1 rounded bg-[var(--pr-color-accents-1)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--pr-color-accents-6)]`.
         Icon: `add_circle` (emerald-600). Value: `{{ newResults }} new`.
         Tooltip: `prTooltip="New results created directly in this reporting phase"`.
     - Right info trigger:
       - Icon: `help_outline` (`text-[14px] text-[var(--pr-color-accents-4)] hover:text-brand-400 transition-colors`).
       - Tooltip: `prTooltip="Results currently available are replicated from previous reporting phases for continuation and updating in 2026. New results will appear as they are reported."`.

3. **Tier 3 — Workflow Status Bar & Chips (Existing, Expanded View only):**
   - Retains the existing progress bar: `flex h-1.5 w-full overflow-hidden rounded-full bg-[var(--pr-color-accents-2)]`.
   - Retains the status chips: `208 Editing`, `1 QAed`, `1 Submitted`.

### 6.3 Compact View Contract
When `homeService.compactView() === true`:
- Tier 2 (origin breakdown) and Tier 3 (status bar and chips) are collapsed via the existing `!homeService.compactView()` condition.
- Tier 1 remains visible, presenting a concise summary: `[totalResults] results · [plannedKpis] planned KPIs`.
- Card height remains compact (~120px) with zero visual jumping.

---

## 7. Design Decisions (ADRs)

### RFR-DD-1: In-Memory KPI Extraction vs. New DB Query
- **Context:** The card needs the planned ToC KPI count for each Science Program in 2026.
- **Decision:** Extract `indicatorContributions.size` inside `calculateInitiativeProgress()`.
- **Rationale:** `calculateInitiativeProgress` already queries `_tocResultsRepository.getIndicatorContributions(initiativeCode, year)` for every program to calculate percentage progress. Reusing this data avoids issuing 10+ additional database roundtrips on landing page load.
- **Alternatives Rejected:** Running a new `COUNT(*)` query across ToC tables (adds unnecessary latency to the landing page).

### RFR-DD-2: Separate Metric Tiers vs. Single Text String
- **Context:** Nicoleta suggested `Breeding for Tomorrow: 454 planned KPIs; 208 results this phase (replicated from previous reporting phases); 0 new results`.
- **Decision:** Decompose this information into structured visual elements: Primary Metrics Row (total results + planned KPIs pill) and an Origin Breakdown Sub-row (replicated pill + new pill + info tooltip).
- **Rationale:** Plain unstructured sentences violate the PRMS card design system ([`docs/ux-ui/design.md`](../../ux-ui/design.md)), impair scannability across a grid of 9+ cards, and break responsiveness at 315px card width.

### RFR-DD-3: Strict Arithmetic Invariant
- **Context:** Total results must match the sum of its constituent breakdowns.
- **Decision:** Enforce `replicatedResults + newResults === totalResults` on both server and client.
- **Rationale:** If any result had an undefined or unexpected replication flag, it must be bucketed into `newResults` (falsy) rather than being omitted, preventing discrepancies where `replicated + new < total`.

---

## 8. Reversion Challenge Check

- **Reversions challenged:** **None.**
- The implementation does not remove, disable, or invert any delivered behavior. Existing fields (`totalResults`, `progress`, `statuses`), router links, and styles remain 100% intact.

---

## 9. Sizing & Budget (Tripwire)

- **Expected Tasks:** 3 tasks
  - Task 1: Server DTO extension & aggregation logic.
  - Task 2: Client interface & card component UI (template, styling, tooltips, compact view).
  - Task 3: Automated test suite (Jest tests on server and client).
- **Expected LOC:** ~120 LOC total (~45 LOC backend, ~75 LOC frontend).
- **Expected Review Rounds:** 1 round.

---

## 10. Open Gaps & Risks

| ID | Item | Resolution |
|---|---|---|
| `GAP-1` | Zero-target ToC indicators: does `plannedKpis` count all indicators or only those with `target > 0`? | Consistent with `bugfix/kpi-count-reconciliation`, `getIndicatorContributions` provides the committed indicator set for that phase/year. The badge tooltip clarifies: *"Planned KPIs committed in the Theory of Change for 2026"*. |
| `GAP-2` | Programs with 0 ToC indicators. | When `plannedKpis` is null, 0, or unavailable, the template displays `— planned KPIs` or hides the pill gracefully. |
