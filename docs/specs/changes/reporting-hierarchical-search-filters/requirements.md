# Requirements — Deep Hierarchical Search, Result-Type Quick Filters & Reporting Navigation State Preservation

Requirements specification for Phase 1 of the PRMS Result Framework Reporting experience enhancement: deep hierarchical search with automatic parent expansion, visual token highlighting, 1-click result-type filter chips, and persistent round-trip navigation state.

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
| Baseline | `US-S1` (`docs/prd.md`); Reporting Hub & Dashboard Lab (`docs/ux-ui/design.md` §4, §8); `W1`, `W5` (`docs/trd/trd.md`) |
| Related specs | `changes/report-result-form-ux`, `changes/result-detail-back-rail`, `changes/mass-reporting-flow`, `bugfix/smart-back-button` |

---

## 1. Executive Summary

During active reporting cycles, submitters report research outcomes across dozens of indicators (~30+ per Science Program/Initiative). The current workflow induces severe physical and cognitive fatigue:
- Typing in the search input narrows rows in memory, but parent Area of Work (AoW) cards and High-Level Output/Outcome (HLO) accordions remain collapsed, requiring tedious manual expansion of every card.
- There are no 1-click filter chips to instantly isolate specific result typologies (e.g. showing only Knowledge Product or Innovation Development indicators).
- When a submitter completes a report and navigates to `result-detail`, clicking "Back to results" (or browser back) resets all reporting state: the search query is lost, expanded nodes collapse, and the viewport resets to the top, forcing the submitter to repeat the search-expand cycle for every single result.

Phase 1 eliminates this friction by delivering deep hierarchical search with automatic tree expansion, highlighted search tokens, 1-click result-type filter pills with live KPI counts, and full state preservation across navigation between the reporting dashboard and result details.

---

## 2. Context & Scope

### Baseline Context
- **Product Story:** `US-S1` (*"As an Initiative or Center submitter, I need to report results against my planned Theory of Change"*).
- **UX/UI System:** Result Framework Reporting / Dashboard Lab (`docs/ux-ui/design.md` §4, §8).
- **Architecture Workflows:** `W1` (Result creation and submission) and `W5` (Reporting and dashboard navigation) from `docs/trd/trd.md`.

### In Scope
1. **Deep Hierarchical Search & Auto-Expansion (`RHSF-R-1`):**
   - When a user enters a search query in the reporting toolbar, parent AoWs and child HLO groups that contain matching indicators MUST automatically expand.
   - When search text is cleared, tree expansion MUST revert gracefully to the user's explicit manual state or the baseline default.
   - Immediate prefetching (`loadAllTocs()`) upon search activation to ensure indicators across all AoWs are searchable.
2. **Visual Keyword Highlighting (`RHSF-R-2`):**
   - Matching query tokens MUST be visually highlighted within indicator descriptions, group titles, and badges using accessible contrast styles (`bg-violet-100 text-violet-900`).
   - Search parser MUST safely escape regular expression characters (e.g. `(`, `)`, `.`, `+`, `?`).
3. **Live Search Feedback & Count (`RHSF-R-3`):**
   - Display an instant count of matching indicators (e.g. `"12 indicators found"`) alongside the search input, with an instant clear button (`✕`).
4. **Result-Type Quick Filter Chips (`RHSF-R-4`):**
   - Prominent horizontal filter chips rendered in the reporting band:
     - `All`, `Knowledge Product`, `Innovation Development`, `Policy Change`, `Capacity Sharing`, etc.
   - Each chip displays a live count of matching indicators for the active Science Program / Phase.
5. **Round-Trip Navigation State Preservation (`RHSF-R-5`):**
   - Register `/result-framework-reporting/entity-details/:code` in `SmartNavigationService` as a recognized `result-detail` origin.
   - Synchronize `search`, `type`, and target `kpi` in URL query parameters (`?tocView=aows&q=...&type=...&kpi=...`).
   - Returning from `result-detail` via "Back to results" MUST restore the exact search query, active filter chip, expanded AoW/HLO state, and scroll position.
