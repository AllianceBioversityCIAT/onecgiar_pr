# Archive Summary — Surface emerging results as their own label

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `changes/emerging-result-chip` |
| Archive date | 2026-09-18 |
| Branch at archive | `qa-development-2026` |
| Default branch pin | `master` |
| Archive run | 1 |

## 2. Original Spec Path

`docs/specs/changes/emerging-result-chip/`

## 3. Final Status

**Shipped for P25 (2025–2030)** — `planned_result` exposed on the result-list payload; Results Center chip and Programme Results AoW label render **Emerging** when `planned_result === 0`. Pre-archive remediation fixed Defect D-3 (`Number(null) === 0`) and added EMG-T-2/T-3 unit tests.

## 4. Requirements Delivered

| ID | Delivered |
|---|---|
| EMG-R-1, EMG-R-2 | `planned_result` scalar subquery on `AllResultsByRoleUserAndInitiativeFiltered` |
| EMG-R-3 | Emerging chip in Results Center title cell (P25 window only) |
| EMG-R-4 | AoW column + CSV show `Emerging` for `UNTAGGED` + `plannedResult === 0` |
| EMG-R-5 | `null`/absent owner row → no chip, `Not tagged` (D-3 fixed 2026-09-18) |
| EMG-R-6 | CSV uses same `cellText()` as on-screen AoW |
| EMG-R-7 | Chip reuses neutral funding-chip tokens |
| EMG-R-8 | Tooltip (MAY) — not implemented |

## 5. Files Changed Summary

| Package | Files |
|---|---|
| Server | `result.repository.ts`, `result.repository.spec.ts` |
| Client | `current-result.interface.ts`, `results-list.component.{ts,html,spec.ts}`, `programme-results.service.{ts,spec.ts}`, `programme-results-section-labels.{ts,spec.ts}`, `programme-results.component.{ts,spec.ts}` |

## 6. Test Evidence Summary

| Suite | Result |
|---|---|
| `result.repository.spec` | 52 passed |
| `results-list.component.spec` | includes EMG-T-3 `isEmerging` block |
| `programme-results-section-labels.spec` | 4 passed (new) |
| `programme-results.service.spec` | `planned_result` passthrough |
| `programme-results.component.spec` | AoW `Emerging` cellText |

Combined scoped run 2026-09-18: **318 passed** (client patterns above).

## 7. Validation Summary

- Initial `validation-report.md` (2026-09-17): **FAIL** — D-3 + missing client tests.
- Remediation 2026-09-18: D-3 fixed; EMG-T-2/T-3 tests added; all scoped suites green.
- **Archive verdict: PASS with accepted follow-up** — `EMG-T-4` manual prtest D-2/D-4 checks remain open.

## 8. Accepted Warnings Or Follow-Ups

| ID | Item |
|---|---|
| EMG-T-4 | Manual prtest: `meta.total` parity (D-2) + chip contrast at ~400px/desktop (D-4) |
| F-1 | Option C — separate Emerging / Not tagged buckets in filters and counters |
| F-2 | Knowledge Product / rollover owner-row write gaps (238 no-row population) |
| F-3 | Attach Jira ticket for commit prefix |

## 9. Historical Notes

- `EMG-T-0` measured only **15%** of owner results relabelled; 52% of `UNTAGGED` have no owner row.
- P25 gate on Results Center chip only (`isEmerging` checks portfolio + year window).
- Tri-state contract: client reads must use `=== 0`, never `Number(null)`.
