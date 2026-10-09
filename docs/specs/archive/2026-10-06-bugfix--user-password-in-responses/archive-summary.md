# Archive Summary — User password hash leaks in API responses

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/user-password-in-responses` · **Lite** · Bug Mode |
| Archive Date | 2026-10-06 |
| Branch | `qa-development-2026-ss` (a spec branch; `Default Branch: master`, `Integration Branch: staging`) |
| Commit | `bd032a9e4` (on `qa-development-2026-ss` and `performance-refactor`) |
| Final Status | **Delivered.** 1/1 task `[x]`. Validation PASS (0 FAIL, 2 accepted WARN) |

## 2. Original Spec Path

`docs/specs/bugfix/user-password-in-responses/`

## 3. Outcome

The `users.password` hash is no longer read by any TypeORM load of `User` (`select: false`). `GET /api/bilateral/:id` and `GET /api/bilateral/results` stopped sending it inside `obj_created` and `obj_external_submitter`, and every other endpoint that serialized a `User` stopped sending it too. Code that needs the hash must `addSelect` it explicitly. Login (Cognito, AD, OTP) is unaffected, because it never reads the local hash.

## 4. Requirements Delivered

| Requirement | Delivered | Evidence |
|---|---|---|
| PWD-R-1 no response carries the hash (S1 bilateral, S2 any User load) | ✅ | assertions (a) and (b), red → green; manual D6 GET on 11475 |
| PWD-R-2 explicit opt-in still works | ✅ | assertion (c) with falsifier; grep audit |
| PWD-R-3 auth unaffected | ✅ (BUT clause = accepted risk D5) | 4 auth suites green |
| PWD-R-4 contract change-log row | ✅ | `bilateral-result-summaries.en.md`, row `2026-10` |

## 5. Files Changed

| File | Change |
|---|---|
| `onecgiar-pr-server/src/auth/modules/user/entities/user.entity.ts` | +1 line (`select: false`) |
| `onecgiar-pr-server/src/auth/modules/user/entities/user.entity.spec.ts` | new: offline SQL regression test (a, b, c) |
| `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` | +1 change-log row |

No migration, no client change, no API/DTO change.

## 6. Test Evidence

| Test | Result |
|---|---|
| `user.entity.spec.ts` | red before the fix (a, b), 3/3 after; falsifier proven for (c) |
| Auth regression (4 suites) | 169 passing (172 with the new spec) |
| Manual D6: `GET /api/bilateral/11475` | no `password` key in either user object, other fields intact (user, 2026-10-06) |
| `test-report.md` | not produced; for this Lite bugfix the evidence lives in `execution.md` (accepted) |

## 7. Validation Summary

`validation-report.md`: **PASS**, 14 PASS · 2 WARN · 0 FAIL · 0 BLOCKED. Type-check, lint and the scoped tests are green. PWD-P-5 (no migration diff) was verified during validation: TypeORM's MySQL schema diff never compares `select`.

## 8. Accepted Warnings & Follow-Ups

| Item | Kind | Owner |
|---|---|---|
| D5: saving a loaded `User` could overwrite the hash (untested) | accepted risk, Low | — |
| D3: future raw SQL bypasses `select: false` | accepted risk, Low | → F1 |
| **F1:** delete or sanitize the dead raw readers `AllUsersByEmail` / `getUserByEmail` in `user.repository.ts` | follow-up | backlog |
| **PWD-OQ-1 / R2:** confirm production exposure and decide whether to rotate the already-exposed hashes | operational | security owner or an authorized person |
| Test polish (advisory): (a) guard should count 2 joins; rename (c); drop the per-`it` timeouts | advisory | optional |

## 9. Historical Notes

- The defect was found as a side observation in `bilateral/resubmit-rejected-result` (`design.md` §13).
- The proposal assumed login reads the hash through raw SQL. Specify corrected that: login authenticates through Cognito, and the raw readers have 0 callers.
- Commit history: `bd032a9e4` was pushed to `qa-development-2026-ss`, then fast-forwarded to `performance-refactor` after a scoped re-validation (lint plus 172 tests).
