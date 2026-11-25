# Archive Summary — Innovation Use level thresholds on the level number (P2-4129)

**Outcome: delivered.** The P25 Innovation Use service now keeps the readiness explanation and the scaling answer from level **5**, and syncs and returns study links from level **6**. Both thresholds are compared against the level number, never the catalogue row id. One task, passed on the first attempt, with no FAIL. Archived with 4 accepted WARNs.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `bugfix/p2-4129-innovation-use-level-threshold` |
| Type / Depth / Approval | Bug · Lite · gated |
| Ticket | P2-4129 (epic P2-2340; relates to P2-3939) |
| Branch | `qa-development-2026-ss`, merged into `performance-refactor` |
| Commits | `0b71a37e5` (fix), `50c1489df` (spec docs). Pushed: `qa-development-2026-ss` @ `98cd84e07`, `performance-refactor` @ `5fa1bd8dd` |

## 2. Original Spec Path

`docs/specs/bugfix/p2-4129-innovation-use-level-threshold/`

## 3. Archive Date

2026-11-23

## 4. Final Status

| Gate | Result |
|---|---|
| Tasks | 1/1 `[x]` (ULT-T-1) |
| Execution | Reviewer PASS on attempt 1; Leader re-run VERIFIED |
| Test (`/akili-test`) | Not run. Absence accepted: a red-first regression spec was written inside ULT-T-1 (validation W-1) |
| Validation | PASS · 0 FAIL · 4 WARN |

## 5. Requirements Delivered

| ID | What | Status |
|---|---|---|
| ULT-R-1 | Explanation and `has_scaling_studies` kept at level 5–9, cleared otherwise, on the existing, new-row and duplicate-retry branches | Delivered |
| ULT-R-2 | Study links synced on save and returned on read only at level 6–9 | Delivered |
| ULT-R-3 | Stored row id, API shape and schema unchanged | Delivered |
| NFR-1..3 | No migration or client change; no extra query; number-or-string level | Delivered |

## 6. Files Changed Summary

Paths are under `onecgiar-pr-server/src/api/results-framework-reporting/innovation-use/`.

| File | Change |
|---|---|
| `innovation-use.service.ts` | `isLevelAtLeast` helper; `EXPLANATION_MIN_LEVEL` (5) and `STUDY_LINKS_MIN_LEVEL` (6); save keeps the level number; 4 save gates and the read gate moved to the number (+60 / −8) |
| `innovation-use.service.level-threshold.spec.ts` | New: 25 tests (238 lines) |
| `CLAUDE.md` (module) | +1 trap line: gates compare the level number |

## 7. Test Evidence Summary

| Evidence | Value |
|---|---|
| Red-first | 15 failed / 10 passed before the fix, all behavioural (`execution.md`) |
| Mutations | (a1)–(a4), (b), (c), (d) all red, then reverted. Not all captured verbatim (W-1) |
| Validation re-run | 12 suites / 194 tests pass; tsc clean; eslint clean |

## 8. Validation Summary

PASS with 4 WARN (`validation-report.md`). P-5 was settled at validation, and the premise was updated in proposal, requirements, design and tasks:
- **PRPROD:** ids 1–10 = levels 0–9 (id = level + 1).
- **PRTEST:** the same, plus rows 13–20 repeating levels 2–9.

## 9. Accepted Warnings Or Follow-Ups

| ID | Item | Status |
|---|---|---|
| W-1 | Mutation reds not all verbatim; no `test-report.md` | Accepted |
| W-2 | DD-2 `<6` clause absent on the new-row block (no behaviour change) | Accepted |
| W-3 | Prod level-5 results with active study links stop returning them on GET at deploy | **Closed 2026-11-23:** the count query returned 0 on PRPROD and PRTEST, so no existing result is affected |
| W-4 | Post-deploy smoke (level 5 and level 4 on PRTEST) | **Follow-up for the user** after deploy |
| A-1 | `as any` on the read path | Advisory; not scheduled |

## 10. Historical Notes

- **Real impact.** In prod the explanation and answer already worked by coincidence (`id >= 6` ⇔ `level >= 5`). The prod-visible change is links moving from level 5 to level 6. The defect was live on PRTEST (rows 13–20).
- **Implementer report vs diff.** The Implementer's report claimed a new-row `<6` clause that the diff does not contain. The Reviewer caught it, and `execution.md` follows the diff.
- **Same pattern as P2-3939.** That fix (QA catalog level rules on level numbers) was archived the same day.

## 11. Diagrams

None. The spec has no `diagrams/` folder or diagram slot, and the baseline diagrams are not affected.
