# Kaizen Entry — bilateral/center-overview-pa-contribution

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/center-overview-pa-contribution` |
| Date | 2026-10-28 |
| Branch | qa-development-2026-ss (spec branch — no shared-file writes) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 8 (+ 3 post-T-8 follow-up commits) | tasks.md, execution.md |
| Reviewer FAIL rework attempts | 1 (CPA-T-4 attempt 1 — NO_PA group in Projects by P/A vs CPA-R-7) | execution.md — CPA-T-4 Attempt 1 |
| Live defects found at HITL after Reviewer PASS | 2 (P/A listbox keyboard; Projects by P/A axis labels illegible at 900/1280) | execution.md — CPA-T-8 completion checks, visual (T6) check |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a (no test-report.md) | — |
| Validation FAIL / WARN | n/a (no validation-report.md; accepted) | archive-summary.md |
| Budget | 8 tasks as planned; review rounds ≤ 2 per task | design.md §12 |

## Lessons

- **KZ-bilateral--center-overview-pa-contribution-1 — A categorical chart whose group count is data-driven shipped without an axis-label policy; jsdom-green specs could not see the overlap.** (Product, Medium)
  - Root cause: design.md §8 copied the vertical grouped-bar shape from the Portfolio `buildProjectsOption` (few groups) but stated no label policy for N P/As; IFPRI has 11, so full-name labels overlapped at 1280 and 900px. CPA-T-5/T-6 listed legibility as "Cannot prove" and deferred it to HITL, where it was the first time anyone looked.
  - Evidence: execution.md — "CPA-T-8 — visual (T6) check at 900 / 1280 px" and "CPA-T-5/T-6 rework (visual legibility)"; tasks.md CPA-T-5 "Cannot prove: rendered legibility".
  - Standardization: → P1
- **KZ-bilateral--center-overview-pa-contribution-2 — An action button placed inside a `role="listbox"` inherits the listbox key handler; a Reviewer advisory named it, but advisories cannot gate, so it reached the live check.** (Product, Medium)
  - Root cause: the custom P/A combobox put "Clear selection" inside the element whose keydown handler toggles the active option on Enter/Space, and option buttons were Tab stops. No client rule says a listbox owns only options.
  - Evidence: execution.md — CPA-T-6 ADVISORY "Reliability (keyboard)"; CPA-T-8 completion checks (Enter on Clear selection → `?program=SP11,SP06`); "CPA-T-6 rework (from CPA-T-8 keyboard finding)".
  - Standardization: → P2

## Noted, not a lesson

- tasks.md CPA-T-4 falsifier mixed two scenarios that cannot hold in one fixture (SP07 tagged = 2 vs P3 tagged by SP07); the Implementer split it, no rework. Watch for recurrence in `/akili-specify` falsifiers.
- CPA-T-4 FAIL was an Implementer miss against an explicit clause (CPA-R-7 "only in R-1"), not a spec gap.
- Shared checkout with another active spec session: an unrelated failing suite polluted `--findRelatedTests` once; `performance-refactor` moved twice during promotion. Coordination by cross-session message worked.
- CPA-T-6 took ~3h wall-clock on a machine with < 4 GB free RAM.
- Timing NFR inconclusive: no before-baseline captured before the server change shipped.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/CLAUDE.md` (Invariants, chart line) |
| Edit | Any category-axis chart whose group count comes from data (P/As, projects) MUST set `axisLabel { interval: 0, rotate, width, overflow: 'truncate' }` + a full-name tooltip, and its spec asserts that config; verify at 900 and 1280px before PASS. |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/CLAUDE.md` §5 "Interactive controls" |
| Edit | A custom `role="listbox"` owns only `role="option"` children with `tabindex="-1"` (roving via `aria-activedescendant`); actions such as "Clear selection" sit outside the listbox element so its key handler never sees them. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/CLAUDE.md` and `.../bilateral-results-list/CLAUDE.md` |
| Edit | Trim both under the 120-line cap of `docs/COMPONENT-DOCS.md` by collapsing the `prior:` chain of the `**Verified:**` stamp to the latest two entries (~125 and ~190 lines today). |
| Severity | Low |
| Status | pending |
