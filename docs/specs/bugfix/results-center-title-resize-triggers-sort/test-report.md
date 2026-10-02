# Test Report — Results Center: column resize must not trigger a sort

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `bugfix/results-center-title-resize-triggers-sort` |
| Date | 2026-09-23 |
| Command | `/akili-test results-center-title-resize-triggers-sort` |
| Overall status | **PASS** |
| Suites planned | Frontend unit, lint, manual browser QA |
| Suites not applicable | Backend unit, integration, E2E |

## 2. Summary

The frontend regression suite passes. One supervised Tester ran the focused frontend-unit suite for the four affected component specs; the Leader then ran the client lint gate.

| Check | Result | Evidence |
|---|---|---|
| Frontend unit | PASS | 4 Jest suites passed; 310 tests passed |
| Client lint | PASS | `All files pass linting.` |
| Backend unit | Not applicable | Client-only event-handling fix; no server/API/migration surface |
| Integration | Not applicable | No cross-module/API contract changed |
| E2E | Not applicable | No Cypress E2E needed; manual browser QA completed in Orca |

Delegation: 1 Tester spawned, supervised, for the frontend-unit suite. No suites were run in parallel.

## 3. Backend Unit Tests

Not applicable. The spec changes only Angular component event handling and Jest coverage. No NestJS files, DTOs, controllers, migrations, or payload contracts are in scope.

## 4. Frontend Unit Tests

| Command | Result |
|---|---|
| `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage --runTestsByPath src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.spec.ts src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.spec.ts src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.spec.ts src/app/pages/result-framework-reporting/pages/portfolio-overview/portfolio-overview.component.spec.ts` | PASS — 4 suites, 310 tests |
| `cd onecgiar-pr-client && npx ng lint --quiet` | PASS |

Tester note: the initially requested `--testPathPatterns` form selected a broader set than the four assigned files in this repo. The final evidence uses `--runTestsByPath` to target exactly the affected specs.

## 5. Integration Tests

Not applicable. The fix does not change API calls, storage contracts beyond existing `localStorage` column-width behavior, route behavior, auth, or cross-module service contracts.

## 6. E2E Tests

No Cypress E2E suite was run. The Jest tests prove the event-sequence contract directly by simulating resize start, mousemove, mouseup, and the browser-style phantom click.

Manual browser QA for `RCR-T-2..4` was completed in the authenticated Orca browser tab on the local dev server (`localhost:4200`, backend `localhost:3400`). The tab was restored to its original SP01 URL after verification.

| Screen | Route | Browser Evidence | Result |
|---|---|---|---|
| Programme Results | `/result-framework-reporting/entity-details/SP01/results?phase=Reporting%202026` | `Result` header width changed `388 → 448`; phantom click `defaultPrevented=true`; sort/first row unchanged after resize; later click sorted ascending | PASS |
| Bilateral centre results | `/bilateral/CIMMYT/results?phase=36` | `Title` header width changed `280 → 340`; phantom click `defaultPrevented=true`; sort/first row unchanged after resize; later click sorted ascending | PASS |
| Portfolio Overview | `/portfolio-overview` | `Total` header width changed `81 → 140`; phantom click `defaultPrevented=true`; `sortKey`/`sortAsc` unchanged after resize; later click flipped `sortAsc` | PASS |

## 7. Coverage & Traceability

| Requirement | Scenario | Test Type | Test File or Command | Result | Gap or Notes |
|---|---|---|---|---|---|
| `RCR-R-1`, `RCR-AC-1` | Resize drag ending inside the header does not sort | Frontend unit | `results-list.component.spec.ts` — phantom-click regression test | PASS | Asserts phantom click is prevented and later unrelated click is not suppressed |
| `RCR-R-2`, `RCR-AC-1` | Column resize keeps working | Frontend unit | Existing resize persistence/reset tests across the four target specs | PASS | Width behavior remains covered by existing resize tests |
| `RCR-R-3`, `RCR-AC-2` | Plain header click still sorts | Frontend unit | Existing sort tests plus later-click assertions in resize regression tests | PASS | Confirms the guard does not swallow legitimate later clicks |
| `RCR-R-4`, `RCR-AC-3` | Parity across Programme Results, Bilateral centre results, Portfolio Overview | Frontend unit + manual browser QA | `programme-results.component.spec.ts`, `bilateral-results-list.component.spec.ts`, `portfolio-overview.component.spec.ts`; Orca browser routes listed above | PASS | Each parity table has a matching phantom-click/later-click regression test and live-browser proof |
| Negative constraint | Resize MUST NOT mutate sort/order/combine or toggle sort state | Frontend unit | Four targeted Jest specs | PASS | Results Center covers combine-sensitive sort behavior; directive-backed tables cover `table.sort`; Portfolio Overview snapshots `sortKey`/`sortAsc` |
| Strict validation | Later unrelated click MUST still sort / not be suppressed | Frontend unit | Four targeted Jest specs | PASS | Later `click` event remains unprevented |

## 8. Remediation

No product bugs or automated-test failures were found.

No remediation required.

## 9. Accepted Gaps

| Gap | Reason | Follow-up |
|---|---|---|
| No backend/integration/E2E automation | Client-only DOM event-handling fix with direct Jest coverage over the affected event sequence | None required for this spec |
