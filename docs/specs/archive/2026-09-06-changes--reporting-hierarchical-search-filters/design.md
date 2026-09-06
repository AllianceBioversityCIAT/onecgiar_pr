# Design — Deep Hierarchical Search, Result-Type Quick Filters & Reporting Navigation State Preservation

Design specification for Phase 1 of the PRMS Result Framework Reporting enhancement: deep hierarchical search with automatic parent expansion, keyword match highlighting, 1-click typology filter chips, and round-trip navigation state preservation.

---

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/reporting-hierarchical-search-filters` |
| Short Prefix | `RHSF` |
| Type | Change |
| Phase | Phase 1 of 3 (Phase 2: User Personalization / Pinned Focus; Phase 3: AI Reporting Copilot) |
| Approval Mode | gated |
| Depth | Standard |
| Owner | Results Reporting & UX/UI Core Team |
| Requirements Ref | [`requirements.md`](./requirements.md) (`RHSF-R-1` .. `RHSF-R-6`) |
| Judgment Day Ref | [`judgment.md`](./judgment.md) (JD-01 through JD-05 resolved) |
| Baseline | `US-S1` (`docs/prd.md`); Reporting Hub & Dashboard Lab (`docs/ux-ui/design.md` §4, §8); `W1`, `W5` (`docs/trd/trd.md`) |
| Related specs | `changes/report-result-form-ux`, `changes/result-detail-back-rail`, `changes/mass-reporting-flow`, `bugfix/smart-back-button` |

---

## 1. Executive Summary

This design resolves user reporting fatigue by establishing an intelligent, state-preserving presentation layer on the Result Framework Reporting dashboard (`dashboard-lab`).

The solution spans three synchronized layers:
1. **Dynamic Hierarchical Disclosure & Search-Scoped Overrides:** Modifies `ReportingAowTableComponent` to derive default disclosure state from search and typology matches, instantly expanding matching AoW and HLO parent nodes. The `overrides` linkedSignal is keyed to the active search term to guarantee clean baseline recovery upon clearing search.
2. **Unified Typology Quick-Filter Band:** Adds a horizontal filter chip row to `ReportingProgramBandComponent` with live KPI counts per result type. Chips bind directly to `plannedTypeFilter`, ensuring full synchronization with the existing multi-select dropdown.
3. **Loop-Safe URL State & Round-Trip Navigation:** Promotes the Science Program Reporting view to a first-class origin in `SmartNavigationService`, enabling query parameters (`?q=...&typ=...&kpi=...`) in `tocView=aows` with strict equality guards and `untracked()` to eliminate infinite loops. Returning from `result-detail` seamlessly restores query, filter chip, expanded cards, and indicator row scroll focus.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system
- **Server:** No changes required. Uses existing ToC and indicator APIs (`GET_TocResultsByAowId`, `GET_AllTocResultsByInitiativeId`).
- **Client Components & Services:**
  - `onecgiar-pr-client/src/app/shared/services/smart-navigation.service.ts`: Recognize Reporting tab URL as a known `result-detail` origin and retain full query string.
  - `.../dashboard-lab/components/reporting-program-band/`: Search feedback counter, debounce, and Result-Type filter chips bound to `plannedTypeFilter`.
  - `.../dashboard-lab/dashboard-lab.component.ts` & `.html`: Loop-safe query param synchronization, ToC prefetching on search, empty-state CTA, and target KPI scroll recovery.
  - `.../dashboard-lab/components/reporting-aow-table/`: Auto-expansion of matching cards and search-scoped overrides.
  - `.../dashboard-lab/pipes/planned-search.util.ts`: Token evaluation and HTML-entity-safe text highlighting via existing `highlightPlannedSearch` utility.

### 2.2 Navigation and State Interaction Sequence

```text
[ Submit User in Reporting View ]
   │
   ├── 1. Types "climate" in Search Input
   │     └── Debounced (150ms) -> updates `plannedSearch` signal
   │     └── `dashboard-lab` calls `loadAllTocs()` if not loaded
   │     └── Updates URL `?tocView=aows&q=climate` (replaceUrl: true, untracked)
   │
   ├── 2. Clicks [ Knowledge Product (14) ] Quick Chip
   │     └── Toggles item in `plannedTypeFilter` signal (synced with dropdown)
   │     └── Updates URL `?tocView=aows&q=climate&typ=Knowledge%20Product`
   │     └── `ReportingAowTableComponent` recalculates `visibleRows()`
   │     └── Auto-expands matching [AOW01] and [HLO 1.1]
   │     └── Safely highlights "<mark>climate</mark>" in descriptions
   │
   ├── 3. Clicks [ Report ] on Indicator #142
   │     └── Navigates to `/result/result-detail/9008/general-information`
   │     └── `SmartNavigationService` records origin:
   │           `/result-framework-reporting/entity-details/SP02?tocView=aows&q=climate&typ=Knowledge%20Product&kpi=142`
   │
   ├── 4. Submitter edits and clicks [ ← Back to results ] in sidebar rail
   │     └── `SmartNavigationService.getResultDetailBackTarget()` returns stored origin URL
   │     └── Router returns to Reporting with query params
   │
   └── 5. Reporting Page Restores State
         ├── Router listener checks `if (paramVal !== signalVal)` before hydrating
         ├── Restores `q=climate` in search input
         ├── Restores `typ=Knowledge Product` active chip
         ├── Re-evaluates matches and re-expands [AOW01] and [HLO 1.1]
         └── Smoothly scrolls to Indicator #142 and flashes transient focus ring (1500ms)