6. **Target Indicator Focus Recovery (`RHSF-R-6`):**
   - Smoothly scroll to the previously reported indicator row upon return and apply a brief transient focus highlight.

### Out of Scope (Phases 2 & 3)
- **Phase 2 (User Personalization):** User-pinned favorite indicators, custom AoW focus lists, and backend-persisted user preferences.
- **Phase 3 (AI Reporting Copilot):** Natural language intent matching, publication abstract auto-mapping, and LLM-assisted indicator recommendations.

---

## 3. Personas Affected

| Persona | Impact & Value |
|---|---|
| **Result Submitter** | Major fatigue reduction; reports 30+ items consecutively with zero lost context and instant 1-click typology filtering. |
| **QA Reviewer** | Effortless auditing of specific typologies (e.g. verifying all Knowledge Products reported in an Area of Work). |
| **Program Coordinator** | Real-time visibility into planned vs. reported distribution across all result types. |

---

## 4. User Stories

- **`RHSF-US-1`** — *As a result submitter*, I want typing into the search bar to automatically expand every Area of Work and HLO containing matching indicators, so that I can see and access my target indicator immediately without manual clicking.
- **`RHSF-US-2`** — *As a result submitter*, I want to see the matching search words highlighted in yellow or violet inside the indicator descriptions, so that I immediately understand why each row matched my search.
- **`RHSF-US-3`** — *As a result submitter with multiple publications to report*, I want to click a "Knowledge Product" filter chip in the toolbar, so that the entire tree only shows indicators accepting Knowledge Products with their planned target counts.
- **`RHSF-US-4`** — *As a result submitter*, I want to click "Report", complete the result detail form, and click "Back to results" without losing my search query, filters, expanded AoWs, or scroll position, so that I can immediately report the next item without repeating work.

---

## 5. Functional Requirements

### `RHSF-R-1`: Deep Hierarchical Search with Auto-Expansion
The system MUST search indicator haystacks (description, indicator title, category, HLO name, AoW code/name, and center acronym) and auto-expand all parent nodes.

#### Scenario: User searches for a keyword present in an indicator
- **GIVEN** the user is on the Reporting tab (`tocView=aows`) with all AoWs initially collapsed
- **WHEN** the user types `"climate"` (>= 2 characters) in the search input
- **THEN** every AoW containing at least one indicator matching `"climate"` MUST automatically expand
- **AND** within those expanded AoWs, every HLO sub-group containing a matching indicator MUST automatically expand
- **AND** AoW cards and HLO groups with 0 matching indicators MUST be hidden from the view
- **AND** `loadAllTocs()` MUST be triggered if any AoW ToC has not yet been loaded in memory.

#### Scenario: User clears the search input
- **GIVEN** search results are currently active with auto-expanded nodes
- **WHEN** the user clicks the clear (`✕`) button or deletes all characters in the search box
- **THEN** the search filter MUST be cleared immediately
- **AND** tree disclosure MUST revert to the user's manual expansion overrides or the default `expandAll` baseline.

---

### `RHSF-R-2`: Visual Keyword Highlighting
The system MUST visually highlight matching query tokens inside indicator descriptions, HLO titles, and metadata chips.

#### Scenario: Keyword match styling
- **GIVEN** an active search query `"rice seed"`
- **WHEN** indicator rows render in the table
- **THEN** all occurrences of `"rice"` and `"seed"` in the description text MUST be wrapped in an accessible `<mark>` element
- **AND** the highlight MUST use token classes `bg-violet-100 text-violet-900 font-semibold rounded px-0.5`
- **BUT IT MUST NOT** break when query terms contain special regex characters (e.g. `(`, `)`, `[`, `]`, `+`, `*`, `?`).

