# Archive Summary — Contribution Request Drawer — Requirements

**Outcome:** code tasks complete per `execution.md`; archived in the 2026-11-03 batch cleanup of Santiago's completed specs. Manual checks still open are listed in §7 as accepted follow-ups.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/contribution-request-drawer` |
| Archive Date | 2026-11-03 |
| Branch | `qa-development-2026-ss` (spec branch; `Default Branch: master`, `Integration Branch: staging`) |
| Final Status | **Complete (code)** — tasks.md: 37 `[x]`, 7 `[ ]` (unchecked boxes are DoD / manual-check items, see §7) |
| Last commit touching the spec | `198b489f6 2026-09-25 ✨ feat(contribution-request-drawer) [SPEC:changes/contribution-request-drawer]: add contribution request drawer alongside the row popups` |
| Archive mode | Lightweight batch (user-approved 2026-11-03): summary built from `execution.md`; no per-spec re-validation |

## 2. Original Spec Path

`docs/specs/changes/contribution-request-drawer/`

## 3. Requirements Delivered

`CRD-R-1`, `CRD-R-2`, `CRD-R-3`, `CRD-R-4`, `CRD-R-5`, `CRD-R-6`, `CRD-R-7`, `CRD-R-8`, `CRD-R-9`, `CRD-R-10`, `CRD-R-11`

Traceability per task lives in `execution.md` (archived alongside).

## 4. Files Changed Summary / Execution Summary

Copied from `execution.md` → `Summary`:

- **Tasks:** 7 of 7 closed.
  - T-1: PASS in 2 attempts.
  - T-2: PASS in 2 attempts.
  - T-3: PASS in 1 attempt.
  - T-4: PASS in 2 attempts.
  - T-7 (pivot): PASS in 1 attempt.
  - T-5: PASS in 3 attempts.
  - T-6: PASS by user HITL.
- **Pivot:** 1, CRD-DD-10. The popups and the inline block were kept alongside the drawer.
- **Size:** ~ +1561 / −149 in tracked files, plus the new drawer folder and copy file. The budget was exceeded, and the user explicitly lifted it.
- **Final verification:** `notification-item|contribution-request-drawer|updates.component` passes, 6 suites and 158 tests. `ng lint` is clean and `npm run build` passes.

## 5. Test Evidence Summary

See the per-task verification lines in `execution.md`. Signals: 5 Reviewer FAIL mentions, 2 HALT mentions, 1 Pivot Record(s).

## 6. Validation Summary

No `test-report.md` or `validation-report.md`. Absence accepted by the user for the 2026-11-03 batch archive (same practice as the other Lite specs); substitutes are the Reviewer verdicts per task in `execution.md`.

## 7. Accepted Warnings Or Follow-Ups

- T-6: PASS by user HITL.

These were accepted as follow-ups when the user approved the batch archive; most specs here have been in `qa-development-2026-ss` since September/October 2026.

## 8. Historical Notes

- Constitution sync (guides, factual sweep, TRD) was not re-run per spec in this batch; it is a spec branch, so nothing shared was written. A `codegraph sync` is recommended after the batch.
- Kaizen: metrics-only entry at `docs/specs/kaizen/changes--contribution-request-drawer.md` (no lessons distilled in batch mode).
