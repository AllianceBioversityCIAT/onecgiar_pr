# Archive Summary — Remove "Innovation team diversity" from the 2026 Innovation Development form

> **Outcome:** shipped. The question is hidden from the 2026 phase on, 2026 results turn green without it, 2025 behaves exactly as before, and no stored answer was touched. It is live on PRTest (perf `3f88c9c2b`) and the DB function is applied in PROD and TEST.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `changes/remove-innovation-team-diversity` (ITD) |
| Type | Change (Enhancement, S5) · Standard depth · gated |
| Branch | qa-development-2026-ss (spec branch) |
| Commits | `8243c5245` (qa-dev) · merge `3f88c9c2b` (performance-refactor) |
| Archive run | 1 |

## 2. Original Spec Path

`docs/specs/changes/remove-innovation-team-diversity/`

## 3. Archive Date

2026-11-05

## 4. Final Status

| Task | Status | Reviewer |
|---|---|---|
| ITD-T-1 client gate | ✅ PASS | PASS on attempt 1 |
| ITD-T-2 QA catalog removal (2026.34) | ✅ PASS | PASS on attempt 1 (+3 advisories) |
| ITD-T-3 `validation_innovation_dev_P25` phase short-circuit | ✅ PASS | DB task; verified by SQL + live green check |
| ITD-T-4 data safety + visual | ✅ PASS | Live checks (localhost + PRTest) |

## 5. Requirements Delivered

| Req | Delivered by | Evidence |
|---|---|---|
| ITD-R-1 hidden on 2026, by phase year | T-1 | Jest render tests; PRTest 9771 has no component |
| ITD-R-2 2025 still renders and still requires it | T-1 + T-3 | PRTest 5921 renders it; PROD 2025 without q112 → 5/5 red |
| ITD-R-3 2026 complete without the answer | T-3 | TEST 9771 (no q112 rows) → `innovation-dev-info: true` |
| ITD-R-4 no answer lost; reversible | T-1 + T-4 | Save-body test; 8563: 9 rows kept, 0 deactivated |
| ITD-R-5 QA catalog + doc + snapshot | T-2 | 42 suites / 907 tests; snapshot diff = 3 keys + version |

## 6. Files Changed Summary

| Area | Files |
|---|---|
| Client | `innovation-dev-info.component.html` (`@if` gate), `.spec.ts` (+3 tests, 1 assertion updated), folder `CLAUDE.md` |
| Server | `qa-catalog/definitions/sections/innovation-development.ts`, `closed-control-lists.ts`, `versions.ts` (rev 34), 5 specs, `__snapshots__/qa-catalog.snapshot.json`, `docs/qa-catalog.en.md` (changelog v1.32 after merge) |
| DB (not in git) | `validation_innovation_dev_P25`: `IF (COALESCE(result_phase_year,0) < 2026)` around the q112 / 113 / CASE block. PROD 13:48, TEST 14:10 |

## 7. Test Evidence Summary

- Client: `--findRelatedTests` 21 suites / 883 tests (T-1); post-merge 23 suites / 995 tests.
- Server: qa-catalog 42 suites / 907 tests (T-2); post-merge on perf 48 suites / 1018 tests. The single local snapshot failure was a CRLF working copy only; the committed blob is LF and passes.
- Server `tsc --noEmit` and client `ngc --noEmit` both exit 0 on the merged tree.
- Live: PROD read-only SQL; TEST and PRTest browser checks. All results are in `execution.md`.

## 8. Validation Summary

There is no separate `test-report.md` / `validation-report.md`. The four tasks carry their own Reviewer verdicts and live evidence. The user accepted archiving on that evidence after the PRTest check. No FAIL findings remain.

## 9. Accepted Warnings Or Follow-Ups

| # | Item | Owner |
|---|---|---|
| F-1 | PROD: the 2025 IPR block raises SQL 1242 for duplicate q104 / q104+105 (results 22825, 22854, 22968, 23351, 23582, 33190) | separate ticket |
| F-2 | `qa-catalog.en.md` still says keys are never removed (lines ~12 and ~277); stale "(`[]` for `actions`)" | kaizen P1/P2 |
| F-3 | Non-pooled budget: the client requires a value or "to be determined", but the DB function accepts an empty row | candidate ticket |
| F-4 | Jira ticket id + reply to the feedback author | Santiago |
| F-5 | CodeGraph re-index (minor; no module boundaries changed) | optional |

## 10. Historical Notes

- The positive 2026 proof cannot be observed on PROD yet: 0 of 204 2026 results without q112 are complete in the other blocks. It was proven on TEST with result 9771.
- The first live proof (8563) was disqualified: that result already held a valid diversity answer. Recorded in `execution.md`.
- Test-data writes (user-authorized): 8563 and 9771 Innovation Dev sections on the shared test DB, plus the 9771 W3 budget row set to "to be determined".
