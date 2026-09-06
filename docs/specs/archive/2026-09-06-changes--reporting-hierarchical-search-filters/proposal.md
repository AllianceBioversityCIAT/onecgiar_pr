# Proposal — Deep Hierarchical Search, Result-Type Quick Filters & Reporting Navigation State Preservation

Transform the Result Framework Reporting view (`dashboard-lab`) into an anti-fatigue, frictionless reporting workflow:
1. **Deep Hierarchical Search with Auto-Expansion:** Search across Area of Work (AoW), High-Level Output / Outcome (HLO), and Indicator metadata, automatically expanding matching parent nodes and highlighting matching terms down to the indicator level.
2. **Fast Result-Type Filter Chips:** Instant toolbar filter pills (`All`, `Knowledge Product`, `Innovation Development`, `Policy Change`, `Capacity Sharing`, etc.) to narrow the reporting tree immediately without digging into sub-menus.
3. **Session & Navigation State Preservation:** Prevent reporting fatigue by preserving search query, active filters, expanded tree nodes, and scroll position when navigating to `result-detail` to fill a report and returning via "Back to results".

---

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/reporting-hierarchical-search-filters` |
| Slug | `reporting-hierarchical-search-filters` |
| Type | Change |
| Phase | Phase 1 of 3 (Phase 2: User Personalization / Pinned Focus; Phase 3: AI Reporting Copilot) |
| Approval Mode | gated |
| Depth | Standard |
| Owner | Results Reporting & UX/UI Core Team |
| Baseline | `US-S1` (`docs/prd.md`); Reporting Hub & Dashboard Lab (`docs/ux-ui/design.md` §4, §8); `W1`, `W5` (`docs/trd/trd.md`) |
| Related specs | `changes/report-result-form-ux`, `changes/result-detail-back-rail`, `changes/mass-reporting-flow`, `bugfix/smart-back-button` |

---

## 1. Intent

Reporting in PRMS during reporting cycles requires submitters to report across dozens of indicators (~30+ per Science Program/Initiative). The current user experience incurs significant cognitive and physical fatigue:
- Typing in the search box filters rows but leaves AoW and HLO parent cards collapsed (`ReportingAowTableComponent` defaults `isDefaultOpenAow()` and `isDefaultOpenHlo()` to `expandAll()` without reacting to `search()`), forcing users to manually click open multiple levels to find their target indicator.
- There is no instant, one-click way to see "Only indicators accepting Knowledge Products" or "Only Innovation Development indicators" directly from the top toolbar.
- When a submitter reports a result, the application navigates to `/result/result-detail/:code/general-information`. When they finish and click "Back to results" (or browser back), the reporting page resets all state (`plannedSearch` is cleared, expanded AoWs are reset, and the user is scrolled back to the top), forcing them to re-type their search query and re-expand the tree 30 times in a row.

Phase 1 eliminates this friction by delivering an intelligent, deep-expanding search with match highlighting, 1-click typology quick-filter chips, and persistent navigation state between the reporting tree and result detail.

---

## 2. Problem / Current Behavior

1. **No Auto-Expansion on Search:**
   - In `ReportingAowTableComponent` (`dashboard-lab.component.html:1543`), `isDefaultOpenAow()` and `isDefaultOpenHlo()` only check `this.expandAll()`.
   - When a user types a search query (e.g. `"climate"`, `"training"`, `"IRRI"`), child rows are filtered in memory, but matching AoW cards and HLO accordions remain collapsed. Users must manually expand each card to see if it contains matching indicators.
2. **Missing Keyword Highlighting:**
   - There is no visual highlight (`<mark>` or accent badge) on matching text tokens in the indicator description, HLO title, or Center badge, making it hard to scan why a row matched.
3. **No 1-Click Typology Quick-Filter Pills:**
   - Users who have a batch of Knowledge Products or Innovation Developments to report must either browse all indicators or navigate through a multi-select popover. A prominent, single-click row of type filter chips (`All`, `Knowledge Product`, `Innovation Development`, `Policy Change`, etc.) is missing.
4. **State Annihilation on Route Transitions:**
   - Navigation to `result-detail`: `lab-report-form.component.ts:731` navigates to `/result/result-detail/${code}/general-information?phase=${phase}`.
   - `SmartNavigationService` does not register the Reporting route (`/result-framework-reporting/entity-details/:code?tocView=aows`) as a `isKnownResultDetailOrigin`, which can cause "Back to results" to route to the Results Center catalog instead of back to the user's reporting tree.
   - Even when returning to Reporting, `DashboardLabComponent` lifecycle resets `plannedSearch` to `''`, clears expanded sets, and loses scroll position, forcing submitters into repetitive searching for every single report.

---

## 3. Proposed Outcome

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ REPORTING CONTROLS TOOLBAR                                                                            │
│                                                                                                        │
│  [ 🔍 Search AoW, outcome, or indicator... (e.g. "climate")  (x) ]  [ 12 indicators matched ]          │
│                                                                                                        │
│  FILTER BY TYPE:                                                                                       │
│  [ All (48) ]  [ Knowledge Product (14) ]  [ Innovation Dev (8) ]  [ Policy Change (6) ] [ More ▾ ]   │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘

▼ Tree Auto-Expands to Matching Indicators:
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ▾ [AOW01] Climate-Resilient Agriculture                                              4 of 8 KPIs (50%) │
│   ───────────────────────────────────────────────────────────────────────────────────────────────────  │
│   ▾ [HLO 1.1] Climate adaptation technologies validated                                                │
│     ┌──────────────────────────────────────────────────────────────────────────────────────────────┐   │
│     │ Number of <mark>climate</mark>-resilient crop varieties released by NARS partners            │   │
│     │ [Knowledge Product] [IRRI]  Target: 5  Achieved: 2                               [ Report ]  │   │
│     └──────────────────────────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘

Workflow Navigation Preservation:
1. Click [ Report ] on Indicator #142
   ──► Enters Result Detail #9008
2. Submitter edits or reviews
3. Clicks [ ← Back to results ] in sidebar rail
   ──► Returns EXACTLY to:
       - Search: "climate" preserved
       - Filter Chip: [ Knowledge Product ] preserved
       - AoW [AOW01] and HLO [1.1] stay auto-expanded
       - Viewport smoothly scrolls to or keeps Indicator #142 in view with brief highlight!
```

