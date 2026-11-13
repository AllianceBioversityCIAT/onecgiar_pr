# Archive Summary — bugfix/innovation-use-youth-required

> **Outcome:** delivered and **verified in PROD** on 2026-11-12.
> - On 2026 W1/W2 Innovation Use results, an empty Youth no longer turns into "everyone is Non-youth".
> - Non-youth stays empty, an "Action needed" alert asks for Youth (0 if none), and the section stays red until Youth is filled.
> - Code is on `master` via PR #800 and PR #801. The DB function is applied in TEST and PROD.

## 1. Document Control

| Field | Value |
|---|---|
| Ticket | **P2-4049** (Marc Schut batch 1, item 7 · INC-167167 · epic P2-3094) |
| Owner | Santiago Sanchez |
| Depth | Lite, Bug Mode |
| Archived on branch | `qa-development-2026-ss` (spec branch) |
| Archived by | `/akili-archive`, 2026-11-12 |

## 2. Original Spec Path

`docs/specs/bugfix/innovation-use-youth-required/`

## 3. Archive Date

2026-11-12

## 4. Final Status

| Check | Result |
|---|---|
| Tasks | 5/5 `[x]` (IUY-T-0 … T-4) |
| `test-report.md` / `validation-report.md` | Absent; absence accepted. The evidence is in `execution.md`: red→green per task, TEST probe, PRTest rounds 1–3, and the PROD checks |
| PROD | 60/60 calls to `v2/api/innovation-use/get/result` return Non-youth `null` for Youth-empty rows (results 32709, 32706, 32699). 18805 is correct with Youth = 0 |
| Unresolved FAIL | none |

## 5. Requirements Delivered

| Req | Delivered |
|---|---|
| IUY-R-1 | Youth empty → Non-youth empty plus the "Action needed" alert (Santiago's mock-up), in both grids. Youth = 0 → Non-youth = total. IPSR, 2025 and W3 typing are unchanged |
| IUY-R-2 | `validation_innovation_use_P25`: a 2026 W1/W2 grid row with total > 0 and Youth NULL makes the section incomplete, in both sections |
| IUY-R-3 | Both server reads return `null` Non-youth when Youth is NULL: `summary.service.getInnovationUse` and `innovation-use.service.getActorsData` (v2, the one the P25 form loads) |

## 6. Files Changed Summary

| Commit | What |
|---|---|
| `c95fc0e07`, `b6706a5ea`, `5d9ba6729`, `042e5d154` | Client `innovation-use-form` (.ts, .html, spec, module, folder `CLAUDE.md`) and `innovation-use-youth-required.copy.ts`. Non-youth is derived on the edited row |
| `a64bb1926` | `summary.service.ts` + spec, the SQL before/after/body-only files, and the spec docs |
| `f229d0610` | `results-framework-reporting/innovation-use.service.ts` `getActorsData` + new spec + folder `CLAUDE.md` |
| `2dee39a47`, `d821df662` | Execution log and task closure |

## 7. Test Evidence Summary

- **Server:** `summary.service.spec` (61) and the 8 innovation-use suites (64). Both regression tests were red first (`Received: 5000` and `Received: 14`), and both went red again when the fix was reverted.
- **Client:** the `innovation-use-form` suites (239) and `--findRelatedTests` (24 suites / about 1069). The regression test was red first (`Received: 100`). The alert test asserts it sits outside `.right_content`, has `role=status` and shows the bold label.
- **DB on TEST:** the in-transaction probe went from `1,1,1,1` to `0,1,0,1`, and the category counts did not change.

## 8. Validation Summary

| Gate | Result |
|---|---|
| PRTest, 8558, current use and 2030 grid | PASS: empty, alert, 0 → total, 8 − 3 = 5; the current-use row stays untouched |
| Santiago's visual approval of the alert | PASS (2026-11-12) |
| PROD function body | PASS (Santiago's `SHOW CREATE`) |
| PROD read endpoint, 3 results × 20 calls | PASS (`null/null` 60/60) |

## 9. Accepted Warnings Or Follow-Ups

- [ ] `validateYouth`'s clamp and "cannot be greater" branch still writes `body.innovatonUse.actors[i]` when called from the 2030 grid. Out of scope, noted in the folder `CLAUDE.md`.
- [ ] The P2-4049 closure comment in Jira is not posted yet.
- Accepted: no default 0 for Youth (Santiago's decision). Owners are not notified; they see the alert.
- Accepted: the DB function went to PROD before the code. 18805 had a red section without the alert for a few hours; Santiago then filled it with 0.

## 10. Historical Notes

- **Second Non-youth reader found in PROD.** The P25 form loads `v2/api/innovation-use/get/result`, not `summary`. The design premise P-5 was wrong, and the fix shipped separately in PR #801.
- **Alert style reworked twice.** `.explanation_message` is an absolute overlay; on PRTest it covered the Youth input and took its clicks. It became inline text, which Santiago rejected, and then the amber alert from his mock-up.
- **Partial-hunk commit** (IWH work shared the same files) broke perf CI lint once. The validation stash also swept another session's INC-168252 files briefly.

## 11. Diagrams

None (Lite spec, no `diagrams/` slot).
