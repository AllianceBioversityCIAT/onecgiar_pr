# Archive Summary — ToC KPI block: disclose KPIs with no target

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `changes/portfolio-overview-revamp/toc-kpi-no-target-disclosure` (family child #11) |
| Archive date | 2026-10-22 |
| Branch | `qa-development-2026-ss` (spec branch; `Default Branch: master`) |
| Commits | `b9ea5e87b` server · `134c87e02` client · `cee50cfc1` spec docs (pushed 2026-10-22) |
| Owner | santiago.sanchez@cgiar.org |

## 2. Original Spec Path

`docs/specs/changes/portfolio-overview-revamp/toc-kpi-no-target-disclosure/`

## 3. Archive Date

2026-10-22

## 4. Final Status

**Done.** One item is still open: performance on PRTest (TND-NFR-1).

| Task | Result |
|---|---|
| TND-T-1 Server `noTarget` | ✅ PASS on attempt 1 |
| TND-T-2 Client lines and copy | ✅ PASS on attempt 1 |
| TND-T-3 Verification (HITL) | ✅ The user accepted parity and layout. ⏳ Performance waits for the PRTest deploy |

## 5. Requirements Delivered

| Requirement | Delivered by |
|---|---|
| TND-R-1 `noTarget` in the endpoint (S-1.1 to S-1.5) | `LEFT JOIN` on targets, conditional counts, service roll-up, DTO field |
| TND-R-2 Disclosure lines (S-2.1 to S-2.4) | Summary and row lines `excludes N KPI(s) with no target set` |
| TND-R-3 Empty and zero states (S-3.1 to S-3.3) | `noTargetOnly(n)` and `emptyNoTarget(n)` |
| TND-R-4 Subtitle (S-4.1) | "…out of the KPIs with a target…" |
| TND-NFR-2 Layout | No overflow at 1280, 768 and 375. The 768 and 375 checks were emulated |
| TND-NFR-3 Bound params, `debug: false` | Kept |
| TND-NFR-4 Plain text, no role or tabindex | Asserted in the spec and seen live |
| TND-NFR-1 p95 ≤ 1700 ms | ⏳ Pending on PRTest. Local reference: 757, 758 and 771 ms |

## 6. Files Changed Summary

| Package | Files | Change |
|---|---|---|
| server | `aow-bilateral.repository.ts` + spec | `LEFT JOIN tgt`, `total` / `covered` / `no_target` conditions, mapping |
| server | `results-framework-reporting.service.ts` + spec | `noTarget` in seeds, `addCounts` and the program and portfolio roll-up |
| server | `dto/portfolio-toc-coverage.dto.ts` | `noTarget` on `TocKpiCountsDto` |
| client | `portfolio-toc-coverage.interface.ts` | `noTarget?` (optional, DD-3) |
| client | `toc-kpi.format.ts` + spec | `noTarget ?? 0` in `toViewRows` / `toSummary`, and `sumRows` |
| client | `toc-kpi-block.component.{ts,html}` + spec | `visibleNoTarget`, disclosure lines, zero row, empty state |
| client | `portfolio-overview.copy.ts` | Subtitle plus 3 copy functions |

About 330 LOC in total: server about 140, client about 190, most of it in specs.

## 7. Test Evidence Summary

- Server: scoped Jest 219/219, and `--findRelatedTests` before the push 71 suites / 2340 tests. Both runs were red first, and both must-fail inputs were proved.
- Client: `toc-kpi` 67/67 and `portfolio-overview` 456/456.
  - `--findRelatedTests` gave 441/442 suites. The single failure is a pre-existing timing flake in `global-completeness-status.component.spec.ts`, which passes 19/19 when run alone.
- No `test-report.md`: `/akili-test` was not run. The user accepted this absence by asking to archive.

## 8. Validation Summary

- No `validation-report.md`: `/akili-validate` was not run. The user accepted this absence by asking to archive.
- Live parity on prdb, version 36, year 2026, phase `7baf200a…`:
  - For all 13 Science Programs, the independent query matches the endpoint per category.
  - The portfolio comes to 2452 with a target and 137 without, so 2589 in scope.
  - No Accelerator has ToC rows in this phase.

## 9. Accepted Warnings Or Follow-Ups

| # | Follow-up | Owner / where |
|---|---|---|
| 1 | Performance on PRTest: 3 calls, p95 ≤ 1700 ms | User, after the `performance-refactor` deploy |
| 2 | `portfolio-overview/CLAUDE.md` line 116 still says "total = 0 reads No ToC KPIs in this phase" and has no note on `noTarget` | kaizen P1 (guide-sync, pending) |
| 3 | The summary figure `24 / 2452` wraps at ≤ about 430 px. Pre-existing, from the global-filters markup | Out of scope |
| 4 | `global-completeness-status.component.spec.ts:92`: an assertion inside a `setTimeout` leaks under load | Out of scope |
| 5 | Reviewer advisory: `sumRows` could return `Required<CoverageCount>` | Cosmetic |

## 10. Historical Notes

- The task's parity sample ("SP05 + one Accelerator") could not test an Accelerator, because none has ToC data in 2026. The full-portfolio query replaced it. During execution, SP12 was wrongly called an Accelerator.
- `resize_window` had no effect on the maximized window, and the same-origin iframe fallback did not render the route this time. The 768 and 375 checks were done by rewriting the page's media rules to the target width and sizing the block at `viewport / html zoom (1.15)`.