---

## 4. Scope

### In Scope (Phase 1)
- **Deep Hierarchical Search & Auto-Expansion:**
  - Update `ReportingAowTableComponent` to automatically expand AoW cards and HLO sub-groups whenever a query matches their children.
  - Update `dashboard-lab.component.ts` so `plannedSearch` triggers complete ToC prefetching or lazy evaluation when searching across all AoWs.
  - Add text match highlighting (`<mark>` styling matching PRMS design tokens `--pr-color-primary-100` / `--pr-color-primary-400`) in indicator descriptions and headers.
  - Display a live match count badge (e.g. `12 matching indicators`) in or beside the search input.
- **Result-Type Quick Filter Chips:**
  - Add horizontal filter chips directly below or within `reporting-program-band.component.html`:
    - `All`, `Knowledge Product`, `Innovation Development`, `Policy Change`, `Capacity Sharing`, etc., with badge counts of planned indicators per type.
- **Reporting Navigation State Preservation:**
  - Register the Reporting view (`/result-framework-reporting/entity-details/:code`) in `SmartNavigationService` as a first-class origin with query parameter retention (`?tocView=aows&search=...&type=...`).
  - Update `DashboardLabComponent` to synchronize `plannedSearch` and active quick-type filter to URL query params or session cache.
  - Restore the expanded AoW / HLO state and retain target row anchor (`#indicator-:id`) when returning from `result-detail`.

### Out of Scope (Saved for Phases 2 & 3)
- **Phase 2:** User Personalization (Pinned / Favorite Indicators & AoWs, persistent "My Focus View" saved in backend user preferences or local profile).
- **Phase 3:** AI Reporting Copilot (Natural language search, semantic recommendations, auto-suggesting indicators based on publication abstract or title).

---

## 5. Non-Goals

- Changing the reporting data model or backend database schemas.
- Altering the Result Detail form sections (`general-information`, `contributors-and-partners`, etc.).
- Modifying non-reporting tabs (Overview, Results, Notifications) beyond general routing origin compatibility.

---

## 6. Affected Users, Systems, And Specs

| Persona / Area | Impact |
|---|---|
| **Result Submitter** | Vastly reduced reporting fatigue; can complete 30+ reports consecutively without re-searching or losing their place. |
| **QA Reviewer** | Quick inspection of specific result types (e.g. reviewing only Policy Change indicators across the program). |
| **Client Codebase** | `dashboard-lab`, `reporting-program-band`, `reporting-aow-table`, `smart-navigation.service`. |

---

## 7. Visual Reference

