# Requirements: Results Center SP-style layout

## Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/results-center-sp-layout` |
| **Parent proposal** | [`proposal.md`](./proposal.md) |
| **Module** | `results` / Results Center |
| **Type** | Change |
| **Depth** | Standard |
| **Approval Mode** | gated |
| **Status** | in-review |
| **Depends on** | `changes/sp-shell-app-viewport` (shipped) |
| **Date** | 2026-09-11 |

---

## 1. Executive Summary

Results Center is a primary entry surface for PRMS users but today behaves like a **document-scroll list page**: hero and filters scroll away, the global footer consumes space, and filters are spread across five inline multiselects. This spec reframes `/result/results-outlet/results-list` as a **viewport-locked web app** aligned with Science Program reporting: **static hero**, **static grouped filter toolbar**, **single internal scroller** for the table, and **no footer** on this route — without changing filter logic, APIs, or export/delete capabilities.

---

## 2. Glossary

| Term | Definition |
|---|---|
| **Results Center** | Global cross-program results list at `/result/results-outlet/results-list`. |
| **Locked frame** | At ≥900px CSS width, page host uses `pr-viewport-page`; document does not vertically scroll. |
| **#workArea** | The sole `overflow-y: auto` region inside a locked page (`SAV` contract). |
| **Hero** | Platform header band: eyebrow, title, subtitle, primary actions (Columns, Export CSV, Update result). |
| **Filter toolbar** | Search + Filter popover + active chips + Clear all. |

---

## 3. System Context & Scope

### 3.1 PRD alignment

- **`docs/prd.md` G1 (Quality reporting):** Users must find and export results quickly across programs.
- **`docs/prd.md` US-S1 / AC-* (submitter lifecycle):** Results Center remains the global search/export surface; layout change only.

### 3.2 UX baseline

- **`docs/ux-ui/design.md` §6–§9:** App shell, page shell, responsive breakpoint at 900px (`md`).
- **Reference implementation:** SP Reporting static toolbar + `programme-results` filter popover patterns.

### 3.3 In scope

- Viewport lock + `#workArea` on Results Center.
- Hero band restructure (platform chrome, not program band/tabs).
- Filter toolbar UX migration to popover-first grouped layout.
- Footer hidden on Results Center route.
- Scroll/overlay fixes (row menu, column picker).
- Scoped unit tests + manual HITL at ≥900px and <900px.

### 3.4 Out of scope

- Program band, SP tabs, emerging-result CTAs.
- Filter service logic, API contracts, pagination model changes.
- Full Tailwind migration of all `rc-*` styles in one pass.
- Footer removal on other routes.

---

## 4. Stakeholders / Personas

| Persona | What changes |
|---|---|
| **Result submitter / coordinator** | Filters always visible; clearer hierarchy on first landing |
| **QA reviewer / portfolio lead** | Stable frame while scanning long paginated lists |
| **Platform admin** | Same filter/export/update capabilities; improved scroll predictability |

---

## 5. Functional Requirements

### RCS-R-1: Viewport-locked scroll at desktop widths

Results Center SHALL adopt the shipped `pr-viewport-page` pattern at **≥900px CSS width** with exactly one vertical scroller (`#workArea`).

#### Scenario: Desktop locked frame

- GIVEN viewport width ≥900px on `/result/results-outlet/results-list`
- WHEN the user scrolls vertically
- THEN only `#workArea` scrolls
- AND `document.documentElement.scrollHeight` equals `document.documentElement.clientHeight` (no document vertical overflow)
- BUT it must NOT introduce a second vertical scroll container outside `#workArea`

#### Scenario: Narrow fallback

- GIVEN viewport width <900px
- WHEN the user scrolls
- THEN the page MAY use document scroll (mixin inert per `SAV-R-8`)
- AND hero/filter toolbar SHOULD remain usable (sticky or in-flow — no regression vs today)

---

### RCS-R-2: Static hero band

The hero (eyebrow, title, subtitle, Columns, Export CSV, Update result) SHALL remain visible while `#workArea` scrolls at ≥900px.

#### Scenario: Hero stays fixed during table scroll

- GIVEN ≥900px and a loaded results table with pagination
- WHEN the user scrolls `#workArea` to the bottom
- THEN the hero band remains fully visible above the scroller
- AND Columns and Export CSV remain operable without scrolling back to top

#### Scenario: Hero content

- GIVEN Results Center loaded
- THEN the eyebrow reads **`PLATFORM · RESULTS CENTER`** (unless superseded by approved PO copy)
- AND the title remains **Results Center**
- AND the subtitle remains **Search and export results across all Science Programs.**
- AND **Update result** appears in the hero actions cluster (not isolated in filter meta row)

---

### RCS-R-3: Static grouped filter toolbar

The filter toolbar SHALL use a popover-first grouped layout and remain visible (non-scrolling) at ≥900px.

#### Scenario: Toolbar structure

- GIVEN Results Center at ≥900px
- WHEN the user views the filter area below the hero
- THEN a search field and a **Filter** button are visible
- AND activating **Filter** opens a grouped popover panel (in-DOM, not portaled — same class as programme-results)
- AND active filter chips and **Clear all** appear inline when filters are applied
- BUT the five inline primary multiselects (Program, Phase, Category, Status as separate always-visible dropdowns) must NOT remain as the primary pattern

#### Scenario: Static during table scroll

- GIVEN filters applied and ≥900px
- WHEN the user scrolls the table inside `#workArea`
- THEN the filter toolbar (search + Filter + chips) remains visible above `#workArea`

