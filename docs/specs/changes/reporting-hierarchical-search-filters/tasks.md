# Tasks — Deep Hierarchical Search, Result-Type Quick Filters & Reporting Navigation State Preservation

Implementation task breakdown for Phase 1 of the PRMS Result Framework Reporting enhancement.

---

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/reporting-hierarchical-search-filters` |
| Short Prefix | `RHSF` |
| Type | Change |
| Phase | Phase 1 of 3 |
| Approval Mode | gated |
| Depth | Standard |
| Owner | Results Reporting & UX/UI Core Team |
| Requirements Ref | [`requirements.md`](./requirements.md) (`RHSF-R-1` .. `RHSF-R-6`) |
| Design Ref | [`design.md`](./design.md) (`RHSF-DD-1` .. `RHSF-DD-4`) |
| Judgment Day Ref | [`judgment.md`](./judgment.md) (JD-01 .. JD-05 resolved) |

---

## 1. Pre-Flight Checklist

- [x] `requirements.md` is approved with defect classes and verification mapping.
- [x] `design.md` is approved and audited via Judgment Day blind dual review.
- [x] All 5 confirmed Judgment Day findings (`JD-01` to `JD-05`) are addressed.
- [x] No server migration required; changes strictly contained in `onecgiar-pr-client`.
- [x] Concurrent workspace changes in `my-work-board` left untouched.

---

## 2. Task List

### `RHSF-T-1` — Token-Safe Highlighting & HTML Sanitization in Search Utility
- **Type:** `client | tests`
- **Estimate:** `S` (≤ 0.5d)
- **Status:** `[ ]`
- **Depends on:** `—`
- **Blocks:** `RHSF-T-2`
- **Skills:** `angular-developer`
- **Description:**
  Update `highlightPlannedSearch` in `planned-search.util.ts`:
  1. Wrap matching tokens in `<mark class="bg-violet-100 text-violet-900 font-semibold rounded px-0.5">` instead of the legacy `.planned-search-hit` class.
  2. Preserve strict entity-safe character slicing to prevent HTML corruption on strings with `&`, `<`, `>`.
  3. Ensure regex special characters (`(`, `)`, `+`, `?`, `*`, `[`, `]`) in user queries are safely escaped and do not cause syntax errors.
  4. Remove obsolete `.planned-search-hit` style overrides from `dashboard-lab.component.scss`.
- **Implements:** `RHSF-R-2`, `RHSF-AC-3`, `RHSF-AC-4`
- **Design Ref:** `design.md` §4.3, `RHSF-DD-4`, `JD-02`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/pipes/planned-search.util.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/pipes/planned-search.util.spec.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.scss`
- **Verification Command:**
  `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/pipes/planned-search.util.spec.ts --silent --reporters=summary --no-coverage`
- **Definition of Done:**
  - [ ] `highlightPlannedSearch` produces Tailwind mark classes with WCAG AA contrast.
  - [ ] Unit tests verify regex escaping, special characters, and HTML entity preservation.
  - [ ] Jest test suite passes 100%.

---

### `RHSF-T-2` — Dynamic Hierarchical Auto-Expansion & Scoped Overrides in Reporting Table
- **Type:** `client | tests`
- **Estimate:** `M` (≤ 1d)
- **Status:** `[ ]`
- **Depends on:** `RHSF-T-1`
- **Blocks:** `RHSF-T-3`, `RHSF-T-5`
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Description:**
  In `ReportingAowTableComponent` (`reporting-aow-table.component.ts` & `.html`):
  1. Update `isDefaultOpenAow(code)` and `isDefaultOpenHlo(key)`: when `search()` or `typeFilter()` is active, return `true` if that card/group contains matching visible rows.
  2. In `overrides` linkedSignal source, include `this.search().trim()` so manual node clicks made during search do not permanently pollute post-search baseline.
  3. Wire `highlightPlannedSearch` into indicator descriptions, HLO titles, and metadata tags in the table template.
  4. Ensure cards/groups with 0 matching rows remain collapsed and filtered out cleanly.
