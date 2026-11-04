# Archive Summary — `bugfix/indicator-achieved-value-per-center` — Requirements

**Outcome:** code tasks complete per `execution.md`; archived in the 2026-11-03 batch cleanup of Santiago's completed specs. Manual checks still open are listed in §7 as accepted follow-ups.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/indicator-achieved-value-per-center` |
| Archive Date | 2026-11-03 |
| Branch | `qa-development-2026-ss` (spec branch; `Default Branch: master`, `Integration Branch: staging`) |
| Final Status | **Complete (code)** — tasks.md: 16 `[x]`, 10 `[ ]` (unchecked boxes are DoD / manual-check items, see §7) |
| Last commit touching the spec | `5ab250616 2026-09-21 docs(specs) [SPEC:bugfix/indicator-achieved-value-per-center]: add spec, tasks and execution log` |
| Archive mode | Lightweight batch (user-approved 2026-11-03): summary built from `execution.md`; no per-spec re-validation |

## 2. Original Spec Path

`docs/specs/bugfix/indicator-achieved-value-per-center/`

## 3. Requirements Delivered

`RFR-R-1`, `RFR-R-2`, `RFR-R-3`, `RFR-R-4`, `RFR-R-10`

Traceability per task lives in `execution.md` (archived alongside).

## 4. Files Changed Summary / Execution Summary

Copied from `execution.md` → `3. Summary`:

**All tasks complete.** `RFR-T-1` (regression tests, red) and `RFR-T-2` (the fix, tests green) both PASSed on the first Implementer attempt, inside the `design.md` §14 budget (2 tasks, 1 review round; actual LOC slightly above the ~40-70 estimate because the additive field required maintenance on four pre-existing test expectations).

**Not yet done, and deliberately outside this spec:**
- **Commits.** Nothing has been committed — the user requires explicit per-commit approval. The whole change sits in the working tree on `qa-development-2026-ss`.
- **Rollout steps** in `tasks.md` §6 (PR, CI, manual QA on staging against the `proposal.md` §3 scenario, post-deploy telemetry) are unstarted and are human/pipeline work, not agent work.
- **The client-binding follow-up** (`design.md` §13): whether the Reporting screen must bind its "Achieved" column to the new `achieved_value_sum` field. This backend fix does not close Nicoleta's report end-to-end on its own if the screen reads a different field. To be filed separately after the staging check, per `tasks.md` §7.
- **Heads-up owed to Nicoleta/PMU** (`design.md` §11): previously-inflated Global Units roll-ups will show lower, correct numbers after deploy. That is the intended correction, not a new defect.

## 5. Test Evidence Summary

See the per-task verification lines in `execution.md`. Signals: 0 Reviewer FAIL mentions, 0 HALT mentions, 0 Pivot Record(s).

## 6. Validation Summary

No `test-report.md` or `validation-report.md`. Absence accepted by the user for the 2026-11-03 batch archive (same practice as the other Lite specs); substitutes are the Reviewer verdicts per task in `execution.md`.

## 7. Accepted Warnings Or Follow-Ups

- Not yet done, and deliberately outside this spec:**
- Rollout steps** in `tasks.md` §6 (PR, CI, manual QA on staging against the `proposal.md` §3 scenario, post-deploy telemetry) are unstarted and are human/pipeline work, not agent work.
- The client-binding follow-up** (`design.md` §13): whether the Reporting screen must bind its "Achieved" column to the new `achieved_value_sum` field. This backend fix does not close Nicoleta's report end-to-end on its own if the screen reads a different field. To be filed separately after the staging check, per `tasks.md` §7.

These were accepted as follow-ups when the user approved the batch archive; most specs here have been in `qa-development-2026-ss` since September/October 2026.

## 8. Historical Notes

- Constitution sync (guides, factual sweep, TRD) was not re-run per spec in this batch; it is a spec branch, so nothing shared was written. A `codegraph sync` is recommended after the batch.
- Kaizen: metrics-only entry at `docs/specs/kaizen/bugfix--indicator-achieved-value-per-center.md` (no lessons distilled in batch mode).
