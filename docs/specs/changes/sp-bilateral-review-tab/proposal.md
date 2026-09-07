# Proposal: "Bilateral review" tab in the Science Program shell

## 1. Document Control

| Attribute | Value |
|---|---|
| **Spec Path** | `changes/sp-bilateral-review-tab` |
| **Proposal File** | `docs/specs/changes/sp-bilateral-review-tab/proposal.md` |
| **Type** | Change |
| **Approval Mode** | pre-approved (owner, 2026-09-07 — set at the Phase 1 gate of `/akili-specify`) |
| **Slug** | `sp-bilateral-review-tab` — derived from free-text argument *"New Tab/Section in SPs … Bilateral Results Review … with the new look and feel … organize the tabs"* |
| **Author** | Claude (T1 Architect, Fable 5.1) |
| **Date** | 2026-09-07 |
| **Branch** | `qa-development-2026` |
| **Target route (today)** | `/result-framework-reporting/entity-details/:code/results-review` |
| **Target route (proposed)** | `/result-framework-reporting/entity-details/:code/bilateral-review` (old path kept as redirect) |
| **Depends on** | none (all upstream specs archived) |
| **Parallel-safe** | no — edits `reporting-program-band` shared by every SP tab |

---

## 2. Intent

Give the Science Program (SP) shell a fifth tab, **Bilateral review**, that shows the W3/bilateral results contributed to the program by CGIAR centers and lets program reviewers approve or reject them — rendered with the 2026 look and feel (hero band, toolbar, KPI cards, grouped rows) that Overview / Reporting / Results / My results already share. The legacy "Bilateral Results Review" page is retired behind a redirect.

---

## 3. Problem / Current Behavior

The review screen exists and works, but it is the last program-level surface still on the legacy design. Evidence: `reference/current-results-review-legacy.png` (captured 2026-09-07 on SP02) vs `reference/target-reporting-tab-new-look.png`.

| Aspect | Legacy `results-review` | New SP tabs |
|---|---|---|
| Entry | Not a tab. Reached only by deep links (results list, notifications, programme-results) or by typing the URL | Tab bar in `reporting-program-band` |
| Header | PrimeNG breadcrumb (`pi pi-chevron-right`), hand-rolled SCSS | Hero band: code · cycle · title · Tour / Report emerging result / Where to report |
| Filters | Left "Centers" rail + "Apply filters" drawer (`app-pr-filter-multiselect`) + Clear Filters | Inline search, Filter popover, quick-filter chips with counts, Only pending, Favorites, segmented view control |
| Summary | none | `reporting-summary-stats` KPI row |
| Table | `PrGroupTableComponent` grouped by project, fixed-width `<th>` | `app-pr-table` / `reporting-aow-table` grouped rows, resizable, responsive |
| Explainer | none | Per-tab `activeTabInfo` panel (`sp-tab-explainer-panels`) |
| Discoverability | A retired `BilateralResultsReviewComponent` and a pending-count endpoint exist but nothing surfaces the count | `My results` shows a count badge |

Code facts (from the exploration pass):

- Route: `shared/routing/routing-data.ts:635-641` → lazy `BilateralResultsComponent` (`pages/bilateral-results/`). No guard beyond the parent `CheckLoginGuard`.
- Data: `BilateralResultsService` → `GET /api/results/by-program-and-centers` (grouped by bilateral project) and `GET /api/results/pending-review` (badge count). Drawer: `GET bilateral/:resultId`, `PATCH bilateral/:resultId/review-decision`.
- Review permission is computed in-component (`canReviewResults` = admin OR program in `myInitiativesList`, `results-review-table.component.ts:47-54`, duplicated in the drawer).
- The review drawer (`result-review-drawer.component.ts` + five per-type content components) is presentation-agnostic and reusable as-is.
- Tab bar is hard-coded markup (`reporting-program-band.component.html:209-283`); `activeTab` union at `.component.ts:146`; per-tab paths at `:294-311`; explainer copy at `:503`.
- Five inbound links target `/results-review` (`results-list.component.ts:681`, `programme-results.component.ts:1428`, three notification components).

---

## 4. Proposed Outcome

1. **New tab "Bilateral review"** in the SP band, with a pending-count badge (reusing `GET_PendingReviewCount`) visible to users who can review.
2. **Tab order** becomes `Overview · Reporting · Results · Bilateral review · My results` — program-scoped lenses first, the personal lens last. Rationale: Results (all reported) and Bilateral review (the W3 subset awaiting a program decision) are siblings; My results stays the closing "mine" tab and keeps its badge position.
3. **Page body on the new design line:**
   - Hero + tab bar + toolbar come free from `reporting-program-band`.
   - Toolbar mapping: search box (code, title, project, center) · Filter popover (Indicator category, Status, Lead center, Bilateral project) · quick-filter chips by **Status** (`All · Pending review · Approved · Rejected`) with counts · "Only pending" toggle · Expand all · Grouped (by project) / All results view switch. Favorites and Catalogue/Remaining work are hidden for this tab (no meaning here).
   - KPI row (`reporting-summary-stats`): Bilateral projects · Contributing centers · Pending review · Approved / Rejected this cycle.
   - The center rail becomes a **Center** filter inside the popover and a chip strip, not a sidebar.
   - Grouped rows per bilateral project (code + name, center, counts, progress bar) expanding to result rows: Code · Title (+ Contributor tag) · Indicator category · Lead center · Status chip · TOC result · Submission date · action (Review / See).
   - The existing review drawer is mounted unchanged; approve/reject updates rows and badge in place.
   - Explainer panel entry for the tab.
