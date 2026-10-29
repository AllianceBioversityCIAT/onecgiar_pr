# Archive Summary — Center Overview counts W3/bilateral reporting only

**Outcome:** shipped. On PRTest, the center Overview counts only replicated W3, new W3, and W1/W2 results that tag a center project. Every Results-linked figure reconciles on CIP and IITA. All 6 tasks are done, and every code task passed its first review.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `center-overview-w3-scope` (child #3 of `bilateral/replicated-innovations-2026-pa`) |
| Ticket | Freshdesk INC-165171 |
| Owner | Santiago Sanchez |
| Approval mode | `gated`; the owner switched to "continue to the end" after T-2 |
| Branch | `qa-development-2026-ss` directly (owner decision; overrides the spec's "from `staging`") |

## 2. Original Spec Path

`docs/specs/bilateral/replicated-innovations-2026-pa/center-overview-w3-scope/`

## 3. Archive Date

2026-10-21

## 4. Final Status

| Item | Status |
|---|---|
| Tasks | 6 of 6 done (T-2..T-5 Reviewer PASS, attempt 1; T-1 and T-6 HITL) |
| `test-report.md` | **absent, accepted by the owner** (evidence: per-task Jest runs + T-6 live check) |
| `validation-report.md` | **absent, accepted by the owner** (evidence: Reviewer PASS on every code task + T-6) |
| Commits | `b29b749c1` code · `5008e86cf`, `7bacb0b8b` specs · on PRTest via `performance-refactor` `686445be9` |

## 5. Requirements Delivered

| Requirement | Delivered by |
|---|---|
| `CWS-R-1` server scope `scope=bilateral` (A, B, C, rules) | T-2 |
| `CWS-R-2`..`R-6` Overview: 3 lines, Total identity, Projects covered = new results, W3-only no-project line | T-4 |
| `CWS-R-7` shared `scope` contract + Results tab scoped fetch and chip | T-3, T-5 |
| `CWS-R-8` Results links carry `scope`; Reporting and Draft links do not | T-4, T-6 |
| `CWS-AC-1`..`AC-9` | T-2..T-6. `AC-9` is checked on PRTest; the CIP prod count is a follow-up |

## 6. Files Changed Summary

| Area | Files |
|---|---|
| Server (`src/api/results/`) | `results.controller.ts`, `results.service.ts`, `result.repository.ts` + 3 specs |
| Client contract | `bilateral-query-params.ts`, `bilateral-api.service.ts` + specs |
| Overview | service, aggregate, component `.ts/.html`, charts, fixtures, `.cy.ts` stub, folder `CLAUDE.md` + specs |
| Results tab | `bilateral-results-list.component.ts` + spec + folder `CLAUDE.md` |
| Size | 25 files, about 720 LOC including tests (budget estimate was ~400; the overrun is tests) |

## 7. Test Evidence Summary

| Run | Result |
|---|---|
| Server `--findRelatedTests` (T-2) | 120 suites, 2955 tests passed |
| Server results specs after the perf merge | 3 suites, 161 tests passed |
| Client `--findRelatedTests` T-3 / T-4 / T-5 | 446 / 439 / 21 suites; 11910 / 11739 / 837 tests passed |
| `tsc -p tsconfig.app.json` | clean (T-3..T-5) |
| Red runs | T-3, T-4 aggregate: behavioral. T-2 (2 suites): compile-level. T-5: 3 behavioral + 1 regression guard |

## 8. Validation Summary

- **Reviews:** T3 Reviewer PASS on T-2..T-5, no FAIL.
- **T-6 live check on PRTest** (read-only, Claude in Chrome):

| Center | Total vs Results | Tiles | Bars checked |
|---|---|---|---|
| IITA | 119 = 119 | 91 / 18 / 7 / 3 all match | 21, 12 match |
| CIP | 122 = 122 | 94 / 18 match; identity 122 | 4, 2 match |

- **Scope chip:** present in both.
- **Links:** Reporting and AI-draft links carry no `scope`.

## 9. Accepted Warnings Or Follow-Ups

| Follow-up | Owner |
|---|---|
| Confirm the CIP prod count 63 / 0 / 0 after the staging → master release. The PRTest DB differs (52 / 35 / 35) | Santiago |
| Ship server and client in the same release (design §11) | release |
| Nicoleta: `CWS-OQ-1` (63 vs 54), `CWS-OQ-3` copy ("only replicated", "No new results yet", the charts a11y summary) | Santiago |
| `FIXTURE_D1_ROWS` row 6 encodes an impossible state (a W1/W2 row with no project) | code follow-up |
| Comment "nine contract keys" above `RESULTS_TAB_MANAGED_QUERY_PARAMS` is stale (now 11) | code follow-up |
| `bilateral-overview/CLAUDE.md` is 123 lines (cap 120) | code follow-up |
| API option typed inline as `'bilateral' \| null` instead of `BilateralScope` | code follow-up |
| The unscoped repository test could assert full SQL equality | code follow-up |
| The Overview chart shows the top 7 projects, so the bar-sum identity was not verified live | known |
| "Pending > 14 days" link opens all pending; the no-project link opens all W3 | pre-existing, child #2 |
| CodeGraph re-index (`codegraph sync`) | Santiago |

## 10. Historical Notes

- This spec reverses part of `1dd94a46c` at Nicoleta's request. Child #2 (`center-overview-no-project-line`) now depends on it; a premise note was added to its proposal.
- `CWS-AC-2` wording was aligned at archive with design §5: the result rows are the same as before, and one bound flag is added.
- **Process incident:** a T-3 Implementer ran `git stash` / `pop` in a checkout shared with another session. Nothing was lost. Later briefs forbade it (see kaizen entry).
- PRTest `/bilateral/*` redirects to `/` until the Jenkins deploy finishes, even after the GitHub run reports success.
- The `performance-refactor` → qa-dev merge (`7536e0788`) also brought in P2-3272 and the staging CI.
