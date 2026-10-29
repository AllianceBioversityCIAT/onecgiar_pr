# Archive Summary — Primary SP card only after Submit for review (regression)

**Outcome:** Delivered and validated on PRTest. A primary Science Program sees its card in Notifications → Received only once the Center submits the result for review. Server-only fix, 2 tasks, each passed on the first attempt.

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/bugfix/primary-notify-on-submit-regression/` |
| Archive Path | `docs/specs/archive/2026-10-13-bugfix--primary-notify-on-submit-regression/` |
| Archive Date | 2026-10-13 |
| Final Status | **Done · tested** (HITL passed on PRTest) |
| Branch | `qa-development-2026-ss` |
| Commit | `54cbcd85d` (pushed to `origin/qa-development-2026-ss`) |
| Regression of | `1b97a9385` (2026-10-07) |

## 2. Requirements Delivered

| ID | Result |
|---|---|
| `PNR-R-1` No primary card while in preparation (Editing / Rejected / Draft) | ✅ `PNR-T-1` |
| `PNR-R-2` Card appears at Submit, sorted as new ("Today") | ✅ `PNR-T-2` |
| `PNR-R-3` Contribution / map-to-ToC / post-submit cards and paging unchanged | ✅ `PNR-T-1` |
| `PNR-NFR-1` Atomic stamp inside the submit transaction | ✅ `PNR-T-2` |
| `PNR-NFR-2` No per-row query | ✅ (review check; no timing gate, accepted risk) |
| `PNR-NFR-3` Logs carry ids only | ✅ `PNR-T-2` |

## 3. Files Changed

| File | Change |
|---|---|
| `results/share-result-request/share-result-request.service.ts` (+39) | `done` bucket split into contribution / primary entries; primary entries exclude `PRIMARY_PREPARATION_STATUS_IDS` (1, 7, 8) |
| `results/share-result-request/services/primary-program-request.service.ts` (+31) | New `stampPrimaryCardSubmitted(resultId, manager)` |
| `bilateral/services/bilateral-center.service.ts` (+9) | `submitForReview` stamps inside its tx, after the ownerless transfer |
| `bilateral/services/bilateral-resubmission.service.ts` (+17) | Port member + stamp in `commitResubmission` after the CAS |
| `bilateral/bilateral.service.ts` (+6) | Port wiring |
| Co-located specs (5 files, ~520 lines) | Regression + positive tests |

Paths are relative to `onecgiar-pr-server/src/api/`. Production code totals ~65 lines, excluding comments and blank lines. No schema change, no migration, no payload change.

## 4. Test Evidence

| Check | Result |
|---|---|
| `PNR-T-1` red → green | 7 failing on old code → 125/125 |
| `PNR-T-2` red → green | 5 failing (+ compile failure) → 662/662 across 4 suites |
| Lint (10 touched files) | Clean |
| Test DB data check | 0 active results with NULL status; 22 primary cards to hide, all Editing, including 9800 |

There is no `test-report.md`; `/akili-test` was not run. The user accepted the unit evidence plus the PRTest HITL in its place.

## 5. Validation Summary

There is no `validation-report.md`; `/akili-validate` was not run. The user validated live on PRTest ("ya validé"), covering tasks §4 HITL 1–3:

1. An Editing result shows no card.
2. Submit shows the card under "Today", plus the notice.
3. Paging shows no duplicates.

The user accepted the absence of both reports by asking to archive right away.

## 6. Accepted Warnings / Follow-Ups

Reviewer advisories, not actioned and optional:

- [ ] Use `RequestTypeEnum` instead of the `'contribution'` / `'primary'` literals in `buildWhereReceivedConditions`.
- [ ] Keyset test: page size 2 so the cursor lands inside a tied-date group.
- [ ] API same-owner resubmission spec: match the manager by identity, not by shape.
- [ ] Repeat the NULL-status count on prod (`SELECT COUNT(*) FROM result WHERE status_id IS NULL AND is_active = 1`).
- [ ] Run `codegraph sync`.
- [ ] Carry `54cbcd85d` to `staging` / `master` on the normal release cadence. Master promotion is owned by the release owner.

## 7. Historical Notes

- The 2026-10-07 product decision still holds: the SP owns the result and sees its default ToC from the first pick. The fix is read-side (filter) plus one timestamp at submit, so existing prod rows needed no script.
- Legacy pending primary rows (before 2026-10-07) are deliberately untouched (`PNR-DD-1`, `PRA-R-3`).
- Leader handed the Reviewer frozen diff snapshots from the session scratchpad instead of inlining them.
