# Archive Summary — Notification Detail Side Panel — Requirements

**Outcome:** code tasks complete per `execution.md`; archived in the 2026-11-03 batch cleanup of Santiago's completed specs. Manual checks still open are listed in §7 as accepted follow-ups.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `notifications/detail-side-panel` |
| Archive Date | 2026-11-03 |
| Branch | `qa-development-2026-ss` (spec branch; `Default Branch: master`, `Integration Branch: staging`) |
| Final Status | **Complete (code)** — tasks.md: 12 `[x]`, 1 `[ ]` (unchecked boxes are DoD / manual-check items, see §7) |
| Last commit touching the spec | `f781bf99c 2026-10-06 ✨ feat(specs) [SPEC:notifications/detail-side-panel]: delivery and orchestration log for the overnight run` |
| Archive mode | Lightweight batch (user-approved 2026-11-03): summary built from `execution.md`; no per-spec re-validation |

## 2. Original Spec Path

`docs/specs/notifications/detail-side-panel/`

## 3. Requirements Delivered

`CRD-R-4`, `CRD-R-8`, `DSP-R-1`, `DSP-R-2`, `DSP-R-3`, `DSP-R-4`, `DSP-R-5`, `DSP-R-6`, `DSP-R-7`, `DSP-R-8`, `DSP-R-9`, `DSP-R-10`, `DSP-R-11`, `DSP-R-12`, `DSP-R-13`, `DSP-R-14`, `NOTIF-R-5`, `NOTIF-R-6`, `NOTIF-R-8`, `NOTIF-R-9`, `NOTIF-R-11`

Traceability per task lives in `execution.md` (archived alongside).

## 4. Files Changed Summary / Execution Summary

Copied from `execution.md` → `Summary — spec complete (2026-10-05)`:

- **Tasks:** all 9 done (T-1..T-9).
- **Reviewer passes:** 19 (cap raised 12 → 20 by the user).
- **Pivots:** 1 (T-2: the post-decision reload became a reload on next open).
- **Budget tripwires:** 2 (LOC; review passes).
- **Concurrency incident:** 1 (a concurrent session pushed T-1..T-3 plus a partial T-4; the pushed HEAD compiles).
- **Real defects caught by the review gate before ship:**
  - a dialog without an accessible name in a real browser (T-3);
  - a GET that could never be displayed (T-2);
  - grid level·type missing and blanks not dashed (T-4);
  - an AOT template type error that broke the build (T-5);
  - a resize that closed the detail (T-7);
  - a stacked heading (T-8);
  - the sticky panel under the header, the missing date chip, and the primary mislabelled (T-9 browser pass).
- **Process changes:** `ngc` in every client task's verification; per-task snapshot diffs for review isolation under concurrency.

## 5. Test Evidence Summary

See the per-task verification lines in `execution.md`. Signals: 9 Reviewer FAIL mentions, 1 HALT mentions, 1 Pivot Record(s).

## 6. Validation Summary

No `test-report.md` or `validation-report.md`. Absence accepted by the user for the 2026-11-03 batch archive (same practice as the other Lite specs); substitutes are the Reviewer verdicts per task in `execution.md`.

## 7. Accepted Warnings Or Follow-Ups

- None recorded in the execution summary.

These were accepted as follow-ups when the user approved the batch archive; most specs here have been in `qa-development-2026-ss` since September/October 2026.

## 8. Historical Notes

- Constitution sync (guides, factual sweep, TRD) was not re-run per spec in this batch; it is a spec branch, so nothing shared was written. A `codegraph sync` is recommended after the batch.
- Kaizen: metrics-only entry at `docs/specs/kaizen/notifications--detail-side-panel.md` (no lessons distilled in batch mode).
