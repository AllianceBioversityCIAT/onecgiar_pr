# Proposal: Bilateral Review — Visual Hierarchy, Semantic Colors, Progressive Disclosure & Filter UX Elevation

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-review-hierarchy-ux` |
| Type | `Change` |
| Approval Mode | `gated` |
| Slug Derivation | `changes/bilateral-review-hierarchy-ux` — derived from user request: *"Refactor: UX/UI PRO-MAX SKILL, FRONTEND DEVELOPER SKILL analiza esta seccion ... Bilateral Review ... jerarquia (centro, proyecto, resultado), podemos manejar colores en la tabla, no mostrar toda la informacion desplegada, trabajar en el UX/UI de los filtros, en general trabajar en UX/UI de la seccion"* |
| Author | Antigravity AI Assistant & Juan Carlos Cadavid |
| Date | 2026-09-08 |
| Status | Proposed (Pending HITL Approval) |

---

## 1. Intent

Transform the **Bilateral Review** section (`/result-framework-reporting/entity-details/:id/bilateral-review`) into a modern, highly ergonomic review workspace. The redesign establishes a crisp visual hierarchy (**Center → Project → Result**), eliminates cognitive overload through **smart progressive disclosure**, introduces **semantic color coding for result types and review states**, and consolidates the sprawling 4-tier filter stack into a **compact, high-density control band**.

---

## 2. Problem / Current Behavior

A detailed UX/UI audit of the live screen (`http://qa-development-2026.orca.localhost:63760/result-framework-reporting/entity-details/SP01/bilateral-review?tocView=aows`) and code reveals 4 major usability and visual flaws:

### 2.1. Weak Visual Hierarchy (Center → Project → Result)
* **Smashed identifiers:** Group headers concatenate the Project Code and Title into a single unwieldy text string (e.g., `T-PJ-003262-An innovative approach to agribusiness...`). It is difficult for the eye to isolate the code from the title.
* **Flat table structure:** Group headers are styled as flat `<tr>` table rows with a subtle 3px left border. The results underneath sit on the same visual plane with identical padding, providing no container depth or perceptual nesting.
* **Ambiguous Center attribution:** In Project grouping mode, contributing centers are dumped as a plain comma-separated text string (`CIMMYT, IRRI, CIP`). In Center grouping mode, projects become secondary text captions. The relationship between Centers, Projects, and Results is visually blurred.

### 2.2. Cognitive Overload & Lack of Progressive Disclosure
* **"Wall of Data" by default:** All groups (e.g. 14 projects and 47 results) are completely expanded on cold load. Users are greeted with an overwhelming page requiring endless vertical scrolling to scan what needs attention.
* **Low scannability for pending tasks:** Reviewers come to this page primarily to find and act on items requiring review. Currently, pending results are buried amidst already-decided results and drafts without immediate visual grouping or prioritized disclosure.

### 2.3. Monochromatic Table & Missing Semantic Colors
* **Muted Result Types:** Critical classifications (`Policy change`, `Innovation use`, `Capacity sharing for development`, `Knowledge product`, `Innovation development`) are rendered as faint, 11px grey text beneath the title. There is zero visual differentiation between high-level outcomes and operational outputs.
* **Inconsistent status styling:** `Pending Review` has an orange pill, while `Editing` / `Draft` renders as unstyled plain grey text, and `Approved`/`Rejected` lack cohesive visual weight.
* **Dull surface contrast:** The table rows, headers, and backgrounds all share near-identical white/grey tones without rhythmic borders or elevated hover treatments.

### 2.4. Sprawling 4-Tier Filter Stack
* **Massive vertical consumption (~200px):** Before reaching the first table header, the user traverses:
  1. Toolbar (Search, Filter Popover button, Only Pending toggle, Expand All, Group segmented toggle, View toggle).
  2. Status segmented row (`STATUS: All 47 | Pending review 23 | Approved 1 | Rejected 1`).
  3. Centers chip row (`CENTERS · 8: All centers 23 | CIP 11 | CIMMYT 9 | ...`).
  4. KPI summary text (`14 bilateral projects · 8 contributing centers · 23 pending review · 2 decided`).
