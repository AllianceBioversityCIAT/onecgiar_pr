# Judgment Day Ledger — Deep Hierarchical Search, Result-Type Quick Filters & Reporting Navigation State Preservation

Dual blind review ledger for `docs/specs/changes/reporting-hierarchical-search-filters/design.md`.

---

## Transaction Control

| Field | Value |
|---|---|
| Spec Path | `changes/reporting-hierarchical-search-filters` |
| Round | Round 1 (Pre-Execution Design Audit) |
| Judge 1 | `Judge 1 Architectural Auditor` (Subagent `e9f00bf3`) |
| Judge 2 | `Judge 2 UX and State Auditor` (Subagent `2fda34c1`) |
| Status | **CORRECTIONS REQUIRED** (Both judges recommended adjustments before Phase 3) |

---

## 1. Findings Ledger

| ID | Judge | Severity | Category | Description | Corroboration / Status |
|---|---|---|---|---|---|
| **JD-01** | J1 & J2 | **SEVERE** | **State / URL Sync** | `dashboard-lab.component.ts:1345-1368` guards `q` and `typ` behind `aow` param, preventing `tocView=aows` from writing search/filter state to URL. Concurrently, naive two-way binding between router events and signal effects risks infinite loops without deep equality guards and `untracked()`. | **CONFIRMED BY BOTH** — Update router sync to handle `tocView=aows`, guard against redundant navigation, and use `replaceUrl: true`. |
| **JD-02** | J1 & J2 | **SEVERE** | **Highlighting / XSS** | A new `PrHighlightPipe` with raw regex replacement risks XSS and HTML entity corruption (`&amp;`). Furthermore, the existing `highlightPlannedSearch` in `planned-search.util.ts` uses `.planned-search-hit` with yellow background, violating WCAG AA token contrast. | **CONFIRMED BY BOTH** — Reuse and update existing `highlightPlannedSearch` in `planned-search.util.ts` to output `<mark class="bg-violet-100 text-violet-900 font-semibold rounded px-0.5">` with established entity-safe slicing. |
| **JD-03** | J1 & J2 | **SEVERE** | **Disclosure & Overrides** | `ReportingAowTableComponent` currently ignores search state in `isDefaultOpenAow()` / `isDefaultOpenHlo()`. Additionally, manual node clicks recorded in `overrides()` during search must not leak into post-search baseline. | **CONFIRMED BY BOTH** — Implement dynamic auto-expansion in `ReportingAowTableComponent` when `search()` is active, and reset/key `overrides` linkedSignal on search query changes. |
| **JD-04** | J1 | **WARNING** | **Architecture** | Single-select quick filter chips and existing multi-select typology dropdown must share the same underlying state rather than conflicting. | **ACCEPTED** — Bind quick chips to `plannedTypeFilter` signal directly. |
| **JD-05** | J2 | **WARNING** | **UX / Empty State** | When 0 indicators match, empty state in `dashboard-lab.component.html` displays static text without the query and without a "Clear search" CTA button. | **ACCEPTED** — Update empty state with dynamic query label and `(clearFilters)` button. |

---

## 2. Agreed Corrections to Apply in `design.md`

1. **Reactive Loop & URL Sync Hardening (JD-01):**
   - Update Section 4.4: Remove the `aow` prerequisite for `q` and `typ` in the URL navigation effect so `tocView=aows` syncs query parameters.
   - Add strict equality check (`if (currentVal !== nextVal)`) before updating signals from router events, and wrap URL updates in `untracked()` to eliminate infinite loops.
2. **Safe Highlight Utility Reuse (JD-02):**
   - Update Section 4.3: Refactor the highlighting design to explicitly reuse and enhance `highlightPlannedSearch` in `planned-search.util.ts` rather than introducing a naive regex pipe, applying classes `bg-violet-100 text-violet-900 font-semibold rounded px-0.5`.
3. **Disclosure & Overrides Clean Reset (JD-03):**
   - Update Section 4.3: Include search activity in the `overrides` linkedSignal source (`${this.scopeKey()}::${this.expandAll()}::${this.expandAllNonce()}::${this.search()}`), so clearing search automatically restores the clean baseline.
4. **Typology State Unification (JD-04):**
   - Update Section 4.2: Specify that quick filter chips toggle items in `plannedTypeFilter`, ensuring 100% sync between the quick chip bar and the existing dropdown.
5. **Empty State Feedback (JD-05):**
   - Update Section 4.2 & 4.4: Add dynamic query template and "Clear search" action when 0 indicators match.