4. **Legacy retirement:** `/results-review` redirects to `/bilateral-review` (deep links and notifications keep working); `pages/bilateral-results/` shell, breadcrumb, `indicators-sidebar`, and the old filter drawer are deleted; drawer + service move under `dashboard-lab/components/bilateral-review/`.

---

## 5. Scope

**In scope (client only):**

- `reporting-program-band`: fifth tab, `activeTab` union, `bilateralReviewPath()`, badge input, explainer copy, per-tab toolbar visibility flags (favorites / segmented control hidden).
- New `dashboard-lab/components/bilateral-review/` page component (standalone, signals, Tailwind-first) reusing `reporting-summary-stats`, `app-pr-table` grouped rows, `pr-filter-*`, `.pr-chip`, `planned-search.util`.
- Move `BilateralResultsService`, `result-review-drawer` and its content components; hoist `canReviewResults` into one shared computed/service used by tab visibility, table, and drawer.
- Route: add `entity-details/:entityId/bilateral-review`; keep `results-review` as `redirectTo`; update the five inbound links to the new path.
- Query-param retention consistent with `reporting-hierarchical-search-filters` (search/status/center survive navigation).
- Jest specs for the new component, the band tab, and the redirect; Cypress CT for the layout gate if the tester judges it layout-shaped.

**Out of scope:** any server change (endpoints already return what is needed); the Platform sidebar "Bilateral Results" module (`pages/bilateral/`, creator side); center-view tabs (`centerMode` Drafts slot stays deferred); changes to the review business rules or the drawer's per-type content.

---

## 6. Non-Goals

- No new review states or workflow transitions (AC-2 untouched).
- No bilateral payload change (`/api/bilateral/*` contract untouched, ADR-004).
- No redesign of the drawer internals.
- No pagination: the legacy screen is client-side filtered; keep that unless volumes prove otherwise (open question below).

---

## 7. Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| Users | Program leads / reviewers (approve or reject W3 contributions); center submitters (see decision state); admins |
| Client | `pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band/*`, new `components/bilateral-review/*`, `pages/bilateral-results/*` (retired), `shared/routing/routing-data.ts`, 5 inbound-link sites |
| Server | none |
| Related specs (archived) | `reporting-entry-hub` (W3 lane copy and tone), `sp-tab-explainer-panels` (explainer contract), `my-work-board` (badge + tab pattern, MWB-DD-12), `reporting-hierarchical-search-filters` (retention), `reporting-favorite-indicators` (band toolbar inputs), `bilateral--overview-redesign` (KPI-cards-as-filters pattern), `clear-filters`, `all-indicators-table-responsive` |
| Baseline | `docs/ux-ui/design.md` §7 brand line (Tailwind-first, violet accent, chrome gradient), DD-12; `docs/trd/trd.md` §6 frontend rules; PRD US-Q1/US-Q3 (review lens), US-P1 |

---

## 8. Visual Reference

- Source: existing product screens (no Figma)
- Location:
  - `docs/specs/changes/sp-bilateral-review-tab/reference/target-reporting-tab-new-look.png` — the Reporting tab the user pointed at as the look-and-feel target (hero, toolbar, chips, KPI row, grouped rows).
  - `docs/specs/changes/sp-bilateral-review-tab/reference/current-results-review-legacy.png` — the page being replaced (SP02, captured 2026-09-07).
- Notes: the target is "same chrome as the sibling tabs". A generated mockup is optional; `/akili-specify` can produce a self-contained HTML mockup of the KPI row and grouped-row layout if the owner wants to review it before tasks.

---

## 9. Requirement Delta Preview

### ADDED Requirements

- A fifth SP tab **Bilateral review** with route `entity-details/:code/bilateral-review`, positioned after Results and before My results.
- Pending-review count badge on the tab for users who can review; hidden otherwise.
- KPI summary row (projects, centers, pending, decided) above the list; cards act as filters where it is unambiguous (Pending review).
- Status quick-filter chips with counts; Only-pending toggle; Center and Project filters in the Filter popover; search across code, title, project, center.
- Grouped-by-project view with expand-all and an "All results" flat view, on `app-pr-table`.
- Explainer panel copy for the new tab.
- Filter/search state retained in query params across navigation and drawer round-trips.