* **Excessive wrapping & fragmented actions:** Having chips, popovers, and segmented controls stacked on top of each other creates visual noise, causes wrapping on standard laptops, and pushes actual content below the fold.

---

## 3. Proposed Outcome & Reference Parity with Reporting Tab

A polished, enterprise-grade UX/UI following the **AKILI-SPECS / PRMS Design System**, the **UI/UX Pro Max** guidelines, and achieving **visual and ergonomic parity with the Reporting tab** (`/result-framework-reporting/entity-details/:id?tocView=aows` / `reporting-aow-table` & `reporting-program-band`):

1. **3-Level Hierarchical Card Containers (Mirrored from `reporting-aow-table`):**
   * Each group (Project or Center) renders as an **elevated container card** (`rounded-[12px] border border-[var(--pr-border)] bg-[var(--pr-surface-card)] transition-shadow hover:shadow-xs`).
   * **Structured 52px Header:**
     * **Rotating Chevron Box:** `flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white border border-slate-200/80 text-indigo-700 shadow-2xs` with smooth 200ms rotation.
     * **Code Badge:** Project code rendered in an authoritative monospace chip (`font-mono text-[11.5px] font-bold px-2.5 py-0.5 rounded-md bg-indigo-100/80 text-indigo-800 border border-indigo-200/70`).
     * **Title with Selection & Quick Copy:** Clean title allowing text selection (`cursor-text select-text`) plus a hover copy action button (`material-icons-round content_copy` → `check text-emerald-600` with tooltip `Copied!`), adopting the pattern just perfected in the Reporting tab.
     * **Contributing Centers:** Rendered as neat, compact chip badges (`bg-slate-100 text-slate-700 border border-slate-200 font-medium text-[11px] px-2 py-0.5 rounded-[5px]`).
     * **Group Metrics:** Clear summary metrics (Total results count, warning badge for `>0 pending reviews`: `bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold`).
   * **Nested Results Table/List:** Inset container with subtle border dividers, alternating row hover depth (`hover:bg-slate-50/80`), and clear headers.

2. **In-Card Quick Filter / Breakdown Toolbar (Pattern from `reporting-aow-table:500-570`):**
   * An optional 32px slim bar inside the expanded card allowing instant local filtering when a project contains results from multiple centers or multiple types:
     * `Centers:` [All (8)] [CIMMYT (5)] [IRRI (2)] [CIP (1)]
     * `Types:` [All] [Policy change (2)] [Innovation use (3)] ...

3. **Smart Progressive Disclosure:**
   * **Default State:** Groups default to **Smart Collapsed** (or smart-expanded only for groups that contain **Pending Review** items). Groups with 0 pending items remain collapsed by default.
   * **One-Click Actions:** Retain the persistent `[Expand All / Collapse All]` global toggle in the toolbar.
   * **High-Level KPI Scannability:** When collapsed, the group header provides complete situational awareness (project code, title, centers involved, total results, and pending review badge).

4. **Semantic Color System & Visual Scannability:**
   * **Categorical Result Type Chips:** Color-coded type pills using PRMS semantic palette tokens:
     * *Policy Change / Outcome:* Indigo / Violet accent (`bg-violet-50 text-[var(--pr-color-primary-700)] border border-violet-200`)
     * *Innovation Use / Development:* Emerald / Teal accent (`bg-emerald-50 text-emerald-700 border border-emerald-200`)
     * *Capacity Sharing:* Amber / Warm accent (`bg-amber-50 text-amber-800 border border-amber-200`)
     * *Knowledge Product:* Cyan / Sky accent (`bg-sky-50 text-sky-700 border border-sky-200`)
     * *Other Output / Outcome:* Slate neutral (`bg-slate-100 text-slate-700 border border-slate-200`)
   * **Unified Status Badges:** Strictly adhering to PRMS fixed `--pr-status-*` pairs (`Pending Review`, `Approved`, `Rejected`, and a clean neutral pill for `Editing / Draft`).
   * **Clear Action CTA:** The `Review` action is highlighted with a brand-accent affordance button (`hlmBtn` variant with primary text/border styling) while `See` remains a clean ghost action.
   * **Left Border Status Accent on Rows:** Echoing `reporting-aow-table:853-857`, each row carries a 3px status border accent (amber for pending review, emerald for approved, slate for draft) providing instant peripheral recognition.

