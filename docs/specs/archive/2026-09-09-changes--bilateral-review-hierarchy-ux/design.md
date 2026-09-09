# Design: Bilateral Review — Visual Hierarchy, Semantic Colors, Progressive Disclosure & Filter UX Elevation

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-review-hierarchy-ux` |
| Prefix | `BRH` |
| Type | `Change` |
| Approval Mode | `gated` |
| Inherited Depth | `Standard` |
| Author | Antigravity AI Assistant & Juan Carlos Cadavid |
| Date | 2026-09-08 |
| Status | In-Review (Phase 2 Complete) |

---

## 1. Executive Summary

This document specifies the technical architecture, component decomposition, visual design tokens, and state flows for the **Bilateral Review** refactor (`changes/bilateral-review-hierarchy-ux`). 

The design establishes **strict design and structural parity with the Science Program Reporting tab** (`reporting-aow-table` and `reporting-program-band`):
1. **Hierarchical Card Architecture (`BRH-DD-1`):** Replaces the PrimeNG table-row grouping with autonomous, elevated section cards (`rounded-[12px] border border-[var(--pr-border)] bg-[var(--pr-surface-card)] shadow-xs overflow-hidden`).
2. **52px Header & Monospace Code Extraction (`BRH-DD-2`):** Isolates the Project Code into a monospace tag (`font-mono font-bold bg-indigo-100 text-indigo-800`), extracts contributing centers into chips, and attaches a smooth rotating chevron button box.
3. **Smart Progressive Disclosure Engine (`BRH-DD-3`):** Intelligently expands groups with `pendingCount > 0` on cold load while keeping 0-pending groups collapsed, backed by the existing namespaced `expandedKeys` Set.
4. **Categorical Result Type Tokens & Status Accents (`BRH-DD-4`):** Applies semantic color pills to result types and adds a 3px peripheral status border accent (`border-l-[3px]`) to every table row.
5. **Micro-Interactions & Hover Copy Engine (`BRH-DD-5`):** Enables text selection and a transient copy-to-clipboard button with visual checkmark feedback (`content_copy` → `check text-emerald-600`).
6. **Consolidated 2-Row Filter Band (`BRH-DD-6`):** Compacts the toolbar and filter layers into a 2-tier pinned bar (≤110px total height), recovering >90px of vertical viewing space.

---

## 2. Architecture Overview

### 2.1 System Placement & Component Hierarchy

The changes live entirely within the Angular frontend (`onecgiar-pr-client`), specifically under `result-framework-reporting/pages/bilateral-review/`:

```text
BilateralReviewComponent (host: pr-viewport-page)
├── ReportingProgramBandComponent (activeTab="bilateral-review", frameLocked=true)
└── #workArea (.custom_scroll, min-[900px]:overflow-y-auto)
    ├── #pinnedWrapper (position: sticky, top: 0, z-[15], ≤110px)
    │   ├── Row 1: Consolidated Controls Toolbar
    │   │   ├── Search Input + Match Count Badge
    │   │   ├── JIRA-style [Filter (N)] Button & Popover
    │   │   ├── Status Segmented Control (All / Pending / Decided)
    │   │   ├── Grouping Mode Toggle (Project | Center)
    │   │   ├── View Mode Toggle (Grouped | Flat)
    │   │   └── Global [Expand all / Collapse all]
    │   └── Row 2: Metric Ribbon & Active Filter Chips
    │       ├── KPI Summary Stats (Projects, Centers, Pending, Decided)
    │       ├── Active Filter Dismissible Chips (Center, Type, Category)
    │       └── [Clear all filters] Action
    │
    └── Table & Results Body (.px-8, .pb-6)
        └── BilateralReviewTableComponent
            ├── Grouped Mode (Desktop ≥900px)
            │   └── @for group of filteredGroups()
            │       └── Section Container Card (.rounded-xl, .border, .shadow-xs)
            │           ├── 52px Header Bar (Chevron box, Mono Code, Title, Copy btn, Center chips, Metric badge)
            │           ├── In-Card Quick Filter Toolbar (optional 32px bar for multi-center/type cards)
            │           └── Nested Results Table
            │               ├── thead (Code, Type & Title, Lead Center, Status, Alignment, Date, Actions)
            │               └── tbody: @for row of group.results
            │                   └── Result Row (3px left status border, Type pill, Status pill, Primary CTA)
            │
            ├── Flat Mode (Desktop ≥900px)
            │   └── Single <table> with sortable headers and shared row template
            │
            └── Narrow Mode (<900px)
                └── Card List (@for group -> @for result -> result card with 44px touch targets)
```

### 2.2 Interaction Flow: Group Toggle & Copy Actions

```text
[User clicks Group Header Toggle]
  ├── (click) calls onToggleGroup(group, wasExpanded)
  ├── Updates userCollapsedKeysFor(currentMode)
  ├── Updates namespaced expandedKeys Signal ("project::T-PJ-003262")
  └── Angular signals recompute expandedRowKeys() -> card animates open/close