---

### `RHSF-R-3`: Live Search Counter & Match Feedback
The system MUST display live feedback on the number of matching indicators.

#### Scenario: Real-time match count
- **GIVEN** the user types a query
- **WHEN** the filtered list is evaluated
- **THEN** a pill beside or inside the search field MUST display `N indicators found` (e.g. `14 indicators found`)
- **AND** if `N === 0`, an explicit empty state MUST display `"No indicators match your search '<query>'"` with a "Clear search" button.

---

### `RHSF-R-4`: Result-Type Quick Filter Chips
The system MUST provide 1-click filter chips for result typologies in the reporting band.

#### Scenario: Selecting a Result-Type chip
- **GIVEN** the reporting toolbar displaying quick filter chips: `All`, `Knowledge Product`, `Innovation Development`, `Policy Change`, `Capacity Sharing`
- **WHEN** the user clicks `[ Knowledge Product (14) ]`
- **THEN** the chip MUST enter active visual state (`bg-[var(--pr-color-primary-400)] text-white`)
- **AND** the entire tree MUST filter to only indicators whose `result_type_name` or `type_name` matches Knowledge Product
- **AND** AoWs with matching indicators MUST remain visible with updated count badges
- **AND** clicking the active chip again or clicking `[ All ]` MUST reset the type filter.

---

### `RHSF-R-5`: Round-Trip Navigation State Preservation
The system MUST preserve reporting view state across navigation to `result-detail` and return via "Back to results".

#### Scenario: Round-trip navigation through Result Detail
- **GIVEN** the user has search `"fertilizer"` active, filter chip `[ Innovation Development ]` selected, and AoW `AOW02` expanded
- **WHEN** the user clicks `[ Report ]` on indicator `ID #405`
- **THEN** the application navigates to `/result/result-detail/:code/general-information`
- **AND** `SmartNavigationService` MUST record the origin URL including query params:
  `?tocView=aows&q=fertilizer&type=Innovation%20Development&kpi=405`
- **WHEN** the user clicks `[ ← Back to results ]` in the secondary sidebar rail
- **THEN** the application returns to `/result-framework-reporting/entity-details/:code` with those query parameters
- **AND** the search input MUST display `"fertilizer"`
- **AND** the `Innovation Development` filter chip MUST be selected
- **AND** AoW `AOW02` MUST remain expanded
- **AND** indicator row `#405` MUST be scrolled into view.

---

### `RHSF-R-6`: Target Indicator Focus Recovery
The system MUST provide visual focus on the returning row to re-orient the submitter.

#### Scenario: Row scroll and flash highlight
- **GIVEN** the user returns to the reporting view with `?kpi=405`
- **WHEN** the table renders and opens the target card
- **THEN** the viewport MUST smoothly scroll indicator row `#405` into view
- **AND** a transient focus ring / highlight (`ring-2 ring-violet-400 bg-violet-50/50`) MUST be applied for 1500ms and then smoothly fade out.

---

## 6. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Search Latency** | Tree filtering and auto-expansion MUST complete in <= 50ms for trees with up to 250 indicators. |
| **Input Debounce** | Text input MUST be debounced by 150ms to prevent thrashing during fast typing. |
| **Accessibility (WCAG 2.1 AA)** | Highlighted text (`<mark>`) MUST maintain >= 4.5:1 contrast ratio against background. Filter chips MUST be fully keyboard-navigable (`Tab`, `Space`, `Enter`) with proper `aria-pressed` states. |
| **Backwards Compatibility** | Existing direct links with `?tocView=aows` or `?tocView=byAow&tocAow=...` MUST continue to function identically. |
| **URL Cleanliness** | Empty or default parameters (`q=''`, `type='all'`) MUST be omitted or stripped from query params to keep URLs concise. |

---

## 7. Defect Classes & Verification Gates