- **Implements:** `RHSF-R-1`, `RHSF-R-2`, `RHSF-AC-1`, `RHSF-AC-2`, `RHSF-AC-3`
- **Design Ref:** `design.md` §4.3, `RHSF-DD-2`, `JD-02`, `JD-03`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.spec.ts`
- **Verification Command:**
  `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.spec.ts --silent --reporters=summary --no-coverage`
- **Definition of Done:**
  - [ ] Typing query auto-expands parent AoW cards and HLO sub-groups containing matching indicators.
  - [ ] Clearing search flushes overrides and restores default collapsed state.
  - [ ] Highlights render safely with `<mark>` elements in indicator rows.
  - [ ] Jest test suite passes with new auto-expansion assertions.

---

### `RHSF-T-3` — Result-Type Quick Filter Chips & Live Match Counter in Program Band
- **Type:** `client | tests`
- **Estimate:** `M` (≤ 1d)
- **Status:** `[ ]`
- **Depends on:** `RHSF-T-2`
- **Blocks:** `RHSF-T-5`
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Description:**
  In `ReportingProgramBandComponent` (`reporting-program-band.component.ts` & `.html`):
  1. Add a horizontal quick-filter chip strip beneath the search bar:
     `All`, `Knowledge Product`, `Innovation Development`, `Policy Change`, `Innovation Use`, `Capacity Sharing`.
  2. Compute live KPI counts for each chip based on the loaded ToC indicators.
  3. Bind quick chips directly to the `plannedTypeFilter` signal (synced with the existing dropdown). Clicking an active chip or `All` clears the filter.
  4. Add a live search match feedback badge next to the search input (`{{ matchCount() }} found`).
  5. Add debounce (150ms) to `searchChange` emission.
- **Implements:** `RHSF-R-3`, `RHSF-R-4`, `RHSF-AC-5`, `RHSF-AC-6`
- **Design Ref:** `design.md` §4.2, `RHSF-DD-3`, `JD-04`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band/reporting-program-band.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band/reporting-program-band.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band/reporting-program-band.component.scss`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band/reporting-program-band.component.spec.ts`
- **Verification Command:**
  `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band/reporting-program-band.component.spec.ts --silent --reporters=summary --no-coverage`
- **Definition of Done:**
  - [ ] Filter chips render with correct counts and active toggle states.
  - [ ] Selecting chip updates `plannedTypeFilter` and table rows reactively.
  - [ ] Match counter updates in real time with clear button.
  - [ ] Unit tests cover chip clicks, counts, and search debounce.

---

### `RHSF-T-4` — SmartNavigationService Reporting Tab Origin & Query Parameter Retention
- **Type:** `client | tests`
- **Estimate:** `S` (≤ 0.5d)
- **Status:** `[ ]`
- **Depends on:** `—`
- **Blocks:** `RHSF-T-5`
- **Skills:** `angular-developer`
- **Description:**
  In `SmartNavigationService` (`smart-navigation.service.ts`):
  1. Define `isReportingTab(url: string): boolean` matching `/result-framework-reporting/entity-details/:code` while excluding sibling `/overview`, `/results`, and `/my-work` routes.
  2. Include `isReportingTab` in `isKnownResultDetailOrigin(url)`.
  3. In `persistKnownOrigin(url)` and `getResultDetailBackTarget()`, preserve the full sanitized URL including query parameters (`?tocView=aows&q=...&typ=...&kpi=...`).
  4. Ensure "Back to results" in `result-detail` routes back to the exact Reporting URL.
- **Implements:** `RHSF-R-5`, `RHSF-AC-7`, `RHSF-AC-8`
- **Design Ref:** `design.md` §4.1, `RHSF-DD-1`
- **Files:**
  - `onecgiar-pr-client/src/app/shared/services/smart-navigation.service.ts`
  - `onecgiar-pr-client/src/app/shared/services/smart-navigation.service.spec.ts`
- **Verification Command:**
  `npx jest src/app/shared/services/smart-navigation.service.spec.ts --silent --reporters=summary --no-coverage`
- **Definition of Done:**
  - [ ] Reporting tab is recognized as a known `result-detail` origin.
  - [ ] Query parameters are preserved without truncation.
  - [ ] Unit tests pass for direct navigation and round-trip exit from `result-detail`.

---

### `RHSF-T-5` — DashboardLab URL State Synchronization, Focus Recovery & Empty State
- **Type:** `client | tests`
- **Estimate:** `M` (≤ 1d)
- **Status:** `[ ]`
- **Depends on:** `RHSF-T-3`, `RHSF-T-4`
- **Blocks:** `—`
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Description:**
  In `DashboardLabComponent` (`dashboard-lab.component.ts` & `.html`):
  1. Remove `aow` prerequisite from URL sync effect (lines 1345-1368) so `q` and `typ` synchronize when `tocView === 'aows'`. Wrap navigation in `untracked()` with `replaceUrl: true`.
  2. In router listener / `ngOnInit`, read query params (`q`, `typ`, `kpi`) with strict inequality guards (`if (q !== this.plannedSearch())`) to prevent reactive loops.
  3. In search input handler: call `loadAllTocs()` if any AoW ToC is not loaded.
  4. On return with `?kpi=<id>`: resolve target indicator element, trigger smooth `scrollIntoView()`, and apply transient 1500ms `animate-focus-flash` ring.
  5. In template: update empty state for 0 matches to display `"No indicators match your search '{{ plannedSearch() }}'"` with an inline "Clear search" CTA button.
- **Implements:** `RHSF-R-1`, `RHSF-R-3`, `RHSF-R-5`, `RHSF-R-6`, `RHSF-AC-1`, `RHSF-AC-5`, `RHSF-AC-8`, `RHSF-AC-9`
- **Design Ref:** `design.md` §4.4, `RHSF-DD-1`, `JD-01`, `JD-05`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.scss`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.spec.ts`
- **Verification Command:**
  `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.spec.ts --silent --reporters=summary --no-coverage`
- **Definition of Done:**
  - [ ] `tocView=aows` synchronizes `q` and `typ` with URL without infinite loops.
  - [ ] Returning from `result-detail` restores query, filters, and target KPI scroll position with transient highlight.
  - [ ] Zero-matches empty state renders dynamic query and "Clear search" button.
  - [ ] Jest integration suite passes 100%.

---

## 3. Dependency Graph

```text
RHSF-T-1 (Highlighting Utility)
   └── RHSF-T-2 (Reporting Table Auto-Expansion & Highlighting)
         ├── RHSF-T-3 (Quick Filter Band & Match Counter)
         └── RHSF-T-4 (SmartNavigationService Origin & Query Retention)
               └── RHSF-T-5 (DashboardLab URL Sync, Focus Recovery & Empty State)
