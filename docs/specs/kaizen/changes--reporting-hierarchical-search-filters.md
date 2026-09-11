# Kaizen Retrospective — Deep Hierarchical Search, Result-Type Quick Filters & Reporting Navigation State Preservation

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/reporting-hierarchical-search-filters` |
| Date | 2026-09-06 |
| Branch | `qa-development-2026` (spec branch; pin `master`) |
| Archive Run | 1 |
| Approval Mode | gated |

---

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 5 (`RHSF-T-1` through `RHSF-T-5`) all PASS attempt 1 | `tasks.md`, `execution.md` |
| Reviewer FAIL rework attempts | 0 | `execution.md` |
| HALTs / FATAL_FAILs | 0 | `execution.md` |
| Pivots | 0 | `execution.md` |
| PRODUCT_BUGs | 0 | component unit tests (1115/1115 passing) |
| Judgment-day severe findings | 2 (resolved during specify: `JD-01`, `JD-05`) | `judgment.md`, `design.md` |
| Validation FAIL / WARN | 0 / 0 | `execution.md` |
| `/akili-quick` escalations | 0 | `proposal.md` |
| Drift attributable | none — `docs/specs/audits/` holds no report | — |

---

## Lessons

- **KZ-changes--reporting-hierarchical-search-filters-1 — Expose Public Coordination Hooks on Nested View Components Before Calling Them from Parent Reactive Effects.** (Product + Architecture, Low)
  - Root cause: In cross-component coordination patterns (e.g. parent dashboard orchestrating scroll and focus recovery on a target indicator row rendered inside a child table), calling `table.highlightRow(...)` failed TypeScript compilation (TS2339) because the coordinator method had not yet been declared on `ReportingAowTableComponent`. Public coordinator methods must be defined on child view components as part of their component contract before writing parent orchestration logic.
  - Evidence: `dashboard-lab.component.ts:1203:14` TS2339 error resolved by declaring `highlightRow(targetKey: string)` in `ReportingAowTableComponent`.
  - Standardization: → P1

---

## Noted, not a lesson

- **`linkedSignal` dynamic source keys provide zero-boilerplate state invalidation:** Appending `${this.search().trim()}` to the `overrides` linkedSignal source key cleanly and automatically flushes manual node expansions when search queries change without needing manual cleanup logic.
- **`untracked()` with inequality guards prevents reactive router loops:** Isolating `router.navigate(..., { replaceUrl: true })` inside `untracked()` combined with strict inequality checks (`if (q !== this.plannedSearch())`) cleanly eliminates circular router event updates.

---

## Pending Items

All await the default-branch apply phase; nothing below was written on this branch.

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` → §4 Component Architecture |
| Edit | When designing parent-child component coordination, explicitly document public child coordinator methods before orchestrating parent effects. |
| Severity | Low |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/AGENTS.md` |
| Edit | Document `SmartNavigationService` reporting tab origin tracking and query parameter retention patterns. |
| Severity | Low |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | root `CLAUDE.md` / `AGENTS.md` |
| Edit | Factual claims sweep passed; no assertions falsified by this cycle. |
| Severity | Low |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | trd-adr |
| Target | `docs/trd/trd.md` |
| Edit | None; client navigation and hierarchical filtering adhere to existing architecture without new ADR requirements. |
| Severity | Low |
| Status | pending |