---

### RCS-R-4: Preserve all filter capabilities

All pre-change filter dimensions and behaviors SHALL remain available after the UX migration.

#### Scenario: Filter dimensions parity

- GIVEN any filter dimension available before this change
- WHEN the user opens the Filter popover (and search field for text)
- THEN they can still filter by: **Search text**, **Program**, **Phase**, **Indicator category (grouped)**, **Status**, **Portfolio**, **Center**, **Submitter**, **Funding source**, **Created by me**, **Submitted by me**
- AND chip remove + Clear all behave as today
- AND IT MUST preserve phase chip rule (single phase chip not removable when alone)
- BUT it must NOT change `results-list-filter.service.ts` signal semantics or API query contracts

#### Scenario: Apply / cancel in popover

- GIVEN the Filter popover is open with pending changes
- WHEN the user clicks **Apply**
- THEN filters commit to the live signals and the table refreshes
- WHEN the user clicks **Cancel** or closes without Apply
- THEN pending edits are discarded (same as current More filters drawer)

---

### RCS-R-5: Scrollable data region

The count line, alert banner (when shown), table, and pagination SHALL live inside `#workArea`.

#### Scenario: Content in work area

- GIVEN ≥900px locked frame
- WHEN results load
- THEN **Showing N of M**, `app-pr-table`, and pagination scroll inside `#workArea`
- AND the global no-data alert (when present) scrolls with the table region

---

### RCS-R-6: No footer on Results Center

The global footer SHALL NOT render on `/result/results-outlet/results-list`.

#### Scenario: Footer absent on Results Center

- GIVEN the user navigates to Results Center
- WHEN the page renders
- THEN `app-footer` is not shown
- BUT it must NOT affect footer visibility on other allow-listed routes (e.g. type-one-report floating footer)

#### Scenario: Glossary access unchanged elsewhere

- GIVEN footer is removed on Results Center
- THEN users still reach CLARISA glossary via sidebar EXTRAS and other routes' footer
- BUT this spec does not require adding new glossary entry points on Results Center

---

### RCS-R-7: Overlays and scroll listeners

Floating UI tied to Results Center SHALL respect `#workArea` scroll when the frame is locked.

#### Scenario: Row action menu closes on work-area scroll

- GIVEN ≥900px, row context menu open
- WHEN `#workArea` scrolls
- THEN the row menu closes (same behavior previously tied to `window:scroll`)

#### Scenario: Column picker and filter popover

- GIVEN Columns panel or Filter popover open at ≥900px
- WHEN the user scrolls `#workArea`
- THEN overlays close or remain correctly anchored per existing click-outside behavior
- AND IT MUST NOT clip popovers inside `#workArea` incorrectly when filters are static outside it

---

## 6. Non-Functional Requirements

### RCS-NFR-1: Reuse SAV infrastructure

Implementation MUST reuse `src/styles/_viewport-page.scss` mixin — no third scroll model.

### RCS-NFR-2: Angular SCSS emission order

Viewport mixin MUST live in component `.scss` (`:host`), not split with conflicting inline styles (lesson from `programme-results`).

### RCS-NFR-3: Accessibility

Filter toolbar retains `role="search"` and discernible labels; hero actions keep accessible names; keyboard reachability preserved for Filter popover and Columns panel.

### RCS-NFR-4: Performance

No additional API calls; layout-only change must not regress initial Results Center load time measurably.

---

## 7. Defect Classes & Verification Gates

| Defect class | Gate |
|---|---|
| Document scroll at ≥900px (double scroll / wrong scroller) | `results-list.viewport.spec.ts` template/host wiring + **manual HITL** scroll check |
| Hero/filters scroll away at desktop | Manual HITL + template structure assertions |
| Lost filter dimension | `results-list-filters.component.spec.ts` — each dimension reachable |
| Footer still shows on RC | `footer.component.spec.ts` inverted FOVL-AC-3 |
| Row menu stays open on scroll | Unit test or manual: menu closes on `#workArea` scroll |
| Visual parity with SP reference | **Accepted gap for automation** — T6 manual compare to user screenshots at HITL |
| Layout at <900px broken | Manual HITL narrow viewport |

**Scoped verification:**

```bash
cd onecgiar-pr-client && npm run test -- --testPathPattern="results-list.viewport.spec|results-list-filters.component.spec|results-list.component.spec|footer.component.spec"
npx ng lint --quiet
npm run build
```

---

## 8. Requirement ID Index

| ID | Summary |
|---|---|
| RCS-R-1 | Viewport lock + single scroller |
| RCS-R-2 | Static hero |
| RCS-R-3 | Static grouped filter toolbar |
| RCS-R-4 | Filter capability parity |
| RCS-R-5 | Table region in #workArea |
| RCS-R-6 | No footer on RC |
| RCS-R-7 | Overlay/scroll listener fixes |
| RCS-NFR-1..4 | Reuse SAV, SCSS order, a11y, perf |

---

## 9. Resolved assumptions (from proposal OQs)

| OQ | Resolution for spec |
|---|---|
| OQ-1 Jira | None cited — proceed without ticket; add ID when PO supplies |
| OQ-2 Hero eyebrow | **`PLATFORM · RESULTS CENTER`** |
| OQ-3 Update result placement | **Hero actions** (with Columns + Export) |
| OQ-4 Static filters | **Reporting-tab pattern** — filters outside `#workArea` |
