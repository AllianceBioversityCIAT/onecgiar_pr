# Kaizen Retrospective — 3-Level Visual Hierarchy & ToC Taxonomy Alignment in By-AOW

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/by-aow-hierarchy-alignment` |
| Date | 2026-09-04 |
| Branch | `qa-development-2026` (spec branch; pin `master`) |
| Archive Run | 1 |
| Approval Mode | gated |

---

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 | tasks.md (`BHA-T-1`, `BHA-T-2`, `BHA-T-3`) |
| Reviewer FAIL rework attempts | 1 | execution.md (`BHA-T-2` attempt 1: a11y attributes added) |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | 0 | component unit tests |
| Judgment-day severe findings | 0 | design.md |
| Validation FAIL / WARN | 0 / 0 | execution.md |
| Post-execution refinements | 2 | UI/UX Pro Max unified table + direct row click to report aside |

---

## Lessons

- **KZ-changes--by-aow-hierarchy-alignment-1 — Direct Indicator Row Click in Reporting Data Tables Must Trigger the Primary Workflow Action (Report Aside) Rather Than Redundant Expand/Collapse State.** (Product + UX Design, Medium)
  - Root cause: In earlier iterations, indicator rows had an accordion toggle (`toggleKpi`) to expand full descriptions. However, description expansion had already been separated into dedicated "Read more" buttons with isolated click propagation. Leaving `toggleKpi` on the row container made clicking an indicator a confusing state change instead of launching the primary reporting flow (`openReportAside`), which is the standard action across the reporting suite.
  - Evidence: User prompt *"cuando presione click en el indicador deberia abrir el panel de reporte"*, `dashboard-lab.component.html:1830`, `dashboard-lab.component.ts:3624`.
  - Standardization: → P1 (local) · upstream to AKILI UI/UX interaction guidelines for reporting tables.

- **KZ-changes--by-aow-hierarchy-alignment-2 — Unified Data Tables Require Shared CSS Grid Tracks Between Header and Body Rows to Prevent Metric Misalignment.** (Product + CSS Architecture, Low)
  - Root cause: When data rows are rendered as separate floating cards using flexbox justify-between, numbers drift horizontally and fail to align under the table's column headers (TARGET, ACHIEVED, KPIS, PROGRESS). Wrapping them in a single unified table container sharing `$pr-by-aow-tracks` (`28px minmax(240px, 1fr) 76px 76px 64px 130px`) guarantees strict vertical column alignment.
  - Evidence: User screenshot comparing floating cards vs unified table, `dashboard-lab.component.scss:310`, `dashboard-lab.component.html:1709`.
  - Standardization: → P2 (local).

---

## Noted, not a lesson

- **Modernized banner metric cards elevate visual contrast and scanability:** Upgrading the top AoW context banner stats from flat gray blocks to high-contrast cards with bold tabular figures and emerald gradient progress bars significantly improved visual hierarchy.
- **Strict event isolation protects row-level primary actions:** Using `$event.stopPropagation()` on secondary interactive buttons (`copyKpiLink`, `toggleKpiDescription`, and the explicit `Report` CTA) ensures that clicking child elements never triggers duplicate or conflicting interactions on the row.

---

## Pending Items

All await the default-branch apply phase; nothing below was written on this branch.

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/ux-ui/design.md` → §8 Components / Reporting Tables |
| Edit | Add: "In result reporting data tables, clicking an indicator row must launch the primary reporting flow (openReportAside) directly, while secondary actions (copy link, text disclosure) must isolate click propagation via stopPropagation." |
| Severity | Medium |
| Status | pending |
| Upstream | AKILI methodology — UI interaction pattern rules |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/ux-ui/design.md` → §7 Design Tokens / Grid Systems |
| Edit | Add: "Tabular card views must share exact CSS Grid track variables across column headers and body rows to prevent horizontal metric drift." |
| Severity | Low |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/CLAUDE.md` |
| Edit | Already updated: "Documented UI/UX Pro Max unified table layout architecture and 3-level Card-in-Card hierarchy." |
| Severity | Low |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | root `CLAUDE.md` / `AGENTS.md` |
| Edit | Factual claims sweep passed; no assertions falsified by this cycle. |
| Severity | Low |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | trd-adr |
| Target | `docs/trd/trd.md` |
| Edit | No ADR overturned. Pure client presentation and card-in-card visual hierarchy refinement. |
| Severity | Low |
| Status | pending |