5. **Consolidated Filter Band (Parity with `reporting-program-band`):**
   * **Row 1 (Controls & Quick Filters):** Search bar (with match count badge `N matches`) + JIRA-style `Filter` button with badge counter opening a multi-select popover + Status segmented control + View controls (Group by Project/Center, Grouped/Flat, Expand/Collapse all).
   * **Row 2 (Metric Ribbon & Active Filter Chips):** Compact, modern KPI summary bar (`14 Projects · 8 Centers · 23 Pending · 2 Decided`) integrated with dismissible active filter chips (`Center: CIP ×`, `Type: Policy change ×`).
   * **Space Savings:** Reduces pinned chrome height by over **45%** (from ~200px down to ~105px), maximizing data visibility above the fold.

---

## 4. Scope & Non-Goals

### In-Scope
* `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/`:
  * `bilateral-review.component.html`, `.ts`, `.scss` (Toolbar, filter band restructuring, sticky pinned chrome).
  * `components/bilateral-review-table/` (Container card architecture, group header redesign, result type badges, status pills, table row styling).
  * `components/bilateral-review-kpis/` (Stat ribbon integration).
  * `components/bilateral-review-center-strip/` (Compact integration or dropdown variant).
* Full responsiveness: Desktop (≥900px) and Mobile/Narrow (<900px card mode).
* Accessibility: Keyboard navigability, ARIA attributes (`aria-expanded`, `aria-label`), contrast compliance (WCAG 2.1 AA).
* Comprehensive unit tests update in Jest.

### Non-Goals
* Backend changes: No modifications to NestJS endpoints or DB schemas.
* Drawer internals: `ResultReviewDrawerComponent` internal review workflow remains untouched.
* Sister tabs: Changes are strictly scoped to the `bilateral-review` tab under entity details.

---

## 5. Affected Users, Systems, and Specs

* **Primary Users:** Science Program leads, bilateral project reviewers, Center reporting focal points.
* **Affected Specs:**
  * Builds on `docs/specs/archive/2026-09-08-changes--bilateral-review-viewport-and-table-polish/` (`BRV`)
  * Builds on `docs/specs/archive/2026-09-08-changes--sp-bilateral-review-tab/` (`BRT`)
  * Builds on `docs/specs/archive/2026-09-08-changes--bilateral-review-ux-polish/` (`BRP`)
* **Design Guidelines:**
  * `docs/ux-ui/design.md` §7 (tokens) & §8 (components)
  * `KZ-BOR-1`: Zero `#hex` color literals, zero new `pi pi-*` icons.
  * `KZ-changes--bilateral-review-viewport-and-table-polish-2`: Fixed `--pr-status-*` token pairs only.

---

## 6. Visual Reference & Design Exemplar

* **Primary Visual Reference (Target Screen to Refactor):**
  * File: `/var/folders/g8/8wqxv48d60737hm79glkxx0w0000gn/T/orca-paste-1788898610107-f8794d84-057e-4790-ae55-177c8fe37cb1.png`
  * Route: `http://qa-development-2026.orca.localhost:63760/result-framework-reporting/entity-details/SP01/bilateral-review?tocView=aows`
* **Direct Design Exemplar (Reporting Tab / Sibling Gold Standard):**
  * Route: `http://qa-development-2026.orca.localhost:63760/result-framework-reporting/entity-details/SP01?tocView=aows`
  * Key Exemplar Patterns to Mirror:
    * `reporting-aow-table`: Outer section card (`rounded-[12px] border border-[var(--pr-border)] bg-[var(--pr-surface-card)]`), rotating chevron button box (`flex h-6 w-6 rounded-md bg-white border border-slate-200 text-indigo-700 shadow-2xs`), monospace code chips, text-select + hover copy with tooltip (`content_copy` → `check text-emerald-600`), in-card breakdown toolbar (`h-[32px] bg-[var(--pr-surface-subtle)]`), and 3px left border status accents on rows (`border-l-[3px]`).
    * `reporting-program-band`: Compact 34px JIRA-style filter button with active count badge, clean multi-select popover, and dismissible active filter chips (`inline-flex h-[28px] items-center gap-[5px] rounded-[6px] border border-slate-200 bg-slate-100`).