### MODIFIED Requirements

- Review, See-result, approve and reject keep their current behavior but run inside the new tab; decisions update rows, counts, chips and badge without reload.
- Tab order in `reporting-program-band` changes from four to five tabs as stated above.
- `canReviewResults` becomes a single shared rule consumed by tab badge, table and drawer.

### REMOVED Requirements

- Standalone legacy page shell: breadcrumb, Centers sidebar rail, "Apply filters" drawer, "Clear Filters" button (superseded by the band's clear-filters control).
- Direct rendering at `/results-review` (kept only as a redirect).

---

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. Wrap legacy in the band** | Mount `BilateralResultsComponent` under a new tab, drop the breadcrumb | Smallest diff, one day | Still two filter systems, sidebar rail, PrimeNG icons, fixed-width table. Does not meet "new look and feel"; the debt survives |
| **B. Rebuild the page on the band, reuse drawer + service** (recommended) | New standalone component composed from `reporting-program-band`, `reporting-summary-stats`, `app-pr-table`, `pr-filter-*`; drawer and data service moved, not rewritten | Visual and behavioral parity with sibling tabs; no server work; review logic untouched (low regression risk); legacy folder deleted | Moderate template work (~600–900 LOC by analogy with `my-work-board`); band gains per-tab toolbar flags |
| **C. Fold into the Results tab as a "Bilateral / W3" mode** | Add a review mode and drawer to `programme-results` | One less tab | Results reads from `results-scope`, review from `by-program-and-centers`: two data shapes in one component; review actions blur the "view all results" lens; Results template is already the heaviest in the module |

---

## 11. Recommended Approach

**Option B.** It is the smallest path that actually delivers the request: the band already owns hero, tabs and toolbar, so the new work is one page component plus wiring, while the risky part (review decisions, per-type drawer content) moves without modification. Keep the tab label **"Bilateral review"** (short, names the object and the action; "W3 review" is jargon and "Review" collides with QA). Insert it after Results.

Build order for `/akili-specify`: (1) band tab + route + redirect + explainer; (2) shared `canReviewResults`; (3) page component with KPI row, toolbar mapping, grouped rows; (4) drawer mount + in-place updates + badge refresh; (5) retire `pages/bilateral-results/`, repoint inbound links; (6) tests and the real-page check in the Orca browser.

---

## 12. Risks, Dependencies, And Open Questions

**Risks**

- `reporting-program-band` is shared by all four existing tabs; per-tab toolbar flags must default to current behavior (regression-test the Reporting tab toolbar).
- Template LOC budgets have overrun on this module before (KZ-REH-1, entry hub 650 → 1 311 LOC). Budget the template explicitly in `design.md`.
- Grouped-row component: `reporting-aow-table` is AoW-shaped; the review list needs `app-pr-table` grouped rows or a small dedicated row component. Decide in `design.md`, do not fork `reporting-aow-table`.
- Deleting `pages/bilateral-results/` removes the `indicators-sidebar`; confirm nothing else imports it.

**Dependencies**

- Existing endpoints only: `by-program-and-centers`, `pending-review`, `bilateral/:id`, `review-decision`. If `GET_PendingReviewCount` is not phase-scoped the badge may overstate; verify in specify.
- Local env note: the `year`/`version` mismatch found today (active year 2026 vs open phase 2025) makes progress KPIs on the Reporting tab read 0; unrelated to this change but will confuse real-page checks until the phase is opened.

**Open questions**

- OQ-1 Tab visibility for non-reviewers: show (read-only "See result", no badge) or hide entirely? Proposal assumes **show** to keep parity with legacy deep links.
- OQ-2 Should KPI cards act as filters (as in `bilateral--overview-redesign`) or stay informational? Proposal assumes only "Pending review" is clickable.
- OQ-3 Keep client-side filtering with no pagination? Largest observed program today has 143 rows on SP02; confirm the upper bound.
- OQ-4 Route name `bilateral-review` vs keeping `results-review`. Proposal renames and redirects; keeping the old name is acceptable if URL stability matters more.

---

## 13. Success Criteria

- The SP shell shows five tabs in the stated order on every SP; the new tab renders hero, toolbar, KPI row and grouped rows using the same components and tokens as Reporting/Results (no PrimeNG icon fonts, no new `.pr-*` SCSS blocks).
- Every review capability of the legacy page (search, category/status/center filters, grouping by project, Review/See result, approve with comment, reject with justification) works in the new tab, verified by Jest and a real-page pass.
- Approving or rejecting updates the row, chip counts, KPI row and tab badge without a reload.
- `/results-review` deep links land on the new tab with the same program.
- `pages/bilateral-results/` no longer exists; `npx ng lint --quiet` and the touched Jest suites are green.

---

## 14. Next Step

```text
/akili-specify changes/sp-bilateral-review-tab
```