| Defect Class | Concrete Failure Risk | Verification Gate |
|---|---|---|
| **Search Expansion Failure** | Search query filters rows in memory but leaves parent AoW/HLO accordions collapsed, hiding results. | Jest: `reporting-aow-table.component.spec.ts` testing `isDefaultOpenAow` and `isDefaultOpenHlo` with active search. |
| **Regex Crash / Text Injection** | Special characters in search query (`.`, `(`, `[`, `*`) crash regex parser or break HTML structure in `<mark>` highlights. | Jest: `planned-search.util.spec.ts` unit tests with raw regex inputs. |
| **Navigation State Wiping** | "Back to results" in `result-detail` drops query params or routes to Results Center instead of Reporting. | Jest: `smart-navigation.service.spec.ts` + `dashboard-lab.component.spec.ts`. |
| **Chip Count Inconsistency** | Typology chip counts do not match the sum of indicators inside the AoWs. | Jest: `reporting-program-band.component.spec.ts` asserting chip count calculation against loaded ToCs. |
| **Focus / Scroll Target Lost** | Indicator `#kpi` row is not rendered or scrolled when returning from deep link. | Jest: `dashboard-lab.component.spec.ts` verifying `pendingKpi` consumption and scroll trigger. |

---

## 8. Acceptance Criteria Index

| ID | Requirement | Summary |
|---|---|---|
| `RHSF-AC-1` | `RHSF-R-1` | Typing >= 2 characters auto-expands all parent AoWs and HLOs containing matching indicators. |
| `RHSF-AC-2` | `RHSF-R-1` | Clearing the search query collapses tree back to default or manual state. |
| `RHSF-AC-3` | `RHSF-R-2` | Matching words are highlighted with `<mark class="bg-violet-100 text-violet-900 font-semibold rounded px-0.5">`. |
| `RHSF-AC-4` | `RHSF-R-2` | Search queries containing regex special characters (`(`, `)`, `+`, `?`) do not error and highlight cleanly. |
| `RHSF-AC-5` | `RHSF-R-3` | Badge shows live count of matching indicators, e.g. `12 indicators found`. |
| `RHSF-AC-6` | `RHSF-R-4` | Clicking a Result-Type chip filters tree to only indicators of that type and updates chip counts. |
| `RHSF-AC-7` | `RHSF-R-5` | SmartNavigationService includes `/result-framework-reporting/entity-details/:code` in `isKnownResultDetailOrigin`. |
| `RHSF-AC-8` | `RHSF-R-5` | "Back to results" in result-detail sidebar rail navigates back to reporting with `?q=...&type=...&kpi=...` preserved. |
| `RHSF-AC-9` | `RHSF-R-6` | Returning to reporting view smoothly scrolls to target indicator and displays a transient 1.5s highlight. |

---

## 9. Dependencies & Assumptions

- **Upstream:** `SmartNavigationService` (`src/app/shared/services/smart-navigation.service.ts`), `DashboardLabComponent`, `ReportingProgramBandComponent`, `ReportingAowTableComponent`.
- **Downstream:** Result Detail back navigation rail (`ResultSectionsSidebarComponent`).
- **Assumption:** All ToCs for the active Science Program can be loaded in memory via `loadAllTocs()` without exceeding browser heap or degrading scroll performance (< 100 KB total payload per SP).

---

## 10. Open Questions (All Resolved)

- **`RHSF-OQ-1`:** Should filter chips be multiple-choice or single-select?
  - *Resolution:* Single-select for quick pills (`All`, `Knowledge Product`, `Innovation Dev`, etc.) with 1-click toggle, matching the user's mockup. The advanced multi-select remains available in the existing filter dropdown.
- **`RHSF-OQ-2`:** Should state be saved in localStorage or URL query params?
  - *Resolution:* URL query params (`?q=...&type=...&kpi=...`). This guarantees shareable links, browser back/forward support, and seamless integration with `SmartNavigationService`.