* **Visual Blueprint:**
  ```text
  ┌────────────────────────────────────────────────────────────────────────────────────────┐
  │ Breeding for Tomorrow (SP01)                                                           │
  │ [Overview]  [Reporting]  [Results]  [★ Bilateral review (23)]  [My results]           │
  ├────────────────────────────────────────────────────────────────────────────────────────┤
  │ [🔍 Search...] [Filter (2) ▼] [All (47)|Pending (23)|Decided]     [Group: Proj|Ctr] [Expand]│
  │ [Center: CIP ×] [Type: Policy change ×] | 14 Proj · 8 Ctr · 23 Pend [Clear filters (×)]│
  ├────────────────────────────────────────────────────────────────────────────────────────┤
  │                                                                                        │
  │ ┌─ PROJECT CARD (Elevated Container) ────────────────────────────────────────────────┐ │
  │ │ [v] [T-PJ-003262]  Agribusiness training for young people...  [CIMMYT][IRRI][CIP]  │ │
  │ │                                              8 results · [ 6 PENDING REVIEW ]      │ │
  │ ├────────────────────────────────────────────────────────────────────────────────────┤ │
  │ │ In-Card Quick Filter: Centers: [All (8)] [CIMMYT (6)] [IRRI (1)] [CIP (1)]         │ │
  │ ├────────────────────────────────────────────────────────────────────────────────────┤ │
  │ │ CODE   TYPE & TITLE              LEAD CTR   STATUS     ALIGNMENT      DATE    ACTION   │ │
  │ │ 8594   [Policy Change]           CIMMYT   [Pending]   HLO1.AOW1...   6 Jul   [Review] │ │
  │ │        National seed policy...                                                       │ │
  │ │ 8596   [Innovation Use]          CIMMYT   [Pending]   HLO1.AOW1...   6 Jul   [Review] │ │
  │ │        Adoption of drought...                                                        │ │
  │ │ 8717   [Draft / Capacity]        IRRI     [Editing]   HLO1.AOW1...    —      [See]    │ │
  │ └────────────────────────────────────────────────────────────────────────────────────┘ │
  │                                                                                        │
  │ ┌─ PROJECT CARD (Collapsed) ─────────────────────────────────────────────────────────┐ │
  │ │ [>] [R-A-2012-35]  HRDC Project                       [IRRI]    6 results · 0 pend │ │
  │ └────────────────────────────────────────────────────────────────────────────────────┘ │
  └────────────────────────────────────────────────────────────────────────────────────────┘
  ```

---

## 7. Requirement Delta Preview

### ADDED Requirements
* **Hierarchical Container Cards (`BRH-R-1`):** Group rows rendered as elevated visual card containers (`rounded-[12px] border bg-[var(--pr-surface-card)]`) mirroring `reporting-aow-table`.
* **Separated Project Code Badge (`BRH-R-2`):** Monospace code badge (`font-mono text-[11.5px] font-bold px-2.5 py-0.5 rounded-md bg-indigo-100/80 text-indigo-800 border border-indigo-200/70`) decoupled from the title.
* **Text Selection & Quick Copy Actions (`BRH-R-3`):** Enabled text selection (`select-text cursor-text`) and added one-click copy buttons on hover (`content_copy` → `check text-emerald-600` with tooltip `Copied!`) for Project Code, Project Title, Result Code, and AoW Alignment.
* **Contributing Center Chips (`BRH-R-4`):** Contributing centers displayed as distinct badge chips in the group header.
* **Categorical Result Type Pills (`BRH-R-5`):** Distinct semantic color badges for Result Types (`Policy change`, `Innovation use`, `Capacity sharing`, `Knowledge product`, etc.).
* **Smart Default Progressive Disclosure (`BRH-R-6`):** Groups default to smart-collapsed (or smart-open only for groups with pending reviews), eliminating the 47-row wall of data.
* **Consolidated 2-Row Filter Bar (`BRH-R-7`):** Redesigned filter band integrating search, JIRA-style filter popover, status selector, and dismissible active filter chips, matching `reporting-program-band`.
* **In-Card Quick Breakdown Toolbar (`BRH-R-8`):** 32px quick filter bar inside expanded project cards with multi-center or multi-type results.