- **Source:** User provided screenshots in chat session:
  - User Mockup: Intelligent search bar with filter chips and auto-expanded hierarchical indicators.
  - Live Reference: Reporting view in Science Programs (`/result-framework-reporting/entity-details/:code?tocView=aows`).
- **Design Tokens:** Follows `docs/ux-ui/design.md` §7 & §8:
  - Match highlight: `bg-violet-100 text-violet-900 font-semibold rounded px-0.5`.
  - Filter chips: `app-pr-chip` or rounded pill buttons (`rounded-full border text-[12px] font-medium px-3 py-1`).

---

## 8. Requirement Delta Preview

### ADDED Requirements
- **R-SEARCH-AUTOEXPAND:** When `plannedSearch` is non-empty, all AoW cards and HLO groups containing matching indicators MUST auto-expand.
- **R-SEARCH-HIGHLIGHT:** All occurrences of query tokens inside indicator descriptions and group titles MUST be highlighted visually with accessible contrast.
- **R-QUICK-FILTER-CHIPS:** The reporting toolbar MUST display fast-filter pills for top Result Types with live KPI counts.
- **R-STATE-PRESERVATION:** Navigating from an indicator in the Reporting view to `result-detail` and clicking "Back to results" MUST restore the active search query, active type filter, expanded tree state, and scroll position.

### MODIFIED Requirements
- **M-SMART-NAV-ORIGIN:** `SmartNavigationService` MUST include the Reporting tab (`/result-framework-reporting/entity-details/:code`) in `isKnownResultDetailOrigin` and persist its active query params.
- **M-TABLE-DEFAULT-OPEN:** `ReportingAowTableComponent.isDefaultOpenAow()` and `isDefaultOpenHlo()` MUST return `true` when a search query or quick filter matches their child indicators.

---

## 9. Approach Options

### Option A: Pure URL Query Parameters (Recommended)
Sync `search`, `type`, and `lastKpi` directly into the route query parameters (e.g. `?tocView=aows&q=climate&type=kp&kpi=142`).
- **Pros:** Native browser back/forward support, shareable links with pre-filtered state, automatically preserved by `SmartNavigationService` and Angular router without cross-component cache invalidation issues.
- **Cons:** Slight URL length increase.

### Option B: Ephemeral Session Storage / Service State Only
Store search and tree state exclusively in a client service (`ReportingStateService`) or `sessionStorage`.
- **Pros:** Clean URLs.
- **Cons:** Breaks bookmarking, breaks browser back/forward across new tabs, difficult to test deterministically.

---

## 10. Recommended Approach

**Option A (Pure URL Query Parameters + SmartNavigationService Integration)**:
- Standardize reporting state on URL query parameters (`search`, `type`, `kpi`).
- Enhance `SmartNavigationService` to recognize reporting tab URLs and preserve complete query parameters on round-trip navigation from `result-detail`.
- Add auto-expansion logic in `ReportingAowTableComponent` driven by `search()` and `visibleRows()`.
- Introduce a lightweight highlighting pipe or template renderer for search hits.
- Add quick filter chips directly to `ReportingProgramBandComponent`.

---

## 11. Risks, Dependencies, And Open Questions

- **Risk 1 (Performance with large ToC trees):** Auto-expanding multiple AoWs on single-character queries.
  - *Mitigation:* Require minimum 2 characters before auto-expanding, or debounce search input by 150ms.
- **Risk 2 (Lazy-loaded ToCs):** AoWs that haven't had their ToC loaded yet cannot be searched in the client unless fetched.
  - *Mitigation:* `loadAllTocs()` should be invoked when a search query is entered, ensuring all AoW indicator trees are populated.

---

## 12. Success Criteria

1. Typing a term like `"climate"` or `"IRRI"` immediately opens the relevant AoW cards and HLO groups without manual clicking.
2. Search terms are clearly highlighted in matching indicator descriptions.
3. Clicking "Knowledge Product" immediately filters the reporting tree to only show Knowledge Product indicators, with count indicators displayed on chips.
4. Reporting a result, navigating to `result-detail`, and clicking "Back to results" returns the user to the exact same filtered, expanded tree and scrolls back to the reported indicator row.
5. All existing Jest and Cypress test suites in `dashboard-lab`, `reporting-aow-table`, and `smart-navigation.service` pass.

---

## 13. Next Step

Upon approval of this proposal, proceed to:

```text
/akili-specify changes/reporting-hierarchical-search-filters
```