```

---

## 3. Data Model & State Contracts

### 3.1 URL Query Parameters Contract

| Parameter | Type | Default | Description |
|---|---|---|---|
| `tocView` | string | `'aows'` | Active browse view (`'aows'`, `'byAow'`, `'indicators'`). |
| `q` | string | `null` | Active search query (omitted when empty). |
| `typ` | string | `null` | Active Result-Type quick filter name (omitted when `'all'`). |
| `kpi` | string | `null` | Target indicator ID for scroll anchoring and focus flash upon return. |

### 3.2 Quick Filter Chip Model

```typescript
export interface ResultTypeQuickChip {
  id: string;
  name: string;
  count: number;
  active: boolean;
}
```

Top typologies displayed:
1. `All` (Total planned indicators)
2. `Knowledge Product` (`ResultTypeEnum.KNOWLEDGE_PRODUCT = 6`)
3. `Innovation Development` (`ResultTypeEnum.INNOVATION_DEVELOPMENT = 7`)
4. `Policy Change` (`ResultTypeEnum.POLICY_CHANGE = 1`)
5. `Innovation Use` (`ResultTypeEnum.INNOVATION_USE = 2`)
6. `Capacity Sharing` (`ResultTypeEnum.CAPACITY_SHARING = 5`)
7. `Other` (Dropdown or overflow for remaining types)

---

## 4. Frontend Component Architecture

### 4.1 `SmartNavigationService` Extension
- Define `isReportingTab(url: string): boolean`:
  Evaluates `/\/result-framework-reporting\/entity-details\/[^/?#]+(?:\?|$)/.test(url)` while excluding sibling tabs that already have their own rules (`/overview`, `/results`, `/my-work`).
- Update `isKnownResultDetailOrigin(url: string)`:
  Includes `isReportingTab(url)` alongside `isProgrammeResultsTab`, `isMyResultsTab`, and `isResultsCenterList`.
- Store the sanitized full URL in `sessionStorage` under `RESULT_DETAIL_ORIGIN_STORAGE_KEY` so query parameters (`q`, `typ`, `kpi`) persist across full route changes.

### 4.2 `ReportingProgramBandComponent` Enhancements
- **Search Feedback:**
  Adjacent to the search input, display a compact match badge:
  `{{ matchCount() }} found` when search is active.
- **Quick-Filter Strip (Unified with `plannedTypeFilter` - JD-04):**
  A horizontal flex container beneath the toolbar:
  - Container: `flex items-center gap-1.5 py-1 overflow-x-auto custom_scroll`
  - Chip Buttons:
    - Base: `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium transition-all border cursor-pointer`
    - Inactive: `bg-[var(--pr-surface-card)] border-[var(--pr-border)] text-[var(--pr-text-secondary)] hover:border-[var(--pr-color-primary-300)]`
    - Active: `bg-[var(--pr-color-primary-400)] border-[var(--pr-color-primary-400)] text-white shadow-xs font-semibold`
    - Count badge inside chip: `text-[10.5px] px-1.5 py-0.2 rounded-full` (white/translucent when active, neutral soft when inactive).
  - Clicking a chip directly updates `plannedTypeFilter.set([{ name: chip.name }])` (or empty if `All` or re-clicked), keeping the quick chips and the advanced dropdown 100% in sync.

### 4.3 `ReportingAowTableComponent` Auto-Expansion & Safe Highlighting
- **Auto-Expansion Resolution (JD-03):**
  Modify `isOpen(key: string, defaultOpen = false)`:
  - If a user has an explicit manual override in `overrides()`, honor the override.
  - If no override exists:
    - If `search()` or `typeFilter()` is active:
      - For an AoW key `aow::<code`: return `true` if `visibleRows(group).length > 0`.
      - For an HLO key `<prefix>::<title>`: return `true` if any row in that group matches `visibleRows(group)`.
    - Otherwise, return `defaultOpen` (which defaults to `this.expandAll()`).
- **Search-Scoped Overrides Reset (JD-02):**
  Key `overrides` linkedSignal source to the search query:
  `${this.scopeKey()}::${this.expandAll()}::${this.expandAllNonce()}::${this.search().trim()}`
  When the user clears search, `overrides()` flushes automatically, restoring the baseline without lingering search-time manual states.
- **Safe Keyword Highlighting (JD-02):**
  Reuse and extend the existing `highlightPlannedSearch` in `planned-search.util.ts`:
  - Preserve its entity-safe character slicing (which avoids XSS and entity corruption like `&amp;`).
  - Update the injected markup from legacy `.planned-search-hit` to:
    `<mark class="bg-violet-100 text-violet-900 font-semibold rounded px-0.5">`
  - Remove redundant/conflicting `.planned-search-hit` style overrides from `dashboard-lab.component.scss`.

### 4.4 `DashboardLabComponent` Query Sync & Focus Recovery
- **Loop-Safe URL Synchronization (JD-01):**
  - In `dashboard-lab.component.ts:1345-1368`:
    Remove the `aow` prerequisite for `q` and `typ`. Enable syncing when `tocView === 'aows'` as well as `'byAow'`.
  - In the URL navigation effect:
    Wrap reads of route query parameters and execution of `router.navigate` inside `untracked()`, with `replaceUrl: true`.
  - In the router listener / `ngOnInit`:
    Only call `this.plannedSearch.set(q)` or `this.plannedTypeFilter.set(...)` if the incoming parameter string differs from the current signal value:
    `if (q !== this.plannedSearch()) this.plannedSearch.set(q ?? '');`
    This strictly prevents infinite update ping-pong.
- **Empty State Polish (JD-05):**
  In `dashboard-lab.component.html:1531`, when `!plannedFilteredAows().length && plannedSearchActive()`:
  Render:
  `"No indicators match your search '{{ plannedSearch() }}'"`
  Include an action button:
  `<button (click)="clearPlannedFilters()" class="ml-2 text-[var(--pr-color-primary-400)] underline font-semibold">Clear search</button>`
- **Scroll & Focus Anchor:**
  Once groups and ToC render:
  - Locate `document.getElementById('indicator-row-' + pendingKpi())`.
  - Execute `scrollIntoView({ behavior: 'smooth', block: 'center' })`.
  - Apply transient class `animate-focus-flash` (1500ms duration) and clear `pendingKpi()`.

---

## 5. Design Decisions (ADRs)

### `RHSF-DD-1` — Loop-Safe URL Query Parameters over Ephemeral Service State
- **Context:** Preserving search, filters, and scroll target without creating router/signal infinite loops.
- **Decision:** Store `q`, `typ`, and `kpi` in URL query parameters with strict deep equality checks on hydration and `untracked()` on URL synchronization effects.
- **Alternatives Considered:**
  1. *Unconditional effect writing:* Caused router infinite loop during tab transitions.
  2. *InMemory Service (`ReportingStateService`):* Lost on browser refresh, breaks browser history.
- **Consequences:** URLs are clean and shareable; browser back/forward works natively; zero infinite loop risk.

### `RHSF-DD-2` — Dynamic Auto-Expansion with Search-Scoped Overrides
- **Context:** Auto-opening parent AoW cards and HLO accordions during active search while ensuring clearing search cleanly restores baseline.
- **Decision:** Auto-expansion resolves in `isDefaultOpenAow()` / `isDefaultOpenHlo()` when filters are active, while `overrides` linkedSignal includes `this.search().trim()` in its source key to flush search-time overrides upon query clearing.
- **Alternatives Considered:**
  1. *Persistent overrides without search key:* Leaked search clicks into the post-search reading state (JD-02).
  2. *Imperatively mutating all nodes on keystroke:* Degraded typing latency and corrupted user layout preferences.
- **Consequences:** Instant, automatic expansion when searching; 100% clean recovery when clearing.

### `RHSF-DD-3` — Single-Source Typology Filtering (Chips + Dropdown)
- **Context:** Providing 1-click filter chips without conflicting with the existing typology multi-select.
- **Decision:** Quick filter chips and the dropdown bind to the exact same signal `plannedTypeFilter`. Selecting a quick chip updates the dropdown, and clearing in the dropdown updates the quick chip.
- **Alternatives Considered:**
  1. *Separate `selectedQuickType` signal:* Created contradictory filter combinations (0 matches) (JD-04).
  2. *Hiding quick filters in dropdown:* Preserved original user fatigue.
- **Consequences:** Frictionless 1-click filtering for dominant types with zero state conflict.

### `RHSF-DD-4` — Entity-Safe Highlighting via Existing Utility
- **Context:** Keyword highlighting without XSS vulnerabilities or HTML entity corruption.
- **Decision:** Reuse and adapt `highlightPlannedSearch` from `planned-search.util.ts`, replacing the class with PRMS Tailwind tokens `bg-violet-100 text-violet-900 font-semibold rounded px-0.5`.
- **Alternatives Considered:**
  1. *New regex pipe with string replacement:* Severe risk of XSS and entity mangling on strings with `&` (JD-02).
- **Consequences:** Maximum code reuse, zero security vulnerability, perfect token alignment.

---

## 6. Sizing & Tripwire Budget

- **Expected Tasks:** 5 atomic tasks (`RHSF-T-1` through `RHSF-T-5`).
- **Expected LOC:** ~380 LOC (TypeScript + HTML + SCSS).
- **Expected Review Rounds:** 1 round.
- **Depth Match:** Standard depth matches expected implementation scope.

---

## 7. Testing Strategy

1. **Unit Tests (`SmartNavigationService`):**
   - Assert `isKnownResultDetailOrigin` returns `true` for `/result-framework-reporting/entity-details/SP02?tocView=aows`.
   - Assert `getResultDetailBackTarget` returns full reporting URL with query parameters (`?tocView=aows&q=rice&typ=kp&kpi=101`).
2. **Unit Tests (`ReportingAowTableComponent`):**
   - Assert `isDefaultOpenAow` returns `true` for AoW with matching children when `search()` is active.
   - Assert `isDefaultOpenHlo` returns `true` for HLO with matching children when `search()` is active.
   - Assert clearing `search()` reverts overrides and restores collapsed default.
3. **Unit Tests (`highlightPlannedSearch` in `planned-search.util.spec.ts`):**
   - Assert exact and multi-token substring highlighting with `<mark class="bg-violet-100 text-violet-900 font-semibold rounded px-0.5">`.
   - Assert safe handling of regex characters (`(test)`, `test+foo`, `[bar]`) and HTML entities (`&`, `<`, `>`).
4. **Integration Tests (`DashboardLabComponent`):**
   - Assert `plannedSearch` and `plannedTypeFilter` synchronize with URL query params in `tocView=aows` without reactive loops.
   - Assert `pendingKpi` triggers scroll and focus styling.
   - Assert empty state displays `"No indicators match your search '...'"` and "Clear search" CTA.