[User clicks Hover Copy Icon]
  ├── (click) calls copyText(text, key, $event)
  ├── $event.stopPropagation() prevents card toggle or row click
  ├── navigator.clipboard.writeText(text)
  ├── copiedKey.set(key) -> triggers icon change (content_copy -> check text-emerald-600)
  └── setTimeout(2000ms) -> resets copiedKey to null
```

---

## 3. Data Model & State Architecture

### 3.1 Extended Group Interface

The group interface consumed by `BilateralReviewTableComponent` is enriched with parsed metadata:

```typescript
export interface BilateralReviewGroup {
  key: string;
  label: string;
  caption: string | null;
  center: string | null;
  results: ResultToReview[];
}

export interface ParsedProjectHeader {
  code: string | null;        // e.g. "T-PJ-003262"
  title: string;              // e.g. "An innovative approach to agribusiness..."
  contributingCenters: string[]; // e.g. ["CIMMYT", "IRRI", "CIP"]
}
```

### 3.2 State Signals in `BilateralReviewTableComponent`

* `readonly expandedKeys = signal<Set<string>>(new Set())`: Single source of truth for expanded group keys, namespaced by mode (`${mode}::${group.key}`).
* `readonly copiedKey = signal<string | null>(null)`: Tracks which element was just copied to display transient checkmark feedback.
* `readonly inCardCenterFilter = signal<Map<string, string | null>>(new Map())`: Tracks local center filter per project card key.
* `readonly inCardTypeFilter = signal<Map<string, string | null>>(new Map())`: Tracks local result type filter per project card key.

---

## 4. Frontend Component Architecture & Design Tokens

### 4.1 Group Header Visual Architecture (52px)

The card header strictly adheres to the visual grammar established in `reporting-aow-table:319-492`:

| Element | Specifications & Tailwind Classes | Purpose |
|---|---|---|
| **Header Container** | `flex h-[52px] min-h-[52px] w-full items-center gap-[10px] bg-[var(--pr-surface-card)] px-[16px] sm:px-[20px] rounded-t-[12px] cursor-pointer hover:bg-[var(--pr-surface-subtle)] transition-colors border-b` | Provides click target and card header structure |
| **Chevron Box** | `flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white border border-slate-200/80 text-indigo-700 shadow-2xs` + `transition-transform duration-200` (`rotate-180` when open) | Authoritative expand/collapse cue |
| **Project Code Chip** | `font-mono text-[11.5px] font-bold px-2.5 py-0.5 rounded-md bg-indigo-100/80 text-indigo-800 border border-indigo-200/70 shrink-0` | Isolates project identifier (`T-PJ-003262`) |
| **Project Title** | `text-[13.5px] font-bold text-[var(--pr-text-heading)] truncate cursor-text select-text` | Clean title display with text selection |
| **Copy Button** | `flex h-5 w-5 shrink-0 items-center justify-center rounded border-0 bg-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors` | Quick copy interaction |
| **Center Chips** | `inline-flex items-center rounded-[5px] bg-slate-100 border border-slate-200 px-[6px] py-[1.5px] text-[11px] font-medium text-slate-700` | Distinct contributing center badges |
| **Results Count** | `text-[12px] font-medium text-[var(--pr-text-secondary)] tabular-nums` | Total results count (e.g. "8 results") |
| **Pending Badge** | `px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold tabular-nums` (when >0 pending) | Actionable pending review alert |

### 4.2 Categorical Result Type Tokens

Result types are color-coded using semantic token ramps:

| Result Type | Badge Background | Badge Text | Badge Border |
|---|---|---|---|
| **Policy Change** | `bg-violet-50` | `text-[var(--pr-color-primary-700)]` | `border-violet-200` |
| **Innovation Use** | `bg-emerald-50` | `text-emerald-700` | `border-emerald-200` |
| **Innovation Development** | `bg-teal-50` | `text-teal-700` | `border-teal-200` |
| **Capacity Sharing for Dev** | `bg-amber-50` | `text-amber-800` | `border-amber-200` |
| **Knowledge Product** | `bg-sky-50` | `text-sky-700` | `border-sky-200` |
| **Other Output / Outcome** | `bg-slate-100` | `text-slate-700` | `border-slate-200` |

### 4.3 Standardized Status Badges & 3px Row Left Border Accent

Strict compliance with `KZ-changes--bilateral-review-viewport-and-table-polish-2`:

| Status | Status Pill Classes | Row 3px Left Border Accent |
|---|---|---|
| **Pending Review** | `bg-[var(--pr-status-in-progress-bg)] text-[var(--pr-status-in-progress-fg)]` | `!border-l-[var(--pr-status-in-progress-fg)]` (amber) |
| **Approved** | `bg-[var(--pr-status-approved-bg)] text-[var(--pr-status-approved-fg)]` | `!border-l-[var(--pr-status-approved-fg)]` (emerald) |
| **Rejected** | `bg-[var(--pr-danger-bg)] text-[var(--pr-danger)]` | `!border-l-[var(--pr-danger)]` (red) |
| **Editing / Draft** | `bg-[var(--pr-status-not-started-bg)] text-[var(--pr-status-not-started-fg)]` | `!border-l-[var(--pr-border)]` (neutral slate) |

### 4.4 Consolidated 2-Row Filter Band Architecture

Replaces the 4-tier vertical stack with two compact rows:

* **Row 1 (Height: ~46px):**
  * `Search Input` (240px width) with search icon, clear button, and `N matches` badge.
  * `Filter Button` (34px height) style JIRA with active count badge, opening popover with multi-selects for Centers, Projects, and Categories.
  * `Status Segmented Control` (32px height) with counts: `All (47)`, `Pending (23)`, `Approved (1)`, `Rejected (1)`.
  * Right cluster: `Group by: [Project | Center]`, `View: [Grouped | Flat]`, and `[Expand all / Collapse all]`.
* **Row 2 (Height: ~36px):**
  * KPI Metric ribbon (`14 Projects · 8 Centers · 23 Pending Review · 2 Decided`).
  * Dismissible active filter chips (`Center: CIP ×`, `Type: Policy change ×`).
  * Dynamic `Clear all filters` action.

---

## 5. Design Decisions (ADR Style)

### `BRH-DD-1`: Replace PrimeNG Group Table with Modular Card Containers
* **Context:** The existing implementation uses `app-pr-group-table` (`PrGroupTableComponent`), which projects `<tr>` rows and suffers from ambient `:host ::ng-deep .pr-table tbody td` style leaks (`pr-table.component.scss`), preventing true card elevation and clean borders.
* **Decision:** Implement grouped rendering directly as a sequence of elevated `<section class="rounded-[12px] border border-[var(--pr-border)] bg-[var(--pr-surface-card)] shadow-xs">` container cards containing an inset `<table>` for results, matching `reporting-aow-table`.
* **Alternatives Rejected:** Overriding PrimeNG CSS with `!important` utilities on `<tr>` tags (fragile, leaks borders, fails to give rounded card bounds).
* **Kaizen Citation:** `KZ-changes--bilateral-review-viewport-and-table-polish-1` & `KZ-BOR-1`.

### `BRH-DD-2`: Smart Progressive Disclosure on Initial Load
* **Context:** Currently, all groups are expanded by default (`allExpanded: true`), resulting in 50+ rows displayed on screen at once.
* **Decision:** On cold boot, initialize expansion so only groups with `pendingCount > 0` are open; groups with 0 pending results default to collapsed.
* **Preservation:** A manual user expand/collapse or global `[Expand All / Collapse All]` continues to override defaults via `expandAllNonce`.

### `BRH-DD-3`: Monospace Badge Extraction for Project Codes
* **Context:** Projects have concatenated strings like `T-PJ-003262-An innovative approach...`.
* **Decision:** A helper function `parseProjectIdentifier(label)` separates the prefix code matching `^[A-Z0-9-]+(?=-)` from the descriptive title, rendering the code inside an authoritative monospace chip.

### `BRH-DD-4`: Micro-Interactions & Transient Copy Feedback
* **Context:** Users frequently need to copy project codes, result titles, and alignment strings.
* **Decision:** Add a reusable `copyText(text, key, event)` method that writes to `navigator.clipboard`, sets a transient signal `copiedKey`, and displays a checkmark for 2000ms with tooltip confirmation.

### `BRH-DD-5`: 2-Row Consolidated Filter Band
* **Context:** The filter band currently stacks Search, Filter Popover, Status chips, Center strip, and KPI text across 4 vertical lines (~200px), wasting viewport height.
* **Decision:** Consolidate into 2 rows: Controls in Row 1, Metrics and Active Chips in Row 2, maintaining dynamic ResizeObserver tracking (`--brv-pinned-h`).

---

## 6. Challenge Reversions (Step 2.3)

* **Challenge:** Does replacing `app-pr-group-table` with direct section cards break PrimeNG table internal state or testids?
* **Analysis:** `PrGroupTableComponent` was only acting as an accordion wrapper with `dataKey="key"`. `BilateralReviewTableComponent` already maintains its own `expandedKeys` signal and `expandedRowKeys` computed dictionary.
* **Action:** Keep all existing `data-testid` attributes (`bilateral-review-table`, `bilateral-review-group-toggle`, `bilateral-review-group-name`, `bilateral-review-row-code`, `bilateral-review-row-status`, etc.) on the new card elements so existing test suites continue to pass without selector breakage.

---

## 7. Budget & Sizing (Step 2.4)

* **Declared Depth:** Standard
* **Expected Tasks:** 3 executable tasks:
  1. `BRH-T-1`: Consolidated 2-Row Filter Band & Sticky Header (`BilateralReviewComponent`).
  2. `BRH-T-2`: Hierarchical Card Containers, 52px Header, Monospace Code & In-Card Filter (`BilateralReviewTableComponent`).
  3. `BRH-T-3`: Semantic Result Type Badges, Status Standardization, Row Accent & Copy Engine (`BilateralReviewTableComponent`).
* **Expected LOC:** ~380–450 lines of template and component code; ~300 lines of test updates.
* **Expected Review Rounds:** 1–2 rounds per task.
* **Tripwire:** If tasks exceed 3 or source diff exceeds 600 LOC, halt and escalate.
