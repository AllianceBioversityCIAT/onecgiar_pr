# Kaizen Entry — changes/aow-filter-popover

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/aow-filter-popover` · Prefix `AFP` |
| Date | 2026-09-03 |
| Branch | `qa-development-2026` — **spec branch** (default pin `master`) |
| Archive Run | 1 |
| Approval Mode | `pre-approved` · Depth Full |
| Outcome | Complete — 3/3 tasks, 120/120 tests green; tree-table alignment and row compaction shipped |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 | tasks.md |
| Reviewer FAIL rework attempts | 0 | tests & verification |
| HALTs / FATAL_FAILs | 0 | verification |
| Pivots | 0 | — |
| PRODUCT_BUGs | 0 | — |
| Judgment-day severe findings | none recorded | — |
| Validation FAIL / WARN | 0 | 120/120 tests passing |
| `/akili-quick` escalations into this spec | 0 | — |
| Drift attributable | none | — |
| Budget | 3 tasks (S/M/S) | tasks.md |
| Defects escaping automated gates | 0 | — |

## Lessons

- **KZ-changes--aow-filter-popover-1 — Subgroup headers and row templates must share identical SCSS grid track variables to prevent visual column drift.** (Product + Methodology, Medium)
  - Root cause: `.pr-hlo-head` and `.pr-reporting-row` defined separate, independent grid track widths, gaps (16px vs 12px), and paddings (32px vs 24px), causing the `TARGET` and `ACHIEVED` columns to be visually crooked.
  - Evidence: Screenshot `media_1788479510394.png`, SCSS lines 24-71.
  - Fix & Standardization: Shared `$pr-reporting-tracks`, `$pr-reporting-gap`, and padding variables applied to `.pr-hlo-head`, `.pr-hlo-row`, and `.pr-reporting-row`.

## Noted, not a lesson

- **HLO level converted to tree-table row (`pr-hlo-row`):** Rather than a flex button with floating metrics, HLO is structured into the 8-column table grid, creating a cohesive tree-table hierarchy down through indicator rows.
- **Permanent removal of Next pending button:** Eliminated transient button from body actions and flat view cleanly without breaking navigation.

## Pending Items

All await the default-branch apply phase; nothing below was written on this branch.

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/ux-ui/design.md` → Table & Grid Layouts |
| Edit | Subheaders in nested accordion subtables MUST reuse the parent grid tracks and padding tokens via shared SCSS variables to prevent horizontal column misalignment. |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | root `CLAUDE.md` / `AGENTS.md` |
| Edit | Swept; no factual assertion falsified. |
| Severity | Low |
| Status | pending |
