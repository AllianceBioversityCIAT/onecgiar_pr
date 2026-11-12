# Archive Summary — Contribution saved without its ToC target anchor

## Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/bugfix/contribution-target-anchor/` |
| Archive Path | `docs/specs/archive/2026-11-12-bugfix--contribution-target-anchor/` |
| Archive Date | 2026-11-12 |
| Ticket | Freshservice INC-168252 |
| Final Status | **Delivered** — code on qa-dev + performance-refactor + staging (`e96f3ad66`); PROD data backfilled |

## Requirements Delivered

| Requirement | Outcome |
|---|---|
| CTA-R-1 single phase-year target anchors an identity-less contribution | ✅ server + test; PROD backfill 46 rows |
| CTA-R-2 foreign target id not trusted | ✅ server + test |
| CTA-R-3 PROD backfill | ✅ run by the user 2026-11-12 (46 updated, 12 ambiguous left NULL) |
| CTA-R-4 TTD resolution unchanged | ✅ 28 prior cases green |

## Files Changed Summary

| File | Change |
|---|---|
| `onecgiar-pr-server/…/repositories/results-toc-results.repository.ts` | `resolveTargetIdentity`: catalog-membership check on own id + step 4 single phase-year fallback + ambiguous warn (+ `logContext` arg at 2 call sites) |
| `…/results-toc-results.repository.spec.ts` | CTA describe, 7 cases |
| `backfill-prod.md` | PROD hand-off SQL (preview, backup `bkp_rit_anchor_20261112`, guarded UPDATE, COMMIT, fresh-tab check, ambiguous list, rollback) |

## Test Evidence Summary

- Red first on 3 behavioural assertions; green 35/35; 2 falsifier mutations red; related tests 79 suites / 2632 green; tsc + eslint clean (re-run at validate).
- PROD: `expected = affected = 46`, fresh-tab 5a/5b correct, KPI 9378 shows Achieved 1 in the app.

## Validation Summary

PASS with 4 WARN, 0 FAIL (`validation-report.md`).

## Accepted Warnings Or Follow-Ups

| Item | Owner |
|---|---|
| PRTest check of a new Contributors & partners save (W-1) | user, after perf deploy |
| `staging` → `master` | Cristian Gamboa |
| Re-run the backfill after master (new backup name) for rows saved in between | user (script in this folder) |
| 12 ambiguous rows — manual decision via block 6 | user + SP owners / Nicoleta |
| Tell Nicoleta: SP09 Achieved figures rise (34 rows) | user |
| Ticket reply INC-168252 | user |
| Advisories: JSDoc steps 1–4, warn-omits-payload test, one warn per indicator | optional |
| Kaizen P1–P3 | apply on `staging` |

## Historical Notes

- The proposal's client-side fix (S-1) was dropped at specify: the form's level list carries no target id (P-6).
- T-1's files were swept into another session's stash mid-run and came back on its pop (KZ-1).
- Backfill block 2 failed in PROD with error 1292 (`YEAR()` on ISO strings inside CTAS); fixed to `LEFT(…,4)` before any UPDATE (KZ-2).

## Diagrams

None — the spec had no `diagrams/` folder or baseline diagram slot.
