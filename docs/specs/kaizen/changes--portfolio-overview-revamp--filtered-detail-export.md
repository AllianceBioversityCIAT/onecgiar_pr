# Kaizen Entry — changes/portfolio-overview-revamp/filtered-detail-export

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-revamp/filtered-detail-export` |
| Date | 2026-10-16 |
| Branch | qa-development-2026-ss (spec branch; default is `master`) |
| Archive Run | 1 |
| Approval Mode | gated (the user said "continua hasta que termines") |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 4 | tasks.md |
| Reviewer FAIL rework attempts | 1 (T-2: the saved file name) | execution.md, FDE-T-2 attempt 1 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 1 (FDE-P-5 → FDE-DD-9 `exactFileName`, user-approved) | execution.md, Pivot Record FDE-T-2 |
| Defects reaching HITL | 0 real; 1 false positive (tooltip) that reopened T-2 | execution.md, FDE-T-4 and T-2 attempt 3 |
| Budget | production ≈ 566 vs ≈ 230 LOC (tripwire fired, user accepted); review rounds 6 vs ≤ 5 | execution.md, FDE-T-2 and Summary |
| Validation FAIL / WARN | n/a; no validation-report; T-4 HITL passed | execution.md |
| Reviewer runtime failures | 2 (Opus rate limit); fallback `haiku` | execution.md, T-2 attempt 3 |

## Lessons

- **KZ-changes--portfolio-overview-revamp--filtered-detail-export-1 — A premise about a shared helper's observable output must be traced to the final sink, and the test must assert at that sink.** (Product, High)
  - Root cause: FDE-P-5 read `ExportTablesService.exportExcel` (lines 29-70) and stopped before `saveAsExcelFile`, which appends `_<epoch×10>.xlsx`. The component spec mocked `exportExcel`, so it asserted only the argument; the real file would have been `….xlsx_<ts>.xlsx`. Caught by the Reviewer, not by tests.
  - Evidence: execution.md — FDE-T-2 attempt 1 Reviewer FAIL; design.md FDE-P-5 (corrected).
  - Standardization: → P1
- **KZ-changes--portfolio-overview-revamp--filtered-detail-export-2 — In a browser check, a directive bound by property (`[hlmTooltip]="…"`) leaves no DOM attribute, so an attribute selector reports it missing.** (Product, Medium)
  - Root cause: the Leader verified the title tooltip with `[hlmTooltip],[title]` selectors. Angular writes no attribute for a property binding, so the check read "absent", reopened T-2 and spent a sixth review round. Hovering (or `ng.getDirectives(el)`) showed the overlay.
  - Evidence: execution.md — FDE-T-4 "Title tooltip" row and FDE-T-2 attempt 3 "Leader correction".
  - Standardization: → P2

## Noted, not a lesson

- Budget recurrence: #6 global-filters ran ≈ 2× LOC, and #9 ran ≈ 2.5× on production code (template + a11y markup sized as one ≈ 120-line item). Second occurrence in this family; if a third spec repeats it, the estimate rule for UI tables deserves a lesson.
- A first layout read during page load showed page-level horizontal scroll at 768 / 1280; after layout settled there was none. Measure after the data and skeletons resolve.
- The extension's synthetic Tab moved focus to `body`, so a keyboard walk could not be automated; the user did it.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/src/CLAUDE.md`, shared services / gotchas |
| Edit | Add: "`ExportTablesService.exportExcel` saves `<name>_<timestamp>.xlsx` unless called with `{ exactFileName: true }` (5th arg). When a spec fixes the file name, pass the flag and assert at `FileSaver.saveAs`, not on the mocked `exportExcel` argument (filtered-detail-export, 2026-10-16)." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/CLAUDE.md`, Gotchas |
| Edit | Add: "Browser checks: property-bound directives (`[hlmTooltip]`) leave no DOM attribute. Verify by hover or `ng.getDirectives(el)`, never by attribute selector (filtered-detail-export T-4 false positive)." |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | root `CLAUDE.md` / `AGENTS.md` |
| Edit | None found falsified by this cycle (client-only feature inside an existing page; no new module, command or stack change). Recorded for traceability. |
| Severity | Low |
| Status | pending |