### MODIFIED Requirements
* **Table Row Presentation (`BRH-R-9`):** Refined typography, alternating row hovers, 3px left status border accents, and standardized `--pr-status-*` status pills across all rows (including drafts).
* **Action Button Affordance (`BRH-R-10`):** Action buttons visually differentiate between primary "Review" (brand accent styling) and secondary "See" (ghost styling).

### REMOVED Requirements
* **Sprawling 4-row filter layout (`BRH-R-11`):** Deprecates the separate 4-row filter stack in favor of the consolidated 2-row layout.
* **Flat un-nested group headers (`BRH-R-12`):** Deprecates the plain `<tr>` header that blended with regular table rows.

---

## 8. Approach Options

### Option A: Minimal CSS Polish (Keep flat table, adjust colors & borders)
* **Summary:** Retain the flat HTML table layout. Only change border colors, add badge classes to text, and adjust padding.
* **Trade-offs:** Fast to implement, but fails to create true hierarchical nesting. The page remains a flat spreadsheet and does not solve the cognitive overload of massive lists or the 4-tier filter sprawl.

### Option B: Elevated Hierarchical Card Architecture with Smart Disclosure (Recommended)
* **Summary:** Refactor the grouped view into modular container cards with dedicated group headers, mono project tags, center chips, semantic result type pills, and smart progressive disclosure. Streamline the filter area into a 2-tier sticky band.
* **Trade-offs:** Delivers the exact UX/UI requested by the user, aligns with modern PRMS patterns, and keeps all existing query params and testids intact. Requires template updates in `bilateral-review-table` and `bilateral-review`.

### Option C: Master-Detail Split Screen (Left Project Rail, Right Result Pane)
* **Summary:** Two-column layout where selecting a project on the left opens its results in a right-hand detail pane.
* **Trade-offs:** Highly structured, but breaks parity with other Science Program tabs, creates awkward horizontal scrolling on 13" laptops, and requires significant architectural restructuring.

---

## 9. Recommended Approach

**Option B** is strongly recommended. It directly addresses every point of the user's feedback:
1. **Hierarchy:** Explicit visual planes (Level 1: Container Card & Project Badge; Level 2: Center Chips & Metadata; Level 3: Nested Result Rows).
2. **Colors:** Categorical result type badges and standardized status pills provide instant visual scannability.
3. **Progressive Disclosure:** Smart collapsing eliminates the 47-row data dump while letting reviewers instantly jump to projects needing review.
4. **Filters:** Consolidating 4 rows into 2 clean rows restores over 90px of vertical space to the viewport.

---

## 10. Risks, Dependencies, and Open Questions

### Risks & Mitigations
* **Viewport Lock & Sticky Chrome:** Must maintain `--brv-pinned-h` dynamic measurement and `pr-viewport-page` so the single scroller contract is never compromised (`KZ-changes--bilateral-review-viewport-and-table-polish-1`).
* **Design System Strictness:** Zero `#hex` color literals (`KZ-BOR-1`) and zero unauthorized status colors (`KZ-changes--bilateral-review-viewport-and-table-polish-2`).

### Open Questions for User
1. **Default Group Expansion:** Do you prefer:
   - *Option 1 (Smart):* Expand only projects that have pending reviews, keep projects with 0 pending collapsed.
   - *Option 2 (All Collapsed):* Collapse all projects by default so the user sees a clean executive dashboard of all projects and expands on demand.
2. **Center Filter Representation:** In the filter bar, do you prefer a sleek multi-select dropdown for Centers, or a compact single-row chip scroller?

---

## 11. Success Criteria

* Unmistakable visual hierarchy from Center down to Result.
* Pinned filter chrome vertical height reduced by >40% (under 110px).
* Instant scannability of result types (colored badges) and review states.
* No horizontal layout breakage; complete responsiveness across desktop (≥900px) and mobile (<900px cards).
* 100% of Jest unit tests in `onecgiar-pr-client` pass.

---

## 12. Next Step

Upon approval of this proposal:
```bash
/akili-specify changes/bilateral-review-hierarchy-ux
```
