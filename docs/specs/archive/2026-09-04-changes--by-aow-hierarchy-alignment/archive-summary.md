# Archive Summary — 3-Level Visual Hierarchy & ToC Taxonomy Alignment in "By AOW" View

## Document Control

| Field | Value |
|---|---|
| Original Spec Path | `changes/by-aow-hierarchy-alignment` |
| Archive Path | `docs/specs/archive/2026-09-04-changes--by-aow-hierarchy-alignment/` |
| Feature Code | `BHA` |
| Module | `result-framework-reporting` / `dashboard-lab` |
| Archive Date | 2026-09-04 |
| Final Status | completed |
| Author | Antigravity AI / Juan Carlos Cadavid |
| Linked Baseline | `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md` |

---

## 1. Executive Summary

This specification successfully aligned the **"By AOW"** focused reporting view (`plannedBrowseView() === 'byAow'`) in `dashboard-lab` with the **3-Level Card-in-Card** visual hierarchy and institutional Theory of Change (ToC) taxonomy established across PRMS. 

Subsequent UI/UX Pro Max refinements elevated the layout into a **Unified Data Table Card** (`section.rounded-2xl`) with shared `$pr-by-aow-tracks` CSS grid alignment across column headers and data rows, removed redundant duplicate inline labels (`TARGET`, `ACHIEVED`), modernized top banner stat cards, and wired direct indicator row clicking to the primary reporting aside panel (`openReportAside`).

---

## 2. Requirements Delivered

| Requirement | Description | Status | Verification Evidence |
|---|---|---|---|
| `BHA-R-1` | Level 2 HLO Sub-Card Enclosure & Surface Contrast | Delivered | `dashboard-lab.component.html:1724`, `dashboard-lab.component.spec.ts:1825` |
| `BHA-R-2` | Institutional ToC Taxonomy Badges (`HLO`, `OC`, `I-OC`, `IO`) | Delivered | `dashboard-lab.component.ts:hloTaxonomy`, `dashboard-lab.component.spec.ts:1750` |
| `BHA-R-3` | Consolidated Micro-KPI Metric Cluster | Delivered | `dashboard-lab.component.html:1757-1795`, `dashboard-lab.component.spec.ts:1790` |
| `BHA-R-4` | Level 3 Indented Indicator Scaffolding (24px indent + indigo tree guide line) | Delivered | `dashboard-lab.component.html:1801`, `dashboard-lab.component.spec.ts:2050` |
| `BHA-R-5` | Contextual Column Sub-Header (`INDICATOR TITLE & TAXONOMY`, `TARGET`, `ACHIEVED`, `STATUS`, `PROGRESS`, `ACTION`) | Delivered | `dashboard-lab.component.html:1804`, `dashboard-lab.component.spec.ts:2065` |
| `BHA-R-6` | Standardized Indicator Row (18px concentric target bullseye 🎯 + JIRA status border stripes) | Delivered | `dashboard-lab.component.html:1835`, `dashboard-lab.component.scss:354`, `spec.ts:2075` |
| `BHA-R-7` | Action Button Event Isolation (`$event.stopPropagation()` on Report & Copy link) | Delivered | `dashboard-lab.component.html:1943,1951`, `dashboard-lab.component.spec.ts:2080` |
| `BHA-R-8` (Refinement) | Direct Indicator Row Click opens Reporting Aside Panel (`openReportAside`) | Delivered | `dashboard-lab.component.html:1830,1991,2022`, `dashboard-lab.component.spec.ts:1851,2080` |
| `BHA-NFR-1` | Responsive Layout & Viewport Safety (horizontal scroll container) | Delivered | `dashboard-lab.component.html:1707,1800` |
| `BHA-NFR-2` | Accessibility & Keyboard Navigation (`role="button"`, `tabindex="0"`, `Enter`/`Space`) | Delivered | `dashboard-lab.component.html:1827-1832`, `dashboard-lab.component.spec.ts:1851` |
| `BHA-NFR-3` | Deeplink & Scroll Anchor Protection (`[id]="kpiDomId(ind)"`, `highlightedKpiId`) | Delivered | `dashboard-lab.component.html:1818-1821`, `dashboard-lab.component.ts:3220` |
| `BHA-NFR-4` | Zero Regression Across 980+ Existing Dashboard Lab Tests | Delivered | 982/982 passed across 26 test suites |

---

## 3. Files Changed Summary

1. `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.ts`:
   - Enhanced `cleanHloCode` regex to parse numeric prefixes like `1.1:`, `1.1`, `2.4.1` and spaced prefixes (`HLO 1.1`, `IO 2.1`).
   - Implemented `hloTaxonomy(hlo, section)` helper returning institutional ToC categories (`HLO`, `OC`, `I-OC`, `IO`).
   - Added `lucideChevronDown` icon to component imports.
2. `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.html`:
   - Enclosed sections in unified table card `section.rounded-2xl.border.border-slate-200/90.bg-white.shadow-xs.overflow-hidden`.
   - Replaced floating cards with `.pr-by-aow-head` and `.pr-by-aow-row` sharing `$pr-by-aow-tracks` CSS grid.
   - Replaced redundant labels with `TITLE & TAXONOMY` and pure tabular data cells.
   - Enclosed Level 3 indicators in indented scaffolding container (`pl-4 sm:pl-6 border-l-4 border-indigo-500/40 bg-indigo-50/10`).
   - Wired indicator row click (`(click)="openReportAside(ind)"`) to open the reporting aside directly with keyboard accessibility.
   - Modernized top AoW context banner stats cards with high contrast and emerald gradient progress.
3. `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.scss`:
   - Added Level 3 track definitions (`$pr-by-aow-indicator-tracks`, `$pr-by-aow-indicator-gap`, `$pr-by-aow-indicator-pad`).
   - Styled `.pr-by-aow-indicator-row` with `cursor: pointer`, hover transitions, and bottom dividers.
   - Styled `.pr-status-mark` for 18px concentric target mark and status-specific coloring.
4. `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.spec.ts`:
   - Updated and added unit tests for `cleanHloCode`, `hloTaxonomy`, unified table column headers, Level 3 indented scaffolding, accessibility attributes, and action button event isolation.
5. `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/CLAUDE.md`:
   - Documented the UI/UX Pro Max unified table layout architecture and 3-level Card-in-Card hierarchy.

---

## 4. Test Evidence Summary

- **Component Tests (`dashboard-lab.component.spec.ts`):** 63/63 passed.
- **Full Module Regression (`dashboard-lab/`):** 982/982 passed across 26 test suites.
- **Client Linter (`ng lint --quiet`):** Clean (0 errors, 0 warnings).

---

## 5. Validation Summary

- **Design Tokens:** Strict adherence to PRMS tokens (`--pr-color-primary-*`, `--pr-color-green-*`, Tailwind `slate-*`, `indigo-*`).
- **WCAG 2.1 AA:** Passed (keyboard navigation with `Enter`/`Space`, visible focus rings `focus-visible:ring-2`, accessible labels on icons and action buttons).
- **Event Isolation:** Confirmed via live DOM simulation tests (`$event.stopPropagation()` on interactive child buttons).

---

## 6. Accepted Warnings Or Follow-Ups

- None. All requirements delivered with zero residual defects.
