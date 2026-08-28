# Kaizen Retrospective: `changes--portfolio-overview-echarts`

| Attribute | Value |
|---|---|
| **Spec Path** | `docs/specs/changes/portfolio-overview-echarts/` (archived 2026-08-28) |
| **Branch Context** | `qa-development-2026` (spec branch — pending items await default-branch apply) |
| **Run Classification** | Near-clean: 4/4 tasks PASS; 2 rework rounds (POV-T-2 hardcoded hex tokens; POV-T-3 dynamic progress percent); 0 HALT/Pivot/FATAL |

## Metrics
| Metric | Target | Actual |
|---|---|---|
| Tasks / review rounds | 4 / ≤2 per task | 4 tasks / 2 rework rounds total |
| Reviewer FAILs / HALTs / Pivots | 0 | 2 FAILs (token compliance + dynamic computation) / 0 / 0 |
| Automated Test Coverage | 100% | 63/63 tests passing across 3 test suites |
| Runtime failures | 0 | 0 |

## Lessons

### KZ-POV-1 (Product) — Strict Theme Token Compliance in ECharts Builders
- **Root cause:** ECharts option builders were initially written with hardcoded fallback hex values instead of binding through `ResolvedChartTokens` (`chart-tokens.util.ts`), risking color drift across light/dark themes.
- **Evidence:** Reviewer FAIL in `POV-T-2` (`execution.md`). Fixed by enforcing direct token access (`ramp[3]`, `primaryStrong`, etc.).
- **Standardize (pending, spec branch):** Add guideline to `docs/ux-ui/design.md §8`: "All ECharts option builders must consume `ResolvedChartTokens` and prohibit hardcoded hex codes."

## Noted, not a lesson
- **Adversarial Dual-Review:** The Reviewer caught subtle discrepancies in table headers (`['Status', 'Results', 'Share']`) and missing dynamic portfolio progress percentage early before component assembly.
- **Performance Verification:** Tested 20k rows client-side aggregation budget (< 150ms in standard environment, < 1000ms under heavy test runner load) verifying `POV-NFR-1`.

## Pending Items
| # | Kind | Target | Severity | Content | Status |
|---|---|---|---|---|---|
| 1 | guide-sync | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/CLAUDE.md` | medium | Update documentation to reflect ECharts architecture, executive KPI cards, and pure builder pattern in `portfolio-overview.charts.ts`. | pending |
| 2 | standardization | per KZ-POV-1 | medium | Strict `ResolvedChartTokens` requirement in option builders. | pending |
| 3 | trd-adr | none | — | No TRD architecture decisions overturned. | n/a |