```

---

## 4. Acceptance Criteria Traceability Matrix

| Requirement | Scenario / Clause | Covering Task | Verification Test |
|---|---|---|---|
| `RHSF-R-1` | Typing >= 2 chars auto-expands parent AoWs and HLOs | `RHSF-T-2` | `reporting-aow-table.component.spec.ts` |
| `RHSF-R-1` | Clearing search reverts expansion to clean baseline | `RHSF-T-2` | `reporting-aow-table.component.spec.ts` |
| `RHSF-R-1` | `loadAllTocs()` called when searching | `RHSF-T-5` | `dashboard-lab.component.spec.ts` |
| `RHSF-R-2` | Keyword match wrapped in `<mark>` with violet classes | `RHSF-T-1`, `RHSF-T-2` | `planned-search.util.spec.ts` |
| `RHSF-R-2` | Regex special characters safely escaped without syntax errors | `RHSF-T-1` | `planned-search.util.spec.ts` |
| `RHSF-R-3` | Live count of matching indicators displayed | `RHSF-T-3` | `reporting-program-band.component.spec.ts` |
| `RHSF-R-3` | Dynamic 0-results empty state with "Clear search" CTA | `RHSF-T-5` | `dashboard-lab.component.spec.ts` |
| `RHSF-R-4` | 1-click quick-filter chips for top typologies with counts | `RHSF-T-3` | `reporting-program-band.component.spec.ts` |
| `RHSF-R-4` | Chip selection syncs with `plannedTypeFilter` | `RHSF-T-3` | `reporting-program-band.component.spec.ts` |
| `RHSF-R-5` | `SmartNavigationService` tracks Reporting tab origin | `RHSF-T-4` | `smart-navigation.service.spec.ts` |
| `RHSF-R-5` | "Back to results" in result-detail preserves query params | `RHSF-T-4`, `RHSF-T-5` | `smart-navigation.service.spec.ts` |
| `RHSF-R-5` | DashboardLab restores `q`, `typ`, and `kpi` on hydration | `RHSF-T-5` | `dashboard-lab.component.spec.ts` |
| `RHSF-R-6` | Smooth scroll to target indicator row on return | `RHSF-T-5` | `dashboard-lab.component.spec.ts` |
| `RHSF-R-6` | Transient 1500ms focus flash ring on returning row | `RHSF-T-5` | `dashboard-lab.component.spec.ts` |
